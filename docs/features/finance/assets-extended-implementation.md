# Finance Assets Module - Extended Implementation Documentation

## Overview

Dokumen ini menjelaskan implementasi extended asset management system untuk modul Finance Assets di GIMS ERP. Implementasi ini menambahkan fitur-fitur production-ready seperti asset master data lengkap, audit trail, file attachments, assignment tracking, dan advanced search.

**Versi**: 2.2  
**Tanggal**: 20 Maret 2026  
**Status**: Phase 1 ✅, Phase 2 ✅ (COMPLETE), Phase 3 Ready

---

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Asset List   │  │ Asset Detail │  │ Advanced Search      │  │
│  │   View       │  │   (Tabs)     │  │   & Filters          │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
└─────────┼─────────────────┼─────────────────────┼──────────────┘
          │                 │                     │
          └─────────────────┴─────────────────────┘
                            │
                            ▼ HTTP/REST API
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (Go/Gin)                            │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ Asset Handler    │  │ Extended Asset   │  │ File Upload  │  │
│  │   (CRUD)         │  │   Service        │  │   Service    │  │
│  └────────┬─────────┘  └────────┬─────────┘  └──────┬───────┘  │
│           │                     │                    │          │
│           └─────────────────────┴────────────────────┘          │
│                              │                                  │
│  ┌──────────────────┐  ┌─────▼──────┐  ┌──────────────────┐    │
│  │ Audit Service    │  │ Repository │  │ Assignment       │    │
│  │   (Logging)      │  │   Layer    │  │   Service        │    │
│  └──────────────────┘  └─────┬──────┘  └──────────────────┘    │
└──────────────────────────────┼──────────────────────────────────┘
                               │ GORM
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Database (PostgreSQL)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ fixed_assets │  │ asset_       │  │ asset_assignment_    │  │
│  │  (extended)  │  │ attachments  │  │ history              │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │ asset_audit_ │  │ asset_       │                            │
│  │ logs         │  │ transactions │                            │
│  └──────────────┘  └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

### Entity Relationship Diagram

```
┌─────────────────┐
│  fixed_assets   │
├─────────────────┤
│ id (PK)         │
│ code (unique)   │
│ name            │
│ serial_number   │
│ barcode         │
│ asset_tag       │
│ company_id (FK) │
│ department_id   │
│ employee_id     │
│ supplier_id     │
│ po_id           │
│ invoice_id      │
│ category_id     │
│ location_id     │
│ ... (40+ fields)│
└────────┬────────┘
         │
    ┌────┴────┬────────────┬────────────────┐
    │         │            │                │
    ▼         ▼            ▼                ▼
┌────────┐ ┌──────────┐ ┌────────────────┐ ┌──────────┐
│attach- │ │  audit   │ │  assignment    │ │trans-    │
│ments   │ │  logs    │ │  history       │ │actions   │
└────────┘ └──────────┘ └────────────────┘ └──────────┘
```

---

## Database Schema

### 1. Extended fixed_assets Table

Tabel utama yang di-extend dengan 26 kolom baru:

#### Identity Fields (Baru)

| Column          | Type         | Description             |
| --------------- | ------------ | ----------------------- |
| `serial_number` | VARCHAR(100) | Serial number unik aset |
| `barcode`       | VARCHAR(100) | Barcode untuk scanning  |
| `qr_code`       | TEXT         | QR code data/URL        |
| `asset_tag`     | VARCHAR(50)  | Label fisik aset        |

#### Organization Fields (Baru)

| Column                    | Type | Description               |
| ------------------------- | ---- | ------------------------- |
| `company_id`              | UUID | Multi-company support     |
| `business_unit_id`        | UUID | Business unit             |
| `department_id`           | UUID | Department pemilik        |
| `assigned_to_employee_id` | UUID | Employee yang menggunakan |
| `assignment_date`         | DATE | Tanggal assignment        |

#### Acquisition Fields (Baru)

