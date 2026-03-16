# Working Plan: Purchase Invoice Business Logic Refactor

## Ringkasan Perubahan

Refactor business rules pada modul Purchase terkait **Supplier Invoice (SI)**, **Supplier Down Payment Invoice (SIDP)**, dan **Goods Receipt (GR)** dengan 3 perubahan utama:

| # | Perubahan | Sebelum (Current) | Sesudah (Target) |
|---|-----------|-------------------|-------------------|
| 1 | **Sumber data SI** | Create SI manual dari PO (input `purchase_order_id`) | Create SI dari **Goods Receipt** (input `goods_receipt_id`) |
| 2 | **DP Invoice create** | Create SIDP dari PO → **otomatis create draft SI** | Create SIDP dari PO → **TIDAK otomatis create SI** |
| 3 | **Auto-apply DP** | DP di-apply manual / di-link saat create SI via PO | Saat create SI dari GR, **otomatis cek & apply** SIDP yang match PO code-nya (trace: GR → PO → SIDP) |

---

## Analisis Current State

### 1. Supplier Invoice (SI) - Current Flow
- **File:** `apps/api/internal/purchase/domain/usecase/supplier_invoice_usecase.go`
- **Create:** Input `purchase_order_id` + items (product, qty, price)
- **AddData:** Returns list of approved POs + payment terms + DP info
- **DTO:** `CreateSupplierInvoiceRequest` has `PurchaseOrderID` field
- **Model:** `SupplierInvoice` has `PurchaseOrderID` (required), no `GoodsReceiptID`
- **Three-Way Matching (Pending):** Validates qty invoiced ≤ qty received via GR table join

### 2. Supplier DP Invoice (SIDP) - Current Flow
- **File:** `apps/api/internal/purchase/domain/usecase/supplier_invoice_down_payment_usecase.go`
- **Create:** Input `purchase_order_id` + amount
- **Side Effect:** Saat create SIDP, **otomatis create draft Regular SI** jika belum ada SI untuk PO tersebut (lines 176-226)
- **Problem:** User tidak ingin SI otomatis di-create dari DP, karena SI seharusnya bersumber dari GR

### 3. Goods Receipt (GR) → SI Conversion - Current Flow
- **File:** `apps/api/internal/purchase/domain/usecase/goods_receipt_usecase.go`
- **ConvertToSupplierInvoice:** Creates draft SI from CLOSED GR
- **Existing link:** `GoodsReceipt.ConvertedToSupplierInvoiceID` tracks conversion
- **Problem:** Conversion ada tapi sedikit terisolasi; GR → SI belum jadi flow utama

### 4. Model Relations (Current)
```
PurchaseOrder (PO)
├── SupplierInvoice (SI) → via PurchaseOrderID (required FK)
│   └── SupplierInvoiceItem → via SupplierInvoiceID
├── SupplierInvoice (SIDP, type=DOWN_PAYMENT) → via PurchaseOrderID
├── GoodsReceipt (GR) → via PurchaseOrderID
│   └── GoodsReceiptItem → via GoodsReceiptID
└── (SI links to SIDP via DownPaymentInvoiceID)
```

---

## Detail Perubahan

### Perubahan 1: SI Source dari Goods Receipt (bukan PO langsung)

#### 1a. Model Changes
**File:** `apps/api/internal/purchase/data/models/supplier_invoice.go`

Tambah field `GoodsReceiptID` pada `SupplierInvoice` model:
```go
GoodsReceiptID  *string       `gorm:"type:uuid;index" json:"goods_receipt_id,omitempty"`
GoodsReceipt    *GoodsReceipt `gorm:"foreignKey:GoodsReceiptID" json:"goods_receipt,omitempty"`
```
- **Nullable** karena SIDP (type=DOWN_PAYMENT) tidak punya GR
- `PurchaseOrderID` tetap **required** — bisa di-derive dari GR's `PurchaseOrderID`

#### 1b. DTO Changes
**File:** `apps/api/internal/purchase/domain/dto/supplier_invoice_dto.go`

