# Return Goods Sprint (Sales and Purchase)

Fitur ini menstandarkan alur pengembalian barang untuk dua arah transaksi:

- **Sales Return**: barang kembali dari customer ke perusahaan.
- **Purchase Return**: barang dikembalikan dari perusahaan ke supplier.

Tujuan utamanya adalah menjaga konsistensi **stok**, **dokumen keuangan (credit/debit note, journal)**, dan **traceability** antar dokumen sumber (invoice, delivery, goods receipt, PO).

## Fitur Utama

- Workflow baku `create/list/detail` untuk Sales Return dan Purchase Return.
- Endpoint **form-data** tunggal per modul untuk dropdown form (reasons, condition, warehouse, action).
- Penyesuaian stok otomatis saat return dibuat:
  - Sales Return: stok **bertambah** ke warehouse tujuan.
  - Purchase Return: stok **berkurang** dari warehouse asal.
- Integrasi akuntansi dasar:
  - Sales Return: buat **credit note** / jurnal refund.
  - Purchase Return: buat **debit note** / supplier credit record.
- Link kuat ke dokumen asal:
  - Sales: invoice, delivery, payment.
  - Purchase: goods receipt, purchase order, supplier invoice.
- Permission khusus return (`sales.return.*`, `purchase.return.*`) untuk kontrol akses.

## Business Rules

### 1. Sales Return (Customer -> Company)

1. Return hanya bisa dibuat jika invoice sumber valid, milik customer yang sama, dan dalam return window.
2. Item return harus berasal dari item yang pernah terkirim/tertangih pada invoice + delivery terkait.
3. Kuantitas return tidak boleh melebihi kuantitas eligible (`shipped - previously_returned`).
4. Kondisi barang wajib diisi (`GOOD`, `DAMAGED`, `EXPIRED`, `WRONG_ITEM`, `OTHER`).
5. Tindakan akhir wajib salah satu: `REFUND`, `CREDIT_NOTE`, `REPLACEMENT`.
6. Jika `REFUND` atau `CREDIT_NOTE`, sistem wajib membuat record akuntansi terkait.
7. Jika `REPLACEMENT`, sistem wajib membuat referensi dokumen replacement shipment (langsung atau draft).

### 2. Purchase Return (Company -> Supplier)

1. Return hanya bisa dibuat dari Goods Receipt (GR) valid dan supplier yang sesuai.
2. Item return harus berasal dari GR item yang valid.
3. Kuantitas return tidak boleh melebihi kuantitas yang diterima dan belum pernah direturn.
4. Alasan return wajib diisi (`DEFECT`, `EXCESS`, `WRONG_ITEM`, `QUALITY_ISSUE`, `OTHER`).
5. Tindakan akhir wajib salah satu: `SUPPLIER_CREDIT`, `REFUND`, `REPLACEMENT`.
6. Return dengan nilai di atas threshold (configurable) wajib approval level manager.
7. Jika `SUPPLIER_CREDIT` atau `REFUND`, sistem wajib membuat dokumen akuntansi supplier.

### 3. Cross-Cutting Rules

1. Semua timestamp bisnis backend wajib menggunakan `apptime` (bukan `time.Now()`).
2. Semua endpoint list wajib paginasi (`per_page` default 20, max 100).
3. Semua operasi mutasi stok wajib transaction-safe dan memakai row-level locking (`FOR UPDATE`).
4. Semua response mengikuti `docs/api-standart/api-response-standards.md`.
5. Semua error code mengikuti `docs/api-standart/api-error-codes.md`.

## Keputusan Teknis

- **Mengapa endpoint form-data terpisah**:
  Untuk mengurangi round-trip frontend dan menjaga konsistensi opsi enum/reference data lintas form.

- **Mengapa return dibuat sebagai domain terpisah**:
  Sales/Purchase return memiliki lifecycle, validasi, dan side effect akuntansi/stok yang berbeda dari invoice/GR biasa.

- **Mengapa integrasi accounting dilakukan saat create return**:
  Mengurangi gap sinkronisasi antara operasional (return) dan finance (credit/debit note). Trade-off: create return menjadi lebih kompleks dan perlu transaksi/kompensasi yang ketat.