| Column                | Type          | Description      |
| --------------------- | ------------- | ---------------- |
| `supplier_id`         | UUID          | Vendor/Supplier  |
| `purchase_order_id`   | UUID          | Link ke PO       |
| `supplier_invoice_id` | UUID          | Link ke invoice  |
| `shipping_cost`       | DECIMAL(15,2) | Biaya pengiriman |
| `installation_cost`   | DECIMAL(15,2) | Biaya instalasi  |
| `tax_amount`          | DECIMAL(15,2) | Pajak            |
| `other_costs`         | DECIMAL(15,2) | Biaya lainnya    |

#### Depreciation Fields (Baru)

| Column                    | Type        | Description                               |
| ------------------------- | ----------- | ----------------------------------------- |
| `depreciation_method`     | VARCHAR(10) | Override kategori: SL, DB, SYD, UOP, NONE |
| `useful_life_months`      | INTEGER     | Override useful life                      |
| `depreciation_start_date` | DATE        | Tanggal mulai depresiasi                  |

#### Status Fields (Baru)

| Column                 | Type        | Description                                                                             |
| ---------------------- | ----------- | --------------------------------------------------------------------------------------- |
| `lifecycle_stage`      | VARCHAR(30) | draft, pending_capitalization, active, in_use, under_maintenance, disposed, written_off |
| `is_capitalized`       | BOOLEAN     | Sudah masuk GL?                                                                         |
| `is_depreciable`       | BOOLEAN     | Bisa didepresiasi?                                                                      |
| `is_fully_depreciated` | BOOLEAN     | Nilai buku = salvage?                                                                   |

#### Parent/Child Fields (Baru)

| Column            | Type    | Description                   |
| ----------------- | ------- | ----------------------------- |
| `parent_asset_id` | UUID    | Parent asset (untuk komponen) |
| `is_parent`       | BOOLEAN | Apakah ini composite asset?   |

#### Warranty Fields (Baru)

| Column              | Type         | Description      |
| ------------------- | ------------ | ---------------- |
| `warranty_start`    | DATE         | Mulai garansi    |
| `warranty_end`      | DATE         | Akhir garansi    |
| `warranty_provider` | VARCHAR(255) | Provider garansi |
| `warranty_terms`    | TEXT         | Syarat garansi   |

#### Insurance Fields (Baru)

| Column                    | Type          | Description         |
| ------------------------- | ------------- | ------------------- |
| `insurance_policy_number` | VARCHAR(100)  | Nomor polis         |
| `insurance_provider`      | VARCHAR(255)  | Provider asuransi   |
| `insurance_start`         | DATE          | Mulai asuransi      |
| `insurance_end`           | DATE          | Akhir asuransi      |
| `insurance_value`         | DECIMAL(15,2) | Nilai pertanggungan |

#### Approval Fields (Baru)

| Column        | Type      | Description       |
| ------------- | --------- | ----------------- |
| `approved_by` | UUID      | User yang approve |
| `approved_at` | TIMESTAMP | Tanggal approval  |

#### Indexes

```sql
CREATE INDEX idx_assets_serial ON fixed_assets(serial_number);
CREATE INDEX idx_assets_barcode ON fixed_assets(barcode);
CREATE INDEX idx_assets_company ON fixed_assets(company_id);
CREATE INDEX idx_assets_employee ON fixed_assets(assigned_to_employee_id);
CREATE INDEX idx_assets_lifecycle ON fixed_assets(lifecycle_stage);
CREATE INDEX idx_assets_parent ON fixed_assets(parent_asset_id);
CREATE INDEX idx_assets_supplier ON fixed_assets(supplier_id);
CREATE INDEX idx_assets_warranty_end ON fixed_assets(warranty_end);
```

### 2. asset_attachments Table

Menyimpan file attachments (invoice, warranty, photos, manuals).

```sql
CREATE TABLE asset_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES fixed_assets(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(20) NOT NULL CHECK (file_type IN ('invoice', 'warranty', 'photo', 'manual', 'other')),
    file_size INTEGER,
    mime_type VARCHAR(100),
    description TEXT,
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_asset_attachments_asset ON asset_attachments(asset_id);
CREATE INDEX idx_asset_attachments_type ON asset_attachments(file_type);
```

### 3. asset_audit_logs Table

Audit trail untuk tracking semua perubahan pada asset.

