# Independent encrypted database backup — 2026-09-30

Status (2026-10-03): first manual production backup succeeded; encrypted Drive upload and downloaded SHA-256 verified. Nightly schedule is enabled on `main`, and independent missed/failure monitoring is active. Full restore drill remains open.

## Architecture
GitHub Actions (isolated temporary runner) -> Supabase session pooler over verified TLS ->
PostgreSQL 17 custom-format dump + role definitions without passwords -> age public-key
encryption -> private, owner-only Google Drive folder. The private age key never belongs
in GitHub or on the runner. Source repository is public: never commit secrets, archives,
configuration exports, or database contents. No Actions artifact uploads are used.

The database was verified as PostgreSQL 17.6 and storage.objects had zero rows on
2026-09-30. If object files are added, the job refuses to claim a complete backup until
object-byte backup is implemented. A DB dump contains Storage metadata, not object bytes.
Managed Supabase settings, Edge Function secrets, role passwords and Vault root keys
require a separate recovery inventory. GitHub holds application source and migrations.

## Activation prerequisites (owner secure setup)
1. Create a Google Cloud OAuth client for a desktop application and enable Drive API.
   Use scope https://www.googleapis.com/auth/drive.file and offline access. Do not request
   full Drive access. Consent must be in production rather than Testing (Testing refresh
   tokens expire after seven days for this scope). Obtain the refresh token using the
   official OAuth installed-app flow on the owner's trusted device. Never paste tokens
   into chat or use a third-party token generator.
2. On a trusted device run `age-keygen -o rabin-backup-identity.txt`. Keep TWO secure,
   separate offline copies of this private file. Only the printed public recipient goes
   into BACKUP_AGE_RECIPIENT. Losing the private key makes backups unrecoverable.
3. In Supabase Connect, copy the Session pooler host/user on port 5432; do not use
   transaction pooler port 6543. Retain existing DB password; do not reset blindly.
   Download the project CA certificate from the official dashboard. The script uses
   verify-full, including hostname validation. Never disable certificate verification.
4. Create GitHub environment `backup`, restrict it to main, and set environment secrets:
   BACKUP_PGHOST, BACKUP_PGUSER, BACKUP_PGPASSWORD, BACKUP_PG_CA_PEM,
   BACKUP_GOOGLE_CLIENT_ID, BACKUP_GOOGLE_CLIENT_SECRET, BACKUP_GOOGLE_REFRESH_TOKEN.
   The script supports the documented postgres session-pooler identity. This credential
   is privileged; only trusted main-branch code and maintainers may access this environment.
   Set environment variable BACKUP_AGE_RECIPIENT to the public age key.
5. Keep BACKUP_RESTORE_VERIFIED unset/false until a real isolated restore drill passes.
   The nightly workflow is scheduled directly on `main`; it is no longer gated by a
   repository BACKUP_ENABLED variable. Manually triggered runs remain available for
   controlled verification and incident recovery checks.

## Verification and retention
Successful runs validate the archive table of contents, encrypt locally, upload, then
download the encrypted file and compare SHA-256. This verifies transfer integrity;
it is NOT a restoration test. Roles and DB dump are separate snapshots; avoid role/DDL
changes during the run. pg_dump provides a consistent database snapshot.

Schedule: 23:47 UTC (03:17 Tehran next day). GitHub schedule can be delayed or dropped;
this is best-effort nightly backup, not a guaranteed 24-hour RPO. Independent monitoring
checks backup health and alerts on failed/skipped/missed runs; the active monitor treats
absence of a successful backup beyond the configured safety window as actionable. Keep
normal GitHub Actions notifications enabled as an additional channel. Review actual
Actions usage/billing periodically; no paid purchase is performed by this workflow.

After a successful restore drill, set BACKUP_RESTORE_VERIFIED=true in environment backup.
Retention then preserves the union of the newest backup for 7 calendar days, 4 ISO weeks,
and 3 calendar months. Older app-tagged backups in that folder are moved to Trash (never
permanently deleted by the script). Until a restore drill is verified, nothing is pruned.
Monitor available Drive space; duplicates/retries may consume extra capacity.

## Restore drill — isolated Supabase project only
1. Download an encrypted backup on the owner's trusted device.
2. Decrypt: `age -d -i rabin-backup-identity.txt -o backup.tar.gz BACKUP.tar.gz.age`.
3. Extract locally into a private directory; inspect manifest.json. Recompute SHA-256
   for database.dump and roles.sql and compare with the manifest.
4. Inspect `pg_restore --list database.dump` with PostgreSQL 17 tools. Create a separate,
   disposable Supabase staging project only after cost/creation approval. Never restore
   into the production project. Managed Supabase roles/extensions already exist; review
   roles.sql and the archive selection against Supabase's current migration instructions.
   Do not blindly run pg_restore --clean or role creation against a managed project.
5. Apply compatible custom roles/schema/data to the isolated project, resolve managed
   schema ownership differences, and verify record counts, Auth users, RLS, grants,
   subscription history and representative reports using the application.
6. Record backup timestamp, checksums, row counts, restore duration, exact restore
   commands and test results before marking BACKUP_RESTORE_VERIFIED=true.

No generic automatic restore command is supplied because a full managed-Supabase archive
requires staging validation of platform-managed roles/extensions. A readable dump alone
does not establish recoverability.

## Failure behavior
Missing configuration, unexpected PG identity/version, populated Storage, shared folder,
dump failure, TLS failure, encryption failure or transfer/hash failure exits nonzero.
No raw command output or HTTP bodies are logged. Temporary plaintext is removed by the
Python temporary-directory context and runner teardown. No secrets are kept in source.
Upload interruption is not automatically resumed; a manual retry creates a new archive.

## Evidence
- 2026-10-01 17:42:05 UTC (21:12:05 Tehran): workflow run 36897440856,
  job 110500234663, source commit 03aa4672e10ad710b33a084b0b1ffe7fa95a3370
  completed successfully. Google access, database connection, custom-format dump,
  archive listing, roles export, encryption and Drive upload/download checksum passed.
- This successful run also passed the PostgreSQL 17 major-version gate and confirmed
  zero Storage objects before and after export. It does not prove restoration.
- No private age identity was supplied to the runner. The private key remains offline.
- On 2026-10-03 the workflow condition was updated so scheduled runs on `main` are no
  longer skipped due to a missing BACKUP_ENABLED repository variable. Independent backup
  health monitoring is active. Restore verification remains intentionally unset/open.

DirectAdmin refused a shell diagnostic with "Invalid command" and required administrator
approval for custom commands. Its cron list remained empty. That restriction was not
bypassed. Google Drive is a destination; it does not execute pg_dump.

References:
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- https://developers.google.com/workspace/drive/api/guides/manage-uploads
- https://developers.google.com/identity/protocols/oauth2
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