- **Mengapa approval threshold di purchase return**:
  Return bernilai besar berdampak langsung ke liability supplier dan stok, sehingga perlu kontrol otorisasi tambahan.

## Struktur Folder

```text
apps/api/internal/sales/
├── data/models/sales_return.go
├── data/repositories/sales_return_repository.go
├── domain/dto/sales_return_dto.go
├── domain/mapper/sales_return_mapper.go
├── domain/usecase/sales_return_usecase.go
└── presentation/
    ├── handler/sales_return_handler.go
    └── router/sales_return_routers.go

apps/api/internal/purchase/
├── data/models/purchase_return.go
├── data/repositories/purchase_return_repository.go
├── domain/dto/purchase_return_dto.go
├── domain/mapper/purchase_return_mapper.go
├── domain/usecase/purchase_return_usecase.go
└── presentation/
    ├── handler/purchase_return_handler.go
    └── router/purchase_return_routers.go

apps/web/src/features/sales/returns/
├── types/index.d.ts
├── schemas/sales-return.schema.ts
├── services/sales-returns-service.ts
├── hooks/use-sales-returns.ts
└── components/
    ├── sales-return-form.tsx
    ├── sales-returns-list.tsx
    └── sales-return-detail.tsx

apps/web/src/features/purchase/returns/
├── types/index.d.ts
├── schemas/purchase-return.schema.ts
├── services/purchase-returns-service.ts
├── hooks/use-purchase-returns.ts
└── components/
    ├── purchase-return-form.tsx
    ├── purchase-returns-list.tsx
    └── purchase-return-detail.tsx
```

## API Endpoints

### Sales Return

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/sales/returns/form-data` | `sales.return.read` | Opsi form: warehouses, reasons, conditions, actions, refund methods |
| POST | `/api/v1/sales/returns` | `sales.return.create` | Create sales return + stock adjustment + accounting hook |
| GET | `/api/v1/sales/returns` | `sales.return.read` | List sales returns dengan filter |
| GET | `/api/v1/sales/returns/:id` | `sales.return.read` | Detail sales return |

### Purchase Return

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/purchase/returns/form-data` | `purchase.return.read` | Opsi form: warehouses, suppliers, reasons, conditions, actions |
| POST | `/api/v1/purchase/returns` | `purchase.return.create` | Create purchase return + stock adjustment + accounting hook |
| GET | `/api/v1/purchase/returns` | `purchase.return.read` | List purchase returns dengan filter |
| GET | `/api/v1/purchase/returns/:id` | `purchase.return.read` | Detail purchase return |

## Request/Response Schemas

### 1. GET Sales Return Form Data

**Endpoint**: `GET /api/v1/sales/returns/form-data`

```json
{
  "success": true,
  "data": {
    "warehouses": [{ "id": "uuid", "name": "Main Warehouse" }],
    "return_reasons": [
      { "value": "DAMAGED", "label": "Damaged item" },
      { "value": "WRONG_ITEM", "label": "Wrong item" }
    ],
    "item_conditions": [
      { "value": "GOOD", "label": "Good" },
      { "value": "DAMAGED", "label": "Damaged" }
    ],
    "actions": [
      { "value": "REFUND", "label": "Refund" },
      { "value": "CREDIT_NOTE", "label": "Credit Note" },
      { "value": "REPLACEMENT", "label": "Replacement" }
    ],
    "refund_methods": [
      { "value": "BANK_TRANSFER", "label": "Bank Transfer" },
      { "value": "CASH", "label": "Cash" }
    ]
  },
  "meta": {},
  "timestamp": "2026-03-17T10:30:45+07:00",
  "request_id": "req_xxx"
}
```

### 2. POST Sales Return

**Endpoint**: `POST /api/v1/sales/returns`

```json
{
  "invoice_id": "uuid",
  "delivery_id": "uuid",
  "warehouse_id": "uuid",
  "customer_id": "uuid",
  "reason": "DAMAGED",
  "action": "CREDIT_NOTE",
  "notes": "Box penyok saat diterima",
  "items": [
    {
      "invoice_item_id": "uuid",
      "product_id": "uuid",
      "qty": 2,
      "uom_id": "uuid",
      "condition": "DAMAGED",
      "unit_price": 50000
    }
  ]
}
```

