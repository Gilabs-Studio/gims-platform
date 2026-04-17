# Sales Module

Modul Sales mengelola seluruh siklus penjualan dari awal hingga pelunasan piutang — mencakup Sales Quotation, Sales Order, Delivery Order, Customer Invoice, Sales Payment, Sales Return, Customer Invoice Down Payment, Receivables Recap, dan Yearly Targets.

## Fitur Utama

- **Sales Quotation**: Buat, edit, hapus, approve, dan cetak penawaran harga ke customer
- **Sales Order**: Konversi dari quotation ke order dengan approval workflow
- **Delivery Order (DO)**: Pengiriman barang dengan batch selection, approval, ship, dan deliver tracking
- **Customer Invoice**: Faktur penjualan dengan approval workflow dan integrasi ke modul Finance (jurnal otomatis)
- **Customer Invoice Down Payment (CIDP)**: Kelola uang muka invoice dengan status pending → approve
- **Sales Payment**: Pencatatan pembayaran dari customer dengan status pending → confirm
- **Sales Return**: Retur barang dari customer dengan integrasi inventory dan finance
- **Receivables Recap**: Ringkasan dan daftar piutang customer yang belum lunas
- **Yearly Targets**: Target penjualan tahunan per area/region dengan breakdown bulanan
- **Sales Visit**: Kunjungan sales dengan check-in/check-out GPS dan interest survey (ERP legacy, sebagian telah diintegrasikan ke CRM Visit Reports)

## Business Rules

### Quotation → Order → DO → Invoice Workflow
- Quotation berstatus `draft` hanya bisa diedit/dihapus oleh creator
- Quotation harus di-approve sebelum dikonversi ke Sales Order
- Sales Order dapat dibuat langsung atau dikonversi dari quotation yang sudah `approved`
- Sales Order harus di-approve sebelum dibuatkan Delivery Order
- Delivery Order harus di-approve sebelum bisa `ship` dan `deliver`
- Delivery Order mensupport batch selection untuk mengurangi stok dari batch tertentu
- Customer Invoice dapat dibuat dari Delivery Order atau Sales Order
- Saat Customer Invoice dibuat dari Sales Order, item akan diprefill dari item SO dan product ID dinormalisasi ke format UUID yang valid sebelum validasi form
- **Saat create-from-SO mode**: field-field terkait SO akan di-lock (read-only) untuk mencegah perubahan data prefill: Sales Order selection, Product items, Quantity, Price, dan HPP Amount. User masih bisa edit Discount dan Financial fields (Tax Rate, Delivery Cost, Other Cost, Notes)
- Customer Invoice yang sudah `approved` dapat dibuatkan Sales Payment

### Approval & Status Rules
- **Quotation Status**: `draft` → `pending approval` → `approved` / `rejected`; dapat juga `cancelled`
- **Sales Order Status**: `draft` → `pending approval` → `approved`
- **Delivery Order Status**: `draft` → `pending approval` → `approved` → `shipped` → `delivered`
- **Customer Invoice Status**: `draft` → `pending approval` → `approved`
- **CIDP Status**: dibuat → `pending` → `approved`
- **Sales Payment Status**: `pending` → `confirmed`
- **Sales Return Status**: `draft` → `approved` / `rejected`
- Dokumen yang sudah di-approve tidak bisa diedit kecuali untuk action workflow tertentu

### Payment & Finance Rules
- Sales Payment yang sudah `confirmed` akan membuat jurnal otomatis di modul Finance
- Customer Invoice Down Payment yang di-approve akan terhubung ke invoice utama
- Receivables Recap menampilkan invoice yang masih memiliki outstanding amount > 0
- Returns akan mengembalikan stok ke inventory batch saat di-approve dan membuat jurnal penyesuaian

### Target Rules
- Yearly Target dibuat per area/region untuk satu tahun fiskal
- Target bisa di-search dan difilter berdasarkan tahun
- Total target, total actual, dan achievement summary ditampilkan di dashboard target

