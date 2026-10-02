# Engineering release 0.4.0 — 2026-09-27

## Implemented and checked
- Recovered deployed engine 0.3.0 into source control.
- Input validation, numeric overflow guard, explicit parking fire scenario, forwarded damper velocity, per-zone results, input snapshots.
- Axisymmetric atrium model traced to AtriumCalc-Version1-1.xlsm (Atrium-Fire-SI I15:I20, A-Fire-SI C11:C12); Kelvin offset 273.15.
- Single-zone leakage/open-door flow and door opening force model. Not a multizone network solver.
- Explicit calculation save outcome; project editing; readable result units; report print container fixed.
- 32 automated numerical and invalid-input assertions; TypeScript and production build pass.

## Source findings
- parking 2.xlsx Sheet1 P15 contains an incomplete formula `=`. Not copied.
- parking 2.xlsx sums normal demand and selects maximum single-zone fire demand; uploaded ventilation PDF sums all-floor fire demand. Both scenarios are explicit in UI and trace.
- Workbook rounds with 0.589 CFM per m³/h. Engine uses more precise 0.588577779; threshold differences are expected and intentional.
- Training files and historical calculators are references, not proof of adopted regulatory compliance. Windows executables were not executed.
- Public technical reference: https://nvlpubs.nist.gov/nistpubs/Legacy/IR/nistir5516.pdf
- Multizone scope: https://www.nist.gov/el/beed/nist-multizone-modeling/applications/smoke-management

## Release blockers for full engineering production use
- Sprinkler remote-area hydraulic network and standpipe network solving not implemented.
- Multizone stair/elevator pressure network, wind/stack effects not implemented.
- Atrium balcony/window plume and plugholing models not implemented.
- Duct pressure network and manufacturer pump/fan curve verification not implemented.
- Adopted Iranian/AHJ edition and project-specific acceptance criteria not verified.
- Authenticated end-to-end create/calculate/save/reopen/print and mobile visual QA require a usable signed-in test session.
- Existing alarm coverage legacy constants remain preliminary and are not validated design rules.

Do not represent this release as a complete validated design suite.

# Update 0.5.0
- Added independent steady hydraulic graph solver: branched/looped pipes, fixed total-head supplies, elevations, Hazen-Williams resistance, pressure-dependent sprinkler emitters and fixed standpipe demands. Source head is an input; automated remote-area selection and pump-curve solving remain outside scope.
- Added steady pressure graph solver: floors/shaft paths, fixed pressure boundaries, signed mechanical injection, power-law leakage, signed wind/stack offsets. Assumes volumetric continuity / common reference density; not full thermal or large-opening two-way transport.
- Damped Newton iteration rejects disconnected, singular and non-convergent models. Outputs unrounded node/edge values, boundary supply and numerical mass residual.
- Editable network tables, per-node project acceptance limits, required design-basis description, persisted reports with tabular outputs and model references.
- 55 assertions include independent single-pipe bisection, analytic orifice pressure, parallel pipes, symmetric loop, reverse flow, zero flow, offsets and topology errors.
- TypeScript check on network solver and production UI build pass.
- No assertion of equivalence to EPANET/CONTAM certification. Independent whole-building validation, regulatory adoption checks, manufacturer curves, and authenticated end-to-end tests remain release gates for final design approval.

