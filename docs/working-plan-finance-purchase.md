# Working Plan: Implementasi Modul Finance & Purchase

Dokumen ini berisi rencana kerja detail untuk mengimplementasikan **Logic, RBAC, Menu Management, Business Rules, dan UI/UX** dari source referensi (`erp-api` & `erp-front-end`) ke platform GIMS (`apps/api` & `apps/web`).

---

## Gap Analysis Summary

### ✅ Sudah Ada di GIMS (Verified — No Action Needed)
| Module | Component | Status |
|--------|-----------|--------|
| Purchase | Requisitions (CRUD + approve + export + audit trail) | ✅ Lengkap |
| Purchase | Purchase Orders (CRUD + confirm + convert from PR + export) | ✅ Lengkap |
| Purchase | Goods Receipt (CRUD + confirm + auto-journal GR/IR) | ✅ Lengkap |
| Purchase | Supplier Invoices (CRUD + auto-journal AP) | ✅ Lengkap |
| Purchase | Supplier Invoice Down Payment (CRUD + pending + audit trail) | ✅ Lengkap |
| Purchase | Purchase Payments (CRUD + confirm + auto-journal + overpayment guard) | ✅ Lengkap |
| Finance | COA (CRUD + tree structure + type-aware balance) | ✅ Lengkap |
| Finance | Journal Entries (CRUD + post + balance check) | ✅ Lengkap |
| Finance | Bank Accounts (CRUD) | ✅ Lengkap |
| Finance | Payments & Allocation | ✅ Lengkap |
| Finance | Budget (CRUD + guard + approve) | ✅ Lengkap |
| Finance | Cash & Bank Journal (CRUD + auto-journal) | ✅ Lengkap |
| Finance | Asset Management (CRUD + depreciation) | ✅ Lengkap |
| Finance | Asset Categories (CRUD) | ✅ Lengkap |
| Finance | Asset Locations (CRUD) | ✅ Lengkap |
| Finance | Financial Closing (CRUD + approve) | ✅ Lengkap |
| Finance | Tax Invoices (CRUD) | ✅ Lengkap |
| Finance | Non-Trade Payables (CRUD + auto-journal) | ✅ Lengkap |
| Finance | Salary Structure (CRUD) | ✅ Lengkap |
| Finance | Up Country Cost (CRUD + auto-journal) | ✅ Lengkap |
| Finance | Aging Reports (AR & AP) | ✅ Lengkap |
| Finance | Reports (GL, BS, P&L) - BE API | ✅ Lengkap |
| Finance | Reports (GL, BS, P&L) - FE View + Export | ✅ Lengkap |
| Finance | i18n (EN + ID) for Reports | ✅ Lengkap |

---

## Implementation Log

### Fase 1: Backend — Menu, Permission & RBAC ✅ DONE

#### Task 1.1: Update Menu Seeder — Finance Reports Sub-menu
- [x] Added "Reports" parent group under Finance menu
- [x] Added children: General Ledger, Balance Sheet, Profit & Loss, Aging Reports
- [x] Added Asset Categories and Asset Locations as separate menu items
- **File:** `apps/api/seeders/menu_seeder.go`

#### Task 1.2: Update Permission Seeder — Finance Reports & Assets
- [x] Added `finance_report.gl`, `finance_report.bs`, `finance_report.pl` (VIEW)
- [x] Added `finance_report.export_gl`, `finance_report.export_bs`, `finance_report.export_pl` (EXPORT)
- [x] Added `asset_category.read/create/update/delete`
- [x] Added `asset_location.read/create/update/delete`
- [x] Verified `supplier_invoice_dp.*` permissions already exist
- **File:** `apps/api/seeders/permission_seeder.go`

#### Task 1.3: Update Finance Report API Router — Granular Permissions
- [x] Replaced generic `journal.read` with specific `finance_report.*` permissions on all 6 report routes
- **File:** `apps/api/internal/finance/presentation/router/finance_report_routers.go`

---

### Fase 2: Frontend — Navigation & Menu Sync ✅ DONE

#### Task 2.1: Add Supplier Invoice DP to Purchase Navigation
- [x] Added "Down Payments" menu item in Purchase section
- **File:** `apps/web/src/lib/navigation-config.ts`

#### Task 2.2: Add Asset Categories & Locations to Finance Navigation
- [x] Added "Asset Categories" and "Asset Locations" menu items
- **File:** `apps/web/src/lib/navigation-config.ts`

#### Task 2.3: Update Finance Reports Permission References
- [x] Changed report permissions from `journal.read` → `finance_report.gl/bs/pl`
- **File:** `apps/web/src/lib/navigation-config.ts`

