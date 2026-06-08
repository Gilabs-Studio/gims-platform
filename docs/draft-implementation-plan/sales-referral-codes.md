# Sales Referral Codes Implementation Plan

## 1. Domain model

Create a new backend domain for Sales Referral.

```txt
apps/api/internal/referral/
  data/models/
  data/repositories/
  domain/dto/
  domain/usecase/
  presentation/handler/
  presentation/router/
```

Reason: referral is platform sales attribution, not tenant billing or coupon logic only.

## 2. Database tables

### sales_referral_accounts

Fields:

```txt
id
email
name nullable
is_active
created_at
updated_at
deleted_at
```

Rules:

- platform-level identity
- not tenant user
- email may match other platform emails
- inactive account disables all owned referral codes
- delete = soft delete

### sales_referral_codes

Fields:

```txt
id
sales_referral_account_id
coupon_id
code
campaign_name nullable
description nullable
is_active
max_uses
used_count
max_uses_per_email default 1
expires_at nullable
created_at
updated_at
deleted_at
```

Rules:

- one sales account owns many codes
- one referral code links to one coupon
- code reusable with caps
- public code namespace unique across coupons and referral codes
- normalize uppercase, compare case-insensitively
- allowed charset: letters, numbers, `-`, `_`
- soft delete/deactivate preserves history
- cannot change linked coupon or owner after any usage exists

### sales_referral_leads

Fields:

```txt
id
sales_referral_code_id
sales_referral_account_id
coupon_id
email_normalized
registration_code
status
gross_amount_idr
net_amount_idr
pending_registration_key nullable
superseded_by_id nullable
created_at
updated_at
deleted_at
```

Suggested statuses:

```txt
pending_payment
converted
failed
expired
superseded
```

Rules:

- created when registration submits valid referral code
- validation-only does not create lead
- new valid attempt supersedes older pending leads for same email
- paid invoice freezes referral at submission time
- trial conversion happens immediately after tenant/subscription success

### sales_referral_conversions

Fields:

```txt
id
sales_referral_lead_id
sales_referral_code_id
sales_referral_account_id
coupon_id
tenant_id
subscription_id nullable
conversion_type
gross_amount_idr
net_amount_idr
created_at
updated_at
deleted_at
```

Suggested `conversion_type`:

```txt
trial
paid
first_paid_upgrade
```

Rules:

- created only when tenant exists
- one final attribution per tenant
- free trial revenue = 0
- first paid upgrade after referred trial attributed to original referral
- no recurring/lifetime commission in v1

## 3. Migrations and model registration

Register new GORM models and add migrations in a backward-compatible way.

Indexes and constraints:

- unique lower(email) where deleted_at is null for sales_referral_accounts
- unique lower(code) where deleted_at is null for sales_referral_codes
- indexes for account, coupon, status, and timestamps

Also enforce collision rules between referral codes and coupon codes.

## 4. Backend usecases

Create a SalesReferral usecase with methods for:

- CRUD on sales referral accounts
- CRUD on referral codes
- status toggles and soft delete
- code resolution for registration
- lead creation and superseding
- conversion creation
- first paid upgrade attribution
- stats aggregation

## 5. Code resolution flow

Add a generic registration-code resolver.

Resolution order:

1. normalize input
2. find active referral code
3. validate sales account + referral code + linked coupon
4. return referral outcome
5. else find active coupon
6. validate coupon
7. return coupon outcome

Defensive fallback: referral wins if a collision somehow exists.

## 6. Registration flow changes

Request handling:

- add `registration_code`
- keep `coupon` as legacy alias
- reject if both are present and differ

Flow differences:

- coupon-only: unchanged
- referral trial: create lead, provision tenant, redeem atomically, create conversion
- referral paid: create lead, store pending state, convert after payment success

Important safety rule:

- referral redemption failure must fail the registration instead of silently creating a tenant without the subscription

## 7. Usage cap enforcement

Referral code is usable only when all pass:

- sales account active
- referral code active
- referral not expired
- referral usage count below max uses
- email below max uses per email
- linked coupon active
- linked coupon not expired
- linked coupon caps pass

Atomic write requirements:

- lock referral and coupon rows in one transaction
- revalidate caps after locking
- insert usage and conversion rows together
- commit only if all steps succeed

## 8. System Admin API

Add routes under `/internal/referrals` for:

- accounts CRUD
- codes CRUD
- status toggles
- stats

Protect with System Admin authentication plus explicit referral permissions.

## 9. RBAC and permissions

Seed permissions:

- `sales_referral.read`
- `sales_referral.create`
- `sales_referral.update`
- `sales_referral.delete`

Grant by default only to platform System Admin.

Backend enforcement is required even if frontend hides the menu.

## 10. Frontend work

Registration:

- rename field to `Referral / Discount Code`
- call new validate endpoint
- send `registration_code`
- preserve coupon-only compatibility

System Admin:

- add Referrals menu
- hide menu without `sales_referral.read`
- build accounts CRUD
- build codes CRUD
- build stats dashboard

## 11. Stats rules

Track:

- leads
- conversions
- trial vs paid conversions
- gross revenue
- net revenue
- first paid upgrade attribution

Use event-specific dates for filtering.

## 12. Testing plan

Backend tests:

- code resolution
- collision rejection
- registration compatibility
- lead/conversion lifecycle
- atomic cap updates
- RBAC gating

Frontend tests:

- registration field label
- menu visibility
- validation behavior

## 13. Production safety

This feature must be safe for a live production system.

Guardrails:

- additive change only
- keep legacy coupon path working
- no breaking changes to coupon-only registrations
- use backward-compatible migrations
- fail closed on referral inconsistency
- use soft delete/deactivate for history
- enforce atomic count updates
- gate UI and API by permission

## 14. Suggested rollout order

1. domain and migrations
2. code resolver and registration compatibility
3. backend admin APIs
4. frontend admin UI
5. tests and docs
6. staged production rollout

## 15. Backend implementation status

Completed backend/db items:

- created `apps/api/internal/referral` vertical slice
- added referral models and AutoMigrate registration
- added production-safe referral indexes in `migrate.go`
- added public registration-code resolver
- wired `registration_code` into tenant registration
- kept legacy `coupon` alias intact
- added lead creation on valid referral registration submit
- added conversion tracking on tenant creation and paid confirmation
- added idempotent conversion guard by referral code + tenant
- added System Admin referral CRUD routes
- added stats route and aggregate query
- added permission and menu seed entries
- added Bruno YAML collection at `docs/bruno/sales-referral.yaml`
- updated Postman collection at `docs/postman/postman.json`

Remaining outside backend/db scope:

- frontend System Admin pages
- frontend registration form label/update
- frontend permission-based menu display
