# Finance Module — Dokumentasi Logic (18 Page)

> **Generated**: 2026-02-21  
> **Stack**: Go (Gin + GORM) backend, React/TypeScript frontend  
> **Architecture**: Clean Architecture (Presentation → Domain/Usecase → Data/Repository → Models)

---

## Daftar 18 Page

| # | Page | Kategori | Lokasi API | Lokasi FE | Status (BE) |
|---|------|----------|------------|-----------|-------------|
| 1 | Chart of Accounts (CoA) | Master Data Finance | `master-data/` | `master-data/finance/chart-of-accounts` | ✅ DONE |
| 2 | Bank | Master Data Finance | `master-data/` | `master-data/finance/bank` | ✅ DONE |
| 3 | Bank Account | Master Data Finance | `master-data/` | `master-data/finance/bank-account` | ✅ DONE |
| 4 | Payment Terms | Master Data Finance | `master-data/` | `master-data/finance/payment-terms` | ✅ DONE |
| 5 | Journal Entries | Finance - Journal | `finance/` | `finance/journal/journal-entries` | ✅ DONE |
| 6 | Adjustment Journal | Finance - Journal | `finance/` | `finance/journal/adjustment-journal` | ✅ DONE |
| 7 | Cash & Bank Transaction | Finance - Journal | `finance/` | `finance/journal/cash-bank-transaction-journal` | ✅ DONE |
| 8 | Purchase Journal | Finance - Journal | `finance/` | `finance/journal/purchase-journal` | ✅ DONE |
| 9 | Sales Journal | Finance - Journal | `finance/` | `finance/journal/sales-journal` | ✅ DONE |
| 10 | Valuation Journal | Finance - Journal | `finance/` | `finance/journal/valuation-journal` | ✅ DONE |
| 11 | General Ledger | Finance | `finance/` | `finance/general-ledger` | ✅ DONE |
| 12 | Balance Sheet | Finance | `finance/` | `finance/balance-sheet` | ✅ DONE |
| 13 | Profit & Loss | Finance | `finance/` | `finance/profit-loss` | ✅ DONE |
| 14 | Budget | Finance | `finance/` | `finance/budget` | ✅ DONE |
| 15 | Base Salary | Finance | `finance/` | `finance/base-salary` | ✅ DONE |
| 16 | Non-Trade Payables | Finance | `finance/` | `finance/non-trade-payables` | ✅ DONE |
| 17 | Up Country Cost | Finance | `finance/` | `finance/up-country-cost` | ✅ DONE |
| 18 | Asset Management | Finance | `finance/` | `finance/asset-management/*` | ✅ DONE |

---

## Relasi Antar Modul (Relationship Map)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MASTER DATA FINANCE                          │
│  ┌──────────────┐  ┌──────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ Chart of     │  │  Bank    │  │ Bank Account │  │  Payment    │ │
│  │ Accounts(CoA)│  │          │  │              │  │  Terms      │ │
│  └──────┬───────┘  └────┬─────┘  └──────┬───────┘  └──────┬──────┘ │
└─────────┼───────────────┼───────────────┼──────────────────┼────────┘
          │               │               │                  │
          ▼               │               ▼                  │
┌─────────────────────────┼───────────────────────────────────┼───────┐
│  JOURNAL SYSTEM         │                                   │       │
│  ┌─────────────────┐    │    ┌───────────────────────┐      │       │
│  │  JournalEntry   │◄───┼────┤ All transactional     │      │       │
│  │  (entry_date,   │    │    │ modules auto-create   │      │       │
│  │   ref_type,     │    │    │ journal entries on     │      │       │
│  │   ref_id)       │    │    │ approval/confirmation  │      │       │
│  └────────┬────────┘    │    └───────────────────────┘      │       │
│           │             │                                   │       │
│  ┌────────▼────────┐    │                                   │       │
│  │  JournalLine    │    │                                   │       │
│  │  (coa_id,       │    │                                   │       │
│  │   debit,credit) │────┼──► CoA                            │       │
│  └─────────────────┘    │                                   │       │
│                         │                                   │       │
│  Journal Views:         │                                   │       │
│  • Adjustment Journal ──┼── ref_type = "ADJUSTMENT"         │       │
│  • Cash Bank Journal  ──┼── ref_type = "CASH_BANK"          │       │
│  • Purchase Journal   ──┼── ref_type = "PO" / "GR"         │       │
│  • Sales Journal      ──┼── ref_type = "SO" / "DO"         │       │
│  • Valuation Journal  ──┼── ref_type = "STOCK_OP"          │       │
│  • Journal Entries    ──┼── ALL ref_types                   │       │
└─────────────────────────┼───────────────────────────────────┼───────┘
                          │                                   │
┌─────────────────────────┼───────────────────────────────────┼───────┐
│  FINANCIAL REPORTS      │                                   │       │
│  ┌────────────────┐     │     ┌─────────────────┐           │       │
│  │ General Ledger │─────┼────►│ Reads from CoA  │           │       │
│  │ (per-account)  │     │     │ + JournalLines  │           │       │
│  └────────────────┘     │     └─────────────────┘           │       │
│  ┌────────────────┐     │                                   │       │
│  │ Balance Sheet  │─────┼────► Aggregates ASSET/LIABILITY/  │       │
│  │                │     │     EQUITY accounts from CoA      │       │
│  └────────────────┘     │                                   │       │
│  ┌────────────────┐     │                                   │       │
│  │ Profit & Loss  │─────┼────► Aggregates REVENUE/EXPENSE   │       │
│  │                │     │     accounts from CoA              │       │
│  └────────────────┘     │                                   │       │
└─────────────────────────┼───────────────────────────────────┼───────┘
                          │                                   │
┌─────────────────────────┼───────────────────────────────────┼───────┐
│  TRANSACTIONAL MODULES  │                                   │       │
│  ┌────────────────┐     │                                   │       │
│  │ Budget         │─────┼────► Links CoA + Division         │       │
│  │ (plan vs act.) │     │     Actual from JournalLines      │       │
│  └────────────────┘     │                                   │       │
│  ┌────────────────┐     │                                   │       │
│  │ Base Salary    │─────┼────► Links Employee (master-data) │       │
│  └────────────────┘     │                                   │       │
│  ┌────────────────┐     │     ┌──────────────────┐          │       │
│  │ Non-Trade      │─────┼────►│ Payment (method, │──► BankAccount  │
│  │ Payables       │     │     │  allocations)    │          │       │
│  └────────────────┘     │     └──────────────────┘          │       │
│  ┌────────────────┐     │                                   │       │
│  │ Up Country Cost│─────┼────► Employees + CostItems        │       │
│  └────────────────┘     │                                   │       │
│  ┌───────────────────────────────────────────────┐          │       │
│  │ ASSET MANAGEMENT                               │          │       │
│  │ ┌──────────┐ ┌──────────┐ ┌──────────────┐    │          │       │
│  │ │ Category │ │ Location │ │ Asset List   │    │          │       │
│  │ └────┬─────┘ └────┬─────┘ └──────┬───────┘    │          │       │
│  │      │            │              │             │          │       │
│  │      │            │    ┌─────────▼──────────┐  │          │       │
│  │      └────────────┼───►│ Asset Transaction  │──┼──► Creates JE  │
│  │                   │    └────────────────────┘  │          │       │
│  │                   │    ┌────────────────────┐  │          │       │
│  │                   └───►│ Asset Depreciation │──┼──► Creates JE  │
│  │                        └────────────────────┘  │          │       │
│  └────────────────────────────────────────────────┘          │       │
└──────────────────────────────────────────────────────────────┼───────┘
                                                               │
                    ┌──────────────────────────────────────────┘
                    │ CROSS-MODULE:
                    │ • Purchase Module → Purchase Journal (PO, GR, Supplier Invoice)
                    │ • Sales Module    → Sales Journal (SO, DO, Customer Invoice)
                    │ • Stock Module    → Valuation Journal (Stock Opname)
                    └──────────────────────────────────────────────────
```

---

## 1. Chart of Accounts (CoA) [BACKEND DONE]

### Logic
- **CRUD dasar** untuk mengelola daftar akun keuangan (bagan akun).
- Struktur **self-referential** (parent-child) untuk hirarki akun.
- Setiap akun punya `Code` (unique), `Name`, `Type`, dan optional `ParentID`.
- Digunakan oleh **semua modul journal** sebagai referensi akun debit/kredit.
- Batch create untuk import massal.

### Model
```go
type AccountType string
const (
    AccountAsset           AccountType = "ASSET"
    AccountLiability       AccountType = "LIABILITY"
    AccountEquity          AccountType = "EQUITY"
    AccountRevenue         AccountType = "REVENUE"
    AccountExpense         AccountType = "EXPENSE"
    AccountCashBank        AccountType = "CASH_BANK"
    AccountCurrentAsset    AccountType = "CURRENT_ASSET"
    AccountFixedAsset      AccountType = "FIXED_ASSET"
    AccountTradePayable    AccountType = "TRADE_PAYABLE"
    AccountCOGS            AccountType = "COST_OF_GOODS_SOLD"
    AccountSalaryWages     AccountType = "SALARY_WAGES"
    AccountOperational     AccountType = "OPERATIONAL"
    // ... more sub-types
)

