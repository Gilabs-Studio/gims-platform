# Working Plan: Journal Entry Automation (Otomatisasi Jurnal)

> **Last Updated**: 2026-03-01
> **Status Review**: Diperbarui berdasarkan audit codebase aktual (`apps/api/internal/`)
> **Stack**: Go / Gin / GORM — Finance domain (`apps/api/internal/finance/`)

---

## 🎯 1. Visi Utama (Executive Summary)

Membangun sistem akuntansi di mana setiap transaksi operasional (Penjualan, Pembelian, Inventory, Pembayaran) secara instan menghasilkan catatan akuntansi yang akurat **tanpa intervensi manual**. Pengguna fokus pada transaksi bisnis, sementara sistem mengerjakan pembukuannya di belakang layar.

---

## 🗺️ 2. Status Implementasi Saat Ini (Audit Aktual)

> **PENTING**: Bagian ini merupakan hasil audit langsung dari kodebase. Selalu rujuk ke sini sebelum mulai mengerjakan task baru agar tidak terjadi duplikasi atau inkonsistensi.

### ✅ Sudah Diimplementasikan

| Modul | Trigger | Fungsi di Kode | Catatan |
|-------|---------|----------------|---------|
| Goods Receipt (GR) | `Confirm()` | `goods_receipt_usecase.go::triggerJournalEntry()` | ✅ Di dalam TX — jika jurnal gagal, seluruh konfirmasi di-rollback |
| Supplier Invoice | `Approve()` | `supplier_invoice_usecase.go::triggerJournalEntry()` | ✅ Di dalam TX |
| Supplier Invoice DP | `Pending()` | `supplier_invoice_down_payment_usecase.go::triggerDPJournalEntry()` | ⚠️ Di dalam TX tapi error di-**suppress** (`// Don't fail the pending operation if journal fails`) — jurnal bisa gagal diam-diam tanpa rollback |
| Purchase Payment | `Confirm()` | `purchase_payment_usecase.go::triggerJournalEntry()` | ⚠️ Di luar TX — kegagalan hanya di-log |
| Sales Payment | `Confirm()` | `sales_payment_usecase.go::triggerJournalEntry()` | ⚠️ Di luar TX — kegagalan hanya di-log |
| Non-Trade Payable | `Approve()` + `Pay()` | `non_trade_payable_usecase.go::PostOrUpdateJournal()` | ✅ Menggunakan `PostOrUpdateJournal` |
| Up Country Cost | `Approve()` | `up_country_cost_usecase.go::PostOrUpdateJournal()` | ✅ Menggunakan `PostOrUpdateJournal` |
| Cash & Bank Journal | `Post()` | `cash_bank_journal_usecase.go::PostOrUpdateJournal()` | ✅ Menggunakan `PostOrUpdateJournal` |

### ❌ Belum Diimplementasikan (GAP)

| Modul | Trigger yang Hilang | Prioritas | Dampak |
|-------|---------------------|-----------|--------|
| **Customer Invoice (Sales Invoice)** | Tidak ada `triggerJournalEntry` sama sekali di `customer_invoice_usecase.go` | 🔴 CRITICAL | Piutang & Pendapatan tidak terjurnal otomatis |
| **Delivery Order (COGS/HPP)** | Tidak ada jurnal HPP saat barang keluar di `delivery_order_usecase.go` | 🔴 CRITICAL | HPP tidak terjurnal → Laba Rugi tidak akurat |
| **Field `is_system_generated`** | Belum ada di model `journal_entries` | 🟡 HIGH | Tidak bisa membedakan jurnal manual vs otomatis di UI |
| **Field `source_document_url`** | Belum ada di model `journal_entries` | 🟡 HIGH | Tidak ada link "View Source" ke dokumen asal |
| **Tabel `account_mappings`** | COA masih hardcoded via `coaUC.GetByCode("11100")` per usecase | 🟢 MEDIUM | Admin tidak bisa konfigurasi mapping akun |

### ⚠️ Inkonsistensi yang Perlu Diperbaiki

