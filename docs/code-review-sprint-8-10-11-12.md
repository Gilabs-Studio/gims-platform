# Code Review Report — Sprint 8, 10, 11, 12

> **Date:** 2026-02-17  
> **Scope:** Purchase module (Sprint 8), Finance module (Sprint 10–12)  
> **Severity levels:** 🔴 Critical · 🟡 Medium · 🟢 Low / Suggestion

---

## Ringkasan Eksekutif

Secara umum kode sudah **cukup solid** dengan arsitektur yang konsisten (Clean Architecture: data → domain → presentation). Snapshot pattern sudah diterapkan dengan baik. Berikut temuan-temuan yang perlu diperbaiki, dari yang paling penting.

---

## 🔴 CRITICAL Issues

### 1. Duplicate Code: `clamp()` vs `clampPO()` — Identik 100%

**File:**
- `purchase/domain/usecase/purchase_requisition_usecase.go` line 555–563 → `clamp()`
- `purchase/domain/usecase/purchase_order_usecase.go` line 703–711 → `clampPO()`

**Masalah:** Kedua fungsi ini **identik** body-nya tetapi berbeda nama. Ini adalah duplicate code yang tidak perlu.

```go
// purchase_requisition_usecase.go:555
func clamp(val, minVal, maxVal float64) float64 { ... }

// purchase_order_usecase.go:703
func clampPO(v, min, max float64) float64 { ... } // identical logic
```

**Rekomendasi:** Pindahkan ke satu file shared (misalnya `purchase/domain/usecase/math_helpers.go`) dan hapus duplikat.

---

### 2. Duplicate Code: Date Parsing Functions — 3 Copies

**File:**
- `finance/domain/usecase/journal_entry_usecase.go:50` → `parseDate()`
- `finance/domain/usecase/payment_usecase.go:46` → `parseDateStrict()`
- `finance/domain/usecase/asset_usecase.go:48` → `parseAssetDateStrict()`

**Masalah:** Ketiga fungsi ini **identik** (parse `"2006-01-02"` + return error if empty). Mereka diduplikasi 3 kali.

**Rekomendasi:** Pindahkan ke satu file shared, misal `finance/domain/usecase/date_helpers.go`.

---

### 3. Duplicate Code: Pagination Boilerplate — 7+ Copies

**File:** Hampir di setiap `List()` method pada:
- `journal_entry_usecase.go`, `payment_usecase.go`, `cash_bank_journal_usecase.go`
- `budget_usecase.go`, `non_trade_payable_usecase.go`, `asset_usecase.go`
- `chart_of_account_usecase.go`, `financial_closing_usecase.go`

**Masalah:** Blok kode berikut di-copy-paste 7+ kali:
```go
page := req.Page
if page < 1 { page = 1 }
perPage := req.PerPage
if perPage < 1 { perPage = 10 }
if perPage > 100 { perPage = 100 }
```

**Rekomendasi:** Buat helper function:
```go
func normalizePagination(page, perPage int) (int, int) {
    if page < 1 { page = 1 }
    if perPage < 1 { perPage = 10 }
    if perPage > 100 { perPage = 100 }
    return page, perPage
}
```

---

### 4. Duplicate Code: Date Filter Parsing Pattern — 7+ Copies

**Masalah:** Blok parsing `startDate`/`endDate` dari `*string` (same pattern) terulang di **7+ List methods**:
```go
var startDate *time.Time
if req.StartDate != nil && strings.TrimSpace(*req.StartDate) != "" {
    parsed, err := time.Parse("2006-01-02", strings.TrimSpace(*req.StartDate))
    if err != nil { return nil, 0, errors.New("invalid start_date") }
    startDate = &parsed
}
```

**Rekomendasi:** Buat helper `parseOptionalDateFilter(input *string, label string) (*time.Time, error)`.

---

### 5. Duplicate Code: Audit Trail ListAuditTrail — 3 Near-Identical Copies

**File:**
- `goods_receipt_usecase.go:490` → `ListAuditTrail`
- `supplier_invoice_usecase.go:521` → `ListAuditTrail`
- `purchase_payment_usecase.go:299` → `ListAuditTrail`

**Masalah:** Ketiga method ini **hampir identik** (hanya beda `permission_code LIKE` string dan response type). Struct `auditRow` juga didefinisikan berulang kali sebagai type di dalam fungsi.

**Rekomendasi:** Buat generic audit trail helper yang menerima permission prefix dan mapper function.

---

## 🟡 MEDIUM Issues

### 6. GoodsReceipt Update: `poItemByID` Map Rebuilt Inside Loop

**File:** `goods_receipt_usecase.go:246–255`

