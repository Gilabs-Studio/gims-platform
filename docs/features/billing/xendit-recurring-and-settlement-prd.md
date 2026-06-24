# Xendit Recurring Billing and Merchant Settlement PRD

Generated: 2026-06-23
Status: Implementation baseline

Related setup guide:

- [Xendit Env Setup and Subscription Configuration](./xendit-env-and-subscription-setup.md)

## Summary

GIMS will use two production Xendit API keys with separated blast radius:

- `billing-recurring-key`: accepts GIMS subscription payments and manages auto-renewal.
- `merchant-settlement-key`: reserved for merchant settlement/payout and xenPlatform movement.

Phase 1 ships recurring subscription billing for GIMS tenants. Merchant settlement is prepared with a security model and configuration boundary, but self-order merchant settlement does not deduct platform fees yet. Funds are intended to be paid out 100% to the merchant when settlement automation is enabled.

## Goals

- Replace demo/manual subscription payment behavior with real Xendit recurring setup.
- Use Xendit hosted subscription setup so card/payment-token collection stays outside GIMS servers.
- Keep upgrade/downgrade and seat changes aligned with the next renewal amount.
- Keep production data safe by adding nullable columns only and preserving existing invoice fields.
- Remove tenant-facing Xendit secret input from POS profile flow in favor of platform-managed payment settings.
- Prepare merchant settlement with a separate API key and no platform fee in this phase.

## Non-Goals

- No platform fee deduction in phase 1.
- No merchant self-managed Xendit API key requirement.
- No destructive migration, column rename, or production seeder rewrite.
- No direct storage of raw card, bank, or payment credentials in GIMS.
- No money-out automation until settlement ledger and approval workflow are explicitly enabled.

## Xendit Docs Basis

- Xendit Subscriptions can manage weekly/monthly/yearly recurring payments and handle scheduling/automatic deductions; GIMS must monitor webhook events for each cycle.
- Xendit API subscription setup supports a hosted Checkout UI via Payment Session type `SUBSCRIPTION`, returning a payment link/component key to collect and tokenize payment methods.
- Subscription lifecycle events include `payment_session.completed`, `payment_token.activation`, `recurring_plan.activated`, `recurring.cycle.created`, `recurring.cycle.retrying`, `recurring.cycle.failed`, and `recurring.cycle.succeeded`.
- xenPlatform supports platform businesses creating/managing sub-accounts, accepting payments on behalf of merchants, splitting payments, tracking transactions, and paying merchants out.
- Xendit transfers require the Master Account API key and execute immediately, so transfer capability must be isolated from the billing key.
- Xendit Payout API requires an `Idempotency-key`, destination `channel_code`, `account_number`, exact `account_holder_name`, integer IDR amount, and final payout status via webhook, so automatic merchant payout must wait until merchant bank channel mapping is validated.

References:

- https://docs.xendit.co/docs/how-subscriptions-work
- https://docs.xendit.co/docs/subscriptions-overview
- https://docs.xendit.co/docs/subscriptions-features
- https://docs.xendit.co/docs/xenplatform-overview
- https://docs.xendit.co/docs/transfer-balances
- https://docs.xendit.co/docs/payouts-via-api
- https://docs.xendit.co/apidocs/create-payout

## API Key Permission Matrix

| Key | Purpose | Money-in | Money-out | Balance | Transaction | Report | xenPlatform Account | Account Holder | Split Payments | Transfers | Identity Proofing |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `billing-recurring-key` | GIMS tenant subscriptions, upgrade invoices, renewal webhooks | Write | None | Read | Read | None | None | None | None | None | None |
| `merchant-settlement-key` | Future merchant payout/settlement and platform transfers | None by default | Write | Read | Read | Read | Write when onboarding is enabled | Write when onboarding is enabled | Write when split routing is enabled | Write | None until KYC API is enabled |

Security rule: the application must never use the settlement key from web request paths that only need tenant billing. Settlement jobs must run behind separate permissions, internal worker access, approval checks, and stricter logging.

## Product Flow

### Registration

1. User selects plan, billing period, seat count, and optional coupon/referral.
2. Backend calculates the authoritative price.
3. Backend creates a Xendit subscription setup session using `billing-recurring-key`.
4. Frontend redirects the user to Xendit hosted setup URL.
5. Xendit sends webhook events.
6. GIMS records setup metadata from `payment_session.completed` / `recurring_plan.activated`, but does not provision tenant access yet.
7. GIMS provisions tenant only after initial `recurring.cycle.succeeded` / `payment.succeeded` confirms money has been collected.

### Renewal

1. Xendit runs the recurring schedule.
2. `recurring.cycle.succeeded` creates an idempotent `payment_transactions` record.
3. Tenant subscription `next_billing_at`, `expires_at`, status, and amount snapshot are updated.
4. Failed/retrying cycles do not delete data; they move through grace/read-only/suspended states according to enterprise lifecycle rules.