```sql
CREATE TABLE asset_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES fixed_assets(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- created, updated, deleted, depreciated, transferred, disposed, sold, revalued, assigned, approved
    changes JSONB, -- Array of {field, old_value, new_value}
    performed_by UUID REFERENCES users(id),
    performed_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_asset_audit_asset ON asset_audit_logs(asset_id);
CREATE INDEX idx_asset_audit_action ON asset_audit_logs(action);
CREATE INDEX idx_asset_audit_date ON asset_audit_logs(performed_at);
```

### 4. asset_assignment_history Table

Tracking history assignment aset ke employee.

```sql
CREATE TABLE asset_assignment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES fixed_assets(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id),
    department_id UUID REFERENCES departments(id),
    location_id UUID REFERENCES locations(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id),
    returned_at TIMESTAMPTZ,
    return_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_asset_assignment_asset ON asset_assignment_history(asset_id);
CREATE INDEX idx_asset_assignment_employee ON asset_assignment_history(employee_id);
CREATE INDEX idx_asset_assignment_date ON asset_assignment_history(assigned_at);
```

---

## Backend Implementation

### 1. Model Structure

#### Asset Model (Enhanced)

```go
type Asset struct {
    // Basic fields
    ID   string `gorm:"type:uuid;primary_key" json:"id"`
    Code string `gorm:"type:varchar(50);not null;uniqueIndex" json:"code"`
    Name string `gorm:"type:varchar(200);not null;index" json:"name"`

    // NEW: Additional Identifiers
    SerialNumber *string `gorm:"type:varchar(100);index" json:"serial_number,omitempty"`
    Barcode      *string `gorm:"type:varchar(100);index" json:"barcode,omitempty"`
    QRCode       *string `gorm:"type:text" json:"qr_code,omitempty"`
    AssetTag     *string `gorm:"type:varchar(50)" json:"asset_tag,omitempty"`

    // NEW: Organization Hierarchy
    CompanyID       *string  `gorm:"type:uuid;index" json:"company_id,omitempty"`
    BusinessUnitID  *string  `gorm:"type:uuid;index" json:"business_unit_id,omitempty"`
    DepartmentID    *string  `gorm:"type:uuid;index" json:"department_id,omitempty"`
    AssignedToEmployeeID *string `gorm:"type:uuid;index" json:"assigned_to_employee_id,omitempty"`

    // NEW: Acquisition Details
    SupplierID          *string `gorm:"type:uuid;index" json:"supplier_id,omitempty"`
    PurchaseOrderID     *string `gorm:"type:uuid" json:"purchase_order_id,omitempty"`
    SupplierInvoiceID   *string `gorm:"type:uuid" json:"supplier_invoice_id,omitempty"`

    // Cost Breakdown
    AcquisitionCost  float64 `gorm:"type:numeric(18,2);not null" json:"acquisition_cost"`
    ShippingCost     float64 `gorm:"type:numeric(18,2);default:0" json:"shipping_cost"`
    InstallationCost float64 `gorm:"type:numeric(18,2);default:0" json:"installation_cost"`
    TaxAmount        float64 `gorm:"type:numeric(18,2);default:0" json:"tax_amount"`
    OtherCosts       float64 `gorm:"type:numeric(18,2);default:0" json:"other_costs"`

    // NEW: Depreciation Configuration
    DepreciationMethod    *string    `gorm:"type:varchar(10)" json:"depreciation_method,omitempty"`
    UsefulLifeMonths      *int       `gorm:"type:integer" json:"useful_life_months,omitempty"`
    DepreciationStartDate *time.Time `gorm:"type:date" json:"depreciation_start_date,omitempty"`

    // Status & Lifecycle
    Status         AssetStatus         `gorm:"type:varchar(20);default:'active';index" json:"status"`
    LifecycleStage AssetLifecycleStage `gorm:"type:varchar(30);default:'draft';index" json:"lifecycle_stage"`

    // Lifecycle Flags
    IsCapitalized      bool `gorm:"type:boolean;default:false;index" json:"is_capitalized"`
    IsDepreciable      bool `gorm:"type:boolean;default:true" json:"is_depreciable"`
    IsFullyDepreciated bool `gorm:"type:boolean;default:false;index" json:"is_fully_depreciated"`

    // Parent/Child
    ParentAssetID *string `gorm:"type:uuid;index" json:"parent_asset_id,omitempty"`
    IsParent      bool    `gorm:"type:boolean;default:false" json:"is_parent"`

    // Warranty
    WarrantyStart    *time.Time `gorm:"type:date" json:"warranty_start,omitempty"`
    WarrantyEnd      *time.Time `gorm:"type:date;index" json:"warranty_end,omitempty"`
    WarrantyProvider *string    `gorm:"type:varchar(255)" json:"warranty_provider,omitempty"`
    WarrantyTerms    *string    `gorm:"type:text" json:"warranty_terms,omitempty"`

    // Insurance
    InsurancePolicyNumber *string    `gorm:"type:varchar(100)" json:"insurance_policy_number,omitempty"`
    InsuranceProvider     *string    `gorm:"type:varchar(255)" json:"insurance_provider,omitempty"`
    InsuranceStart        *time.Time `gorm:"type:date" json:"insurance_start,omitempty"`
    InsuranceEnd          *time.Time `gorm:"type:date" json:"insurance_end,omitempty"`
    InsuranceValue        *float64   `gorm:"type:numeric(18,2)" json:"insurance_value,omitempty"`

    // Approval
    ApprovedBy *string    `gorm:"type:uuid" json:"approved_by,omitempty"`
    ApprovedAt *time.Time `gorm:"type:timestamptz" json:"approved_at,omitempty"`

    // Relations
    Attachments         []AssetAttachment        `gorm:"foreignKey:AssetID" json:"attachments,omitempty"`
    AuditLogs           []AssetAuditLog          `gorm:"foreignKey:AssetID" json:"audit_logs,omitempty"`
    AssignmentHistories []AssetAssignmentHistory `gorm:"foreignKey:AssetID" json:"assignment_histories,omitempty"`
}
```

