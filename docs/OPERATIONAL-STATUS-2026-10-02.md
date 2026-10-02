# Operational status — 2026-10-02

## Production state

- Production domain: `https://engin.rabinazar.ir`.
- Vercel production deployment is READY and aliased to the custom domain.
- GitHub CI passes `npm test`, `npm run typecheck`, and `npm run build` on the production source.
- No Vercel runtime error clusters were observed after the current production deployment.

## Authentication and access

- Email/password login and password recovery are available as a stable login path.
- Phone OTP delivery was changed from Amoot `SendWithPattern` to `SendQuickOTP` with Supabase's generated OTP passed as `OptionalCode`.
- The SMS Edge Function remains protected by the signed Supabase Auth Send SMS Hook and does not log phone numbers, OTP values, provider payloads, or secrets.
- Production `send-sms` is version 7. Live handset receipt is still an acceptance check and must not be assumed solely from successful deployment.
- The management account is a billing administrator and `has_subscription()` grants billing administrators calculation entitlement without requiring a paid subscription row.

## ERP projects

- 29 ERP projects were imported into the `Rabin Azar Vira` engineering workspace.
- ERP project IDs are retained in `engineering_projects.erp_project_id` so later synchronization can avoid duplicates.
- Imported projects are associated with the management workspace/account.

## Calculation service

- Production `calculate` is version 10 and enters through `server.ts` with JWT verification enabled.
- Subscription/entitlement validation occurs before the numerical handler.
- Server-side calculation persistence is used when a project ID is supplied; the browser does not directly write calculation result records.

## Billing

- Bank/payment instructions are configured in production settings.
- `sales_enabled` remains `false` intentionally.
- Public paid launch remains gated by a real end-to-end OTP receipt test and the independent engineering acceptance scope documented in `READINESS.md` / `QA-2026-09-29.md`.
- Email login allows controlled/internal production use while SMS delivery acceptance is being verified.

## Database / security

- Added covering indexes for billing event actor/subject foreign keys and subscription order plan/reviewer foreign keys in migration `20261002191622_add_billing_fk_indexes.sql`.
- The Supabase performance advisor no longer reports unindexed foreign keys for these relationships.
- `billing_events` intentionally has RLS enabled with no direct read policy; bounded audit access is provided through the controlled billing RPC.
- Supabase leaked-password protection remains disabled/unavailable on the current plan and is an infrastructure-plan limitation, not an application-code regression.

## Launch classification

The application is ready for **controlled operational production use** by the management/internal engineering workflow on `engin.rabinazar.ir`.

Do not represent the numerical suite as independently certified or universally code-compliant. Public subscription sales should remain disabled until live OTP receipt is verified and the independent engineering validation / acceptance criteria in the readiness documents are closed.
