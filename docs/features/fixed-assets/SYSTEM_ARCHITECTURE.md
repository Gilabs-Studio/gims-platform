# Fixed Asset Management Module - System Architecture Diagram

## 🏗️ Complete System Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER (Next.js 16)                           │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Browser                                                                    │
│     ↓                                                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Pages & Screens                                                    │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │  • /assets                  (List view)                            │  │
│  │  • /assets/create          (Stepper wizard)                        │  │
│  │  • /assets/:id             (Detail view)                           │  │
│  │  • /assets/:id/edit        (Edit form)                             │  │
│  │  • /reports/depreciation   (Report view)                           │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│     ↓                                                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Components Layer                                                   │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │  • AssetCreateStepper    (5-step form wizard)                       │  │
│  │  • DepreciationPreview   (Real-time calculation table)              │  │
│  │  • AssetForm             (Dynamic form with Zod validation)         │  │
│  │  • AssetTable            (Sortable, filterable list)                │  │
│  │  • AssetDetailCard       (Summary view)                             │  │
│  │  • DisposalModal         (Workflow modal)                           │  │
│  │  • TransferModal         (Movement modal)                           │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│     ↓                                                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Hooks & Services Layer (React Query + Axios)                      │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │  useCreateAsset()          → assetService.createAsset()            │  │
│  │  useGetAssets()            → assetService.listAssets()             │  │
│  │  useGetAssetDetail()       → assetService.getAssetById()           │  │
│  │  useActivateAsset()        → assetService.activateAsset()          │  │
│  │  useDisposeAsset()         → assetService.disposeAsset()           │  │
│  │  useTransferAsset()        → assetService.transferAsset()          │  │
│  │  useGenerateSchedule()     → assetService.generateSchedule()       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│     ↓                                                                       │
│  HTTP/JSON (REST API via Axios)                                            │
│     ↓                                                                       │
└────────────────────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────────────┐
                    │   Network Layer │
                    │   (TCP/IP/SSL)  │
                    └─────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────────────────┐