#### Helper Methods

```go
// TotalAcquisitionCost returns total cost including additional costs
func (a *Asset) TotalAcquisitionCost() float64

// IsUnderWarranty checks if asset is currently under warranty
func (a *Asset) IsUnderWarranty() bool

// WarrantyDaysRemaining returns days remaining in warranty
func (a *Asset) WarrantyDaysRemaining() int

// IsInsured checks if asset has active insurance
func (a *Asset) IsInsured() bool

// GetDepreciationMethod returns method (asset config overrides category)
func (a *Asset) GetDepreciationMethod() string

// GetUsefulLifeMonths returns useful life in months
func (a *Asset) GetUsefulLifeMonths() int

// CanDepreciate checks if asset can be depreciated
func (a *Asset) CanDepreciate() bool

// IsAssigned checks if asset is assigned to employee
func (a *Asset) IsAssigned() bool

// AgeInMonths returns asset age in months
func (a *Asset) AgeInMonths() int

// DepreciationProgress returns depreciation percentage
func (a *Asset) DepreciationProgress() float64
```

### 2. Repository Layer

#### AssetAttachmentRepository

```go
type AssetAttachmentRepository interface {
    Create(ctx context.Context, attachment *models.AssetAttachment) error
    GetByID(ctx context.Context, id string) (*models.AssetAttachment, error)
    GetByAssetID(ctx context.Context, assetID string) ([]models.AssetAttachment, error)
    Update(ctx context.Context, attachment *models.AssetAttachment) error
    Delete(ctx context.Context, id string) error
    DeleteByAssetID(ctx context.Context, assetID string) error
    CountByAssetID(ctx context.Context, assetID string) (int64, error)
    GetTotalSizeByAssetID(ctx context.Context, assetID string) (int64, error)
}
```

#### AssetAuditLogRepository

```go
type AssetAuditLogRepository interface {
    Create(ctx context.Context, log *models.AssetAuditLog) error
    CreateBatch(ctx context.Context, logs []*models.AssetAuditLog) error
    GetByID(ctx context.Context, id string) (*models.AssetAuditLog, error)
    GetByAssetID(ctx context.Context, assetID string, limit int) ([]models.AssetAuditLog, error)
    GetByAssetIDAndAction(ctx context.Context, assetID string, action string) ([]models.AssetAuditLog, error)
    Search(ctx context.Context, params AuditLogSearchParams) ([]models.AssetAuditLog, int64, error)
    GetRecentActivity(ctx context.Context, limit int) ([]models.AssetAuditLog, error)
    GetActivityCountByDate(ctx context.Context, startDate, endDate time.Time) (map[string]int64, error)
}
```