type ChartOfAccount struct {
    gorm.Model
    Code     string      `gorm:"type:varchar(20);unique;not null"`
    Name     string      `gorm:"type:varchar(100);not null"`
    Type     AccountType `gorm:"type:varchar(20);not null"`
    ParentID *uint       `gorm:"index"` // nullable → root account

    Parent       *ChartOfAccount  `gorm:"foreignKey:ParentID"`
    Children     []ChartOfAccount `gorm:"foreignKey:ParentID"`
    JournalLines []JournalLine    `gorm:"foreignKey:ChartOfAccountID"`
}
```

### API Operations
```go
func (uc *ChartOfAccountUsecase) GetAll(page, limit int, search, searchBy, sortBy, sortOrder, startDate, endDate string) ([]models.ChartOfAccount, int64, error)
func (uc *ChartOfAccountUsecase) GetAllRaw() ([]models.ChartOfAccount, error)
func (uc *ChartOfAccountUsecase) GetByID(id uint) (*models.ChartOfAccount, error)
func (uc *ChartOfAccountUsecase) Create(item *models.ChartOfAccount) error
func (uc *ChartOfAccountUsecase) Update(item *models.ChartOfAccount) error
func (uc *ChartOfAccountUsecase) Delete(id uint) error
func (uc *ChartOfAccountUsecase) GetCount() (int64, error)
func (uc *ChartOfAccountUsecase) CreateBatch(items []models.ChartOfAccount) error
```

### Relasi
- **Digunakan oleh**: JournalLine, BudgetItem, BankAccount, NonTradePayable, PaymentAllocation
- **Parent-child**: Self-referencing untuk hirarki akun (Assets → Current Assets → Cash)

---

## 2. Bank [BACKEND DONE]

### Logic
- **CRUD dasar** — tabel referensi sederhana untuk nama bank.
- Batch create untuk import.
- Digunakan sebagai referensi dari Bank Account.

### Model
```go
type Bank struct {
    gorm.Model
    Name string `gorm:"size:100;not null" json:"name"`
}
```

### API Operations
```go
func (uc *BankUsecase) GetAll(page, limit int, ...) ([]models.Bank, int64, error)
func (uc *BankUsecase) GetAllRaw() ([]models.Bank, error)
func (uc *BankUsecase) GetByID(id uint) (*models.Bank, error)
func (uc *BankUsecase) Create(item *models.Bank) error
func (uc *BankUsecase) Update(item *models.Bank) error
func (uc *BankUsecase) Delete(id uint) error
func (uc *BankUsecase) GetCount() (int64, error)
func (uc *BankUsecase) CreateBatch(items []models.Bank) error
```

### Relasi
- **Digunakan oleh**: Bank Account (sebagai referensi bank)

---

## 3. Bank Account [BACKEND DONE]

### Logic
- **CRUD** untuk rekening bank perusahaan.
- Setiap bank account terhubung ke **Chart of Account** (tipe CASH_BANK) dan **Village** (lokasi).
- Digunakan di proses payment (Non-Trade Payables, Purchase Payment, dll).
- Batch create untuk import massal.

### Model
```go
type BankAccount struct {
    gorm.Model
    ChartOfAccountID uint   `gorm:"not null;index"`
    VillageID        uint   `gorm:"not null;index"`
    Name             string `gorm:"size:100;not null"`
    AccountNumber    string `gorm:"size:50;not null;uniqueIndex"`
    AccountHolder    string `gorm:"size:100;not null"`
    Currency         string `gorm:"size:10;not null"` // IDR, USD
    IsActive         bool   `gorm:"default:true;not null"`
    BankAddress      string `gorm:"size:255"`
    BankPhone        string `gorm:"size:20"`

    ChartOfAccount ChartOfAccount           `gorm:"constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;"`
    Village        masterDataModels.Village `gorm:"constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;"`
}
```

### API Operations
```go
func (uc *BankAccountUsecase) GetAll(page, limit int, ...) ([]models.BankAccount, int64, error)
func (uc *BankAccountUsecase) GetAllRaw() ([]models.BankAccount, error)
func (uc *BankAccountUsecase) GetByID(id uint) (*models.BankAccount, error)
func (uc *BankAccountUsecase) Create(item *models.BankAccount) error
func (uc *BankAccountUsecase) Update(item *models.BankAccount) error
func (uc *BankAccountUsecase) Delete(id uint) error
func (uc *BankAccountUsecase) GetCount() (int64, error)
func (uc *BankAccountUsecase) CreateBatch(items []models.BankAccount) error
```

### Relasi
- **Depends on**: ChartOfAccount (CoA), Village (master-data geography)
- **Digunakan oleh**: Payment (Non-Trade Payable payment, Purchase/Sales payment)

---

## 4. Payment Terms [BACKEND DONE]

### Logic
- **CRUD** untuk syarat pembayaran (NET 30, COD, dll).
- Field `Days` menentukan jatuh tempo pembayaran dari tanggal invoice.
- `IsActive` flag untuk enable/disable.
- Digunakan di modul Purchase dan Sales.

### Model
```go
type PaymentTerms struct {
    gorm.Model
    Name        string `gorm:"size:100;not null;uniqueIndex"`
    Description string `gorm:"type:text"`
    Days        int    `gorm:"not null;default:0"` // jatuh tempo X hari
    IsActive    bool   `gorm:"not null"`
}
```

### API Operations
```go
func (uc *PaymentTermsUsecase) GetAll(page, limit int, ...) ([]models.PaymentTerms, int64, error)
func (uc *PaymentTermsUsecase) GetAllRaw() ([]models.PaymentTerms, error)
func (uc *PaymentTermsUsecase) GetByID(id uint) (*models.PaymentTerms, error)
func (uc *PaymentTermsUsecase) Create(item *models.PaymentTerms) error
func (uc *PaymentTermsUsecase) Update(item *models.PaymentTerms) error
func (uc *PaymentTermsUsecase) Delete(id uint) error
func (uc *PaymentTermsUsecase) GetCount() (int64, error)
func (uc *PaymentTermsUsecase) CreateBatch(items []models.PaymentTerms) error
```

### Relasi
- **Digunakan oleh**: Purchase Order, Sales Order, Supplier Invoice, Customer Invoice

---

## 5. Journal Entries [BACKEND DONE]

### Logic
- **Read-only** — menampilkan **semua** jurnal dari semua sumber (semua `ReferenceType`).
- Mendukung pagination, search, sort, dan filter tanggal.
- Mengembalikan total debit & credit.
- Jurnal dibuat otomatis oleh modul lain (adjustment, cash bank, purchase, sales, valuation, asset, NTP, up country cost).

### Model
```go
type ReferenceType string
const (
    RefSO                ReferenceType = "SO"          // Sales Order
    RefPO                ReferenceType = "PO"          // Purchase Order
    RefDO                ReferenceType = "DO"          // Delivery Order
    RefGR                ReferenceType = "GR"          // Goods Receipt
    RefStockOpname       ReferenceType = "STOCK_OP"    // Stock Opname
    RefAdjustment        ReferenceType = "ADJUSTMENT"  // Adjustment
    RefNonTradePayable   ReferenceType = "NTP"         // Non-Trade Payable
    RefPayment           ReferenceType = "PAYMENT"     // Payment
    RefAssetTransaction  ReferenceType = "ASSET_TXN"   // Asset Transaction
    RefAssetDepreciation ReferenceType = "ASSET_DEP"   // Asset Depreciation
    RefCashBank          ReferenceType = "CASH_BANK"   // Cash Bank
    RefUpCountryCost     ReferenceType = "UP_COUNTRY"  // Up Country Cost
)

type JournalEntry struct {
    gorm.Model
    EntryDate     time.Time     `gorm:"not null"`
    Description   string        `gorm:"type:text"`
    ReferenceType ReferenceType `gorm:"type:varchar(10);not null"`
    ReferenceID   uint          `gorm:"null"`

    Lines []JournalLine `gorm:"foreignKey:JournalEntryID"`
}

type JournalLine struct {
    gorm.Model
    JournalEntryID   uint    `gorm:"not null"`
    ChartOfAccountID uint    `gorm:"not null"`
    Debit            float64 `gorm:"default:0"`
    Credit           float64 `gorm:"default:0"`

    JournalEntry   JournalEntry   `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
    ChartOfAccount ChartOfAccount `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
}
```

### API Operations
```go
func (uc *JournalEntryUsecase) List(page, limit int, search, searchBy, sortBy, sortOrder, startDate, endDate string) ([]financeModels.JournalEntry, int64, float64, float64, error)
func (uc *JournalEntryUsecase) GetByID(id uint) (*financeModels.JournalEntry, error)
```

### Journal Posting Utility (Shared)
```go
// PostJournal — digunakan oleh semua modul yang membuat jurnal
func PostJournal(tx *gorm.DB, refType ReferenceType, refID uint, description string, date time.Time, lines []JournalPostLine) error {
    // 1. Validasi: harus ada lines
    // 2. Validasi: total debit == total credit (balanced)
    // 3. Create JournalEntry
    // 4. Untuk setiap line: cari CoA by code, create JournalLine
}

