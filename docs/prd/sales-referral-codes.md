# Sales Referral Codes PRD

## Problem Statement
System Admin needs a first-class sales referral system so platform sales can own reusable referral codes, attribute registrations to sales activity, and see performance stats without mixing this logic into tenant user flows or duplicating the existing coupon engine.

Today, coupon handling already exists, but it only covers discount/trial logic. There is no dedicated model for sales referral accounts, referral-code ownership, referral attribution, or referral analytics. The registration flow also only understands coupon-style input, while the business now needs a single public code entry point that can resolve either a referral code or a coupon.

## Solution
Add a platform-level Sales Referral feature under System Admin. A Sales Referral Account owns one or more Referral Codes. Each Referral Code wraps exactly one existing Coupon, so discount logic continues to live in the coupon domain while referral logic handles ownership, attribution, stats, and usage caps.

Public registration keeps one field, labeled `Referral / Discount Code`, and the backend resolves it as either a Referral Code or a Coupon. Referral Codes take precedence if the same public code somehow exists in both namespaces, but the create/update flow should block collisions so the namespace stays shared and unambiguous.

The feature includes System Admin CRUD for sales accounts and referral codes, a referral dashboard with funnel and revenue stats, public registration validation, referral lead and conversion tracking, soft delete/deactivate semantics, and RBAC-protected endpoints and menu visibility.

## User Stories
1. As a System Admin, I want to create a Sales Referral Account with email and optional display name, so that I can manage sales ownership separately from tenant users.
2. As a System Admin, I want to update a Sales Referral Account, so that I can maintain its contact details and active state.
3. As a System Admin, I want to soft delete a Sales Referral Account, so that I can preserve historical attribution while removing inactive owners from active use.
4. As a System Admin, I want to deactivate a Sales Referral Account, so that all owned Referral Codes become unusable immediately.
5. As a System Admin, I want to create multiple Referral Codes for one Sales Referral Account, so that I can support many campaigns per salesperson.
6. As a System Admin, I want each Referral Code to link to exactly one Coupon, so that discount logic remains centralized in the coupon engine.
7. As a System Admin, I want to give each Referral Code an optional campaign name and description, so that I can label campaigns for reporting.
8. As a System Admin, I want to set usage caps and expiry on a Referral Code, so that I can control trial abuse and campaign limits.
9. As a System Admin, I want a Referral Code to be reusable within its caps, so that one code can support multiple registrations.
10. As a System Admin, I want Referral Code usage and Coupon usage to both be enforced, so that neither layer can be bypassed.
11. As a System Admin, I want Referral Code and Coupon usage increments to be atomic, so that counts never drift under concurrency.
12. As a System Admin, I want to soft delete or deactivate a Referral Code, so that I can preserve history while stopping future use.
13. As a System Admin, I want to block changes to a Referral Code's owning Sales Referral Account after it has usage history, so that attribution stays auditable.
14. As a System Admin, I want to block changes to a Referral Code's linked Coupon after it has usage history, so that historical registration behavior stays stable.
15. As a System Admin, I want the public registration code namespace to be shared between Referral Codes and Coupons, so that users never see ambiguous codes.
16. As a System Admin, I want code collisions to be rejected on create and update, so that public code meaning stays unique.
17. As a System Admin, I want public codes to be normalized to uppercase, so that users can type them case-insensitively.
18. As a System Admin, I want public codes to allow only letters, numbers, hyphen, and underscore, so that code formatting stays predictable.
19. As a visitor, I want to enter one Referral / Discount Code during registration, so that I can apply either a referral campaign or a normal coupon.
20. As a visitor, I want the registration form to accept the legacy coupon field during transition, so that existing clients keep working.
21. As a visitor, I want the backend to reject mismatched legacy and new code fields, so that ambiguous submissions do not silently choose the wrong code.
22. As a visitor, I want the system to resolve a valid referral or coupon code automatically, so that I do not need to know the internal distinction.
23. As a visitor, I want the public validation response to show only discount outcome, so that sales identity details stay private.
24. As a visitor, I want coupon-only registrations to keep working, so that current discount flows do not break.
25. As a visitor using a referral code, I want the system to create a referral lead when I submit registration, so that the sales funnel captures my attempt.
26. As a visitor using a referral code, I want the referral to be frozen when I submit registration, so that later UI changes do not alter attribution.
27. As a visitor using a referral code, I want the system to convert my referral lead when my tenant is created, so that sales stats reflect real outcomes.
28. As a visitor using a paid referral flow, I want the referral to stay pending until payment succeeds, so that attribution is correct before conversion.
29. As a visitor using a trial referral flow, I want the referral to convert immediately after tenant and subscription creation, so that trial conversions are counted without payment.
30. As a visitor using a trial referral flow, I want registration to fail if coupon redemption fails, so that I do not end up with an inconsistent tenant state.
31. As a visitor, I want referral attribution to be hidden from the public registration response, so that I only see the discount result.
32. As a System Admin, I want to see referral leads by account and by code, so that I can understand funnel performance.
33. As a System Admin, I want to see conversion counts, so that I know how many registrations became tenants.
34. As a System Admin, I want to see trial and paid conversion splits, so that I can evaluate campaign quality.
35. As a System Admin, I want to see gross and net revenue, so that I can measure both plan value and actual collected amount.
36. As a System Admin, I want net revenue to be the primary revenue metric, so that sales reporting matches real cash impact.
37. As a System Admin, I want to see first paid upgrade attribution for referred trial tenants, so that later monetization still credits the original referral.
38. As a System Admin, I want dashboard stats grouped by Sales Referral Account and Referral Code, so that I can manage performance at both levels.
39. As a System Admin, I want to filter referral stats by date range, so that I can review campaign performance over time.
40. As a System Admin, I want lead and conversion dates to use event-specific timestamps, so that stats match the actual funnel stage.
41. As a System Admin, I want to use RBAC for the referral page, so that access can be controlled consistently with other admin features.
42. As a System Admin, I want backend permission checks for referral endpoints, so that direct API access cannot bypass menu visibility.
43. As a System Admin, I want the Referrals menu hidden when I lack read permission, so that the UI matches authorization.
44. As a System Admin, I want only platform admins to receive referral permissions by default, so that tenant roles are not exposed to platform sales data.
45. As a System Admin, I want no manual referral backfill in v1, so that attribution stays tied to the registration event.
46. As a System Admin, I want no commission or payout logic in v1, so that the first release stays focused on attribution and reporting.
47. As a System Admin, I want the system to keep the referral code namespace clean even if a coupon and referral code once collided conceptually, so that future support is easier.
48. As a System Admin, I want the system to preserve historical referral data after deactivation, so that reports remain trustworthy.