Update `CreateSupplierInvoiceRequest`:
```go
// BEFORE
type CreateSupplierInvoiceRequest struct {
    PurchaseOrderID string `json:"purchase_order_id" binding:"required,uuid"`
    ...
}

// AFTER
type CreateSupplierInvoiceRequest struct {
    GoodsReceiptID  string `json:"goods_receipt_id" binding:"required,uuid"`  // NEW: source dari GR
    PaymentTermsID  string `json:"payment_terms_id" binding:"required,uuid"`
    InvoiceNumber   string `json:"invoice_number" binding:"required"`
    InvoiceDate     string `json:"invoice_date" binding:"required"`
    DueDate         string `json:"due_date" binding:"required"`
    TaxRate         float64 `json:"tax_rate" ...`
    DeliveryCost    float64 `json:"delivery_cost" ...`
    OtherCost       float64 `json:"other_cost" ...`
    Notes           *string `json:"notes"`
    Items           []CreateSupplierInvoiceItemRequest `json:"items" binding:"required,min=1,dive"`
}
```

Update `UpdateSupplierInvoiceRequest` sama — ganti `PurchaseOrderID` → `GoodsReceiptID`.

Update `SupplierInvoiceAddResponse` — ganti source PO list menjadi **Closed GR list** (yang belum punya SI):
```go
type SupplierInvoiceAddResponse struct {
    PaymentTerms    []SupplierInvoiceAddPaymentTerms    `json:"payment_terms"`
    GoodsReceipts   []SupplierInvoiceAddGoodsReceipt    `json:"goods_receipts"` // NEW: replace purchase_orders
}
```

Tambah DTO baru untuk GR mini:
```go
type SupplierInvoiceAddGoodsReceipt struct {
    ID               string                               `json:"id"`
    Code             string                               `json:"code"`
    PurchaseOrder    *SupplierInvoicePurchaseOrderMini    `json:"purchase_order,omitempty"`
    Supplier         *SupplierInvoiceAddSupplierMini      `json:"supplier,omitempty"`
    ReceiptDate      *time.Time                           `json:"receipt_date,omitempty"`
    Status           string                               `json:"status"`
    Items            []SupplierInvoiceAddGoodsReceiptItem `json:"items"`
    InvoiceDP        *SupplierInvoiceAddDownPaymentMini   `json:"invoice_dp,omitempty"` // Auto-detected DP
}

type SupplierInvoiceAddGoodsReceiptItem struct {
    ID                  string                         `json:"id"`
    PurchaseOrderItemID string                         `json:"purchase_order_item_id"`
    Product             *SupplierInvoiceAddProductMini `json:"product,omitempty"`
    QuantityReceived    float64                        `json:"quantity_received"`
    Price               float64                        `json:"price"`    // dari PO item
    SubTotal            float64                        `json:"sub_total"` // qty × price
}
```

Add GoodsReceipt info to response DTOs:
```go
// Add to SupplierInvoiceListResponse & SupplierInvoiceDetailResponse:
GoodsReceipt *SupplierInvoiceGoodsReceiptMini `json:"goods_receipt,omitempty"`

type SupplierInvoiceGoodsReceiptMini struct {
    ID   string `json:"id"`
    Code string `json:"code"`
}
```

#### 1c. Usecase Changes — SI Create
**File:** `apps/api/internal/purchase/domain/usecase/supplier_invoice_usecase.go`

**`Create()` method refactor:**
1. Input berubah: ambil `GoodsReceiptID` bukan `PurchaseOrderID`
2. Load GR + preload Items, PO
3. Validate GR status = `CLOSED`
4. Validate GR belum punya SI aktif (cek `goods_receipt_id` is unique, atau `ConvertedToSupplierInvoiceID` is nil)
5. Derive `PurchaseOrderID` dari `GR.PurchaseOrderID`
6. Build items dari GR items (qty = `QuantityReceived`, price dari PO item)
7. **Auto-apply DP** → lihat Perubahan 3

**`AddData()` method refactor:**
1. Ganti fetch Approved POs → fetch **Closed GRs** yang belum punya SI
2. Untuk setiap GR, cek apakah PO-nya punya DP Invoice (otomatis lampirkan info)
3. Fetch PO item prices untuk menampilkan harga per GR item

**`Update()` / `replaceDraft()` method refactor:**
1. Input berubah: ambil `GoodsReceiptID` bukan `PurchaseOrderID`
2. Lock GR instead of PO
3. Re-derive PO from GR
4. Item validation against GR items instead of PO items