// PostOrUpdateJournal — update jika sudah ada, create jika belum
func PostOrUpdateJournal(tx *gorm.DB, refType, refID, description, date, lines) error {
    // 1. Cek existing entry by ref_type + ref_id + description
    // 2. Jika ada: hapus lines lama, buat lines baru
    // 3. Jika belum: panggil PostJournal
}
```

### Relasi
- **Central hub**: Semua modul transaksional menulis ke JournalEntry + JournalLine
- **Read by**: General Ledger, Balance Sheet, Profit & Loss, Budget (actual calculation)

---

## 6. Adjustment Journal [BACKEND DONE]

### Logic
- **CRUD** untuk jurnal penyesuaian manual.
- Filter by `ReferenceType = "ADJUSTMENT"`.
- Saat create/update: user memilih **CoA** untuk debit dan kredit.
- Support export data dengan filter tanggal.

### API Operations
```go
func (uc *AdjustmentJournalUsecase) GetAll(page, limit int, search, searchBy, sortBy, sortOrder, startDate, endDate string) ([]models.JournalEntry, int64, error)
func (uc *AdjustmentJournalUsecase) GetByID(id uint) (*models.JournalEntry, error)
func (uc *AdjustmentJournalUsecase) Create(item *models.JournalEntry) error
func (uc *AdjustmentJournalUsecase) Update(item *models.JournalEntry) error
func (uc *AdjustmentJournalUsecase) Delete(id uint) error
func (uc *AdjustmentJournalUsecase) GetCount() (int64, error)
func (uc *AdjustmentJournalUsecase) GetChartOfAccounts() ([]models.ChartOfAccount, error)
func (uc *AdjustmentJournalUsecase) Export(startDate, endDate string) ([]models.JournalEntry, error)
```

### Relasi
- **Creates**: JournalEntry (ref_type = ADJUSTMENT)
- **Depends on**: ChartOfAccount (pilihan akun debit/kredit)

---

## 7. Cash & Bank Transaction Journal [BACKEND DONE]

### Logic
- Mengelola transaksi kas & bank. **Dua fase workflow**:

#### Fase 1: Draft (CashBankJournal)
- Create draft transaksi dengan tipe: `in` (masuk), `out` (keluar), `transfer`.
- Pilih primary CoA (akun kas/bank utama) dan line items (akun lawan).
- Status: `draft` → `confirmed`.

#### Fase 2: Confirmed (JournalEntry)  
- Saat confirm: draft dikonversi menjadi JournalEntry resmi.
- Auto-create journal lines dari draft lines.

#### Statistics & Dashboard
- Total cash in/out (keseluruhan dan per tahun)
- Monthly stats per tahun
- Transaction type stats (in/out/transfer)
- Top accounts by volume
- Recent transactions

### Model (Draft)
```go
type CashBankJournal struct {
    gorm.Model
    EntryDate               time.Time
    Description             string
    Type                    CashBankJournalType   // "in", "out", "transfer"
    PrimaryChartOfAccountID uint                  // akun kas/bank utama
    Status                  CashBankJournalStatus // "draft", "confirmed"
    JournalEntryID          *uint                 // referensi ke JournalEntry setelah confirm

    PrimaryChartOfAccount ChartOfAccount
    JournalEntry          *JournalEntry
    Lines                 []CashBankJournalLine
}

type CashBankJournalLine struct {
    gorm.Model
    CashBankJournalID uint
    ChartOfAccountID  uint
    Amount            float64
}
```

### API Operations
```go
// Confirmed journal entries
func (uc) GetAll(page, limit, search, ...) ([]models.JournalEntry, int64, error)
func (uc) GetByID(id uint) (*models.JournalEntry, error)
func (uc) Create(item *models.JournalEntry) error
func (uc) Export(startDate, endDate string) ([]models.JournalEntry, error)
func (uc) GetTotalCashInOut() (float64, float64, error)
func (uc) GetMonthlyStatsByYear(year int) ([]map[string]interface{}, error)

// Draft cash bank journals
func (uc) GetAllCashBankJournals(page, limit, ...) ([]models.CashBankJournal, int64, error)
func (uc) CreateCashBankJournal(item *models.CashBankJournal) error
func (uc) UpdateCashBankJournal(item *models.CashBankJournal) error
func (uc) DeleteCashBankJournal(id uint) error
func (uc) ConfirmCashBankJournal(id uint) (*models.JournalEntry, error)  // draft → confirmed
```

### Relasi
- **Creates**: JournalEntry (ref_type = CASH_BANK)
- **Depends on**: ChartOfAccount (akun kas/bank + akun lawan)

---

## 8. Purchase Journal [BACKEND DONE]

### Logic
- **Read-only view** dari jurnal yang terkait pembelian.
- Filter by `ReferenceType IN ("PO", "GR")`.
- Jurnal **dibuat otomatis** oleh modul Purchase saat:
  - Purchase Order di-approve
  - Goods Receipt dibuat
  - Supplier Invoice dibuat
- Bisa melihat detail referensi (PO, Supplier Invoice, Goods Receipt).

### API Operations
```go
func (uc *PurchaseJournalUsecase) GetAll(page, limit, search, ...) ([]JournalEntry, int64, error)
func (uc *PurchaseJournalUsecase) GetByID(id uint) (*JournalEntry, error)
func (uc *PurchaseJournalUsecase) GetCount() (int64, error)
func (uc *PurchaseJournalUsecase) GetTotalDebitCredit() (float64, float64, error)
func (uc *PurchaseJournalUsecase) GetCountByYear(year int) (int64, error)
func (uc *PurchaseJournalUsecase) GetTotalDebitCreditByYear(year int) (float64, float64, error)
func (uc *PurchaseJournalUsecase) GetMonthlyStatsByYear(year int) ([]map[string]interface{}, error)

// Cross-module reference lookup
func (uc) GetPurchaseOrderByReferenceID(refType, refID) (*purchaseModels.PurchaseOrder, error)
func (uc) GetSupplierInvoiceByReferenceID(refID) (*purchaseModels.SupplierInvoice, error)
func (uc) GetGoodsReceiptByReferenceID(refID) (*purchaseModels.GoodsReceipt, error)
```

### Relasi
- **Reads from**: JournalEntry (filtered by PO/GR ref_type)
- **Cross-module**: Purchase module (PurchaseOrder, SupplierInvoice, GoodsReceipt)

---

## 9. Sales Journal [BACKEND DONE]

### Logic
- **Read-only view** dari jurnal yang terkait penjualan.
- Filter by `ReferenceType IN ("SO", "DO")`.
- Jurnal **dibuat otomatis** oleh modul Sales saat:
  - Sales Order di-approve
  - Delivery Order dibuat
  - Customer Invoice dibuat
- Bisa melihat detail referensi (SO, Customer Invoice, Delivery Order).

### API Operations
```go
func (uc *SalesJournalUsecase) GetAll(page, limit, search, ...) ([]JournalEntry, int64, error)
func (uc *SalesJournalUsecase) GetByID(id uint) (*JournalEntry, error)
func (uc *SalesJournalUsecase) GetCount() (int64, error)
func (uc *SalesJournalUsecase) GetTotalDebitCredit() (float64, float64, error)
func (uc *SalesJournalUsecase) GetCountByYear(year int) (int64, error)
func (uc *SalesJournalUsecase) GetMonthlyStatsByYear(year int) ([]map[string]interface{}, error)

// Cross-module reference lookup
func (uc) GetSalesOrderByReferenceID(refType, refID) (*salesModels.SalesOrder, error)
func (uc) GetCustomerInvoiceByReferenceID(refID) (*salesModels.CustomerInvoice, error)
func (uc) GetDeliveryOrderByReferenceID(refID) (*salesModels.DeliveryOrder, error)
```

### Relasi
- **Reads from**: JournalEntry (filtered by SO/DO ref_type)
- **Cross-module**: Sales module (SalesOrder, CustomerInvoice, DeliveryOrder)

---

## 10. Valuation Journal [BACKEND DONE]

### Logic
- **Read-only view** dari jurnal valuasi stok.
- Filter by `ReferenceType = "STOCK_OP"` (Stock Opname).
- Jurnal **dibuat otomatis** oleh modul Stock saat stock opname diselesaikan.
- Menyediakan **stock movement stats** (in/out).
- Bisa melihat detail stock movements per referensi.

### API Operations
```go
func (uc *ValuationJournalUsecase) GetAll(page, limit, ...) ([]JournalEntry, int64, error)
func (uc *ValuationJournalUsecase) GetByID(id uint) (*JournalEntry, error)
func (uc *ValuationJournalUsecase) GetCount() (int64, error)
func (uc *ValuationJournalUsecase) GetTotalDebitCredit() (float64, float64, error)
func (uc *ValuationJournalUsecase) GetMonthlyStatsByYear(year int) ([]map[string]interface{}, error)