1. **Transactional Integrity tidak konsisten**:
   - GR & Supplier Invoice: `triggerJournalEntry` dipanggil **di dalam** DB transaction → jika gagal, seluruh operasi di-rollback ✅ **(BENAR)**
   - **SI DP** (`Pending()`): `triggerDPJournalEntry` dipanggil di dalam TX via `database.WithTx(ctx, tx)`, tapi error-nya **di-suppress** dengan komentar `// Don't fail the pending operation if journal fails` → TX commit meski jurnal gagal ❌ **(SALAH — error harus di-return)**
   - **Purchase Payment** (`Confirm()`): `triggerJournalEntry` dipanggil **setelah** TX selesai (di luar) → transaksi bisa sukses tanpa jurnal ❌ **(SALAH)**
   - **Sales Payment** (`Confirm()`): sama seperti Purchase Payment, `triggerJournalEntry` dipanggil **setelah** TX selesai ❌ **(SALAH)**

2. **COA Hardcoded**:
   - Semua `triggerJournalEntry` menggunakan `coaUC.GetByCode("11100")` dll. — kode akun tertanam langsung di Go code.
   - Ini membuat sistem sulit dikonfigurasi tanpa deploy ulang.

---

## 🏗️ 3. Strategi Arsitektur (Technical Strategy)

### A. Transactional Hooks (Current Pattern — Sudah Berjalan)

```
Confirm() / Approve() di Usecase
  └── DB Transaction
        ├── Update status transaksi
        ├── Update inventory (jika relevan)
        └── triggerJournalEntry() ← dipanggil DI DALAM TX
              └── journalUC.PostOrUpdateJournal() / Create()
```

**Aturan wajib**: Semua `triggerJournalEntry` HARUS dipanggil di dalam DB transaction. Jika jurnal gagal, seluruh operasi harus di-rollback untuk menjaga integritas data.

### B. COA Resolution — Dua Pendekatan

**Saat ini (Phase 1 — Hardcoded):**
```go
// COA di-resolve berdasarkan kode yang sudah diketahui
def, err := uc.coaUC.GetByCode(ctx, "11100") // Kas/Bank
```

**Target (Phase 2 — Account Mapping Table):**
```go
// COA di-resolve dari tabel konfigurasi
mapping, err := uc.accountMappingUC.GetMapping(ctx, "PURCHASE_PAYMENT", "CONFIRM")
// mapping.DebitCOAID, mapping.CreditCOAID
```

> **Keputusan Teknis**: Hardcoded COA dipilih untuk kecepatan implementasi awal. Trade-off: perlu deploy ulang jika klien menggunakan nomor COA berbeda. Migrasi ke `account_mappings` table dijadwalkan di Phase 2.

### C. System-Generated Markers (Belum Diimplementasikan)

Jurnal otomatis akan ditandai `is_system_generated = true`:
- Tidak bisa diedit manual di UI Jurnal Umum
- Memiliki link `source_document_url` ke dokumen asal (e.g., `/purchase/goods-receipt/{id}`)
- Jika transaksi sumber dibatalkan → jurnal otomatis dibuat reversing entry atau dihapus

---

## 🗒️ 4. Peta Pemetaan Jurnal (Journal Mapping Logic)

| Transaksi | Trigger | Debit | Kredit | Status |
|-----------|---------|-------|--------|--------|
| Goods Receipt (GR) | Confirm | Persediaan (11400) | GR/IR Clearing (21100) | ✅ Done |
| Supplier Invoice | Approve | GR/IR Clearing (21100) + PPN Masukan (11800) | Hutang Dagang (21000) | ✅ Done |
| Supplier Invoice DP | Pending | Uang Muka Pembelian (11500) | Hutang Dagang (21000) | ✅ Done (⚠️ TX issue) |
| Purchase Payment | Confirm | Hutang Dagang (21000) | Kas/Bank (11100) | ✅ Done (⚠️ TX issue) |
| **Customer Invoice** | **Create/Approve** | **Piutang Dagang (11200)** | **Pendapatan (41000) + PPN Keluaran (21200)** | **❌ MISSING** |
| **Delivery Order (COGS)** | **Confirm** | **HPP/COGS (51000)** | **Persediaan (11400)** | **❌ MISSING** |
| Sales Payment | Confirm | Kas/Bank (11100) | Piutang Dagang (11200) | ✅ Done (⚠️ TX issue) |
| Non-Trade Payable | Approve | Beban NTP (6xxxx) | Hutang NTP (21300) | ✅ Done |
| NTP Payment | Pay | Hutang NTP (21300) | Kas/Bank (11100) | ✅ Done |
| Up Country Cost | Approve | Beban Perjalanan (6xxxx) | Hutang/Kas (21300/11100) | ✅ Done |
| Cash & Bank Journal | Post | [user-defined] | [user-defined] | ✅ Done |
| Stock Opname Adjustment | Finalize | Selisih Stok (5xxxx) | Persediaan (11400) | ❌ MISSING — `stock_opname_usecase.go` tidak inject `journalUC` sama sekali |