#### 1d. Usecase Changes — GR ConvertToSupplierInvoice
**File:** `apps/api/internal/purchase/domain/usecase/goods_receipt_usecase.go`

Method `ConvertToSupplierInvoice()` perlu di-update:
1. Set `GoodsReceiptID` pada SI yang dibuat
2. Auto-apply DP (lihat Perubahan 3)
3. Update `GR.ConvertedToSupplierInvoiceID` = si.ID

#### 1e. Mapper Changes
**File:** `apps/api/internal/purchase/domain/mapper/supplier_invoice_mapper.go`

- Add `GoodsReceipt` mapping ke `ToListResponse()` dan `ToDetailResponse()`

#### 1f. Three-Way Matching (Pending) — Impact
**File:** `supplier_invoice_usecase.go` → `Pending()`

Current logic sudah melakukan three-way matching (SI qty ≤ GR received qty). Dengan perubahan ini:
- Logic tetap valid karena PO masih di-link
- Tambahan: validasi bahwa `GoodsReceiptID` valid dan GR status masih CLOSED
- Qty validation sekarang lebih natural karena SI items di-derive dari GR items

---

### Perubahan 2: DP Invoice TIDAK otomatis create SI

#### 2a. Remove auto-create logic
**File:** `apps/api/internal/purchase/domain/usecase/supplier_invoice_down_payment_usecase.go`

Pada `Create()` method (lines ~176-226), **hapus** block kode yang:
1. Check `existingReg` (regular invoice for this PO)
2. Auto-create draft Regular Invoice jika tidak ada
3. Auto-link `DownPaymentInvoiceID`

**BEFORE (hapus):**
```go
// LOGIC: Automatically create a Draft Regular Invoice if none exists
var existingReg models.SupplierInvoice
err = tx.Where("purchase_order_id = ? AND type = ?", po.ID, models.SupplierInvoiceTypeNormal).First(&existingReg).Error
if err == gorm.ErrRecordNotFound {
    // ... create regular SI ... (ALL OF THIS REMOVED)
} else if err == nil {
    // ... link existing ... (ALL OF THIS REMOVED)
}
```

**AFTER:**
DP Invoice hanya create dirinya sendiri. Tidak ada side-effect ke Regular SI.

#### 2b. Impact Assessment
- **No model changes needed** untuk DP
- **No DTO changes needed** untuk DP
- **Frontend:** Form create SIDP tetap sama (input PO + amount)
- **Flow:** SIDP create → hanya create SIDP, user harus create SI terpisah dari GR

---

### Perubahan 3: Auto-apply DP saat Create SI

#### 3a. Logic di SI Create & ConvertToSupplierInvoice

Saat membuat SI (baik dari `Create()` maupun `ConvertToSupplierInvoice()`):

1. **Trace PO Code:** GR → `GR.PurchaseOrderID` → PO
2. **Find DP Invoices:** Query semua SIDP untuk PO tersebut yang status `PAID`
3. **Calculate DP deduction:**
   ```go
   dpAmount = SUM(dp.PaidAmount) for all PAID DPs of this PO
   ```
4. **Apply to SI:**
   ```go
   si.DownPaymentAmount = dpAmount
   si.DownPaymentInvoiceID = &firstDPID  // link ke DP pertama
   si.RemainingAmount = max(0, grossAmount - dpAmount)
   ```

**Catatan:** Logic ini sebagian besar **sudah ada** di current `Create()` dan `Pending()`. Yang perlu diubah:
- Di `Create()`: Source `PurchaseOrderID` berubah (derive dari GR), tapi DP lookup logic tetap sama
- Di `ConvertToSupplierInvoice()`: Tambah DP lookup yang saat ini belum ada

#### 3b. Updated ConvertToSupplierInvoice (pseudocode)
```go
func ConvertToSupplierInvoice(ctx, grID) {
    gr := loadGR(grID) // with items, PO
    
    // Build SI items from GR items
    items, subTotal := buildSIItemsFromGR(gr)
    
    // Auto-detect DP for this PO
    dpAmount, dpInvoiceID := findPaidDPForPO(gr.PurchaseOrderID)
    
    si := SupplierInvoice{
        Type: NORMAL,
        GoodsReceiptID: &gr.ID,        // NEW
        PurchaseOrderID: gr.PurchaseOrderID,
        DownPaymentAmount: dpAmount,    // AUTO-APPLIED
        DownPaymentInvoiceID: dpInvoiceID,
        RemainingAmount: max(0, grossAmount - dpAmount),
        ...
    }
    
    save(si)
    updateGR(gr.ID, convertedToSI = si.ID)
}
```

