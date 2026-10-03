# Operational Go-Live Status — 2026-10-03

## Overall classification

The Rabin Fire Engineering Suite is technically ready for controlled production operation on `engin.rabinazar.ir` and its declared public engineering validation scope is closed/passed.

Public paid subscription sales remain intentionally disabled until live phone OTP receipt is confirmed end-to-end. No acceptance result is inferred or fabricated.

## Passed technical gates

- Production deployment is READY on Vercel.
- No Vercel runtime error clusters were observed in the latest production review.
- Application/CI runtime is aligned to Node 22 (`>=22 <23`).
- CI passes tests, TypeScript typecheck and production build.
- CI includes a bounded engine load regression.
- Latest bounded engine load regression: 40 runs, 60 nodes, 200 edges; p50 9.1 ms, p95 24.8 ms, max 29.2 ms on Node 22.23.3. This is a local CPU regression benchmark, not a production concurrency benchmark.
- Existing numerical, phone-format, subscription-gate, server-persistence and engineering-validation assertions pass.
- Production database checkout lifecycle was transactionally acceptance-tested: create order -> submit payment details -> administrator approval -> entitlement extension -> audit event. Test data was fully rolled back.
- Server-side price and duration enforcement remains authoritative.
- Production public sales setting remains `false` by design.
- Nightly encrypted database backup schedule is enabled on the main branch.
- Independent backup health monitoring is enabled to alert on failed/skipped/missed backups.
- A previous encrypted production backup completed successfully with upload/download SHA-256 verification.
- Printable engineering report contract is enforced by CI, including engine version, calculation hash, server-generated provenance, validation level, validation basis, declared limitations, inputs, outputs, warnings, model sources and calculation trace.
- Print CSS includes A4-oriented print rules, white background, navigation suppression, page-break protections and repeating table headers.
- Supabase security/performance advisors were rechecked. No unindexed foreign-key issue remains.

## Acceptance closed on 2026-10-03

### Printable report visual acceptance — PASS

A real persisted, server-generated engineering calculation (`airflow_network`, engine `0.5.1`) was rendered into a three-page A4 PDF using the production report structure and print styles. All pages were visually inspected. Persian text rendered correctly, engineering tables and calculation trace were readable, table headers repeated correctly, and no clipping, overlap, black-glyph substitution or broken pagination was observed.

This acceptance validates the production report data contract/styles and an actual persisted server run. It is not a claim that every browser/OS print driver has been exhaustively tested.

### Isolated database restore drill — PASS within declared scope

GitHub Actions run `37106208786` restored a fresh PostgreSQL 17 production dump into an isolated PostgreSQL 17.6 service without writing to production. The drill performed an ephemeral `age` encryption/decryption round trip, verified archive/member checksums, restored `public` and `private` application schemas through pre-data/data/post-data, and recovered 18 application tables with matching row counts, RLS state, policy counts and persisted server calculations.

The owner's durable private `age` identity remains offline by design. Therefore this runner-local drill does not decrypt a historical Google Drive archive encrypted to that offline identity and does not reconstruct Supabase-managed Auth service configuration. Those items remain part of owner-controlled disaster-recovery procedure, not an application runtime blocker.

## Remaining external acceptance check

### Live phone OTP receipt

The Amoot QuickOTP Send SMS Hook is deployed. A real handset OTP request and receipt must be triggered and confirmed before phone OTP is classified as accepted end-to-end. The user should trigger `دریافت کد یک‌بارمصرف` from the production login screen; the phone number and OTP must not be shared in chat. Server logs can then confirm that the signed Supabase hook reached the provider, while handset receipt must be confirmed by the device holder.

## Security notes

- `public.billing_events` intentionally has RLS enabled without a direct policy; bounded audit access is provided through the controlled billing RPC.
- Supabase leaked-password protection remains unavailable/disabled under the current infrastructure plan and is not an application regression.
- Unused-index advisor notices are informational on this low-traffic/new installation and are not grounds for removing required relationship/query indexes prematurely.
- The persistent production backup private `age` key must remain offline and must never be placed in GitHub, application secrets or chat.

## Release decision

**Controlled production: GO**

**Public paid sales: HOLD** until live phone OTP receipt is confirmed end-to-end.

Engineering calculations must continue to display their exact validation level and project-specific/AHJ limitations. No universal code approval, AHJ approval, professional seal, accredited third-party certification or software-equivalence claim is implied.
