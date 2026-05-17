# Asset Depreciation Implementation Exploration - GIMS Platform

**Generated:** 2026-05-15  
**Focus:** Backend (Go) & Frontend (Next.js) Depreciation Workflows

---

## 1. Asset Depreciation Models

### Backend Models (Go)

#### 1.1 Asset Category Model
**File:** `apps/api/internal/finance/data/models/asset_category.go`

```go
type AssetCategory struct {
    ID       string
    TenantID string
    Name     string
    Type     AssetCategoryType  // FIXED, CURRENT, INTANGIBLE, OTHER
    
    // Depreciation Configuration
    DepreciationMethod                  DepreciationMethod  // SL, DB, SYD, UOP, NONE
    UsefulLifeMonths                    int
    DepreciationRate                    float64
    IsDepreciable                       bool
    
    // GL Accounts
    AssetAccountID                      string
    AccumulatedDepreciationAccountID    string
    DepreciationExpenseAccountID        string
    DisposalGainAccountID              *string
    DisposalLossAccountID              *string
}
```

**Depreciation Methods:**
- `SL` (Straight-Line): Constant monthly depreciation
- `DB` (Declining Balance): Double declining balance rate
- `SYD` (Sum of Years Digits): Accelerated depreciation
- `UOP` (Units of Production): Based on actual usage
- `NONE`: No depreciation

#### 1.2 Asset Model
**File:** `apps/api/internal/finance/data/models/asset.go`

```go
type Asset struct {
    // Core
    ID               string
    TenantID         string
    Code             string
    Name             string
    
    // Category & Location
    CategoryID       string
    Category        *AssetCategory  // FK
    LocationID       string
    Location        *AssetLocation  // FK
    
    // Acquisition
    AcquisitionDate  time.Time
    AcquisitionCost  float64
    SalvageValue     float64
    
    // Depreciation Fields
    AccumulatedDepreciation float64
    BookValue               float64
    
    // Depreciation Overrides (can override category defaults)
    DepreciationMethod    *string    // SL, DB, SYD, UOP, NONE
    UsefulLifeMonths      *int       // Override useful life
    DepreciationStartDate *time.Time // Can differ from acquisition date
    
    // Status Flags
    IsDepreciable      bool
    IsFullyDepreciated bool
    Status             AssetStatus  // active, disposed, etc.
    
    // Relationships
    Depreciations []AssetDepreciation
}
```

**Key Calculated Fields:**
```go
// GetDepreciationMethod: Asset config overrides category
func (a *Asset) GetDepreciationMethod() string {
    if a.DepreciationMethod != nil && *a.DepreciationMethod != "" {
        return *a.DepreciationMethod
    }
    if a.Category != nil {
        return string(a.Category.DepreciationMethod)
    }
    return "SL"  // Default to straight-line
}

// GetUsefulLifeMonths: Asset config overrides category
func (a *Asset) GetUsefulLifeMonths() int {
    if a.UsefulLifeMonths != nil && *a.UsefulLifeMonths > 0 {
        return *a.UsefulLifeMonths
    }
    if a.Category != nil && a.Category.UsefulLifeMonths > 0 {
        return a.Category.UsefulLifeMonths
    }
    return 60  // Default 5 years
}

// CanDepreciate: Check if asset can be depreciated
func (a *Asset) CanDepreciate() bool {
    return a.IsDepreciable && !a.IsFullyDepreciated && a.BookValue > a.SalvageValue
}

// DepreciationProgress: Calculate depreciation as percentage
func (a *Asset) DepreciationProgress() float64 {
    if a.AcquisitionCost <= a.SalvageValue {
        return 100
    }
    totalDepreciable := a.AcquisitionCost - a.SalvageValue
    progress := (a.AccumulatedDepreciation / totalDepreciable) * 100
    if progress > 100 {
        return 100
    }
    return progress
}
```

#### 1.3 Asset Depreciation Model
**File:** `apps/api/internal/finance/data/models/asset_depreciation.go`

