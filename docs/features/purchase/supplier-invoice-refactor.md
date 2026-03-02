# Supplier Invoice — Business Logic Refactor

Refactor business rules untuk **Supplier Invoice (SI)**, **Supplier Down Payment Invoice (SIDP)**, dan **Goods Receipt (GR)** pada modul Purchase. Perubahan ini mengubah sumber data SI dari PO langsung menjadi Goods Receipt, menghapus auto-create SI dari DP, dan menambahkan auto-apply DP saat create SI.

## Fitur Utama

- SI create/update sekarang bersumber dari **Goods Receipt** (bukan PO langsung)
- `GoodsReceiptID` field baru pada model SI (nullable UUID, indexed)
- SIDP create **tidak lagi** otomatis membuat draft Regular SI
- Saat create SI dari GR, otomatis cek & apply **paid Down Payment** yang match PO-nya
- GR `ConvertToSupplierInvoice` juga auto-apply DP
- Frontend: GR selector dropdown menggantikan PO selector pada form SI
- List & detail SI menampilkan info Goods Receipt

## Business Rules

1. **SI Source = Goods Receipt**: SI hanya bisa dibuat dari GR yang berstatus `CLOSED`
2. **PO Derived**: `PurchaseOrderID` di-derive otomatis dari `GR.PurchaseOrderID` — user tidak perlu input PO
3. **Item Validation**: Quantity pada SI items divalidasi terhadap `QuantityReceived` pada GR items (bukan ordered qty pada PO)
4. **Price Source**: Harga per item diambil dari PO item (`OrderedPrice`) via GR→PO trace
5. **DP Auto-Apply**: Saat create SI, sistem otomatis trace GR→PO→SIDP(PAID), sum `PaidAmount`, dan set `DownPaymentAmount` + `RemainingAmount`
6. **SIDP Independence**: Create SIDP hanya membuat DP itu sendiri, tidak ada side-effect ke Regular SI
7. **Three-Way Matching**: Tetap berjalan via PO-based GR join pada flow `Pending` (tidak berubah)
8. **1 SI per GR**: Validasi mencegah duplikasi SI untuk GR yang sama
9. **Backward Compatibility**: `GoodsReceiptID` nullable — SI lama tanpa GR link tetap valid

## Keputusan Teknis

- **Mengapa source SI dari GR bukan PO langsung**:
  GR merepresentasikan barang yang sudah benar-benar diterima. Invoicing berdasarkan received qty lebih akurat dibanding ordered qty. Trade-off: user harus close GR dulu sebelum bisa buat SI.

- **Mengapa DP tidak auto-create SI lagi**:
  Business flow seharusnya: PO → GR (terima barang) → SI (invoice). DP adalah advance payment yang berdiri sendiri. Auto-create SI dari DP confusing karena SI belum ada barang yang diterima. Trade-off: user perlu create SI manual setelah GR closed.

- **Mengapa auto-apply DP saat create SI**:
  Mengurangi manual step. Saat user create SI dari GR, sistem otomatis cek apakah PO-nya sudah punya paid DP, dan langsung apply sebagai deduction. Trade-off: logic lookup tambahan saat create, tapi hanya 1 query.

- **Mengapa GoodsReceiptID nullable**:
  SIDP (type=DOWN_PAYMENT) tidak punya GR source. Dan SI lama yang dibuat sebelum refactor juga tidak punya `GoodsReceiptID`. Nullable menjaga backward compatibility tanpa data migration.

## Struktur Folder

```
apps/api/internal/purchase/
├── data/
│   ├── models/
│   │   └── supplier_invoice.go          # + GoodsReceiptID field
│   └── repositories/
│       └── supplier_invoice_repository.go  # + Preload GoodsReceipt
├── domain/
│   ├── dto/
│   │   └── supplier_invoice_dto.go      # Full rewrite: GR-based DTOs
│   ├── mapper/
│   │   └── supplier_invoice_mapper.go   # + GR mapping
│   └── usecase/
│       ├── supplier_invoice_usecase.go  # Major refactor (AddData, Create, replaceDraft)
│       ├── goods_receipt_usecase.go     # ConvertToSI + DP auto-apply
│       └── supplier_invoice_down_payment_usecase.go  # Removed auto-create SI
└── presentation/
    ├── handler/
    │   └── supplier_invoice_handler.go  # + GR error handling
    ├── router/
    │   └── supplier_invoice_routers.go  # Unchanged
    └── routes.go                        # + grRepo injection

apps/web/src/features/purchase/supplier-invoices/
├── types/index.d.ts                     # + GR types, goods_receipt_id
├── schemas/supplier-invoice.schema.ts   # purchase_order_id → goods_receipt_id
├── components/
│   ├── supplier-invoice-form.tsx        # GR selector dropdown
│   ├── supplier-invoices-list.tsx       # + GR column
│   └── supplier-invoice-detail.tsx      # + GR display section
└── i18n/
    ├── en.ts                            # + goodsReceipt translations
    └── id.ts                            # + goodsReceipt translations
```

