"""Non-destructive restore drill for the Rabin production database.

The drill reads production only, creates a fresh PostgreSQL 17 custom-format dump,
verifies an ephemeral age encrypt/decrypt round trip, restores application schemas
into an isolated local PostgreSQL 17 service, and compares data/security state.
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tarfile
import tempfile

PROJECT = "ezbdoudxtgqqewkrzzyg"
CLIENT_IMAGE = "postgres:17.6-bookworm"
APP_SCHEMAS = ("public", "private")
IDENT = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
UUID_RE = re.compile(r"\b[0-9a-fA-F]{8}-[0-9a-fA-F-]{27,36}\b")


def need(name: str) -> str:
    value = os.environ.get(name, "")
    if not value:
        raise RuntimeError(f"Missing configuration: {name}")
    return value


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def safe_restore_diagnostic(stderr: str) -> None:
    for line in stderr.splitlines():
        if "pg_restore: error:" not in line.lower():
            continue
        line = UUID_RE.sub("<uuid>", line)
        line = re.sub(r"'[^']*'", "'<redacted>'", line)
        line = re.sub(r"\s+", " ", line).strip()
        print("Restore diagnostic: " + line[:420], flush=True)
        return


def run(args: list[str], env: dict[str, str] | None = None, timeout: int = 900) -> bytes:
    try:
        return subprocess.run(
            args,
            env=env,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=timeout,
        ).stdout
    except subprocess.CalledProcessError as exc:
        raw = (exc.stderr or b"").decode("utf-8", errors="replace")
        if "pg_restore" in args:
            safe_restore_diagnostic(raw)
        low = raw.lower()
        category = "unclassified subprocess failure"
        for marker, label in [
            ("password authentication failed", "database password rejected"),
            ("certificate verify failed", "TLS certificate verification failed"),
            ("does not match host name", "TLS hostname mismatch"),
            ("root certificate file", "TLS root certificate unavailable"),
            ("connection refused", "database connection refused"),
            ("connection timed out", "database connection timed out"),
            ("could not translate host name", "database DNS lookup failed"),
            ("violates foreign key constraint", "restored foreign-key validation failed"),
            ("does not exist", "required restore object missing"),
            ("already exists", "unexpected restore object collision"),
            ("permission denied", "restore permission failure"),
        ]:
            if marker in low:
                category = label
                break
        print("Failure category: " + category, flush=True)
        raise RuntimeError("Restore-drill subprocess failed") from None


def docker_pg(root: Path, env: dict[str, str], command: list[str]) -> bytes:
    args = [
        "docker", "run", "--rm", "--network", "host",
        "--user", f"{os.getuid()}:{os.getgid()}",
        "-v", f"{root}:/work",
    ]
    for key in [
        "PGHOST", "PGPORT", "PGDATABASE", "PGUSER", "PGPASSWORD",
        "PGSSLMODE", "PGSSLROOTCERT", "PGCONNECT_TIMEOUT", "PGAPPNAME",
    ]:
        if key in env:
            args += ["-e", key]
    return run(args + [CLIENT_IMAGE] + command, env=env)


def sql(root: Path, env: dict[str, str], statement: str) -> str:
    return docker_pg(
        root,
        env,
        ["psql", "-X", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-c", statement],
    ).decode().strip()


def sql_lines(root: Path, env: dict[str, str], statement: str) -> list[str]:
    value = sql(root, env, statement)
    return value.splitlines() if value else []


def qident(value: str) -> str:
    if not IDENT.fullmatch(value):
        raise RuntimeError("Unexpected SQL identifier")
    return '"' + value + '"'


def source_env(root: Path) -> dict[str, str]:
    env = os.environ.copy()
    env.update(
        PGPORT="5432",
        PGDATABASE="postgres",
        PGSSLMODE="verify-full",
        PGSSLROOTCERT="/work/source-ca.crt",
        PGCONNECT_TIMEOUT="20",
        PGAPPNAME="rabin-engine-restore-drill",
    )
    return env


def target_env() -> dict[str, str]:
    env = os.environ.copy()
    env.update(
        PGHOST="127.0.0.1",
        PGPORT="55432",
        PGDATABASE="postgres",
        PGUSER="postgres",
        PGPASSWORD=need("TARGET_PGPASSWORD"),
        PGSSLMODE="disable",
        PGCONNECT_TIMEOUT="20",
        PGAPPNAME="rabin-engine-restore-target",
    )
    return env


def source_role_names(roles_sql: str) -> list[str]:
    names: list[str] = []
    for line in roles_sql.splitlines():
        m = re.fullmatch(r"CREATE ROLE ([A-Za-z_][A-Za-z0-9_]*);", line.strip())
        if m:
            names.append(m.group(1))
    return sorted(set(names))


def create_role_stubs(root: Path, dst: dict[str, str], roles: list[str]) -> None:
    safe = [name for name in roles if IDENT.fullmatch(name) and name != "postgres"]
    if not safe:
        return
    array = ",".join("'" + name + "'" for name in safe)
    statement = f"""
    do $$
    declare r text;
    begin
      foreach r in array array[{array}]
      loop
        if not exists(select 1 from pg_roles where rolname=r) then
          execute format('create role %I nologin', r);
        end if;
      end loop;
    end$$;
    """
    sql(root, dst, statement)


def main() -> None:
    os.umask(0o077)
    for key in ["PGHOST", "PGUSER", "PGPASSWORD", "PG_CA_PEM", "TARGET_PGPASSWORD"]:
        need(key)
    if not need("PGHOST").endswith(".supabase.com"):
        raise RuntimeError("Unexpected source database host")
    if need("PGUSER") not in ("postgres", "postgres." + PROJECT):
        raise RuntimeError("Unexpected source database identity")

    with tempfile.TemporaryDirectory(prefix="rabin-restore-drill-") as tmp:
        root = Path(tmp)
        (root / "source-ca.crt").write_text(need("PG_CA_PEM"))
        src, dst = source_env(root), target_env()

        print("Stage: source connection and PostgreSQL 17 gate", flush=True)
        version = sql(root, src, "show server_version_num")
        if not 170000 <= int(version) < 180000:
            raise RuntimeError("Source database major version is not PostgreSQL 17")
        if sql(root, src, "select count(*) from storage.objects") != "0":
            raise RuntimeError("Storage object bytes exist; DB-only drill would be incomplete")

        print("Stage: fresh production dump", flush=True)
        docker_pg(root, src, ["pg_dump", "--format=custom", "--file=/work/database.dump", "--lock-wait-timeout=30000"])
        toc = docker_pg(root, src, ["pg_restore", "--list", "/work/database.dump"]).decode()
        if "TABLE DATA auth users" not in toc:
            raise RuntimeError("Auth users are absent from dump TOC")
        roles_text = docker_pg(root, src, ["pg_dumpall", "--roles-only", "--no-role-passwords"]).decode()
        (root / "roles.sql").write_text(roles_text)

        manifest = {
            "project": PROJECT,
            "server_version_num": version,
            "sha256": {
                "database.dump": sha256(root / "database.dump"),
                "roles.sql": sha256(root / "roles.sql"),
            },
            "storage_objects": 0,
        }
        (root / "manifest.json").write_text(json.dumps(manifest, indent=2))
        archive = root / "backup.tar.gz"
        with tarfile.open(archive, "w:gz") as tar:
            for name in ["database.dump", "roles.sql", "manifest.json"]:
                tar.add(root / name, arcname=name)

        print("Stage: ephemeral age encrypt/decrypt cycle", flush=True)
        identity = root / "drill-identity.txt"
        run(["age-keygen", "-o", str(identity)])
        recipient = run(["age-keygen", "-y", str(identity)]).decode().strip()
        encrypted, decrypted = root / "backup.tar.gz.age", root / "decrypted.tar.gz"
        run(["age", "-r", recipient, "-o", str(encrypted), str(archive)])
        run(["age", "-d", "-i", str(identity), "-o", str(decrypted), str(encrypted)])
        if sha256(archive) != sha256(decrypted):
            raise RuntimeError("Encrypted archive round-trip checksum mismatch")
        restored = root / "restored"
        restored.mkdir()
        with tarfile.open(decrypted, "r:gz") as tar:
            tar.extractall(restored)
        restored_manifest = json.loads((restored / "manifest.json").read_text())
        for name in ["database.dump", "roles.sql"]:
            if sha256(restored / name) != restored_manifest["sha256"][name]:
                raise RuntimeError("Archive member checksum mismatch")

        print("Stage: isolated PostgreSQL 17 preparation", flush=True)
        if not sql(root, dst, "show server_version_num").startswith("17"):
            raise RuntimeError("Restore target is not PostgreSQL 17")
        sql(root, dst, "create schema if not exists extensions")
        sql(root, dst, "create extension if not exists pgcrypto with schema extensions")
        sql(root, dst, 'create extension if not exists "uuid-ossp" with schema extensions')
        create_role_stubs(root, dst, source_role_names(roles_text))
        sql(root, dst, "create schema if not exists auth")
        sql(root, dst, "create table if not exists auth.users(id uuid primary key)")
        sql(root, dst, "create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$")
        sql(root, dst, "create or replace function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$")
        sql(root, dst, "create or replace function auth.role() returns text language sql stable as $$ select null::text $$")

        for schema in APP_SCHEMAS:
            sql(root, dst, f"drop schema if exists {qident(schema)} cascade")
            if f"SCHEMA - {schema}" not in toc:
                sql(root, dst, f"create schema {qident(schema)}")

        restore = ["pg_restore"]
        for schema in APP_SCHEMAS:
            restore += ["--schema", schema]
        restore += ["--no-owner", "--exit-on-error", "/work/restored/database.dump"]

        print("Stage: restore application pre-data", flush=True)
        docker_pg(root, dst, restore[:-1] + ["--section=pre-data", restore[-1]])
        print("Stage: restore application data", flush=True)
        docker_pg(root, dst, restore[:-1] + ["--section=data", restore[-1]])

        # Supabase-managed Auth is not restored into vanilla PostgreSQL. Seed only
        # identifiers needed to validate application foreign keys in post-data.
        sql(root, dst, """
        do $$
        declare c record;
        begin
          for c in select table_schema,table_name,column_name from information_schema.columns
                   where table_schema in ('public','private') and data_type='uuid'
          loop
            execute format('insert into auth.users(id) select distinct %I from %I.%I where %I is not null on conflict do nothing',
              c.column_name,c.table_schema,c.table_name,c.column_name);
          end loop;
        end$$;
        """)

        print("Stage: restore application post-data/RLS/policies", flush=True)
        docker_pg(root, dst, restore[:-1] + ["--section=post-data", restore[-1]])

        print("Stage: compare data and security state", flush=True)
        table_sql = "select table_schema||'.'||table_name from information_schema.tables where table_schema in ('public','private') and table_type='BASE TABLE' order by table_schema,table_name"
        source_tables, target_tables = sql_lines(root, src, table_sql), sql_lines(root, dst, table_sql)
        if source_tables != target_tables:
            raise RuntimeError("Application table set differs after restore")
        for qualified in source_tables:
            schema, table = qualified.split('.', 1)
            qs, qt = qident(schema), qident(table)
            if sql(root, src, f"select count(*) from {qs}.{qt}") != sql(root, dst, f"select count(*) from {qs}.{qt}"):
                raise RuntimeError("Application row count differs after restore")

        rls_sql = "select n.nspname||'.'||c.relname||'='||c.relrowsecurity::int from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private') and c.relkind='r' order by n.nspname,c.relname"
        if sql_lines(root, src, rls_sql) != sql_lines(root, dst, rls_sql):
            raise RuntimeError("RLS state differs after restore")
        policies = "select schemaname||'='||count(*) from pg_policies where schemaname in ('public','private') group by schemaname order by schemaname"
        if sql_lines(root, src, policies) != sql_lines(root, dst, policies):
            raise RuntimeError("RLS policy count differs after restore")
        functions = "select n.nspname||'='||count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') group by n.nspname order by n.nspname"
        if sql_lines(root, src, functions) != sql_lines(root, dst, functions):
            raise RuntimeError("Application function count differs after restore")
        if sql(root, src, "select count(*) from public.design_runs where server_generated is true") != sql(root, dst, "select count(*) from public.design_runs where server_generated is true"):
            raise RuntimeError("Persisted server calculation count differs after restore")

        print(f"PASS: recovered {len(source_tables)} public/private application tables with matching row counts, RLS, policies and persisted calculations; age round-trip and archive checksums verified.", flush=True)
        print("Scope: managed Supabase Auth service configuration and a historical Drive archive encrypted to the owner's offline age identity are not exercised by this runner-local drill.", flush=True)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Restore drill failed ({type(exc).__name__}). No production writes were attempted.", flush=True)
        raise SystemExit(1)
