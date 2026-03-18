# Asset Budget Management (CAPEX Planning)

## 1. Ringkasan Fitur

Asset Budget Management adalah modul untuk merencanakan, mengelola, dan memantau anggaran pengeluaran modal (Capital Expenditure) untuk pembelian aset tetap. Modul ini memungkinkan perusahaan untuk:

- Merencanakan anggaran aset tahunan per kategori
- Mengelola alokasi budget untuk setiap department/divisi
- Melakukan tracking penggunaan budget real-time
- Menghubungkan budget dengan proses pembelian (Purchase Requisition)

## 2. UI/UX Design

### 2.1 Design Pattern

Modul ini mengikuti design pattern yang konsisten dengan modul Sales Quotation:

**Form Pattern:**

- Menggunakan Tabs untuk memisahkan sections (Basic Info & Categories)
- Layout grid 2-columns untuk form fields
- Section headers dengan icon (Wallet, PieChart, DollarSign)
- Navigation buttons (Back/Next) untuk berpindah antar tabs
- ButtonLoading component untuk submit actions
- Scrollable area untuk dynamic lists

**Detail Modal Pattern:**

- DialogContent dengan `size="xl"`
- Tabs untuk memisahkan General Info dan Categories
- Table layout dengan `bg-muted/50` untuk label cells
- Summary cards dengan border yang rapi
- Progress bar untuk utilization rate
- Status badges dengan icon

### 2.2 Component Structure

```
Dialog (size="xl")
├── DialogHeader
│   ├── Title (budget name)
│   └── Badges (code, status, fiscal year)
├── Tabs
│   ├── TabsList (Basic | Categories)
│   └── TabsContent
│       ├── Basic Tab
│       │   ├── Budget Information (grid 2-cols)
│       │   ├── Financial Summary (cards)
│       │   └── Budget Summary Table
│       └── Categories Tab
│           ├── Categories Table
│           └── Notes Section
└── DialogFooter (action buttons)
```

## 3. Translation Keys

### 3.1 Indonesian (id.ts)

```typescript
assetBudget: {
  title: "Budget Aset",
  description: "Kelola anggaran pengeluaran modal (CAPEX) untuk pembelian aset.",

  status: {
    draft: "Draft",
    active: "Aktif",
    closed: "Ditutup",
    cancelled: "Dibatalkan",
  },

  fields: {
    budgetCode: "Kode Budget",
    budgetName: "Nama Budget",
    description: "Deskripsi",
    fiscalYear: "Tahun Fiskal",
    startDate: "Tanggal Mulai",
    endDate: "Tanggal Selesai",
    totalBudget: "Total Budget",
    status: "Status",
    category: "Kategori",
    allocatedAmount: "Jumlah Alokasi",
    usedAmount: "Sudah Terpakai",
    committedAmount: "Terkomitmen",
    availableAmount: "Tersedia",
    notes: "Catatan",
  },

  actions: {
    create: "Buat Budget",
    edit: "Ubah",
    delete: "Hapus",
    activate: "Aktifkan",
    close: "Tutup Budget",
    view: "Lihat Detail",
    addCategory: "Tambah Kategori",
    removeCategory: "Hapus Kategori",
  },

  form: {
    createTitle: "Buat Budget Aset Baru",
    editTitle: "Ubah Budget Aset",
    budgetInfo: "Informasi Budget",
    categories: "Kategori Budget",
    summary: "Ringkasan Budget",
    save: "Simpan",
    cancel: "Batal",
  },

  summary: {
    totalAllocated: "Total Alokasi",
    totalUsed: "Total Terpakai",
    totalCommitted: "Total Terkomitmen",
    totalAvailable: "Total Tersedia",
    utilizationRate: "Tingkat Utilisasi",
  },

  messages: {
    noBudgets: "Belum ada budget aset",
    noCategories: "Belum ada kategori budget",
    confirmDelete: "Apakah Anda yakin ingin menghapus budget ini?",
    confirmActivate: "Apakah Anda yakin ingin mengaktifkan budget ini?",
    confirmClose: "Apakah Anda yakin ingin menutup budget ini?",
    insufficientBudget: "Budget tidak mencukupi untuk pembelian ini",
  },

  toast: {
    created: "Budget berhasil dibuat",
    updated: "Budget berhasil diperbarui",
    deleted: "Budget berhasil dihapus",
    statusChanged: "Status budget berhasil diubah",
    error: "Terjadi kesalahan",
  },

  placeholders: {
    search: "Cari budget...",
    selectCategory: "Pilih kategori",
    enterAmount: "Masukkan jumlah",
  },
}
```