```go
type AssetDepreciation struct {
    ID          string
    TenantID    string
    AssetID     string
    Period      string  // "YYYY-MM" format
    DepreciationDate time.Time
    
    // Calculation Results
    Method        DepreciationMethod
    Amount        float64  // Monthly depreciation
    Accumulated   float64  // Cumulative depreciation
    BookValue     float64  // Current book value
    
    // Approval Workflow
    Status        AssetDepreciationStatus  // PENDING, APPROVED
    JournalEntryID *string                 // FK to journal entry
    
    CreatedBy     *string
    CreatedAt     time.Time
}
```

#### 1.4 Asset Depreciation Schedule Model
**File:** `apps/api/internal/finance/data/models/asset_depreciation_schedule.go`

```go
type AssetDepreciationSchedule struct {
    ID          uuid.UUID
    TenantID    string
    AssetID     uuid.UUID
    
    PeriodStartDate     time.Time
    PeriodEndDate       time.Time
    PeriodMonth         int
    
    DepreciationAmount      float64
    AccumulatedDepreciation float64
    BookValue               float64
}
```

**Purpose:** Pre-generated schedule when asset is created (not used for actual monthly runs)

---

## 2. Depreciation Calculation Engine

### 2.1 Depreciation Engine Service
**File:** `apps/api/internal/finance/domain/service/depreciation_engine.go`

```go
type DepreciationEngine struct {
    method                financeModels.DepreciationMethod
    acquisitionCost       float64
    salvageValue          float64
    usefulLifeMonths      int
    acquisitionDate       time.Time
    depreciationStartDate time.Time
}

// NewDepreciationEngine creates and validates engine
func NewDepreciationEngine(
    method financeModels.DepreciationMethod,
    acquisitionCost float64,
    salvageValue float64,
    usefulLifeMonths int,
    acquisitionDate time.Time,
    depreciationStartDate time.Time,
) (*DepreciationEngine, error) { ... }

// GenerateSchedule generates complete schedule from start to end date
func (de *DepreciationEngine) GenerateSchedule(endDate time.Time) ([]DepreciationScheduleItem, error)
```

### 2.2 Depreciation Calculation Methods

#### Straight-Line (SL)
```
Monthly Depreciation = (Acquisition Cost - Salvage Value) / Useful Life (months)
```

**Example:**
- Cost: 10,000,000 IDR
- Salvage: 1,000,000 IDR
- Life: 60 months
- Monthly: (10,000,000 - 1,000,000) / 60 = 150,000 IDR

#### Declining Balance (DB)
```
Monthly Depreciation = Book Value × (2 / Useful Life in months) / 12
Uses double declining balance rate (2 / Useful Life)
```

**Example (first month with same parameters):**
- Rate: 2 / 60 = 0.03333
- Monthly Rate: 0.03333 / 12 = 0.002777
- Month 1: 10,000,000 × 0.002777 = 27,777 IDR

#### Sum of Years Digits (SYD)
```
Monthly = (Remaining Months / Sum of All Months) × (Cost - Salvage Value)
Sum = n × (n + 1) / 2, where n = useful life in months
```

**Example (first month):**
- Sum: 60 × 61 / 2 = 1,830
- Remaining: 60
- Month 1: (60 / 1,830) × 9,000,000 = 295,081 IDR

#### Units of Production (UOP)
```
(Cost - Salvage Value) / Total Units × Units Produced This Period
Without actual unit data, distributes equally like Straight-Line
```

---

## 3. The "11111" Value Investigation

### Finding: NOT a Depreciation Value

**Result:** "11111" is **NOT related to depreciation calculation**. It's a Chart of Accounts (COA) code.

**Location:** Found in multiple seeders and mappings

```go
// apps/api/seeders/bank_account_seeder.go:99
coaCode: "11111", coaName: "Bank BCA"

// apps/api/seeders/chart_of_accounts_seeder.go:65
{Code: "11111", Name: "Bank BCA", Type: AccountTypeCashBank, ParentCode: "11110", ...}

// apps/api/seeders/system_account_mapping_seeder.go:92
{Key: "finance.bank_default", COACode: "11111", Label: "Finance Bank Default"}

// apps/api/seeders/finance_settings_seeder.go:179
Value: "11111"  // Used as default bank account mapping
```

