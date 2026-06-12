
## Commission detail audit trail
`GET /internal/referrals/commissions/:id` returns one commission plus joined context:

- `commission`: amount, bps snapshot, type, status, tenant, payment transaction, subscription, timestamps, void reason.
- `account`: Sales Referral Account identity.
- `code`: Referral / Discount Code config and per-code commission rates.
- `lead`: normalized email, submitted registration code, lead status, gross/net amounts.
- `conversion`: trial/paid conversion event and amount snapshot.
- `payment`: `PaymentTransaction` status, provider, method, invoice/payment IDs, amount, paid timestamp.
- `subscription`: plan, billing period, status, paid amount, start/expiry/next billing timestamps.

System Admin UI exposes this from the commission row `Detail` action. Treat this modal as the source of truth for reviewing cancelled, not-renewed, refunded, chargeback, approved, paid, and voided commission questions.

## Manual test notes
1. Enable local paid-registration bypass only for local testing: `DEV_SIMULATE_PAID_REGISTRATION=true`.
2. Register tenant with `registration_code`.
3. Open System Admin → Sales Referrals → Commissions.
4. Click `Detail` on generated commission.
5. Verify tabs show referral code, sales account, lead, conversion, payment transaction, and subscription fields.
6. Approve commission, create payout from payout modal, then reopen detail to verify status changes.
7. Disable bypass after test: `DEV_SIMULATE_PAID_REGISTRATION=false`.

## Suggested next steps
1. Harden state transitions and validation.
2. Optional future coverage: full paid registration and webhook renewal tests with production-like Postgres/testcontainers.
3. Add payout join into commission detail response if payout audit needs direct payout metadata inside same endpoint.
