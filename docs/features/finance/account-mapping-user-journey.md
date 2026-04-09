# Account Mapping and Journal User Journey Map

> **Module:** Finance, Inventory, Purchase, Sales, Stock Opname
> **Sprint:** 10-12 (hardening continuation)
> **Version:** 1.0.0
> **Status:** Complete
> **Last Updated:** April 2026

## Overview

This document maps operational user journeys after the finance-accounting hardening refactor.

Scope includes:
- system account mapping setup and maintenance
- journal posting constraints
- payment confirmation behavior for purchase and sales
- stock opname posting behavior
- stock ledger read flow
- COA lifecycle constraints (postable/protected/opening balance)

## References

- Backend error code catalog: [docs/api-standart/api-error-codes.md](../../api-standart/api-error-codes.md)
- Finance mapping page: [apps/web/app/[locale]/(dashboard)/finance/settings/accounting-mapping/page.tsx](../../../apps/web/app/[locale]/(dashboard)/finance/settings/accounting-mapping/page.tsx)
- Mapping form behavior: [apps/web/src/features/finance/settings/components/accounting-mapping-form.tsx](../../../apps/web/src/features/finance/settings/components/accounting-mapping-form.tsx)
- Purchase payment mapping error handling: [apps/web/src/features/purchase/payments/components/purchase-payment-form.tsx](../../../apps/web/src/features/purchase/payments/components/purchase-payment-form.tsx)
- Sales payment mapping error handling: [apps/web/src/features/sales/payments/components/sales-payment-form.tsx](../../../apps/web/src/features/sales/payments/components/sales-payment-form.tsx)
- Stock opname error handling: [apps/web/src/features/stock/stock-opname/components/stock-opname-list.tsx](../../../apps/web/src/features/stock/stock-opname/components/stock-opname-list.tsx)

## Journey 1: Configure Required Account Mappings

### Actor
- Finance Administrator

### Pre-condition
- User has permission to update mapping (`account_mappings.update`)
- Chart of accounts master data exists

### Trigger
- User opens Finance Settings > Accounting Mapping

### Steps and System Response
1. User opens mapping page.
2. System loads all canonical mapping keys plus any dynamic keys.
3. User selects postable COA for each required key.
4. User saves configuration.
5. Backend validates target account (must be active and postable), then upserts mapping.
6. UI refreshes and shows latest mapping values.

### Success Outcome
- All required keys are mapped and warning banner disappears.

### Error Scenarios
- `VALIDATION_ERROR`: missing required key value or invalid payload
- `ACCOUNT_NOT_POSTABLE`: selected account is parent/non-postable
- `ACCOUNT_INACTIVE`: selected account is inactive
- `CONCURRENT_LOCK_CONFLICT`: concurrent update collision

## Journey 2: Upsert or Delete Single Mapping Key

### Actor
- Finance Administrator

### Pre-condition
- User can access mapping API and permission checks pass

### Trigger
- User modifies one row in mapping form and saves

### Steps and System Response
1. User changes one key value.
2. Frontend sends per-key `PUT /finance/settings/account-mappings/:key`.
3. Backend writes mapping and logs audit change.
4. If user clears value, frontend sends delete for the key.
5. Backend deletes exact scoped row and returns success.

### Success Outcome
- Mapping row updated or deleted with audit trail.

### Error Scenarios
- `MAPPING_NOT_CONFIGURED`: delete target not found for scope
- `VALIDATION_ERROR`: malformed key, invalid UUID `company_id`, invalid body
- `ACCOUNT_NOT_POSTABLE` and `ACCOUNT_INACTIVE`

## Journey 3: Post Manual Journal Entry

### Actor
- Finance Staff

### Pre-condition
- Journal is in draft status
- User has posting permission
- Journal lines are balanced

### Trigger
- User clicks Post on journal list/detail