│                         API LAYER (Go + Gin)                               │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Router                                                                     │
│     ↓                                                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  API Endpoints                                                      │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │  POST   /api/v1/finance/assets              (Create)              │  │
│  │  GET    /api/v1/finance/assets              (List)                │  │
│  │  GET    /api/v1/finance/assets/:id          (Detail)              │  │
│  │  PATCH  /api/v1/finance/assets/:id          (Update)              │  │
│  │  POST   /api/v1/finance/assets/:id/activate (Activate)            │  │
│  │  POST   /api/v1/finance/assets/:id/dispose  (Dispose)             │  │
│  │  POST   /api/v1/finance/assets/:id/transfer (Transfer)            │  │
│  │  GET    /api/v1/finance/assets/:id/depreciation-schedule         │  │
│  │  POST   /api/v1/finance/assets/:id/attachments (Upload)           │  │
│  │  GET    /api/v1/finance/assets/:id/maintenance (History)          │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│     ↓                                                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Handlers (HTTP Request/Response)                                  │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │  AssetHandler                                                      │  │
│  │  ├── CreateAssetHandler()                                          │  │
│  │  ├── GetAssetHandler()                                             │  │
│  │  ├── ListAssetsHandler()                                           │  │
│  │  ├── UpdateAssetHandler()                                          │  │
│  │  ├── ActivateAssetHandler()                                        │  │
│  │  ├── DisposeAssetHandler()                                         │  │
│  │  └── ... (more handlers)                                           │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│     ↓                                                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Middleware                                                         │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │  • Authentication (JWT verification)                               │  │
│  │  • Authorization (Permission checks)                               │  │
│  │  • Error Handling (Custom error responses)                         │  │
│  │  • Logging (Request/response logging)                              │  │
│  │  • CORS (Cross-origin requests)                                    │  │
│  │  • Rate Limiting (Per-user/IP limits)                              │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│     ↓                                                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Request/Response DTOs (Data Transfer Objects)                    │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │  Requests:                                                         │  │
│  │  • CreateAssetRequest       ┌─ Validate()                         │  │
│  │  • UpdateAssetRequest       │                                      │  │
│  │  • ActivateAssetRequest     │                                      │  │
│  │  • DisposeAssetRequest      │                                      │  │
│  │  • TransferAssetRequest     └─ All with Zod schema                │  │
│  │                                                                    │  │
│  │  Responses:                                                        │  │
│  │  • AssetResponse            (Complete asset details)              │  │
│  │  • AssetListResponse        (Paginated list)                      │  │
│  │  • DepreciationScheduleResponse                                   │  │
│  │  • DisposalResponse         (Disposal transaction)                │  │
│  │  • ErrorResponse            (Error details)                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│     ↓                                                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Usecase/Service Layer (Business Logic)                           │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │  AssetUsecase / AssetService                                       │  │
│  │  ├── CreateAsset()                                                 │  │
│  │  │   ├─ Validate inputs                                            │  │
│  │  │   ├─ Generate asset code                                        │  │
│  │  │   ├─ Check uniqueness (code, serial)                            │  │
│  │  │   ├─ Create entity                                              │  │
│  │  │   └─ Log audit event                                            │  │
│  │  │                                                                  │  │
│  │  ├── ActivateAsset()                                               │  │
│  │  │   ├─ Validate status transition                                 │  │
│  │  │   ├─ Generate depreciation schedule                             │  │
│  │  │   ├─ Update asset status                                        │  │
│  │  │   └─ Log audit event                                            │  │
│  │  │                                                                  │  │
│  │  ├── DisposeAsset()                                                │  │
│  │  │   ├─ Calculate gain/loss                                        │  │
│  │  │   ├─ Create disposal record                                     │  │
│  │  │   ├─ Update asset status                                        │  │
│  │  │   └─ Log audit event                                            │  │
│  │  │                                                                  │  │
│  │  ├── TransferAsset()                                               │  │
│  │  │   ├─ Update location/custodian                                  │  │
│  │  │   ├─ Create transfer record                                     │  │
│  │  │   └─ Log audit event                                            │  │
│  │  │                                                                  │  │
│  │  ├── GenerateDepreciationSchedule()                                │  │
│  │  │   ├─ Create DepreciationEngine                                  │  │
│  │  │   ├─ Calculate monthly amounts                                  │  │
│  │  │   └─ Save schedule records                                      │  │
│  │  │                                                                  │  │
│  │  └── ... (more methods)                                            │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│     ↓                                                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Depreciation Engine                                               │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │  DepreciationEngine                                                │  │
│  │  ├── Straight-Line (SL)                                            │  │
│  │  │   Monthly = (Cost - Salvage) / Months                           │  │
│  │  │                                                                  │  │
│  │  ├── Declining Balance (DB)                                        │  │
│  │  │   Monthly = Book Value × (2 / Life) / 12                        │  │
│  │  │                                                                  │  │
│  │  ├── Sum of Years Digits (SYD)                                     │  │
│  │  │   Year N = (Remaining / Sum) × (Cost - Salvage)                 │  │
│  │  │                                                                  │  │
│  │  ├── Units of Production (UOP)                                     │  │
│  │  │   Monthly = (Cost - Salvage) / Total Units × Units Produced    │  │
│  │  │                                                                  │  │
│  │  └── None                                                          │  │
│  │      No depreciation                                               │  │
│  │                                                                    │  │
│  │  Output: []DepreciationScheduleItem                                │  │
│  │  ├── PeriodMonth                                                   │  │
│  │  ├── DepreciationAmount                                            │  │
│  │  ├── AccumulatedDepreciation                                       │  │
│  │  └── BookValue                                                     │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│     ↓                                                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Repository Layer (Data Access Abstraction)                       │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │  AssetRepository                                                   │  │
│  │  ├── FindByID(ctx, id) *Asset                                      │  │
│  │  ├── FindByCode(ctx, code) *Asset                                  │  │
│  │  ├── FindBySerialNumber(ctx, sn) *Asset                            │  │
│  │  ├── List(ctx, filter) []Asset, error                              │  │
│  │  ├── Create(ctx, asset) error                                      │  │
│  │  ├── Update(ctx, asset) error                                      │  │
│  │  └── Delete(ctx, id) error (soft delete)                           │  │
│  │                                                                    │  │
│  │  AssetCategoryRepository                                           │  │
│  │  ├── FindByID() *AssetCategory                                     │  │
│  │  ├── List() []AssetCategory                                        │  │
│  │  └── ... (more methods)                                            │  │
│  │                                                                    │  │
│  │  AssetLocationRepository                                           │  │
│  │  ├── FindByID() *AssetLocation                                     │  │
│  │  ├── List() []AssetLocation                                        │  │
│  │  └── ... (more methods)                                            │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│     ↓                                                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Domain Models (GORM Entities)                                    │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │  Asset (Main entity)                                              │  │
│  │  ├── ID, Code, Name, Description                                  │  │
│  │  ├── AssetType, Status                                            │  │
│  │  ├── AcquisitionDate, AcquisitionCost                             │  │
│  │  ├── SalvageValue, CurrencyCode                                   │  │
│  │  ├── DepreciationMethod, UsefulLifeMonths                         │  │
│  │  ├── AccumulatedDepreciation, BookValue                           │  │
│  │  ├── CategoryID, LocationID, CustodianID                          │  │
│  │  ├── IsActive, Status                                             │  │
│  │  ├── Relationships:                                               │  │
│  │  │   ├─ DepreciationSchedules []AssetDepreciationSchedule        │  │
│  │  │   ├─ Disposals []AssetDisposal                                │  │
│  │  │   ├─ Attachments []AssetAttachment                            │  │
│  │  │   ├─ AuditLogs []AssetAuditLog                                │  │
│  │  │   ├─ Transfers []AssetTransfer                                │  │
│  │  │   └─ MaintenanceLogs []AssetMaintenanceLog                    │  │
│  │  │                                                                │  │
│  │  AssetDepreciationSchedule                                        │  │
│  │  ├── AssetID, PeriodMonth                                         │  │
│  │  ├── DepreciationAmount                                           │  │
│  │  ├── AccumulatedDepreciation                                      │  │
│  │  ├── BookValue                                                    │  │
│  │  └── IsPosted (for GL integration)                                │  │
│  │                                                                    │  │
│  │  AssetDisposal                                                     │  │
│  │  ├── AssetID, DisposalType                                        │  │
│  │  ├── DisposalDate, DisposalValue                                  │  │
│  │  ├── GainOrLoss                                                   │  │
│  │  └── ReferenceNumber                                              │  │
│  │                                                                    │  │
│  │  AssetAuditLog (Complete history)                                 │  │
│  │  ├── AssetID, Action (CREATED, UPDATED, ACTIVATED, etc.)          │  │
│  │  ├── FieldName, OldValue, NewValue                                │  │
│  │  ├── ChangedBy, ChangedAt                                         │  │
│  │  └── Description                                                  │  │
│  │                                                                    │  │
│  │  ... (plus Transfer, Maintenance, Attachment models)              │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│     ↓                                                                       │
└────────────────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────────────────┐
│                     DATABASE LAYER (PostgreSQL)                             │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Core Tables                                                        │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │                                                                    │  │
│  │  asset_categories                     asset_locations             │  │
│  │  ├── id (UUID PK)                      ├── id (UUID PK)           │  │
│  │  ├── name                             ├── code                    │  │
│  │  ├── default_depreciation_method      ├── name                    │  │
│  │  ├── fixed_asset_account_code         ├── city, country           │  │
│  │  └── depreciation_account_code        └── ...                     │  │
│  │       ↓                                    ↓                       │  │
│  │  (1:many)                             (1:many)                    │  │
│  │                                                                    │  │
│  │       assets (Main Table)                                         │  │
│  │       ├── id (UUID PK)                                             │  │
│  │       ├── code, name, description                                 │  │
│  │       ├── asset_type (TANGIBLE, INTANGIBLE, etc.)                 │  │
│  │       ├── status (DRAFT, ACTIVE, UNDER_MAINTENANCE, DISPOSED)     │  │
│  │       ├── acquisition_date, acquisition_cost                      │  │
│  │       ├── salvage_value, currency_code                            │  │
│  │       ├── depreciation_method, useful_life_months                 │  │
│  │       ├── accumulated_depreciation, book_value                    │  │
│  │       ├── category_id FK, location_id FK                          │  │
│  │       ├── custodian_id FK, department_id FK                       │  │
│  │       ├── is_active, serial_number, barcode                       │  │
│  │       ├── deleted_at (soft delete)                                │  │
│  │       └── created_by, updated_by, created_at, updated_at          │  │
│  │                                                                    │  │
│  │                      ├─(1:many)──────────────────────────────┐    │  │
│  │                      ↓                                        ↓    │  │
│  │  asset_depreciation_schedules              asset_disposals       │  │
│  │  ├── id (UUID PK)                          ├── id (UUID PK)     │  │
│  │  ├── asset_id FK                           ├── asset_id FK      │  │
│  │  ├── period_month                          ├── disposal_type    │  │
│  │  ├── depreciation_amount                   ├── disposal_date    │  │
│  │  ├── accumulated_depreciation              ├── disposal_value   │  │
│  │  ├── book_value                            ├── gain_or_loss     │  │
│  │  └── is_posted                             └── reference_num    │  │
│  │                                                                    │  │
│  │  ├─(1:many)─────────┬─────────────┬────────────┤                 │  │
│  │  ↓                  ↓             ↓            ↓                 │  │
│  │  asset_attachments  asset_audit_logs  asset_transfers           │  │
│  │  ├── id             ├── id             ├── id                    │  │
│  │  ├── asset_id FK    ├── asset_id FK    ├── asset_id FK           │  │
│  │  ├── file_path      ├── action         ├── from_location_id      │  │
│  │  ├── attachment_type├── field_name     ├── to_location_id        │  │
│  │  ├── file_size      ├── old_value      ├── from_custodian_id     │  │
│  │  └── uploaded_at    ├── new_value      ├── to_custodian_id       │  │
│  │                     ├── changed_by     ├── transfer_date         │  │
│  │  asset_maintenance_logs  └── changed_at    └── reference_number    │  │
│  │  ├── id                                                           │  │
│  │  ├── asset_id FK                                                 │  │
│  │  ├── maintenance_type                                            │  │
│  │  ├── cost                                                        │  │
│  │  ├── maintenance_date                                            │  │
│  │  ├── next_maintenance_date                                       │  │
│  │  ├── performed_by                                                │  │
│  │  └── description                                                 │  │
│  │                                                                    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Indexes (Performance Optimization)                                        │
│  ├── idx_assets_status (WHERE status='ACTIVE')                             │
│  ├── idx_assets_category (JOIN with categories)                            │
│  ├── idx_assets_location (JOIN with locations)                             │
│  ├── idx_assets_code (Unique lookup)                                       │
│  ├── idx_assets_serial (Unique lookup)                                     │
│  ├── idx_depreciation_asset (Schedule lookups)                             │
│  ├── idx_audit_asset (Audit trail lookups)                                 │
│  └── idx_assets_created_at (Time-range queries)                            │
│                                                                             │
│  Constraints (Data Integrity)                                              │
│  ├── FK: assets.category_id → asset_categories.id (RESTRICT)               │
│  ├── FK: assets.location_id → asset_locations.id (RESTRICT)                │
│  ├── FK: depreciation schedules → assets.id (CASCADE)                      │
│  ├── FK: disposals → assets.id (CASCADE)                                   │
│  ├── CHK: acquisition_cost > 0                                             │
│  ├── CHK: salvage_value <= acquisition_cost                                │
│  ├── CHK: useful_life_months > 0 (for depreciable)                         │
│  └── UNIQUE: assets(code), assets(serial_number)                           │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow Diagram