```go
for _, it := range req.Items {
    po := existing.PurchaseOrder
    // ...
    poItemByID := make(map[string]*models.PurchaseOrderItem, len(po.Items)) // ← REBUILT EVERY ITERATION
    for i := range po.Items {
        poIt := &po.Items[i]
        poItemByID[poIt.ID] = poIt
    }
    // ...
}
```

**Masalah:** Map `poItemByID` dibangun ulang **di setiap iterasi** loop padahal `po` reference tidak berubah. Ini adalah:
- **Performance waste** (O(n*m) instead of O(n+m))
- **Copy-paste bug** dari `Create()` yang sudah benar (line 145–149 builds map outside the loop)

**Rekomendasi:** Pindahkan pembangunan map ke **sebelum** loop, seperti di `Create()`.

---

### 7. `calcItemSubtotal()` vs `calcPOItemSubtotal()` — Inconsistent Rounding

**File:**
- `purchase_requisition_usecase.go:536` → `calcItemSubtotal()` — **no rounding**
- `purchase_order_usecase.go:713` → `calcPOItemSubtotal()` — uses `math.Round()`

```go
// PR: tidak ada rounding
func calcItemSubtotal(qty, price, discount float64) float64 {
    raw := qty * price
    if discount <= 0 { return raw }
    return raw - (raw * (discount / 100))
}

// PO: pake math.Round
func calcPOItemSubtotal(qty, price, discount float64) float64 {
    raw := qty * price
    if discount <= 0 { return math.Round(raw) }
    return math.Round(raw - (raw * (discount / 100)))
}
```

**Masalah:** Inconsistency — PR tidak membulatkan subtotal tapi PO membulatkan ke integer (`math.Round` tanpa *100/100 = round ke integer). Ini bisa menyebabkan:
- Total yang berbeda antara PR dan PO yang dibuat dari PR
- Bug rounding: `math.Round(raw)` → rounds ke integer, bukan 2 decimal places. Seharusnya `math.Round(raw*100)/100` jika ingin 2 decimal places.

**Rekomendasi:**
1. Pilih satu strategi rounding yang konsisten
2. Jika ingin 2 decimal places, gunakan `math.Round(val*100)/100`
3. `math.Round(raw)` tanpa qualifier hanya round ke integer terdekat

---

### 8. SupplierInvoice Model: `InvoiceDate` dan `DueDate` Bertipe `string` Bukan `time.Time`

**File:** `purchase/data/models/supplier_invoice.go:49-50`

```go
InvoiceDate string `gorm:"type:varchar(20);index;not null" json:"invoice_date"`
DueDate     string `gorm:"type:varchar(20);index;not null" json:"due_date"`
```

**Masalah:** Disimpan sebagai `string` bukan `time.Time`. Ini inkonsisten dengan model lain (seperti `purchase_order.go` yang menggunakan `time.Time` untuk `OrderDate`). Dampak:
- Tidak bisa melakukan date comparison di level Go
- Database index pada varchar kurang efisien dibanding date type
- Rentan terhadap format inconsistency

**Rekomendasi:** Ubah ke `time.Time` dan update DTO/mapper sesuai.

---

### 9. PurchasePayment Model: `PaymentDate` Bertipe `string` Bukan `time.Time`

**File:** `purchase/data/models/purchase_payment.go:39`

```go
PaymentDate string `gorm:"type:varchar(20);not null;index" json:"payment_date"`
```

**Masalah:** Sama seperti issue #8 — inconsistent type. Model `finance/payment.go` menggunakan `time.Time` untuk `PaymentDate`.

---

### 10. Asset UseCase: Unused Import `salesModels`

**File:** `finance/domain/usecase/asset_usecase.go:15,671`

```go
import (
    salesModels "github.com/gilabs/gims/api/internal/sales/data/models"
)

// line 671:
var _ = salesModels.CustomerInvoice{}
```

**Masalah:** Import `salesModels` hanya digunakan untuk memastikan compile-time linkage, dengan komentar "sprint 12 success criteria." Ini adalah **dead code** — `var _ = salesModels.CustomerInvoice{}` tidak melakukan apa-apa selain memaksa import. Jika sprint 12 sudah selesai dan tidak ada actual usage, import ini seharusnya dihapus.

---

### 11. `ChartOfAccountUsecase.NewChartOfAccountUsecase` — Unused `db` Parameter

**File:** `finance/domain/usecase/chart_of_account_usecase.go:35-37`

```go
func NewChartOfAccountUsecase(db *gorm.DB, repo repositories.ChartOfAccountRepository, mapper *mapper.ChartOfAccountMapper) ChartOfAccountUsecase {
    _ = db  // ← explicitly ignored
    return &chartOfAccountUsecase{repo: repo, mapper: mapper}
}
```

