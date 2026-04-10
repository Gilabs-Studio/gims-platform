# Finance Menu Hierarchy Audit (Seeder vs Sidebar)

> Module: Finance
> Scope: Backend menu seeder, frontend sidebar navigation, permission-role mapping
> Date: 2026-04-09
> Status: Analysis Complete

## Sources of Truth

- Backend menu seeder: [apps/api/seeders/menu_seeder.go](apps/api/seeders/menu_seeder.go#L421)
- Backend permission seeder: [apps/api/seeders/permission_seeder.go](apps/api/seeders/permission_seeder.go#L364)
- Frontend navigation/sidebar config: [apps/web/src/lib/navigation-config.ts](apps/web/src/lib/navigation-config.ts#L294)
- Frontend navigation runtime filter by permission: [apps/web/src/hooks/use-navigation.ts](apps/web/src/hooks/use-navigation.ts#L59)
- Frontend route validation allowlist: [apps/web/src/lib/route-validator.ts](apps/web/src/lib/route-validator.ts#L19)
- Backend finance route registration: [apps/api/internal/finance/presentation/routes.go](apps/api/internal/finance/presentation/routes.go#L152)

---

## 1. Current Menu Structure (Tree)

Legend:
- [OK] = Seeder BE and Sidebar FE are aligned
- [BE only] = exists in backend menu seeder, not in frontend sidebar
- [FE only] = exists in frontend sidebar, not in backend menu seeder
- [Unlinked] = exists as page/route but not linked by sidebar/menu structure
- [Inconsistent] = same function/route with naming or grouping mismatch

Finance
- Accounting [FE only]
  - Bank Accounts [OK]
  - Chart of Accounts [OK]
  - Journal [FE only]
    - Journal Entries [OK]
    - Sales Journal [OK]
    - Purchase Journal [OK]
    - Adjustment Journal [OK]
    - Journal Valuation [OK]
    - Cash and Bank Journal [Inconsistent: BE name is Cash Transactions (Journal View)]
    - Journal Lines [Unlinked legacy: commented in FE sidebar]
  - Financial Closing [OK]
- Receivables and Payables [FE only]
  - Non-Trade Payables [OK]
  - Tax Invoices [OK]
  - Aging Reports [OK]
- Budgeting and Cost [FE only]
  - Budget [OK]
  - Salary [OK]
- Asset Management [Inconsistent]
  - Assets [OK route, BE label differs: Asset Management]
  - Asset Categories [OK]
  - Asset Locations [OK]
  - Asset Budgets [BE only]
  - Asset Maintenance [BE only]
- Financial Statements [FE only]
  - General Ledger [OK]
  - Balance Sheet [OK]
  - Profit and Loss [OK]
  - Trial Balance [BE legacy only, deprecated]
- Finance Settings [Inconsistent]
  - Accounting Mapping [OK]
- Payments [BE only, FE page exists but not in sidebar]
- AR/AP Reconciliation [BE only]
- Up Country Cost [BE only]
- Cash Bank (legacy route) [Unlinked: FE page exists, no active sidebar]
- Finance Reports (group) [BE only group]

Evidence highlights:
- FE hierarchical grouping starts at [apps/web/src/lib/navigation-config.ts](apps/web/src/lib/navigation-config.ts#L300)
- BE finance children are mostly flat plus Journal/Reports/Finance Settings groups at [apps/api/seeders/menu_seeder.go](apps/api/seeders/menu_seeder.go#L421), [apps/api/seeders/menu_seeder.go](apps/api/seeders/menu_seeder.go#L489), [apps/api/seeders/menu_seeder.go](apps/api/seeders/menu_seeder.go#L513)
- BE marks some finance URLs as deprecated at [apps/api/seeders/menu_seeder.go](apps/api/seeders/menu_seeder.go#L737)

---

## 2. Seeder vs FE Mapping Table

| Menu Name | Seeder (BE) | Sidebar (FE) | Status | Notes |
|----------|------------|-------------|--------|------|
| Finance | Yes | Yes | OK | Root module exists on both sides |
| Accounting | No | Yes | MISSING BE | FE-only parent group |
| Chart of Accounts | Yes | Yes | OK | /finance/coa |
| Journal (group) | Yes (empty URL parent) | Yes (/finance/journal) | INCONSISTENT NAMING | Parent URL handling differs |
| Journal Entries | Yes | Yes | OK | /finance/journals |
| Sales Journal | Yes | Yes | DUPLICATE | Permission code sales_journal.read defined twice in BE |
| Purchase Journal | Yes | Yes | OK | /finance/journals/purchase |
| Adjustment Journal | Yes | Yes | OK | /finance/journals/adjustment |
| Journal Valuation | Yes | Yes | OK | /finance/journals/valuation |
| Cash and Bank Journal | Yes | Yes | INCONSISTENT NAMING | BE label: Cash Transactions (Journal View), FE label: Cash and Bank Journal |
| Journal Lines | Legacy/deprecated | Commented in FE | MISSING FE | Backend route exists but hidden from active navigation |
| Bank Accounts | Yes | Yes | OK | /finance/bank-accounts |
| Financial Closing | Yes | Yes | OK | /finance/closing |
| Receivables and Payables | No | Yes | MISSING BE | FE-only parent group |
| Non-Trade Payables | Yes | Yes | OK | /finance/non-trade-payables |
| Tax Invoices | Yes | Yes | OK | /finance/tax-invoices |
| Aging Reports | Yes | Yes | OK | Grouping differs between BE and FE |
| Payments | Yes | No | MISSING FE | FE page exists but not shown in sidebar |
| Budgeting and Cost | No | Yes | MISSING BE | FE-only parent group |
| Budget | Yes | Yes | OK | /finance/budget |
| Salary | Yes | Yes | OK | /finance/salary |
| Asset Management (parent) | Yes (/finance/assets) | Yes (/finance/asset-management) | INCONSISTENT NAMING | Same concept, different route semantics |
| Assets | Yes | Yes | OK | /finance/assets |
| Asset Categories | Yes | Yes | OK | /finance/asset-categories |
| Asset Locations | Yes | Yes | OK | /finance/asset-locations |
| Asset Budgets | Yes | No | MISSING FE | No FE page and no sidebar item |
| Asset Maintenance | Yes | No | MISSING FE | No FE page and no sidebar item |
| Up Country Cost | Yes | No | MISSING FE | No FE page and not in sidebar |
| AR/AP Reconciliation | Yes | No | MISSING FE | No FE page and not in sidebar |
| Financial Statements | No | Yes | MISSING BE | FE-only parent group |
| General Ledger | Yes | Yes | OK | /finance/reports/general-ledger |
| Balance Sheet | Yes | Yes | OK | /finance/reports/balance-sheet |
| Profit and Loss | Yes | Yes | OK | /finance/reports/profit-loss |
| Trial Balance | Yes (then deprecated) | No | MISSING FE | Seeder/permission define then deprecate/remove |
| Finance Settings | Yes | FE uses Settings | INCONSISTENT NAMING | BE: Finance Settings, FE: Settings |
| Accounting Mapping | Yes | Yes | OK | /finance/settings/accounting-mapping |
| Cash Bank (legacy page) | Deprecated menu URL | No | MISSING FE | FE page file exists but content commented and no sidebar link |

---

## 3. Identified Problems

### A. Structural
- Backend finance menu is mixed flat + grouped model, while frontend uses enterprise-style grouped model. Parent-child alignment is not one-to-one.
- FE parent groups (Accounting, Receivables and Payables, Budgeting and Cost, Financial Statements) do not exist as BE menus.
- BE has standalone root-level functional menus (Payments, AR/AP Reconciliation, Up Country Cost, Asset Budgets, Asset Maintenance) not represented in FE hierarchy.

### B. Duplication
- Permission code sales_journal.read is declared twice with different menu URLs in [apps/api/seeders/permission_seeder.go](apps/api/seeders/permission_seeder.go#L371) and [apps/api/seeders/permission_seeder.go](apps/api/seeders/permission_seeder.go#L487).
- Trial Balance is created in finance report permissions and menu, then deprecated/removed in same seeding flow: [apps/api/seeders/menu_seeder.go](apps/api/seeders/menu_seeder.go#L526), [apps/api/seeders/menu_seeder.go](apps/api/seeders/menu_seeder.go#L746), [apps/api/seeders/permission_seeder.go](apps/api/seeders/permission_seeder.go#L484), [apps/api/seeders/permission_seeder.go](apps/api/seeders/permission_seeder.go#L728).

### C. Missing / Unlinked
- BE menu exists but FE sidebar missing: Payments, Asset Budgets, Asset Maintenance, Up Country Cost, AR/AP Reconciliation, Trial Balance.
- FE page exists but sidebar missing: /finance/payments and /finance/cash-bank.
- Hidden legacy menu references still exist in code/comments: /finance/journal-lines in FE config comments and deprecated list in BE.

### D. UX and ERP Grouping Issues
- Naming mismatch reduces discoverability (Finance Settings vs Settings, Asset Management vs Assets, Cash Transactions (Journal View) vs Cash and Bank Journal).
- Financial reporting and AR/AP analysis are grouped differently between BE and FE, creating mental model mismatch for users.
- FE route /finance/journals/inventory redirects to stock movements, indicating cross-module navigation leak rather than clear Finance IA.

---

## 4. Ideal ERP Menu Structure (Target)

Finance
- Accounting
  - Chart of Accounts
  - Bank Accounts
  - Journal
    - Journal Entries
    - Sales Journal
    - Purchase Journal
    - Adjustment Journal
    - Journal Valuation
    - Cash and Bank Journal
  - Financial Closing
- Receivables and Payables
  - Non-Trade Payables
  - Payments
  - AR/AP Reconciliation
  - Aging Reports
- Budgeting and Cost
  - Budget
  - Salary
  - Up Country Cost
- Asset Management
  - Assets
  - Asset Categories
  - Asset Locations
  - Asset Budgets
  - Asset Maintenance
- Financial Statements
  - General Ledger
  - Trial Balance (activate only if business-approved)
  - Balance Sheet
  - Profit and Loss
- Taxation
  - Tax Invoices
- Finance Settings
  - Accounting Mapping

Principles:
- Single canonical naming per menu.
- Parent groups are non-clickable containers unless they have dedicated dashboard pages.
- Every sidebar item must have active FE page and active BE permission/menu mapping.

---

## 5. Gap Analysis (Before vs After)

### Move
- Move Tax Invoices from Receivables and Payables grouping into Taxation.
- Move Payments into Receivables and Payables.
- Move Aging Reports under Receivables and Payables (or keep duplicate in Financial Statements as report shortcut, but only one canonical menu).
- Move Up Country Cost into Budgeting and Cost.

### Remove
- Remove legacy /finance/cash-bank route from active IA if journals/cash-bank is canonical.
- Remove dead/commented Journal Lines menu references if feature remains hidden.
- Remove contradictory trial-balance seed/deprecate cycle until feature is approved for activation.

### Add
- Add FE sidebar entries (or explicit feature-flag placeholders) for:
  - Asset Budgets
  - Asset Maintenance
  - AR/AP Reconciliation
  - Up Country Cost
  - Payments (already has FE page)

### Rename
- BE Finance Settings -> Finance Settings (keep this as canonical label in FE too).
- BE Asset Management (route /finance/assets) -> Assets (child), with parent Asset Management as container.
- BE Cash Transactions (Journal View) -> Cash and Bank Journal.
- Align Journal parent route convention (journal vs journals) to avoid singular/plural confusion.

---

## 6. Recommended Actions

1. Freeze one canonical finance information architecture document and adopt it as single source of truth for both SeedMenus and navigation-config.
2. Refactor menu seeder finance section to mirror FE grouping (or refactor FE grouping to match BE), not both.
3. Decide status of these features and reflect consistently in BE menu, permission, FE sidebar, FE page:
   - Payments
   - Asset Budgets
   - Asset Maintenance
   - Up Country Cost
   - AR/AP Reconciliation
   - Trial Balance
4. Clean legacy/deprecated contradictions:
   - Remove duplicated sales_journal.read permission definition.
   - Stop creating-and-deprecating Trial Balance in same seed cycle.
   - Remove obsolete /finance/journal-lines and /finance/cash-bank menu traces if no longer used.
5. Add automated sync check (CI script) to compare finance URLs across:
   - menu_seeder
   - permission_seeder
   - navigation-config
   - app finance page routes
6. Keep permission-role scopes as currently designed, but ensure every menu item shown in sidebar has matching active permission and working page.

---

## Permission and Role Mapping Summary (Finance)

- Sidebar visibility is permission-driven from FE side via [apps/web/src/hooks/use-navigation.ts](apps/web/src/hooks/use-navigation.ts#L12).
- Finance permissions are seeded in [apps/api/seeders/permission_seeder.go](apps/api/seeders/permission_seeder.go#L364).
- Role scope assignment for finance-centric roles is defined in:
  - Finance manager scope mapping: [apps/api/seeders/permission_seeder.go](apps/api/seeders/permission_seeder.go#L827)
  - Accountant scope mapping: [apps/api/seeders/permission_seeder.go](apps/api/seeders/permission_seeder.go#L846)
  - Auditor read-only assignment: [apps/api/seeders/permission_seeder.go](apps/api/seeders/permission_seeder.go#L864)

This means navigation can hide correctly by permission, but structure mismatch still persists because menu definitions are not synchronized across BE seeder and FE config.

---

## 7. Implementation Update (2026-04-09)

Implemented in code:
- Backend finance menu hierarchy was refactored into grouped parents:
  - Accounting
  - Receivables and Payables
  - Budgeting and Cost
  - Asset Management
  - Financial Statements
  - Taxation
  - Finance Settings
- Journal labels were aligned:
  - Journal Valuation -> Inventory Journal (label only, route and permission code unchanged)
  - Cash Transactions (Journal View) -> Cash and Bank Journal
- Re-parenting completed:
  - Payments + AR/AP Reconciliation -> Receivables and Payables
  - Up Country Cost -> Budgeting and Cost
  - Tax Invoices -> Taxation
- Placeholder pages added:
  - /finance/asset-budgets
  - /finance/asset-maintenance
  - /finance/asset-disposal
  - /finance/reports/cash-flow-statement
- Legacy cleanup completed:
  - Removed FE legacy route /finance/cash-bank page and loading file
  - Removed Journal Lines sidebar residue
  - Removed active Finance Reports group creation in backend seeder
  - Trial Balance removed from seeded active menu and active seeded permissions
  - Duplicate permission sales_journal.read removed

Important decisions retained:
- Trial Balance remains available at API layer for compatibility, but is not seeded as active menu/sidebar item.
- Inventory Journal is a label rename only; existing route and permission keys stay stable.

Post-change safeguards:
- Seeder cleanup now deactivates legacy menu trees (old Journal/Reports children) to avoid active duplicate URL entries.
- Permission seeding now maps permissions only to active menus, reducing risk of linking to inactive legacy menu rows.
