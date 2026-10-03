# Independent encrypted database backup — 2026-09-30

Status (2026-10-03): first manual production backup succeeded; encrypted Drive upload and downloaded SHA-256 verified. Nightly schedule is enabled on `main`, independent missed/failure monitoring is active, and a fresh-production isolated application-schema restore drill has passed. Historical Drive-archive decryption with the owner's durable offline `age` identity remains an owner-controlled disaster-recovery exercise.

## Architecture
GitHub Actions (isolated temporary runner) -> Supabase session pooler over verified TLS ->
PostgreSQL 17 custom-format dump + role definitions without passwords -> age public-key
encryption -> private, owner-only Google Drive folder. The private age key never belongs
in GitHub or on the runner. Source repository is public: never commit secrets, archives,
configuration exports, or database contents. No Actions artifact uploads are used.

The database was verified as PostgreSQL 17.6 and storage.objects had zero rows on
2026-10-03. If object files are added, the backup/drill must refuse to claim a complete
recovery until object-byte backup is implemented. A DB dump contains Storage metadata,
not object bytes. Managed Supabase settings, Edge Function secrets, role passwords and
Vault root keys require a separate recovery inventory. GitHub holds application source
and migrations.

## Activation prerequisites (owner secure setup)
1. Create a Google Cloud OAuth client for a desktop application and enable Drive API.
   Use scope https://www.googleapis.com/auth/drive.file and offline access. Do not request
   full Drive access. Obtain the refresh token using the official OAuth installed-app flow
   on the owner's trusted device. Never paste tokens into chat or use a third-party token
   generator.
2. On a trusted device run `age-keygen -o rabin-backup-identity.txt`. Keep TWO secure,
   separate offline copies of this private file. Only the printed public recipient goes
   into BACKUP_AGE_RECIPIENT. Losing the private key makes backups unrecoverable.
3. In Supabase Connect, use the Session pooler host/user on port 5432, retain the existing
   DB password and production CA certificate, and keep `verify-full` TLS validation.
4. GitHub environment `backup` contains the database/Drive credentials required by the
   backup workflow. These credentials are privileged and only trusted main-branch code
   and maintainers may access the environment.
5. `BACKUP_RESTORE_VERIFIED` must remain false/unset until the owner also verifies a real
   stored Drive archive with the durable offline age identity. The automated runner-local
   drill described below is strong application-schema recovery evidence but deliberately
   does not import that durable private identity into GitHub.

## Verification and retention
Successful backup runs validate the archive table of contents, encrypt locally, upload,
then download the encrypted file and compare SHA-256. This verifies transfer integrity.
The independent restore drill separately proves that a fresh production dump can survive
an age encrypt/decrypt cycle and recover the application schemas/data into PostgreSQL 17.

Schedule: 23:47 UTC (03:17 Tehran next day). GitHub schedule can be delayed or dropped;
this is best-effort nightly backup, not a guaranteed 24-hour RPO. Independent monitoring
checks backup health and alerts on failed/skipped/missed runs. Keep normal GitHub Actions
notifications enabled as an additional channel.

Retention that depends on `BACKUP_RESTORE_VERIFIED=true` must not be enabled solely from
the runner-local drill. The owner-controlled stored-archive exercise remains required
before automatic pruning can rely on that flag.

## Automated isolated application-schema restore drill

Workflow: `.github/workflows/restore-drill.yml`
Script: `scripts/backup/restore_drill.py`

The drill is non-destructive and never writes to production. It:
1. connects to production over the same verified TLS/session-pooler path used by backup;
2. checks PostgreSQL major version and refuses DB-only completeness if Storage has files;
3. creates a fresh PostgreSQL 17 custom-format production dump and roles export without passwords;
4. creates an ephemeral `age` identity inside the temporary runner, encrypts/decrypts the archive and verifies checksums;
5. starts an isolated PostgreSQL 17.6 target;
6. restores `public` + `private` application schemas through pre-data, data and post-data;
7. validates row counts, RLS state, policy counts and representative persisted server calculations;
8. destroys the temporary target and ephemeral age identity with runner teardown.

### Passing evidence — 2026-10-03

- Workflow run: `37106208786`
- Source commit: `2600a742432787c092479623ad46628b113278d8`
- Result: **PASS**
- PostgreSQL source/target major: 17 / 17.6 target image
- Recovered: **18 public/private application tables**
- Verified: matching table set and row counts, RLS state, policy counts, persisted server calculations, archive hashes and age encryption/decryption round trip
- Production writes: none

Scope boundary: this automated drill does not reconstruct the Supabase-managed Auth service configuration and does not decrypt a historical Google Drive archive encrypted to the owner's durable offline age identity. Those remain owner-controlled disaster-recovery tasks. The persistent private identity must never be added to GitHub or chat just to automate this test.

## Owner-controlled stored-archive disaster-recovery exercise
1. Download a real encrypted backup from the private Drive destination onto the owner's trusted device.
2. Decrypt locally with the durable offline identity; never upload that identity to GitHub or chat.
3. Recompute archive/member hashes against `manifest.json` and inspect the custom-format TOC with PostgreSQL 17 tools.
4. Restore only into an isolated/disposable Supabase environment, never production.
5. Validate managed-role/extension differences, Auth users/configuration, application row counts, RLS/grants, subscriptions and representative reports.
6. Record the tested backup timestamp, hashes, exact restore procedure and result before setting `BACKUP_RESTORE_VERIFIED=true`.

## Failure behavior
Missing configuration, unexpected PG identity/version, populated Storage, dump failure,
TLS failure, encryption failure, transfer/hash failure or restore comparison failure exits
nonzero. Restore diagnostics are deliberately bounded/redacted. Temporary plaintext and
ephemeral private material are removed by temporary-directory and runner teardown. No
secrets or database archives are committed to source.

## Backup evidence
- 2026-10-01 17:42:05 UTC: workflow run `36897440856`, job `110500234663` completed successfully. Google access, database connection, custom-format dump, archive listing, roles export, encryption and Drive upload/download checksum passed.
- The successful backup passed the PostgreSQL 17 major-version gate and confirmed zero Storage objects. Transfer integrity alone does not prove stored-archive recovery with the owner's offline key.
- 2026-10-03: nightly schedule on `main` was enabled independent of the previous `BACKUP_ENABLED` repository-variable gate, and independent backup health monitoring is active.
- 2026-10-03: isolated application-schema restore run `37106208786` passed as documented above.

References:
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- https://developers.google.com/workspace/drive/api/guides/manage-uploads
- https://developers.google.com/identity/protocols/oauth2
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