### Creating an Asset

```
User Interface (Next.js)
  │
  ├─→ AssetCreateStepper
  │   ├─ Step 1: Basic Info (Name, Code, Description)
  │   ├─ Step 2: Classification (Type, Category, Location, Custodian)
  │   ├─ Step 3: Financial (Cost, Salvage, Depreciation)
  │   ├─ Step 4: Procurement (Supplier, Invoice)
  │   └─ Step 5: Review (Preview + Depreciation Schedule)
  │
  ├─→ Form Validation (Zod)
  │   └─ CreateAssetRequest validation
  │
  └─→ HTTP POST /api/v1/finance/assets
      │
      ├─→ Handler (CreateAssetHandler)
      │
      ├─→ Service (AssetService.CreateAsset)
      │   ├─ Validate request
      │   ├─ Check uniqueness (code, serial)
      │   ├─ Create Asset entity
      │   ├─ Save to database via Repository
      │   ├─ Create AuditLog
      │   └─ Return AssetResponse
      │
      ├─→ Repository (AssetRepository.Create)
      │   ├─ Transaction START
      │   ├─ INSERT into assets table
      │   ├─ INSERT into asset_audit_logs
      │   ├─ Transaction COMMIT
      │   └─ Return saved Asset
      │
      └─→ Database (PostgreSQL)
          ├─ assets table (new row)
          ├─ asset_audit_logs (audit entry)
          └─ Check constraints enforced
```