---

## 📅 5. Roadmap Implementasi (Remaining Work)

### Phase 1 — Perbaikan Kritis (Sprint Saat Ini)

> Prioritas tertinggi. Menyentuh integritas data dan keakuratan laporan keuangan.

- [ ] **Fix TX Inconsistency — 3 file**:
  - `purchase_payment_usecase.go`: Pindahkan `triggerJournalEntry` masuk ke dalam blok `Transaction(func(tx *gorm.DB)`
  - `sales_payment_usecase.go`: Sama seperti di atas
  - `supplier_invoice_down_payment_usecase.go`: Di `Pending()`, hapus error suppression (`// Don't fail...`) dan ubah menjadi `return err` agar kegagalan jurnal men-trigger rollback TX

- [ ] **Sales Invoice Journal**: Tambahkan `triggerJournalEntry()` di `customer_invoice_usecase.go` saat invoice di-approve/create. Jurnal: Debit Piutang Dagang (11200), Kredit Pendapatan (41000) + Kredit PPN Keluaran (21200).

- [ ] **COGS/HPP Journal (Delivery Order)**: Inject `journalUC` ke `delivery_order_usecase.go`. Saat `Confirm()`, buat jurnal: Debit HPP (51000), Kredit Persediaan (11400). Nilai HPP menggunakan harga rata-rata (average cost) dari inventory batch.

- [ ] **Model Update — `is_system_generated` & `source_document_url`**:
  ```go
  // apps/api/internal/finance/data/models/journal_entry.go
  IsSystemGenerated  bool    `gorm:"default:false;index" json:"is_system_generated"`
  SourceDocumentURL  *string `gorm:"type:varchar(500)" json:"source_document_url,omitempty"`
  ```
  Setelah update model, daftarkan di `migrate.go` dan jalankan `go mod tidy`.

### Phase 2 — Account Mapping Configuration (Sprint Berikutnya)

> Mengganti hardcoded COA dengan tabel konfigurasi yang bisa diatur Admin via UI.

- [ ] **Database Schema**: Buat tabel `account_mappings`:
  ```sql
  CREATE TABLE account_mappings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type VARCHAR(50) NOT NULL,  -- e.g., "GR", "SUPPLIER_INVOICE", "PURCHASE_PAYMENT"
    action      VARCHAR(50) NOT NULL,  -- e.g., "CONFIRM", "APPROVE"
    debit_coa_id  UUID NOT NULL REFERENCES chart_of_accounts(id),
    credit_coa_id UUID NOT NULL REFERENCES chart_of_accounts(id),
    description VARCHAR(200),
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (source_type, action)
  );
  ```
- [ ] **Model, Repository, Usecase, Handler, Router** untuk `account_mappings` (ikuti vertical slice pattern).
- [ ] **Refactor `triggerJournalEntry`**: Ganti `coaUC.GetByCode("xxx")` dengan `accountMappingUC.GetMapping(ctx, sourceType, action)`.
- [ ] **Mapping UI**: Halaman Finance → Settings → Account Mapping. CRUD sederhana dengan dropdown COA.
- [ ] **Seeder default mappings**: Isi data awal sesuai tabel pemetaan di bagian 4.

