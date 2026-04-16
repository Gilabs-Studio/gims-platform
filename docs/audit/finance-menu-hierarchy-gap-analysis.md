# Finance Menu Hierarchy Gap Analysis

> Module: Finance
> Scope: Backend menu seeders, permission seeder, frontend navigation, route validator
> Date: 2026-04-11
> Status: In Progress (implementation started)

## Overview

This document maps the current Finance hierarchy across:

- Backend menu structure (`apps/api/seeders/menu_seeder.go`)
- Backend permissions and role scopes (`apps/api/seeders/permission_seeder.go`)
- Frontend navigation (`apps/web/src/lib/navigation-config.ts`)
- Frontend route allowlist (`apps/web/src/lib/route-validator.ts`)

Goal: identify BE-FE inconsistencies and define a safe migration path toward a single canonical Finance hierarchy.

## Current Backend Finance Tree

Top-level:
- /finance

Level 2 groups:
- Accounting
- Accounts Receivable (AR)
- Accounts Payable (AP)
- Cash & Bank
- Fixed Assets (clickable URL: /finance/fixed-assets)
- Financial Reports
- Finance Settings (clickable URL: /finance/settings)

Leaf URLs:
- /finance/accounting/coa
- /finance/accounting/closing
- /finance/accounting/journal-entries
- /finance/accounting/journal-entries/purchase
- /finance/accounting/journal-entries/adjustment
- /finance/ar/customer-invoices
- /finance/ar/customer-payments
- /finance/ar/credit-notes
- /finance/ar/aging-reports
- /finance/ap/supplier-invoices
- /finance/ap/supplier-payments
- /finance/ap/debit-notes
- /finance/ap/non-trade-payables
- /finance/ap/aging-reports
- /finance/cash-bank/bank-accounts
- /finance/cash-bank/journals
- /finance/cash-bank/transfers
- /finance/cash-bank/reconciliation
- /finance/fixed-assets/assets
- /finance/fixed-assets/categories
- /finance/fixed-assets/locations
- /finance/fixed-assets/depreciation-schedule
- /finance/fixed-assets/disposal
- /finance/fixed-assets/revaluation
- /finance/reports/general-ledger
- /finance/reports/trial-balance
- /finance/reports/balance-sheet
- /finance/reports/profit-loss
- /finance/reports/cash-flow-statement
- /finance/settings/accounting-mapping
- /finance/settings/fiscal-years
- /finance/settings/tax-config

## Current Frontend Finance Tree

Frontend navigation tree currently mirrors the same canonical finance URLs above.

Notable behavior:
- Many canonical pages are currently redirect pages to legacy implementation routes.
- Some old legacy finance pages still exist and remain accessible directly.

## BE-FE Mapping Summary

### Fully Aligned (Menu URL + Nav URL + Route Validator)

Examples:
- /finance/accounting/coa
- /finance/accounting/journal-entries
- /finance/accounting/journal-entries/purchase
- /finance/accounting/journal-entries/adjustment
- /finance/accounting/closing
- /finance/ar/customer-invoices
- /finance/ar/customer-payments
- /finance/ar/credit-notes
- /finance/ar/aging-reports
- /finance/ap/supplier-invoices
- /finance/ap/supplier-payments
- /finance/ap/debit-notes
- /finance/ap/non-trade-payables
- /finance/ap/aging-reports
- /finance/cash-bank/bank-accounts
- /finance/cash-bank/journals
- /finance/cash-bank/transfers
- /finance/cash-bank/reconciliation
- /finance/fixed-assets/assets
- /finance/fixed-assets/categories
- /finance/fixed-assets/locations
- /finance/fixed-assets/depreciation-schedule
- /finance/fixed-assets/disposal
- /finance/fixed-assets/revaluation
- /finance/reports/general-ledger
- /finance/reports/trial-balance
- /finance/reports/balance-sheet
- /finance/reports/profit-loss
- /finance/reports/cash-flow-statement
- /finance/settings/accounting-mapping
- /finance/settings/fiscal-years
- /finance/settings/tax-config

### Partially Aligned (URL exists but permission is borrowed from another module)

- /finance/ar/customer-payments -> uses `payment.read`
- /finance/ar/credit-notes -> uses `sales_return.read`
- /finance/ap/supplier-invoices -> uses `supplier_invoice.read`
- /finance/ap/debit-notes -> uses `purchase_return.read`
- /finance/ap/aging-reports -> uses `aging_report.read`
- /finance/cash-bank/transfers -> uses `cash_bank_journal.read`
- /finance/cash-bank/reconciliation -> uses `cash_bank_journal.read`
- /finance/fixed-assets/depreciation-schedule -> uses `asset.depreciate`
- /finance/fixed-assets/revaluation -> uses `asset.read`
- /finance/settings/fiscal-years -> uses `finance_settings.read`

Implication: these pages are reachable and permission-gated, but do not have page-specific permission codes.

### Backend Permission Entries Not in Current Finance Navigation (Hybrid/Hidden)

- /finance/budget
- /finance/up-country-cost
- /finance/reports/reconciliation/arap

These are kept in backend seeder but intentionally hidden in current frontend finance navigation.

## Key Gaps

1. Permission granularity mismatch
- Backend menu has several finance leaf URLs without dedicated page-specific permission codes.
- Current implementation reuses cross-domain permissions for multiple finance URLs.

2. Canonical vs legacy route split
- New canonical finance hierarchy exists in navigation and menu seeders.
- Multiple canonical pages still redirect to old legacy pages.

3. Root/group landing gaps (fixed in this implementation step)
- /finance existed in route validation but had no page.
- /finance/settings and /finance/fixed-assets existed as backend clickable menu URLs but had no index pages.

4. Legacy shadow routes still present
- Legacy pages remain accessible directly, creating dual-path behavior.

## Ideal ERP Finance Hierarchy (Target)

1. Keep canonical hierarchy under /finance/... as the single source of truth.
2. Keep legacy URLs as temporary redirects only (not feature owners).
3. Enforce one page ownership rule:
- Canonical route owns UI and data fetching.
- Legacy route performs redirect only.
4. Move toward page-specific permissions for each finance leaf where business behavior differs.
5. Keep role scope rules module-aware (`finance` -> DIVISION for finance_manager/accountant).

## Action Plan

Phase A (Done in this step)
- Add missing landing redirects:
  - /finance -> /finance/accounting/coa
  - /finance/settings -> /finance/settings/accounting-mapping
  - /finance/fixed-assets -> /finance/fixed-assets/assets
- Add /finance/settings and /finance/fixed-assets to route validator allowlist.

Phase B (Next)
- Build a permission normalization matrix per finance leaf:
  - keep shared permission code, or
  - introduce finance-specific code and migrate frontend usage.

Phase C
- Collapse legacy finance pages into redirect-only pages.
- Ensure canonical pages host real feature containers.

Phase D
- Add tests/checks:
  - route consistency check (menu seeder vs nav config vs route-validator)
  - permission coverage check (every active finance menu leaf has a chosen permission strategy)

## Risks

- Introducing new permission codes without role migration can hide menus for existing roles.
- Removing legacy pages too early can break deep links and bookmarks.
- Shared permissions across multiple pages can over-grant access if not documented.

## Implementation Notes (This Commit)

Files changed in this step:
- apps/web/app/[locale]/(dashboard)/finance/page.tsx
- apps/web/app/[locale]/(dashboard)/finance/settings/page.tsx
- apps/web/app/[locale]/(dashboard)/finance/fixed-assets/page.tsx
- apps/web/src/lib/route-validator.ts

No backend schema or API contract changes were applied in this step.