## Keputusan Teknis

- **Approval workflow konsisten di setiap dokumen utama**: Quotation, Order, DO, dan Invoice menggunakan pola approval serupa (`draft` → `pending` → `approved`). Trade-off: redundancy sedikit di backend, tapi UX yang konsisten dan mudah diprediksi user.
- **Integrasi Delivery Order dengan Inventory module untuk batch selection**: DO tidak hanya mengurangi stok abstrak, tapi memilih batch spesifik (FIFO/LIFO sesuai kebijakan). Trade-off: kompleksitas UI dan backend meningkat, tapi traceability stok lebih akurat.
- **Customer Invoice memicu jurnal otomatis di Finance**: Saat invoice di-approve atau payment di-confirm, modul Sales memanggil `JournalEntryUsecase` dan `AccountingEngine` untuk mencatat transaksi. Trade-off: tight coupling antar domain, tapi data keuangan selalu sinkron.
- **Customer Invoice menggunakan validasi UUID permissive untuk item dan reference ID**: Form invoice menerima UUID hex format yang sama dengan data backend dan hasil prefill dari Sales Order. Trade-off: validasi tidak seketat RFC UUID, tetapi mencegah false error pada data ERP yang memang sudah konsisten di backend.
- **Customer Invoice field-locking saat create-from-SO**: Ketika invoice dibuat dari Sales Order (mode prefill), field Sales Order selection, Product items, Quantity, Price, dan HPP Amount di-lock (read-only/disabled) agar user tidak secara tidak sengaja mengubah data yang sudah diprefill. Trade-off: user terbatas dalam edit, tapi data integrity terjamin dan UX lebih jelas bahwa ini adalah prefill scenario bukan manual entry.
- **Sales Return mengembalikan stok ke batch asal**: Return mencatat product dan quantity yang dikembalikan, lalu mengembalikan stok melalui `InventoryUsecase`. Trade-off: perlu menyimpan linkage ke DO/Invoice asal.
- **Receivables Recap menggunakan read-only aggregation query**: Tidak ada CRUD langsung; data dihitung dari invoice dan payment real-time. Trade-off: query bisa berat untuk dataset besar, tapi data selalu aktual.
- **Print handler dipisah dari main handler**: Setiap dokumen utama memiliki print handler terpisah (`*PrintHandler`) untuk PDF generation. Trade-off: lebih banyak file, tapi isolasi concern lebih baik.

## Struktur Folder

### Backend
```
apps/api/internal/sales/
├── data/
│   ├── models/
│   │   ├── sales_quotation.go
│   │   ├── sales_order.go
│   │   ├── delivery_order.go
│   │   ├── customer_invoice.go
│   │   ├── customer_invoice_down_payment.go
│   │   ├── sales_payment.go
│   │   ├── sales_return.go
│   │   ├── sales_visit.go
│   │   ├── yearly_target.go
│   │   └── receivables_recap.go (view/aggregation)
│   └── repositories/
│       └── *_repository.go
├── domain/
│   ├── dto/
│   │   └── *_dto.go
│   ├── mapper/
│   │   └── *_mapper.go
│   └── usecase/
│       ├── sales_quotation_usecase.go
│       ├── sales_order_usecase.go
│       ├── delivery_order_usecase.go
│       ├── customer_invoice_usecase.go
│       ├── customer_invoice_down_payment_usecase.go
│       ├── sales_payment_usecase.go
│       ├── sales_return_usecase.go
│       ├── sales_visit_usecase.go
│       ├── yearly_target_usecase.go
│       └── receivables_recap_usecase.go
└── presentation/
    ├── handler/
    │   └── *_handler.go
    ├── router/
    │   └── *_router.go
    └── routers.go
```