**Depreciation-related Values Found in Seeders:**
```go
// apps/api/seeders/finance_sprint12_seeder.go:223
BookValue: 14611111       // Book value after depreciation
AccumulatedDepreciation: 388889  // Accumulated depreciation amount
```

These are **actual asset values**, not hardcoded depreciation factors.

---

## 4. Relationship Between Asset Category, Asset Creation, and Depreciation

### 4.1 Asset Category → Asset Creation Flow

```
User Creates Asset Category
    ↓
Defines: DepreciationMethod, UsefulLifeMonths, DepreciationRate
Selects: GL Accounts (Asset, AccumulatedDepreciation, DepreciationExpense)
    ↓
Asset Category stored in DB
```

### 4.2 Asset Creation Flow

**File:** `apps/api/internal/finance/domain/usecase/asset_usecase.go:Create()`

```
1. Validate Category
   - Fetch asset category
   - Check if active
   - Get default depreciation settings

2. Determine Asset Depreciation Settings
   - If asset-level override: use it
   - Else: use category defaults
   - Default fallback: SL method, 60 months

3. Calculate Depreciable Status
   isDepreciable = category.IsDepreciable 
                 AND asset is capitalized 
                 AND usefulLife > 0 
                 AND method != NONE

4. Create Asset Record
   - Set AcquisitionCost = purchase + shipping + installation + tax + other
   - Set BookValue = AcquisitionCost (initially)
   - Set AccumulatedDepreciation = 0
   - Set DepreciationMethod, UsefulLifeMonths, DepreciationStartDate

5. If isDepreciable, Generate Initial Depreciation Schedule
   - Call generateDepreciationSchedule()
   - Creates AssetDepreciationSchedule records for each month
   - Schedule is pre-computed, NOT used for monthly runs

6. Create Asset Transaction (Acquisition)
   - Type: ACQUIRE
   - Amount: totalAcquisitionCost
   - Status: POSTED (if not requiring approval) or PENDING

7. Post to General Ledger
   - Debit: Asset Account (from category)
   - Credit: Payable/Cash (determined by acquisition type)
```

### 4.3 Category Inheritance Logic

```go
// Get depreciation method (asset overrides category)
method := asset.GetDepreciationMethod()
// Returns:
// 1. asset.DepreciationMethod if set
// 2. category.DepreciationMethod if not
// 3. "SL" as default

// Get useful life (asset overrides category)
life := asset.GetUsefulLifeMonths()
// Returns:
// 1. asset.UsefulLifeMonths if > 0
// 2. category.UsefulLifeMonths if > 0
// 3. 60 months default
```

---

## 5. Full Depreciation Workflow

### 5.1 When a New Asset is Added

#### Step 1: Asset Creation & Initial Setup
- **Trigger:** `POST /api/v1/assets`
- **Handler:** AssetHandler.Create()
- **Usecase:** AssetUsecase.Create()

**Actions:**
```
1. Validate request & fetch category
2. Determine capitalization & depreciability
3. Create Asset record
4. Create Acquisition Transaction record
5. ✓ Generate Depreciation Schedule
   └─ For each month in useful life:
      - Calculate depreciation amount per method
      - Create AssetDepreciationSchedule record
      - Store: PeriodMonth, DepreciationAmount, AccumulatedDepreciation, BookValue
6. Post acquisition journal entry
```

**Generated Schedule** (AssetDepreciationSchedule):
- Pre-calculated for entire asset life
- NOT used for monthly depreciation runs
- Reference for projections & forecasting only
- Updated if depreciation config changes

#### Step 2: Monthly Depreciation Batch Run
- **Trigger:** `POST /api/v1/depreciation/run` (user initiates or scheduled)
- **Handler:** DepreciationHandler.RunDepreciation()
- **Usecase:** AssetUsecase.RunDepreciation()