### Phase 3 — Audit & Hardening

- [ ] **Reversing Entry**: Implementasi fungsi `ReverseJournal(sourceRef)` yang membuat jurnal kebalikan saat transaksi dibatalkan.
- [ ] **Rounding Handler**: Jika selisih desimal `|debit - credit| < 0.01`, auto-posting ke akun "Selisih Pembulatan" agar jurnal tetap balanced.
- [ ] **Locking UI**: Tambahkan guard di handler journal — jika `is_system_generated = true`, tolak request update/delete dengan error `JOURNAL_SYSTEM_GENERATED_IMMUTABLE`.
- [ ] **Stock Opname Journal**: `stock_opname_usecase.go` tidak meng-inject `journalUC` — perlu inject dan tambahkan `triggerJournalEntry` saat finalize. Jurnal: Debit Selisih Stok (5xxxx), Kredit Persediaan (11400) atau sebaliknya tergantung selisih positif/negatif.

---

## 🛡️ 6. Aturan Integritas Data (Non-Negotiable)

1. **Unit of Work**: Semua `triggerJournalEntry` HARUS dipanggil di dalam DB transaction yang sama dengan operasi utama. Tidak ada pengecualian.

2. **Balanced Check**: `PostOrUpdateJournal` sudah memvalidasi `|debit - credit| < 0.01`. Jangan bypass validasi ini.

3. **No Orphan Journal**: Invoice tapi tidak ada jurnal = pelanggaran integritas. Gunakan `ROLLBACK` jika `triggerJournalEntry` gagal, **bukan** `fmt.Printf` warning.

4. **Idempotent via PostOrUpdateJournal**: Untuk operasi yang bisa di-retry, gunakan `PostOrUpdateJournal` (lookup by `ReferenceType + ReferenceID`) bukan `Create`. Ini mencegah jurnal duplikat.

5. **Audit Trail**: Setiap jurnal otomatis harus memiliki `CreatedBy` dari `user_id` context yang memicu transaksi asal.

---

## 💡 7. Contoh Alur Kerja User (User Story)

**After full implementation:**

1. Staf Admin Gudang menerima barang dan klik **"Confirm"** pada Goods Receipt.
2. Sistem membuat **Jurnal Stok** di Finance secara otomatis di dalam DB transaction yang sama. Jika gagal → seluruh konfirmasi di-rollback.
3. Staf Finance membuka **Balance Sheet** → akun "Persediaan" sudah bertambah.
4. Jurnal tersebut ditampilkan dengan badge **"System Generated - Source: GR-2024-001"** dan tombol **"View Source"** yang mengarah ke halaman Goods Receipt tersebut.
5. Tombol **Edit/Delete** pada jurnal ini dinonaktifkan karena `is_system_generated = true`.

---

---

## 📒 9. Working Plan — Fitur Journal Lines (Menu Baru)

> **Tujuan**: Membuat halaman/menu **Journal Lines** yang berdiri sendiri sebagai sub-ledger view — menampilkan semua baris jurnal lintas semua Journal Entry, dengan filter, running balance, dan export. Berbeda dari Journal Entries yang menampilkan header-level, Journal Lines menampilkan baris per akun sehingga tim Finance bisa tracking mutasi per COA.

### 9.1 Analisis Gap — Apa yang Belum Ada

**Backend:**

| Komponen | Status | Keterangan |
|----------|--------|------------|
| `GET /finance/journal-lines` endpoint | ❌ Belum ada | Tidak ada dedicated endpoint untuk query lines dengan filter |
| `ListJournalLines` repository method | ❌ Belum ada | Hanya ada list via parent `JournalEntry` |
| Running balance per account | ❌ Belum ada | Tidak ada kalkulasi saldo berjalan |
| Export journal lines to CSV/Excel | ❌ Belum ada | Lines hanya bisa dilihat embedded di detail Journal Entry |
| Filter by COA, account type, ref_type | ❌ Belum ada | — |

**Frontend:**

