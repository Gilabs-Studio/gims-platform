# Edit Asset Feature - Complete Implementation Guide

**Created:** May 8, 2026  
**Stack:** Go 1.25+ (Gin) + Next.js 16 (React 19)  
**Permission:** `asset.update` (EDIT_ASSET)  
**Endpoint:** `PATCH /api/assets/:id`

---

## Overview

The Edit Asset feature allows users to modify fixed assets with intelligent field classification and depreciation impact tracking. Changes are categorized by their accounting implications:

- **Group A (Green):** Non-accounting fields - freely editable
- **Group B (Orange):** Accounting-sensitive - require depreciation recalculation & confirmation
- **Group C (Red):** Immutable after active - cannot be changed for active/in_use assets

---

## Architecture

### Backend (Go)

#### 1. Field Classification Logic
**File:** `asset_edit_helper.go`

```go
type FieldGroup string

const (
    GroupA FieldGroup = "A"  // Non-accounting
    GroupB FieldGroup = "B"  // Accounting-sensitive  
    GroupC FieldGroup = "C"  // Immutable
)

// Field classification mapping
var fieldToGroup = map[string]FieldGroup{
    "name": GroupA, "description": GroupA, // ... Group A fields
    "salvage_value": GroupB, "useful_life_months": GroupB, // ... Group B fields
    "code": GroupC, "acquisition_date": GroupC, // ... Group C fields
}

// ClassifyChanges compares old vs new values and returns grouped changes
func ClassifyChanges(existing *financeModels.Asset, req *dto.EditAssetRequest) (*FieldChanges, error)

// ValidateGroupCChanges rejects Group C changes for active assets
func ValidateGroupCChanges(existing *financeModels.Asset, changes *FieldChanges) error

// CalculateDepreciationImpact computes the effect of Group B changes
func CalculateDepreciationImpact(ctx context.Context, ...) (*DepreciationRecalcInfo, error)

// RecalculateDepreciation regenerates schedule after Group B changes
func RecalculateDepreciation(ctx context.Context, ...) (int, error)
```

**Key Business Rules:**
- Group A changes: direct update (no side effects)
- Group B changes: soft-delete unposted entries, regenerate schedule (prospective)
- Group C changes: reject if asset is active/in_use

#### 2. Usecase - EditAsset Method
**File:** `asset_usecase.go`

```go
type AssetUsecase interface {
    // New method
    EditAsset(ctx context.Context, id string, req *dto.EditAssetRequest) (*dto.EditAssetResponse, error)
}

func (uc *assetUsecase) EditAsset(ctx context.Context, id string, req *dto.EditAssetRequest) (*dto.EditAssetResponse, error) {
    // 1. Fetch & validate asset (not disposed)
    // 2. Classify changes into groups A, B, C
    // 3. Validate Group C (reject if active + changed)
    // 4. Calculate depreciation impact if Group B changed
    // 5. Transaction:
    //    - Update asset record
    //    - Recalculate depreciation if needed
    //    - Create AuditLog with detailed changes
    //    - Create AssetTransaction record
    // 6. Return EditAssetResponse with change tracking
}
```

**Response Structure:**
```json
{
  "id": "asset-uuid",
  "code": "AST-001",
  "name": "Updated Name",
  // ... other asset fields
  "changed_fields": [
    {
      "field_name": "name",
      "old_value": "Old Name",
      "new_value": "Updated Name",
      "group": "A",
      "depreciation_impact": null
    },
    {
      "field_name": "salvage_value",
      "old_value": 100,
      "new_value": 200,
      "group": "B",
      "depreciation_impact": {
        "old_monthly_amount": 150,
        "new_monthly_amount": 140,
        "remaining_months": 12,
        "impact_amount": -120,
        "entries_to_regenerate": 12,
        "first_affected_period": "2026-05"
      }
    }
  ]
}
```

#### 3. Handler
**File:** `asset_handler.go`

```go
func (h *AssetHandler) EditAsset(c *gin.Context) {
    // Bind EditAssetRequest
    // Call uc.EditAsset()
    // Return response with HTTP 200
    // Error codes: 403 (immutable), 404 (not found), 400 (validation)
}
```