**Success (201)**:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "return_number": "SR-2026-00001",
    "status": "DRAFT",
    "invoice_id": "uuid",
    "delivery_id": "uuid",
    "stock_adjustment_id": "uuid",
    "credit_note_id": "uuid",
    "created_at": "2026-03-17T10:30:45+07:00"
  },
  "meta": {},
  "timestamp": "2026-03-17T10:30:45+07:00",
  "request_id": "req_xxx"
}
```

### 3. POST Purchase Return

**Endpoint**: `POST /api/v1/purchase/returns`

```json
{
  "goods_receipt_id": "uuid",
  "purchase_order_id": "uuid",
  "supplier_id": "uuid",
  "warehouse_id": "uuid",
  "reason": "DEFECT",
  "action": "SUPPLIER_CREDIT",
  "notes": "Batch cacat produksi",
  "items": [
    {
      "goods_receipt_item_id": "uuid",
      "product_id": "uuid",
      "qty": 5,
      "uom_id": "uuid",
      "condition": "DAMAGED",
      "unit_cost": 32000
    }
  ]
}
```

### 4. Error Example (Validation)

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "field_errors": [
      {
        "field": "items[0].qty",
        "code": "MAX_VALUE",
        "message": "Return quantity exceeds eligible quantity"
      }
    ]
  },
  "meta": {},
  "timestamp": "2026-03-17T10:30:45+07:00",
  "request_id": "req_xxx"
}
```

## Mapping Perubahan Frontend

### Sales UI dan Integrasi

- Tambah feature baru: `apps/web/src/features/sales/returns/*`.
- Integrasi tombol/dialog create return dari:
  - `apps/web/src/features/sales/invoice/invoice-list.tsx`
  - `apps/web/src/features/sales/invoice/invoice-form.tsx`
  - `apps/web/src/features/sales/delivery/delivery-form.tsx`
  - `apps/web/src/features/sales/delivery/deliver-dialog.tsx`
- Tambah linkage status ringkas di list invoice/delivery (misal badge: `Returned`, `Partial Return`).
- Hook utama:
  - `useSalesReturnsList`
  - `useSalesReturnDetail`
  - `useCreateSalesReturn`
  - `useSalesReturnFormData`

### Purchase UI dan Integrasi

- Tambah feature baru: `apps/web/src/features/purchase/returns/*`.
- Integrasi tombol/dialog create return dari:
  - `apps/web/src/features/purchase/goods-receipt/goods-receipt-form.tsx`
  - `apps/web/src/features/purchase/goods-receipt/goods-receipts-list.tsx`
  - `apps/web/src/features/purchase/supplier-invoices/*`
- Hook utama:
  - `usePurchaseReturnsList`
  - `usePurchaseReturnDetail`
  - `useCreatePurchaseReturn`
  - `usePurchaseReturnFormData`

### Catatan Implementasi Frontend

1. Gunakan TanStack Query untuk caching list/detail/form-data.
2. Handle state lengkap: loading, error, empty.
3. Gunakan optional chaining dan fallback values pada data nested API.
4. Form menggunakan Zod + React Hook Form (`@hookform/resolvers/zod`).
5. Semua elemen klik custom wajib `cursor-pointer`.

## Checklist Integrasi Inventory dan Accounting

### Inventory

- [ ] Validasi kuantitas eligible return terhadap dokumen sumber.
- [ ] Gunakan transaksi DB dan lock baris stok (`FOR UPDATE`).
- [ ] Sales return menambah stok ke warehouse target.
- [ ] Purchase return mengurangi stok dari warehouse asal.
- [ ] Simpan relasi `stock_adjustment_id` di record return.
- [ ] Cegah double-posting adjustment dengan idempotency key/reference.

### Accounting

- [ ] Mapping action ke dokumen finance:
  - `REFUND` -> refund journal / cash-bank movement.
  - `CREDIT_NOTE` -> customer credit note.
  - `SUPPLIER_CREDIT` -> supplier debit/credit note sesuai COA policy.
- [ ] Simpan relasi `credit_note_id` / `debit_note_id` / `journal_entry_id`.
- [ ] Enforce balancing journal (debit = credit).
- [ ] Pastikan currency/rate mengikuti invoice/GR asal.
- [ ] Tangani kegagalan integrasi finance (rollback atau status `PENDING_ACCOUNTING`).