| Komponen | Status | Keterangan |
|----------|--------|------------|
| Halaman `finance/journal-lines` | ❌ Belum ada | — |
| Feature folder `features/finance/journal-lines/` | ❌ Belum ada | — |
| `JournalLineDetailResponse` type (dengan snapshot fields) | ⚠️ Parsial | Type ada tapi tidak ada `code_snapshot`, `name_snapshot`, `type_snapshot` |

**Yang sudah ada dan bisa di-reuse:**
- ✅ Model `JournalLine` dengan snapshot fields (`code_snapshot`, `name_snapshot`, `type_snapshot`)
- ✅ Relasi `JournalLine → JournalEntry` via `journal_entry_id`
- ✅ Relasi `JournalLine → ChartOfAccount` via `chart_of_account_id`
- ✅ `AccountType` constants di COA model
- ✅ Zod schema balance validation di frontend

---

### 9.2 Aturan Akuntansi (Accounting Rules) — Wajib Dipatuhi

#### Normal Balance per Account Type

| Account Type | Normal Balance | Saldo Bertambah saat | Saldo Berkurang saat |
|---|---|---|---|
| `ASSET`, `CASH_BANK`, `CURRENT_ASSET`, `FIXED_ASSET` | **Debit** | Debit | Credit |
| `EXPENSE`, `COST_OF_GOODS_SOLD`, `SALARY_WAGES`, `OPERATIONAL` | **Debit** | Debit | Credit |
| `LIABILITY`, `TRADE_PAYABLE` | **Credit** | Credit | Debit |
| `EQUITY` | **Credit** | Credit | Debit |
| `REVENUE` | **Credit** | Credit | Debit |

#### Running Balance Formula

```
// Untuk Debit-Normal accounts (ASSET, EXPENSE, etc.)
running_balance = cumulative_debit - cumulative_credit

// Untuk Credit-Normal accounts (LIABILITY, EQUITY, REVENUE)
running_balance = cumulative_credit - cumulative_debit

// Nilai positif = saldo normal (sehat)
// Nilai negatif = saldo terbalik (perlu review)
```

**Aturan sorting untuk running balance**: WAJIB ORDER BY `journal_entries.entry_date ASC, journal_entries.created_at ASC` agar akumulasi benar dan deterministik.

#### Constraint Double-Entry yang Sudah Ditegakkan

Validasi berikut sudah ada di backend (`validateLines`) dan frontend (Zod schema) — jangan diubah:
1. Setiap line: `debit > 0 XOR credit > 0` (tidak boleh keduanya atau keduanya nol)
2. `SUM(debit) == SUM(credit)` dengan toleransi `< 0.01` (rounding)
3. Minimum 2 lines per Journal Entry

---

### 9.3 Backend — Implementation Plan

#### Step 1: Tambah DTO baru
**File**: `apps/api/internal/finance/domain/dto/journal_entry_dto.go`

```go
// Request untuk list journal lines dengan filter
type ListJournalLinesRequest struct {
    Page              int     `form:"page" binding:"omitempty,min=1"`
    PerPage           int     `form:"per_page" binding:"omitempty,min=1,max=100"`
    Search            string  `form:"search"` // search di nama/kode COA atau memo
    ChartOfAccountID  string  `form:"chart_of_account_id"`
    AccountType       string  `form:"account_type"`         // filter by COA type
    ReferenceType     *string `form:"reference_type"`       // SO, PO, GR, etc.
    JournalStatus     string  `form:"journal_status"`       // draft | posted
    StartDate         *string `form:"start_date"`
    EndDate           *string `form:"end_date"`
    SortBy            string  `form:"sort_by"`
    SortDir           string  `form:"sort_dir"`
}

// Response per baris jurnal (dengan snapshot COA agar tidak N+1)
type JournalLineDetailResponse struct {
    ID                         string  `json:"id"`
    JournalEntryID             string  `json:"journal_entry_id"`
    EntryDate                  string  `json:"entry_date"`
    JournalDescription         string  `json:"journal_description"`
    JournalStatus              string  `json:"journal_status"`
    ReferenceType              *string `json:"reference_type"`
    ReferenceID                *string `json:"reference_id"`
    ChartOfAccountID           string  `json:"chart_of_account_id"`
    ChartOfAccountCode         string  `json:"chart_of_account_code"` // dari snapshot
    ChartOfAccountName         string  `json:"chart_of_account_name"` // dari snapshot
    ChartOfAccountType         string  `json:"chart_of_account_type"` // dari snapshot
    Debit                      float64 `json:"debit"`
    Credit                     float64 `json:"credit"`
    Memo                       string  `json:"memo"`
    RunningBalance             float64 `json:"running_balance"` // kalkulasi sisi server (hanya jika filter single COA)
    CreatedAt                  string  `json:"created_at"`
}

// Response wrapper untuk list dengan summary totals
type ListJournalLinesResponse struct {
    Lines      []JournalLineDetailResponse `json:"lines"`
    TotalDebit  float64                    `json:"total_debit"`
    TotalCredit float64                    `json:"total_credit"`
}
```

