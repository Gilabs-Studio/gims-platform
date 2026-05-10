# Fixed Assets Depreciation Implementation Summary
**Date:** May 10, 2026  
**Branch:** fix/app/finance  
**Scope:** Sub-menu Depreciation (Run Depreciation flow) - Gaps #3, #6, #10

---

## Overview
Implemented comprehensive depreciation run endpoint with proper two-table separation, accounting period validation, and tenant isolation. All changes are backward-compatible and database-schema-agnostic (no migrations required for schedules).

---

## Changes by File

### 1. Backend Service Layer
**File:** `apps/api/internal/finance/domain/service/depreciation_service.go` (NEW)

- **Added:** `CalculateDepreciationForPeriod(asset, period) (amount, accumulated, bookValue, err)`
- **Purpose:** Per-asset depreciation calculation wrapper for a given period (YYYY-MM format)
- **Behavior:**
  - Uses existing `DepreciationEngine` internally
  - Recalculates depreciation independently (does NOT trust schedules)
  - Caps amount at `book_value - salvage_value`
  - Returns rounded values (2 decimals)
- **Scope:** Replaces inline calculations in usecase layer

---

### 2. Accounting Period Repository Enhancement
**File:** `apps/api/internal/finance/data/repositories/accounting_period_repository.go`

- **Added Method:** `IsClosed(ctx, tenantID, periodName) (bool, error)`
- **Purpose:** Check if a period (YYYY-MM) is closed for a tenant before depreciation posting
- **Implementation:**
  - Tenant-scoped query
  - Returns `true` if `status == "closed"`, else `false`
  - Safe null-check on not-found