### Frontend
```
apps/web/src/features/sales/
├── quotation/            # Sales Quotation CRUD + approval + print
├── order/                # Sales Order CRUD + convert from quotation + approval + print
├── delivery/             # Delivery Order CRUD + batch selection + ship + deliver + approval
├── invoice/              # Customer Invoice CRUD + approval + print
├── customer-invoice-down-payments/  # CIDP CRUD + pending + approve + print
├── payments/             # Sales Payment CRUD + confirm + print
├── returns/              # Sales Return CRUD + status update
├── receivables-recap/    # Receivables list + summary + export
├── components/           # Shared components (approval dialogs, item tables, etc.)
└── utils/                # Shared utilities
```

## API Endpoints

### Sales Quotation
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/sales/sales-quotations` | `sales_quotation.read` | List quotations with filters |
| GET | `/api/v1/sales/sales-quotations/:id` | `sales_quotation.read` | Get quotation detail |
| GET | `/api/v1/sales/sales-quotations/:id/items` | `sales_quotation.read` | List quotation items |
| GET | `/api/v1/sales/sales-quotations/:id/audit-trail` | `sales_quotation.read` | Audit trail |
| GET | `/api/v1/sales/sales-quotations/:id/print` | `sales_quotation.print` | Print quotation PDF |
| POST | `/api/v1/sales/sales-quotations` | `sales_quotation.create` | Create quotation |
| PUT | `/api/v1/sales/sales-quotations/:id` | `sales_quotation.update` | Update quotation |
| DELETE | `/api/v1/sales/sales-quotations/:id` | `sales_quotation.delete` | Delete quotation |
| PATCH | `/api/v1/sales/sales-quotations/:id/status` | `sales_quotation.update` | Update status |

### Sales Order
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/sales/sales-orders` | `sales_order.read` | List orders |
| GET | `/api/v1/sales/sales-orders/export` | `sales_order.read` | Export orders |
| GET | `/api/v1/sales/sales-orders/:id` | `sales_order.read` | Get order detail |
| GET | `/api/v1/sales/sales-orders/:id/items` | `sales_order.read` | List order items |
| GET | `/api/v1/sales/sales-orders/:id/audit-trail` | `sales_order.read` | Audit trail |
| GET | `/api/v1/sales/sales-orders/:id/print` | `sales_order.print` | Print order PDF |
| POST | `/api/v1/sales/sales-orders` | `sales_order.create` | Create order |
| POST | `/api/v1/sales/sales-orders/convert-from-quotation` | `sales_order.create` | Convert from quotation |
| PUT | `/api/v1/sales/sales-orders/:id` | `sales_order.update` | Update order |
| DELETE | `/api/v1/sales/sales-orders/:id` | `sales_order.delete` | Delete order |
| PATCH | `/api/v1/sales/sales-orders/:id/status` | `sales_order.update` | Update status |
| POST | `/api/v1/sales/sales-orders/:id/approve` | `sales_order.approve` | Approve order |