#### AssetAssignmentRepository

```go
type AssetAssignmentRepository interface {
    Create(ctx context.Context, assignment *models.AssetAssignmentHistory) error
    GetByID(ctx context.Context, id string) (*models.AssetAssignmentHistory, error)
    GetByAssetID(ctx context.Context, assetID string) ([]models.AssetAssignmentHistory, error)
    GetCurrentAssignment(ctx context.Context, assetID string) (*models.AssetAssignmentHistory, error)
    MarkAsReturned(ctx context.Context, id string, returnDate time.Time, reason string) error
    GetByEmployeeID(ctx context.Context, employeeID string, activeOnly bool) ([]models.AssetAssignmentHistory, error)
    GetByDepartmentID(ctx context.Context, departmentID string) ([]models.AssetAssignmentHistory, error)
    GetAssignmentCounts(ctx context.Context, params AssignmentCountParams) (map[string]int64, error)
    GetEmployeeAssetCount(ctx context.Context, employeeID string) (int64, error)
}
```

---

## API Endpoints

### Existing Endpoints (Remains)

```
GET    /api/v1/finance/assets                    # List assets
GET    /api/v1/finance/assets/:id                # Get asset detail
POST   /api/v1/finance/assets                    # Create asset
PUT    /api/v1/finance/assets/:id                # Update asset
DELETE /api/v1/finance/assets/:id                # Delete asset
POST   /api/v1/finance/assets/:id/depreciate     # Run depreciation
POST   /api/v1/finance/assets/:id/transfer       # Transfer location
POST   /api/v1/finance/assets/:id/dispose        # Dispose asset
POST   /api/v1/finance/assets/:id/sell           # Sell asset
POST   /api/v1/finance/assets/:id/revalue        # Revalue asset
POST   /api/v1/finance/assets/:id/adjust         # Adjust value
POST   /api/v1/finance/assets/transactions/:txId/approve  # Approve transaction
```

### New Endpoints

#### Attachments

```
POST   /api/v1/finance/assets/:id/attachments              # Upload attachment
GET    /api/v1/finance/assets/:id/attachments              # List attachments
GET    /api/v1/finance/assets/:id/attachments/:attachmentId # Download attachment
DELETE /api/v1/finance/assets/:id/attachments/:attachmentId # Delete attachment
```

#### Assignment

```
POST   /api/v1/finance/assets/:id/assign                   # Assign to employee
POST   /api/v1/finance/assets/:id/return                   # Return from employee
GET    /api/v1/finance/assets/:id/assignment-history       # Get assignment history
```

#### Audit Logs

```
GET    /api/v1/finance/assets/:id/audit-logs               # Get audit trail
```

#### Advanced Search

```
POST   /api/v1/finance/assets/search                       # Advanced search with filters
GET    /api/v1/finance/assets/search/saved                 # Get saved searches
POST   /api/v1/finance/assets/search/save                  # Save search
```

#### Bulk Operations

```
POST   /api/v1/finance/assets/bulk-import                  # Import from CSV/Excel
POST   /api/v1/finance/assets/bulk-update                  # Bulk update fields
POST   /api/v1/finance/assets/bulk-transfer                # Bulk transfer location
POST   /api/v1/finance/assets/bulk-depreciate              # Bulk depreciate
POST   /api/v1/finance/assets/bulk-export                  # Export to CSV/Excel
```

#### QR/Barcode

```
GET    /api/v1/finance/assets/lookup/:code                 # Lookup by barcode/QR
GET    /api/v1/finance/assets/:id/qr-code                  # Generate QR code
```

#### Approval Workflow

```
POST   /api/v1/finance/assets/:id/submit-for-approval      # Submit for approval
POST   /api/v1/finance/assets/:id/approve                  # Approve asset
POST   /api/v1/finance/assets/:id/reject                   # Reject asset
```

#### Reports