### Steps and System Response
1. User submits post action.
2. Backend validates period is open.
3. Backend validates each account is active and postable.
4. Backend acquires advisory lock (when reference metadata exists).
5. Backend marks journal as posted.

### Success Outcome
- Journal status becomes `posted` and cannot be edited as draft.

### Error Scenarios
- `PERIOD_CLOSED`
- `ACCOUNT_NOT_POSTABLE`
- `ACCOUNT_INACTIVE`
- `JOURNAL_UNBALANCED`
- `CONCURRENT_LOCK_CONFLICT`

## Journey 4: Confirm Purchase Payment

### Actor
- AP Staff

### Pre-condition
- Purchase payment draft exists
- Related bank account or fallback mapping exists

### Trigger
- User confirms purchase payment

### Steps and System Response
1. User submits confirm payment.
2. Usecase resolves payment account from linked bank COA.
3. If linked COA is absent, backend resolves from mapping key:
	- bank payment -> `finance.bank_default`
	- cash payment -> `finance.cash_default`
4. Journal is generated and posted.

### Success Outcome
- Payment status confirmed and journal posted.

### Error Scenarios
- `MAPPING_NOT_CONFIGURED` when default mapping key missing
- `ACCOUNT_NOT_POSTABLE` and `ACCOUNT_INACTIVE`
- frontend shows CTA to open accounting mapping page

## Journey 5: Confirm Sales Payment

### Actor
- AR Staff

### Pre-condition
- Sales payment draft exists
- Required mapping configuration exists

### Trigger
- User confirms sales payment

### Steps and System Response
1. User confirms payment in sales module.
2. Backend resolves account from linked bank COA or fallback mapping.
3. Journal posting path applies same validation as finance posting.
4. UI shows success and refreshes list.

### Success Outcome
- Sales payment confirmed with posted journal.

### Error Scenarios
- `MAPPING_NOT_CONFIGURED`
- `ACCOUNT_NOT_POSTABLE`
- `ACCOUNT_INACTIVE`
- frontend shows actionable navigation to mapping page

## Journey 6: Post Stock Opname with Variance Journal

### Actor
- Warehouse Supervisor

### Pre-condition
- Stock opname contains counted items and variances
- Posting permissions and mapping setup are available

### Trigger
- User changes opname status to `posted`

### Steps and System Response
1. Backend computes variance impact per item.
2. Inventory aggregate stock is updated.
3. Immutable stock ledger entries are appended.
4. Journal lines are created with mapping keys:
	- inventory asset: `purchase.inventory_asset`
	- gain: `inventory.adjustment_gain`
	- loss: `inventory.adjustment_loss`
5. Journal is posted.

### Success Outcome
- Opname status posted, stock adjusted, and journal recorded.

### Error Scenarios
- `MAPPING_NOT_CONFIGURED`
- `ACCOUNT_NOT_POSTABLE`
- `ACCOUNT_INACTIVE`
- `PERIOD_CLOSED`
- `CONCURRENT_LOCK_CONFLICT`

## Journey 7: Review Product Stock Ledger Timeline

### Actor
- Inventory Analyst

### Pre-condition
- Product has stock-changing transactions
- User can read inventory data

### Trigger
- User opens stock opname detail tab or product-level stock ledger view

### Steps and System Response
1. User selects product.
2. Frontend requests `GET /inventory/products/:product_id/ledgers`.
3. Backend validates query (`page`, `limit`, date range, UUID).
4. Backend returns paginated ledger with transaction labels.
5. UI renders timeline table and pagination controls.

### Success Outcome
- User can audit moving-average trail (`GR`, `GI`, `OPNAME`) chronologically.

### Error Scenarios
- `VALIDATION_ERROR` for invalid query parameters
- `INTERNAL_SERVER_ERROR` for unexpected data access failures

## Summary

These seven journeys define the operational baseline for mapping-governed accounting behavior. The primary dependency is correct mapping configuration; when missing, the system fails fast with explicit machine-readable error codes and frontend guidance to complete setup.