## API Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/purchase/supplier-invoices/add` | supplier-invoice.create | Form data: Closed GRs + Payment Terms + DP trace |
| GET | `/purchase/supplier-invoices` | supplier-invoice.read | List SI with pagination, includes `goods_receipt` mini |
| POST | `/purchase/supplier-invoices` | supplier-invoice.create | Create SI from GR (auto-apply DP) |
| GET | `/purchase/supplier-invoices/:id` | supplier-invoice.read | Detail SI with `goods_receipt`, items, DP info |
| PUT | `/purchase/supplier-invoices/:id` | supplier-invoice.update | Update draft SI (re-validates GR, re-applies DP) |
| DELETE | `/purchase/supplier-invoices/:id` | supplier-invoice.delete | Delete draft SI |
| POST | `/purchase/supplier-invoices/:id/submit` | supplier-invoice.submit | Submit for approval |
| POST | `/purchase/supplier-invoices/:id/approve` | supplier-invoice.approve | Approve submitted SI |
| POST | `/purchase/supplier-invoices/:id/reject` | supplier-invoice.reject | Reject submitted SI |
| POST | `/purchase/supplier-invoices/:id/cancel` | supplier-invoice.cancel | Cancel SI |
| POST | `/purchase/supplier-invoices/:id/pending` | supplier-invoice.pending | Three-way matching + journal entry |
| GET | `/purchase/supplier-invoices/export` | supplier-invoice.export | Export CSV |
| GET | `/purchase/supplier-invoices/:id/audit-trail` | supplier-invoice.audit-trail | Audit log |
| GET | `/purchase/supplier-invoices/:id/print` | supplier-invoice.print | Print view |

### Request Body — Create/Update SI

```json
{
  "goods_receipt_id": "uuid",
  "payment_terms_id": "uuid",
  "invoice_number": "INV-2025-001",
  "invoice_date": "2025-06-15",
  "due_date": "2025-07-15",
  "tax_rate": 11,
  "delivery_cost": 0,
  "other_cost": 0,
  "notes": "optional notes",
  "items": [
    {
      "product_id": "uuid",
      "quantity": 10,
      "price": 50000,
      "discount": 0
    }
  ]
}
```

### Response — Add Data (Form Options)

```json
{
  "success": true,
  "data": {
    "payment_terms": [{ "id": "uuid", "name": "Net 30" }],
    "goods_receipts": [
      {
        "id": "uuid",
        "code": "GR-2025-001",
        "purchase_order": { "id": "uuid", "code": "PO-2025-001" },
        "supplier": { "id": "uuid", "name": "PT Supplier" },
        "receipt_date": "2025-06-10T00:00:00Z",
        "status": "CLOSED",
        "items": [
          {
            "id": "uuid",
            "purchase_order_item_id": "uuid",
            "product": { "id": "uuid", "name": "Widget A", "code": "WDG-A" },
            "quantity_received": 10,
            "price": 50000,
            "sub_total": 500000
          }
        ],
        "invoice_dp": {
          "id": "uuid",
          "code": "SIDP-2025-001",
          "amount": 1000000,
          "paid_amount": 1000000,
          "status": "PAID"
        }
      }
    ]
  }
}
```

## Cara Test Manual

1. Login sebagai user dengan permission `supplier-invoice.create`
2. Pastikan ada PO yang sudah APPROVED
3. Create Goods Receipt dari PO → approve → close GR
4. (Optional) Create Supplier DP Invoice dari PO → bayar sampai status PAID
5. Navigate ke `/purchase/supplier-invoices`
6. Click "Create" → dropdown Goods Receipt harus menampilkan GR yang CLOSED
7. Pilih GR → items otomatis terisi dari GR items (qty received × PO price)
8. Jika PO punya paid DP, bagian Down Payment harus terisi otomatis
9. Submit → status berubah ke SUBMITTED
10. Login sebagai approver → Approve
11. Set Pending → three-way matching harus pass (SI qty ≤ GR received qty)
12. Verify: SIDP create **tidak** auto-create Regular SI (hanya buat DP saja)

## Automated Testing

- **Unit Tests**: Belum ada (purchase module tidak memiliki test files)
- **Build Verification**: `go build ./...` ✅ pass, `pnpm check-types` ✅ no SI errors

```bash
# Backend build
cd apps/api && go build ./...

# Frontend type check
cd apps/web && npx pnpm check-types
```

## Dependencies

- **Backend**: GORM (models/repositories), Gin (HTTP), PostgreSQL (database), advisory locks (code generation)
- **Frontend**: TanStack Query (data fetching), Zod (validation), React Hook Form (forms), next-intl (i18n)
- **Integration**: Goods Receipt module (source data), Purchase Order module (PO prices, DP trace), Finance module (journal entries on Pending)

## Related Links

- Working Plan: `docs/working-plan-purchase-invoice-refactor.md`
- Postman Collection: `docs/postman/postman.json` → Purchase → Supplier Invoices (14 endpoints)

## Notes & Improvements

- **Known Limitation**: `snapshotSupplierInvoice()` does not snapshot GR code — not critical since GR code is immutable after closure
- **Backward Compatibility**: Existing SI records without `goods_receipt_id` remain valid (nullable field)
- **Future Improvement**:
  - Add unit tests for SI create/update with GR source validation
  - Add integration tests for DP auto-apply flow
  - Consider event-driven DP invalidation if DP payment is reversed after SI creation
  - Add data migration script to backfill `goods_receipt_id` for existing SI converted from GR