> **Catatan**: `RunningBalance` hanya dihitung dan diisi jika request mem-filter single `chart_of_account_id`. Jika multi-akun, nilai ini `0` (tidak relevan).

#### Step 2: Tambah Repository Method
**File**: `apps/api/internal/finance/data/repositories/journal_line_repository.go` (file baru)

```go
type JournalLineListParams struct {
    ChartOfAccountID string
    AccountType      string
    ReferenceType    *string
    JournalStatus    string
    StartDate        *time.Time
    EndDate          *time.Time
    Search           string
    SortBy           string
    SortDir          string
    Limit            int
    Offset           int
}

type JournalLineRepository interface {
    List(ctx context.Context, params JournalLineListParams) ([]models.JournalLine, int64, error)
    // SumByAccount: aggregate debit/credit per COA dalam range tanggal (untuk running balance awal)
    SumBeforeDate(ctx context.Context, coaID string, beforeDate time.Time) (debit float64, credit float64, error error)
}
```

**Query pattern** (wajib JOIN ke journal_entries untuk filter status & date):
```sql
SELECT jl.*, je.entry_date, je.description, je.status, je.reference_type, je.reference_id
FROM journal_lines jl
JOIN journal_entries je ON je.id = jl.journal_entry_id
WHERE je.deleted_at IS NULL AND jl.deleted_at IS NULL
  [AND je.status = ?]
  [AND je.entry_date BETWEEN ? AND ?]
  [AND jl.chart_of_account_id = ?]
  [AND jl.chart_of_account_type_snapshot = ?]
  [AND (jl.memo ILIKE ? OR jl.chart_of_account_name_snapshot ILIKE ? OR jl.chart_of_account_code_snapshot ILIKE ?)]
ORDER BY je.entry_date ASC, je.created_at ASC  -- WAJIB untuk running balance
LIMIT ? OFFSET ?;
```

> **Peringatan**: Gunakan `_snapshot` columns di `journal_lines` untuk search/filter — jangan JOIN ke `chart_of_accounts` untuk performance. Snapshot sudah diisi saat jurnal dibuat.

#### Step 3: Tambah Usecase Method
**File**: `apps/api/internal/finance/domain/usecase/journal_entry_usecase.go`

Tambahkan ke interface dan implementasi:
```go
// Interface
ListLines(ctx context.Context, req *dto.ListJournalLinesRequest) (*dto.ListJournalLinesResponse, int64, error)

// Implementasi: query via repo.List() lalu kalkulasi running balance jika filter single COA
// Running Balance Algorithm:
//   1. Jika req.ChartOfAccountID != "": fetch opening balance via SumBeforeDate()
//   2. Loop lines berurutan (sudah di-sort by entry_date ASC), akumulasikan
//   3. Tentukan normal balance dari snapshot type → debit-normal vs credit-normal
//   4. RunningBalance[i] = opening + Σdebit[0..i] - Σcredit[0..i] (debit-normal)
//                        = opening + Σcredit[0..i] - Σdebit[0..i] (credit-normal)
```

#### Step 4: Tambah Handler
**File**: `apps/api/internal/finance/presentation/handler/journal_entry_handler.go`