```
GET    /api/v1/finance/assets/reports/register             # Asset register report
GET    /api/v1/finance/assets/reports/depreciation-schedule # Depreciation schedule
GET    /api/v1/finance/assets/reports/movement             # Asset movement report
GET    /api/v1/finance/assets/reports/warranty-expiry      # Warranty expiry report
GET    /api/v1/finance/assets/reports/assignment           # Assignment report
```

---

## Implementation Phases

### Phase 1: Foundation & Schema ✅ COMPLETED

**Deliverables:**

- ✅ Database migration (26 new columns + 3 new tables)
- ✅ Extended Go models dengan helper methods
- ✅ Repository layer untuk attachments, audit logs, assignments
- ✅ TypeScript interfaces untuk frontend
- ✅ Model registration di migrate.go

**Files Modified/Created:**

```
apps/api/migrations/20260319_extend_fixed_assets_schema.sql
apps/api/internal/finance/data/models/asset.go
apps/api/internal/finance/data/models/asset_attachment.go
apps/api/internal/finance/data/models/asset_audit_log.go
apps/api/internal/finance/data/models/asset_assignment_history.go
apps/api/internal/finance/data/models/asset_relations.go
apps/api/internal/finance/data/repositories/asset_attachment_repository.go
apps/api/internal/finance/data/repositories/asset_audit_log_repository.go
apps/api/internal/finance/data/repositories/asset_assignment_repository.go
apps/web/src/features/finance/assets/types/index.d.ts
apps/api/internal/core/infrastructure/database/migrate.go
```

### Phase 2: Core UI Components ✅ COMPLETED

**Backend Deliverables:**

- ✅ Extended DTOs: `AssetResponse` with 26+ new fields, attachment/audit/assignment DTOs
- ✅ Extended Mapper: All new fields mapped, attachment/audit/assignment mappers
- ✅ Usecase: 7 new methods (attachments, assignments, audit logs, depreciation config)
- ✅ Handler: 7 new handler methods
- ✅ Router: 7 new routes registered with permissions
- ✅ DI (routes.go): Wired attachment/audit/assignment repos into usecase
- ✅ Bug fix: `asset_repository.go` table prefix corrected from `assets.` to `fixed_assets.`

**Frontend Deliverables:**

- ✅ Updated types: Full TypeScript definitions dengan 40+ fields
- ✅ i18n: Complete translations (EN & ID)
- ✅ Services: 7 new API methods
- ✅ Hooks: 7 React Query hooks
- ✅ Detail modal: Enhanced dengan 9 tabs total
  - Overview (enhanced dengan QR code, warranty, assignment)
  - Depreciations (existing)
  - Transactions (existing)
  - Attachments (new - file upload/download)
  - Assignment History (new - tracking)
  - Audit Log (new - change history)
  - Acquisition (new - cost breakdown, supplier)
  - Depreciation Config (new - override settings)
  - Components (new - parent/child relationships)

**UI Components Created:**

**Asset Tabs (6 components):**

1. `AssetAcquisitionTab` - Cost breakdown visualization, supplier/PO/invoice info
2. `AssetDepreciationConfigTab` - Override category defaults, depreciation preview
3. `AssetComponentsTab` - Parent/child asset management, hierarchy tree
4. `AssetAttachmentsTab` - File upload, download, delete
5. `AssetAuditLogTab` - Change tracking with before/after comparison
6. `AssetAssignmentHistoryTab` - Employee assignment tracking

**Forms (4 components):**

1. `AssetMasterDataForm` - Identity fields (serial, barcode, QR code generation)
2. `AssetAcquisitionForm` - Cost details, searchable supplier/PO/invoice dropdowns
3. `AssetDepreciationConfigForm` - Method selection, useful life, salvage value
4. `AssetAssignmentForm` - Employee assignment dengan avatar display

**Advanced Components (2 components):**

1. `AssetAdvancedSearch` - Complex filters, saved searches, multi-select
2. `AssetBulkOperations` - Bulk update, transfer, depreciate, dispose

**Features:**

