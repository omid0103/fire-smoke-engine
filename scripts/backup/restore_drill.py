"""Non-destructive restore drill for a fresh production dump.

Reads production through the same TLS/pooler credentials as backup.py, creates a
custom-format PostgreSQL 17 dump, performs an ephemeral age encrypt/decrypt cycle,
restores the public + private application schemas into an isolated PostgreSQL 17
service, then compares row counts, RLS, policies and persisted calculation state.
No write is made to production and no durable private key is created.
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
SAFE_IDENT = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
APP_SCHEMAS = ("public", "private")


def required(name: str) -> str:
    value = os.environ.get(name, "")
    if not value:
        raise RuntimeError("Missing configuration: " + name)
    return value


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


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
        stderr = (exc.stderr or b"").decode("utf-8", errors="replace").lower()
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
            ("extension", "required restore extension unavailable"),
            ("does not exist", "required restore object missing"),
            ("already exists", "unexpected restore object collision"),
            ("permission denied", "restore permission failure"),
        ]:
            if marker in stderr:
                category = label
                break
        print("Failure category: " + category, flush=True)
        raise RuntimeError("Restore-drill subprocess failed") from None


def client(root: Path, env: dict[str, str], command: list[str]) -> bytes:
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
    args += [CLIENT_IMAGE] + command
    return run(args, env=env)


def scalar(root: Path, env: dict[str, str], sql: str) -> str:
    return client(
        root,
        env,
        ["psql", "-X", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-c", sql],
    ).decode().strip()


def lines(root: Path, env: dict[str, str], sql: str) -> list[str]:
    text = scalar(root, env, sql)
    return [] if not text else text.splitlines()


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
        PGPASSWORD=required("TARGET_PGPASSWORD"),
        PGSSLMODE="disable",
        PGCONNECT_TIMEOUT="20",
        PGAPPNAME="rabin-engine-restore-target",
    )
    return env


def quote_ident(name: str) -> str:
    if not SAFE_IDENT.fullmatch(name):
        raise RuntimeError("Unexpected identifier in restore drill")
    return '"' + name + '"'


def main() -> None:
    os.umask(0o077)
    for key in ["PGHOST", "PGUSER", "PGPASSWORD", "PG_CA_PEM", "TARGET_PGPASSWORD"]:
        required(key)
    if not required("PGHOST").endswith(".supabase.com"):
        raise RuntimeError("Unexpected source database host")
    if required("PGUSER") not in ("postgres", "postgres." + PROJECT):
        raise RuntimeError("Unexpected source database identity")

    with tempfile.TemporaryDirectory(prefix="rabin-restore-drill-") as tmp:
        root = Path(tmp)
        (root / "source-ca.crt").write_text(required("PG_CA_PEM"))
        src = source_env(root)
        dst = target_env()

        print("Stage: source connection and PostgreSQL major-version gate", flush=True)
        version = scalar(root, src, "show server_version_num")
        if not 170000 <= int(version) < 180000:
            raise RuntimeError("Source database major version is no longer PostgreSQL 17")
        if scalar(root, src, "select count(*) from storage.objects") != "0":
            raise RuntimeError("Storage object bytes exist; DB-only restore drill is incomplete")

        print("Stage: fresh custom-format production dump", flush=True)
        client(root, src, ["pg_dump", "--format=custom", "--file=/work/database.dump", "--lock-wait-timeout=30000"])
        toc = client(root, src, ["pg_restore", "--list", "/work/database.dump"]).decode()
        if "TABLE DATA auth users" not in toc:
            raise RuntimeError("Auth users are not present in backup table-of-contents")
        roles = client(root, src, ["pg_dumpall", "--roles-only", "--no-role-passwords"])
        (root / "roles.sql").write_bytes(roles)

        manifest = {
            "project": PROJECT,
            "server_version_num": version,
            "client_image": CLIENT_IMAGE,
            "sha256": {
                "database.dump": digest(root / "database.dump"),
                "roles.sql": digest(root / "roles.sql"),
            },
            "storage_objects": 0,
        }
        (root / "manifest.json").write_text(json.dumps(manifest, indent=2))
        archive = root / "backup.tar.gz"
        with tarfile.open(archive, "w:gz") as tar:
            for name in ["database.dump", "roles.sql", "manifest.json"]:
                tar.add(root / name, arcname=name)

        print("Stage: ephemeral age encrypt/decrypt recovery cycle", flush=True)
        identity = root / "drill-identity.txt"
        run(["age-keygen", "-o", str(identity)])
        recipient = run(["age-keygen", "-y", str(identity)]).decode().strip()
        encrypted = root / "backup.tar.gz.age"
        decrypted = root / "decrypted.tar.gz"
        run(["age", "-r", recipient, "-o", str(encrypted), str(archive)])
        run(["age", "-d", "-i", str(identity), "-o", str(decrypted), str(encrypted)])
        if digest(archive) != digest(decrypted):
            raise RuntimeError("Encrypted round-trip checksum mismatch")
        restored = root / "restored"
        restored.mkdir()
        with tarfile.open(decrypted, "r:gz") as tar:
            tar.extractall(restored)
        restored_manifest = json.loads((restored / "manifest.json").read_text())
        for name in ["database.dump", "roles.sql"]:
            if digest(restored / name) != restored_manifest["sha256"][name]:
                raise RuntimeError("Restored archive member checksum mismatch")

        print("Stage: isolated PostgreSQL 17 target preparation", flush=True)
        if not scalar(root, dst, "show server_version_num").startswith("17"):
            raise RuntimeError("Isolated target is not PostgreSQL 17")
        prep = """
        create extension if not exists pgcrypto;
        create extension if not exists "uuid-ossp";
        do $$
        declare r text;
        begin
          foreach r in array array['anon','authenticated','service_role','authenticator','supabase_auth_admin','supabase_storage_admin','supabase_realtime_admin','supabase_replication_admin','supabase_read_only_user','dashboard_user']
          loop
            if not exists(select 1 from pg_roles where rolname=r) then
              execute format('create role %I nologin', r);
            end if;
          end loop;
        end$$;
        create schema if not exists auth;
        create table if not exists auth.users(id uuid primary key);
        create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
        create or replace function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
        create or replace function auth.role() returns text language sql stable as $$ select null::text $$;
        """
        scalar(root, dst, prep)

        for schema in APP_SCHEMAS:
            scalar(root, dst, f"drop schema if exists {quote_ident(schema)} cascade")
            if f"SCHEMA - {schema}" not in toc:
                scalar(root, dst, f"create schema {quote_ident(schema)}")

        print("Stage: restore public + private application schemas - pre-data and data", flush=True)
        common = ["pg_restore"]
        for schema in APP_SCHEMAS:
            common += ["--schema", schema]
        common += ["--no-owner", "--exit-on-error", "/work/restored/database.dump"]
        client(root, dst, common[:-1] + ["--section=pre-data", common[-1]])
        client(root, dst, common[:-1] + ["--section=data", common[-1]])

        # FK constraints are post-data. Seed an isolated auth.users stub with every
        # UUID observed in restored app data so auth-user FKs can be validated
        # without restoring managed Supabase Auth internals into vanilla PostgreSQL.
        seed_auth = """
        do $$
        declare c record;
        begin
          for c in
            select table_schema,table_name,column_name from information_schema.columns
            where table_schema in ('public','private') and data_type='uuid'
          loop
            execute format(
              'insert into auth.users(id) select distinct %I from %I.%I where %I is not null on conflict do nothing',
              c.column_name,c.table_schema,c.table_name,c.column_name
            );
          end loop;
        end$$;
        """
        scalar(root, dst, seed_auth)

        print("Stage: restore public + private application schemas - post-data, RLS, policies and ACLs", flush=True)
        client(root, dst, common[:-1] + ["--section=post-data", common[-1]])

        print("Stage: row-count and security-state comparison", flush=True)
        table_sql = "select table_schema||'.'||table_name from information_schema.tables where table_schema in ('public','private') and table_type='BASE TABLE' order by table_schema,table_name"
        source_tables = lines(root, src, table_sql)
        target_tables = lines(root, dst, table_sql)
        if source_tables != target_tables:
            raise RuntimeError("Application table set differs after restore")
        for qualified in source_tables:
            schema, table = qualified.split('.', 1)
            qs, qt = quote_ident(schema), quote_ident(table)
            if scalar(root, src, f"select count(*) from {qs}.{qt}") != scalar(root, dst, f"select count(*) from {qs}.{qt}"):
                raise RuntimeError("Application table row count differs after restore")

        rls_sql = "select n.nspname||'.'||c.relname||'='||c.relrowsecurity::int from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private') and c.relkind='r' order by n.nspname,c.relname"
        if lines(root, src, rls_sql) != lines(root, dst, rls_sql):
            raise RuntimeError("RLS enablement differs after restore")
        policy_sql = "select schemaname||'='||count(*) from pg_policies where schemaname in ('public','private') group by schemaname order by schemaname"
        if lines(root, src, policy_sql) != lines(root, dst, policy_sql):
            raise RuntimeError("RLS policy count differs after restore")
        function_sql = "select n.nspname||'='||count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') group by n.nspname order by n.nspname"
        if lines(root, src, function_sql) != lines(root, dst, function_sql):
            raise RuntimeError("Application function count differs after restore")
        run_sql = "select count(*) from public.design_runs where server_generated is true"
        if scalar(root, src, run_sql) != scalar(root, dst, run_sql):
            raise RuntimeError("Persisted server calculation count differs after restore")

        print(f"PASS: isolated restore recovered {len(source_tables)} public/private application tables with matching row counts, RLS, policies and persisted calculations; age round-trip and archive checksums verified.", flush=True)
        print("Scope note: managed Supabase Auth service configuration and a historical backup encrypted to the owner's offline age key remain outside this runner-local drill.", flush=True)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print("Restore drill failed (" + type(exc).__name__ + "). No production writes were attempted.", flush=True)
        raise SystemExit(1)