### Upgrade and Seat Changes

1. Immediate upgrades that require payment create a one-time Xendit invoice or a subscription-cycle update token, depending on Xendit support available in the environment.
2. The local subscription record stores the pending target amount and target seat/outlet limits.
3. Once paid, GIMS updates the active subscription and renewal amount snapshot.
4. Downgrades that reduce seats/outlets apply at next billing period if current usage permits.

### POS Self-Order

1. Tenant users no longer paste their own Xendit secret key in profile.
2. Self-order payment uses platform-managed Xendit configuration.
3. Platform-managed mode creates invoices without requiring merchant API keys; funds land in platform balance first.
4. Merchant settlement fields are stored as configuration/metadata only until payout automation is enabled.
5. Phase 1 settlement policy is 100% merchant payout, 0% platform fee.
6. Automatic payout is intentionally blocked until merchant bank channel codes and account-holder validation are production-ready.

## Backend Data Model Requirements

Production-safe additions to `tenant_subscriptions`:

- `xendit_recurring_plan_id` nullable.
- `xendit_payment_session_id` nullable.
- `xendit_payment_token_id` nullable.
- `recurring_reference_id` nullable unique/indexable.
- `renewal_amount_idr` nullable or default-safe.
- `pending_renewal_amount_idr` nullable.
- `recurring_status` nullable.
- `last_recurring_event_id` nullable.

Existing fields such as `xendit_invoice_id`, `xendit_payment_id`, and `xendit_subscription_id` stay for backward compatibility.

Production-safe additions for POS/settlement should be separate and nullable:

- merchant settlement account/sub-account ID.
- payout method metadata reference.
- settlement status.
- settlement policy JSON or enum with `platform_fee_bps = 0`.

## Security Requirements

- Store API keys only in environment/secret manager, never database.
- Do not expose API keys or webhook tokens through API responses.
- Verify webhook token before parsing business actions.
- Do not provision paid tenants from `payment_session.completed` alone; require a successful payment/cycle event for recurring checkout.
- Implement idempotency using event ID, payment ID, recurring plan ID, or reference ID.
- Use database transactions and row-level locking when mutating subscription state.
- Do not log raw request bodies if they may contain payment tokens or card metadata.
- Use timeout-bound Xendit HTTP requests.
- Keep settlement key out of normal tenant request handlers.
- Add audit log entries for billing changes, subscription activation, renewal, failed renewal, and cancellation.
- Failed renewal must not delete tenant data.

## Migration and Seeder Safety

- Add columns only; do not rename existing columns.
- New fields must be nullable or have safe defaults.
- SQL migrations must be idempotent with rollback comments.
- Existing seed IDs and plan slugs must not be changed.
- New seeders must upsert/guard existing data.

## Implementation Checklist

- [x] Add config support for separate billing and settlement Xendit keys.
- [x] Add Xendit client support for subscription payment sessions and recurring webhook payloads.
- [x] Add nullable migration columns for recurring metadata.
- [x] Update pending registration payload to store payment session and recurring references.
- [x] Process recurring webhooks idempotently.
- [x] Update billing change logic so renewal amount follows accepted seat/plan changes.
- [x] Replace frontend demo checkout references with real Xendit redirect states.
- [x] Update POS profile payment settings to show platform-managed payment gateway status instead of merchant secret-key entry.
- [x] Allow POS/self-order invoices to use platform-managed money-in key when merchant Xendit config is absent.
- [x] Add webhook tests for setup-event safety and initial recurring payment provisioning.
- [ ] Add deeper integration tests for config split and renewal amount updates.
- [ ] Implement approved merchant settlement ledger/worker after bank channel mapping is validated.

## Rollout Plan

1. Deploy migration adding nullable fields.
2. Deploy backend with feature flag defaulting to invoice fallback if subscription payment session is unavailable.
3. Configure `XENDIT_BILLING_RECURRING_SECRET_KEY` and webhook token.
4. Run sandbox subscription setup test.
5. Enable recurring checkout for a test tenant.
6. Enable production tenants gradually.
7. Configure `XENDIT_MERCHANT_SETTLEMENT_SECRET_KEY` only when settlement worker is ready.

## Open Questions

- Which payment channels are active for merchant-initiated recurring in the production Xendit account?
- Does the production account have access to Payment Session type `SUBSCRIPTION`, or only the legacy recurring plan endpoint?
- Should immediate upgrades remain one-time invoices until Xendit plan amendment support is confirmed?
- What exact merchant KYC/onboarding fields are required before payout automation goes live?
- Which GIMS bank master field should become authoritative Xendit payout `channel_code` (for example `ID_BCA`)?
- Should merchant payout be instant per POS payment, batched daily, or approval-based?