// Stock movement analysis
func (uc) GetStockMovementStats() (map[string]interface{}, error)
func (uc) GetStockMovementStatsByYear(year int) (map[string]interface{}, error)
func (uc) GetStockMovementsByReferenceID(refType, refID) ([]dto.StockMovementInfo, error)
func (uc) GetReferenceDocumentInfo(refType, refID) (*dto.ReferenceDocumentInfo, error)
```

### Relasi
- **Reads from**: JournalEntry (filtered by STOCK_OP ref_type)
- **Cross-module**: Stock module (StockOpname, stock movements)

---

## 11. General Ledger [BACKEND DONE]

### Logic
- **Report view** — menampilkan saldo dan pergerakan per akun CoA.
- Menyediakan **detail per akun**: semua JournalLine untuk akun tertentu.
- Filter berdasarkan tanggal dan account ID.
- Export ke Excel.
- Stats: ringkasan total debit/credit/balance.

### API Operations
```go
func (uc *GeneralLedgerUsecase) List(startDate, endDate, accountID string) ([]ChartOfAccount, error)
func (uc *GeneralLedgerUsecase) ListWithPagination(page, limit, search, searchBy, sortBy, sortOrder, startDate, endDate, accountID string) ([]ChartOfAccount, int64, error)
func (uc *GeneralLedgerUsecase) Stats(startDate, endDate string) (map[string]interface{}, error)
func (uc *GeneralLedgerUsecase) Export(startDate, endDate, accountID string) ([]ChartOfAccount, error)
func (uc *GeneralLedgerUsecase) AccountDetail(accountID string, page, limit int, startDate, endDate string) ([]JournalLine, int64, float64, float64, error)
func (uc *GeneralLedgerUsecase) GetAccountByID(accountID string) (*ChartOfAccount, error)
```

### Relasi
- **Reads from**: ChartOfAccount + JournalLine (aggregated)
- **Depends on**: JournalEntry (semua transaksi yang sudah di-post)

---

## 12. Balance Sheet (Neraca) [BACKEND DONE] [FRONTEND DONE]

### Logic
- **Report view** — laporan neraca: Assets = Liabilities + Equity.
- Mengambil data dari CoA yang bertipe ASSET, LIABILITY, EQUITY.
- Menghitung saldo dari JournalLines.
- Filter berdasarkan `end_date` (tanggal cut-off).
- Export ke Excel.

### API Operations
```go
func (u *BalanceSheetUsecase) GetBalanceSheet(req financeDto.BalanceSheetRequest) (*financeDto.BalanceSheetListResponse, error) {
    // 1. Get balance sheet data dari repository (aggregate CoA by type)
    // 2. Build meta info (filter, search, searchable columns)
    // 3. Return response
}

func (u *BalanceSheetUsecase) GetAllForExport(endDate, sortBy, searchBy, search string) (*financeDto.BalanceSheetResponse, error)
```

### Relasi
- **Reads from**: ChartOfAccount (ASSET, LIABILITY, EQUITY types) + JournalLine
- **Pure report**: Tidak membuat/mengubah data

---

## 13. Profit & Loss (Laba Rugi) [BACKEND DONE]

### Logic
- **Report view** — laporan laba rugi: Revenue - Expenses = Net Profit/Loss.
- Mengambil data dari CoA bertipe REVENUE dan EXPENSE.
- Filter berdasarkan `start_date` dan `end_date`.
- Export ke Excel.

### API Operations
```go
func (u *ProfitLossUsecase) GetProfitLoss(req financeDto.ProfitLossRequest) (*financeDto.ProfitLossListResponse, error) {
    // 1. Get P&L data dari repository (aggregate revenue vs expense)
    // 2. Build meta info
    // 3. Return response
}

func (u *ProfitLossUsecase) GetAllForExport(startDate, endDate, sortBy, searchBy, search string) (*financeDto.ProfitLossResponse, error)
```

### Relasi
- **Reads from**: ChartOfAccount (REVENUE, EXPENSE types) + JournalLine
- **Pure report**: Tidak membuat/mengubah data

---

## 14. Budget [BACKEND DONE]

### Logic
- **CRUD** + **status workflow** untuk perencanaan anggaran.
- Budget terhubung ke **Division** dan **User** (created by).
- Setiap budget punya **BudgetItems** (detail per CoA per bulan/tahun).
- **Actual amount** dihitung dari JournalLines (comparasi plan vs actual).

#### Status Workflow
```
DRAFT → APPROVED → CLOSED
  ↓
REJECTED → (back to DRAFT for revision)
```

#### Business Rules
```go
// Status transition rules
func (uc) CanDelete(status BudgetStatus) bool  { return status == BudgetDraft }
func (uc) CanUpdate(status BudgetStatus) bool  { return status == BudgetDraft || status == BudgetRejected }
func (uc) CanApprove(status BudgetStatus) bool { return status == BudgetDraft }
func (uc) CanReject(status BudgetStatus) bool  { return status == BudgetDraft }
func (uc) CanClose(status BudgetStatus) bool   { return status == BudgetApproved }

func (uc) GetValidStatusTransitions(currentStatus BudgetStatus) []BudgetStatus {
    switch currentStatus {
    case BudgetDraft:    return []BudgetStatus{BudgetApproved, BudgetRejected}
    case BudgetApproved: return []BudgetStatus{BudgetClosed}
    case BudgetRejected: return []BudgetStatus{BudgetDraft}
    case BudgetClosed:   return []BudgetStatus{} // terminal
    }
}
```

### Model
```go
type Budget struct {
    gorm.Model
    DivisionID  uint         `gorm:"not null;index"`
    Name        string       `gorm:"type:varchar(100);not null"`
    PeriodType  PeriodType   // "MONTHLY", "YEARLY", "QUARTERLY"
    PeriodStart time.Time
    PeriodEnd   time.Time
    CreatedBy   uint
    Status      BudgetStatus // "DRAFT", "APPROVED", "REJECTED", "CLOSED"
    Notes       string

    BudgetItems []BudgetItem
    Division    masterModels.Division
    User        authModels.User
}

type BudgetItem struct {
    gorm.Model
    BudgetID         uint
    ChartOfAccountID uint
    PlannedAmount    float64
    Month            *uint  // nullable untuk yearly
    Year             uint
    Notes            string

    Budget         Budget
    ChartOfAccount ChartOfAccount
}
```

### API Operations
```go
func (uc *BudgetUsecase) GetAll / GetByID / Create / Update / Delete
func (uc *BudgetUsecase) UpdateBudgetWithItems(budget *models.Budget, items []models.BudgetItem) error
func (uc *BudgetUsecase) UpdateBudgetItemsAdvanced(budgetID uint, add, update, delete []BudgetItem) error
func (uc *BudgetUsecase) ApproveBudget(id uint) error
func (uc *BudgetUsecase) RejectBudget(id uint) error
func (uc *BudgetUsecase) CloseBudget(id uint) error
func (uc *BudgetUsecase) CalculateActualAmountFromJournalLines(item *BudgetItem, budget *Budget) (float64, error)
func (uc *BudgetUsecase) GetStatusCounts() (map[string]int64, error)
```

### Relasi
- **Depends on**: Division (master-data), User (auth), ChartOfAccount
- **Reads from**: JournalLine (untuk menghitung actual amount)

---

## 15. Base Salary (Struktur Gaji) [BACKEND DONE]

### Logic
- **CRUD** + **approval workflow** untuk struktur gaji karyawan.
- Setiap record terhubung ke **Employee** (master-data).
- **Hanya satu** salary structure yang ACTIVE per karyawan.

#### Status Workflow
```
Draft → ACTIVE (approve → deaktivasi salary lama) 
      → INACTIVE (saat ada salary baru yang di-approve)
```

#### Business Rules
- Saat approve: salary lama karyawan tersebut otomatis di-INACTIVE-kan.
- `GetEmployeesWithoutDraftSalary()` — untuk menampilkan employee yang belum punya draft salary.
- `GetSalaryByEffectiveDate()` — grouping by effective date.

### Model
```go
type SalaryStructure struct {
    gorm.Model
    EmployeeID    uint                  `gorm:"not null"`
    EffectiveDate time.Time             `gorm:"type:date;not null"`
    BasicSalary   float64               `gorm:"type:decimal(15,2);not null"`
    Notes         string
    Status        SalaryStructureStatus // "Draft", "ACTIVE", "INACTIVE"

    Employee MasterDataModels.Employee
}
```

### API Operations
```go
func (uc *BaseSalaryUsecase) GetAll / GetByID / Create / Update / Delete
func (uc *BaseSalaryUsecase) GetByEmployeeID(employeeID uint) ([]models.SalaryStructure, error)
func (uc *BaseSalaryUsecase) ApproveSalaryStructure(id uint) error  // activate & deactivate old
func (uc *BaseSalaryUsecase) GetActiveSalaryByEmployeeID(employeeID uint) (*models.SalaryStructure, error)
func (uc *BaseSalaryUsecase) GetSalaryStatistics() (map[string]interface{}, error)
func (uc *BaseSalaryUsecase) GetEmployeesWithoutDraftSalary() ([]EmployeeWithoutDraftSalary, error)
func (uc *BaseSalaryUsecase) GetSalaryByEffectiveDate() ([]SalaryByDateData, error)
```

### Relasi
- **Depends on**: Employee (master-data)
- **One active per employee**: Unique constraint di business logic

---

## 16. Non-Trade Payables (Hutang Non-Dagang) [BACKEND DONE]

### Logic
- **CRUD** + **status workflow** + **payment management** untuk hutang non-dagang.
- Auto-generate code saat create dan update.
- Reference type: SUPPLIER, EMPLOYEE, atau OTHER.
- Support **partial payment** dan **full payment**.

#### Status Workflow
```
DRAFT → APPROVED → PAID
  ↓