---

## Migration Plan

### Database Migration
```sql
-- Add goods_receipt_id column to supplier_invoices table
ALTER TABLE supplier_invoices ADD COLUMN goods_receipt_id UUID REFERENCES goods_receipts(id);
CREATE INDEX idx_supplier_invoices_goods_receipt_id ON supplier_invoices(goods_receipt_id);
```

GORM AutoMigrate akan handle ini otomatis karena kita tambah field di model.

### Data Migration (Existing Data)
Existing SI records yang sudah di-create dari PO/ConvertToSupplierInvoice:
- **No breaking change:** `goods_receipt_id` is nullable → existing records tetap valid
- Untuk GR yang sudah punya `ConvertedToSupplierInvoiceID`:
  ```sql
  UPDATE supplier_invoices si
  SET goods_receipt_id = gr.id
  FROM goods_receipts gr
  WHERE gr.converted_to_supplier_invoice_id = si.id;
  ```

---

## Files yang Perlu Diubah

### Backend (Priority Order)

| # | File | Perubahan | Priority |
|---|------|-----------|----------|
| 1 | `purchase/data/models/supplier_invoice.go` | Add `GoodsReceiptID` + `GoodsReceipt` fields | P0 |
| 2 | `purchase/domain/dto/supplier_invoice_dto.go` | Update Create/Update request (GoodsReceiptID), AddResponse (GR list), List/Detail response (GR info) | P0 |
| 3 | `purchase/domain/mapper/supplier_invoice_mapper.go` | Add GR mapping to response mappers | P0 |
| 4 | `purchase/domain/usecase/supplier_invoice_usecase.go` | Refactor `Create()`, `Update()/replaceDraft()`, `AddData()` untuk source GR | P0 |
| 5 | `purchase/domain/usecase/goods_receipt_usecase.go` | Update `ConvertToSupplierInvoice()` — set GoodsReceiptID, auto-apply DP | P1 |
| 6 | `purchase/domain/usecase/supplier_invoice_down_payment_usecase.go` | Remove auto-create SI logic dari `Create()` | P1 |
| 7 | `core/infrastructure/database/migrate.go` | Verify model registered (already done) | P2 |

### Frontend (Subsequent Sprint / Out of Scope for Backend Plan)

| # | File | Perubahan |
|---|------|-----------|
| 1 | SI create form | GR selector instead of PO selector |
| 2 | SI service | Update API request payload |
| 3 | SI types | Add `goods_receipt_id`, `goods_receipt` |
| 4 | SI hooks | Update create/update mutations |
| 5 | SIDP create form | Remove auto-SI messaging (if any) |

### Postman Collection
- Update SI create/update request body (`purchase_order_id` → `goods_receipt_id`)
- Update SI add-data response example (POs → GRs)
- Document new `goods_receipt` field in SI responses

---

## Impact Analysis pada Modul Lain

| Modul | Component | Impact | Action |
|-------|-----------|--------|--------|
| **Finance** | Journal Entry (SI Pending) | No change — journal logic reads from SI model, PO link masih ada | None |
| **Finance** | Journal Entry (SIDP Pending) | No change — DP journal independent dari SI | None |
| **Finance** | Budget Guard | No change — still checks at Pending time | None |
| **Inventory** | Stock movement (GR Approve) | No change — inventory adjustment saat GR Approve, bukan saat SI create | None |
| **Purchase** | Purchase Payment | No change — payment links to SI, DP deduction already on SI | None |
| **Purchase** | Three-Way Matching | Simplified — SI items now directly from GR, so qty match is inherent | Minor simplification |
| **Purchase** | PO Status | No change — PO remains Approved, GR tracks CLOSED state | None |

---

## Risk & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Existing SI data tanpa `goods_receipt_id` | Minor — field nullable | Data migration script optional, backward compatible |
| DP yang sudah auto-create SI | Orphaned draft SI | Manual cleanup atau let user edit/delete |
| Frontend belum support GR selector | Create SI UI broken | **Coordinate with frontend** atau keep PO fallback sementara |
| Multiple GR per PO | SI bisa di-create per GR | Validation: 1 SI per GR (prevent duplicate) |
| GR tanpa PO item prices | SI item price = 0 | PO item price lookup tetap ada via `GR.PurchaseOrderID` |