### Delivery Order
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/sales/delivery-orders` | `delivery_order.read` | List DO |
| GET | `/api/v1/sales/delivery-orders/:id` | `delivery_order.read` | Get DO detail |
| GET | `/api/v1/sales/delivery-orders/:id/items` | `delivery_order.read` | List DO items |
| GET | `/api/v1/sales/delivery-orders/:id/audit-trail` | `delivery_order.read` | Audit trail |
| POST | `/api/v1/sales/delivery-orders` | `delivery_order.create` | Create DO |
| PUT | `/api/v1/sales/delivery-orders/:id` | `delivery_order.update` | Update DO |
| DELETE | `/api/v1/sales/delivery-orders/:id` | `delivery_order.delete` | Delete DO |
| PATCH | `/api/v1/sales/delivery-orders/:id/status` | `delivery_order.update` | Update status |
| POST | `/api/v1/sales/delivery-orders/:id/approve` | `delivery_order.approve` | Approve DO |
| POST | `/api/v1/sales/delivery-orders/:id/ship` | `delivery_order.ship` | Mark as shipped |
| POST | `/api/v1/sales/delivery-orders/:id/deliver` | `delivery_order.deliver` | Mark as delivered |
| POST | `/api/v1/sales/delivery-orders/select-batches` | `delivery_order.read` | Select inventory batches |

### Customer Invoice
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/sales/customer-invoices` | `customer_invoice.read` | List invoices |
| GET | `/api/v1/sales/customer-invoices/export` | `customer_invoice.read` | Export invoices |
| GET | `/api/v1/sales/customer-invoices/:id` | `customer_invoice.read` | Get invoice detail |
| GET | `/api/v1/sales/customer-invoices/:id/items` | `customer_invoice.read` | List invoice items |
| GET | `/api/v1/sales/customer-invoices/:id/audit-trail` | `customer_invoice.read` | Audit trail |
| GET | `/api/v1/sales/customer-invoices/:id/print` | `customer_invoice.print` | Print invoice PDF |
| POST | `/api/v1/sales/customer-invoices` | `customer_invoice.create` | Create invoice |
| PUT | `/api/v1/sales/customer-invoices/:id` | `customer_invoice.update` | Update invoice |
| DELETE | `/api/v1/sales/customer-invoices/:id` | `customer_invoice.delete` | Delete invoice |
| PATCH | `/api/v1/sales/customer-invoices/:id/status` | `customer_invoice.update` | Update status |
| POST | `/api/v1/sales/customer-invoices/:id/approve` | `customer_invoice.approve` | Approve invoice |

### Customer Invoice Down Payment
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/sales/customer-invoice-down-payments` | - | List CIDP |
| GET | `/api/v1/sales/customer-invoice-down-payments/add` | - | Form data for create |
| GET | `/api/v1/sales/customer-invoice-down-payments/export` | - | Export CIDP |
| GET | `/api/v1/sales/customer-invoice-down-payments/:id` | - | Get CIDP detail |
| GET | `/api/v1/sales/customer-invoice-down-payments/:id/audit-trail` | `customer_invoice_dp.read` | Audit trail |
| GET | `/api/v1/sales/customer-invoice-down-payments/:id/print` | `customer_invoice_dp.print` | Print CIDP PDF |
| POST | `/api/v1/sales/customer-invoice-down-payments` | - | Create CIDP |
| POST | `/api/v1/sales/customer-invoice-down-payments/:id/pending` | - | Set status pending |
| POST | `/api/v1/sales/customer-invoice-down-payments/:id/approve` | `customer_invoice_dp.approve` | Approve CIDP |
| PUT | `/api/v1/sales/customer-invoice-down-payments/:id` | - | Update CIDP |
| DELETE | `/api/v1/sales/customer-invoice-down-payments/:id` | - | Delete CIDP |

### Sales Payment
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/sales/payments` | `sales_payment.read` | List payments |
| GET | `/api/v1/sales/payments/add` | `sales_payment.create` | Form data for create |
| GET | `/api/v1/sales/payments/export` | `sales_payment.export` | Export payments |
| GET | `/api/v1/sales/payments/:id` | `sales_payment.read` | Get payment detail |
| GET | `/api/v1/sales/payments/:id/audit-trail` | `sales_payment.read` | Audit trail |
| GET | `/api/v1/sales/payments/:id/print` | `sales_payment.print` | Print payment PDF |
| POST | `/api/v1/sales/payments` | `sales_payment.create` | Create payment |
| DELETE | `/api/v1/sales/payments/:id` | `sales_payment.delete` | Delete payment |
| POST | `/api/v1/sales/payments/:id/confirm` | `sales_payment.confirm` | Confirm payment |