**Masalah:** Parameter `db` diterima tapi di-ignore dengan `_ = db`. Artinya semua operasi hanya melalui repository. Ini bagus dari segi design (semua via repo), tapi parameter `db` sebaiknya **dihapus dari signature** karena tidak digunakan — kecuali ada rencana future use.

---

### 12. Payment Approve: Assumes All Allocations Are Debit-Side

**File:** `finance/domain/usecase/payment_usecase.go:468-478`

```go
for _, al := range p.Allocations {
    line := &financeModels.JournalLine{
        JournalEntryID:   je.ID,
        ChartOfAccountID: al.ChartOfAccountID,
        Debit:            al.Amount,  // ← always debit
        Credit:           0,
    }
    // ...
}
credit := &financeModels.JournalLine{
    // ...
    Credit: p.TotalAmount,  // ← single credit to bank
}
```

**Masalah:** Logika ini benar **hanya untuk Payment Out (bayar hutang)**. Tapi tidak ada field `Type` (IN/OUT) pada Payment model. Jika model ini juga digunakan untuk uang masuk (receiving), journal entries-nya terbalik. 

**Penilaian:** Jika Payment ini memang **hanya untuk pengeluaran**, maka ini benar. Tapi perlu diperhatikan jika ada requirement payment masuk di masa depan.

---

### 13. FinancialClosing Create: Tidak Ada Validasi Overlap Period

**File:** `finance/domain/usecase/financial_closing_usecase.go:37-65`

**Masalah:** `Create()` tidak memeriksa apakah `period_end_date` baru sudah ada (draft atau approved). Pengguna bisa membuat beberapa closing dengan period yang sama.

**Rekomendasi:** Tambahkan validasi sebelum create:
```go
var existing financeModels.FinancialClosing
err := tx.Where("period_end_date = ?", periodEnd).First(&existing).Error
if err == nil {
    return errors.New("closing for this period already exists")
}
```

---

### 14. SupplierInvoice Create: `TaxRate` Tidak Di-clamp

**File:** `purchase/domain/usecase/supplier_invoice_usecase.go:213`

```go
tax := subTotal * req.TaxRate / 100  // ← no clamping
```

**Masalah:** Berbeda dengan PR/PO yang menggunakan `clamp(req.TaxRate, 0, 100)`, Supplier Invoice tidak memvalidasi range TaxRate. Jika user mengirim `TaxRate: -50` atau `TaxRate: 200`, tax akan dihitung salah.

**Rekomendasi:** Tambahkan clamping: `taxRate := math.Max(0, math.Min(100, req.TaxRate))`

---

### 15. SupplierInvoice: `poItemIDByProduct` Overwrites Pada Multiple PO Items Dengan Product Sama

**File:** `supplier_invoice_usecase.go:178-183`

```go
poItemIDByProduct := make(map[string]string)
for _, it := range po.Items {
    orderedQtyByProduct[it.ProductID] += it.Quantity
    poItemIDByProduct[it.ProductID] = it.ID  // ← overwrites if same product appears twice
}
```

**Masalah:** Jika PO memiliki 2+ item dengan product_id yang sama (misal beda specs), hanya PO item terakhir yang di-link ke invoice item. Item invoice pertama akan reference PO item yang salah.

**Rekomendasi:** Pertimbangkan menggunakan `[]string` atau matching by PO item ID langsung.

---

## 🟢 LOW / Suggestions

### 16. `formatFloatKey()` vs `paymentAmountKey()` — Same Purpose, Different Names

**File:**
- `journal_entry_usecase.go:18` → `formatFloatKey()`  
- `payment_usecase.go:71` → `paymentAmountKey()`

**Masalah:** Keduanya melakukan hal yang sama (format float ke string untuk cache key). Bisa diextract ke satu helper.

---

### 17. Purchase Snapshot Helpers: Very Long Function — Refactor Opportunity

**File:** `purchase/domain/usecase/snapshot_helpers.go` (482 lines)

**Masalah:** File ini berisi 5 snapshot functions yang masing-masing sangat mirip patternnya. Bisa di-refactor dengan generic pattern:
```go
func snapshotField[T any](ctx context.Context, db *gorm.DB, newID, oldID string, table string, onFound func(T)) error { ... }
```

---

### 18. `finance/snapshot_helpers.go` — `snapshotBankAccountFields()` Never Used

**File:** `finance/domain/usecase/snapshot_helpers.go:11-23`

Fungsi `snapshotBankAccountFields()` dan struct `bankSnapshotTarget` (line 25-31) **tidak dipanggil** di mana pun. Payment dan CashBankJournal usecase melakukan snapshot secara inline.