### Activating an Asset

```
User Interface
  │
  └─→ HTTP POST /api/v1/finance/assets/{id}/activate
      │
      ├─→ Handler (ActivateAssetHandler)
      │
      ├─→ Service (AssetService.ActivateAsset)
      │   ├─ Find asset by ID
      │   ├─ Validate status == DRAFT
      │   ├─ Generate DepreciationSchedule
      │   │  └─→ DepreciationEngine
      │   │      ├─ Selected method (SL/DB/SYD/UOP/NONE)
      │   │      ├─ Calculate monthly amounts
      │   │      └─ Return []DepreciationScheduleItem
      │   ├─ Save all schedule items
      │   ├─ Update asset status to ACTIVE
      │   ├─ Create AuditLog
      │   └─ Return updated AssetResponse
      │
      ├─→ Repository Operations
      │   ├─ Transaction START
      │   ├─ UPDATE assets (status='ACTIVE')
      │   ├─ INSERT INTO asset_depreciation_schedules (bulk 60 rows)
      │   ├─ INSERT into asset_audit_logs
      │   ├─ Transaction COMMIT
      │   └─ Return updated Asset
      │
      └─→ Database (PostgreSQL)
          ├─ assets table (status updated)
          ├─ asset_depreciation_schedules (60 new rows)
          └─ asset_audit_logs (audit entry)
```