**Actions:**
```
1. Validate Period (YYYY-MM format)
2. Check accounting period is open
3. Fetch all Active assets with AcquisitionDate <= period end
4. For each asset:
   a. Check if asset can be depreciated
      - IsDepreciable = true
      - IsFullyDepreciated = false
      - BookValue > SalvageValue
   
   b. Calculate monthly depreciation amount
      Amount = calculateDepreciation(asset, method)
      
   c. Apply depreciation formula per method:
      
      SL: Amount = (Cost - Salvage) / UsefulLife
      DB: Amount = BookValue × (2 / UsefulLife) / 12
      SYD: Amount = (RemainingMonths / SumOfYears) × (Cost - Salvage)
      UOP: Amount = (Cost - Salvage) / UsefulLife
   
   d. Ensure Amount doesn't exceed (BookValue - SalvageValue)
   
   e. Create AssetDepreciation record with:
      - Period = "YYYY-MM"
      - Amount = calculated
      - Accumulated = previous + Amount
      - BookValue = AcquisitionCost - Accumulated
      - Status = PENDING
   
   f. Post journal entry (if approved):
      - Debit: Depreciation Expense Account
      - Credit: Accumulated Depreciation Account
      - Amount: calculated depreciation
   
   g. Update Asset record:
      - AccumulatedDepreciation += Amount
      - BookValue -= Amount
      - IsFullyDepreciated = (BookValue ≤ SalvageValue)

5. Return: BatchDepreciationRunResponse with count of posted/skipped/failed
```

**Calculation Example** (Straight-Line):
```
Asset: Office Chair
- AcquisitionCost: 5,000,000 IDR
- SalvageValue: 500,000 IDR
- UsefulLife: 60 months
- DepreciationMethod: SL

Depreciable Base = 5,000,000 - 500,000 = 4,500,000
Monthly Amount = 4,500,000 / 60 = 75,000 IDR

Month 1:
- Accumulated = 0 + 75,000 = 75,000
- BookValue = 5,000,000 - 75,000 = 4,925,000

Month 2:
- Accumulated = 75,000 + 75,000 = 150,000
- BookValue = 5,000,000 - 150,000 = 4,850,000

...continues for 60 months until BookValue = SalvageValue
```

#### Step 3: Depreciation Approval
- **Trigger:** `POST /api/v1/depreciation/{id}/approve`
- **Actions:**
  - Update AssetDepreciation.Status to APPROVED
  - Link JournalEntryID if not already linked
  - Update Asset.AccumulatedDepreciation & BookValue

---

## 6. Frontend Implementation (Next.js)

### 6.1 Asset Depreciation Configuration Tab
**File:** `apps/web/src/features/finance/assets/components/asset-tabs/asset-depreciation-config-tab.tsx`

**Functions:**
```typescript
// Calculate depreciation projection for preview
function calculateDepreciationProjection(
  asset: Asset,
  method: DepreciationMethod,
  usefulLifeMonths: number,
  salvageValue: number,
): Array<{
  period: string;
  depreciation: number;
  accumulated: number;
  bookValue: number;
}>

// Calculate monthly depreciation per method
switch (method) {
  case "SL":
    monthlyDepreciation = depreciableBase / usefulLifeMonths;
    break;
  
  case "DB":
    const rate = 2 / (usefulLifeMonths / 12);
    monthlyDepreciation = (currentBookValue - salvageValue) * (rate / 12);
    break;
  
  case "SYD":
    const sumOfYears = (usefulLifeMonths * (usefulLifeMonths + 1)) / 2;
    monthlyDepreciation = ((usefulLifeMonths - i) / sumOfYears) * depreciableBase;
    break;
  
  case "UOP":
    monthlyDepreciation = depreciableBase / usefulLifeMonths; // Fallback to SL
    break;
}

// Ensure doesn't depreciate below salvage value
monthlyDepreciation = Math.min(monthlyDepreciation, currentBookValue - salvageValue);
```