### Sales Return
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/sales/returns/form-data` | `sales_return.read` | Get form data |
| GET | `/api/v1/sales/returns` | `sales_return.read` | List returns |
| GET | `/api/v1/sales/returns/:id` | `sales_return.read` | Get return detail |
| GET | `/api/v1/sales/returns/:id/audit-trail` | `sales_return.read` | Audit trail |
| POST | `/api/v1/sales/returns` | `sales_return.create` | Create return |
| PATCH | `/api/v1/sales/returns/:id/status` | `sales_return.update` | Update status |
| DELETE | `/api/v1/sales/returns/:id` | `sales_return.delete` | Delete return |

### Receivables Recap
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/sales/receivables-recap` | `sales_payment.read` | List receivables |
| GET | `/api/v1/sales/receivables-recap/summary` | `sales_payment.read` | Summary aggregation |
| GET | `/api/v1/sales/receivables-recap/export` | `sales_payment.export` | Export receivables |

### Yearly Targets
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/sales/yearly-targets` | `sales_target.read` | List targets |
| GET | `/api/v1/sales/yearly-targets/:id` | `sales_target.read` | Get target detail |
| GET | `/api/v1/sales/yearly-targets/:id/audit-trail` | `sales_target.audit_trail` | Audit trail |
| POST | `/api/v1/sales/yearly-targets` | `sales_target.create` | Create target |
| PUT | `/api/v1/sales/yearly-targets/:id` | `sales_target.update` | Update target |
| DELETE | `/api/v1/sales/yearly-targets/:id` | `sales_target.delete` | Delete target |

### Sales Visit (ERP)
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/sales/sales-visits` | `sales_visit.read` | List visits |
| GET | `/api/v1/sales/sales-visits/calendar` | `sales_visit.read` | Calendar summary |
| GET | `/api/v1/sales/sales-visits/:id` | `sales_visit.read` | Get visit detail |
| GET | `/api/v1/sales/sales-visits/:id/details` | `sales_visit.read` | Visit details |
| GET | `/api/v1/sales/sales-visits/:id/history` | `sales_visit.read` | Progress history |
| POST | `/api/v1/sales/sales-visits` | `sales_visit.create` | Create visit |
| PUT | `/api/v1/sales/sales-visits/:id` | `sales_visit.update` | Update visit |
| DELETE | `/api/v1/sales/sales-visits/:id` | `sales_visit.delete` | Delete visit |
| PATCH | `/api/v1/sales/sales-visits/:id/status` | `sales_visit.update` | Update status |
| POST | `/api/v1/sales/sales-visits/:id/check-in` | `sales_visit.update` | GPS check-in |
| POST | `/api/v1/sales/sales-visits/:id/check-out` | `sales_visit.update` | GPS check-out |

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `QUOTATION_NOT_FOUND` | 404 | Quotation tidak ditemukan |
| `QUOTATION_NOT_DRAFT` | 422 | Quotation hanya bisa diedit saat draft |
| `SALES_ORDER_NOT_FOUND` | 404 | Sales Order tidak ditemukan |
| `SALES_ORDER_NOT_DRAFT` | 422 | Sales Order hanya bisa diedit saat draft |
| `DELIVERY_ORDER_NOT_FOUND` | 404 | Delivery Order tidak ditemukan |
| `DELIVERY_ORDER_NOT_DRAFT` | 422 | DO hanya bisa diedit saat draft |
| `DELIVERY_ORDER_ALREADY_SHIPPED` | 422 | DO sudah di-ship, tidak bisa edit |
| `CUSTOMER_INVOICE_NOT_FOUND` | 404 | Invoice tidak ditemukan |
| `CUSTOMER_INVOICE_NOT_DRAFT` | 422 | Invoice hanya bisa diedit saat draft |
| `SALES_PAYMENT_NOT_FOUND` | 404 | Payment tidak ditemukan |
| `SALES_PAYMENT_ALREADY_CONFIRMED` | 409 | Payment sudah confirmed, immutable |
| `SALES_RETURN_NOT_FOUND` | 404 | Return tidak ditemukan |
| `INSUFFICIENT_STOCK` | 422 | Stok tidak mencukupi untuk DO/Return |
| `BATCH_NOT_FOUND` | 404 | Inventory batch tidak ditemukan |
| `RECEIVABLES_NOT_FOUND` | 404 | Data piutang tidak ditemukan |
| `YEARLY_TARGET_NOT_FOUND` | 404 | Target tahunan tidak ditemukan |