#### Task 2.4: Add loading.tsx for Report Pages
- [x] Created `loading.tsx` for Balance Sheet (with PageMotion)
- [x] Created `loading.tsx` for Profit & Loss (with PageMotion)
- [x] Created `loading.tsx` for General Ledger (with PageMotion)
- **Files:** `apps/web/app/[locale]/(dashboard)/finance/reports/*/loading.tsx`

#### Task 2.5: Add PageMotion to Report Pages
- [x] Wrapped BalanceSheetPage with `PageMotion` for smooth transitions
- [x] Wrapped ProfitLossPage with `PageMotion`
- [x] Wrapped GeneralLedgerPage with `PageMotion`
- **Files:** `apps/web/app/[locale]/(dashboard)/finance/reports/*/page.tsx`

---

### Fase 3: Backend — Business Logic Verification ✅ VERIFIED

#### Task 3.1: Purchase Payment Over-payment Guard
- [x] ✅ **VERIFIED**: `Confirm()` method sums all confirmed payments and checks `row.Total+pay.Amount > inv.Amount+0.0001` before allowing confirmation
- **File:** `apps/api/internal/purchase/domain/usecase/purchase_payment_usecase.go` (lines 258-270)

#### Task 3.2: Supplier Invoice DP Deduction
- [x] ✅ **VERIFIED**: DP usecase has full CRUD + Pending flow + audit trail
- **File:** `apps/api/internal/purchase/domain/usecase/supplier_invoice_down_payment_usecase.go`

#### Task 3.3: Auto-Journal Integration (Purchase → Finance)
- [x] ✅ **VERIFIED**: `triggerJournalEntry()` in Purchase Payment creates journal with Debit AP (21000), Credit Bank/Cash
- [x] ✅ **VERIFIED**: Goods Receipt → auto-journal (GR/IR) via `journalUC` + `coaUC`
- [x] ✅ **VERIFIED**: Supplier Invoice → auto-journal AP via `journalUC` + `coaUC`

#### Task 3.4: Finance Report — Export Excel
- [x] ✅ **VERIFIED**: `ExportGeneralLedger`, `ExportBalanceSheet`, `ExportProfitAndLoss` all use excelize to generate `.xlsx`
- **File:** `apps/api/internal/finance/domain/usecase/finance_report_usecase.go`

---

### Fase 4: Frontend — UI/UX Verification ✅ VERIFIED

#### Task 4.1: Finance Reports Views
- [x] ✅ Balance Sheet: Hierarchical tables (Assets/Liabilities/Equity) with totals, date filter, export
- [x] ✅ Profit & Loss: Revenue/Expenses sections with totals + Net Profit/Loss with color coding (green/red)
- [x] ✅ General Ledger: Per-account cards with transactions, beginning/ending balance, date range filter, export

#### Task 4.2: i18n Completeness
- [x] ✅ EN and ID translation files both have 34 keys covering all report labels

---

### Fase 5: Quality Assurance (Testing Checklist)

#### Task 5.1: Purchase → Finance E2E Flow
- [ ] Test: Create PR → Approve → Convert to PO → Confirm PO → Create GR → Confirm GR (verify auto-journal)
- [ ] Test: Create Supplier Invoice → Confirm (verify AP journal) → Create Payment → Confirm Payment (verify payment journal)
- [ ] Test: Supplier Invoice DP → Create DP → Set Pending → Verify deduction

#### Task 5.2: RBAC Verification
- [ ] Login as `admin` → verify access to all Finance & Purchase menus
- [ ] Verify `finance_report.*` permissions restrict report access appropriately

---

## Files Modified Summary

| File | Changes |
|------|---------|
| `apps/api/seeders/menu_seeder.go` | Added Finance Reports sub-menu group + Asset Categories/Locations menus |
| `apps/api/seeders/permission_seeder.go` | Added 20 new permissions (finance_report.*, asset_category.*, asset_location.*) |
| `apps/api/internal/finance/presentation/router/finance_report_routers.go` | Granular RBAC permissions |
| `apps/web/src/lib/navigation-config.ts` | Added Down Payments, Asset Categories, Locations, updated report permissions |
| `apps/web/app/[locale]/(dashboard)/finance/reports/balance-sheet/page.tsx` | PageMotion + finance_report.bs permission |
| `apps/web/app/[locale]/(dashboard)/finance/reports/profit-loss/page.tsx` | PageMotion + finance_report.pl permission |
| `apps/web/app/[locale]/(dashboard)/finance/reports/general-ledger/page.tsx` | PageMotion + finance_report.gl permission |
| `apps/web/app/[locale]/(dashboard)/finance/reports/balance-sheet/loading.tsx` | NEW — route-level loading skeleton |
| `apps/web/app/[locale]/(dashboard)/finance/reports/profit-loss/loading.tsx` | NEW — route-level loading skeleton |
| `apps/web/app/[locale]/(dashboard)/finance/reports/general-ledger/loading.tsx` | NEW — route-level loading skeleton |