### Calculating Depreciation (Real-time in Frontend)

```
User enters values in form:
  ├─ Acquisition Cost: 10,000,000
  ├─ Salvage Value: 1,000,000
  ├─ Useful Life: 60 months
  └─ Depreciation Method: SL
      │
      ├─→ DepreciationPreview component
      │   ├─ useMemo calculation triggered
      │   ├─ Calculate monthly: (10M - 1M) / 60 = 150K
      │   ├─ Generate 60 schedule items
      │   ├─ Calculate accumulated and book value
      │   └─ Update table in real-time
      │
      └─→ Table Display
          ├─ Month 1: Depreciation 150K, Accumulated 150K, BV 9.85M
          ├─ Month 2: Depreciation 150K, Accumulated 300K, BV 9.70M
          ├─ ...
          └─ Show preview of first 12 months
```

---

## 🔄 Request/Response Cycle

### Success Flow

```
Client Request
  │
  ├─→ HTTP Header validation
  ├─→ Authentication middleware (JWT token)
  ├─→ Authorization middleware (permissions)
  ├─→ Request body parsing
  ├─→ DTO validation (Zod schema)
  │
  ├─→ Handler
  │   └─→ Business logic (Service)
  │       └─→ Data access (Repository)
  │           └─→ Database operations
  │
  └─→ Response building
      ├─→ HTTP 200 OK
      ├─→ JSON body with data
      └─→ Client receives and updates state

Example Response:
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440010",
    "code": "ASSET-001",
    "name": "Laptop Dell",
    ...
  },
  "message": "Asset created successfully"
}
```

### Error Flow

```
Client Request
  │
  ├─→ Validation Error?
  │   ├─ HTTP 400 Bad Request
  │   └─ {"error": "Invalid request", "details": {...}}
  │
  ├─→ Authentication Error?
  │   ├─ HTTP 401 Unauthorized
  │   └─ {"error": "Invalid token"}
  │
  ├─→ Authorization Error?
  │   ├─ HTTP 403 Forbidden
  │   └─ {"error": "Insufficient permissions"}
  │
  ├─→ Business Logic Error?
  │   ├─ HTTP 422 Unprocessable Entity
  │   └─ {"error": "Asset code already exists"}
  │
  ├─→ System Error?
  │   ├─ HTTP 500 Internal Server Error
  │   └─ {"error": "Database connection failed"}
  │
  └─→ Logging & Monitoring
      └─ Error recorded with context for debugging
```

---

## 🛡️ Security & Validation Layers

```
Request Input
  │
  ├─→ Layer 1: HTTP Validation
  │   ├─ Method type (POST, GET, PATCH)
  │   ├─ Content-Type header
  │   └─ URL structure
  │
  ├─→ Layer 2: Authentication
  │   ├─ JWT token presence
  │   ├─ JWT token validity
  │   └─ User identification
  │
  ├─→ Layer 3: Authorization
  │   ├─ Permission checks (finance:asset:write)
  │   ├─ Department access (own assets only)
  │   └─ Company isolation (multi-tenant)
  │
  ├─→ Layer 4: Input Validation (Zod)
  │   ├─ Field types (string, number, date)
  │   ├─ Required fields
  │   ├─ Format validation (UUID, email)
  │   └─ Length constraints
  │
  ├─→ Layer 5: Business Rule Validation
  │   ├─ Salvage ≤ Acquisition cost
  │   ├─ Code uniqueness
  │   ├─ Status transition rules
  │   └─ Asset type rules
  │
  ├─→ Layer 6: Database Constraints
  │   ├─ Foreign key integrity
  │   ├─ Unique constraints
  │   ├─ Check constraints
  │   └─ Data type validation
  │
  └─→ Approved Data
      └─ Safe for processing
```

---

This architecture ensures:
- ✅ Clear separation of concerns
- ✅ Maintainability and scalability
- ✅ Security at multiple layers
- ✅ Data integrity and consistency
- ✅ Performance optimization
- ✅ Easy testing and debugging