CANCELLED
```

#### Business Rules
```go
func (uc) Create(item *NonTradePayable) error {
    // 1. Auto-generate code (format: NTP-YYYYMM-XXXX)
    // 2. Set status = DRAFT
    // 3. Save
}

func (uc) Update(item *NonTradePayable) error {
    // 1. Cek existing: harus status DRAFT
    // 2. Auto-generate code baru
    // 3. Save
}

func (uc) Delete(id uint) error {
    // Hanya bisa delete yang status DRAFT
}
```

#### Payment Flow
```go
func (uc) Approve(id uint) error
// → Creates JournalEntry: Debit Expense CoA, Credit NTP CoA

func (uc) CreatePayment(id uint, paymentDate, bankAccountID, amount, method) error
// → Creates Payment record
// → Creates JournalEntry: Debit NTP CoA, Credit Cash/Bank CoA
// → Update NTP status ke PAID jika fully paid
```

### Model
```go
type NonTradePayable struct {
    gorm.Model
    Code             string                       `gorm:"type:varchar(50);unique;not null"`
    ReferenceType    NonTradePayableReferenceType  // "SUPPLIER", "EMPLOYEE", "OTHER"
    ReferenceID      *uint                         // nullable FK ke supplier/employee
    ChartOfAccountID uint
    Description      string
    Amount           float64
    Date             time.Time
    DueDate          time.Time
    Status           NonTradePayableStatus         // "DRAFT", "APPROVED", "PAID", "CANCELLED"

    ChartOfAccount *ChartOfAccount
}

type Payment struct {
    gorm.Model
    ReferenceID     uint
    ReferenceType   PaymentReferenceType // "SUPPLIER_INVOICE", "CUSTOMER_INVOICE", "NON_TRADE_PAYABLE"
    PaymentDate     time.Time
    BankAccountID   *uint
    Amount          float64
    RemainingAmount float64
    Method          PaymentMethod // "CASH", "BANK"
    Status          PaymentStatus // "PENDING", "CONFIRMED"
    Notes           string
    CreatedBy       uint

    Allocations []PaymentAllocation // split payment ke multiple CoA
}

type PaymentAllocation struct {
    gorm.Model
    PaymentID        uint
    ChartOfAccountID uint
    Amount           float64
}
```

### Relasi
- **Depends on**: ChartOfAccount, BankAccount
- **Creates**: JournalEntry (ref_type = NTP dan PAYMENT)
- **Has many**: Payment → PaymentAllocation

---

### 17. Up Country Cost [BACKEND DONE] [FRONTEND DONE]

### Logic
- **CRUD** + **approval workflow** untuk biaya perjalanan dinas.
- Setiap record punya **employees** (siapa yang berangkat) dan **cost items** (detail biaya).
- Auto-generate code.
- Dashboard statistics per tahun.

#### Status Workflow
```
DRAFT → APPROVED (creates journal entry)
```

### Model
```go
type UpCountryCost struct {
    gorm.Model
    Code      string              `gorm:"type:varchar(50);unique;not null"`
    Purpose   string
    Location  string
    StartDate string
    EndDate   string
    Status    UpCountryCostStatus // "DRAFT", "APPROVED"
    CreatedBy uint
    Notes     string

    Employees []UpCountryCostEmployee
    Items     []UpCountryCostItem
}

type UpCountryCostEmployee struct {
    gorm.Model
    UpCountryCostID uint
    EmployeeID      uint

    Employee MasterDataModels.Employee
}

type UpCountryCostItem struct {
    gorm.Model
    UpCountryCostID uint
    CostType        CostType // "TRANSPORT", "ACCOMMODATION", "MEAL", "FUEL", "OTHER"
    Description     string
    Amount          float64
}
```

### API Operations
```go
func (uc *UpCountryCostUsecase) GetAll / GetByID / Create / Update / Delete
func (uc *UpCountryCostUsecase) ApproveUpCountryCost(id uint) error  // → creates JournalEntry
func (uc *UpCountryCostUsecase) GetUpCountryCostStatistics() (map[string]interface{}, error)
func (uc *UpCountryCostUsecase) GetUpCountryCostStatisticsByYear(year int) (map[string]interface{}, error)
func (uc *UpCountryCostUsecase) GetUpCountryCostByDate() ([]UpCountryCostByDateData, error)
func (uc *UpCountryCostUsecase) GenerateCode(now time.Time) (string, error)
```

### Relasi
- **Depends on**: Employee (master-data)
- **Creates**: JournalEntry (ref_type = UP_COUNTRY)
- **Has many**: UpCountryCostEmployee, UpCountryCostItem

---

## 18. Asset Management (5 Sub-Pages)

Asset Management terdiri dari **5 halaman yang saling terhubung**:

### 18a. Asset Category

#### Logic
- **CRUD** untuk kategori aset (Tanah, Bangunan, Kendaraan, dll).
- Menentukan metode dan rate depresiasi.
- **Validasi delete**: tidak bisa hapus jika masih ada asset yang menggunakan kategori ini.
- Batch create.

#### Model
```go
type AssetCategory struct {
    gorm.Model
    Name               string             // "Building", "Vehicle", etc
    Type               AssetCategoryType  // "CURRENT", "FIXED", "INTANGIBLE", "OTHER"
    DepreciationMethod DepreciationMethod // "STRAIGHT_LINE", "DECLINING", "NONE"
    DepreciationRate   float64            // e.g. 0.1 = 10% per tahun
    UsefulLife         int                // umur ekonomis dalam tahun
    IsDepreciable      bool

    Assets []Asset
}
```

#### Business Rules
```go
func (uc) Delete(id uint) error {
    hasAssets, _ := uc.repo.HasAssets(id)
    if hasAssets {
        return &BusinessError{"Cannot delete asset category that has associated assets"}
    }
    return uc.repo.Delete(id)
}
```

---

### 18b. Asset Location

#### Logic
- **CRUD** untuk lokasi penyimpanan aset.
- Terhubung ke **City** (master-data geography) dengan koordinat lat/lng.
- **Validasi delete**: tidak bisa hapus jika masih ada asset di lokasi ini.

#### Model
```go
type AssetLocation struct {
    gorm.Model
    CityID    uint
    Name      string    // "Gedung A", "Gudang Jakarta"
    Address   string
    Latitude  *float64
    Longitude *float64

    City   masterDataModels.City
    Assets []Asset
}
```

---

### 18c. Asset List

#### Logic
- **CRUD** untuk daftar aset perusahaan.
- Auto-generate **code** (format: AST-YYYYMM-XXXX).
- Tracking: acquisition cost, accumulated depreciation, current value.
- Status: `ACTIVE`, `INACTIVE`, `SOLD`, `DISPOSED`.

#### Model
```go
type Asset struct {
    gorm.Model
    AssetCategoryID         uint
    AssetLocationID         uint
    Code                    string      // auto-generated
    Name                    string
    AcquisitionDate         time.Time
    AcquisitionCost         float64
    AccumulatedDepreciation float64
    CurrentValue            float64
    Status                  AssetStatus // "ACTIVE", "INACTIVE", "SOLD", "DISPOSED"
    Description             *string

    AssetCategory      AssetCategory
    AssetLocation      AssetLocation
    AssetDepreciations []AssetDepreciation
    AssetTransactions  []AssetTransaction
}
```

#### Auto-generate Code
```go
func (uc) Create(item *Asset) error {
    if item.Code == "" {
        code, _ := uc.repo.GenerateCode(time.Now()) // AST-202602-0001
        item.Code = code
    }
    return uc.repo.Create(item)
}
```

---

### 18d. Asset Transaction

#### Logic
- **CRUD** + **approval workflow** untuk transaksi aset.
- 5 tipe transaksi: ACQUISITION, TRANSFER, DISPOSAL, REVALUATION, ADJUSTMENT.
- Saat approve: **atomic transaction** yang melakukan:
  1. Update status → APPROVED
  2. Update asset (sesuai tipe transaksi)
  3. Create journal entry

#### Status Workflow
```
DRAFT → APPROVED (atomic: update asset + create journal entry)
```

#### Business Rules per Transaction Type
```go
func (uc) updateAssetFromTransactionInTx(tx *gorm.DB, transaction *AssetTransaction) error {
    switch transaction.TransactionType {
    case AssetTransactionAcquisition:
        asset.AcquisitionCost += transaction.TransactionAmount
        asset.CurrentValue += transaction.TransactionAmount
    case AssetTransactionRevaluation:
        asset.CurrentValue = transaction.TransactionAmount
    case AssetTransactionDisposal:
        asset.Status = AssetStatusDisposed
        asset.CurrentValue = 0
    case AssetTransactionAdjustment:
        asset.CurrentValue += transaction.TransactionAmount
    case AssetTransactionTransfer:
        // Update location (business-specific)
    }
}
```

#### Journal Entry per Transaction Type
```go
// Acquisition: Debit Asset(150), Credit Cash(100)
// Disposal:    Debit Cash(100), Credit Asset(150)
// Revaluation: Debit/Credit Asset(150), Credit/Debit Revaluation Reserve(300)
// Adjustment:  Debit/Credit Asset(150), Credit/Debit Expense(500)
// Transfer:    No financial impact
```

#### Model
```go
type AssetTransaction struct {
    gorm.Model
    AssetID           uint
    TransactionType   AssetTransactionType   // "ACQUISITION", "TRANSFER", "DISPOSAL", "REVALUATION", "ADJUSTMENT"
    TransactionDate   time.Time
    TransactionAmount float64
    Description       *string
    Status            AssetTransactionStatus // "DRAFT", "APPROVED"

    Asset Asset
}
```

---

### 18e. Asset Depreciation

#### Logic
- **CRUD** + **approval workflow** untuk penyusutan aset.
- Saat approve: **atomic transaction** yang melakukan:
  1. Update status → APPROVED
  2. Update asset accumulated depreciation
  3. Create journal entry (Debit Depreciation Expense, Credit Accumulated Depreciation)
  4. Link depreciation ke journal entry ID

#### Status Workflow
```
PENDING → APPROVED (atomic: update asset + create journal entry + link JE)
```

#### Approve Logic
```go
func (uc) ApproveDepreciation(id uint) error {
    depreciation, _ := uc.repo.FindByID(id)
    
    // Validasi: harus PENDING
    if depreciation.Status != AssetDepreciationStatusPending {
        return errors.New("only pending depreciations can be approved")
    }

    return uc.repo.GetDB().Transaction(func(tx *gorm.DB) error {
        // 1. Update status → APPROVED
        tx.Model(&AssetDepreciation{}).Where("id = ?", id).
            Update("status", AssetDepreciationStatusApproved)

        // 2. Update asset accumulated depreciation
        tx.Model(&Asset{}).Where("id = ?", depreciation.AssetID).
            Update("accumulated_depreciation", depreciation.AccumulatedDepreciation)

        // 3. Create journal entry
        // Debit: 685 (Software/Depreciation Expense)
        // Credit: 150 (Accumulated Depreciation)
        journalEntry := JournalEntry{
            EntryDate:     depreciation.Period,
            Description:   "Asset Depreciation - " + asset.Code + " - " + period,
            ReferenceType: RefAssetDepreciation,
            ReferenceID:   depreciation.ID,
        }
        tx.Create(&journalEntry)

        // 4. Link depreciation → journal entry
        tx.Model(&AssetDepreciation{}).Where("id = ?", id).
            Update("journal_entry_id", journalEntry.ID)

        return nil
    })
}
```

#### Model
```go
type AssetDepreciation struct {
    gorm.Model
    AssetID                 uint
    Period                  time.Time
    DepreciationAmount      float64
    AccumulatedDepreciation float64
    BookValue               *float64
    JournalEntryID          *uint   // linked after approval
    Status                  AssetDepreciationStatus // "PENDING", "APPROVED"

    Asset        Asset
    JournalEntry *JournalEntry
}
```

### Relasi Asset Management (Internal)
```
AssetCategory ──┐
                 ├──► Asset ──► AssetTransaction ──► JournalEntry
