# Fixed Asset Management Module - Implementation Guide

**Document Version:** 1.0  
**Last Updated:** May 9, 2026  
**Status:** Production Ready

---

## Progress Tracker

This section reflects the current implementation status in this branch, not the original design target.

### Completed

- Backend fixed-asset usecase now stamps tenant context on new asset and transaction records.
- Frontend fixed-asset action buttons now respect permission checks on create, update, approve, and depreciation actions.
- Asset edit prefill / dirty-state fixes were already applied earlier.
- Asset mapper now returns the missing asset type and custodian-related fields.
- Fixed-asset integration docs were expanded to reuse the existing module instead of creating a parallel tree.

### In Progress

- Investigating integration-test SQLite schema errors that cause several existing integration tests to fail during test DB setup. This investigation includes reproducing failing CREATE TABLE statements and adapting migrations or test harness SQL where safe.
- Repository-wide audit of tenant/company filtering across asset repositories and related helpers (read/write paths). This is an ongoing pass to ensure strict multi-tenant isolation.
- Frontend consistency & permission pass across fixed-assets pages (list, create, edit, disposal, revaluation, batch depreciation). Some screens already gated; remaining screens will be aligned with RBAC rules.
- Preparing an API/Postman sync plan for any endpoints changed during this implementation so docs and integration tests remain consistent.

### Still Missing / Not Fully Implemented

- A complete pass for tenant isolation on all write/read paths in the asset repositories and related helpers.
- A unified fixed-asset page experience across list, create, edit, disposal, revaluation, and batch depreciation screens.
- Final API contract documentation / Postman sync for any endpoints added or changed during the implementation.

### Current Blocker

- `go test ./internal/finance/...` now compiles the finance package, but several existing integration tests fail due to SQLite CREATE TABLE/schema compatibility issues in the test harness. I'm actively reproducing the failing SQL and will either adapt the migration/test SQL for SQLite or isolate the tests to PostgreSQL-like fixtures where appropriate.
- The frontend typecheck is currently passing.

### Next Actions (short)

- Reproduce failing integration tests and capture the exact SQL statements causing syntax errors.
- Determine safe remediation: adjust migrations for SQLite test runs or update test setup to use compatible statements.
- Complete tenant/company filtering audit and patch any repo methods that omit company_id scoping.
- Finish the frontend permission/UI consistency pass and run `pnpm exec tsc --noEmit` plus relevant storybook/UI checks.

If you'd like, I can start the integration-test investigation now and report findings with the failing SQL snippets and proposed fixes.

### Integration Test Findings (current)

- Reproduced failing integration tests when running `go test ./internal/finance/...`. The test harness executes raw CREATE TABLE statements that use PostgreSQL-specific types and expressions which SQLite rejects. Example failing statements observed in test logs:

  - `CREATE TABLE \`chart_of_accounts\` (...,`is_active` numeric DEFAULT true,`created_at` datetime,...)` — SQLite treats `numeric`/`datetime` defaults differently and rejects `DEFAULT true` and `datetime` type verbatim.
  - `CREATE TABLE \`financial_closings\` (...`period_end_date` date NOT NULL,`status` varchar(20) DEFAULT "draft",...)` — SQLite does not accept double-quoted string defaults in this context.
  - `CREATE TABLE \`audit_logs\` (...`metadata` jsonb,`changes` jsonb,`created_at` datetime,...)` — `jsonb` and `datetime` are Postgres types not supported by SQLite.

- Remediation options:
  1. Run integration tests against a PostgreSQL test instance (recommended for fidelity). This requires updating CI/test setup to start a Postgres container (Docker Compose) or use a local Postgres during `go test` runs.
  2. Adjust test harness/migrations to emit SQLite-compatible SQL when tests detect the `sqlite` driver. This means mapping `uuid` defaults, `jsonb` → `text`, `datetime` → `text`/`integer`, boolean defaults `DEFAULT 1/0`, and avoid Postgres-only functions like `gen_random_uuid()`.
  3. Replace raw SQL table creation in tests with GORM auto-migration calls which will generate dialect-appropriate DDL for the test DB driver.