### 6.2 Depreciation Configuration Form
**File:** `apps/web/src/features/finance/assets/components/forms/asset-depreciation-config-form.tsx`

**Editable Fields:**
- `depreciation_method` - Select SL/DB/SYD/UOP/NONE
- `useful_life_months` - Override category default
- `salvage_value` - Override category default
- `depreciation_rate` - For DB method
- `depreciation_start_date` - When to start depreciating

**Preview Calculation:**
```typescript
const depreciableAmount = Math.max(0, acquisitionCost - (values.salvage_value || 0));

// Calculate based on method
switch (values.depreciation_method) {
  case "SL":
    monthlyDepreciation = depreciableAmount / values.useful_life_months;
    annualDepreciation = monthlyDepreciation * 12;
    break;
  
  case "DB": {
    const rate = (values.depreciation_rate || 20) / 100;
    annualDepreciation = acquisitionCost * rate;
    monthlyDepreciation = annualDepreciation / 12;
    break;
  }
  
  case "SYD": {
    const sumOfYears = (values.useful_life_months * (values.useful_life_months + 1)) / 2;
    const firstMonthFactor = values.useful_life_months / sumOfYears;
    monthlyDepreciation = depreciableAmount * firstMonthFactor;
    annualDepreciation = monthlyDepreciation * 12;
    break;
  }
}
```

---

## 7. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ Asset Creation Workflow                                          │
└─────────────────────────────────────────────────────────────────┘

Frontend User Input
    ↓
Asset Form (asset.tsx)
  - Name, Cost, Acquisition Date
  - Category Selection
  - Override Depreciation Method/Life (optional)
    ↓
API: POST /api/v1/assets
    ↓
Asset Usecase: Create()
  ├─ Validate category exists & active
  ├─ Resolve depreciation method (asset override → category → default)
  ├─ Resolve useful life (asset override → category → default)
  ├─ Create Asset record
  ├─ Set: IsDepreciable, BookValue=Cost, AccumulatedDepreciation=0
  ├─ Create Acquisition Transaction
  ├─ Generate Depreciation Schedule (pre-calculated)
  │  └─ For each month: create AssetDepreciationSchedule
  └─ Post to GL: Dr Asset / Cr Payable
    ↓
Database: fixed_assets, asset_depreciation_schedules, journals

─────────────────────────────────────────────────────────────────

Monthly Depreciation Run

Batch Depreciation Request (from UI or scheduler)
    ↓
API: POST /api/v1/depreciation/run (Period: "2025-03")
    ↓
Asset Usecase: RunDepreciation()
  └─ For each active asset:
    ├─ Check IsDepreciable && !IsFullyDepreciated && BookValue > Salvage
    ├─ Calculate Depreciation Amount based on method
    │  └─ Method: SL/DB/SYD/UOP
    ├─ Create AssetDepreciation record (Period, Amount, Accumulated, BookValue)
    ├─ Update Asset: AccumulatedDepreciation += Amount
    ├─ Update Asset: BookValue -= Amount
    ├─ Post Journal: Dr Expense / Cr Accumulated Depreciation
    └─ Approval: Status PENDING → APPROVED
    ↓
Database: asset_depreciations, fixed_assets (updated), journals

─────────────────────────────────────────────────────────────────

Query Current Depreciation Status

API: GET /api/v1/assets/{id}
    ↓
Returns Asset with calculated:
  - BookValue (current)
  - AccumulatedDepreciation (total)
  - DepreciationProgress (percentage)
  - IsFullyDepreciated (boolean)
    ↓
Frontend: Display in Asset Detail Tab
```

---

## 8. Depreciation Status Tracking

### 8.1 Asset Depreciation Record States

```
Status Field: PENDING or APPROVED

┌──────────────┐
│   PENDING    │  (Created by RunDepreciation)
│              │  Not yet posted to GL
│              │  Can be deleted/modified
└──────┬───────┘
       │
       ├─ [Approve] → APPROVED
       │             Posted to GL
       │             Linked to JournalEntry
       │
       └─ [Delete]  → Record deleted
