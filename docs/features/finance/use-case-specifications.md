# Use Case Specifications (UC-01 to UC-08)

> **Module:** Finance, Inventory, Purchase, Sales, Stock Opname
> **Sprint:** 10-12 (hardening continuation)
> **Version:** 1.0.0
> **Status:** Complete
> **Last Updated:** April 2026

## Overview

This document defines core use cases after mapping and journal hardening.

## References

- Business rules catalog: [docs/features/finance/business-rules-catalog.md](./business-rules-catalog.md)
- Error code catalog: [docs/api-standart/api-error-codes.md](../../api-standart/api-error-codes.md)
- Journey map: [docs/features/finance/account-mapping-user-journey.md](./account-mapping-user-journey.md)

## UC Coverage Matrix

| Use Case | Title | Linked Rules |
|---|---|---|
| UC-01 | Configure required system account mappings | BR-001, BR-003, BR-004, BR-005, BR-007 |
| UC-02 | Upsert single mapping key (global or company scoped) | BR-001, BR-002, BR-003, BR-004, BR-005 |
| UC-03 | Delete company override and fallback to global mapping | BR-001, BR-002, BR-006 |
| UC-04 | Post manual journal entry safely | BR-008, BR-009, BR-010, BR-011, BR-012, BR-013, BR-019 |
| UC-05 | Confirm purchase payment with mapping fallback | BR-014, BR-020 |
| UC-06 | Confirm sales payment with mapping fallback | BR-015, BR-020 |
| UC-07 | Post stock opname and generate variance journal | BR-016, BR-017, BR-020 |
| UC-08 | Review product stock ledger timeline | BR-018 |

## UC-01: Configure Required System Account Mappings

- Primary Actor: Finance Administrator
- Goal: Complete required account mappings so posting flows can run safely.
- Preconditions:
  - User has update permission.
  - COA master data exists.
- Trigger: User opens mapping page and saves values.
- Main Flow:
  1. User opens mapping page.
  2. System loads required mapping keys.
  3. User selects COA codes.
  4. User clicks save.
  5. Backend validates and stores mappings.
- Postconditions:
  - Required mappings persisted.
- Alternative/Exception Flows:
  - Invalid key/body -> `VALIDATION_ERROR`.
  - Non-postable account -> `ACCOUNT_NOT_POSTABLE`.
  - Inactive account -> `ACCOUNT_INACTIVE`.

## UC-02: Upsert Single Mapping Key

- Primary Actor: Finance Administrator
- Goal: Update one mapping key without bulk changes.
- Preconditions:
  - Key exists in canonical or dynamic set.
- Trigger: Row-level save operation.
- Main Flow:
  1. Frontend sends `PUT /finance/settings/account-mappings/:key`.
  2. Backend validates key and scope.
  3. Backend validates target COA.
  4. Backend upserts row and audit metadata.
- Postconditions:
  - Mapping row updated.
- Alternative/Exception Flows:
  - Invalid `company_id` -> `VALIDATION_ERROR`.
  - Unknown COA -> `VALIDATION_ERROR`.
  - Non-postable/inactive COA -> `ACCOUNT_NOT_POSTABLE` or `ACCOUNT_INACTIVE`.

## UC-03: Delete Company Override and Fallback

- Primary Actor: Finance Administrator
- Goal: Remove company-specific mapping so global value applies.
- Preconditions:
  - Company-scoped row exists for target key.
- Trigger: Delete action from mapping UI or API.
- Main Flow:
  1. Frontend sends `DELETE /finance/settings/account-mappings/:key?company_id=...`.
  2. Backend deletes exact scoped row.
  3. Subsequent read resolves global mapping.
- Postconditions:
  - Effective mapping is inherited from global row.
- Alternative/Exception Flows:
  - Row not found -> `MAPPING_NOT_CONFIGURED`.

## UC-04: Post Manual Journal Entry Safely

- Primary Actor: Finance Staff
- Goal: Post a valid draft journal into ledger.
- Preconditions:
  - Journal status is draft.
  - Entry has valid lines.