- ✅ QR Code generation and display
- ✅ Cost breakdown visualization (stacked bar chart)
- ✅ Warranty status tracking dengan days remaining
- ✅ Insurance tracking
- ✅ Depreciation projection preview
- ✅ Component hierarchy tree view
- ✅ Async searchable dropdowns (supplier, PO, invoice, employee)
- ✅ Multi-select filters untuk advanced search
- ✅ Date range pickers
- ✅ Number range inputs untuk value filtering
- ✅ Bulk operations dengan progress indicators
- ✅ Full form validation dengan Zod
- ✅ Responsive design
- ✅ Complete i18n support

**Files Modified:**

```
apps/api/internal/finance/domain/dto/asset_dto.go
apps/api/internal/finance/domain/mapper/asset_mapper.go
apps/api/internal/finance/domain/usecase/asset_usecase.go
apps/api/internal/finance/presentation/handler/asset_handler.go
apps/api/internal/finance/presentation/router/asset_routers.go
apps/api/internal/finance/presentation/routes.go
apps/api/internal/finance/data/repositories/asset_repository.go
apps/web/src/features/finance/assets/types/index.d.ts
apps/web/src/features/finance/assets/i18n/en.ts
apps/web/src/features/finance/assets/i18n/id.ts
apps/web/src/features/finance/assets/services/finance-assets-service.ts
apps/web/src/features/finance/assets/hooks/use-finance-assets.ts
apps/web/src/features/finance/assets/components/asset-detail-modal.tsx
```

### Phase 3: Advanced Features ⏳ PENDING

**Scope:**

- Advanced search & filter component
- Bulk operations (import, export, update)
- Barcode/QR code scanner integration
- Asset hierarchy tree view

### Phase 4: Asset Lifecycle & Workflow ⏳ PENDING

**Scope:**

- Status workflow implementation
- Approval workflow UI
- Assignment & return tracking
- Location transfer with history

### Phase 5: Reporting & Analytics ⏳ PENDING

**Scope:**

- Asset register report
- Depreciation schedule report
- Asset movement report
- Warranty expiry report
- Dashboard cards & charts

---

## Frontend TypeScript Types

### Enhanced Asset Interface

```typescript
export interface Asset {
  // Existing fields
  id: string;
  code: string;
  name: string;
  // ... (40+ fields)

  // NEW: Identitas
  serial_number?: string;
  barcode?: string;
  qr_code?: string;
  asset_tag?: string;

  // NEW: Organization
  company?: CompanyLite;
  business_unit?: BusinessUnitLite;
  department?: DepartmentLite;
  assigned_to_employee?: EmployeeLite;

  // NEW: Acquisition
  supplier?: ContactLite;
  purchase_order?: PurchaseOrderLite;
  supplier_invoice?: SupplierInvoiceLite;
  acquisition_cost_breakdown?: AssetAcquisitionCostBreakdown;

  // NEW: Relations
  attachments?: AssetAttachment[];
  audit_logs?: AssetAuditLog[];
  assignment_histories?: AssetAssignmentHistory[];
}
```

### Search & Filter Types

```typescript
export interface ListAssetsParams {
  // Pagination
  page?: number;
  per_page?: number;

  // Basic filters
  search?: string;
  status?: AssetStatus | AssetStatus[];
  lifecycle_stage?: AssetLifecycleStage | AssetLifecycleStage[];

  // Organization filters
  company_id?: string;
  category_id?: string | string[];
  location_id?: string | string[];
  department_id?: string | string[];
  assigned_to_employee_id?: string | string[];

  // Date range
  acquisition_date_from?: string;
  acquisition_date_to?: string;

  // Value range
  acquisition_cost_min?: number;
  acquisition_cost_max?: number;
  book_value_min?: number;
  book_value_max?: number;

  // Boolean filters
  is_capitalized?: boolean;
  is_depreciable?: boolean;
  is_fully_depreciated?: boolean;
  has_warranty?: boolean;
  warranty_expiring_soon?: boolean;

  // Assignment
  assigned_or_unassigned?: "assigned" | "unassigned";

  // Sorting
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}
```

---

## Testing Strategy

### Unit Tests

- Repository layer tests
- Helper method tests (Asset struct methods)
- Service layer tests

### Integration Tests

- API endpoint tests
- Database migration tests
- File upload tests

### E2E Tests

- Asset creation flow
- Assignment workflow
- Depreciation calculation
- Bulk operations

---

## Migration Guide