## Cara Test Manual

### End-to-End Sales Workflow
1. Login sebagai Admin/Sales Manager
2. Navigasi ke **Sales → Quotation**
3. Klik **Create Quotation** — isi customer, item, quantity, price
4. Submit → status `draft`
5. Klik **Approve** → status `approved`
6. Navigasi ke **Sales → Order**
7. Klik **Convert from Quotation** — pilih quotation yang sudah di-approve
8. Verifikasi item dan quantity tersalin, lalu submit → `draft`
9. Approve Sales Order → `approved`
10. Navigasi ke **Sales → Delivery Order**
11. Buat DO dari Sales Order yang di-approve → pilih batch untuk setiap item
12. Approve DO → `approved`
13. Klik **Ship** → status `shipped`
14. Klik **Deliver** → status `delivered`
15. Navigasi ke **Sales → Invoice**
16. Buat Invoice dari DO yang sudah `delivered`
17. Approve Invoice → `approved`
18. Navigasi ke **Sales → Payments**
19. Buat Payment untuk Invoice yang di-approve
20. Klik **Confirm** → status `confirmed`, verifikasi outstanding amount invoice berkurang
21. Navigasi ke **Sales → Returns**
22. Buat Return dari Invoice, isi item dan quantity yang diretur
23. Update status Return ke `approved` → verifikasi stok bertambah kembali
24. Navigasi ke **Sales → Receivables Recap**
25. Verifikasi invoice yang sudah lunas tidak muncul, yang belum lunas masih ada

### Customer Invoice Down Payment
1. Navigasi ke **Sales → Customer Invoice Down Payments**
2. Klik **Create** — pilih customer, isi amount
3. Submit → buat dokumen baru
4. Klik **Pending** → status pending
5. Klik **Approve** → status approved, verifikasi dapat di-link ke invoice

### Yearly Targets
1. Navigasi ke **CRM → Sales Target**
2. Pilih tahun dari dropdown
3. Klik **Add Target** — pilih area/region, isi monthly breakdown
4. Save → verifikasi target muncul di list
5. Search target berdasarkan nama area

## Automated Testing

```bash
# Backend unit tests
cd apps/api && go test ./internal/sales/domain/usecase/...

# Frontend type checking
cd apps/web && pnpm check-types
```

## Dependencies

- **Backend**: GORM, Gin, validator/v10
- **Cross-domain integrations**:
  - **Inventory module**: batch selection, stock deduction, stock return
  - **Finance module**: journal entries, COA, accounting engine
  - **Product module**: product catalog, pricing
  - **Organization module**: employee data
  - **Customer module**: customer master data
- **Frontend**: TanStack Query, React Hook Form, Zod, next-intl, Tailwind CSS, shadcn/ui

## Notes & Improvements

- **Known Limitations**:
  - CIDP endpoints belum konsisten menggunakan middleware permission (beberapa route tidak memiliki permission guard)
  - Sales Visit (ERP) sebagian fungsionalitas telah dipindahkan ke CRM Visit Reports
- **Future Improvements**:
  - Add bulk actions untuk approval di Quotation, Order, DO, Invoice
  - Add recurring invoices untuk subscription sales
  - Add aging analysis di Receivables Recap (current, 30, 60, 90+ days)
  - Integrasi dengan payment gateway untuk auto-confirm payment
  - Sales dashboard dengan real-time charts (quotation conversion, revenue, top products)