#### 4. Route Registration
**File:** `asset_routers.go`

```go
g.PATCH("/:id", middleware.RequirePermission(assetUpdate), h.EditAsset)
```

---

### Frontend (Next.js/React)

#### 1. Form Component
**File:** `components/asset-edit-form.tsx`

**Features:**
- Tabbed layout: Basic Info, Depreciation, Extended, Summary
- Field grouping with visual indicators:
  - Group A: Standard white background
  - Group B: Orange border + warning icon
  - Group C: Gray disabled + lock icon
- Real-time change tracking via `form.formState.dirtyFields`
- Automatic Group C validation (reject if active + changed)

**Example:**
```tsx
<AssetEditForm
  assetId={assetId}
  initialData={asset}
  onSuccess={() => router.push('/assets')}
  onCancel={() => router.back()}
/>
```

#### 2. Confirmation Modal Component
**File:** `components/asset-edit-confirm-modal.tsx`

**Shows:**
- Detailed field changes (old → new)
- Depreciation impact preview:
  - Monthly depreciation change
  - Total remaining depreciation
  - Projected book value
  - Number of entries to regenerate
  - First affected period
- Audit trail confirmation
- Two-tab layout: Changes + Impact

#### 3. Custom Hook
**File:** `hooks/use-asset-edit.ts`

```tsx
const { editAsset, isLoading, error } = useAssetEdit();

// Call with asset ID and changed fields
await editAsset(assetId, {
  name: "New Name",
  salvageValue: 250,
  usefulLifeMonths: 48,
});
```

**Error Handling:**
- Immutable field error → Show toast with action suggestion
- Asset not found → Redirect to assets list
- Validation error → Show inline form errors

---

## Database Impact

### Audit Log Entry
When an asset is edited, an `AssetAuditLog` record is created:

```sql
INSERT INTO asset_audit_logs (
  asset_id,
  action,
  performed_by,
  changes,           -- JSONB array with field changes
  metadata           -- JSONB with context
) VALUES (
  'asset-uuid',
  'updated',
  'user-uuid',
  '[
    {
      "field": "name",
      "old_value": "Old Name",
      "new_value": "New Name",
      "group": "A"
    },
    {
      "field": "salvage_value",
      "old_value": 100,
      "new_value": 200,
      "group": "B",
      "depreciation_impact": {...}
    }
  ]',
  '{"source": "manual_edit", "group_a_count": 1, "group_b_count": 1}'
);
```

### Depreciation Schedule Regeneration (if Group B changed)
When depreciation-sensitive fields change:

1. Find first unposted `AssetDepreciation` entry
2. Soft-delete all unposted entries from that period forward
3. Regenerate schedule with new values:
   - New monthly amount = (AcquisitionCost - NewSalvageValue) / NewUsefulLife
   - Regenerate from first affected period to end of useful life
4. Keep all posted entries unchanged (immutable)

---

## Test Scenarios

### Test 1: Edit Group A Field (No Side Effect)
```bash
# Request
PATCH /api/assets/{id}
{
  "name": "New Asset Name",
  "description": "Updated description"
}

# Expected Response (200 OK)
{
  "id": "...",
  "name": "New Asset Name",
  "changed_fields": [
    {"field_name": "name", "group": "A", ...},
    {"field_name": "description", "group": "A", ...}
  ]
}

# Depreciation schedule: unchanged
# Journal entries: none created
# Audit log: records changes with group=A
```

### Test 2: Edit Group B Field (Triggers Depreciation Recalc)
```bash
# Request
PATCH /api/assets/{id}
{
  "salvageValue": 250,
  "usefulLifeMonths": 48
}

# Expected Response (200 OK)
{
  "id": "...",
  "changed_fields": [
    {
      "field_name": "salvageValue",
      "group": "B",
      "depreciation_impact": {
        "old_monthly_amount": 150,
        "new_monthly_amount": 140,
        "entries_to_regenerate": 12,
        "first_affected_period": "2026-05"
      }
    }
  ]
}

# Depreciation schedule: 12 unposted entries regenerated
# Audit log: records changes + depreciation_impact details
```