### From Existing System

1. **Database Migration**:

   ```bash
   # Migration akan dijalankan otomatis saat API start
   npx pnpm dev:api
   ```

2. **Data Backfill**:

   ```sql
   -- Set lifecycle_stage berdasarkan status yang ada
   UPDATE fixed_assets
   SET lifecycle_stage = CASE
       WHEN status = 'draft' THEN 'draft'
       WHEN status = 'active' THEN 'active'
       ELSE 'active'
   END;

   -- Set is_capitalized untuk asset yang sudah ada journal entry
   UPDATE fixed_assets
   SET is_capitalized = true
   WHERE id IN (
       SELECT DISTINCT reference_id
       FROM journal_entries
       WHERE reference_type = 'fixed_asset'
   );
   ```

3. **Rollback Plan**:

   ```sql
   -- Jika perlu rollback, drop kolom baru
   ALTER TABLE fixed_assets DROP COLUMN IF EXISTS serial_number;
   ALTER TABLE fixed_assets DROP COLUMN IF EXISTS barcode;
   -- ... (drop semua kolom baru)

   -- Drop tabel baru
   DROP TABLE IF EXISTS asset_attachments;
   DROP TABLE IF EXISTS asset_audit_logs;
   DROP TABLE IF EXISTS asset_assignment_history;
   ```

---

## Best Practices

### 1. Asset Code Generation

```go
// Format: AST-{YYYYMM}-{RUNNING_NUMBER}
// Contoh: AST-202603-00001
func GenerateAssetCode() string {
    prefix := fmt.Sprintf("AST-%s", time.Now().Format("200601"))
    // Get last sequence number
    // Return formatted code
}
```

### 2. Audit Trail

- Selalu log perubahan nilai financial (acquisition_cost, book_value)
- Log assignment dan transfer
- Simpan IP address dan user agent untuk security

### 3. File Upload

- Validate file type (whitelist)
- Limit file size (max 10MB per file)
- Scan virus (future enhancement)
- Organize by asset_id dalam folder structure

### 4. Depreciation

- Asset config overrides category defaults
- Start date bisa berbeda dari acquisition_date
- Support partial period depreciation

---

## Security Considerations

1. **File Upload Security**:
   - Validate MIME type
   - Check file extension
   - Scan for malware
   - Store outside web root

2. **Audit Trail**:
   - Immutable logs
   - IP tracking
   - User agent tracking
   - Tamper detection

3. **Permission Control**:
   - `asset.read` - View assets
   - `asset.create` - Create assets
   - `asset.update` - Update assets
   - `asset.delete` - Delete assets
   - `asset.approve` - Approve assets
   - `asset.assign` - Assign assets
   - `asset.export` - Export data

---

## Performance Optimization

### Database

- Indexes pada field yang sering di-query
- Partitioning untuk audit_logs (by date)
- Archive old audit logs

### API

- Pagination untuk list endpoints
- Select specific fields (field projection)
- Caching untuk frequently accessed data

### Frontend

- Virtualized lists untuk large datasets
- Lazy loading untuk attachments
- Debounced search

---

## Future Enhancements

### Phase 6 (Post-MVP)

- [ ] Asset maintenance scheduling
- [ ] Multi-book accounting (Financial vs Tax)
- [ ] CIP (Construction in Progress) management
- [ ] Asset impairment testing
- [ ] Integration dengan barcode/RFID scanner
- [ ] Mobile app untuk asset tracking
- [ ] AI-powered asset predictions

---

## Troubleshooting

### Common Issues

**Issue**: Migration failed

```
Solution: Check log untuk error detail
- Pastikan tidak ada constraint violation
- Check foreign key references
```

**Issue**: File upload failed

```
Solution:
- Check file size limit
- Validate file type
- Check disk space
```

**Issue**: Depreciation calculation wrong

```
Solution:
- Check depreciation method
- Verify useful life
- Check start date
```

---

## Support & Contact

For technical support or questions:

- Documentation: `/docs/features/finance/`
- API Reference: `/docs/api-standart/`
- Team: GIMS Development Team

---

**Document Version**: 2.1  
**Last Updated**: March 20, 2026  
**Next Review**: After Phase 3 completion
