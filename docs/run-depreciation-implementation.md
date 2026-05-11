# Run Depreciation & Schedule Implementation

**Date:** May 8, 2026  
**Module:** Fixed Assets (PSAK 16 Phase 4)  
**Feature:** Batch Depreciation Runner + Depreciation Schedule Viewer

---

## Overview

This document covers the complete implementation of:
1. **Batch Depreciation Runner** - POST `/api/depreciation/run` for monthly batch posting
2. **Depreciation Schedule** - GET `/api/depreciation/schedule` to preview pending items
3. **Depreciation History** - GET `/api/depreciation/history` to view posted entries
4. **Schedule UI** - Full-featured page at `/finance/fixed-assets/depreciation-schedule`

---

## Backend Architecture

### New Services

**File:** `apps/api/internal/finance/domain/usecase/depreciation_usecase.go`

#### Core Functions

- `calculateDepreciation(asset, method)` - Calculates depreciation amount based on method:
  - **Straight-Line (SL):** `acquisition_cost / useful_life_months`
  - **Double Declining Balance (DB):** `(2 / useful_life_months) * book_value`
  - Caps at salvage value automatically

- `GetDepreciationSchedule(ctx, req)` - Query helper to preview pending depreciation
  - Filters by period, asset_id, category_id, location_id
  - Returns highlighted items that haven't been posted yet
  - Counts posted vs pending

- `GetDepreciationHistory(ctx, period)` - Retrieve posted entries for audit
  - Shows all depreciation records in a given period
  - Links to journal entries
  - Status: posted or pending

- `RunDepreciation(ctx, req)` - Core batch runner (ATOMIC TRANSACTION)

### Run Depreciation Business Logic

**Endpoint:** `POST /api/depreciation/run`  
**Permission:** `depreciation.run`  
**Input:** `RunDepreciationRequest { period, asset_id?, category_id?, location_id? }`

**Flow (Single Transaction):**

```
1. Parse period (YYYY-MM format)
2. Idempotency check: Reject if period already has any depreciation entries for this tenant
3. Load all active assets matching filters (with Category, Location preload)
4. For each asset:
   a. Check if can depreciate (CanDepreciate() method)
   b. Calculate amount based on method (SL, DB, or skip if NONE)
   c. Cap at salvage value floor
   d. Check again: if not > 0, skip
   e. Create AssetDepreciation record (status=pending initially)
   f. Create JournalEntry (Dr. Depreciation Expense, Cr. Accumulated Depreciation)
   g. Create 2 JournalLine records (debit + credit)
   h. Update AssetDepreciation: set status=approved, link journal_entry_id
   i. UPDATE Asset: accumulated_depreciation += amount, book_value -= amount
   j. CREATE AssetAuditLog with metadata:
      - "depreciation.posted" event
      - period, amount, journal_id, company_id
   k. Add to results
5. Commit all or rollback on any error
6. Return BatchDepreciationRunResponse with posted/skipped/failed counts
```

**Response:**
```json
{
  "currency_code": "IDR",
  "processed": 45,
  "posted": 42,
  "skipped": 2,
  "failed": 1,
  "items": [
    {
      "asset_id": "...",
      "asset_code": "AST-202601-0001",
      "asset_name": "Server Rack",
      "currency_code": "IDR",
      "amount": 850000,
      "status": "posted",
      "journal_entry_id": "..."
    }
  ]
}
```

### Key Invariants

- **Idempotency:** One period = one successful run per tenant. Second run for same period = REJECTED (409 Conflict)
- **Immutability:** Posted entries (status=approved OR journal_entry_id ≠ NULL) cannot be edited/deleted
- **Corrections:** Must use reversing journal entries (Dr. Accumulated Depreciation, Cr. Expense)
- **Cascade:** All operations in one atomic transaction; fails whole batch on any error per asset
- **Audit:** Every depreciation run creates audit log with "depreciation.posted" event metadata

### DTO Changes