```

### 8.2 Asset Status vs Depreciation

```
Asset Status          → Can Depreciate?
─────────────────────────────────────
draft                 → No (not capitalized)
pending_approval      → No (pending)
pending_capitalization → No
active                → Yes (if IsDepreciable=true)
in_use                → Yes
under_maintenance     → Yes (can still depreciate)
idle                  → Yes
disposed              → No
sold                  → No
written_off           → No
```

---

## 9. Key Configuration Points

### 9.1 Category-Level Settings
```go
AssetCategory {
    DepreciationMethod              // SL, DB, SYD, UOP, NONE
    UsefulLifeMonths               // Months
    DepreciationRate               // For DB method (%)
    IsDepreciable                  // Can assets in this category depreciate?
    
    // GL Accounts
    AssetAccountID                        // Where to debit
    AccumulatedDepreciationAccountID      // Where to credit
    DepreciationExpenseAccountID          // Expense account
}
```

### 9.2 Asset-Level Overrides
```go
Asset {
    DepreciationMethod    *string    // Override category
    UsefulLifeMonths      *int       // Override category
    DepreciationStartDate *time.Time // Different from acquisition date
}
```

### 9.3 Capitalization Threshold
```go
// From settings
CapitalizationThreshold: 5,000,000 IDR

// During asset creation:
if totalAcquisitionCost >= threshold:
    isCapitalized = true
else:
    isCapitalized = false
    // Asset is expensed immediately, not depreciated
```

---

## 10. Important Business Rules

### Rule 1: Never Depreciate Below Salvage Value
```
If: BookValue - Amount < SalvageValue
Then: Amount = BookValue - SalvageValue (capped)
```

### Rule 2: Fully Depreciated Check
```
Asset is fully depreciated when:
  BookValue ≤ SalvageValue
  OR
  AccumulatedDepreciation ≥ (Cost - Salvage)
```

### Rule 3: Non-Capitalized Assets Not Depreciated
```
if totalCost < CapitalizationThreshold:
    Expensed immediately
    IsDepreciable = false
    IsCapitalized = false
```

### Rule 4: No Depreciation During Pending Approval
```
if Status = pending_capitalization:
    CanDepreciate = false
```

### Rule 5: Asset Override Takes Precedence
```
EffectiveMethod = Asset.DepreciationMethod OR Category.DepreciationMethod
EffectiveLife   = Asset.UsefulLifeMonths OR Category.UsefulLifeMonths
```

---

## 11. Example: Complete Lifecycle

### Asset: Factory Equipment
```
Category: Heavy Machinery
  - Method: DB
  - Life: 120 months
  - Rate: 15% p.a.
  - Asset GL: 101-101 (Equipment)
  - Accumulated GL: 101-102 (Accumulated Depreciation)
  - Expense GL: 502-001 (Depreciation Expense)

Asset Created: 2025-01-15
  - Cost: 100,000,000 IDR
  - Salvage: 10,000,000 IDR
  - Capitalized: Yes (≥ threshold)
  - IsDepreciable: Yes
  
  Initial State:
    - BookValue: 100,000,000
    - Accumulated: 0
    - Progress: 0%

Month 1 (2025-01):
  Calculate (DB method):
    Rate = 2 / 120 = 0.01667
    Amount = 100,000,000 × 0.01667 / 12 = 138,889 IDR
  
  After Posting:
    - Accumulated: 138,889
    - BookValue: 99,861,111
    - Progress: 1.32%
    
  Journal Entry:
    Dr 502-001 (Depreciation Expense)      138,889
      Cr 101-102 (Accumulated Depreciation)         138,889

Month 2 (2025-02):
  Calculate (DB method):
    Amount = 99,861,111 × 0.01667 / 12 = 138,695 IDR
  
  After Posting:
    - Accumulated: 277,584
    - BookValue: 99,722,416
    - Progress: 2.64%

