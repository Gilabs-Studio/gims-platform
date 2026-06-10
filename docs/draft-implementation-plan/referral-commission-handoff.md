# Referral Commission Handoff

Status: backend MVP implemented, needs review/hardening before production deploy
Issue: #459

## Done
- SQL migration added for production-safe schema change:
  - `apps/api/migrations/20260610_add_referral_commission.sql`
- New Go models added:
  - `ReferralCommissionConfig`
  - `ReferralCommission`
  - `ReferralCommissionPayout`
  - `ReferralCommissionPayoutItem`
- `SalesReferralAccount` now supports nullable commission overrides:
  - `close_commission_bps`
  - `recurring_commission_bps`
- `migrate.go` includes new models for local/dev auto-migrate compatibility.
- Referral repository methods added for:
  - active config
  - payment transaction lookup
  - tenant conversion lookup
  - commission creation/list/update
  - payout creation/list
- Referral usecase implemented for:
  - `CreateCommissionForPayment`
  - config get/update
  - commission list/approve/void
  - payout create/list
- System Admin routes added under `/internal/referrals`:
  - `GET /commission-config`
  - `PUT /commission-config`
  - `GET /commissions`
  - `POST /commissions/:id/approve`
  - `POST /commissions/:id/void`
  - `GET /payouts`
  - `POST /payouts`
- Auth paid registration flow now calls commission creation after payment transaction + referral conversion.
- Billing change flow now calls commission creation after payment transaction creation.
- Checks passed:
  - `cd apps/api && go test ./internal/referral/... ./cmd/api ./internal/auth/presentation/...`

## Known gaps / review items
- Recurring renewal flow now creates/reuses `PaymentTransaction` using webhook amount then subscription amount fallback.
- Commission handlers need stronger validation and friendlier errors before UI use.
- `CreatePayoutWithItems` now locks selected commission rows with `FOR UPDATE`.
- `ApproveCommission` now enforces `pending -> approved` only.
- `VoidCommission` now blocks paid rows; Xendit `REFUNDED` / `CHARGEBACK` callbacks create pending negative adjustment rows for paid commissions.
- Billing-change idempotency path should be reviewed to look up existing payment row on webhook retry before commission creation.
- Focused commission usecase tests added for close commission, zero amount skip, approval state, duplicate payout IDs, and negative adjustments.
- Xendit refund callback handler test added for `REFUNDED` adjustment path.
- DB-backed commission integration test added for close commission, approval, payout, and refund negative adjustment.
- Postman and Bruno include commission config, commission approval/void, and payout endpoints.
- Frontend not implemented yet.

## Core rules implemented in MVP
- Commission source is `PaymentTransaction`.
- Trial / zero amount payment creates no commission.
- Paid refund/chargeback creates pending negative adjustment when source commission was already paid.
- First paid transaction for referred tenant creates `close` commission.
- Later paid transactions create `recurring` commission.
- Rates use basis points.
- Amount is rounded down via integer math.
- Account override beats active config default.
- Inactive Sales Referral Account earns no new commission.
- Payout settles approved commissions for one Sales Referral Account.
- Payout request rejects empty/duplicate commission IDs.

## Files touched
- `apps/api/migrations/20260610_add_referral_commission.sql`
- `apps/api/internal/core/infrastructure/database/migrate.go`
- `apps/api/internal/referral/data/models/sales_referral.go`
- `apps/api/internal/referral/data/repositories/referral_repository.go`
- `apps/api/internal/referral/domain/dto/referral_dto.go`
- `apps/api/internal/referral/domain/usecase/referral_usecase.go`
- `apps/api/internal/referral/domain/usecase/referral_commission_test.go`
- `apps/api/internal/referral/domain/usecase/referral_commission_integration_test.go`
- `apps/api/internal/referral/presentation/handler/referral_handler.go`
- `apps/api/internal/referral/presentation/router/referral_router.go`
- `apps/api/internal/auth/domain/usecase/auth_usecase.go`
- `apps/api/internal/auth/domain/usecase/billing_change_usecase.go`
- `apps/api/internal/auth/presentation/handler/xendit_handler.go`
- `apps/api/internal/auth/presentation/handler/xendit_handler_test.go`
- `docs/postman/postman.json`
- `docs/bruno/sales-referral.yaml`

## Suggested next steps
1. Harden state transitions and validation.
2. Implement recurring renewal payment transaction creation from webhook amount.
3. Optional future coverage: full paid registration and webhook renewal tests with production-like Postgres/testcontainers.
4. Polish frontend commission/payout UI.