**New Types (asset_dto.go):**
```go
type RunDepreciationRequest struct {
    Period     string  `json:"period" binding:"required"`       // YYYY-MM
    AssetID    *string `json:"asset_id" binding:"omitempty,uuid"`
    CategoryID *string `json:"category_id" binding:"omitempty,uuid"`
    LocationID *string `json:"location_id" binding:"omitempty,uuid"`
}

type DepreciationScheduleItem struct {
    AssetID, AssetCode, AssetName string
    Method, Period string
    AcquisitionCost, AccumulatedDepreciation, NetBookValue, DepreciationAmount float64
    Posted bool
    Highlighted bool  // True if pending (not yet posted for period)
    Status string     // "posted" | "pending" | "skipped"
    SkipReason string
}

type DepreciationScheduleResponse struct {
    Period      string
    TotalAssets int
    Posted      int
    Pending     int
    TotalAmount float64
    Items       []DepreciationScheduleItem
}

type DepreciationHistoryItem struct {
    DepreciationID, AssetID, AssetCode, AssetName string
    Period string
    Amount float64
    Posted bool
    JournalEntryID *string
    CreatedAt time.Time
}

type DepreciationHistoryResponse struct {
    Period  string
    Total   int
    Posted  int
    Pending int
    Items   []DepreciationHistoryItem
}
```

### API Routes

**File:** `apps/api/internal/finance/presentation/router/asset_routers.go`

```go
func RegisterDepreciationRoutes(r *gin.RouterGroup, h *handler.AssetHandler) {
    g := r.Group("/depreciation")
    // OR alias for backward compat:
    g := r.Group("/fixed-assets/depreciation")
    
    g.GET("/schedule", RequirePermission("depreciation.read"), h.GetDepreciationSchedule)
    g.GET("/history", RequirePermission("depreciation.read"), h.GetDepreciationHistory)
    g.POST("/run", RequirePermission("depreciation.run"), h.RunDepreciation)
}
```

**Permissions Seeded:**
- `depreciation.read` - View schedule, history
- `depreciation.run` - Execute batch run

---

## Frontend Implementation

### Page Component

**File:** `apps/web/app/[locale]/(dashboard)/finance/fixed-assets/depreciation-schedule/page.tsx`

Features:
- **Hero Section:** Stats (assets, posted, pending, highlighted)
- **Left Panel (380px):** Period selector + filter inputs + buttons
- **Main Panel:** 3 sections
  1. **Preview Schedule Table** - All assets with amounts, statuses, highlighted pending
  2. **History Table** - Past runs for same period
  3. **Run Result Card** - Success summary after execution
- **Confirmation Dialog** - Before running depreciation (shows impact preview)

**Filters:**
- Period (month input)
- Asset ID (UUID or code)
- Category ID
- Location ID

**Actions:**
- Preview - Load schedule without running
- History - Show past entries for period
- Run Depreciation - Open confirmation dialog
- Confirm Run - Execute batch (updates schedule/history on success)

### Service Client

**File:** `apps/web/src/features/finance/fixed-assets/services/fixed-assets-service.ts`

```typescript
getDepreciationSchedule(params: RunDepreciationRequest): Promise<ApiResponse<DepreciationScheduleResponse>>
getDepreciationHistory(period: string): Promise<ApiResponse<DepreciationHistoryResponse>>
runDepreciation(data: RunDepreciationRequest): Promise<ApiResponse<BatchDepreciationRunResponse>>
```

### Type Definitions

**File:** `apps/web/src/features/finance/fixed-assets/types/index.d.ts`

All DepreciationSchedule*, DepreciationHistory*, RunDepreciation* types exported for client usage.

---

## Testing Scenarios

### Scenario 1: Straight-Line Asset
**Setup:**
- Asset: Acquisition Cost = 100M, Useful Life = 60 months, Method = SL, Salvage = 10M
- Monthly Amount = (100M - 10M) / 60 = 1.5M

**Test:**
- Run period 2025-01: Posted amount = 1.5M, NBV reduced to 98.5M
- Run period 2025-02: Posted amount = 1.5M again
- Verify idempotency: Run 2025-01 again → Rejected with "already run for this period"