**Rekomendasi:** Gunakan fungsi ini di Payment/CashBankJournal usecase, atau hapus jika tidak dipakai.

---

### 19. JournalEntry Create: COA Lookup N+1 Query

**File:** `finance/domain/usecase/journal_entry_usecase.go:107-114`

```go
coaByID := make(map[string]*financeModels.ChartOfAccount, len(req.Lines))
for _, ln := range req.Lines {
    coa, err := uc.coaRepo.FindByID(ctx, ln.ChartOfAccountID)  // ← 1 query per line
    // ...
    coaByID[ln.ChartOfAccountID] = coa
}
```

**Masalah:** Melakukan **N individual queries** ke COA (satu per journal line). Jika ada 10 lines, ini 10 DB queries.

**Rekomendasi:** Gunakan pattern `loadCOAMap()` yang sudah ada di `snapshot_helpers.go` — ini sudah melakukan batch `WHERE id IN ?` query. Pattern ini sudah digunakan di Payment, Budget, CashBankJournal usecases.

---

### 20. GoodsReceipt Confirm: N+1 Query pada Quantity Validation

**File:** `goods_receipt_usecase.go:358-383` dan `394-414`

**Masalah:** Dua loop terpisah query database per-item:
1. Loop pertama: satu query per item untuk mengecek `alreadyReceived` (line 368-375)
2. Loop kedua: satu query per PO item untuk mengecek `totalReceived` (line 397-404)

**Rekomendasi:** Ubah ke **single batch query** yang aggregate semua items sekaligus:
```sql
SELECT purchase_order_item_id, SUM(quantity_received) as total
FROM goods_receipt_items
JOIN goods_receipts ON ...
WHERE goods_receipts.status = 'CONFIRMED'
GROUP BY purchase_order_item_id
```

---

### 21. BudgetUsecase Update: Inconsistent Validation `math.Abs(sum) < 0.000001`

**File:** `budget_usecase.go:189`

```go
if math.Abs(sum) < 0.000001 {
    return nil, ErrBudgetInvalidItems
}
```

**Masalah:** `validateBudgetItems()` already requires `it.Amount > 0`, jadi `sum` akan selalu > 0 jika validation passes. Tapi `math.Abs(sum) < 0.000001` memeriksa apakah sum mendekati nol (false positive). Di `Create()`, pengecekan adalah `sum <= 0` yang lebih logis. Gunakan pengecekan yang sama.

---

### 22. CashBankJournal Update: Redundant Zero-Check

**File:** `cash_bank_journal_usecase.go:194`

```go
if math.Abs(sum) < 0.000001 {
    return nil, ErrCashBankInvalidLines
}
```

**Masalah:** `validateCashBankLines()` already requires `ln.Amount > 0`, jadi `sum` selalu > 0 setelah validasi. Check ini redundant.

---

## ✅ Yang Sudah Baik

1. **Clean Architecture** — Konsisten: data (models/repositories) → domain (dto/mapper/usecase) → presentation (handler/router)
2. **Snapshot Pattern** — Diterapkan dengan baik di semua modul untuk menyimpan data snapshot saat create/update
3. **Transaction Usage** — Semua operasi multi-step menggunakan database transaction
4. **Row Locking** — `clause.Locking{Strength: "UPDATE"}` digunakan pada concurrent operations (GR Create, SI Create, Payment Create/Confirm)
5. **Advisory Locks** — `pg_advisory_xact_lock` digunakan untuk code generation (GR, SI)
6. **Period Closing Guard** — `ensureNotClosed()` dipanggil konsisten sebelum journal entries
7. **Audit Trail** — Terimplementasi untuk GR, SI, Purchase Payment
8. **Input Validation** — Trim & validate pada semua entry points
9. **GR Confirm Auto-Close PO** — Logic auto-close PO jika semua items fully received

---

## Prioritas Perbaikan

| Priority | Issue | Effort |
|----------|-------|--------|
| 🔴 High | #7 Inconsistent rounding (potential data error) | Low |
| 🔴 High | #6 poItemByID rebuilt in loop (performance bug) | Low |
| 🔴 High | #14 TaxRate no clamping (data integrity) | Low |
| 🟡 Med | #1-5 Duplicate code (maintainability) | Medium |
| 🟡 Med | #8-9 String date types (inconsistency) | High |
| 🟡 Med | #13 Closing overlap validation | Low |
| 🟡 Med | #15 poItemIDByProduct overwrite | Low |
| 🟡 Med | #19 N+1 query (performance) | Medium |
| 🟢 Low | #10,11,18 Unused code cleanup | Low |
| 🟢 Low | #16,17 Code organization | Medium |