...continues until BookValue = 10,000,000
```

---

## 12. Summary of Findings

### Asset Depreciation Values Calculation
1. ✅ **Determined by:** Asset Category's DepreciationMethod + Asset override
2. ✅ **Calculated via:** DepreciationEngine with method-specific formulas
3. ✅ **Stored in:** AssetDepreciation table (monthly records)
4. ✅ **Updated Asset:** AccumulatedDepreciation & BookValue fields
5. ✅ **Posted to GL:** Via journal entries (Expense Dr / Accumulated Cr)

### "11111" Finding
- ❌ **NOT a depreciation value**
- ✅ **Is:** Chart of Accounts (COA) code "Bank BCA"
- Used in: Bank account mappings, default account configurations
- Unrelated to depreciation calculations

### Category-Asset-Depreciation Relationship
```
Category defines defaults:
  ├─ DepreciationMethod (SL/DB/SYD/UOP/NONE)
  ├─ UsefulLifeMonths
  ├─ DepreciationRate (for DB)
  └─ GL Accounts

Asset inherits/overrides:
  ├─ Can override DepreciationMethod
  ├─ Can override UsefulLifeMonths
  ├─ Can override DepreciationStartDate
  └─ Inherits GL Accounts from Category

When calculating depreciation:
  ├─ If Asset.DepreciationMethod set → use it
  ├─ Else if Category.DepreciationMethod set → use it
  ├─ Else → default to SL (Straight-Line)
  └─ Similar for UsefulLifeMonths
```

### Depreciation Workflow Summary
```
1. Asset Created (new or from purchase)
   ├─ Initial BookValue = AcquisitionCost
   ├─ Initial AccumulatedDepreciation = 0
   ├─ Initial DepreciationSchedule pre-calculated
   └─ Acquisition posted to GL

2. Monthly Depreciation Run (user-initiated or scheduled)
   ├─ For each active asset:
   │  ├─ Check CanDepreciate status
   │  ├─ Calculate Amount per method
   │  ├─ Create AssetDepreciation record
   │  ├─ Post to GL
   │  └─ Update Asset (Accumulated, BookValue)
   └─ Status: PENDING (approval required)

3. Depreciation Approval
   ├─ Change Status → APPROVED
   ├─ Link to JournalEntry
   └─ GL posting confirmed

4. Asset State Throughout Year
   ├─ Each month: BookValue decreases
   ├─ Each month: AccumulatedDepreciation increases
   ├─ Progress calculated: Accumulated / (Cost - Salvage)
   └─ Until: BookValue = SalvageValue → IsFullyDepreciated
```

---

## 13. Related Files Reference

### Backend (Go)
- `apps/api/internal/finance/data/models/asset.go`
- `apps/api/internal/finance/data/models/asset_category.go`
- `apps/api/internal/finance/data/models/asset_depreciation.go`
- `apps/api/internal/finance/domain/service/depreciation_engine.go`
- `apps/api/internal/finance/domain/service/depreciation_service.go`
- `apps/api/internal/finance/domain/usecase/asset_usecase.go` (Create, RunDepreciation methods)
- `apps/api/internal/finance/domain/usecase/depreciation_usecase.go` (Depreciation calculations)

### Frontend (React)
- `apps/web/src/features/finance/assets/components/asset-form.tsx`
- `apps/web/src/features/finance/assets/components/asset-tabs/asset-depreciation-config-tab.tsx`
- `apps/web/src/features/finance/assets/components/forms/asset-depreciation-config-form.tsx`
- `apps/web/src/features/finance/asset-categories/components/asset-category-form.tsx`

### Database Seeders
- `apps/api/seeders/chart_of_accounts_seeder.go`
- `apps/api/seeders/finance_sprint12_seeder.go`
- `apps/api/seeders/system_account_mapping_seeder.go`

### Documentation
- `docs/draft-implementation-plan/finance-asset-management.md`
- `docs/features/fixed-assets/IMPLEMENTATION_GUIDE.md`
- `docs/modul-references/modul-finance/finance-module-logic.md`