AssetLocation ──┘        │
                         └──► AssetDepreciation ──► JournalEntry
```

---

## Ringkasan Pola Umum

### 1. Pola CRUD Standar
Semua 18 page mengikuti pola:
- `GetAll(page, limit, search, searchBy, sortBy, sortOrder, startDate, endDate)`
- `GetByID(id)`, `Create(item)`, `Update(item)`, `Delete(id)`
- `GetCount()`, `CreateBatch(items[])`

### 2. Pola Status Workflow
| Module | Status Flow |
|--------|-------------|
| Budget | DRAFT → APPROVED → CLOSED / REJECTED |
| Base Salary | Draft → ACTIVE → INACTIVE |
| Non-Trade Payable | DRAFT → APPROVED → PAID / CANCELLED |
| Up Country Cost | DRAFT → APPROVED |
| Asset Transaction | DRAFT → APPROVED |
| Asset Depreciation | PENDING → APPROVED |
| Cash Bank Journal | draft → confirmed |

### 3. Pola Auto-Create Journal Entry
Modul yang membuat JournalEntry saat approval:
- **Adjustment Journal**: Manual create (ADJUSTMENT)
- **Cash Bank Transaction**: Confirm draft → JournalEntry (CASH_BANK)
- **Non-Trade Payable**: Approve → JournalEntry (NTP); Payment → JournalEntry (PAYMENT)
- **Up Country Cost**: Approve → JournalEntry (UP_COUNTRY)
- **Asset Transaction**: Approve → JournalEntry (ASSET_TXN)
- **Asset Depreciation**: Approve → JournalEntry (ASSET_DEP)
- **Purchase Module** (external): → JournalEntry (PO, GR)
- **Sales Module** (external): → JournalEntry (SO, DO)
- **Stock Module** (external): → JournalEntry (STOCK_OP)

### 4. Pola Report (Read-Only)
- **Journal Entries**: Semua jurnal (semua ref_type)
- **Purchase Journal**: Filter PO/GR
- **Sales Journal**: Filter SO/DO
- **Valuation Journal**: Filter STOCK_OP
- **General Ledger**: Detail per akun CoA
- **Balance Sheet**: Aggregate ASSET/LIABILITY/EQUITY
- **Profit & Loss**: Aggregate REVENUE/EXPENSE

### 5. Cross-Module Dependencies
```
Finance Module
  ├── master-data (Employee, Division, City, Village, Bank)
  ├── auth (User)
  ├── purchase (PurchaseOrder, SupplierInvoice, GoodsReceipt)
  ├── sales (SalesOrder, CustomerInvoice, DeliveryOrder)
  └── stock (StockOpname)