## Implementation Decisions
- Introduce a new backend domain for Sales Referral instead of folding the feature into coupon or tenant code paths.
- Keep coupon logic as the discount engine; Referral Code is a wrapper that points to one Coupon and carries sales attribution metadata.
- Model Sales Referral Account as a platform-level identity, not a tenant user.
- A Sales Referral Account may have many Referral Codes.
- A Referral Code belongs to exactly one Sales Referral Account and exactly one Coupon.
- Referral Code ownership and linked Coupon become immutable after the code has any usage history.
- Campaign name and description on Referral Code are optional.
- Sales Referral Account email is unique among active records, but may match other platform emails because it is a separate identity.
- Sales Referral Account and Referral Code use soft delete/deactivate semantics to preserve history.
- Inactive Sales Referral Account disables all owned Referral Codes at validation time.
- Public registration uses one field labeled `Referral / Discount Code`.
- API uses `registration_code` as the canonical request field, while `coupon` remains a legacy alias.
- If both `registration_code` and `coupon` are sent and differ, the request is rejected.
- Public codes are normalized to uppercase, compared case-insensitively, and limited to letters, numbers, hyphen, and underscore.
- The public registration code namespace is shared across Referral Codes and Coupons; collisions are blocked on create/update.
- Referral Code takes precedence defensively if a collision ever exists, but the data model should prevent that state.
- Referral validation requires both the Referral Code and linked Coupon to be active and valid.
- Referral and Coupon usage caps both must pass, and usage increments must be atomic.
- A Referral Lead is created when registration submits a valid referral code.
- Lead creation happens on registration attempt, not on code validation.
- Referral success is counted when the Tenant is created.
- Referral stats use event-specific timestamps: lead_created_at, conversion_created_at, and revenue event dates.
- A referral trial converts immediately after tenant and subscription creation.
- A referral paid flow remains pending until payment confirms, then converts.
- Referral trial redemption failure must fail the registration instead of silently creating a tenant without the subscription.
- The referral flow must keep referral attribution frozen at registration/invoice creation time.
- A later valid referral attempt supersedes older pending leads for the same email.
- A referred Tenant can attribute its first paid upgrade back to the original referral.
- Trial conversions count as conversions with zero net revenue.
- Revenue reporting tracks both gross and net revenue, with net as primary.
- No commission or payout logic is included in v1.
- No manual referral backfill is included in v1.
- System Admin manages both Sales Referral Accounts and Referral Codes.
- System Admin referral endpoints require backend permission checks in addition to System Admin authentication.
- Use permissions `sales_referral.read`, `sales_referral.create`, `sales_referral.update`, `sales_referral.delete`.
- Frontend should hide the Referrals menu when `sales_referral.read` is absent, but backend remains the source of truth.
- Add a validation endpoint for registration codes and keep the old coupon validation path as a compatibility alias.
- Add a new frontend System Admin Referrals area with account CRUD, code CRUD, and stats views.