- **Usage:** Called in `RunDepreciation` to validate period before processing (FIX #10)

---

### 3. Depreciation Run Usecase Enhancement
**File:** `apps/api/internal/finance/domain/usecase/depreciation_usecase.go`

#### Changes to `RunDepreciation()` method:

1. **Accounting Period Validation (FIX #10) — Line ~545**
   ```go
   closed, err := uc.apRepo.IsClosed(ctx, tenantID, periodKey)
   if closed {
       return nil, errors.New("Periode akuntansi sudah ditutup")
   }
   ```
   - Validates before idempotency check
   - Returns user-friendly Indonesian error message

2. **Asset Transaction Event Logging (FIX #3) — Line ~556-571**
   ```go
   trans := &financeModels.AssetTransaction{
       TenantID: asset.TenantID,
       Type: AssetTransactionTypeDepreciate,
       ReferenceType: &refType,
       ReferenceID: &dep.ID,  // Points to asset_depreciations.id, not itself
       Status: AssetTransactionStatusPosted,
       // ... other fields
   }
   ```
   - Creates transaction ONLY as event log
   - References `asset_depreciations.id` (not the transaction itself)
   - Does NOT act as ledger (ledger is always `asset_depreciations`)

3. **Schedule Marking (FIX #6) — Line ~573-583**
   ```go
   if err := tx.Model(&financeModels.AssetDepreciationSchedule{}).
       Where("tenant_id = ? AND asset_id = ? AND period_start_date = ?", 
             asset.TenantID, asset.ID, periodStart).
       Updates(map[string]interface{}{
           "is_posted": true,
           "posted_at": &now,
           "journal_entry_id": journalEntry.ID,
       }).Error; err != nil { ... }
   ```
   - Tenant-scoped schedule update
   - Marks schedule as posted after depreciation ledger entry created
   - Updates journal reference for traceability

---

### 4. Asset Usecase Constructor Update
**File:** `apps/api/internal/finance/domain/usecase/asset_usecase.go`

**Before:**
```go
func NewAssetUsecase(db, coaRepo, catRepo, locRepo, repo, mapper, ...) AssetUsecase
```

**After:**
```go
func NewAssetUsecase(db, coaRepo, catRepo, locRepo, apRepo, repo, mapper, ...) AssetUsecase
```
- Added `AccountingPeriodRepository` parameter (3rd-to-last position)
- Stored in struct as `apRepo` field
- All 4 instantiation sites updated:
  1. `internal/finance/presentation/routes.go`
  2. `seeders/journal_reconciliation_seeder.go`
  3. `cmd/tools/audit_fixer/main.go`
  4. `internal/finance/domain/usecase/asset_usecase_create_test.go`
  5. `internal/finance/domain/usecase/asset_create_test.go`

---

## Architecture Overview

### Two-Table Ledger vs. Plan Separation
```
asset_depreciation_schedules (PROJECTION/PLAN)
  ├─ Tenant-scoped: tenant_id indexed
  ├─ Generated/Regenerated on asset create/update
  ├─ Shows future depreciation month-by-month
  ├─ May be recalculated if unposted
  └─ Marked "is_posted=true" only after ledger entry created

asset_depreciations (LEDGER/ACTUAL)
  ├─ Tenant-scoped: tenant_id indexed
  ├─ One record per asset per period (YYYY-MM)
  ├─ Immutable once created
  ├─ Status: "pending" → "approved" (upon journal posting)
  └─ Accounts for all historical depreciation
```

### Validation Flow (RunDepreciation)

```
1. Authorize RUN_DEPRECIATION
   ↓
2. Extract tenant_id from auth context
   ↓
3. [FIX #10] Check accounting_periods: is period closed for tenant?
   ├─ YES → Error "Periode akuntansi sudah ditutup"
   └─ NO → Continue
   ↓
4. [Idempotency] Check asset_depreciations for (tenant, period) pair
   ├─ Exists → Error "depreciation already run for this period"
   └─ Not found → Continue
   ↓
5. Collect eligible assets
   - WHERE status='active', is_depreciable=true
   - Filters: category, location (optional)
   ↓
6. For each asset:
   a. Call CalculateDepreciationForPeriod() → amount, accumulated, bookValue
   b. Cap amount at (bookValue - salvageValue)
   c. Within DB transaction:
      i.   Insert asset_depreciations (ledger)
      ii.  Insert journal_entries + lines (per-asset)
      iii. Update fixed_assets (accumulated, bookValue, is_fully_depreciated)
      iv.  [FIX #6] Update asset_depreciation_schedules (is_posted, posted_at)
      v.   Insert asset_audit_logs (trail)
      vi.  [FIX #3] Insert asset_transactions (event log only, ref→asset_depreciations.id)
   ↓
7. Emit depreciation.posted event
   ↓
8. COMMIT
```

---

## Affected Repositories (No Changes, Already Support tenant_id)

- `asset_depreciation_schedule_repository` — Uses existing model (has tenant_id in GORM struct)
- `asset_depreciation_repository` — Already enforces tenant_id in scope
- `asset_repository` — Alreadyscope-filtered

---

## Validation Checklist

### Compile & Test
- ✅ Go compilation after all struct/signature changes
- ✅ Asset usecase constructor signature updated in 5 places
- ✅ Tests pass (asset_create_test.go, asset_usecase_create_test.go updated)

### Functional Verification (Manual)
- [ ] **Accounting Period Validation:**
  - Run depreciation for open period → success
  - Run depreciation for closed period → error "Periode akuntansi sudah ditutup"

- [ ] **Idempotency:**
  - Run depreciation for (tenant, period) first time → success
  - Run again for same (tenant, period) → error "depreciation already run for this period"
  - Verify no duplicate ledger rows

- [ ] **Ledger vs. Event Log:**
  - Check `asset_depreciations` has one record per asset per period
  - Check `asset_transactions` rows created with ReferenceID pointing to asset_depreciations.id
  - Verify asset_transactions.Type = "depreciate" and Status = "posted"

- [ ] **Schedule Marking:**
  - Check `asset_depreciation_schedules` rows marked `is_posted=true, posted_at=<now>` after run
  - Confirm no duplicate schedules created

- [ ] **Calculation Accuracy:**
  - Test straight_line: amount = (acq_cost - salvage) / useful_life_months
  - Test declining_balance: amount = (2 / useful_life_months) × book_value
  - Verify cap applied: amount ≤ (book_value - salvage_value)
  - Check rounding: all decimals are 2 places

- [ ] **Asset Updates:**
  - Verify `fixed_assets.accumulated_depreciation` incremented correctly
  - Verify `fixed_assets.book_value` decremented correctly
  - Verify `fixed_assets.is_fully_depreciated` set when book_value ≤ salvage_value

- [ ] **Fully Depreciated Assets:**
  - Assets with book_value ≤ salvage_value should be skipped during run
  - Verify RunDepreciation counts them as "skipped"

- [ ] **Multi-Tenant Isolation:**
  - Create depreciation runs for two different tenants same period
  - Verify each tenant's ledger, schedules, transactions remain isolated
  - Confirm WHERE clauses include tenant_id

---

## Migration Notes

### No Schema Changes Required
- `asset_depreciation_schedules` model already has `tenant_id` field in GORM struct
- Existing schedules generated by prior asset creation already include `tenant_id` (via generateDepreciationSchedule)
- If legacy schedules exist without tenant_id:
  1. Check migration `20260510_fix_fixed_assets_schema_gaps.sql` for historical backfill
  2. If needed, run backfill script (below)

### Optional Backfill (if legacy schedules lack tenant_id)
```sql
-- Backfill tenant_id for existing schedules from asset
UPDATE asset_depreciation_schedules ads
SET tenant_id = fa.tenant_id
WHERE ads.tenant_id IS NULL
  AND ads.asset_id = fa.id;
```

---

## References & Links

### Related Code Locations
- Depreciation engine: `internal/finance/domain/service/depreciation_engine.go`
- Existing schedule generation: `asset_usecase.go::generateDepreciationSchedule()`
- Existing schedule regeneration: `asset_edit_helper.go::regenerateDepreciationSchedule()`
- Handler/Router: `internal/finance/presentation/handler/asset_handler.go` (RunDepreciation, GetDepreciationSchedule, etc.)

### API Endpoints
- `POST /api/v1/fixed-assets/depreciation/run` — Run depreciation batch
- `GET /api/v1/fixed-assets/depreciation/schedule?period=2026-05` — Get schedule for period

### Frontend Hooks (to be wired)
- `apps/web/src/features/finance/fixed-assets/hooks/use-batch-depreciation.ts`
- `apps/web/src/features/finance/fixed-assets/components/batch-depreciation-preview.tsx`
- `apps/web/src/features/finance/fixed-assets/components/batch-depreciation-results.tsx`

---

## Next Steps (Frontend & Testing)

1. **Update frontend hooks** to call preview endpoint (reads from schedules) and validate accounting period open
2. **Update preview component** to show eligible assets, total amount, and period validation errors
3. **Update run component** to display results (posted, skipped, failed counts)
4. **Manual testing** per checklist above
5. **Integration test** with real DB to verify journal creation and scope filtering

---

## Known Limitations & Future Improvements

1. **Bulk Journal Creation:** Current implementation creates individual journal entries per asset. Could batch if performance issues arise.
2. **Async Processing:** For very large asset portfolios (>10k assets), consider async job queue.
3. **Schedule Preview Accuracy:** Schedule preview uses engine.GenerateSchedule(); ensure cached schedules align with runtime recalculation.
4. **Future: Depreciation Run Approval Workflow:** Currently posts directly (status='approved'). Could add approval state if needed.

---

## Sign-off

- **Implementation Date:** May 10, 2026
- **Branch:** fix/app/finance
- **Ready for Review:** Yes
- **Backward Compatible:** Yes (no breaking API changes, only internal enhancements)
