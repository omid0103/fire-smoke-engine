# Operational Go-Live Status — 2026-10-03

## Overall classification

The Rabin Fire Engineering Suite is technically ready for controlled production operation on `engin.rabinazar.ir` and its declared public engineering validation scope is closed/passed.

Public paid subscription sales remain intentionally disabled until the remaining external acceptance checks listed below are completed. No acceptance result is inferred or fabricated.

## Passed technical gates

- Production deployment is READY on Vercel.
- No Vercel runtime error clusters were observed in the latest 24-hour production review.
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

## Remaining external acceptance checks

### 1. Live phone OTP receipt

The Amoot QuickOTP delivery function is deployed, but no fresh `send-sms` invocation was observed in the reviewed production log window. A real handset receipt must be triggered and confirmed before phone OTP is classified as accepted end-to-end.

### 2. Encrypted backup restore drill

The backup has passed encrypted transfer/checksum verification but has not yet passed a full restore drill. The private age identity is intentionally offline and must never be placed in GitHub, application secrets, or chat. Restore validation must therefore be performed on a trusted owner device and into an isolated/disposable Supabase environment, never production.

### 3. Live rendered PDF visual acceptance

The report data contract and print stylesheet are CI-protected, but a real authenticated browser-rendered PDF artifact still needs visual acceptance for pagination, Persian rendering and long engineering tables.

## Security notes

- `public.billing_events` intentionally has RLS enabled without a direct policy; bounded audit access is provided through the controlled billing RPC.
- Supabase leaked-password protection remains unavailable/disabled under the current infrastructure plan and is not an application regression.
- Unused-index advisor notices are informational on this low-traffic/new installation and are not grounds for removing required relationship/query indexes prematurely.

## Release decision

**Controlled production: GO**

**Public paid sales: HOLD** until all three external acceptance checks above are closed.

Engineering calculations must continue to display their exact validation level and project-specific/AHJ limitations. No universal code approval, AHJ approval, professional seal, accredited third-party certification or software-equivalence claim is implied.