### Security and Reliability

- [ ] Permission check pada semua endpoint.
- [ ] Validation ketat query/path/body (`per_page <= 100`, UUID valid).
- [ ] Rate limiting untuk endpoint publik/sensitif.
- [ ] Response error konsisten (`VALIDATION_ERROR`, `FORBIDDEN`, `*_NOT_FOUND`, dll).
- [ ] Gunakan timeout context untuk call DB/dependency.

## Cara Test Manual

### Sales Return

1. Login user dengan permission `sales.return.create`.
2. Buka detail invoice yang sudah delivered.
3. Klik aksi `Create Return`.
4. Pilih item, qty, reason, condition, dan action (`REFUND`/`CREDIT_NOTE`/`REPLACEMENT`).
5. Submit dan verifikasi return number terbentuk.
6. Verifikasi stok warehouse bertambah sesuai qty return.
7. Verifikasi credit note/journal terbentuk untuk action finance.

### Purchase Return

1. Login user dengan permission `purchase.return.create`.
2. Buka goods receipt yang valid.
3. Klik aksi `Create Return`.
4. Pilih item return, qty, reason, condition, action.
5. Submit dan verifikasi return number terbentuk.
6. Verifikasi stok warehouse berkurang.
7. Verifikasi supplier note/journal terbentuk.

## Automated Testing

- **Backend Unit Test (minimum sprint ini)**:
  - `sales_return_usecase_test.go`: validation window, qty limit, stock + accounting call.
  - `purchase_return_usecase_test.go`: threshold approval, qty limit, stock + accounting call.
- **Backend Integration Test (target)**:
  - create return end-to-end (DB transaction + lock + response format).
- **Frontend Test (target)**:
  - submit form success/error flow.
  - list render dengan empty/loading/error states.

```bash
# Backend
cd apps/api && go test ./internal/sales/... ./internal/purchase/...

# Frontend
cd apps/web && npx pnpm check-types && npx pnpm lint
```

## Dependencies

- **Backend**: Gin, GORM, PostgreSQL, modul inventory/stock, modul accounting.
- **Frontend**: Next.js App Router, TanStack Query, Zod, React Hook Form, next-intl.
- **Shared**: `internal/core/apptime` untuk aturan waktu lintas company/timezone.

## Related Links

- API standards: `docs/api-standart/README.md`
- Error codes: `docs/api-standart/api-error-codes.md`
- Response standards: `docs/api-standart/api-response-standards.md`
- Timezone/apptime: `docs/features/core/apptime-timezone-support.md`
- Sprint master plan: `docs/erp-sprint-planning.md`

## Sprint Prompt (Short)

**Goal**:
Implement basic Sales Return and Purchase Return flows (`create/list/detail`) with stock adjustments and accounting linkage.

**Scope**:

1. Backend models, repositories, usecases, handlers, routers.
2. Frontend hooks/services/components for return form, list, detail.
3. Integration to stock adjustment and credit/debit note creation.
4. Unit test usecase kritikal + update Postman collection.

**Acceptance Criteria**:

1. API return create berhasil membuat return record dan stock adjustment dalam satu transaksi.
2. Dari invoice/detail (sales) dan GR/detail (purchase), user bisa buka form return, submit, lalu data muncul di list.
3. Untuk action `REFUND`/`CREDIT_NOTE`/`SUPPLIER_CREDIT`, record accounting terkait terbentuk dan ter-link ke return.
4. Permission enforcement aktif untuk `sales.return.create` dan `purchase.return.create`.

**Estimate and Timebox**:

- Timebox: 2 minggu, 3 developer.
- Backend API + unit tests: 3-4 hari.
- Frontend form/list/detail + integration hooks: 3-4 hari.
- End-to-end integration + QA: 2-3 hari.
- Buffer, docs, postman finalization: 1-2 hari.

## Notes and Improvement Plan

- Sprint ini fokus pada basic flow tanpa integrasi payment gateway realtime.
- Jika accounting service belum fully synchronous, gunakan status transisi (`PENDING_ACCOUNTING`) dan retry worker.
- Improvement lanjutan:
  - approval workflow multi-level yang configurable,
  - event-driven notification,
  - dashboard KPI return rate per supplier/customer.