### Scenario 2: Double Declining Balance
**Setup:**
- Asset: Acquisition = 100M, Useful Life = 24 months, Rate = 2/24 = 8.33%
- Month 1: Amount = 100M × 0.0833 = 8.33M
- Month 2: Amount = (100M - 8.33M) × 0.0833 = 7.64M

**Test:**
- Verify decreasing amounts each month
- Verify not exceeding (NBV - Salvage) floor

### Scenario 3: Fully Depreciated
**Setup:**
- Asset: Book Value = Salvage Value = 10M (already fully depreciated)

**Test:**
- Run should skip with reason "asset fully depreciated"
- Status: skipped, not in processed count

### Scenario 4: Mixed Run with Filters
**Setup:**
- 100 active assets
- Run with category_id = "electronics"
- Only 15 assets match filter

**Test:**
- Schedule returns only filtered 15
- Run returns 15 in processed count
- Other 85 not touched

### Scenario 5: Error Handling
**Setup:**
- Asset without category configured
- Asset with missing depreciation accounts on category

**Test:**
- Run returns status="failed" for those items
- Other assets still processed
- Transaction isolated per asset (batch succeeds partially)

---

## Database Impact

### New Tables
None - uses existing `asset_depreciations`, `journal_entries`, `journal_lines`, `asset_audit_logs`

### Modified Records

**asset_depreciations:**
- Insert new row per asset per period
- Set `status = "approved"`, `journal_entry_id = id`

**journal_entries:**
- Insert JournalEntry with `reference_type = "ASSET_DEP"`, `reference_id = depreciation.id`
- Set `status = "posted"`, `is_system_generated = true`

**journal_lines:**
- Insert 2 lines per journal entry (Dr. Expense, Cr. Accumulated)

**fixed_assets:**
- UPDATE `accumulated_depreciation`, `book_value`
- UPDATE `is_fully_depreciated` if NBV ≤ salvage_value

**asset_audit_logs:**
- Insert log with action="depreciated", changes=[], metadata with period/amount/event

---

## Performance Considerations

- **Index on (asset_id, period)** for idempotency check - MUST EXIST
- **Index on (period)** for schedule/history queries
- **Batch size:** ~50 assets per transaction = ~500ms on average DB
- **Recommendation:** Run during off-peak (night batch) to minimize locking

---

## Security

- **Scope Filter:** Applied to all queries (respects tenant/division/department scope)
- **Permission Check:** `depreciation.run` required; verified via middleware
- **Idempotency Token:** Period + Tenant acts as natural deduplication key
- **Audit Trail:** All runs logged with actor_id, timestamp, amounts

---

## Monitoring & Alerts

**Metrics to Track:**
- `depreciation_batch_duration_ms` - Time to run batch
- `depreciation_batch_posted_count` - Assets posted
- `depreciation_batch_failed_count` - Failures (should be 0 or very low)
- `depreciation_journal_entries_created` - Journal count

**Alerts:**
- Failed count > 5% of total → investigate DB/account configuration
- Batch duration > 5min → might need indexing review

---

## Deployment Checklist

- [ ] Run database migrations (if any) - NONE needed, uses existing tables
- [ ] Seed permissions: `depreciation.read`, `depreciation.run`
- [ ] Verify COA mappings (depreciation expense + accumulated accounts)
- [ ] Test with non-production data first (schedule preview on staging)
- [ ] Brief finance team on "immutable posted entries" policy
- [ ] Enable audit logging for `depreciation.posted` events

---

## Backward Compatibility

- Existing `POST /api/depreciation/{period}` (PreviewBatchDepreciation, RunBatchDepreciation) remain functional
- New routes are **ADDITIVE**, not replacing old ones
- Old batch-depreciation page redirects to new `/depreciation-schedule` for consistency
- Permission alias: `asset.depreciate` still works (no hard breaking change required)

---

## Future Enhancements

1. **Scheduled Jobs:** Cron job to auto-run depreciation on first day of month
2. **Bulk Reversal:** Reverse entire period in one click (create reversing entries)
3. **Depreciation Report:** Export schedule to PDF with trend analysis
4. **What-If Scenario:** Simulate depreciation impact before actual run
5. **Partial Undo:** Reverse specific asset in period (instead of whole period)