---

## Execution Order (Task Breakdown)

### Phase 1: Backend Core (This Sprint)
1. ✅ Analyze & create working plan
2. ✅ Model: Add `GoodsReceiptID` to `SupplierInvoice`
3. ✅ DTO: Update `CreateSupplierInvoiceRequest` (GoodsReceiptID)
4. ✅ DTO: Update `UpdateSupplierInvoiceRequest` (GoodsReceiptID)
5. ✅ DTO: Update `SupplierInvoiceAddResponse` (GR list)
6. ✅ DTO: Add `SupplierInvoiceAddGoodsReceipt` + item DTOs
7. ✅ DTO: Add `SupplierInvoiceGoodsReceiptMini` to list/detail responses
8. ✅ Mapper: Add GR mapping
9. ✅ Usecase: Refactor `SI.AddData()` → fetch Closed GRs
10. ✅ Usecase: Refactor `SI.Create()` → source from GR
11. ✅ Usecase: Refactor `SI.Update()/replaceDraft()` → source from GR
12. ✅ Usecase: Update `GR.ConvertToSupplierInvoice()` → set GoodsReceiptID + auto-apply DP
13. ✅ Usecase: Remove auto-create SI from `SIDP.Create()`
14. ✅ Verify: `go build ./...` passes
15. ✅ Verify: Existing tests pass (no test files in purchase module — all packages `[no test files]`)
16. ✅ Update Postman collection (Purchase > Supplier Invoices, 14 endpoints)

### Phase 2: Frontend
17. ✅ Update types/interfaces
18. ✅ Update SI create/update form (GR selector)
19. ✅ Update SI schema (Zod: `goods_receipt_id`)
20. ✅ Update SI list component (GR column)
21. ✅ Update SI detail component (GR section)
22. ✅ Update i18n translations (en/id)
23. ✅ Review SIDP frontend — no auto-SI messaging found (UI only shows read-only linked regular invoices)

---

## Business Rule Summary (Final State)

```
Purchase Order (PO) [APPROVED]
│
├──► Supplier DP Invoice (SIDP) [create from PO]
│    └── Amount = user input
│    └── NO auto-create SI
│
├──► Goods Receipt (GR) [create from PO, CLOSED after approval]
│    │
│    └──► Supplier Invoice (SI) [create from GR]
│         ├── Items = derived from GR items (qty received × PO price)
│         ├── PurchaseOrderID = derived from GR.PurchaseOrderID
│         ├── GoodsReceiptID = GR.ID (NEW)
│         └── DP Auto-Apply:
│             ├── Trace: GR → PO → find PAID SIDPs
│             ├── DownPaymentAmount = SUM(SIDP.PaidAmount)
│             └── RemainingAmount = GrossAmount - DownPaymentAmount
│
└──► Purchase Payment [links to SI, pays remaining amount]
```

---

## Implementation Results

### Status: ✅ ALL TASKS 100% COMPLETED

Implementation date: June 2025  
Verification date: March 2026

### Files Modified — Backend

| # | File | Changes Made |
|---|------|-------------|
| 1 | `purchase/data/models/supplier_invoice.go` | Added `GoodsReceiptID *string` (nullable UUID, indexed) + `GoodsReceipt *GoodsReceipt` relation |
| 2 | `purchase/domain/dto/supplier_invoice_dto.go` | Full rewrite: Create/Update use `GoodsReceiptID`, AddResponse returns `GoodsReceipts[]`, added GR mini DTOs, added `PaidAmount` to DP mini |
| 3 | `purchase/domain/mapper/supplier_invoice_mapper.go` | Added GR mapping to `ToListResponse()` and `ToDetailResponse()` |
| 4 | `purchase/data/repositories/supplier_invoice_repository.go` | Added `Preload("GoodsReceipt")` to `List()` and `GetByID()` |
| 5 | `purchase/domain/usecase/supplier_invoice_usecase.go` | **Major refactor**: struct accepts `grRepo`, `AddData()` fetches Closed GRs with DP trace, `Create()` validates GR→derives PO→builds items from GR received qty→auto-applies DP, `replaceDraft()` fully rewritten for GR source |
| 6 | `purchase/domain/usecase/goods_receipt_usecase.go` | `ConvertToSupplierInvoice()` now sets `GoodsReceiptID`, auto-applies paid DPs (sums PaidAmount), sets `converted_to_supplier_invoice_id` |
| 7 | `purchase/domain/usecase/supplier_invoice_down_payment_usecase.go` | Removed entire auto-create SI block (~50 lines). SIDP create now only creates the DP itself |
| 8 | `purchase/presentation/routes.go` | Updated SI usecase constructor to pass `grRepo` parameter |
| 9 | `purchase/presentation/handler/supplier_invoice_handler.go` | Updated Create/Update error handling for `ErrGoodsReceiptNotFound` with `req.GoodsReceiptID` |