### 3.2 English (en.ts)

```typescript
assetBudget: {
  title: "Asset Budgets",
  description: "Manage capital expenditure (CAPEX) budgets for asset purchases.",

  status: {
    draft: "Draft",
    active: "Active",
    closed: "Closed",
    cancelled: "Cancelled",
  },

  fields: {
    budgetCode: "Budget Code",
    budgetName: "Budget Name",
    description: "Description",
    fiscalYear: "Fiscal Year",
    startDate: "Start Date",
    endDate: "End Date",
    totalBudget: "Total Budget",
    status: "Status",
    category: "Category",
    allocatedAmount: "Allocated Amount",
    usedAmount: "Used Amount",
    committedAmount: "Committed Amount",
    availableAmount: "Available Amount",
    notes: "Notes",
  },

  actions: {
    create: "Create Budget",
    edit: "Edit",
    delete: "Delete",
    activate: "Activate",
    close: "Close Budget",
    view: "View Detail",
    addCategory: "Add Category",
    removeCategory: "Remove Category",
  },

  form: {
    createTitle: "Create New Asset Budget",
    editTitle: "Edit Asset Budget",
    budgetInfo: "Budget Information",
    categories: "Budget Categories",
    summary: "Budget Summary",
    save: "Save",
    cancel: "Cancel",
  },

  summary: {
    totalAllocated: "Total Allocated",
    totalUsed: "Total Used",
    totalCommitted: "Total Committed",
    totalAvailable: "Total Available",
    utilizationRate: "Utilization Rate",
  },

  messages: {
    noBudgets: "No asset budgets found",
    noCategories: "No budget categories added",
    confirmDelete: "Are you sure you want to delete this budget?",
    confirmActivate: "Are you sure you want to activate this budget?",
    confirmClose: "Are you sure you want to close this budget?",
    insufficientBudget: "Insufficient budget for this purchase",
  },

  toast: {
    created: "Budget created successfully",
    updated: "Budget updated successfully",
    deleted: "Budget deleted successfully",
    statusChanged: "Budget status changed successfully",
    error: "An error occurred",
  },

  placeholders: {
    search: "Search budgets...",
    selectCategory: "Select category",
    enterAmount: "Enter amount",
  },
}
```

## 4. Fitur Utama

### 4.1 Budget Planning

- Pembuatan budget tahunan dengan periode fleksibel
- Alokasi budget per kategori aset (Office Equipment, Vehicles, Machinery, dll)
- Support multi-year budgeting
- Approval workflow untuk budget plan

### 4.2 Budget Categories

- Kategori budget terhubung dengan Asset Category
- Tracking used amount (sudah terpakai/invoiced)
- Tracking committed amount (PO created, belum invoiced)
- Available amount calculation real-time

### 4.3 Budget Utilization Tracking

- Real-time dashboard utilization rate
- Early warning system untuk budget yang hampir habis
- Historical budget vs actual spending
- Budget variance analysis

### 4.4 Integration dengan Purchase Module

- Validasi budget saat pembuatan Purchase Requisition
- Auto-update committed amount saat PO dibuat
- Auto-update used amount saat invoice diterima

## 5. Business Rules

### 5.1 Budget Status Lifecycle

```
DRAFT → ACTIVE → CLOSED
   ↓       ↓
CANCELLED  (irreversible)
```

- **DRAFT**: Budget dalam tahap perencanaan, bisa diedit/dihapus
- **ACTIVE**: Budget aktif, bisa digunakan untuk PR, tidak bisa diedit
- **CLOSED**: Budget ditutup (end of fiscal year), read-only
- **CANCELLED**: Budget dibatalkan, read-only

### 5.2 Budget Constraints

1. Hanya satu budget ACTIVE per fiscal year
2. Tidak bisa update budget yang sudah memiliki usage
3. Tidak bisa delete budget yang statusnya bukan DRAFT
4. Budget period tidak boleh overlap dengan budget ACTIVE lain

### 5.3 Category Budget Rules

1. Available Amount = Allocated - Used - Committed
2. Tidak bisa membuat PR jika Available Amount < Requested Amount
3. Committed amount otomatis berkurang saat invoice masuk
4. Used amount bertambah saat invoice masuk

### 5.4 Approval Workflow