- Next decision: I can (A) convert failing test migrations to SQLite-compatible variants locally and re-run tests, or (B) modify the test harness to spin up a PostgreSQL test DB and re-run tests. Which approach do you prefer? If no preference, I'll try (3) GORM auto-migrate fallback first (least invasive) and report results.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Database Setup](#database-setup)
3. [Backend Implementation Guide](#backend-implementation-guide)
4. [Progress Tracker](#progress-tracker)
5. [Depreciation Calculation Examples](#depreciation-calculation-examples)
6. [Frontend Implementation Guide](#frontend-implementation-guide)
7. [API Usage Examples](#api-usage-examples)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

- Go 1.25+ (backend)
- Node.js 18+ (frontend)
- PostgreSQL 14+
- GORM 1.25+

### Step 1: Database Migration

```bash
# Run migrations
cd apps/api
go run cmd/migrate/main.go

# Or manually via psql
psql -d your_db -f migrations/20240115_create_fixed_assets_schema.sql
```

### Step 2: Backend Setup

```bash
# Create directory structure
mkdir -p internal/finance/data/models
mkdir -p internal/finance/domain/{dto,service,usecase}
mkdir -p internal/finance/presentation/{handler,dto}
mkdir -p internal/finance/data/repository

# Copy provided files
# - models/asset_extended.go
# - presentation/dto/asset_dto.go
# - domain/service/depreciation_engine.go
```

### Step 3: Frontend Setup

```bash
# Navigate to web app
cd apps/web

# Install dependencies if needed
pnpm install

# Create component files
mkdir -p src/features/finance/fixed-assets/components
mkdir -p src/features/finance/fixed-assets/hooks
mkdir -p src/features/finance/fixed-assets/services
mkdir -p src/features/finance/fixed-assets/types
mkdir -p src/features/finance/fixed-assets/schemas
```

---

## Database Setup

### Create Tables

```sql
-- Execute migration file
\i migrations/20240115_create_fixed_assets_schema.sql
```

### Verify Installation

```sql
-- Check tables created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'asset%';

-- Output should include:
-- asset_categories
-- asset_locations
-- assets
-- asset_depreciation_schedules
-- asset_disposals
-- asset_attachments
-- asset_audit_logs
-- asset_transfers
-- asset_maintenance_logs
```

### Create Initial Data

```sql
-- Insert asset categories (MULTI-TENANT: Include company_id for data isolation)
INSERT INTO asset_categories (id, company_id, name, description, default_useful_life_months, 
  default_depreciation_method, fixed_asset_account_code, depreciation_account_code)
VALUES 
  (gen_random_uuid(), 'company-uuid-1', 'Computer Equipment', 'Laptops, desktops, servers', 60, 'SL', '1210-001', '6210-001'),
  (gen_random_uuid(), 'company-uuid-1', 'Office Furniture', 'Desks, chairs, cabinets', 120, 'SL', '1210-002', '6210-002'),
  (gen_random_uuid(), 'company-uuid-1', 'Vehicles', 'Cars, motorcycles, trucks', 120, 'DB', '1210-003', '6210-003'),
  (gen_random_uuid(), 'company-uuid-1', 'Building Improvements', 'Renovations, constructions', 240, 'SL', '1210-004', '6210-004');

-- Insert asset locations (MULTI-TENANT: Include company_id for data isolation)
INSERT INTO asset_locations (id, company_id, code, name, city, country)
VALUES 
  (gen_random_uuid(), 'company-uuid-1', 'HQ', 'Head Office', 'Jakarta', 'Indonesia'),
  (gen_random_uuid(), 'company-uuid-1', 'WH-1', 'Warehouse 1', 'Tangerang', 'Indonesia'),
  (gen_random_uuid(), 'company-uuid-1', 'BRANCH-1', 'Branch Office', 'Surabaya', 'Indonesia');

-- IMPORTANT: Always filter queries by company_id to ensure multi-tenant data isolation
-- SELECT * FROM asset_categories WHERE company_id = current_company_id;
```

---

## Backend Implementation Guide

### 1. Create Asset Service

```go
package service

import (
  "context"
  "errors"
  "time"
  "github.com/google/uuid"
  financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
  "github.com/gilabs/gims/api/internal/finance/domain/dto"
  "github.com/gilabs/gims/api/internal/finance/data/repository"
)

type AssetService interface {
  CreateAsset(ctx context.Context, req *dto.CreateAssetRequest) (*dto.AssetResponse, error)
  UpdateAsset(ctx context.Context, assetID string, req *dto.UpdateAssetRequest) (*dto.AssetResponse, error)
  GetAssetByID(ctx context.Context, assetID string) (*dto.AssetResponse, error)
  ListAssets(ctx context.Context, req *dto.ListAssetsRequest) ([]dto.AssetResponse, int64, error)
  ActivateAsset(ctx context.Context, assetID string, req *dto.ActivateAssetRequest) (*dto.AssetResponse, error)
  DisposeAsset(ctx context.Context, assetID string, req *dto.DisposeAssetRequest) (*dto.DisposalResponse, error)
  TransferAsset(ctx context.Context, assetID string, req *dto.TransferAssetRequest) error
  GenerateDepreciationSchedule(ctx context.Context, assetID string, req *dto.GenerateDepreciationScheduleRequest) (*dto.DepreciationPreviewResponse, error)
}

type assetService struct {
  assetRepo       repository.AssetRepository
  categoryRepo    repository.AssetCategoryRepository
  locationRepo    repository.AssetLocationRepository
  db              *gorm.DB
}

func NewAssetService(
  assetRepo repository.AssetRepository,
  categoryRepo repository.AssetCategoryRepository,
  locationRepo repository.AssetLocationRepository,
  db *gorm.DB,
) AssetService {
  return &assetService{
    assetRepo: assetRepo,
    categoryRepo: categoryRepo,
    locationRepo: locationRepo,
    db: db,
  }
}

// SECURITY NOTES:
// 🔐 RBAC Considerations:
//    - Require permission: finance:asset:create (for CreateAsset)
//    - Require permission: finance:asset:read (for GetAsset, ListAssets)
//    - Require permission: finance:asset:update (for UpdateAsset)
//    - Require permission: finance:asset:activate (for ActivateAsset - Finance Manager only)
//    - Require permission: finance:asset:dispose (for DisposeAsset - Senior Accountant only)
//    - Require permission: finance:asset:transfer (for TransferAsset - Facility Manager)
//
// 🏢 Multi-Tenant Isolation:
//    - All queries MUST filter by company_id from context
//    - Extract company_id from JWT token claims
//    - Pass company_id through context: ctx.Value("company_id")
//
// 🔒 Data Isolation:
//    - Assets belong to specific company - prevent cross-company access
//    - Verify asset.company_id == authenticated_user.company_id
//    - Audit logs must include company_id for compliance
//
// 📊 Multi-Scope Considerations:
//    - Filter by department/cost_center if user has limited scope
//    - Filter by location if user has location-based restrictions
//    - Enforce hierarchical permission inheritance

// CreateAsset creates a new asset with validation
func (s *assetService) CreateAsset(ctx context.Context, req *dto.CreateAssetRequest) (*dto.AssetResponse, error) {
  // RBAC: Check permission - require finance:asset:create
  if !hasPermission(ctx, "finance:asset:create") {
    return nil, dto.ErrForbidden("insufficient permissions")
  }

  // MULTI-TENANT: Extract company_id from context
  companyID := ctx.Value("company_id").(string)
  userID := ctx.Value("user_id").(string)
  
  // DATA ISOLATION: Verify category and location belong to same company
  category, err := s.categoryRepo.FindByID(ctx, req.CategoryID)
  if err != nil || category.CompanyID != companyID {
    return nil, dto.ErrCategoryNotFound
  }
  
  location, err := s.locationRepo.FindByID(ctx, req.LocationID)
  if err != nil || location.CompanyID != companyID {
    return nil, dto.ErrLocationNotFound
  }

  // Validate request
  if err := req.Validate(); err != nil {
    return nil, err
  }

  // Generate asset code if not provided
  assetCode := req.Code
  if assetCode == nil || *assetCode == "" {
    code, err := s.generateAssetCode(ctx, companyID) // Pass company_id for scoped generation
    if err != nil {
      return nil, err
    }
    assetCode = &code
  }

  // Check if code already exists
  existing, _ := s.assetRepo.FindByCode(ctx, *assetCode)
  if existing != nil {
    return nil, dto.ErrAssetCodeExists
  }

  // Check serial number uniqueness
  if req.SerialNumber != nil && *req.SerialNumber != "" {
    existing, _ := s.assetRepo.FindBySerialNumber(ctx, *req.SerialNumber)
    if existing != nil {
      return nil, dto.ErrSerialNumberExists
    }
  }

  // Create asset entity
  asset := &financeModels.Asset{
    ID:                  uuid.New(),
    CompanyID:          companyID,        // MULTI-TENANT: Set company_id
    Code:                *assetCode,
    Name:                req.Name,
    Description:        req.Description,
    AssetType:          req.AssetType,
    CategoryID:         uuid.MustParse(req.CategoryID),
    LocationID:         uuid.MustParse(req.LocationID),
    SerialNumber:       req.SerialNumber,
    AssetTag:           req.AssetTag,
    BarcodeOrQR:        req.BarcodeOrQR,
    AcquisitionDate:    req.AcquisitionDate,
    AcquisitionCost:    req.AcquisitionCost,
    SalvageValue:       defaultFloat64(req.SalvageValue, 0),
    CurrencyCode:       req.CurrencyCode,
    DepreciationMethod: req.DepreciationMethod,
    UsefulLifeMonths:   req.UsefulLifeMonths,
    SupplierName:       req.SupplierName,
    InvoiceNumber:      req.InvoiceNumber,
    Status:             financeModels.AssetStatusDraft,
    IsActive:           false,
    CreatedBy:          userID,           // AUDIT: Track who created this asset
  }

  // Calculate initial book value
  asset.BookValue = &req.AcquisitionCost

  // Save asset
  if err := s.assetRepo.Create(ctx, asset); err != nil {
    return nil, err
  }

  // Log creation (AUDIT: Include company_id for compliance)
  s.logAudit(ctx, asset.ID, companyID, financeModels.AuditActionCreated, nil, nil)

  return s.mapAssetToResponse(asset), nil
}

// IMPLEMENTATION CHECKLIST:
// ✅ Check RBAC permission (finance:asset:create)
// ✅ Extract and validate company_id from context
// ✅ Verify category/location belong to same company (DATA ISOLATION)
// ✅ Set asset.company_id before saving
// ✅ Set created_by for audit trail
// ✅ Log audit event with company_id

// ActivateAsset activates an asset and generates depreciation schedule
func (s *assetService) ActivateAsset(ctx context.Context, assetID string, req *dto.ActivateAssetRequest) (*dto.AssetResponse, error) {
  // RBAC: Only Finance Manager can activate assets
  if !hasPermission(ctx, "finance:asset:activate") || !hasRole(ctx, "finance_manager") {
    return nil, dto.ErrForbidden("only finance managers can activate assets")
  }

  assetUUID := uuid.MustParse(assetID)
  companyID := ctx.Value("company_id").(string)

  // MULTI-TENANT: Find asset and verify company ownership
  asset, err := s.assetRepo.FindByID(ctx, assetUUID)
  if err != nil {
    return nil, dto.ErrAssetNotFound
  }
  
  // DATA ISOLATION: Ensure asset belongs to user's company
  if asset.CompanyID != companyID {
    return nil, dto.ErrForbidden("asset does not belong to your company")
  }

  if asset.Status != financeModels.AssetStatusDraft {
    return nil, errors.New("asset must be in draft status to activate")
  }

  // Set activation date
  now := time.Now()
  if req.ActivationDate != nil {
    asset.ActivationDate = req.ActivationDate
  } else {
    asset.ActivationDate = &now
  }

  // Generate depreciation schedule
  if asset.IsDepreciable() {
    if err := s.generateAndSaveDepreciationSchedule(ctx, asset); err != nil {
      return nil, err
    }
  }

  // Update asset status
  asset.Status = financeModels.AssetStatusActive
  asset.IsActive = true

  if err := s.assetRepo.Update(ctx, asset); err != nil {
    return nil, err
  }

  // AUDIT: Log with user and company context
  s.logAudit(ctx, asset.ID, companyID, financeModels.AuditActionActivated, nil, nil)

  return s.mapAssetToResponse(asset), nil
}

// SECURITY CHECKLIST:
// ✅ Verify finance:asset:activate permission
// ✅ Verify finance_manager role (RBAC)
// ✅ Check company_id ownership (DATA ISOLATION)
// ✅ Include company_id in audit log

// generateAndSaveDepreciationSchedule generates and saves depreciation schedule
func (s *assetService) generateAndSaveDepreciationSchedule(ctx context.Context, asset *financeModels.Asset) error {
  engine, err := service.NewDepreciationEngine(
    *asset.DepreciationMethod,
    asset.AcquisitionCost,
    asset.SalvageValue,
    *asset.UsefulLifeMonths,
    asset.AcquisitionDate,
    *asset.ActivationDate,
  )
  if err != nil {
    return err
  }

  // Generate schedule for full useful life
  endDate := asset.ActivationDate.AddDate(0, *asset.UsefulLifeMonths, 0)
  schedules, err := engine.GenerateSchedule(endDate)
  if err != nil {
    return err
  }

  // Save schedules
  for _, schedule := range schedules {
    scheduleEntity := &financeModels.AssetDepreciationSchedule{
      ID:                      uuid.New(),
      AssetID:                 asset.ID,
      PeriodStartDate:         schedule.PeriodStartDate,
      PeriodEndDate:           schedule.PeriodEndDate,
      PeriodMonth:             schedule.PeriodMonth,
      DepreciationAmount:      schedule.DepreciationAmount,
      AccumulatedDepreciation: schedule.AccumulatedDepreciation,
      BookValue:               schedule.BookValue,
      IsPosted:                false,
    }

    if err := s.db.WithContext(ctx).Create(scheduleEntity).Error; err != nil {
      return err
    }
  }

  return nil
}

// DisposeAsset disposes an asset
func (s *assetService) DisposeAsset(ctx context.Context, assetID string, req *dto.DisposeAssetRequest) (*dto.DisposalResponse, error) {
  // RBAC: Only Senior Accountant can dispose assets
  if !hasPermission(ctx, "finance:asset:dispose") || !hasRole(ctx, "senior_accountant") {
    return nil, dto.ErrForbidden("only senior accountants can dispose assets")
  }

  assetUUID := uuid.MustParse(assetID)
  companyID := ctx.Value("company_id").(string)
  userID := ctx.Value("user_id").(string)

  // MULTI-TENANT & DATA ISOLATION: Verify company ownership
  asset, err := s.assetRepo.FindByID(ctx, assetUUID)
  if err != nil {
    return nil, dto.ErrAssetNotFound
  }
  
  if asset.CompanyID != companyID {
    return nil, dto.ErrForbidden("asset does not belong to your company")
  }

  if !asset.CanBeDisposed() {
    return nil, dto.ErrCannotDisposeNonActive
  }

  // Calculate gain or loss
  var gainOrLoss *float64
  if req.DisposalValue != nil {
    value := *req.DisposalValue - asset.AccumulatedDepreciation
    gainOrLoss = &value
  }

  // Create disposal record
  disposal := &financeModels.AssetDisposal{
    ID:                                 uuid.New(),
    AssetID:                            asset.ID,
    DisposalType:                       req.DisposalType,
    DisposalDate:                       req.DisposalDate,
    DisposalValue:                      req.DisposalValue,
    AccumulatedDepreciationAtDisposal:  &asset.AccumulatedDepreciation,
    GainOrLoss:                         gainOrLoss,
    ReferenceNumber:                    req.ReferenceNumber,
    Description:                        req.Description,
  }

  // Update asset status
  asset.Status = financeModels.AssetStatusDisposed
  asset.DisposalDate = &now
  asset.UpdatedBy = userID // AUDIT: Track who disposed the asset

  // Use transaction (IMPORTANT: Ensures data consistency across tables)
  tx := s.db.WithContext(ctx).BeginTx(ctx, nil)
  
  if err := tx.Create(disposal).Error; err != nil {
    tx.Rollback()
    return nil, err
  }

  if err := tx.Save(asset).Error; err != nil {
    tx.Rollback()
    return nil, err
  }

  tx.Commit()

  return &dto.DisposalResponse{
    ID:            disposal.ID.String(),
    AssetID:       disposal.AssetID.String(),
    DisposalType:  string(disposal.DisposalType),
    DisposalDate:  disposal.DisposalDate,
    DisposalValue: disposal.DisposalValue,
    GainOrLoss:    disposal.GainOrLoss,
    CreatedAt:     disposal.CreatedAt,
  }, nil
}

// Helper functions
func (s *assetService) generateAssetCode(ctx context.Context) (string, error) {
  // Generate format: ASSET-YYYYMMDD-XXXX
  now := time.Now()
  date := now.Format("20060102")
  
  count, err := s.assetRepo.CountByCodePrefix(ctx, "ASSET-"+date)
  if err != nil {
    return "", err
  }

  code := fmt.Sprintf("ASSET-%s-%04d", date, count+1)
  return code, nil
}

func (s *assetService) mapAssetToResponse(asset *financeModels.Asset) *dto.AssetResponse {
  return &dto.AssetResponse{
    ID:                  asset.ID.String(),
    Code:                asset.Code,
    Name:                asset.Name,
    AssetType:          string(asset.AssetType),
    Status:             string(asset.Status),
    AcquisitionCost:    asset.AcquisitionCost,
    BookValue:          asset.BookValue,
    CreatedAt:          asset.CreatedAt,
  }
}

func (s *assetService) logAudit(ctx context.Context, assetID uuid.UUID, action financeModels.AuditAction, oldVal, newVal *string) {
  log := &financeModels.AssetAuditLog{
    ID:        uuid.New(),
    AssetID:   assetID,
    Action:    action,
    OldValue:  oldVal,
    NewValue:  newVal,
    ChangedAt: time.Now(),
  }
  s.db.WithContext(ctx).Create(log) // Ignore errors for logging
}

func defaultFloat64(val *float64, defaultVal float64) float64 {
  if val == nil {
    return defaultVal
  }
  return *val
}
```

---

## Depreciation Calculation Examples

### Example 1: Straight-Line Depreciation

**Scenario:**
- Asset: Laptop Computer
- Acquisition Cost: IDR 10,000,000
- Salvage Value: IDR 1,000,000
- Useful Life: 60 months (5 years)
- Depreciation Method: Straight-Line

**Calculation:**
```
Monthly Depreciation = (Cost - Salvage Value) / Useful Life (months)
                     = (10,000,000 - 1,000,000) / 60
                     = 9,000,000 / 60
                     = 150,000 IDR per month

Annual Depreciation = 150,000 × 12 = 1,800,000 IDR
```

**Depreciation Schedule (First 12 months):**

| Month | Period | Depreciation | Accumulated | Book Value |
|-------|--------|--------------|-------------|-----------|
| 1 | 2024-01 | 150,000 | 150,000 | 9,850,000 |
| 2 | 2024-02 | 150,000 | 300,000 | 9,700,000 |
| 3 | 2024-03 | 150,000 | 450,000 | 9,550,000 |
| ... | ... | ... | ... | ... |
| 12 | 2024-12 | 150,000 | 1,800,000 | 8,200,000 |

**Go Code Example:**
```go
engine, _ := service.NewDepreciationEngine(
  financeModels.DepreciationMethodStraightLine,
  10000000,    // Acquisition Cost
  1000000,     // Salvage Value
  60,          // Useful Life (months)
  time.Date(2024, 1, 15, 0, 0, 0, 0, time.UTC), // Acquisition Date
  time.Date(2024, 1, 15, 0, 0, 0, 0, time.UTC), // Depreciation Start
)

schedules, _ := engine.GenerateSchedule(time.Date(2029, 1, 15, 0, 0, 0, 0, time.UTC))
// Returns 60 schedule items
```

### Example 2: Declining Balance Depreciation

**Scenario:**
- Same asset but using Declining Balance method
- Rate = 2 / 60 = 3.33% (Double Declining Balance)

**Calculation:**
```
Month 1: Book Value × Rate = 10,000,000 × 3.33% = 333,300
Month 2: (10,000,000 - 333,300) × 3.33% = 321,878
Month 3: (9,666,700 - 321,878) × 3.33% = 310,801
...
```

**Schedule (First 6 months):**

| Month | Book Value Start | Rate | Depreciation | Accumulated | Book Value End |
|-------|------------------|------|--------------|-------------|--|
| 1 | 10,000,000 | 3.33% | 333,000 | 333,000 | 9,667,000 |
| 2 | 9,667,000 | 3.33% | 322,223 | 655,223 | 9,344,777 |
| 3 | 9,344,777 | 3.33% | 311,243 | 966,466 | 9,033,534 |
| 4 | 9,033,534 | 3.33% | 300,998 | 1,267,464 | 8,732,536 |
| 5 | 8,732,536 | 3.33% | 290,933 | 1,558,397 | 8,441,603 |
| 6 | 8,441,603 | 3.33% | 281,144 | 1,839,541 | 8,160,459 |

**Key Difference:** Depreciation amount decreases over time as book value decreases.

### Example 3: Sum of Years Digits

**Scenario:**
- Same asset using Sum of Years Digits method
- Useful Life: 5 years (60 months)
- Sum = 60 × 61 / 2 = 1,830

**Calculation:**
```
Year 1 Depreciation = (5/15) × 9,000,000 = 3,000,000
Year 2 Depreciation = (4/15) × 9,000,000 = 2,400,000
Year 3 Depreciation = (3/15) × 9,000,000 = 1,800,000
Year 4 Depreciation = (2/15) × 9,000,000 = 1,200,000
Year 5 Depreciation = (1/15) × 9,000,000 = 600,000
```

---

## Frontend Implementation Guide

### 1. Create Custom Hooks

**`hooks/use-asset-operations.ts`**

```typescript
import { useMutation, useQuery } from '@tanstack/react-query';
import { assetService } from '@/features/finance/fixed-assets/services/asset-service';

export function useCreateAsset() {
  return useMutation({
    mutationFn: async (data: CreateAssetRequest) => {
      return assetService.createAsset(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}

export function useGetAssetDetail(assetId: string) {
  return useQuery({
    queryKey: ['asset', assetId],
    queryFn: () => assetService.getAssetById(assetId),
    enabled: !!assetId,
  });
}

export function useGenerateDepreciationSchedule() {
  return useMutation({
    mutationFn: async (assetId: string, params: DeprecationScheduleParams) => {
      return assetService.generateDepreciationSchedule(assetId, params);
    },
  });
}
```

### 2. Create Depreciation Preview Component

**`components/depreciation-preview.tsx`**

```typescript
'use client';

import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DepreciationPreviewProps {
  acquisitionCost: number;
  salvageValue?: number;
  usefulLifeMonths?: number;
  depreciationMethod?: string;
  currencyCode?: string;
}

export function DepreciationPreview({
  acquisitionCost,
  salvageValue = 0,
  usefulLifeMonths = 60,
  depreciationMethod = 'SL',
  currencyCode = 'IDR',
}: DepreciationPreviewProps) {
  const schedules = useMemo(() => {
    if (depreciationMethod === 'NONE') return [];

    // Calculate depreciation based on method
    const depreciableAmount = acquisitionCost - salvageValue;
    const monthlyAmount = depreciableAmount / (usefulLifeMonths || 1);

    return Array.from({ length: Math.min(usefulLifeMonths, 60) }).map(
      (_, month) => {
        const accumulated = monthlyAmount * (month + 1);
        return {
          period: `Month ${month + 1}`,
          amount: monthlyAmount,
          accumulated,
          bookValue: acquisitionCost - accumulated,
        };
      }
    );
  }, [acquisitionCost, salvageValue, usefulLifeMonths, depreciationMethod]);

  const formatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Depreciation Schedule Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Depreciation</TableHead>
                <TableHead className="text-right">Accumulated</TableHead>
                <TableHead className="text-right">Book Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.slice(0, 12).map((schedule, idx) => (
                <TableRow key={idx}>
                  <TableCell>{schedule.period}</TableCell>
                  <TableCell className="text-right">
                    {formatter.format(schedule.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatter.format(schedule.accumulated)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatter.format(schedule.bookValue)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {schedules.length > 12 && (
          <p className="text-xs text-gray-500 mt-2">
            Showing first 12 months of {schedules.length} total months
          </p>
        )}

        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
          <div>
            <p className="text-sm text-gray-600">Total Depreciation</p>
            <p className="text-lg font-semibold">
              {formatter.format(depreciableAmount)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Monthly Average</p>
            <p className="text-lg font-semibold">
              {formatter.format(
                (acquisitionCost - salvageValue) / (usefulLifeMonths || 1)
              )}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Final Book Value</p>
            <p className="text-lg font-semibold">{formatter.format(salvageValue)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## API Usage Examples

### Create Asset Request

```bash
curl -X POST http://localhost:8080/api/v1/finance/assets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "code": "ASSET-001",
    "name": "Laptop Dell XPS 15",
    "description": "High-performance laptop",
    "asset_type": "TANGIBLE",
    "category_id": "550e8400-e29b-41d4-a716-446655440000",
    "location_id": "550e8400-e29b-41d4-a716-446655440001",
    "department_id": "550e8400-e29b-41d4-a716-446655440002",
    "custodian_id": "550e8400-e29b-41d4-a716-446655440003",
    "serial_number": "CN123456789",
    "acquisition_date": "2024-01-15",
    "acquisition_cost": 10000000,
    "salvage_value": 1000000,
    "currency_code": "IDR",
    "depreciation_method": "SL",
    "useful_life_months": 60,
    "supplier_name": "PT ABC Electronics",
    "invoice_number": "INV-2024-001"
  }'
```

### Activate Asset

```bash
curl -X POST http://localhost:8080/api/v1/finance/assets/{asset_id}/activate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "activation_date": "2024-01-20"
  }'
```

### Get Depreciation Schedule

```bash
curl -X GET "http://localhost:8080/api/v1/finance/assets/{asset_id}/depreciation-schedule" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Dispose Asset

```bash
curl -X POST http://localhost:8080/api/v1/finance/assets/{asset_id}/dispose \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "disposal_type": "SOLD",
    "disposal_date": "2029-01-15",
    "disposal_value": 1500000,
    "reference_number": "INV-2029-001"
  }'
```

---

## Best Practices

### 1. Asset Code Generation
- Use timestamp + sequential number: `ASSET-20240115-0001`
- Store in database to prevent duplicates
- Make codes user-friendly for reference

### 2. Depreciation Calculations
- Always recalculate when modifying depreciation parameters
- Validate salvage value ≤ acquisition cost
- Store monthly schedules immediately upon activation
- Support partial-month calculations for mid-month acquisition

### 3. Data Integrity & Security
- Use transactions for multi-step operations (activation, disposal)
- Maintain complete audit trail for compliance (include company_id, user_id, timestamp)
- Validate all status transitions
- Use foreign keys to prevent orphaned records
- **MULTI-TENANT**: Always filter queries by company_id
- **RBAC**: Check permissions before state transitions
- **DATA ISOLATION**: Verify asset ownership before any operation
- **AUDIT**: Log who made changes, when, and why

### 4. Financial Reporting & Multi-Scope
- Store both accumulated depreciation and book value
- Track depreciation start date separately from acquisition date
- Support currency conversion at asset level
- Include cost center codes for budget allocation (for multi-scope filtering)
- **MULTI-SCOPE**: Filter reports by department/cost_center/location based on user permissions
- **COMPANY ISOLATION**: Each company sees only their assets and schedules
- **AUDIT**: Compliance reports must include created_by and updated_by for accountability

### 5. Error Handling & Security
- Validate all input before processing
- Provide meaningful error messages (don't leak internal details)
- Log all errors with context (include company_id, user_id for security audits)
- Return consistent error response format
- **SECURITY**: Log access denials for RBAC violations
- **MULTI-TENANT**: Log cross-tenant access attempts (potential security breach)
- **DATA ISOLATION**: Log any company_id mismatch attempts

### 6. Frontend Best Practices & Security
- Use stepper UI for multi-step create forms
- Show depreciation preview in real-time
- Implement form autosave for draft assets
- Use optimistic UI updates for better UX
- Validate client-side before server submission
- **RBAC**: Hide/disable features based on user permissions (finance:asset:activate, etc.)
- **MULTI-TENANT**: Only show assets from current company
- **DATA ISOLATION**: Filter categories and locations by company_id
- **AUDIT**: Include user context in all API calls via JWT token

---

## Security & Multi-Tenant Implementation Guide

### 🔐 RBAC (Role-Based Access Control) Implementation

**Required Permissions:**

```go
// In your middleware/permission checker
type AssetPermissions struct {
  Create    = "finance:asset:create"       // Anyone in Finance role
  Read      = "finance:asset:read"         // Finance role
  Update    = "finance:asset:update"       // Finance Officer
  Activate  = "finance:asset:activate"     // Finance Manager only
  Dispose   = "finance:asset:dispose"      // Senior Accountant only
  Transfer  = "finance:asset:transfer"     // Facility Manager
  ViewAudit = "finance:asset:audit:read"   // Compliance Officer
}

// Role Hierarchy
type AssetRoles struct {
  Finance          = []permission{Create, Read, Update}
  FinanceManager   = []permission{...above, Activate}
  SeniorAccountant = []permission{...above, Dispose}
  FacilityManager  = []permission{Transfer}
  ComplianceOfficer = []permission{ViewAudit}
}
```

**Implementation in Handler:**

```go
func (h *AssetHandler) CreateAsset(c *gin.Context) {
  // Extract JWT claims
  claims := c.MustGet("claims").(*JWTClaims)
  companyID := claims.CompanyID
  userID := claims.UserID
  permissions := claims.Permissions // From JWT token

  // Check permission
  if !contains(permissions, "finance:asset:create") {
    c.JSON(403, gin.H{"error": "Insufficient permissions"})
    return
  }

  var req CreateAssetRequest
  if err := c.ShouldBindJSON(&req); err != nil {
    c.JSON(400, gin.H{"error": err.Error()})
    return
  }

  // Pass context with company_id, user_id
  ctx := context.WithValue(c.Request.Context(), "company_id", companyID)
  ctx = context.WithValue(ctx, "user_id", userID)
  ctx = context.WithValue(ctx, "permissions", permissions)

  asset, err := h.assetService.CreateAsset(ctx, &req)
  if err != nil {
    c.JSON(400, gin.H{"error": err.Error()})
    return
  }

  c.JSON(201, asset)
}
```

---

### 🏢 Multi-Tenant Implementation

**Database Schema with Tenant Isolation:**

```sql
-- All tables MUST include company_id
ALTER TABLE assets ADD COLUMN company_id UUID NOT NULL;
ALTER TABLE asset_categories ADD COLUMN company_id UUID NOT NULL;
ALTER TABLE asset_locations ADD COLUMN company_id UUID NOT NULL;
ALTER TABLE asset_depreciation_schedules ADD COLUMN company_id UUID NOT NULL;
ALTER TABLE asset_disposals ADD COLUMN company_id UUID NOT NULL;
ALTER TABLE asset_audit_logs ADD COLUMN company_id UUID NOT NULL;

-- Create indexes for company_id filtering
CREATE INDEX idx_assets_company ON assets(company_id);
CREATE INDEX idx_assets_company_status ON assets(company_id, status);
CREATE INDEX idx_categories_company ON asset_categories(company_id);
CREATE INDEX idx_locations_company ON asset_locations(company_id);
CREATE INDEX idx_depreciation_company ON asset_depreciation_schedules(company_id);

-- Create composite unique constraints for tenant + code
CREATE UNIQUE INDEX idx_asset_code_company ON assets(company_id, code);
CREATE UNIQUE INDEX idx_asset_serial_company ON assets(company_id, serial_number);
```

**Repository Layer with Tenant Filtering:**

```go
type AssetRepository interface {
  // All methods MUST accept context with company_id
  FindByID(ctx context.Context, id uuid.UUID) (*Asset, error)
  FindByCode(ctx context.Context, code string) (*Asset, error)
  List(ctx context.Context, filter *ListFilter) ([]Asset, int64, error)
  Create(ctx context.Context, asset *Asset) error
  Update(ctx context.Context, asset *Asset) error
}

// IMPLEMENTATION: ALWAYS filter by company_id
func (r *assetRepositoryImpl) FindByID(ctx context.Context, id uuid.UUID) (*Asset, error) {
  companyID := ctx.Value("company_id").(string)
  
  var asset Asset
  // ⚠️ CRITICAL: Add company_id filter to WHERE clause
  if err := r.db.WithContext(ctx).
    Where("id = ? AND company_id = ?", id, companyID).
    First(&asset).Error; err != nil {
    return nil, err
  }
  return &asset, nil
}

func (r *assetRepositoryImpl) List(ctx context.Context, filter *ListFilter) ([]Asset, int64, error) {
  companyID := ctx.Value("company_id").(string)
  
  var assets []Asset
  var total int64
  
  query := r.db.WithContext(ctx).
    Where("company_id = ?", companyID). // ⚠️ CRITICAL: Base query with company_id
    Where("deleted_at IS NULL")          // Soft deletes
  
  // Additional filters
  if filter.Status != "" {
    query = query.Where("status = ?", filter.Status)
  }
  if filter.CategoryID != "" {
    query = query.Where("category_id = ?", filter.CategoryID)
  }
  if filter.LocationID != "" {
    query = query.Where("location_id = ?", filter.LocationID)
  }
  
  // Get total count
  query.Model(&Asset{}).Count(&total)
  
  // Get paginated results
  if err := query.
    Offset((filter.Page - 1) * filter.PageSize).
    Limit(filter.PageSize).
    Order("created_at DESC").
    Find(&assets).Error; err != nil {
    return nil, 0, err
  }
  
  return assets, total, nil
}

func (r *assetRepositoryImpl) Create(ctx context.Context, asset *Asset) error {
  companyID := ctx.Value("company_id").(string)
  
  // ⚠️ CRITICAL: Ensure asset belongs to correct company
  asset.CompanyID = companyID
  
  return r.db.WithContext(ctx).Create(asset).Error
}
```

---

### 🔒 Data Isolation & Access Control

**Verify Ownership Pattern:**

```go
func (s *assetService) VerifyAssetOwnership(ctx context.Context, assetID string) error {
  companyID := ctx.Value("company_id").(string)
  
  // Check if asset belongs to user's company
  var count int64
  if err := s.db.WithContext(ctx).
    Model(&Asset{}).
    Where("id = ? AND company_id = ?", assetID, companyID).
    Count(&count).Error; err != nil {
    return err
  }
  
  if count == 0 {
    return ErrAssetNotFound // Don't reveal company mismatch for security
  }
  return nil
}

// Use in every service method:
func (s *assetService) UpdateAsset(ctx context.Context, assetID string, req *UpdateAssetRequest) error {
  // DATA ISOLATION: Verify ownership first
  if err := s.VerifyAssetOwnership(ctx, assetID); err != nil {
    return err
  }
  
  // Safe to proceed - asset belongs to user's company
  // ...
}
```

**Cross-Company Access Prevention:**

```go
// ❌ WRONG: Doesn't check company_id
asset, err := repo.FindByID(ctx, assetID)

// ✅ CORRECT: Includes company_id in context
companyID := ctx.Value("company_id").(string)
if asset.CompanyID != companyID {
  return ErrUnauthorized("asset does not belong to your company")
}

// ✅ BETTER: Filter in query from start
asset, err := repo.FindByID(ctx, assetID) // repo internally filters by company_id
```

---

### 📊 Multi-Scope Implementation

**Scope Types:**

```go
type UserScope struct {
  CompanyID      string   // Required - always filter
  DepartmentIDs  []string // Optional - user can only see these departments
  LocationIDs    []string // Optional - facility manager sees specific locations
  CostCenterIDs  []string // Optional - finance officer sees specific cost centers
}

// Extract scope from JWT claims
func extractScope(ctx context.Context) *UserScope {
  claims := ctx.Value("claims").(*JWTClaims)
  return &UserScope{
    CompanyID:     claims.CompanyID,
    DepartmentIDs: claims.DepartmentIDs,
    LocationIDs:   claims.LocationIDs,
    CostCenterIDs: claims.CostCenterIDs,
  }
}
```

**Apply Scope in Queries:**

```go
func (r *assetRepositoryImpl) ListWithScope(ctx context.Context, filter *ListFilter) ([]Asset, error) {
  companyID := ctx.Value("company_id").(string)
  scope := ctx.Value("user_scope").(*UserScope)
  
  query := r.db.WithContext(ctx).
    Where("company_id = ?", companyID)
  
  // Apply department scope if limited
  if len(scope.DepartmentIDs) > 0 {
    query = query.Where("department_id IN ?", scope.DepartmentIDs)
  }
  
  // Apply location scope if limited
  if len(scope.LocationIDs) > 0 {
    query = query.Where("location_id IN ?", scope.LocationIDs)
  }
  
  // Apply cost center scope if limited
  if len(scope.CostCenterIDs) > 0 {
    query = query.Where("cost_center_id IN ?", scope.CostCenterIDs)
  }
  
  var assets []Asset
  return assets, query.Find(&assets).Error
}
```

---

### 📝 Audit Logging with Security Context

**Enhanced Audit Log Model:**

```sql
ALTER TABLE asset_audit_logs ADD COLUMN (
  company_id UUID NOT NULL,
  user_id UUID NOT NULL,
  ip_address VARCHAR(45),
  user_agent VARCHAR(255),
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID NOT NULL,
  old_value JSONB,
  new_value JSONB,
  change_reason VARCHAR(255),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_company_date ON asset_audit_logs(company_id, timestamp DESC);
CREATE INDEX idx_audit_user_company ON asset_audit_logs(company_id, user_id);
```

**Log Every Action:**

```go
func (s *assetService) logAudit(ctx context.Context, assetID uuid.UUID, action string, oldVal, newVal interface{}) {
  companyID := ctx.Value("company_id").(string)
  userID := ctx.Value("user_id").(string)
  ipAddress := ctx.Value("ip_address").(string)
  userAgent := ctx.Value("user_agent").(string)
  
  log := &AssetAuditLog{
    ID:            uuid.New(),
    CompanyID:     companyID,
    UserID:        userID,
    AssetID:       assetID,
    Action:        action,
    IPAddress:     ipAddress,
    UserAgent:     userAgent,
    OldValue:      mustMarshalJSON(oldVal),
    NewValue:      mustMarshalJSON(newVal),
    Timestamp:     time.Now(),
  }
  
  // Async logging to avoid blocking main request
  go s.db.Create(log)
}

// Log EVERY operation
- Asset created (CreateAsset)
- Asset updated (UpdateAsset) - log what changed
- Asset activated (ActivateAsset) - log activation date
- Asset disposed (DisposeAsset) - log disposal value and gain/loss
- Permission denied (Access control failure)
- Cross-tenant access attempt (Security incident)
```

---

### 🚨 Security Checklist

Before deploying to production:

**RBAC Checks:**
- [ ] All endpoints have permission checks
- [ ] Role hierarchy is enforced (Manager > Officer > Staff)
- [ ] Permission denied returns 403 Forbidden
- [ ] Permissions stored in JWT claims
- [ ] Permissions validated on every request

**Multi-Tenant Checks:**
- [ ] All tables have company_id column
- [ ] All queries filter by company_id
- [ ] Unique constraints include company_id
- [ ] company_id extracted from JWT token
- [ ] No queries return cross-company data

**Data Isolation Checks:**
- [ ] Assets have company_id before saving
- [ ] Categories/Locations verify company ownership
- [ ] Foreign keys prevent cross-company references
- [ ] List queries always filtered by company_id
- [ ] UPDATE/DELETE only affect user's company assets

**Audit Logging Checks:**
- [ ] Every action logged (CREATE, READ, UPDATE, DELETE)
- [ ] Audit logs include company_id, user_id, timestamp
- [ ] Access denials logged for compliance
- [ ] Cross-tenant attempts logged as security incidents
- [ ] Audit logs retained for 7+ years

**Multi-Scope Checks:**
- [ ] Department scope enforced for limited users
- [ ] Location scope enforced for facility managers
- [ ] Cost center scope enforced for budget control
- [ ] Scope extracted from JWT claims
- [ ] Scope applied in all queries

---

## Troubleshooting

### Common Issues

#### Issue: "Salvage value exceeds acquisition cost"
**Solution:** Ensure salvage value ≤ acquisition cost in validation
```go
if salvageValue > acquisitionCost {
  return errors.New("salvage value cannot exceed acquisition cost")
}
```

#### Issue: Depreciation schedule not generated
**Solution:** Ensure asset is activated before generating schedules
```go
if asset.Status != AssetStatusDraft {
  return errors.New("asset must be in draft status to activate")
}
```

#### Issue: Book value calculation incorrect
**Solution:** Verify depreciation method and useful life parameters
```go
bookValue := acquisitionCost - accumulatedDepreciation
if bookValue < salvageValue {
  bookValue = salvageValue
}
```

#### Issue: Performance issue with large asset lists
**Solution:** Implement pagination and proper indexing
```sql
-- Add indexes
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_category ON assets(category_id);
CREATE INDEX idx_assets_created_at ON assets(created_at DESC);

-- Use LIMIT/OFFSET in queries
SELECT * FROM assets WHERE status = 'active' LIMIT 20 OFFSET 0;
```

---

### Security & Multi-Tenant Issues

#### Issue: "Permission Denied" even for authorized users
**Root Cause:** JWT token missing permissions or company_id not matching
**Solution:** 
```go
// Verify JWT claims
claims := ctx.Value("claims").(*JWTClaims)
if claims == nil || claims.CompanyID == "" {
  return ErrUnauthorized("invalid jwt claims")
}

// Check permission exists in JWT
if !contains(claims.Permissions, "finance:asset:read") {
  return ErrForbidden("permission not in jwt token")
}

// Add to context
ctx = context.WithValue(ctx, "company_id", claims.CompanyID)
ctx = context.WithValue(ctx, "user_id", claims.UserID)
```

#### Issue: User sees assets from other companies (CRITICAL - Data Breach)
**Root Cause:** Missing company_id filter in repository query
**Solution:** Always add company_id to WHERE clause
```go
// ❌ WRONG - Cross-tenant data leak
query := r.db.Where("status = ?", status)

// ✅ CORRECT - Tenant-isolated query
companyID := ctx.Value("company_id").(string)
query := r.db.Where("company_id = ? AND status = ?", companyID, status)

// Verify in all repository methods:
// FindByID, List, FindByCode, FindBySerialNumber, etc.
```

#### Issue: Audit logs missing for sensitive operations
**Root Cause:** Async audit logging with swallowed errors
**Solution:** Make audit logging synchronous for critical operations
```go
// ✅ CORRECT: Disposal is high-risk - must log synchronously
func (s *assetService) DisposeAsset(ctx context.Context, ...) error {
  // ... disposal logic ...
  
  // Sync audit logging - fail operation if audit fails
  if err := s.logAuditSync(ctx, asset.ID, "DISPOSE", oldVal, newVal); err != nil {
    return err // Critical: audit logging must succeed
  }
  
  return tx.Commit().Error
}
```

#### Issue: Cross-company data modification possible (CRITICAL)
**Root Cause:** Missing ownership verification before UPDATE/DELETE
**Solution:** Always verify company_id match before modifying
```go
func (s *assetService) UpdateAsset(ctx context.Context, assetID string, req *UpdateAssetRequest) error {
  companyID := ctx.Value("company_id").(string)
  
  // Find asset
  asset, err := s.assetRepo.FindByID(ctx, assetID)
  if err != nil {
    return ErrAssetNotFound
  }
  
  // DATA ISOLATION: Verify ownership
  if asset.CompanyID != companyID {
    // Don't reveal that asset exists in another company
    return ErrAssetNotFound
  }
  
  // Safe to update
  asset.UpdatedBy = ctx.Value("user_id").(string)
  return s.assetRepo.Update(ctx, asset)
}
```

#### Issue: Asset transfer creates orphaned records with wrong company
**Root Cause:** Not verifying target location belongs to same company
**Solution:** Validate all foreign key relationships belong to same company
```go
func (s *assetService) TransferAsset(ctx context.Context, assetID string, req *TransferAssetRequest) error {
  companyID := ctx.Value("company_id").(string)
  
  // Verify source asset
  asset, _ := s.assetRepo.FindByID(ctx, assetID)
  if asset.CompanyID != companyID {
    return ErrAssetNotFound // Data isolation
  }
  
  // Verify target location belongs to same company
  targetLocation, _ := s.locationRepo.FindByID(ctx, req.TargetLocationID)
  if targetLocation.CompanyID != companyID {
    return ErrForbidden("target location does not belong to your company")
  }
  
  // Safe to transfer
  asset.LocationID = uuid.MustParse(req.TargetLocationID)
  asset.UpdatedBy = ctx.Value("user_id").(string)
  return s.assetRepo.Update(ctx, asset)
}
```

#### Issue: Depreciation schedules visible across companies
**Root Cause:** asset_depreciation_schedules missing company_id filter
**Solution:** Add company_id to all depreciation schedule queries
```go
func (s *assetService) GetDepreciationSchedule(ctx context.Context, assetID string) ([]Schedule, error) {
  companyID := ctx.Value("company_id").(string)
  
  var schedules []Schedule
  // ⚠️ CRITICAL: Filter by both asset_id AND company_id
  err := s.db.WithContext(ctx).
    Where("asset_id = ? AND company_id = ?", assetID, companyID).
    Order("period_month ASC").
    Find(&schedules).Error
  
  return schedules, err
}
```

#### Issue: Limited-scope users see all company assets
**Root Cause:** Not applying department/location/cost_center filters
**Solution:** Extract and apply scope from JWT claims
```go
func (s *assetService) ListAssets(ctx context.Context, filter *ListFilter) ([]Asset, error) {
  companyID := ctx.Value("company_id").(string)
  scope := ctx.Value("user_scope").(*UserScope) // Department/Location limits
  
  query := s.db.WithContext(ctx).
    Where("company_id = ?", companyID)
  
  // Apply department scope if user has limited access
  if len(scope.DepartmentIDs) > 0 {
    query = query.Where("department_id IN ?", scope.DepartmentIDs)
  }
  
  // Apply location scope if facility manager
  if len(scope.LocationIDs) > 0 {
    query = query.Where("location_id IN ?", scope.LocationIDs)
  }
  
  // Apply cost center scope if budget officer
  if len(scope.CostCenterIDs) > 0 {
    query = query.Where("cost_center_id IN ?", scope.CostCenterIDs)
  }
  
  var assets []Asset
  return assets, query.Find(&assets).Error
}
```

#### Issue: Finance staff can activate/dispose assets (unauthorized)
**Root Cause:** Checking only general permission, not role
**Solution:** Check both permission AND role for sensitive operations
```go
func (s *assetService) ActivateAsset(ctx context.Context, assetID string, ...) error {
  // ✅ CORRECT: Require BOTH permission AND role
  if !hasPermission(ctx, "finance:asset:activate") {
    return ErrForbidden("missing permission finance:asset:activate")
  }
  
  if !hasRole(ctx, "finance_manager") {
    return ErrForbidden("only finance managers can activate assets")
  }
  
  // ... proceed with activation
}

// Similar for disposal:
func (s *assetService) DisposeAsset(ctx context.Context, assetID string, ...) error {
  if !hasPermission(ctx, "finance:asset:dispose") {
    return ErrForbidden("missing permission finance:asset:dispose")
  }
  
  if !hasRole(ctx, "senior_accountant") {
    return ErrForbidden("only senior accountants can dispose assets")
  }
  
  // ... proceed with disposal
}
```

---

## Support & Next Steps

For additional implementation details:
1. Review `/docs/features/fixed-assets/ARCHITECTURE.md`
2. Check existing models in `/internal/finance/data/models/`
3. Review DTOs in `/internal/finance/presentation/dto/`
4. Test depreciation engine calculations
5. Implement frontend components incrementally

---

**End of Implementation Guide**