# Subscription release — 2026-09-29
- Monthly 690,000 / quarterly 1,790,000 / annual 5,900,000 toman; one named engineer per subscription.
- Prices and plan visibility are editable by billing administrators. Orders snapshot prices and calendar-month durations (Postgres timestamp arithmetic); changing a plan does not rewrite existing orders.
- Public checkout remains OFF and bank instructions empty until the operator completes engineering acceptance and configures payment instructions. No gateway, automatic debit or simulated payment success.
- Manual order -> user reports transfer details -> administrator reconciles actual bank statement and records unique bank transaction reference -> atomic activation. The same order or bank transaction cannot extend entitlement twice. One open order per user.
- Trial invitation: administrator grants one 14-day trial per account, max 20 accounts; no self-service trial farming. Trial and paid renewals serialize per user.
- Billing administrator is seeded only from the pre-existing internal Rabin organization owner. Organization-owner roles and editable user metadata do not grant billing administration.
- Billing mutations run only through an authenticated, checked private function with an invoker public RPC wrapper. Direct client writes to plans/settings/orders/subscriptions/audit are revoked. Audit is intentionally inaccessible directly (RLS no policy); admin RPC exposes a bounded list.
- Expired users retain reads of projects and stored reports. Database restrictive policies guard project/run inserts and updates. The deployed calculate entrypoint is **server.ts**, with RPC entitlement validation before the pure numerical handler. Never deploy index.ts as the server entrypoint.
- New engineers can bootstrap their own workspace; no attachment to internal Rabin organization. Existing members and projects are preserved.
- Verified: 55 numerical assertions + 15 phone assertions + 13 entitlement gate assertions; production TypeScript/build; transactional database tests for roles, tenant isolation, price tampering, duplicate order, trial reuse, renewal, duplicate bank reference rollback and expiry. All billing fixtures were rolled back.
- Remaining go-live gates: bank destination/instructions supplied by owner, working SMS OTP, authenticated browser checkout/review/report journey, independent engineering validation described above. This release does not imply full engineering production certification.
- Existing Supabase advisory: leaked password protection disabled (not introduced by billing). https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

# Operational QA follow-up — 2026-09-29
See `QA-2026-09-29.md` second-stage section for current evidence. Server-generated persistence, authenticated trial browser calculations, report reopening and downloaded JSON verification now pass. Production Edge Function is version9, numerical engine0.5.1. Backup/restore dashboard requires secure login; SMS template rejection, bank instructions, PDF artifact verification, staging load and independent engineering acceptance remain open. Public sales remain off.

# Subscription checkout follow-up — 2026-10-01
- Added explicit order review showing price, duration, manual activation and renewal behavior before order creation.
- Existing pending/submitted orders are surfaced and new plan buttons disabled until the open order is resolved; server-side single-open-order and price controls remain authoritative.
- Payment submission confirms review is pending; successful mutations with failed refreshes no longer appear to be failed payments.
- Customer transfer notes, seven-day expiry warning, admin order search/status filters and pending-review count added.
- Dialog keyboard focus, Escape handling, mobile overflow and inline error visibility improved.
- Validation: production TypeScript/Vite build and 188 existing assertions passed. Authenticated real-bank checkout acceptance remains unverified for this change; no payment or entitlement was fabricated.
- Public sales remain disabled pending real bank destination/support instructions, working OTP and engineering acceptance. Independent backup first upload/checksum succeeded; restore drill and monitoring remain open.

# Public engineering validation — 2026-10-03

See `ENGINEERING-VALIDATION-2026-10-03.md` for the full evidence matrix and scope.

- The internal **public engineering validation gate is closed for the declared calculation scope**: hydraulic-network kernel, airflow-network kernel, Hazen-Williams, duct continuity, DC battery arithmetic, voltage drop and NPSHa are classified as validated kernels; the atrium axisymmetric and single-zone pressurization equations are classified as validated limited models.
- Production Rule Registry now contains verified public engineering references for EPA EPANET 2.2, NIST CONTAM 3.4 and NISTIR 5516, with ten rules marked `locked` or `verified` effective 2026-10-03.
- Parking smoke design defaults remain `draft` because ACH, zoning, redundancy and other acceptance criteria are project/AHJ inputs rather than universal equations.
- Sprinkler preliminary sizing, fire-pump preliminary sizing and legacy detector-coverage calculations are explicitly prevented from being represented as fully validated final-design modules.
- Results and printable reports now display the exact validation level, supporting basis and limitations for the calculator used.
- A dedicated regression test prevents preliminary/legacy calculators from accidentally being labelled fully validated in future releases.
- Current public catalog baselines were checked for NFPA 13 (2025), NFPA 14 (2024), NFPA 20 (2025), NFPA 72 (2025), NFPA 92 (2024), BS 5839-1:2025 and relevant BS EN 12101 parts. The exact adopted Iranian/AHJ edition remains a project-level input and is not silently assumed.

This closes the software team's engineering validation gate for **public release as a calculation and traceability tool within the declared scope**. It does not create an external professional seal, accredited certification, product listing or AHJ approval. Those are external, jurisdiction- or project-specific approvals and remain outside the software team's authority.