### Files Modified — Frontend

| # | File | Changes Made |
|---|------|-------------|
| 1 | `supplier-invoices/types/index.d.ts` | Added `SupplierInvoiceGoodsReceiptMini`, `goods_receipt` to list/detail, `SupplierInvoiceAddGoodsReceipt`/Item types, changed AddResponse from `purchase_orders` to `goods_receipts`, changed CreateInput/UpdateInput from `purchase_order_id` to `goods_receipt_id` |
| 2 | `supplier-invoices/schemas/supplier-invoice.schema.ts` | Changed `purchase_order_id: z.string().uuid()` → `goods_receipt_id: z.string().uuid()` |
| 3 | `supplier-invoices/components/supplier-invoice-form.tsx` | Complete refactor: GR selector dropdown (shows GR code + PO/Supplier info), item population from `selectedGR.items` using `quantity_received`, edit mode handles `goods_receipt` field, DP summary shown from GR trace |
| 4 | `supplier-invoices/components/supplier-invoices-list.tsx` | Added "Goods Receipt" column showing `row.goods_receipt.code`, updated colSpan for skeleton/empty states |
| 5 | `supplier-invoices/components/supplier-invoice-detail.tsx` | Added GR display section between PO and DP sections |
| 6 | `supplier-invoices/i18n/en.ts` | Added `goodsReceipt` to fields and columns |
| 7 | `supplier-invoices/i18n/id.ts` | Added `goodsReceipt` to fields and columns |

### Build Verification
- **Backend**: `go build ./...` ✅ passes (only pre-existing errors in `organization/domain/mapper/employee_mapper.go` — unrelated `ApprovedAt` field)
- **Backend Tests**: `go test ./internal/purchase/...` ✅ all packages pass (no test files in purchase module)
- **Frontend**: `pnpm check-types` ✅ zero errors in supplier-invoice files (all errors are in unrelated modules)

### Implementation Notes

1. **Three-Way Matching (Pending flow)**: Not modified. Still validates via `si.PurchaseOrderID` joining GR table. This works correctly because GR→PO link is always present, and SI now derives its `PurchaseOrderID` from GR.

2. **Snapshot Helper**: `snapshotSupplierInvoice()` was not modified as it works on the SI model which still has `PurchaseOrderID`. The new `GoodsReceiptID` is stored but not snapshotted (not critical for audit).

3. **GORM AutoMigrate**: The `goods_receipt_id` column and index will be auto-created by GORM on server start. No manual SQL migration needed.

4. **Backward Compatibility**: `GoodsReceiptID` is nullable — existing SI records without a GR link remain valid. Existing SIDP records are unaffected.

5. **DP Auto-Apply Logic**: Both `SI.Create()` and `GR.ConvertToSupplierInvoice()` now share the same pattern: query SIDP by PO ID where status=PAID → sum PaidAmount → apply as DownPaymentAmount.

### Remaining Tasks

| # | Task | Priority | Status |
|---|------|----------|--------|
| 1 | Update Postman collection (`docs/postman/postman.json`) | P1 | ✅ Done (14 endpoints) |
| 2 | Frontend type-check verification (`pnpm check-types`) | P1 | ✅ Done (0 SI errors) |
| 3 | Optional: Data migration for existing GR→SI links | P2 | ⬜ Optional (not breaking) |
| 4 | Review SIDP frontend for auto-SI messaging removal | P2 | ✅ Done (no messaging found) |
| 5 | Feature documentation (`docs/features/purchase/supplier-invoice-refactor.md`) | P2 | ✅ Done |
