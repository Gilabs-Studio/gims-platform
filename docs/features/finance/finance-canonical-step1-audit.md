# Finance Canonical Refactor - Step 1 Audit Baseline

Date: 2026-04-10
Scope: Current-state audit before canonical refactor implementation

## 1. Backend Route Baseline

Finance root is registered at `/finance` in:
- `apps/api/internal/finance/presentation/routes.go`

Current route groups are feature-centric (not canonical IA-centric):
- chart-of-accounts
- journal-lines
- journal-entries
- payments
- budget
- cash-bank
- aging-reports
- asset-categories
- asset-locations
- assets
- financial-closing
- tax-invoices
- non-trade-payables
- salary
- reports
- arap reconciliation
- settings
- system account mapping

Notable legacy/canonical mismatches:
- Journal Entries currently exposes write routes (POST/PUT/DELETE) under `/finance/journal-entries`.
- Inventory/valuation journal routes exist under Finance (`/finance/journal-entries/inventory`, `/finance/journal-entries/valuation`).
- Salary routes exist in Finance.
- Flat `/finance/payments` exists.

## 2. Menu Seeder Baseline

File:
- `apps/api/seeders/menu_seeder.go`

Current Finance menu is grouped but not canonical to the new target:
- Accounting
- Receivables and Payables
- Budgeting and Cost
- Asset Management
- Financial Statements
- Taxation
- Finance Settings

Current child URLs still use old pattern such as:
- `/finance/coa`
- `/finance/journals/*`
- `/finance/payments`
- `/finance/salary`
- `/finance/reports/cash-flow-statement`

## 3. Permission Seeder Baseline

File:
- `apps/api/seeders/permission_seeder.go`

Current permissions are mostly legacy naming style (e.g. `coa.read`, `journal.read`, `payment.read`) and not yet canonical namespace format (`finance.<resource>.<action>`).

Current state includes:
- Journal entries write permissions under `/finance/journals`
- Inventory/valuation journal permissions under Finance (`journal_valuation.*`)
- Finance salary and flat payment permissions

## 4. Frontend Baseline

Navigation file:
- `apps/web/src/lib/navigation-config.ts`

Current Finance navigation still points to old route family, including:
- `/finance/coa`
- `/finance/journals/*`
- `/finance/payments`
- `/finance/salary`
- `/finance/reports/cash-flow-statement`

Route validator file:
- `apps/web/src/lib/route-validator.ts`

Allowlist still contains old non-canonical routes, including many that are in removal scope.

Page routing reality check:
- Repo uses **App Router** pages under `apps/web/app/[locale]/(dashboard)/finance/**`
- There is no active `apps/web/src/pages/finance/**` structure in this repository.

## 5. Canonical Gap Summary

Major gaps against finalized canonical structure:
1. Backend routes are not grouped by canonical IA (`/finance/accounting`, `/finance/ar`, `/finance/ap`, `/finance/cash-bank`, `/finance/assets`, `/finance/reports`, `/finance/settings`).
2. Journal Entries is not read-only yet (write endpoints still present).
3. Inventory/valuation journal is still Finance-owned route surface.
4. Legacy menu/routes remain in both backend and frontend (`salary`, flat `payments`, legacy journal families).
5. Permission naming has not been normalized to `finance.<resource>.<action>`.
6. Frontend route base uses App Router paths and needs canonical remap accordingly.

## 6. Data Integrity Constraints Confirmed

Menu model currently does not include canonical metadata fields required by target spec:
- `slug`
- `module`
- `is_clickable`
- `is_active`

Existing menu model fields are:
- `name`, `icon`, `url`, `parent_id`, `order`, `status`

Conclusion:
- Canonical seeder requirements need an additive schema migration first.
- Ledger tables (`journal_entries`, `journal_entry_lines`) are untouched in this step.

## 7. Step 1 Deliverables Completed

- Route inventory complete
- Seeder inventory complete
- Frontend page/navigation inventory complete
- Canonical gap baseline recorded

Next implementation step:
- Step 2: add menu metadata schema migration + model update to enable canonical menu seeding format.