### Test 3: Try to Edit Group C Field (Active Asset - Rejected)
```bash
# Asset status: "active"
# Request
PATCH /api/assets/{id}
{
  "code": "NEW-CODE",        # Group C - immutable!
  "acquisitionCost": 50000
}

# Expected Response (403 Forbidden)
{
  "code": "ASSET_FIELD_IMMUTABLE",
  "message": "immutable fields cannot be changed for active assets: code, acquisition_cost"
}

# No changes applied
```

### Test 4: Edit Draft Asset's Group C Field (Allowed)
```bash
# Asset status: "draft"
# Request
PATCH /api/assets/{id}
{
  "code": "AST-FINAL",       # Group C - allowed for draft
  "assetTypeId": "new-type"
}

# Expected Response (200 OK)
# Fields updated successfully
```

### Test 5: All Field Types Together
```bash
# Request
PATCH /api/assets/{id}
{
  "name": "Updated Name",              # Group A
  "location_id": "new-location",       # Group A
  "salvageValue": 300,                 # Group B
  "deprecationMethod": "DB",           # Group B
  "description": "New description"     # Group A
}

# Expected Response
# - Group A changes applied immediately
# - Group B changes trigger depreciation recalc
# - Audit log shows all changes with their groups
```

---

## API Error Codes

| Code | HTTP | Description | Action |
|------|------|-------------|--------|
| `ASSET_FIELD_IMMUTABLE` | 403 | Cannot edit immutable fields for active asset | Use Revaluation for cost, keep code/date as-is |
| `ASSET_NOT_FOUND` | 404 | Asset doesn't exist | Verify asset ID |
| `ASSET_EDIT_FAILED` | 400 | General edit failure | Check validation errors |
| `VALIDATION_ERROR` | 400 | Invalid field values | Fix input data |

---

## Frontend Implementation Checklist

- [x] Form component with field grouping
- [x] Disabled state for Group C fields
- [x] Warning icons + tooltips for Group B fields
- [x] Confirmation modal with depreciation preview
- [x] Custom hook for API integration
- [x] Error handling with toast notifications
- [ ] Add attachment/document upload capability
- [ ] Add inline depreciation impact preview
- [ ] Add undo/rollback feature

---

## Depreciation Recalculation Logic

**Prospective Method:** Changes only affect future entries, not historical ones.

```
Before Edit:
  Acquisition Cost: 10,000
  Salvage Value: 1,000
  Useful Life: 60 months
  Monthly: (10,000 - 1,000) / 60 = 150/month
  
  Posted entries (Jan 2024 - Mar 2026): 27 months = accumulated 4,050
  Unposted entries (Apr 2026 onwards): 33 entries remaining

After Edit (Salvage Value → 1,500, Useful Life → 48):
  New Monthly: (10,000 - 1,500) / 48 = 177.08/month
  
  Posted entries: UNCHANGED (4,050 remains)
  Unposted entries: Soft-deleted, regenerated with new rate
  From Apr 2026 onwards: 177.08/month instead of 150/month
```

---

## Monitoring & Audit

Every edit creates an audit trail entry:

```sql
SELECT 
  a.id,
  a.asset_id,
  a.action,
  jsonb_array_length(a.changes) as change_count,
  a.metadata->>'group_a_count' as group_a_changes,
  a.metadata->>'group_b_count' as group_b_changes,
  a.performed_by,
  a.performed_at
FROM asset_audit_logs a
WHERE a.asset_id = 'asset-uuid'
  AND a.action = 'updated'
ORDER BY a.performed_at DESC;
```

---

## Future Enhancements

1. **Batch Edit:** Edit multiple assets at once
2. **Change Preview:** Peek at impacts before confirmation
3. **Schedule Export:** Export affected depreciation schedule as CSV/PDF
4. **Integration:** Link changes to approval workflows
5. **History Compare:** Visual diff of before/after states
6. **Notification:** Alert relevant departments of accounting changes

---

## References

- Backend AGENTS: `apps/api/internal/finance/AGENTS.md`
- Frontend AGENTS: `apps/web/src/features/master-data/AGENTS.md`
- Depreciation Docs: `docs/features/core/apptime-timezone-support.md`
- API Standards: `docs/api-standart/README.md`
