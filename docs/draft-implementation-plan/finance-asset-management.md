# Finance Asset Management Module

## Table of Contents
1. [Overview](#overview)
2. [Features](#features)
3. [System Architecture](#system-architecture)
4. [Data Models](#data-models)
5. [Business Logic](#business-logic)
6. [API Reference](#api-reference)
7. [Frontend Components](#frontend-components)
8. [User Flows](#user-flows)
9. [Permissions](#permissions)
10. [Configuration](#configuration)
11. [Integration Points](#integration-points)
12. [Summary](#summary)

## Overview

The **Finance Asset Management Module** is a comprehensive Fixed Asset Management system designed for tracking, managing, and depreciating company assets throughout their lifecycle. This module provides complete visibility and control over asset categories, locations, depreciation schedules, and transactions.

### Purpose
- Centralized asset registry with detailed tracking
- Multi-method depreciation calculation
- Asset transaction management (acquisition, transfer, disposal, revaluation)
- Location-based asset tracking with geographic coordinates
- Integration with financial journal entries

### Key Capabilities
- Full CRUD operations for assets, categories, locations, depreciations, and transactions
- Multiple depreciation methods (Straight-Line, Declining Balance, None)
- Approval workflow for depreciations and transactions
- Server-side filtering, searching, and pagination
- Statistical dashboards with financial summaries
- Geographic location tracking with latitude/longitude

### Target Users
- **Finance Department**: Asset lifecycle management, depreciation tracking, financial reporting
- **Accounting Team**: Journal entry integration, asset valuation
- **Operations**: Location tracking, asset transfers
- **Management**: Asset portfolio overview and decision support

## Features

### Core Features

#### 1. Asset List Management
- **Create**: Register new assets with category, location, and acquisition details
- **Read**: View all assets with pagination, filtering, and searching
- **Update**: Modify asset details including status changes
- **Delete**: Remove assets (with validation for dependencies)
- **Status Tracking**: ACTIVE, INACTIVE, SOLD, DISPOSED

#### 2. Asset Category Management
- Define asset types (FIXED, CURRENT, INTANGIBLE, OTHER)
- Configure depreciation methods per category
- Set useful life and depreciation rates
- Track asset counts per category

#### 3. Asset Location Management
- Geographic location tracking with city/province hierarchy
- Latitude/longitude coordinates for mapping
- Asset count per location
- Address management

#### 4. Asset Depreciation
- Period-based depreciation scheduling
- Multiple calculation methods
- Accumulated depreciation tracking
- Book value calculation
- Approval workflow (PENDING → APPROVED)
- Journal entry integration

#### 5. Asset Transaction Management
- Transaction types:
  - **ACQUISITION**: New asset purchase
  - **TRANSFER**: Location/ownership transfer
  - **DISPOSAL**: Asset retirement
  - **REVALUATION**: Value adjustment
  - **ADJUSTMENT**: Correction entries
- Approval workflow (DRAFT → APPROVED)
- Transaction amount tracking

### Asset Statuses

| Status | Description |
|--------|-------------|
| ACTIVE | Asset is currently in use |
| INACTIVE | Asset is temporarily not in use |
| SOLD | Asset has been sold |
| DISPOSED | Asset has been disposed/retired |

### Asset Category Types

| Type | Description |
|------|-------------|
| FIXED | Tangible long-term assets (buildings, machinery) |
| CURRENT | Short-term assets (inventory, cash equivalents) |
| INTANGIBLE | Non-physical assets (patents, trademarks) |
| OTHER | Miscellaneous assets |

### Depreciation Methods

| Method | Description |
|--------|-------------|
| STRAIGHT_LINE | Equal depreciation over useful life |
| DECLINING | Higher depreciation in early years |
| NONE | Non-depreciable assets |

### Transaction Types

| Type | Description |
|------|-------------|
| ACQUISITION | Initial purchase of asset |
| TRANSFER | Moving asset between locations |
| DISPOSAL | Retiring/selling asset |
| REVALUATION | Adjusting asset value |
| ADJUSTMENT | Correction or modification |

### Approval Statuses

| Module | Statuses |
|--------|----------|
| Depreciation | PENDING, APPROVED |
| Transaction | DRAFT, APPROVED |

### Additional Features

#### Date Range Filtering
- Start date and end date filters
- Single day filtering
- Dynamic date range selection

#### Search and Sort
- Search by asset code, name, description
- Sort by various fields (date, amount, status)
- Pagination with configurable limits

#### Statistics Dashboard
- Total counts by status, type, location
- Financial summaries (acquisition cost, current value, depreciation)
- Top categories and locations

## System Architecture

### Backend Architecture

```
erp-api/internal/finance/
├── data/
│   ├── models/
│   │   ├── asset.go                    # Asset entity
│   │   ├── asset_category.go           # Asset category entity
│   │   ├── asset_location.go           # Asset location entity
│   │   ├── asset_depreciation.go       # Asset depreciation entity
│   │   └── asset_transaction.go        # Asset transaction entity
│   ├── repositories/
│   │   ├── asset_repository.go
│   │   ├── asset_category_repository.go
│   │   ├── asset_location_repository.go
│   │   ├── asset_depreciation_repository.go
│   │   └── asset_transaction_repository.go
│   └── seeders/
│       ├── assets_seeder.go
│       ├── asset_categories_seeder.go
│       ├── asset_locations_seeder.go
│       ├── asset_depreciations_seeder.go
│       └── asset_transations_seeder.go
├── domain/
│   ├── dto/
│   │   ├── asset_dto.go
│   │   ├── asset_category_dto.go
│   │   ├── asset_location_dto.go
│   │   ├── asset_depreciation_dto.go
│   │   └── asset_transaction_dto.go
│   └── usecase/
│       ├── asset_usecase.go
│       ├── asset_category_usecase.go
│       ├── asset_location_usecase.go
│       ├── asset_depreciation_usecase.go
│       └── asset_transaction_usecase.go
└── presentation/
    ├── handler/
    │   ├── asset_handler.go
    │   ├── asset_category_handler.go
    │   ├── asset_location_handler.go
    │   ├── asset_depreciation_handler.go
    │   └── asset_transaction_handler.go
    └── router/
        ├── asset_routers.go
        ├── asset_category_routers.go
        ├── asset_location_routers.go
        ├── asset_depreciation_routers.go
        └── asset_transaction_routers.go
```

### Frontend Architecture

```
erp-front-end/src/features/finance/asset-management/
├── asset-list/
│   ├── components/
│   │   ├── asset-list-page.tsx
│   │   ├── asset-list-table.tsx
│   │   ├── asset-list-header.tsx
│   │   ├── asset-list-form.tsx
│   │   ├── asset-list-detail-modal.tsx
│   │   └── asset-list-delete-dialog.tsx
│   ├── stores/
│   │   ├── asset-list-store.ts
│   │   ├── asset-list-actions.ts
│   │   ├── use-asset-list-store.ts
│   │   ├── use-asset-list-data.ts
│   │   ├── use-asset-list-modals.ts
│   │   └── use-asset-list-page-data.ts
│   ├── services/
│   │   ├── asset-list-service.ts
│   │   ├── stats-service.ts
│   │   └── index.ts
│   ├── hooks/
│   │   ├── use-asset-list-filters.ts
│   │   └── index.ts
│   ├── types/
│   │   └── index.ts
│   ├── configs/
│   │   ├── search-config.ts
│   │   └── index.ts
│   └── index.ts
├── asset-category/
│   ├── components/
│   │   ├── asset-category-page.tsx
│   │   ├── asset-category-table.tsx
│   │   ├── asset-category-form.tsx
│   │   └── ...
│   ├── stores/
│   ├── services/
│   ├── hooks/
│   ├── types/
│   └── configs/
├── asset-location/
│   ├── components/
│   ├── stores/
│   ├── services/
│   ├── hooks/
│   ├── types/
│   └── configs/
├── asset-depreciation/
│   ├── components/
│   │   ├── asset-depreciation-approve-dialog.tsx
│   │   └── ...
│   ├── stores/
│   ├── services/
│   ├── hooks/
│   ├── types/
│   └── configs/
└── asset-transaction/
    ├── components/
    │   ├── asset-transaction-approve-dialog.tsx
    │   └── ...
    ├── stores/
    ├── services/
    ├── hooks/
    ├── types/
    └── configs/
```

### Architecture Patterns

#### Clean Architecture (Backend)
- **Domain Layer**: Business logic, DTOs, and use cases
- **Data Layer**: Repositories, models, and database access
- **Presentation Layer**: HTTP handlers and routing
- **Dependency Rule**: Dependencies point inward

#### Feature-Based Architecture (Frontend)
- Self-contained sub-features (list, category, location, etc.)
- Co-located components, types, services, and stores
- Modular store pattern with optimized selectors
- Reusable across the application

## Data Models

### 1. Asset

**File**: `erp-api/internal/finance/data/models/asset.go`

```go
type AssetStatus string

const (
    AssetStatusActive   AssetStatus = "ACTIVE"
    AssetStatusInactive AssetStatus = "INACTIVE"
    AssetStatusSold     AssetStatus = "SOLD"
    AssetStatusDisposed AssetStatus = "DISPOSED"
)

type Asset struct {
    gorm.Model
    AssetCategoryID         uint        `gorm:"not null"`
    AssetLocationID         uint        `gorm:"not null"`
    Code                    string      `gorm:"type:varchar(50);unique;not null"`
    Name                    string      `gorm:"type:varchar(100);not null"`
    AcquisitionDate         time.Time   `gorm:"type:date;not null"`
    AcquisitionCost         float64     `gorm:"type:decimal(15,2);not null"`
    AccumulatedDepreciation float64     `gorm:"type:decimal(15,2);not null;default:0"`
    CurrentValue            float64     `gorm:"type:decimal(15,2);not null"`
    Status                  AssetStatus `gorm:"type:varchar(20);not null"`
    Description             *string     `gorm:"type:text"`

    // Relations
    AssetCategory      AssetCategory           `gorm:"foreignKey:AssetCategoryID"`
    AssetLocation      AssetLocation           `gorm:"foreignKey:AssetLocationID"`
    AssetDepreciations []AssetDepreciation     `gorm:"foreignKey:AssetID"`
    AssetTransactions  []AssetTransaction      `gorm:"foreignKey:AssetID"`
}
```

**Fields Description**:
| Field | Type | Description |
|-------|------|-------------|
| ID | uint | Primary key (auto-generated) |
| AssetCategoryID | uint | Foreign key to asset_categories |
| AssetLocationID | uint | Foreign key to asset_locations |
| Code | string | Unique asset code (auto-generated) |
| Name | string | Asset name/description |
| AcquisitionDate | date | Date of acquisition |
| AcquisitionCost | decimal | Original purchase cost |
| AccumulatedDepreciation | decimal | Total depreciation to date |
| CurrentValue | decimal | Current book value |
| Status | enum | Asset status (ACTIVE/INACTIVE/SOLD/DISPOSED) |
| Description | text | Additional notes |
| CreatedAt | datetime | Record creation timestamp |
| UpdatedAt | datetime | Record update timestamp |

### 2. AssetCategory

**File**: `erp-api/internal/finance/data/models/asset_category.go`

```go
type AssetCategoryType string

const (
    AssetCategoryCurrent    AssetCategoryType = "CURRENT"
    AssetCategoryFixed      AssetCategoryType = "FIXED"
    AssetCategoryIntangible AssetCategoryType = "INTANGIBLE"
    AssetCategoryOther      AssetCategoryType = "OTHER"
)

type DepreciationMethod string

const (
    DepreciationStraightLine DepreciationMethod = "STRAIGHT_LINE"
    DepreciationDeclining    DepreciationMethod = "DECLINING"
    DepreciationNone         DepreciationMethod = "NONE"
)

type AssetCategory struct {
    gorm.Model
    Name               string             `gorm:"type:varchar(100);not null"`
    Type               AssetCategoryType  `gorm:"type:varchar(20);not null"`
    DepreciationMethod DepreciationMethod `gorm:"type:varchar(20);not null"`
    DepreciationRate   float64            `gorm:"type:decimal(10,4);not null"`
    UsefulLife         int                `gorm:"not null"`
    IsDepreciable      bool               `gorm:"not null"`

    // Relations
    Assets []Asset `gorm:"foreignKey:AssetCategoryID"`
}
```

**Fields Description**:
| Field | Type | Description |
|-------|------|-------------|
| ID | uint | Primary key |
| Name | string | Category name |
| Type | enum | Category type (FIXED/CURRENT/INTANGIBLE/OTHER) |
| DepreciationMethod | enum | Depreciation method |
| DepreciationRate | decimal | Annual depreciation rate (%) |
| UsefulLife | int | Useful life in years |
| IsDepreciable | bool | Whether category is depreciable |
| CreatedAt | datetime | Record creation timestamp |
| UpdatedAt | datetime | Record update timestamp |

### 3. AssetLocation

**File**: `erp-api/internal/finance/data/models/asset_location.go`

```go
type AssetLocation struct {
    gorm.Model
    CityID    uint     `gorm:"not null"`
    Name      string   `gorm:"type:varchar(100);not null"`
    Address   string   `gorm:"type:text;not null"`
    Latitude  *float64 `gorm:"type:decimal(10,8)"`
    Longitude *float64 `gorm:"type:decimal(11,8)"`

    // Relations
    City   masterDataModels.City `gorm:"foreignKey:CityID"`
    Assets []Asset               `gorm:"foreignKey:AssetLocationID"`
}
```

**Fields Description**:
| Field | Type | Description |
|-------|------|-------------|
| ID | uint | Primary key |
| CityID | uint | Foreign key to cities table |
| Name | string | Location name |
| Address | text | Full address |
| Latitude | decimal | Geographic latitude (optional) |
| Longitude | decimal | Geographic longitude (optional) |
| CreatedAt | datetime | Record creation timestamp |
| UpdatedAt | datetime | Record update timestamp |

### 4. AssetDepreciation

**File**: `erp-api/internal/finance/data/models/asset_depreciation.go`

```go
type AssetDepreciationStatus string

const (
    AssetDepreciationStatusPending  AssetDepreciationStatus = "PENDING"
    AssetDepreciationStatusApproved AssetDepreciationStatus = "APPROVED"
)

type AssetDepreciation struct {
    gorm.Model
    AssetID                 uint                    `gorm:"not null"`
    Period                  time.Time               `gorm:"type:date;not null"`
    DepreciationAmount      float64                 `gorm:"type:decimal(15,2);not null"`
    AccumulatedDepreciation float64                 `gorm:"type:decimal(15,2);not null"`
    BookValue               *float64                `gorm:"type:decimal(15,2)"`
    JournalEntryID          *uint                   `gorm:"index"`
    Status                  AssetDepreciationStatus `gorm:"type:varchar(20);not null"`

    // Relations
    Asset        Asset         `gorm:"foreignKey:AssetID"`
    JournalEntry *JournalEntry `gorm:"foreignKey:JournalEntryID"`
}
```

**Fields Description**:
| Field | Type | Description |
|-------|------|-------------|
| ID | uint | Primary key |
| AssetID | uint | Foreign key to assets |
| Period | date | Depreciation period (month) |
| DepreciationAmount | decimal | Depreciation for this period |
| AccumulatedDepreciation | decimal | Total accumulated depreciation |
| BookValue | decimal | Book value after depreciation |
| JournalEntryID | uint | Optional link to journal entry |
| Status | enum | PENDING or APPROVED |
| CreatedAt | datetime | Record creation timestamp |
| UpdatedAt | datetime | Record update timestamp |

### 5. AssetTransaction

**File**: `erp-api/internal/finance/data/models/asset_transaction.go`

```go
type AssetTransactionType string

const (
    AssetTransactionAcquisition AssetTransactionType = "ACQUISITION"
    AssetTransactionTransfer    AssetTransactionType = "TRANSFER"
    AssetTransactionDisposal    AssetTransactionType = "DISPOSAL"
    AssetTransactionRevaluation AssetTransactionType = "REVALUATION"
    AssetTransactionAdjustment  AssetTransactionType = "ADJUSTMENT"
)

type AssetTransactionStatus string

const (
    AssetTransactionStatusDraft    AssetTransactionStatus = "DRAFT"
    AssetTransactionStatusApproved AssetTransactionStatus = "APPROVED"
)

type AssetTransaction struct {
    gorm.Model
    AssetID           uint                   `gorm:"not null"`
    TransactionType   AssetTransactionType   `gorm:"type:varchar(20);not null"`
    TransactionDate   time.Time              `gorm:"type:date;not null"`
    TransactionAmount float64                `gorm:"type:decimal(15,2);not null"`
    Description       *string                `gorm:"type:text"`
    Status            AssetTransactionStatus `gorm:"type:varchar(20);not null"`

    // Relations
    Asset Asset `gorm:"foreignKey:AssetID"`
}
```

**Fields Description**:
| Field | Type | Description |
|-------|------|-------------|
| ID | uint | Primary key |
| AssetID | uint | Foreign key to assets |
| TransactionType | enum | Type of transaction |
| TransactionDate | date | Date of transaction |
| TransactionAmount | decimal | Transaction amount |
| Description | text | Transaction notes |
| Status | enum | DRAFT or APPROVED |
| CreatedAt | datetime | Record creation timestamp |
| UpdatedAt | datetime | Record update timestamp |

### DTOs

#### AssetRequest
```go
type AssetRequest struct {
    AssetCategoryID         uint      `json:"asset_category_id" binding:"required"`
    AssetLocationID         uint      `json:"asset_location_id" binding:"required"`
    Name                    string    `json:"name" binding:"required"`
    AcquisitionDate         time.Time `json:"acquisition_date" binding:"required"`
    AcquisitionCost         float64   `json:"acquisition_cost" binding:"required,min=0"`
    AccumulatedDepreciation float64   `json:"accumulated_depreciation" binding:"min=0"`
    CurrentValue            float64   `json:"current_value" binding:"required,min=0"`
    Status                  string    `json:"status" binding:"required,oneof=ACTIVE INACTIVE SOLD DISPOSED"`
    Description             *string   `json:"description,omitempty"`
}
```

#### AssetResponse
```go
type AssetResponse struct {
    ID                      uint    `json:"id"`
    AssetCategoryID         uint    `json:"asset_category_id"`
    AssetCategoryName       string  `json:"asset_category_name"`
    AssetLocationID         uint    `json:"asset_location_id"`
    AssetLocationName       string  `json:"asset_location_name"`
    CityName                string  `json:"city_name"`
    ProvinceName            string  `json:"province_name"`
    Code                    string  `json:"code"`
    Name                    string  `json:"name"`
    AcquisitionDate         string  `json:"acquisition_date"`
    AcquisitionCost         float64 `json:"acquisition_cost"`
    AccumulatedDepreciation float64 `json:"accumulated_depreciation"`
    CurrentValue            float64 `json:"current_value"`
    Status                  string  `json:"status"`
    Description             *string `json:"description,omitempty"`
    DepreciationsCount      int     `json:"depreciations_count"`
    TransactionsCount       int     `json:"transactions_count"`
    CreatedAt               string  `json:"created_at"`
    UpdatedAt               string  `json:"updated_at"`
}
```

#### AssetCategoryRequest
```go
type AssetCategoryRequest struct {
    Name               string  `json:"name" binding:"required"`
    Type               string  `json:"type" binding:"required,oneof=CURRENT FIXED INTANGIBLE OTHER"`
    DepreciationMethod string  `json:"depreciation_method" binding:"required,oneof=STRAIGHT_LINE DECLINING NONE"`
    DepreciationRate   float64 `json:"depreciation_rate" binding:"required,min=0,max=100"`
    UsefulLife         int     `json:"useful_life" binding:"required,min=1"`
    IsDepreciable      *bool   `json:"is_depreciable" binding:"required"`
}
```

#### AssetDepreciationRequest
```go
type AssetDepreciationRequest struct {
    AssetID                 uint      `json:"asset_id" binding:"required"`
    Period                  time.Time `json:"period" binding:"required"`
    DepreciationAmount      float64   `json:"depreciation_amount" binding:"min=0"`
    AccumulatedDepreciation float64   `json:"accumulated_depreciation" binding:"min=0"`
    BookValue               *float64  `json:"book_value,omitempty"`
}
```

#### AssetTransactionRequest
```go
type AssetTransactionRequest struct {
    AssetID           uint      `json:"asset_id" binding:"required"`
    TransactionType   string    `json:"transaction_type" binding:"required,oneof=ACQUISITION TRANSFER DISPOSAL REVALUATION ADJUSTMENT"`
    TransactionDate   time.Time `json:"transaction_date" binding:"required"`
    TransactionAmount float64   `json:"transaction_amount" binding:"min=0"`
    Description       *string   `json:"description,omitempty"`
}
```

## Business Logic

### 1. Asset Code Generation

```
Format: AST-{CATEGORY_TYPE}-{SEQUENCE}
Example: AST-FIXED-0001, AST-CURRENT-0002
```

### 2. Depreciation Calculation

#### Straight-Line Method
```
Annual Depreciation = (AcquisitionCost - SalvageValue) / UsefulLife
Monthly Depreciation = Annual Depreciation / 12
```

#### Declining Balance Method
```
Annual Depreciation = BookValue × DepreciationRate
Monthly Depreciation = Annual Depreciation / 12
```

### 3. Current Value Calculation
```
CurrentValue = AcquisitionCost - AccumulatedDepreciation
```

### 4. Status Transition Rules

#### Asset Status
```
ACTIVE → INACTIVE (temporary)
ACTIVE → SOLD (permanent)
ACTIVE → DISPOSED (permanent)
INACTIVE → ACTIVE (reactivate)
```

#### Depreciation Status
```
PENDING → APPROVED (via approve endpoint)
PENDING → DELETED (can delete pending only)
```

#### Transaction Status
```
DRAFT → APPROVED (via approve endpoint)
DRAFT → DELETED (can delete draft only)
```

### 5. Validation Rules

#### Asset Creation
- Category must exist
- Location must exist
- Acquisition cost must be >= 0
- Current value must be >= 0
- Accumulated depreciation must be >= 0

#### Depreciation Creation
- Asset must exist and be ACTIVE
- Period must not overlap with existing depreciations
- Depreciation amount must be >= 0
- Only PENDING depreciations can be edited/deleted

#### Transaction Creation
- Asset must exist
- Transaction type must be valid
- Transaction amount must be >= 0
- Only DRAFT transactions can be edited/deleted

### 6. Financial Impact

When depreciation is **APPROVED**:
1. Asset's AccumulatedDepreciation is updated
2. Asset's CurrentValue is recalculated
3. Journal entry can be created (optional)

When transaction is **APPROVED**:
1. Asset status may change (e.g., DISPOSAL → DISPOSED)
2. Asset value may change (e.g., REVALUATION)
3. Journal entry can be created (optional)

## API Reference

### Base URL
```
/api/v1/finance
```

### Authentication
All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### Endpoints

---

## Asset List Endpoints

### 1. Get All Assets
```http
GET /finance/assets
```

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | int | No | Page number (default: 1) |
| limit | int | No | Items per page (default: 10) |
| search | string | No | Search term |
| search_by | string | No | Field to search |
| sort_by | string | No | Sort field (default: updated_at) |
| sort_order | string | No | Sort order: asc/desc (default: desc) |
| start_date | string | No | Filter start date (YYYY-MM-DD) |
| end_date | string | No | Filter end date (YYYY-MM-DD) |
| status | string | No | Filter by status |
| asset_category_id | int | No | Filter by category |
| asset_location_id | int | No | Filter by location |

**Response**:
```json
{
  "data": [
    {
      "id": 1,
      "asset_category_id": 1,
      "asset_category_name": "Office Equipment",
      "asset_location_id": 1,
      "asset_location_name": "Head Office",
      "city_name": "Jakarta",
      "province_name": "DKI Jakarta",
      "code": "AST-FIXED-0001",
      "name": "MacBook Pro 16\"",
      "acquisition_date": "2024-01-15",
      "acquisition_cost": 35000000,
      "accumulated_depreciation": 5000000,
      "current_value": 30000000,
      "status": "ACTIVE",
      "description": "Development laptop",
      "depreciations_count": 12,
      "transactions_count": 2,
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2025-01-15T10:00:00Z"
    }
  ],
  "meta": {
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 10
    },
    "search": {
      "search": "",
      "searchBy": ""
    },
    "sort": {
      "sort_by": "updated_at",
      "sort_order": "desc"
    },
    "filter": {
      "start_date": "",
      "end_date": ""
    },
    "searchable_columns": {
      "string_columns": ["code", "name", "status"],
      "numeric_columns": ["id"]
    },
    "sortable_columns": {
      "available_fields": ["id", "code", "name", "acquisition_date", "acquisition_cost", "current_value", "status", "created_at", "updated_at"]
    }
  }
}
```

### 2. Get Asset by ID
```http
GET /finance/assets/{id}
```

**Response**: Single asset object

### 3. Create Asset
```http
POST /finance/assets
```

**Request Body**:
```json
{
  "asset_category_id": 1,
  "asset_location_id": 1,
  "name": "MacBook Pro 16\"",
  "acquisition_date": "2024-01-15",
  "acquisition_cost": 35000000,
  "accumulated_depreciation": 0,
  "current_value": 35000000,
  "status": "ACTIVE",
  "description": "Development laptop"
}
```

**Response**: Created asset with message "created" (201)

### 4. Update Asset
```http
PUT /finance/assets/{id}
```

**Request Body**: Same as Create

**Response**: Updated asset with message "updated" (200)

### 5. Delete Asset
```http
DELETE /finance/assets/{id}
```

**Response**:
```json
{
  "message": "deleted"
}
```

### 6. Get Asset Statistics
```http
GET /finance/assets/stats
```

**Response**:
```json
{
  "data": {
    "total": 150,
    "by_status": {
      "active": 120,
      "inactive": 15,
      "sold": 10,
      "disposed": 5
    },
    "by_category": {
      "total_categories": 8,
      "top_categories": [
        {
          "category_id": 1,
          "category_name": "Office Equipment",
          "count": 45
        }
      ]
    },
    "by_location": {
      "total_locations": 5,
      "top_locations": [
        {
          "location_id": 1,
          "location_name": "Head Office",
          "count": 80
        }
      ]
    },
    "financial": {
      "total_acquisition_cost": 5000000000,
      "total_current_value": 3500000000,
      "total_depreciation": 1500000000
    }
  },
  "message": "Statistics retrieved successfully"
}
```

### 7. Get Add Form Data
```http
GET /finance/assets/add
```

**Response**:
```json
{
  "data": {
    "asset_categories": [
      {
        "id": 1,
        "name": "Office Equipment",
        "type": "FIXED"
      }
    ],
    "asset_locations": [
      {
        "id": 1,
        "name": "Head Office",
        "city": "Jakarta"
      }
    ]
  }
}
```

---

## Asset Category Endpoints

### 1. Get All Asset Categories
```http
GET /finance/asset-categories
```

**Response**: Paginated list with similar meta structure

### 2. Get Asset Category by ID
```http
GET /finance/asset-categories/{id}
```

### 3. Create Asset Category
```http
POST /finance/asset-categories
```

**Request Body**:
```json
{
  "name": "Office Equipment",
  "type": "FIXED",
  "depreciation_method": "STRAIGHT_LINE",
  "depreciation_rate": 20.00,
  "useful_life": 5,
  "is_depreciable": true
}
```

### 4. Update Asset Category
```http
PUT /finance/asset-categories/{id}
```

### 5. Delete Asset Category
```http
DELETE /finance/asset-categories/{id}
```

### 6. Get Asset Category Statistics
```http
GET /finance/asset-categories/stats
```

**Response**:
```json
{
  "data": {
    "total": 8,
    "by_type": {
      "fixed": 4,
      "current": 2,
      "intangible": 1,
      "other": 1
    },
    "by_method": {
      "straight_line": 5,
      "declining": 2,
      "none": 1
    },
    "by_depreciation": {
      "depreciable": 7,
      "non_depreciable": 1
    }
  }
}
```

---

## Asset Location Endpoints

### 1. Get All Asset Locations
```http
GET /finance/asset-locations
```

### 2. Get Asset Location by ID
```http
GET /finance/asset-locations/{id}
```

### 3. Create Asset Location
```http
POST /finance/asset-locations
```

**Request Body**:
```json
{
  "city_id": 1,
  "name": "Head Office",
  "address": "Jl. Sudirman No. 123, Jakarta Pusat",
  "latitude": -6.2088,
  "longitude": 106.8456
}
```

### 4. Update Asset Location
```http
PUT /finance/asset-locations/{id}
```

### 5. Delete Asset Location
```http
DELETE /finance/asset-locations/{id}
```

### 6. Get Asset Location Statistics
```http
GET /finance/asset-locations/stats
```

**Response**:
```json
{
  "data": {
    "total": 5,
    "by_city": {
      "total_cities": 3,
      "top_cities": [
        {
          "city_id": 1,
          "city_name": "Jakarta",
          "count": 2
        }
      ]
    },
    "by_coordinates": {
      "with_coordinates": 4,
      "without_coordinates": 1
    }
  }
}
```

### 7. Get Add Form Data
```http
GET /finance/asset-locations/add
```

**Response**:
```json
{
  "data": {
    "provinces": [
      {
        "id": 1,
        "name": "DKI Jakarta",
        "cities": [
          {
            "id": 1,
            "name": "Jakarta Pusat",
            "province_id": 1
          }
        ]
      }
    ]
  }
}
```

---

## Asset Depreciation Endpoints

### 1. Get All Asset Depreciations
```http
GET /finance/asset-depreciations
```

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | int | No | Page number |
| limit | int | No | Items per page |
| search | string | No | Search term |
| status | string | No | Filter by status (PENDING/APPROVED) |
| asset_id | int | No | Filter by asset |
| start_date | string | No | Filter start date |
| end_date | string | No | Filter end date |

### 2. Get Asset Depreciation by ID
```http
GET /finance/asset-depreciations/{id}
```

### 3. Create Asset Depreciation
```http
POST /finance/asset-depreciations
```

**Request Body**:
```json
{
  "asset_id": 1,
  "period": "2025-01-01",
  "depreciation_amount": 500000,
  "accumulated_depreciation": 5500000,
  "book_value": 29500000
}
```

### 4. Update Asset Depreciation
```http
PUT /finance/asset-depreciations/{id}
```

### 5. Delete Asset Depreciation
```http
DELETE /finance/asset-depreciations/{id}
```

### 6. Approve Asset Depreciation
```http
POST /finance/asset-depreciations/{id}/approve
```

**Request Body**: Empty `{}`

**Response**:
```json
{
  "message": "Depreciation approved successfully",
  "data": {
    "id": 1,
    "status": "APPROVED"
  }
}
```

### 7. Get Asset Depreciation Statistics
```http
GET /finance/asset-depreciations/stats
```

**Response**:
```json
{
  "data": {
    "total": 120,
    "by_status": {
      "approved": 100,
      "pending": 20
    },
    "by_asset": {
      "total_assets": 50,
      "top_assets": [
        {
          "asset_id": 1,
          "asset_code": "AST-FIXED-0001",
          "asset_name": "MacBook Pro",
          "count": 12
        }
      ]
    },
    "financial": {
      "total_depreciation_amount": 500000000,
      "total_accumulated_depreciation": 1500000000
    }
  }
}
```

### 8. Get Add Form Data
```http
GET /finance/asset-depreciations/add
```

**Response**:
```json
{
  "data": {
    "assets": [
      {
        "id": 1,
        "code": "AST-FIXED-0001",
        "name": "MacBook Pro"
      }
    ]
  }
}
```

---

## Asset Transaction Endpoints

### 1. Get All Asset Transactions
```http
GET /finance/asset-transactions
```

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | int | No | Page number |
| limit | int | No | Items per page |
| search | string | No | Search term |
| status | string | No | Filter by status (DRAFT/APPROVED) |
| transaction_type | string | No | Filter by type |
| asset_id | int | No | Filter by asset |
| start_date | string | No | Filter start date |
| end_date | string | No | Filter end date |

### 2. Get Asset Transaction by ID
```http
GET /finance/asset-transactions/{id}
```

### 3. Create Asset Transaction
```http
POST /finance/asset-transactions
```

**Request Body**:
```json
{
  "asset_id": 1,
  "transaction_type": "ACQUISITION",
  "transaction_date": "2024-01-15",
  "transaction_amount": 35000000,
  "description": "Initial purchase"
}
```

### 4. Update Asset Transaction
```http
PUT /finance/asset-transactions/{id}
```

### 5. Delete Asset Transaction
```http
DELETE /finance/asset-transactions/{id}
```

### 6. Approve Asset Transaction
```http
POST /finance/asset-transactions/{id}/approve
```

**Request Body**: Empty `{}`

**Response**:
```json
{
  "message": "Transaction approved successfully",
  "data": {
    "id": 1,
    "status": "APPROVED"
  }
}
```

### 7. Get Asset Transaction Statistics
```http
GET /finance/asset-transactions/stats
```

**Response**:
```json
{
  "data": {
    "total": 85,
    "by_type": {
      "acquisition": 50,
      "transfer": 15,
      "disposal": 10,
      "revaluation": 5,
      "adjustment": 5
    },
    "by_status": {
      "approved": 70,
      "draft": 15
    },
    "by_asset": {
      "total_assets": 45,
      "top_assets": [
        {
          "asset_id": 1,
          "asset_code": "AST-FIXED-0001",
          "asset_name": "MacBook Pro",
          "count": 3
        }
      ]
    },
    "financial": {
      "total_transaction_amount": 2000000000
    }
  }
}
```

### 8. Get Add Form Data
```http
GET /finance/asset-transactions/add
```

---

### Error Responses

**400 Bad Request**:
```json
{
  "error": "Invalid request parameters"
}
```

**401 Unauthorized**:
```json
{
  "error": "User not authenticated"
}
```

**404 Not Found**:
```json
{
  "error": "Asset not found"
}
```

**422 Unprocessable Entity**:
```json
{
  "error": "Validation failed: asset_category_id is required"
}
```

**500 Internal Server Error**:
```json
{
  "error": "Internal server error message"
}
```

## Frontend Components

### Main Components

#### 1. AssetListPage
**File**: `asset-list-page.tsx`

Main page component that integrates:
- Statistics cards
- Filter bar with search and date range
- Data table with pagination
- Form modal for create/edit
- Detail modal for viewing

**State Management**: Uses `use-asset-list-store.ts` with modular selectors

#### 2. AssetListTable
**File**: `asset-list-table.tsx`

Data table with:
- Sortable columns
- Row actions (Edit, Delete, View Detail)
- Status badges with color coding
- Currency formatting for amounts
- Pagination controls

**Props**:
```typescript
interface AssetListTableProps {
  onEdit: (asset: AssetList) => void;
  onDelete: (asset: AssetList) => void;
  onViewDetail: (asset: AssetList) => void;
}
```

#### 3. AssetListForm
**File**: `asset-list-form.tsx`

Form modal for creating/editing assets:
- Category dropdown (server-side data)
- Location dropdown (server-side data)
- Date picker for acquisition date
- Currency input for costs
- Status dropdown
- Description textarea
- Form validation with Zod

#### 4. AssetListDetailModal
**File**: `asset-list-detail-modal.tsx`

Read-only detail view showing:
- Asset information
- Category and location details
- Financial summary
- Depreciation count
- Transaction count

#### 5. AssetListDeleteDialog
**File**: `asset-list-delete-dialog.tsx`

Confirmation dialog for deletion with:
- Asset name display
- Warning about dependencies
- Confirm/Cancel buttons

#### 6. AssetCategoryPage / AssetCategoryForm
**Files**: `asset-category-page.tsx`, `asset-category-form.tsx`

Category management with:
- Type selection (FIXED, CURRENT, etc.)
- Depreciation method selection
- Rate and useful life inputs
- Depreciable toggle

#### 7. AssetLocationPage / AssetLocationForm
**Files**: `asset-location-page.tsx`, `asset-location-form.tsx`

Location management with:
- Province/City cascading dropdowns
- Address textarea
- Latitude/Longitude inputs (optional)
- Map integration ready

#### 8. AssetDepreciationPage / AssetDepreciationForm
**Files**: `asset-depreciation-page.tsx`, `asset-depreciation-form.tsx`

Depreciation management with:
- Asset dropdown
- Period date picker
- Amount inputs
- Approve dialog for PENDING items

#### 9. AssetTransactionPage / AssetTransactionForm
**Files**: `asset-transaction-page.tsx`, `asset-transaction-form.tsx`

Transaction management with:
- Transaction type dropdown
- Asset dropdown
- Date picker
- Amount input
- Description textarea
- Approve dialog for DRAFT items

### Supporting Components

#### 10. StatsCards
Generic stats display component showing:
- Total count
- Status breakdown
- Category breakdown
- Financial summaries

#### 11. FilterBar
Reusable filter component with:
- Search input with debouncing
- Date range picker
- Status dropdown
- Category/Location dropdowns
- Clear filters button

#### 12. StatusBadge
Badge component for status display:
- ACTIVE → Green
- INACTIVE → Yellow
- SOLD → Blue
- DISPOSED → Red
- PENDING/DRAFT → Orange
- APPROVED → Green

## User Flows

### Flow 1: Register New Asset
```
1. User navigates to Finance > Asset Management > Asset List
2. User clicks "Add Asset" button
3. Modal opens with form
4. User fills in:
   - Select category from dropdown
   - Select location from dropdown
   - Enter asset name
   - Select acquisition date
   - Enter acquisition cost
   - Enter current value (defaults to acquisition cost)
   - Select status (default: ACTIVE)
   - Optional description
5. User clicks "Save"
6. System validates and creates asset
7. Auto-generated code is assigned (e.g., AST-FIXED-0001)
8. Asset appears in table
```

### Flow 2: Record Monthly Depreciation
```
1. User navigates to Finance > Asset Management > Depreciation
2. User clicks "Add Depreciation" button
3. Modal opens with form
4. User selects:
   - Asset from dropdown
   - Period (month)
   - Depreciation amount
   - Accumulated depreciation
   - Book value
5. User clicks "Save"
6. Depreciation is created with PENDING status
7. Finance manager reviews and approves
8. Upon approval:
   - Status changes to APPROVED
   - Asset's accumulated depreciation is updated
   - Asset's current value is recalculated
```

### Flow 3: Transfer Asset Between Locations
```
1. User navigates to Finance > Asset Management > Transactions
2. User clicks "Add Transaction" button
3. User selects:
   - Asset to transfer
   - Transaction type: TRANSFER
   - Transaction date
   - Description (new location info)
4. User clicks "Save"
5. Transaction is created with DRAFT status
6. Manager reviews and approves
7. Asset's location is updated
```

### Flow 4: Dispose/Sell Asset
```
1. User navigates to Asset List
2. User selects asset to dispose
3. User creates transaction:
   - Transaction type: DISPOSAL
   - Transaction amount (sale price if sold)
4. Transaction is approved
5. Asset status changes to SOLD or DISPOSED
6. Final depreciation may be recorded
```

### Flow 5: View Asset Statistics
```
1. User navigates to Asset List page
2. Stats cards display:
   - Total assets
   - By status breakdown
   - By category breakdown
   - Financial summary
3. User can filter to see specific metrics
4. Data refreshes automatically after operations
```

### Flow 6: Configure Depreciation Settings
```
1. User navigates to Asset Categories
2. User creates/edits category with:
   - Depreciation method
   - Depreciation rate
   - Useful life
   - Is depreciable flag
3. Settings apply to all assets in category
4. Future depreciations use these settings
```

## Permissions

### Role-Based Access Control

#### Finance Admin
- Full CRUD access to all asset modules
- Can approve depreciations and transactions
- Can view all financial reports
- Can manage categories and locations

#### Finance Staff
- Create/Edit assets, depreciations, transactions
- View all records
- Cannot approve records
- Cannot delete approved records

#### Operations Manager
- View assets and locations
- Request asset transfers
- View location-based reports
- Limited edit access

#### Regular Employee
- No access to Finance Asset Management
- View-only access if granted specifically

### Permission Matrix

| Action | Finance Admin | Finance Staff | Operations | Employee |
|--------|---------------|---------------|------------|----------|
| View Assets | ✅ | ✅ | ✅ | ❌ |
| Create Assets | ✅ | ✅ | ❌ | ❌ |
| Edit Assets | ✅ | ✅ | ❌ | ❌ |
| Delete Assets | ✅ | ❌ | ❌ | ❌ |
| Manage Categories | ✅ | ❌ | ❌ | ❌ |
| Manage Locations | ✅ | ✅ | ✅ | ❌ |
| Create Depreciation | ✅ | ✅ | ❌ | ❌ |
| Approve Depreciation | ✅ | ❌ | ❌ | ❌ |
| Create Transaction | ✅ | ✅ | ✅ | ❌ |
| Approve Transaction | ✅ | ❌ | ❌ | ❌ |
| View Reports | ✅ | ✅ | Partial | ❌ |

## Configuration

### Environment Variables

```env
# Asset Management Configuration
ASSET_CODE_PREFIX=AST                    # Prefix for asset codes
ASSET_DEFAULT_STATUS=ACTIVE              # Default status for new assets
ASSET_DEPRECIATION_AUTO_CALCULATE=true   # Auto-calculate depreciation amounts

# Pagination
ASSET_PAGE_LIMIT_DEFAULT=10
ASSET_PAGE_LIMIT_MAX=100

# Export Configuration
ASSET_EXPORT_MAX_ROWS=10000
ASSET_EXPORT_FORMATS=excel,csv,pdf
```

### Database Configuration

**Indexes**:
```sql
-- Performance indexes
CREATE INDEX idx_assets_category ON assets(asset_category_id);
CREATE INDEX idx_assets_location ON assets(asset_location_id);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_code ON assets(code);
CREATE INDEX idx_assets_acquisition_date ON assets(acquisition_date);

CREATE INDEX idx_depreciations_asset ON asset_depreciations(asset_id);
CREATE INDEX idx_depreciations_period ON asset_depreciations(period);
CREATE INDEX idx_depreciations_status ON asset_depreciations(status);

CREATE INDEX idx_transactions_asset ON asset_transactions(asset_id);
CREATE INDEX idx_transactions_type ON asset_transactions(transaction_type);
CREATE INDEX idx_transactions_date ON asset_transactions(transaction_date);
CREATE INDEX idx_transactions_status ON asset_transactions(status);

CREATE INDEX idx_locations_city ON asset_locations(city_id);
```

**Constraints**:
```sql
-- Foreign key constraints
ALTER TABLE assets ADD CONSTRAINT fk_assets_category 
  FOREIGN KEY (asset_category_id) REFERENCES asset_categories(id) 
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE assets ADD CONSTRAINT fk_assets_location 
  FOREIGN KEY (asset_location_id) REFERENCES asset_locations(id) 
  ON UPDATE CASCADE ON DELETE RESTRICT;

-- Check constraints
ALTER TABLE assets ADD CONSTRAINT chk_assets_cost 
  CHECK (acquisition_cost >= 0 AND current_value >= 0);

ALTER TABLE asset_categories ADD CONSTRAINT chk_depreciation_rate 
  CHECK (depreciation_rate >= 0 AND depreciation_rate <= 100);
```

### Default Categories Configuration

```json
{
  "default_categories": [
    {
      "name": "Office Equipment",
      "type": "FIXED",
      "depreciation_method": "STRAIGHT_LINE",
      "depreciation_rate": 20.00,
      "useful_life": 5,
      "is_depreciable": true
    },
    {
      "name": "Vehicles",
      "type": "FIXED",
      "depreciation_method": "DECLINING",
      "depreciation_rate": 25.00,
      "useful_life": 8,
      "is_depreciable": true
    },
    {
      "name": "Buildings",
      "type": "FIXED",
      "depreciation_method": "STRAIGHT_LINE",
      "depreciation_rate": 5.00,
      "useful_life": 20,
      "is_depreciable": true
    },
    {
      "name": "Land",
      "type": "FIXED",
      "depreciation_method": "NONE",
      "depreciation_rate": 0,
      "useful_life": 999,
      "is_depreciable": false
    }
  ]
}
```

## Integration Points

### 1. Master Data Module (Cities/Provinces)

**Integration**: `internal/master-data`

**Usage**:
- Province and city data for asset locations
- Cascading dropdowns in location forms
- Geographic reporting

**API Calls**:
```go
provinceUc.GetAllRaw()
provinceUc.GetByID(id)
```

### 2. Finance Journal Module

**Integration**: `internal/finance` (Journal Entries)

**Usage**:
- Create journal entries for approved depreciations
- Record asset acquisition/disposal in GL
- Financial reporting integration

**Data Flow**:
```
Depreciation Approved → Journal Entry Created → GL Updated
```

### 3. Authentication Module

**Integration**: `internal/auth`

**Usage**:
- User authentication
- Role-based access control
- Approval tracking (who approved what)

**Middleware**:
```go
middleware.AuthorizeAuto(db)
```

### 4. Export Service

**Integration**: `internal/core/utils/exports`

**Usage**:
- Generate Excel reports
- Generate CSV exports
- Generate PDF reports

**Service Interface**:
```go
ExportFactory.CreateExporter(format)
ExportHelper.GenerateFilename("assets", "excel")
```

### API Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│                    Asset Management Module                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │  Asset   │ │ Category │ │ Location │ │ Deprecia │ │Transact│ │
│  │ Handler  │ │ Handler  │ │ Handler  │ │  tion    │ │  ion   │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬────┘ │
│       │            │            │            │            │      │
│       └────────────┴────────────┴────────────┴────────────┘      │
│                              │                                   │
│                    ┌─────────┴─────────┐                         │
│                    │    Use Cases      │                         │
│                    └─────────┬─────────┘                         │
│                              │                                   │
│    ┌─────────────┬───────────┼───────────┬─────────────┐        │
│    │             │           │           │             │        │
│ ┌──┴──┐     ┌────┴───┐  ┌────┴───┐  ┌────┴───┐  ┌──────┴───┐   │
│ │Asset│     │Category│  │Location│  │Deprecia│  │Transaction│  │
│ │Repo │     │  Repo  │  │  Repo  │  │  Repo  │  │   Repo   │   │
│ └──┬──┘     └────┬───┘  └────┬───┘  └────┬───┘  └─────┬────┘   │
│    │             │           │           │             │        │
│    └─────────────┴───────────┴───────────┴─────────────┘        │
│                              │                                   │
│                       ┌──────┴──────┐                            │
│                       │  Database   │                            │
│                       └─────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
   ┌──────────┐        ┌──────────┐        ┌──────────┐
   │ Master   │        │  Auth    │        │ Journal  │
   │  Data    │        │ Module   │        │ Entries  │
   └──────────┘        └──────────┘        └──────────┘
```

---

## Summary

The **Finance Asset Management Module** provides comprehensive fixed asset lifecycle management capabilities. It integrates seamlessly with master data, journal entries, and authentication modules to provide a complete asset accounting solution.

### Key Strengths
- Complete asset lifecycle tracking (acquisition to disposal)
- Flexible depreciation methods and calculations
- Geographic location tracking with coordinates
- Approval workflows for financial controls
- Statistical dashboards for decision support
- Clean architecture with clear separation of concerns

### Module Relationships

```
Asset Category ─────┐
                    │
                    ▼
Asset List ◄──── Asset Location
    │               │
    │               │
    ▼               ▼
Asset Depreciation  │
    │               │
    ▼               │
Asset Transaction ──┘
    │
    ▼
Journal Entry (Finance)
```

### Usage Recommendations
1. **Initial Setup**: Configure asset categories before creating assets
2. **Location Management**: Set up locations with geographic data for better tracking
3. **Regular Depreciation**: Process monthly depreciations consistently
4. **Approval Process**: Use approval workflow for audit compliance
5. **Period Review**: Review asset values and statuses quarterly
6. **Integration**: Ensure journal entry integration for financial reporting

---

*Last Updated: 2025-01*
*Module Version: 1.0*
*ERP TEKNA System*
