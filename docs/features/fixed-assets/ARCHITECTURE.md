# Enterprise Fixed Asset Management Module - Architecture Document

**Generated:** May 9, 2026  
**Version:** 1.0  
**Status:** Production-Ready Design

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Database Design](#database-design)
4. [Business Logic](#business-logic)
5. [API Specification](#api-specification)
6. [Frontend Architecture](#frontend-architecture)
7. [Depreciation Engine](#depreciation-engine)
8. [Validation Rules](#validation-rules)
9. [Error Handling](#error-handling)
10. [Future Extensibility](#future-extensibility)

---

## Overview

The Fixed Asset Management module is a comprehensive system for tracking, managing, and reporting on fixed assets throughout their lifecycle. It supports:

- **Asset Lifecycle Management**: Creation, activation, maintenance, transfer, disposal
- **Depreciation Tracking**: Multiple depreciation methods with automatic schedule generation
- **Financial Reporting**: Ready-to-use data for financial statements
- **Audit Trail**: Complete history of all asset movements and changes
- **Multi-Department Support**: Asset ownership across organizational units
- **Enterprise Integration**: Accounting, HR, and procurement system integration points

### Key Features
- Automatic depreciation calculation using 5 methods
- Real-time book value tracking
- Asset status management with workflow support
- Comprehensive audit logging
- Attachment management (invoices, photos, documents)
- Depreciation schedule preview before activation
- Asset transfer between departments/custodians
- Bulk operations support

---

## System Architecture

### Layered Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend (Next.js)                     │
│   (UI Components, Forms, Pages, API Client)              │
├─────────────────────────────────────────────────────────┤
│                  REST API Layer (Gin)                    │
│   (HTTP Handlers, Request/Response Mapping)              │
├─────────────────────────────────────────────────────────┤
│                 Service/Usecase Layer                    │
│   (Business Logic, Transactions, Workflows)              │
├─────────────────────────────────────────────────────────┤
│              Repository/Data Access Layer                │
│   (GORM Models, Queries, Transactions)                   │
├─────────────────────────────────────────────────────────┤
│                Database (PostgreSQL)                     │
│   (Tables, Indexes, Constraints, Triggers)               │
└─────────────────────────────────────────────────────────┘
```

### Module Structure

```
Fixed Asset Management
├── Backend (Golang)
│   ├── Models (GORM entities)
│   ├── DTOs (Request/Response)
│   ├── Repositories (Data access)
│   ├── Services (Business logic)
│   │   ├── Asset Service
│   │   ├── Depreciation Engine
│   │   ├── Asset Transfer Service
│   │   └── Asset Disposal Service
│   ├── Handlers (API endpoints)
│   ├── Migrations (Database)
│   └── Validators (Input validation)
│
├── Frontend (Next.js)
│   ├── Pages/Routes
│   │   ├── Dashboard
│   │   ├── Create Asset (Stepper)
│   │   ├── Edit Asset
│   │   ├── View Asset Details
│   │   └── Asset List
│   ├── Components
│   │   ├── Stepper
│   │   ├── Forms
│   │   ├── Tables
│   │   ├── Previews
│   │   └── Modals
│   ├── Hooks (Custom React hooks)
│   ├── Services (API client)
│   ├── Types (TypeScript interfaces)
│   └── Schemas (Zod validation)
│
└── Database (PostgreSQL)
    ├── Core Tables
    ├── Support Tables
    ├── Audit Tables
    └── Indexes
```

---

## Database Design

### Asset Type Classification

```
Asset Type          | Depreciation | Amortization | Special Rules
─────────────────────────────────────────────────────────────────
Tangible Fixed      | ✓            | ✗            | Standard depreciation
Intangible Asset    | ✗            | ✓            | Amortization instead
Non-Depreciable     | ✗            | ✗            | Only tracking
Construction In     | ✗ (pending)  | ✗ (pending)  | Activate when complete
```

### Core Tables

#### `assets`
The main asset table tracking all asset information.

```sql
CREATE TABLE assets (
  -- Identification
  id UUID PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  
  -- Asset Classification
  asset_type VARCHAR(50) NOT NULL, -- 'TANGIBLE', 'INTANGIBLE', 'NON_DEPRECIABLE', 'CONSTRUCTION'
  category_id UUID NOT NULL,
  location_id UUID NOT NULL,
  department_id UUID,
  custodian_user_id UUID,
  
  -- Identity Information
  serial_number VARCHAR(100) UNIQUE,
  asset_tag VARCHAR(50),
  barcode_or_qr VARCHAR(200),
  
  -- Financial Information
  acquisition_date DATE NOT NULL,
  acquisition_cost NUMERIC(18,2) NOT NULL,
  salvage_value NUMERIC(18,2) DEFAULT 0,
  currency_code VARCHAR(3) DEFAULT 'IDR',
  exchange_rate NUMERIC(18,6) DEFAULT 1.00,
  
  -- Depreciation Configuration
  depreciation_method VARCHAR(20), -- 'SL', 'DB', 'SYD', 'UOP', 'NONE'
  useful_life_months INTEGER,
  depreciation_start_date DATE,
  accumulated_depreciation NUMERIC(18,2) DEFAULT 0,
  book_value NUMERIC(18,2),
  
  -- Supplier/Procurement
  supplier_id UUID,
  supplier_name VARCHAR(200),
  purchase_order_number VARCHAR(100),
  invoice_number VARCHAR(100),
  invoice_date DATE,
  
  -- Status Management
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'active', 'under_maintenance', 'in_repair', 'disposed', 'sold', 'retired'
  is_active BOOLEAN DEFAULT false,
  activation_date TIMESTAMP,
  disposal_date TIMESTAMP,
  
  -- Warranty & Insurance
  warranty_start_date DATE,
  warranty_end_date DATE,
  insurance_policy_number VARCHAR(100),
  insurance_value NUMERIC(18,2),
  
  -- Additional Info
  notes TEXT,
  cost_center_code VARCHAR(50),
  fixed_asset_account_code VARCHAR(50),
  
  -- Audit Fields
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID,
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP, -- Soft delete
  
  FOREIGN KEY (category_id) REFERENCES asset_categories(id),
  FOREIGN KEY (location_id) REFERENCES asset_locations(id),
  FOREIGN KEY (department_id) REFERENCES departments(id),
  FOREIGN KEY (custodian_user_id) REFERENCES users(id),
  FOREIGN KEY (supplier_id) REFERENCES contacts(id),
  
  INDEX idx_code (code),
  INDEX idx_status (status),
  INDEX idx_category (category_id),
  INDEX idx_location (location_id),
  INDEX idx_department (department_id),
  INDEX idx_created_at (created_at)
);
```

#### `asset_categories`
Asset classification and default depreciation settings.

```sql
CREATE TABLE asset_categories (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  
  -- Default Depreciation Settings
  default_useful_life_months INTEGER,
  default_depreciation_method VARCHAR(20),
  default_salvage_value_percent NUMERIC(5,2),
  
  -- Accounting
  fixed_asset_account_code VARCHAR(50),
  depreciation_account_code VARCHAR(50),
  expense_account_code VARCHAR(50),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_name (name)
);
```

#### `asset_locations`
Physical locations where assets are stored.

```sql
CREATE TABLE asset_locations (
  id UUID PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_code (code),
  INDEX idx_name (name)
);
```

#### `asset_depreciation_schedules`
Monthly depreciation schedule for each asset.

```sql
CREATE TABLE asset_depreciation_schedules (
  id UUID PRIMARY KEY,
  asset_id UUID NOT NULL,
  
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  period_month INTEGER NOT NULL, -- 1-based month number
  
  depreciation_amount NUMERIC(18,2) NOT NULL,
  accumulated_depreciation NUMERIC(18,2) NOT NULL,
  book_value NUMERIC(18,2) NOT NULL,
  
  -- Accounting Integration
  journal_entry_id UUID,
  is_posted BOOLEAN DEFAULT false,
  posted_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  INDEX idx_asset (asset_id),
  INDEX idx_period (period_start_date),
  UNIQUE(asset_id, period_month)
);
```

#### `asset_disposals`
Track asset disposal transactions.

```sql
CREATE TABLE asset_disposals (
  id UUID PRIMARY KEY,
  asset_id UUID NOT NULL,
  
  disposal_type VARCHAR(50), -- 'SOLD', 'SCRAPPED', 'DONATED', 'TRANSFERRED', 'OTHER'
  disposal_date DATE NOT NULL,
  
  -- Financial Details
  disposal_value NUMERIC(18,2),
  accumulated_depreciation_at_disposal NUMERIC(18,2),
  gain_or_loss NUMERIC(18,2),
  
  -- Transaction Details
  reference_type VARCHAR(50),
  reference_number VARCHAR(100),
  description TEXT,
  
  -- Audit
  approved_by UUID,
  approved_at TIMESTAMP,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (asset_id) REFERENCES assets(id),
  INDEX idx_asset (asset_id),
  INDEX idx_disposal_date (disposal_date)
);
```

#### `asset_attachments`
Manage asset-related files and documents.

```sql
CREATE TABLE asset_attachments (
  id UUID PRIMARY KEY,
  asset_id UUID NOT NULL,
  
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50),
  file_size INTEGER,
  file_path VARCHAR(500) NOT NULL,
  
  attachment_type VARCHAR(50), -- 'INVOICE', 'RECEIPT', 'PHOTO', 'WARRANTY', 'MANUAL', 'OTHER'
  
  uploaded_by UUID,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  INDEX idx_asset (asset_id),
  INDEX idx_type (attachment_type)
);
```

#### `asset_audit_logs`
Complete audit trail for all asset operations.

```sql
CREATE TABLE asset_audit_logs (
  id UUID PRIMARY KEY,
  asset_id UUID NOT NULL,
  
  action VARCHAR(50), -- 'CREATED', 'UPDATED', 'ACTIVATED', 'DISPOSED', 'TRANSFERRED'
  field_name VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  
  changed_by UUID NOT NULL,
  changed_at TIMESTAMP DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  FOREIGN KEY (asset_id) REFERENCES assets(id),
  INDEX idx_asset (asset_id),
  INDEX idx_action (action),
  INDEX idx_changed_at (changed_at)
);
```

#### `asset_transfers`
Track asset transfers between departments/locations.

```sql
CREATE TABLE asset_transfers (
  id UUID PRIMARY KEY,
  asset_id UUID NOT NULL,
  
  from_location_id UUID,
  to_location_id UUID,
  from_department_id UUID,
  to_department_id UUID,
  from_custodian_id UUID,
  to_custodian_id UUID,
  
  transfer_date DATE NOT NULL,
  reason TEXT,
  
  status VARCHAR(50), -- 'PENDING', 'COMPLETED', 'REJECTED'
  approved_by UUID,
  approved_at TIMESTAMP,
  
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (asset_id) REFERENCES assets(id),
  INDEX idx_asset (asset_id),
  INDEX idx_status (status)
);
```

#### `asset_maintenance_logs`
Track maintenance and repair activities.

```sql
CREATE TABLE asset_maintenance_logs (
  id UUID PRIMARY KEY,
  asset_id UUID NOT NULL,
  
  maintenance_type VARCHAR(50), -- 'PREVENTIVE', 'CORRECTIVE', 'EMERGENCY'
  maintenance_date DATE NOT NULL,
  
  description TEXT,
  cost NUMERIC(18,2),
  
  service_provider VARCHAR(200),
  parts_replaced TEXT,
  
  duration_hours DECIMAL(10,2),
  next_maintenance_date DATE,
  
  recorded_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  INDEX idx_asset (asset_id),
  INDEX idx_maintenance_date (maintenance_date)
);
```

---

## Business Logic

### Asset Type Rules

#### Tangible Fixed Assets
- **Usage**: Physical assets (buildings, vehicles, equipment, furniture)
- **Depreciation**: Supported with all 5 methods
- **Amortization**: Not applicable
- **Rules**:
  - Can be depreciated
  - Can have salvage value
  - Can be transferred between locations
  - Can be disposed

#### Intangible Assets
- **Usage**: Patents, copyrights, licenses, software
- **Depreciation**: Not applicable
- **Amortization**: Supported (systematic cost allocation over useful life)
- **Rules**:
  - Cannot use depreciation methods
  - Uses amortization period instead
  - Cannot have physical location
  - Cannot be transferred

#### Non-Depreciable Assets
- **Usage**: Land, artwork, collectibles, heritage items
- **Depreciation**: Not applicable
- **Amortization**: Not applicable
- **Rules**:
  - Only tracking, no cost allocation
  - No depreciation schedule
  - Can have useful life for informational purposes only
  - Must be manually disposed

#### Construction In Progress
- **Usage**: Assets under construction or development
- **Depreciation**: Not applicable (until activated)
- **Rules**:
  - Cannot start depreciation until activated
  - Can track capitalized costs
  - Must be "completed" and "activated" to convert to Tangible Asset
  - Can accumulate costs over time

### Asset Status Workflow

```
Draft → Active ↔ Under Maintenance → Disposed/Sold/Retired
         ↓ In Repair
         └────────────────────────────────────┘
```

**Status Transitions**:
- `Draft` → `Active`: Requires activation approval
- `Active` → `Under Maintenance`: Automatic on maintenance start
- `Under Maintenance` → `Active`: Automatic on maintenance complete
- `Active` → `In Repair`: Manual status change
- `In Repair` → `Active`: Manual status change
- `Active` → `Disposed`: Final disposal transaction
- `Active` → `Sold`: Sale transaction
- `Active` → `Retired`: Retirement transaction

### Depreciation Calculation

#### Straight-Line (SL)
Monthly Depreciation = (Acquisition Cost - Salvage Value) / Useful Life (months)

#### Declining Balance (DB)
- Rate = 1 / Useful Life (months)
- Monthly Depreciation = Book Value at start of month × Rate

#### Sum of Years Digits (SYD)
- Sum = n × (n + 1) / 2, where n = useful life in months
- Year remaining = remaining months
- Monthly Depreciation = (Remaining months / Sum) × (Cost - Salvage Value)

#### Units of Production (UOP)
Monthly Depreciation = (Cost - Salvage Value) / Total Units × Units Produced This Month

#### None
Monthly Depreciation = 0

---

## API Specification

### Base URL
```
/api/v1/finance/assets
```

### Authentication
- All endpoints require JWT token in `Authorization: Bearer <token>` header
- User must have `finance:asset:read` or `finance:asset:write` permission

### Common Response Format

#### Success Response
```json
{
  "success": true,
  "data": { /* endpoint-specific data */ },
  "meta": { /* pagination info if applicable */ }
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": { /* validation errors if applicable */ }
  }
}
```

### Endpoints

#### Create Asset
```
POST /api/v1/finance/assets
Content-Type: application/json

Request Body:
{
  "code": "ASSET-001", // optional, auto-generated if not provided
  "name": "Laptop Dell",
  "asset_type": "TANGIBLE",
  "category_id": "uuid",
  "location_id": "uuid",
  "department_id": "uuid",
  "custodian_user_id": "uuid",
  "serial_number": "SN123456",
  "acquisition_date": "2024-01-15",
  "acquisition_cost": 10000000,
  "salvage_value": 1000000,
  "depreciation_method": "SL",
  "useful_life_months": 60,
  "supplier_name": "PT ABC",
  "invoice_number": "INV-001",
  "currency_code": "IDR"
}

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "code": "ASSET-001",
    "status": "draft",
    ...
  }
}
```

#### Get Asset Detail
```
GET /api/v1/finance/assets/:id
Response: Asset object with all details
```

#### Update Asset
```
PATCH /api/v1/finance/assets/:id
Content-Type: application/json

Restrictions:
- Cannot update if status is "disposed", "sold", "retired"
- Cannot change asset_type if already active
- Changing depreciation fields requires recalculation
```

#### Activate Asset
```
POST /api/v1/finance/assets/:id/activate
Content-Type: application/json

Request Body:
{
  "activation_date": "2024-01-20"
}

Response:
- Generates depreciation schedule
- Sets status to "active"
- Records audit log
```

#### Generate Depreciation Schedule
```
POST /api/v1/finance/assets/:id/depreciation-schedule
Content-Type: application/json

Request Body:
{
  "start_date": "2024-01-15",
  "end_date": "2029-01-15"
}

Response:
{
  "success": true,
  "data": {
    "schedules": [
      {
        "period": "2024-01",
        "depreciation_amount": 150000,
        "accumulated_depreciation": 150000,
        "book_value": 9850000
      },
      ...
    ],
    "total_depreciation": 9000000,
    "total_book_value": 1000000
  }
}
```

#### List Assets
```
GET /api/v1/finance/assets?page=1&per_page=20&status=active&category_id=uuid

Query Parameters:
- page: int (default: 1)
- per_page: int (default: 20)
- status: string (filter by status)
- category_id: uuid
- location_id: uuid
- department_id: uuid
- search: string (search name, code, serial number)
- sort_by: string (default: created_at)
- order: asc|desc

Response:
{
  "success": true,
  "data": [ {...}, {...} ],
  "meta": {
    "pagination": {
      "page": 1,
      "per_page": 20,
      "total": 150
    }
  }
}
```

#### Dispose Asset
```
POST /api/v1/finance/assets/:id/dispose
Content-Type: application/json

Request Body:
{
  "disposal_type": "SOLD",
  "disposal_date": "2029-01-15",
  "disposal_value": 1500000,
  "reference_number": "INV-2029-001"
}

Response:
- Records disposal transaction
- Updates asset status to "disposed"
- Calculates gain/loss
- Records audit log
```

#### Transfer Asset
```
POST /api/v1/finance/assets/:id/transfer
Content-Type: application/json

Request Body:
{
  "to_location_id": "uuid",
  "to_department_id": "uuid",
  "to_custodian_id": "uuid",
  "transfer_date": "2024-02-01",
  "reason": "Department reorganization"
}

Response:
- Creates transfer record
- Updates asset location/department/custodian
- Records audit log
```

#### Upload Attachment
```
POST /api/v1/finance/assets/:id/attachments
Content-Type: multipart/form-data

Form Data:
- file: File
- attachment_type: INVOICE|RECEIPT|PHOTO|WARRANTY|MANUAL|OTHER

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "file_name": "invoice.pdf",
    "file_path": "/uploads/assets/...",
    "attachment_type": "INVOICE"
  }
}
```

#### Get Depreciation Schedule
```
GET /api/v1/finance/assets/:id/depreciation-schedule?start_date=2024-01-01&end_date=2029-01-01

Response:
{
  "success": true,
  "data": {
    "asset": {...},
    "schedules": [...]
  }
}
```

---

## Frontend Architecture

### Page Structure (Next.js App Router)

```
app/
├── dashboard/
│   ├── assets/
│   │   ├── page.tsx                    # Asset list page
│   │   ├── [id]/
│   │   │   ├── page.tsx                # Asset detail page
│   │   │   └── edit/page.tsx           # Asset edit page
│   │   ├── create/
│   │   │   ├── page.tsx                # Asset create with stepper
│   │   │   ├── layout.tsx
│   │   │   └── components/
│   │   │       ├── stepper.tsx
│   │   │       ├── step-1-basic.tsx
│   │   │       ├── step-2-classification.tsx
│   │   │       ├── step-3-financial.tsx
│   │   │       ├── step-4-procurement.tsx
│   │   │       ├── step-5-review.tsx
│   │   │       └── depreciation-preview.tsx
│   │   └── components/
│   │       ├── asset-form.tsx
│   │       ├── asset-table.tsx
│   │       ├── asset-detail-card.tsx
│   │       ├── depreciation-table.tsx
│   │       └── modals/
│   │           ├── dispose-modal.tsx
│   │           ├── transfer-modal.tsx
│   │           └── maintenance-modal.tsx
│   │
│   └── reports/
│       ├── depreciation/page.tsx
│       ├── asset-register/page.tsx
│       └── disposal-summary/page.tsx
```

### Component Hierarchy

```
AssetCreateStepper
├── StepperHeader
├── StepperContent
│   ├── Step1BasicInfo
│   │   ├── AssetCodeInput
│   │   ├── AssetNameInput
│   │   ├── SerialNumberInput
│   │   ├── AssetTagInput
│   │   ├── BarcodeQRInput
│   │   └── NotesInput
│   │
│   ├── Step2Classification
│   │   ├── AssetTypeSelect
│   │   ├── CategorySelect
│   │   ├── LocationSelect
│   │   ├── DepartmentSelect
│   │   └── CustodianSelect
│   │
│   ├── Step3Financial
│   │   ├── AcquisitionDateInput
│   │   ├── AcquisitionCostInput
│   │   ├── SalvageValueInput
│   │   ├── DepreciationMethodSelect
│   │   ├── UsefulLifeInput
│   │   ├── CurrencySelect
│   │   └── DepreciationPreview
│   │
│   ├── Step4Procurement
│   │   ├── SupplierSelect
│   │   ├── InvoiceNumberInput
│   │   ├── PurchaseOrderInput
│   │   ├── InvoiceDateInput
│   │   └── InvoiceUpload
│   │
│   └── Step5Review
│       ├── AssetSummary
│       ├── DepreciationTable
│       ├── AttachmentPreview
│       └── SubmitButton
│
└── StepperFooter
    ├── BackButton
    ├── NextButton
    └── SaveDraftButton
```

### State Management (TanStack Query)

```typescript
// Queries
- useGetAssets() - Fetch asset list
- useGetAssetDetail(id) - Fetch single asset
- useGetAssetDepreciationSchedule(id) - Fetch depreciation schedule
- useGetCategories() - Fetch asset categories
- useGetLocations() - Fetch locations
- useGetDepartments() - Fetch departments
- useGetUsers() - Fetch custodians

// Mutations
- useCreateAsset() - Create new asset
- useUpdateAsset() - Update asset
- useActivateAsset() - Activate asset
- useDisposeAsset() - Dispose asset
- useTransferAsset() - Transfer asset
- useUploadAssetAttachment() - Upload file
- useGenerateDepreciationSchedule() - Preview schedule
```

---

## Depreciation Engine

### Core Depreciation Service (Go)

```go
type DepreciationEngine struct {
  method              DepreciationMethod
  acquisitionCost     float64
  salvageValue        float64
  usefulLifeMonths    int
  acquisitionDate     time.Time
}

type DepreciationResult struct {
  MonthlyAmount       float64
  YearlyAmount        float64
  Schedules          []MonthlySchedule
}

type MonthlySchedule struct {
  Period                    string
  DepreciationAmount       float64
  AccumulatedDepreciation  float64
  BookValue               float64
}
```

### Calculation Logic

Each depreciation method must:
1. Validate inputs (useful life > 0, acquisition cost > salvage value)
2. Calculate monthly depreciation
3. Generate schedule for full useful life
4. Account for residual value
5. Handle partial months
6. Support mid-year acquisition

---

## Validation Rules

### Basic Information Validation
- ✓ Asset code must be unique (if provided)
- ✓ Asset name required, max 200 characters
- ✓ Serial number unique if provided
- ✓ Asset tag max 50 characters

### Financial Validation
- ✓ Acquisition cost > 0
- ✓ Salvage value ≥ 0 and ≤ acquisition cost
- ✓ Acquisition date cannot be in future
- ✓ Useful life > 0 if depreciable
- ✓ Depreciation start date ≥ acquisition date

### Status Validation
- ✓ Cannot update disposed/sold/retired assets
- ✓ Cannot change asset type if active
- ✓ Cannot activate if required fields missing
- ✓ Can only dispose active assets

---

## Error Handling

### Standard Error Codes
- `ASSET_NOT_FOUND` - Asset doesn't exist
- `ASSET_ALREADY_EXISTS` - Code already used
- `INVALID_STATUS_TRANSITION` - Cannot transition between statuses
- `ASSET_IMMUTABLE` - Cannot modify disposed asset
- `DEPRECIATION_GENERATION_FAILED` - Schedule generation error
- `INVALID_INPUT` - Validation failed
- `UNAUTHORIZED` - User lacks permission
- `INTERNAL_ERROR` - Server error

---

## Future Extensibility

### Planned Features
1. **Accounting Integration**
   - Auto-generate GL entries for depreciation
   - Asset revaluation support
   - Impairment testing

2. **Approval Workflow**
   - Multi-step approval for asset creation
   - Disposal approval
   - Transfer approval

3. **Asset Tagging**
   - QR code generation and scanning
   - RFID support
   - Barcode tracking

4. **Asset Stock Opname**
   - Physical count operations
   - Variance tracking
   - Reconciliation

5. **Multi-Company Support**
   - Cross-company asset transfers
   - Consolidated reporting
   - Currency conversion

6. **Mobile App**
   - Asset lookup via QR code
   - Condition reporting
   - Photo documentation

---

## Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 16+ | Server-side rendering, routing |
| UI Framework | shadcn/ui | Pre-built components |
| Styling | Tailwind CSS | Utility-first CSS |
| Form Handling | React Hook Form | Efficient form state |
| Validation | Zod | Schema validation |
| State Mgmt | TanStack Query | Server state management |
| HTTP Client | Axios | API communication |
| Backend | Go 1.25+ | High-performance server |
| Web Framework | Gin | Fast HTTP routing |
| ORM | GORM | Database abstraction |
| Database | PostgreSQL 14+ | Relational database |
| Auth | JWT | Token-based authentication |
| Logging | Zap | Structured logging |

---

## Conclusion

This architecture provides an enterprise-grade foundation for fixed asset management. It emphasizes:

- **Clean Architecture**: Separation of concerns across layers
- **Scalability**: Support for thousands of assets and transactions
- **Auditability**: Complete audit trail for compliance
- **Extensibility**: Design for future features and integrations
- **User Experience**: Modern, intuitive interface with real-time feedback
- **Data Integrity**: Comprehensive validation and transaction support

The module is production-ready and can be deployed immediately while maintaining the flexibility for enhancements and integrations with other ERP modules.