1. Budget DRAFT → ACTIVE: Butuh approval Finance Manager
2. Budget ACTIVE → CLOSED: Automatic atau manual end of year
3. Perubahan status irreversible (tidak bisa rollback)

## 6. Keputusan Teknis

### 6.1 Database Schema

```
asset_budgets
├── id (UUID PK)
├── budget_code (unique)
├── budget_name
├── description
├── fiscal_year
├── start_date
├── end_date
├── total_budget
├── status
└── timestamps

asset_budget_categories
├── id (UUID PK)
├── budget_id (FK)
├── category_id (FK to asset_categories, nullable)
├── category_name
├── allocated_amount
├── used_amount
├── committed_amount
├── notes
└── timestamps
```

### 6.2 Calculation Logic

**Total Budget**:

```
Total Budget = Σ(Allocated Amount per Category)
```

**Available Amount**:

```
Available = Allocated - Used - Committed
```

**Utilization Rate**:

```
Utilization % = ((Used + Committed) / Allocated) × 100
```

### 6.3 Integration Points

1. **Purchase Requisition Creation**:
   - Cek available budget untuk kategori
   - Block jika insufficient budget
   - Update committed amount

2. **Purchase Order Creation**:
   - Validasi budget masih ada
   - Update committed amount (jika PR amount ≠ PO amount)

3. **Invoice Receipt**:
   - Kurangi committed amount
   - Tambah used amount
   - Create asset transaction record

### 6.4 Performance Considerations

- Index pada fiscal_year dan status untuk query budget aktif
- Index pada category_id untuk quick lookup
- Materialized view untuk budget summary (jika data besar)
- Caching untuk form data (categories list)

## 7. API Endpoints

### 7.1 Budget Management

| Method | Endpoint                    | Description       | Permission          |
| ------ | --------------------------- | ----------------- | ------------------- |
| POST   | /finance/budgets            | Create budget     | asset_budget.create |
| GET    | /finance/budgets            | List budgets      | asset_budget.read   |
| GET    | /finance/budgets/:id        | Get budget detail | asset_budget.read   |
| GET    | /finance/budgets/code/:code | Get by code       | asset_budget.read   |
| PUT    | /finance/budgets/:id        | Update budget     | asset_budget.update |
| DELETE | /finance/budgets/:id        | Delete budget     | asset_budget.delete |
| PATCH  | /finance/budgets/:id/status | Change status     | asset_budget.update |
| GET    | /finance/budgets/form-data  | Get form data     | asset_budget.read   |

### 7.2 Request/Response Examples

**Create Budget**:

```json
POST /finance/budgets
{
  "budget_name": "Budget Aset 2026",
  "description": "Anggaran pembelian aset untuk tahun fiskal 2026",
  "fiscal_year": 2026,
  "start_date": "2026-01-01",
  "end_date": "2026-12-31",
  "categories": [
    {
      "category_name": "Office Equipment",
      "allocated_amount": 500000000,
      "notes": "Untuk kebutuhan laptop dan printer"
    },
    {
      "category_id": "uuid-category-vehicles",
      "category_name": "Vehicles",
      "allocated_amount": 2000000000,
      "notes": "Penggantian armada operasional"
    }
  ]
}
```

**Response**:

```json
{
  "success": true,
  "data": {
    "id": "uuid-budget",
    "budget_code": "BUD-0001",
    "budget_name": "Budget Aset 2026",
    "fiscal_year": 2026,
    "total_budget": 2500000000,
    "status": "draft",
    "categories": [...],
    "summary": {
      "total_allocated": 2500000000,
      "total_used": 0,
      "total_committed": 0,
      "total_available": 2500000000,
      "utilization_rate": 0
    }
  }
}
```

## 8. Cara Test Manual

### 6.1 Test Budget Creation

1. Login sebagai Finance Staff
2. Navigate: Finance → Asset Budget → Create
3. Fill form:
   - Budget Name: "Test Budget 2026"
   - Fiscal Year: 2026
   - Period: 2026-01-01 to 2026-12-31
   - Add category: "Office Equipment", Allocated: 100000000
   - Add category: "Vehicles", Allocated: 500000000
4. Click Save
5. Verify: Budget created with status DRAFT

### 6.2 Test Budget Activation

1. Open budget detail (status DRAFT)
2. Click "Activate" button
3. Confirm activation
4. Verify: Status changed to ACTIVE
5. Verify: Budget now available for PR creation

### 6.3 Test Budget Utilization