```

---

## Penjelasan 5W1H & Perumpamaan (Untuk Non-Akuntan / Orang Awam)

Bagian ini bertujuan untuk menjelaskan semua menu (18 Page) di dalam Modul Finance secara sederhana, ibarat menjelaskan keuangan kepada orang awam yang tidak memiliki latar belakang akuntansi sama sekali.

### 1. Chart of Accounts (CoA) [BACKEND DONE] [FRONTEND DONE]
- **What (Apa)**: Daftar rincian semua "laci" atau "kategori" untuk mengelompokkan uang perusahaan.
- **Who (Siapa)**: Dikelola oleh tim Finance.
- **Where (Dimana)**: Di menu Master Data Finance.
- **When (Kapan)**: Dibuat di awal perusahaan berdiri atau saat ada jenis pengeluaran/pemasukan baru yang butuh dikelompokkan.
- **Why (Mengapa)**: Agar setiap uang yang masuk dan keluar bisa dilacak dengan jelas lari ke "laci" yang mana.
- **How (Bagaimana)**: Finance membuat kode (misal 100 untuk Kas) dan nama akun.
- **Perumpamaan**: Bayangkan lemari pakaian besar yang punya banyak laci dengan label (Laci "Uang Jajan", Laci "Bayar Listrik", Laci "Tabungan"). CoA adalah **daftar nama-nama label** laci tersebut.

### 2. Bank [BACKEND DONE] [FRONTEND DONE]
- **What (Apa)**: Daftar nama-nama bank secara umum yang diakui atau terdaftar di sistem (contoh: BCA, Mandiri, BNI).
- **Who (Siapa)**: Dikelola oleh tim Finance/Admin.
- **Where (Dimana)**: Di menu Master Data Finance.
- **When (Kapan)**: Ditambahkan asalkan ada transaksi atau pembukaan rekening menggunakan bank merek baru.
- **Why (Mengapa)**: Sebagai daftar patokan atau referensi wajib sebelum mendaftarkan rekening spesifik milik perusahaan.
- **How (Bagaimana)**: Mengetikkan dan mendaftarkan nama bank ke dalam sistem.
- **Perumpamaan**: Seperti buku "Daftar Merek Dompet". Hanya daftar mereknya saja (misal: "Planet Ocean", "Bally"), belum spesifik membahas dompet milik siapa.

### 3. Bank Account [BACKEND DONE] [FRONTEND DONE]
- **What (Apa)**: Rekening bank nomor dan nama spesifik yang menjadi milik perusahaan.
- **Who (Siapa)**: Dikelola oleh tim Finance.
- **Where (Dimana)**: Di menu Master Data Finance.
- **When (Kapan)**: Dimasukkan saat perusahaan membuka rekening bank baru di bank yang nyata.
- **Why (Mengapa)**: Sebagai alat utama untuk menerima dan mengirim uang digital sesungguhnya sehari-hari.
- **How (Bagaimana)**: Menginput detail nomor rekening, nama pemilik rekening (atas nama siapa), dan memilih nama banknya.
- **Perumpamaan**: Ini adalah "Dompet Fisik"-nya perusahaan. Jika *Bank* (No. 2) adalah merek dompet, maka *Bank Account* adalah **dompet nyata Anda** yang ada isinya (misal: "Dompet BCA cabang Sudirman dengan saldo di dalamnya").

### 4. Payment Terms [BACKEND DONE] [FRONTEND DONE]
- **What (Apa)**: Aturan tentang jangka waktu atau batas waktu toleransi pembayaran untuk sebuah tagihan.
- **Who (Siapa)**: Dikelola oleh tim Finance, Sales, atau Purchase.
- **Where (Dimana)**: Di menu Master Data Finance.
- **When (Kapan)**: Ditentukan sebagai kesepakatan dasar sebelum bertransaksi utang-piutang dengan pelanggan atau supplier.
- **Why (Mengapa)**: Agar jelas kapan batas hari maksimal bayar utang (jatuh tempo), mencegah pertengkaran atau telat bayar.
- **How (Bagaimana)**: Mengatur nama persetujuan (misal "Net 30") yang isinya otomatis memberi batasan hari 30 hari.
- **Perumpamaan**: Seperti "Janji bayar utang". Jika kamu pinjam uang ke teman dan berjanji "Bulan depan pasti lunas ya," maka aturan "Bulan depan" itulah yang disebut Payment Terms.

### 5. Jurnal Umum [BACKEND DONE] [FRONTEND DONE]
- **What (Apa)**: Catatan riwayat atau buku harian dari semua aktivitas perpindahan uang (masuk, keluar, nol-nol).
- **Who (Siapa)**: Sebagian besar tercipta otomatis oleh sistem, lalu diawasi oleh Finance.
- **Where (Dimana)**: Di menu Finance - Journal.
- **When (Kapan)**: Tercatat setiap detiknya ketika ada kejadian pembayaran, pembelian, atau pemindahan angka keuangan.
- **Why (Mengapa)**: Agar sistem keuangan selalu seimbang; setiap ada uang yang dicatat bertambah harus ada sumbernya, dan setiap yang keluar harus jelas kemana larinya.
- **How (Bagaimana)**: Menyimpan tanggal, keterangan, dan mencatat angka masuk ke laci A dan keluar dari laci B secara otomatis.
- **Perumpamaan**: **Buku Harian Jajan**. Setiap kali kamu belanja beras, kamu tulis di buku: "Tanggal 1: Ambil uang dari dompet 100 ribu, ditukar menjadi Beras 100 ribu." Bedanya, sistem akan mencatat semuanya tanpa pernah capai.

### 6. Adjustment Journal [BACKEND DONE] [FRONTEND DONE]
- **What (Apa)**: Buku catatan khusus untuk memperbaiki, menyesuaikan, atau menambahkan catataan yang mungkin kelewatan.
- **Who (Siapa)**: Dilakukan manual oleh Akuntan / Finance Senior.
- **Where (Dimana)**: Di menu Finance - Journal.
- **When (Kapan)**: Sering dipakai di akhir bulan (tutup buku), atau ketika ditemukan ada salah pencatatan atau nilai yang belum pas.
- **Why (Mengapa)**: Untuk memoles dan memastikan angka laporan 100% pas dengan realita sebelum dicetak pelaporannya.
- **How (Bagaimana)**: Memilih secara manual angka apa yang mau digeser dari laci mana ke laci mana tanpa ada transaksi uang nyata yang pindah saat itu.
- **Perumpamaan**: Ibarat menggunakan **"Tipe-x"** di buku harian. Contoh, karena kamu telat sadar ternyata karcis parkir hilang, jadi di akhir bulan kamu tambahkan pencatatan, "Oh iya, uang Rp 10.000 kemarin buat bayar parkir."

### 7. Cash & Bank Transaction [BACKEND DONE] [FRONTEND DONE]
- **What (Apa)**: Formulir khusus untuk mendata perpindahan uang yang langsung lewat kas atau disetor langsung di bank.
- **Who (Siapa)**: Dikerjakan langsung oleh Kasir operasional atau Admin Finance yang pegang uang tunai/token bank.
- **Where (Dimana)**: Di menu Finance - Journal.
- **When (Kapan)**: Setiap hari saat ada orang bayar tunai di tempat, minta uang kecil, atau saat uang bank dipindah dari rekening utama ke rekening cabang.
- **Why (Mengapa)**: Supaya tak ada satu sen pun selisih antara saldo komputer dengan uang nyata di brankas/rekening.
- **How (Bagaimana)**: Membuat draf pencatatan tipe "uang masuk", "keluar" atau "transfer", kemudian disetujui untuk diubah ke jurnal tulen.
- **Perumpamaan**: Seperti catatan harian ketika kamu memindahkan uang gajimu dari rekening ATM ke **dompet celana** agar bisa jajan kecil-kecilan di depan rumah.

### 8. Purchase Journal [BACKEND DONE] [FRONTEND DONE]
- **What (Apa)**: Mode spesifik yang menampilan riwayat keuangan hasil dari tim bagian Belanja (Purchase) saja.
- **Who (Siapa)**: Datanya dari tim Belanja Otomatis, dilihat oleh Finance.
- **Where (Dimana)**: Di menu Finance - Journal.
- **When (Kapan)**: Terkumpul perlahan ketika tim gudang menerima barang dari bandar pemasok dan menagihkan tagihannya.
- **Why (Mengapa)**: Agar Finance tak usah bingung dan mudah memonitor sejauh mana beban pemborosan di urusan beli membeli operasional/bahan baku.
- **How (Bagaimana)**: Sistem mengambil semua dari dokumen "Po atau Terima Barang" lalu mengubahnya jadi tampilan jurnal.
- **Perumpamaan**: Mirip memeriksa **kumpulan bon belanjaan dari Supermarket**. Finance bisa langsung mantau, "Oh, kita bulan ini belanja alat-alat sebanyak ini, dari mana aja bonnya?".

### 9. Sales Journal [BACKEND DONE] [FRONTEND DONE]
- **What (Apa)**: Kebalikannya, ini adalah catatan riwayat dari bagian Penjualan yang meraup cuan.
- **Who (Siapa)**: Disedot datanya dari tim Sales Otomatis, dilihat oleh Finance.
- **Where (Dimana)**: Di menu Finance - Journal.
- **When (Kapan)**: Terkumpul dari detik ke detik manakala barang dikirim ke pelanggan dan ada bon utang untuk mereka bayar.
- **Why (Mengapa)**: Untuk memata-matai langsung berapa deret panjang barang laku yang bakal ngasilin pemasukan uang.
- **How (Bagaimana)**: Mengaitkan surat jalan dan bon penjualan untuk menjadi nilai rupiah ke jurnal akuntansi.
- **Perumpamaan**: Mirip membuka **dompet laci kasir pasar**. Semua isinya adalah tanda bukti orang-orang yang belanja dagangan kita di hari ini.

### 10. Valuation Journal [BACKEND DONE] [FRONTEND DONE]
- **What (Apa)**: Catatan penyesuaian nilai barang di gudang.
- **Who (Siapa)**: Disetir oleh tim Gudang dan dikonfirmasi untuk menghasilkan riwayat bagi Finance.
- **Where (Dimana)**: Di menu Finance - Journal.
- **When (Kapan)**: Terjadi seusai semua staf gudang melakukan "Stock Opname" (Menghitung satu per satu isi gudang fisik).
- **Why (Mengapa)**: Karena seringkali 10 barang di komputer tidak sama dengan 9 barang fisik yang ternyata 1 dimakan tikus. Mengakibatkan nilai harta perusahaan harus "disusutkan".
- **How (Bagaimana)**: Saat fisik barang ketahuan susut, maka total kekayaan di gudang dikoreksi di jurnal sesuai persis stok baru tersebut.
- **Perumpamaan**: Anda punya kotak perhiasan diisi 5 emas (dihargai 5 juta). Pas suatu sore diperiksa, 1 hilang (tinggal 4 keping). Valuation journal adalah kertas untuk **mencatat ikhlas** bahwa emas satu hilang dan harta turun jadi 4 juta.

### 11. General Ledger (Buku Besar) [BACKEND DONE] [FRONTEND PROGRESS]
- **What (Apa)**: Buku laporan pandangan dekat untuk menyorot laci per laci aktivitas.
- **Who (Siapa)**: Diaudit / dianalisis oleh Manajer Keuangan.
- **Where (Dimana)**: Di menu Finance.
- **When (Kapan)**: Paling sering saat atasan nanya detail: "Uang laci Listrik habis banyak bulan ini kenapa?"
- **Why (Mengapa)**: Untuk bisa mencari "kuman / anomali" pembengkakan pengeluaran di sebuah area sempit tertentu.
- **How (Bagaimana)**: Menarik satu akun (Contoh khusus Akun Bensin Kendaraan), lalu memaparkan riwayat hari-hari bensin apa saja yang memakannya.
- **Perumpamaan**: Rapor Spesifik satu mata pelajaran. Jika kita pengen lihat khusus nilai rapot pelajaran **Matematika**, kita akan buka lembar ini dan tahu tanggal berapa dapat merah, tanggal berapa dapat 100.

### 12. Balance Sheet (Neraca) [BACKEND DONE] [FRONTEND DONE]
- **What (Apa)**: Laporan besar berwujud "foto kondisi kekayaan terbaru" perusahaan di tanggal yang ditunjuk.
- **Who (Siapa)**: Dibaca oleh Direktur, Pemilik (Bos besar), atau Investor.
- **Where (Dimana)**: Di menu Finance.
- **When (Kapan)**: Biasanya dicetak dan dinikmati di akhir bulan atau setahun sekali tiap bulan Desember kelar.
- **Why (Mengapa)**: Supaya sang juragan tahu berapa besar warisan harta murni, takaran utang dengan pihak luar, beserta bekal modal pendirian usahanya.
- **How (Bagaimana)**: Komputer akan menangkap "Nilai Total Harta (Kanan)" melawan "Nilai Berapa Banyak Total Utang dan Modal Sendiri (Kiri)". Kalau sehat, seimbang antara harta dan modal.
- **Perumpamaan**: Ibarat laporan cek medis tubuh atau **"Foto X-Ray" Status Kekayaan**. Seseorang dinilai kaya hari ini jika punya harta (Aset) Rumah + Mobil, tapi ada Utang (Masih Nyicil), sisanya adalah Modal berharga bersih yang tertinggal.

### 13. Profit & Loss (Laba Rugi) [BACKEND DONE] [FRONTEND DONE]
- **What (Apa)**: Laporan penghitungan pertandingan antara Pasukan Pendapatan vs Pasukan Biaya Pengeluaran.
- **Who (Siapa)**: Disimak dengan semangat oleh Bos Utama atau Manajer.
- **Where (Dimana)**: Di menu Finance.
- **When (Kapan)**: Selalu dirangkum di akhir bulan dari tanggal 1 sampai batas akhir bulan.
- **Why (Mengapa)**: Untuk membuktikan satu kenyataan mutlak pada bulan itu: **Apakah perusahaan kita UNTUNG, atau RUGI?**.
- **How (Bagaimana)**: Setiap serpih receh yang terjual (Pendapatan) akan diadu potong dengan semua biaya gaji, tagihan, dan bahan. Sisanya di bawah itulah sebutan labanya.
- **Perumpamaan**: Singkatnya ini mirip rapor bulanan hasil tanding. Berlomba dari mulai 1 Januari, kumpulkan uang dagangan di kanan, bayar utang tagihan dan karyawan di kiri. Kalau sisa akhirnya plus, berarti jadilah juara bertahan untung pada bulan itu! Setelah selesai bulan itu, hitungan pendapatan dan biaya kembali diset ke 0 (start dari awal lagi).

### 14. Budget [BACKEND DONE] [FRONTEND DONE]
- **What (Apa)**: Rencana takaran anggaran maksimal dan penjatahan dana untuk masa yang akan datang.
- **Who (Siapa)**: Direncanakan oleh tiap Kepala Divisi, dipantau dan digembok oleh Finance.
- **Where (Dimana)**: Di menu Finance.
- **When (Kapan)**: Tentu dirancang jauh-jauh hari sebelum bulan atau tahun pengeksekusian dana dimulai.
- **Why (Mengapa)**: Agar pengeluaran tiap departemen tidak liar seenaknya, namun terkurung pada patokan dana wajar secara maksimal.
- **How (Bagaimana)**: Memasukkan angka rencana (Estimasi). Selanjutnya seiring berjalannya tahun, sistem terus membandingkannya: Angka Rencana lawan Pengeluaran Nyata agar ketahuan sisa jatahnya berapa.
- **Perumpamaan**: **Jatah uang saku anak sekolah**. Bapak memberikan jatah saklek, "Bulan depan biaya mainmu tak jatah maksimal Rp 500 Ribu. Kalau sisa makin tipis jangan menangis dan minta nambah uang kaget (No Overbudget)!"

### 15. Base Salary [BACKEND DONE] [FRONTEND DONE]
- **What (Apa)**: Form catatan standar gaji pokok atau kerangka upah per-orangnya karyawan.
- **Who (Siapa)**: Disinkronkan bagian HRD terpadu bersama bagian Finance.
- **Where (Dimana)**: Di menu Finance.
- **When (Kapan)**: Dirumuskan secara baku saat karyawan baru mula masuk atau waktu ada peristiwa kenaihan gaji promosi.
- **Why (Mengapa)**: Untuk kecepatan operasional tanpa repot susah menghitung satu persatu pilar gaji dasar orang gajian pada akhir bulannya.
- **How (Bagaimana)**: Mengetik angka upah tetap lalu menyimpannya, seketika diketuk setuju, slip upah jadul si karyawan otomatis basi atau mati dan ter-gantikan yang baru.
- **Perumpamaan**: Membikin **nota kontrak upah harian** kepada kuli bangunan renovasi rumah. Disitu sudah tercantum kesepakatan tegas pakem tak berubah "Kamu pokoknya dibayar paten sekian rupiah titik tanpa kecuali".

### 16. Non-Trade Payables [BACKEND DONE] [FRONTEND DONE]
- **What (Apa)**: Daftar tagihan utang murni operasional perusahaan kepada belah pihak luar, yang samasekali "bukanlah beli barang utama bahan dagangan".
- **Who (Siapa)**: Murni dikoordinasi seutuhnya oleh Finance.
- **Where (Dimana)**: Di menu Finance.
- **When (Kapan)**: Saat perusahaan memanggil jasa teknisi AC, melanggan paket koneksi Wifi, membeli stok kursi kantor yang pembayarannya pakai ngutang tidak cash keras.
- **Why (Mengapa)**: Karena yang dibeli tadi itu gunanya bukan buat bahan makanan jualan warung lagi, maka tipe utang tagihan biaya hidup perusahaan jenis ini wajib masuk jalur beda secara eksklusif.
- **How (Bagaimana)**: Staf mendata lembar bon (invoice) yang meretur/jatuh temponya kapan, barulah setelah sah divalidasi akan dicicil melalu menu bank transfer sampai tuntas.
- **Perumpamaan**: Di ibarat pengeluaran berumah tangga, bayangkan kalau tagihan warung bahan jualan berbeda dompet laci dengan tagihan listrik rumah. NTP ini ibarat **Utang beli kasur tidur rumahan** pakai tagihan kartu kredit (Beban tagihan rutin pribadi).

### 17. Up Country Cost [BACKEND DONE] [FRONTEND DONE]
- **What (Apa)**: Sistem pengaduan klaim ganti tebus ongkos perjalanan dinas misi berkeliling perbatasan luar kota si karyawan.
- **Who (Siapa)**: Dimasukkan oleh karyawan yang merantau utusan, kemudian direstui pencairannya oleh Manajer Finance.
- **Where (Dimana)**: Di menu Finance.
- **When (Kapan)**: Bisa diajukan menjelang kepergian (biar pegang sangu awal) maupun saat pulang sambil menjepitkan kuitansi berenteng.
- **Why (Mengapa)**: Guna meninjau lalu membayari kembali seluruh tarif tol, bensin, dan tiket maskapai sang bawahan, asalkan bon yang digeret pulang masih sah bernalar waras secara kebijakan atasan.
- **How (Bagaimana)**: Karyawan melukiskan rincian destinasi kemana lalu mengisikan rupiah satu per satunya dan struk. Jika centang approve dipukul Manajer, uang tersebut keluar menjurnal.
- **Perumpamaan**: Peristiwa di kala komandan kompi menyuruh kurirnya menjelajah hutan dan membelikan sesuatu lalu bilang, "Nyalakan mobil dan pergi sana misinya, kumpulkan semua tiket karcismu pulangnya kuserahkan uang gantinya dariku secara tunai".

### 18. Asset Management [BACKEND DONE] [FRONTEND DONE]
- **What (Apa)**: Kumpulan 5 laman pusat pendataan dan pencatatan nilai untuk barang-barang "berat", berusia panjang pakai, serta murni milik hak perusahaan (Misalnya kendaraan operasional, tanah, dan PC pegawai).
- **Where (Dimana)**: Di menu Finance - Asset Management.
- **Who (Siapa)**: Diselenggarakan oleh Tim Finance bersama kolega staf penjaga Aset / General Affair.
- **When (Kapan)**: Semenjak pembelian mahal itu mulanya serah terima masuk di depan, dijaga letaknya selama masa hidup saktinya, hingga usus barang tsb rapuh dijual rosok.
- **Why (Mengapa)**: Berhubung barang-aset berdaya beli selangit ini tak masuk akal digolongkan buangan habis pakai 1 hari, sistemnya menyuruh seolah si barang "nilainya turun pelan-pelan (menyusut)" per kalender bulan supaya realistis di harga jual rongsokan di kemudian tahunnya.
- **How (Bagaimana)**: Tata caranya cukup telaten (Buat lemari mobil tipe, Beri pin maps gedungnya, Daftarkan pelat nomor asetnya ke Asset List). Selesainya otomatis roh-sistem komputerlah yang memotong penyusutan harga depresiasi nilai hartanya turun di setiap purnama berdetak.
- **Perumpamaan**: Kurang lebih kebiasaan yang tekun di rumah seperti membungkus **Surat BPKB plus sertifikat asli** sambil diam menyadari. "Yaa mobil sedan 30 Juta-ku ini kupakai kerja rajin setahun lalu sudah kusam, kalau di lelang rongsok saat ini ya pantasnya tinggal 22 Juta saja harga nyatanya".