```go
// GET /finance/journal-lines
func (h *JournalEntryHandler) ListLines(c *gin.Context) { ... }

// GET /finance/journal-lines/export  (CSV/Excel)
func (h *JournalEntryHandler) ExportLines(c *gin.Context) { ... }
```

#### Step 5: Register Route
**File**: `apps/api/internal/finance/presentation/router/journal_entry_routers.go`

```go
// Tambahkan di RegisterJournalEntryRoutes atau buat group baru
jl := rg.Group("/journal-lines")
jl.GET("", middleware.RequirePermission(journalRead), h.ListLines)
jl.GET("/export", middleware.RequirePermission(journalRead), h.ExportLines)
```

> **Urutan route**: `/journal-lines` harus didaftarkan **sebelum** `/:id` entries untuk menghindari konflik path di Gin.

---

### 9.4 Frontend — Implementation Plan

#### Struktur Folder Baru
```
apps/web/src/features/finance/journal-lines/
├── types/
│   └── index.d.ts          # JournalLineDetail, ListJournalLinesParams, dll.
├── schemas/
│   └── journal-lines.schema.ts   # Zod schema untuk filter form
├── services/
│   └── journal-lines-service.ts  # API calls
├── hooks/
│   └── use-journal-lines.ts      # TanStack Query hooks
├── components/
│   ├── journal-lines-table.tsx   # Tabel utama dengan running balance
│   ├── journal-lines-filters.tsx # Filter panel: COA, date, status, ref_type
│   └── index.tsx
└── i18n/
    ├── en.ts
    └── id.ts
```

#### Aturan UI/UX Akuntansi

1. **Normal Balance Indicator**: Tampilkan badge warna per kolom running balance:
   - Hijau = saldo normal (positif untuk debit-normal, positif untuk credit-normal)
   - Merah = saldo terbalik (negatif) — perlu perhatian Finance

2. **Debit/Credit Column Display**: Jika nilai 0, tampilkan `-` bukan `0` untuk keterbacaan

3. **Running Balance Column**: Hanya tampil jika filter `chart_of_account_id` terisi (single COA view). Jika multi-COA, kolom ini disembunyikan

4. **Entry Date Sort**: UI harus selalu sort by `entry_date ASC` untuk running balance view — lock sort order ini tidak bisa diubah user

5. **Row color coding**:
   - Baris dari jurnal `posted` = putih/normal
   - Baris dari jurnal `draft` = background kuning/warning — karena belum final

6. **Totals Footer**: Footer baris terakhir tabel menampilkan `Total Debit` dan `Total Credit` dari data yang difilter. Keduanya harus balance jika filter status = `posted`

#### Halaman & Route
```
apps/web/app/[locale]/(dashboard)/finance/journal-lines/
├── page.tsx         # Journal Lines list page
└── loading.tsx      # Skeleton loading state
```

Tambahkan ke `apps/web/src/lib/route-validator.ts`:
```typescript
"/finance/journal-lines"
```

#### Service Pattern
```typescript
// Contoh endpoint call
listJournalLines(params: ListJournalLinesParams): Promise<ApiResponse<ListJournalLinesResponse>>
exportJournalLines(params: ListJournalLinesParams): Promise<Blob>  // untuk download CSV
```

---

### 9.5 Checklist Implementasi

**Backend:**
- [ ] Buat `journal_line_repository.go` dengan interface + implementasi GORM (JOIN ke journal_entries)
- [ ] Tambah DTO: `ListJournalLinesRequest`, `JournalLineDetailResponse`, `ListJournalLinesResponse`
- [ ] Tambah `ListLines()` ke `JournalEntryUsecase` interface dan implementasinya (dengan running balance logic)
- [ ] Tambah `ExportLines()` ke usecase (stream CSV)
- [ ] Tambah handler `ListLines` dan `ExportLines` di `JournalEntryHandler`
- [ ] Register route `/finance/journal-lines` di router
- [ ] Tambah `journal_lines_repository` ke wiring di `presentation/routers.go`
- [ ] Verifikasi: running balance akurat untuk debit-normal dan credit-normal accounts
- [ ] Verifikasi: snapshot columns terisi untuk semua jurnal otomatis (GR, SI, Payment, dll.)

