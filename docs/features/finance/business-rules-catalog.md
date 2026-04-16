# Business Rules Catalog

> **Module:** Finance, Inventory, Purchase, Sales, Stock Opname
> **Sprint:** 10-12 (hardening continuation)
> **Version:** 1.0.0
> **Status:** Complete
> **Last Updated:** April 2026

## Overview

This catalog defines business rules enforced by backend and frontend across mapping configuration, journal posting, payment confirmation, stock adjustment, and ledger read flows.

## References

- Error code catalog: [docs/api-standart/api-error-codes.md](../../api-standart/api-error-codes.md)
- Frontend mapping page: [apps/web/src/features/finance/settings/components/accounting-mapping-form.tsx](../../../apps/web/src/features/finance/settings/components/accounting-mapping-form.tsx)
- Frontend journal error parser: [apps/web/src/features/finance/journals/utils/error-parser.ts](../../../apps/web/src/features/finance/journals/utils/error-parser.ts)
- Frontend purchase mapping CTA: [apps/web/src/features/purchase/payments/components/purchase-payments-list.tsx](../../../apps/web/src/features/purchase/payments/components/purchase-payments-list.tsx)
- Frontend sales mapping CTA: [apps/web/src/features/sales/payments/components/sales-payments-list.tsx](../../../apps/web/src/features/sales/payments/components/sales-payments-list.tsx)
- Frontend stock opname mapping CTA: [apps/web/src/features/stock/stock-opname/components/stock-opname-list.tsx](../../../apps/web/src/features/stock/stock-opname/components/stock-opname-list.tsx)

## Rule Catalog

| Rule ID | Rule Statement | Enforcement Layer | Triggered Error Code(s) |
|---|---|---|---|
| BR-001 | Mapping key must be non-empty for write/delete operations | BE | `VALIDATION_ERROR` |
| BR-002 | `company_id` query parameter must be valid UUID when provided | BE | `VALIDATION_ERROR` |
| BR-003 | Mapped COA must exist before upsert succeeds | BE | `VALIDATION_ERROR` |
| BR-004 | Mapped COA must be postable (`is_postable=true`) | BE | `ACCOUNT_NOT_POSTABLE` |
| BR-005 | Mapped COA must be active (`is_active=true`) | BE | `ACCOUNT_INACTIVE` |
| BR-006 | Missing mapping key in runtime posting flow must fail fast | BE | `MAPPING_NOT_CONFIGURED` |
| BR-007 | Required mapping keys cannot remain empty in admin save action | FE + BE | `VALIDATION_ERROR` |
| BR-008 | Journal lines must have at least two rows | BE | `VALIDATION_ERROR` |
| BR-009 | Journal must be balanced (total debit equals total credit) | BE | `JOURNAL_UNBALANCED` |
| BR-010 | Posting is blocked for closed accounting period | BE | `PERIOD_CLOSED` |
| BR-011 | Posting is blocked when any line account is non-postable | BE | `ACCOUNT_NOT_POSTABLE` |
| BR-012 | Posting is blocked when any line account is inactive | BE | `ACCOUNT_INACTIVE` |
| BR-013 | Concurrent posting on same reference must be lock-safe and reject collisions | BE | `CONCURRENT_LOCK_CONFLICT` |
| BR-014 | Purchase payment confirmation uses bank/cash fallback mapping when bank COA missing | BE | `MAPPING_NOT_CONFIGURED`, `ACCOUNT_NOT_POSTABLE`, `ACCOUNT_INACTIVE` |
| BR-015 | Sales payment confirmation uses bank/cash fallback mapping when bank COA missing | BE | `MAPPING_NOT_CONFIGURED`, `ACCOUNT_NOT_POSTABLE`, `ACCOUNT_INACTIVE` |
| BR-016 | Stock opname posting must resolve inventory/gain/loss mapping keys | BE | `MAPPING_NOT_CONFIGURED`, `ACCOUNT_NOT_POSTABLE`, `ACCOUNT_INACTIVE`, `PERIOD_CLOSED` |
| BR-017 | Stock ledger is append-only and written for stock-changing events (`GR`, `GI`, `OPNAME`) | BE | `INTERNAL_SERVER_ERROR` on persistence failure |
| BR-018 | Stock ledger read query must validate UUID, page, limit, and date range | BE | `VALIDATION_ERROR` |
| BR-019 | System-generated or non-draft journals are read-only in UI edit flow | FE | local UI lock state (no API call) |
| BR-020 | Mapping-related backend errors must surface actionable frontend navigation to mapping page in payment/opname flows | FE | mapped from backend code/message |

## Enforcement Notes

### Mapping Governance

- BR-001 to BR-007 establish mapping as a mandatory configuration boundary.
- Runtime posting flows depend on these rules to prevent hidden accounting defaults.

### Journal Governance

- BR-008 to BR-013 ensure postability, period integrity, and duplicate-safe posting behavior.

### Cross-Module Posting Governance

- BR-014 to BR-016 enforce that Purchase, Sales, and Stock Opname use centralized mapping and journal constraints.

### Inventory Audit Governance

- BR-017 and BR-018 provide immutable valuation traceability and safe query contracts.

### UI Safety Governance

- BR-019 and BR-020 ensure users see clear constraints and correction paths.

## Rule-to-Feature Quick Map

| Feature | Rule IDs |
|---|---|
| Account mapping setup | BR-001, BR-003, BR-004, BR-005, BR-007 |
| Manual journal posting | BR-008, BR-009, BR-010, BR-011, BR-012, BR-013 |
| Purchase payment confirm | BR-014, BR-020 |
| Sales payment confirm | BR-015, BR-020 |
| Stock opname posting | BR-016, BR-017, BR-020 |
| Product stock ledger read | BR-018 |
| Journal read-only UX | BR-019 |

## Change Control

When introducing a new posting flow:
1. Map it to existing rule IDs.
2. Reuse machine-readable codes from backend response catalog.
3. Add frontend error-to-action mapping if flow is user-triggered.