## Testing Decisions
- Good tests should verify external behavior only: API outcomes, validation rules, state transitions, and visible stats, not private implementation details.
- Backend tests should cover code resolution, namespace collision rejection, registration flow, lead creation, conversion creation, caps, immutability after usage, and RBAC authorization.
- Registration tests should verify coupon-only compatibility, referral flow, legacy alias compatibility, mismatched-field rejection, and trial-vs-paid differences.
- Stats tests should verify lead/conversion counts, trial vs paid splits, gross vs net revenue, and first paid upgrade attribution.
- Permission tests should verify referral endpoints are blocked without `sales_referral.*` access and accessible with it.
- Frontend tests should verify the registration field label, validation behavior, and menu hiding behavior by permission.
- Prior art exists in the current codebase for coupon validation, system-admin CRUD endpoints, registration flow, menu seeding, and permission enforcement on other admin features.

## Out of Scope
- Commission, payout, and settlement workflows.
- Manual referral backfill after registration.
- Referral ownership transfer after any usage history.
- Lifetime recurring revenue attribution beyond the first paid upgrade.
- Sales portal or sales-user login flows separate from System Admin.
- Private/public campaign segmentation beyond the shared public code namespace.
- Per-device, per-IP, or per-domain anti-abuse scoring beyond the basic caps in v1.
- Complex multi-coupon selection for one referral code.
- Changes to tenant subscription pricing engine beyond using the existing coupon logic.

## Further Notes
- The feature intentionally reuses the existing coupon engine so discount/trial behavior stays consistent.
- The public-facing experience should remain simple: one code field, one outcome, no sales identity leakage.
- The admin experience should expose enough funnel detail for sales operations without requiring separate reporting tools.
- The current system-admin area does not appear to use the tenant permission middleware directly, so this feature needs an explicit system-admin permission gate.
- The referral namespace must stay strict from day one because code collisions would make attribution and support confusing.

## Production Safety Notes
This feature must ship safely in a live production system. Implementation should preserve backward compatibility, avoid breaking existing coupon registrations, and use soft rollout patterns where possible. Preferred safeguards include:

- keep legacy `coupon` registration input working during transition
- add new referral validation as additive behavior, not a breaking replacement
- keep coupon-only flows unchanged
- use database migrations that are backward compatible and reversible where feasible
- enforce atomic usage updates to avoid double counting under concurrency
- fail closed on referral redemption inconsistency so tenant/subscription state stays valid
- hide new admin UI behind permission checks and backend authorization
- preserve historical data via soft delete/deactivate rather than hard delete
- verify rollout with production-safe tests and gradual enablement if needed

## Backend/API Implementation Notes

Implemented backend surface:

- `GET /api/v1/auth/registration-codes/validate?code=...&email=...`
- `GET /api/v1/auth/coupons/validate?code=...&email=...` remains compatible and now resolves referral-first when referral service is wired.
- `POST /api/v1/auth/register` accepts `registration_code` and legacy `coupon`.
- `GET /api/v1/internal/referrals/stats`
- `GET /api/v1/internal/referrals/accounts`
- `POST /api/v1/internal/referrals/accounts`
- `PUT /api/v1/internal/referrals/accounts/:id`
- `DELETE /api/v1/internal/referrals/accounts/:id`
- `GET /api/v1/internal/referrals/codes`
- `POST /api/v1/internal/referrals/codes`
- `PUT /api/v1/internal/referrals/codes/:id`
- `PATCH /api/v1/internal/referrals/codes/:id/status`
- `DELETE /api/v1/internal/referrals/codes/:id`
- `GET /api/v1/internal/referrals/commission-config`
- `PUT /api/v1/internal/referrals/commission-config`
- `GET /api/v1/internal/referrals/commissions`
- `GET /api/v1/internal/referrals/commissions/:id`
- `POST /api/v1/internal/referrals/commissions/:id/approve`
- `POST /api/v1/internal/referrals/commissions/:id/void`
- `GET /api/v1/internal/referrals/payouts`
- `POST /api/v1/internal/referrals/payouts`

Implemented DB entities:

- `sales_referral_accounts`
- `sales_referral_codes`
- `sales_referral_leads`
- `sales_referral_conversions`
- `referral_commission_configs`
- `referral_commissions`
- `referral_commission_payouts`
- `referral_commission_payout_items`

Implemented seed entries:

- menu: `Sales Referrals` at `/master-data/sales-referrals`
- permissions: `sales_referral.read`, `sales_referral.create`, `sales_referral.update`, `sales_referral.delete`, `sales_referral.manage`

API collections:

- Postman: `docs/postman/postman.json`
- Bruno YAML: `docs/bruno/sales-referral.yaml`

## Referral Commission Update

Commission is now implemented as extension of Sales Referrals. `SalesReferralCode` stores per-code `close_commission_bps` and `recurring_commission_bps`; UI accepts percent values and converts to bps for API. Commission detail endpoint joins referral, lead, conversion, payment, and subscription data so System Admin can audit paid, cancelled, not-renewed, refunded, chargeback, approved, voided, and paid-payout scenarios from one modal.