**Frontend:**
- [ ] Buat struktur folder `features/finance/journal-lines/`
- [ ] Types, Zod filter schema, service, hooks
- [ ] `journal-lines-table.tsx` — tabel dengan kolom: No, Entry Date, Journal Desc, Ref Type, COA Code, COA Name, Memo, Debit, Credit, Running Balance, Status
- [ ] `journal-lines-filters.tsx` — filter: COA picker (dropdown), Account Type, Date Range, Journal Status, Reference Type
- [ ] Halaman `finance/journal-lines/page.tsx` + `loading.tsx`
- [ ] i18n (en + id), register di `request.ts`
- [ ] Running balance column: hanya visible jika single COA filter aktif
- [ ] Export button yang memanggil `/export` endpoint dan trigger browser download
- [ ] Row color coding: draft = yellow-tinted background
- [ ] Register route di `route-validator.ts`

**Postman:**
- [ ] Tambahkan endpoint `GET /api/v1/finance/journal-lines` dengan contoh filter params
- [ ] Tambahkan endpoint `GET /api/v1/finance/journal-lines/export`

---

## 📁 8. File yang Relevan di Codebase

### Automated Journal (Phase 1 & 2)

| Komponen | Path |
|----------|------|
| Journal Entry Model | `apps/api/internal/finance/data/models/journal_entry.go` |
| Journal Line Model | `apps/api/internal/finance/data/models/journal_line.go` |
| Journal Usecase (PostOrUpdateJournal) | `apps/api/internal/finance/domain/usecase/journal_entry_usecase.go` |
| GR Journal Trigger (pola BENAR) | `apps/api/internal/purchase/domain/usecase/goods_receipt_usecase.go` |
| Purchase Payment Journal (⚠️ perlu fix TX) | `apps/api/internal/purchase/domain/usecase/purchase_payment_usecase.go` |
| Sales Payment Journal (⚠️ perlu fix TX) | `apps/api/internal/sales/domain/usecase/sales_payment_usecase.go` |
| SI DP Journal (⚠️ perlu hapus error suppress) | `apps/api/internal/purchase/domain/usecase/supplier_invoice_down_payment_usecase.go` |
| Customer Invoice — ❌ tidak ada journal | `apps/api/internal/sales/domain/usecase/customer_invoice_usecase.go` |
| Delivery Order — ❌ tidak ada COGS journal | `apps/api/internal/sales/domain/usecase/delivery_order_usecase.go` |
| Stock Opname — ❌ tidak ada journal | `apps/api/internal/stock_opname/domain/usecase/stock_opname_usecase.go` |
| Migration registration | `apps/api/internal/core/infrastructure/database/migrate.go` |

### Journal Lines Feature (Section 9 — Baru)

| Komponen | Path (Target) |
|----------|---------------|
| Journal Line Repository (baru) | `apps/api/internal/finance/data/repositories/journal_line_repository.go` |
| Journal Lines DTO (tambahan) | `apps/api/internal/finance/domain/dto/journal_entry_dto.go` |
| ListLines Usecase method | `apps/api/internal/finance/domain/usecase/journal_entry_usecase.go` |
| Journal Lines Handler | `apps/api/internal/finance/presentation/handler/journal_entry_handler.go` |
| Journal Lines Router | `apps/api/internal/finance/presentation/router/journal_entry_routers.go` |
| FE Types | `apps/web/src/features/finance/journal-lines/types/index.d.ts` |
| FE Service | `apps/web/src/features/finance/journal-lines/services/journal-lines-service.ts` |
| FE Hooks | `apps/web/src/features/finance/journal-lines/hooks/use-journal-lines.ts` |
| FE Table Component | `apps/web/src/features/finance/journal-lines/components/journal-lines-table.tsx` |
| FE Filter Component | `apps/web/src/features/finance/journal-lines/components/journal-lines-filters.tsx` |
| FE Page | `apps/web/app/[locale]/(dashboard)/finance/journal-lines/page.tsx` |
| COA Model (account types reference) | `apps/api/internal/finance/data/models/chart_of_account.go` |