- Trigger: User clicks Post.
- Main Flow:
  1. Backend loads draft journal.
  2. Backend checks balanced totals.
  3. Backend checks period status.
  4. Backend validates account postability and activity.
  5. Backend applies advisory lock (when reference metadata is present).
  6. Backend marks journal as posted.
- Postconditions:
  - Journal status becomes posted.
- Alternative/Exception Flows:
  - Unbalanced lines -> `JOURNAL_UNBALANCED`.
  - Closed period -> `PERIOD_CLOSED`.
  - Invalid account state -> `ACCOUNT_NOT_POSTABLE` / `ACCOUNT_INACTIVE`.
  - Lock collision -> `CONCURRENT_LOCK_CONFLICT`.
  - System-generated/non-draft edit attempts are blocked in UI (BR-019).

## UC-05: Confirm Purchase Payment with Mapping Fallback

- Primary Actor: AP Staff
- Goal: Confirm payment and generate posting without hardcoded defaults.
- Preconditions:
  - Payment draft exists.
- Trigger: Confirm action in purchase payments screen.
- Main Flow:
  1. Backend resolves account from linked bank COA.
  2. If absent, backend resolves mapping (`finance.bank_default` or `finance.cash_default`).
  3. Journal is generated and posted.
- Postconditions:
  - Payment confirmed and journal posted.
- Alternative/Exception Flows:
  - Missing mapping -> `MAPPING_NOT_CONFIGURED` and frontend CTA to mapping page.
  - Invalid mapped account -> `ACCOUNT_NOT_POSTABLE` / `ACCOUNT_INACTIVE`.

## UC-06: Confirm Sales Payment with Mapping Fallback

- Primary Actor: AR Staff
- Goal: Confirm customer payment with consistent accounting behavior.
- Preconditions:
  - Sales payment draft exists.
- Trigger: Confirm action in sales payments screen.
- Main Flow:
  1. Backend resolves payment account.
  2. Fallback uses mapping keys when needed.
  3. Journal posts through finance primitives.
- Postconditions:
  - Payment confirmed and journal posted.
- Alternative/Exception Flows:
  - Missing mapping -> `MAPPING_NOT_CONFIGURED` + frontend CTA.
  - Invalid account state -> `ACCOUNT_NOT_POSTABLE` / `ACCOUNT_INACTIVE`.

## UC-07: Post Stock Opname and Generate Variance Journal

- Primary Actor: Warehouse Supervisor
- Goal: Finalize physical count and reflect accounting impact.
- Preconditions:
  - Opname has item variance data.
- Trigger: Status change to `posted`.
- Main Flow:
  1. Inventory stock is adjusted.
  2. Stock ledger rows are appended (immutable).
  3. Mapping keys are resolved for inventory, gain, and loss accounts.
  4. Variance journal posts.
- Postconditions:
  - Opname posted, stock updated, journal created.
- Alternative/Exception Flows:
  - Missing required mapping -> `MAPPING_NOT_CONFIGURED` with CTA.
  - Invalid account state -> `ACCOUNT_NOT_POSTABLE` / `ACCOUNT_INACTIVE`.
  - Closed period -> `PERIOD_CLOSED`.
  - Concurrency conflict -> `CONCURRENT_LOCK_CONFLICT`.

## UC-08: Review Product Stock Ledger Timeline

- Primary Actor: Inventory Analyst
- Goal: Audit moving-average stock events by product.
- Preconditions:
  - Product has stock transactions.
- Trigger: User opens stock ledger tab and filters.
- Main Flow:
  1. Frontend calls product-ledger endpoint with pagination/filter params.
  2. Backend validates request params.
  3. Backend returns ledger rows and pagination metadata.
  4. Frontend renders table and navigation.
- Postconditions:
  - Analyst can inspect quantity and value progression.
- Alternative/Exception Flows:
  - Invalid UUID or malformed query -> `VALIDATION_ERROR`.
  - Repository/runtime fault -> `INTERNAL_SERVER_ERROR`.

## Notes

- UC-05, UC-06, and UC-07 share the same operational dependency: mapping completeness.
- UC-04 and UC-07 both rely on period-close and account-state checks before posting.