1. Create Purchase Requisition dengan category "Office Equipment"
2. Request amount: 25000000
3. Verify: PR created successfully (if budget available)
4. Check budget detail
5. Verify: Committed Amount increased by 25M
6. Create PO dari PR tersebut
7. Receive Invoice
8. Verify: Used Amount increased, Committed decreased

### 6.4 Test Insufficient Budget

1. Try create PR dengan amount > Available Amount
2. Verify: Error message "Insufficient budget"
3. Verify: PR creation blocked

### 6.5 Test Budget Closing

1. Open active budget
2. Click "Close Budget"
3. Verify: Status changed to CLOSED
4. Verify: Tidak bisa buat PR lagi dengan budget ini

## 9. Automated Testing

### 7.1 Unit Tests (Backend)

```go
// test usecase
func TestAssetBudgetUsecase_Create(t *testing.T) {
    // Test: create budget success
    // Test: duplicate active budget for same year should fail
    // Test: invalid date range should fail
}

func TestAssetBudgetUsecase_ChangeStatus(t *testing.T) {
    // Test: draft -> active success
    // Test: active -> closed success
    // Test: invalid status transition should fail
    // Test: closed -> active should fail
}

func TestAssetBudget_CategoryCalculations(t *testing.T) {
    // Test: available amount calculation
    // Test: utilization rate calculation
}
```

### 7.2 Integration Tests

```go
func TestBudget_PurchaseIntegration(t *testing.T) {
    // Test: PR creation reduces available budget
    // Test: PO creation updates committed amount
    // Test: Invoice receipt updates used amount
    // Test: Insufficient budget blocks PR
}
```

### 7.3 E2E Tests (Frontend)

```typescript
// Test: Complete budget lifecycle
test("Budget CRUD workflow", async () => {
  // Create budget
  // Activate budget
  // Create PR using budget
  // Close budget
});
```

## 10. Permissions Required

| Permission          | Description                   |
| ------------------- | ----------------------------- |
| asset_budget.read   | View budget list and detail   |
| asset_budget.create | Create new budget             |
| asset_budget.update | Edit budget dan change status |
| asset_budget.delete | Delete draft budget           |

## 11. Dependencies

### 9.1 Internal Modules

- **Asset Category**: Master data untuk kategori budget
- **Purchase Module**: Integrasi untuk PR/PO validation
- **Journal Entry**: Untuk tracking actual spending
- **User/Permission**: Untuk access control

### 9.2 External Dependencies

- Tidak ada external API dependencies

## 12. Rollback Plan

Jika terjadi issue setelah deployment:

1. **Database**: Model sudah menggunakan soft delete (gorm.DeletedAt)
2. **Feature Flag**: Bisa disable route di router jika perlu
3. **Data Migration**: Budget data terpisah dari existing modules, tidak mempengaruhi data existing

## 13. Known Limitations

1. **Budget Revision**: Belum support budget revision (harus buat budget baru)
2. **Multi-Year Budget**: Belum support carry-forward budget
3. **Budget Transfer**: Belum support transfer budget antar kategori
4. **Forecasting**: Belum ada fitur forecasting/analytics

## 14. Future Enhancements

1. **Budget Revision Workflow**: Allow revision dengan approval
2. **Budget Forecasting**: AI-based spending prediction
3. **Budget Variance Analysis**: Detail analysis report
4. **Budget Transfer**: Transfer unused budget ke kategori lain
5. **Multi-Year Budget**: Support multi-year budget planning

## 15. Folder Structure

```
apps/api/internal/finance/
├── data/models/asset_budget.go
├── data/repositories/asset_budget_repository.go
├── domain/dto/asset_budget_dto.go
├── domain/mapper/asset_budget_mapper.go
├── domain/usecase/asset_budget_usecase.go
├── presentation/handler/asset_budget_handler.go
└── presentation/router/asset_budget_routers.go

apps/web/src/features/finance/asset-budgets/
├── components/
├── hooks/
├── services/
├── types/
└── i18n/
```

## 16. Related Links

- [Asset Management](./asset-management.md)
- [Purchase Module](../../purchase/README.md)
- [API Standards](../../api-standart/README.md)

## 17. Notes

- Budget period sebaiknya align dengan fiscal year perusahaan
- Status ACTIVE hanya boleh satu per fiscal year untuk menghindari confusion
- Committed amount penting untuk cash flow planning
- Budget vs Actual report sebaiknya dibuat monthly untuk monitoring
