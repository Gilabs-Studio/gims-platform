# Finance (Keuangan) — All-in-One Reference Documentation

Dokumen ini menggabungkan seluruh referensi modul yang ada di menu **Finance / Keuangan** menjadi **satu file**.

## Sumber implementasi (repo ini)

### Backend (Go)
- Finance domain (vertical slice): `apps/api/internal/finance/`
- Finance route registration: `apps/api/internal/finance/presentation/routes.go`
- Finance routers: `apps/api/internal/finance/presentation/router/*.go`
- Finance models: `apps/api/internal/finance/data/models/*.go`

**Base path API**: `/api/v1/finance/*`

Catatan auth & RBAC:
- Seluruh endpoint Finance diproteksi oleh `AuthMiddleware` dan ditambah `RequirePermission("...")` per-route.
- Lihat wiring group `/finance` di `apps/api/internal/finance/presentation/routes.go`.

### Frontend (Next.js)
- Routes (App Router): `apps/web/app/[locale]/(dashboard)/finance/*`
- Feature modules: `apps/web/src/features/finance/*`
- i18n registration: `apps/web/src/i18n/request.ts` (namespace `finance*`)

## Mapping menu (UI) → Permission → Endpoint

| Menu (UI) | Route (Web) | Permission minimal | Endpoint API |
|---|---|---|---|
| Chart of Accounts (COA) | `/finance/coa` | `coa.read` | `GET /api/v1/finance/chart-of-accounts` + `GET /tree` |
| Journals (Journal Entries) | `/finance/journals` | `journal.read` | `GET /api/v1/finance/journal-entries` |
| Payments | `/finance/payments` | `payment.read` | `GET /api/v1/finance/payments` |
| Budget | `/finance/budget` | `budget.read` | `GET /api/v1/finance/budget` |
| Cash & Bank | `/finance/cash-bank` | `cash_bank.read` | `GET /api/v1/finance/cash-bank` |
| Aging Reports | `/finance/aging-reports` | `journal.read` | `GET /api/v1/finance/reports/ar-aging` / `ap-aging` |
| Asset Categories | `/finance/asset-categories` | `asset.read` | `GET /api/v1/finance/asset-categories` |
| Asset Locations | `/finance/asset-locations` | `asset.read` | `GET /api/v1/finance/asset-locations` |
| Assets | `/finance/assets` | `asset.read` | `GET /api/v1/finance/assets` |
| Asset Detail | `/finance/assets/[id]` | `asset.read` | `GET /api/v1/finance/assets/:id` |
| Financial Closing | `/finance/closing` | `financial_closing.read` | `GET /api/v1/finance/closing` |
| Tax Invoices | `/finance/tax-invoices` | `tax_invoice.read` | `GET /api/v1/finance/tax-invoices` |
| Non-trade Payables | `/finance/non-trade-payables` | `non_trade_payable.read` | `GET /api/v1/finance/non-trade-payables` |
| Bank Accounts* | `/finance/bank-accounts` | `bank_account.read` | `GET /api/v1/finance/bank-accounts` |

\* Bank Accounts diregister dari Core master-data agar URL menu tetap `/finance/bank-accounts`.
Lihat `apps/api/internal/core/presentation/routers.go` dan `apps/api/internal/core/presentation/router/bank_account_router.go`.

## Endpoint ringkas per modul (backend)

### COA — `/finance/chart-of-accounts`
- `GET /tree` (`coa.read`)
- `GET /` (`coa.read`)
- `POST /` (`coa.create`)
- `GET /:id` (`coa.read`)
- `PUT /:id` (`coa.update`)
- `DELETE /:id` (`coa.delete`)

### Journal Entries — `/finance/journal-entries`
- `GET /` (`journal.read`)
- `POST /` (`journal.create`)
- `GET /:id` (`journal.read`)
- `PUT /:id` (`journal.update`)
- `DELETE /:id` (`journal.delete`)
- `POST /:id/post` (`journal.post`)

Reports (Trial Balance):
- `GET /finance/reports/trial-balance` (`journal.read`)

### Payments — `/finance/payments`
- `GET /` (`payment.read`)
- `POST /` (`payment.create`)
- `GET /:id` (`payment.read`)
- `PUT /:id` (`payment.update`)
- `DELETE /:id` (`payment.delete`)
- `POST /:id/approve` (`payment.approve`)

### Budget — `/finance/budget`
- `GET /` (`budget.read`)
- `POST /` (`budget.create`)
- `GET /:id` (`budget.read`)
- `PUT /:id` (`budget.update`)
- `DELETE /:id` (`budget.delete`)
- `POST /:id/approve` (`budget.approve`)

### Cash & Bank — `/finance/cash-bank`
- `GET /` (`cash_bank.read`)
- `POST /` (`cash_bank.create`)
- `GET /:id` (`cash_bank.read`)
- `PUT /:id` (`cash_bank.update`)
- `DELETE /:id` (`cash_bank.delete`)
- `POST /:id/post` (menggunakan `cash_bank.update`)

### Aging Reports — `/finance/reports/*`
- `GET /reports/ar-aging` (`journal.read`)
- `GET /reports/ap-aging` (`journal.read`)

### Asset Management
Asset Categories — `/finance/asset-categories` (permission: `asset.*`)

Asset Locations — `/finance/asset-locations` (permission: `asset.*`)

Assets — `/finance/assets`
- `POST /:id/depreciate` (`asset.depreciate`)
- `POST /:id/transfer` (`asset.update`)
- `POST /:id/dispose` (`asset.update`)

### Financial Closing — `/finance/closing`
- `POST /:id/approve` (`financial_closing.approve`)

### Tax Invoices — `/finance/tax-invoices` (permission: `tax_invoice.*`)

### Non-trade Payables — `/finance/non-trade-payables` (permission: `non_trade_payable.*`)

## Seeder (sample data)
- Finance sprint seed (COA, assets, closing, tax invoice, non-trade payable): `apps/api/seeders/finance_sprint12_seeder.go`
- Integrated demo flow (Purchase → Stock → Sales → Finance): `apps/api/seeders/integration_flow_seeder.go`

## Catatan tambahan
- Skema relasi Finance ada di `docs/erp-database-relations.mmd` (bagian FINANCE).
- Dokumen API berbentuk JSON (sebagian modul) tersedia di `apps/web/docs/finance/*`.

---

<!--
# Purchase (Pembelian) — All-in-One Reference Documentation

Dokumen ini menggabungkan seluruh referensi modul yang ada di menu **Purchase / Pembelian** menjadi **satu file**.

Dokumen versi terpisah (per modul):
- Index: [apps/erp-api/docs/purchase/PURCHASE_MENU_REFERENCE.md](apps/erp-api/docs/purchase/PURCHASE_MENU_REFERENCE.md)
- PR: [apps/erp-api/docs/purchase/PURCHASE_REQUISITIONS_REFERENCE.md](apps/erp-api/docs/purchase/PURCHASE_REQUISITIONS_REFERENCE.md)
- PO: [apps/erp-api/docs/purchase/PURCHASE_ORDERS_REFERENCE.md](apps/erp-api/docs/purchase/PURCHASE_ORDERS_REFERENCE.md)
- GR: [apps/erp-api/docs/purchase/GOODS_RECEIPTS_REFERENCE.md](apps/erp-api/docs/purchase/GOODS_RECEIPTS_REFERENCE.md)
- Supplier Invoice (Normal): [apps/erp-api/docs/purchase/SUPPLIER_INVOICES_REFERENCE.md](apps/erp-api/docs/purchase/SUPPLIER_INVOICES_REFERENCE.md)
- Supplier Invoice Down Payment: [apps/erp-api/docs/purchase/SUPPLIER_INVOICE_DOWN_PAYMENTS_REFERENCE.md](apps/erp-api/docs/purchase/SUPPLIER_INVOICE_DOWN_PAYMENTS_REFERENCE.md)
- Payment PO: [apps/erp-api/docs/purchase/PAYMENT_PO_REFERENCE.md](apps/erp-api/docs/purchase/PAYMENT_PO_REFERENCE.md)

---

## Alur proses lintas modul (high level)
1) PR dibuat (DRAFT) → Approve → Convert to PO
2) PO dibuat (DRAFT) → Confirm → APPROVED
3) GR dibuat dari PO APPROVED → Confirm/Receive → RECEIVED (opsional PARTIAL)
4) Supplier Invoice dibuat dari PO APPROVED → Pending → UNPAID
5) Payment dibuat untuk Supplier Invoice (PENDING) → Confirm → CONFIRMED → update status invoice menjadi PARTIAL/PAID

---

## Autentikasi & Otorisasi (RBAC)

### Wiring middleware yang aktif (sesuai source)
- Global API router: [apps/erp-api/internal/core/infrastructure/router/router.go](apps/erp-api/internal/core/infrastructure/router/router.go)
	- Semua route protected berada di group `/api/v1` yang dipasang middleware [apps/erp-api/internal/core/middleware/auth_middleware.go](apps/erp-api/internal/core/middleware/auth_middleware.go)
	- Artinya seluruh endpoint Purchase (karena diregister di `auth.Use(authMiddleware)`) **wajib JWT**.

### `AuthMiddleware()`
- Memvalidasi JWT pada header `Authorization: Bearer <token>` dan menyimpan `userID` ke context.

### `AuthorizeAuto(db)` (kondisi saat ini)
- Implementasi saat ini: [apps/erp-api/internal/core/middleware/authorize_auto.go](apps/erp-api/internal/core/middleware/authorize_auto.go)
- Perilaku aktual sekarang: hanya memastikan `userID` ada di context, lalu `c.Next()`.
- Catatan: walaupun banyak group router memakai `AuthorizeAuto(db)`, middleware ini **belum melakukan enforcement RBAC** (role/permission) untuk menolak request.

### Model RBAC di database (tersedia, namun belum dipakai untuk blok request)
Di schema awal sudah ada struktur RBAC untuk menu/action:
- `roles`, `user_roles`
- `menus` (hierarki menu)
- `action_types`, `menu_actions`
- `role_menu_actions` (mapping role → menu_action + flag allow)

Contoh pemakaian RBAC saat ini:
- Endpoint menu memakai `userID` dan mengambil menu/action yang allowed via join `user_roles` + `role_menu_actions`:
	- Handler: [apps/erp-api/internal/auth/presentations/handler/menu_handler.go](apps/erp-api/internal/auth/presentations/handler/menu_handler.go)
	- Repository query: [apps/erp-api/internal/auth/data/repositories/menu_repository.go](apps/erp-api/internal/auth/data/repositories/menu_repository.go)

Implikasi praktis:
- UI dapat melakukan gating menu/actions berdasarkan data dari `/menus`.
- Backend API saat ini masih bersifat **authentication-only** (JWT valid) untuk semua endpoint protected; tidak ada penolakan berbasis permission pada middleware `AuthorizeAuto`.

---

## Relasi data lintas modul (FK schema)

Sumber: [apps/erp-api/migrations/20251216090927_initial_schema.sql](apps/erp-api/migrations/20251216090927_initial_schema.sql)

### Purchase Requisition (PR)
- `purchase_requisitions.supplier_id` → `suppliers.id`
- `purchase_requisitions.payment_terms_id` → `payment_terms.id`
- `purchase_requisitions.business_unit_id` → `business_units.id`
- `purchase_requisitions.employee_id` → `employees.id`
- `purchase_requisition_items.purchase_requisition_id` → `purchase_requisitions.id`
- `purchase_requisition_items.product_id` → `products.id`

### Purchase Order (PO)
- `purchase_orders.supplier_id` → `suppliers.id`
- `purchase_orders.payment_terms_id` → `payment_terms.id`
- `purchase_orders.business_unit_id` → `business_units.id`
- `purchase_orders.created_by` → `users.id`
- `purchase_orders.purchase_requisitions_id` (nullable) → `purchase_requisitions.id` (relasi PR → PO untuk hasil convert)
- `purchase_orders.sales_order_id` (nullable) → `sales_orders.id` (jika PO dibuat dari Sales Order)
- `purchase_order_items.purchase_order_id` → `purchase_orders.id`
- `purchase_order_items.product_id` → `products.id`

### Goods Receipt (GR)
- `goods_receipts.purchase_order_id` → `purchase_orders.id`
- `goods_receipts.warehouse_id` → `warehouses.id`
- `goods_receipts.received_by` → `users.id`
- `goods_receipt_items.goods_receipt_id` → `goods_receipts.id`
- `goods_receipt_items.product_id` → `products.id`
- `goods_receipt_items.inventory_batch_id` (nullable) → `inventory_batches.id`

### Supplier Invoice (Normal & Down Payment)
- `supplier_invoices.purchase_order_id` → `purchase_orders.id`
- `supplier_invoices.payment_terms_id` (nullable) → `payment_terms.id`
- `supplier_invoices.created_by` → `users.id`
- `supplier_invoice_items.supplier_invoice_id` → `supplier_invoices.id`
- `supplier_invoice_items.product_id` → `products.id`

### Payment (untuk Supplier Invoice)
- Table `payments` bersifat polymorphic:
	- `payments.reference_type` + `payments.reference_id` menjadi referensi dokumen sumber.
	- Pada konteks Purchase, implementasi handler/usecase memakai `reference_type = SUPPLIER_INVOICE` dengan `reference_id = supplier_invoices.id`.
- Di schema ini **tidak ada foreign key** langsung dari `payments.reference_id` ke `supplier_invoices.id`.

---


# 1) Purchase Requisitions (PR)

Sumber implementasi di repo ini:
- Router: [apps/erp-api/internal/purchase/presentation/router/purchase_requisition_routers.go](apps/erp-api/internal/purchase/presentation/router/purchase_requisition_routers.go)
- Handler: [apps/erp-api/internal/purchase/presentation/handler/purchase_requisition_handler.go](apps/erp-api/internal/purchase/presentation/handler/purchase_requisition_handler.go)
- Usecase: [apps/erp-api/internal/purchase/domain/usecase/purchase_requisition_usecase.go](apps/erp-api/internal/purchase/domain/usecase/purchase_requisition_usecase.go)
- Repository: [apps/erp-api/internal/purchase/data/repositories/purchase_requisition_repository.go](apps/erp-api/internal/purchase/data/repositories/purchase_requisition_repository.go)
- Model: [apps/erp-api/internal/purchase/data/models/purchase_requisition.go](apps/erp-api/internal/purchase/data/models/purchase_requisition.go), [apps/erp-api/internal/purchase/data/models/purchase_requisition_item.go](apps/erp-api/internal/purchase/data/models/purchase_requisition_item.go)
- Schema DB: [apps/erp-api/migrations/20251216090927_initial_schema.sql](apps/erp-api/migrations/20251216090927_initial_schema.sql)
- API JSON: [apps/erp-api/docs/purchase/PURCHASE_REQUISITION_API_DOCUMENTATION.json](apps/erp-api/docs/purchase/PURCHASE_REQUISITION_API_DOCUMENTATION.json)

**Base path**:
- `/purchase/purchase-requisitions`

## 1.1 Tujuan modul
PR adalah dokumen permintaan pembelian ke supplier (sebelum Purchase Order/PO). Modul ini menangani:
- pembuatan PR (draft) beserta item barang
- perhitungan subtotal/tax/total
- approve/reject
- konversi PR → PO
- list + pencarian/sort/filter
- export
- audit trail setiap perubahan

## 1.2 Ketergantungan (master data)
PR bergantung pada:
- Supplier
- Payment Terms
- Business Unit
- Product
- Employee (Requested By)

Catatan: Requested By disimpan sebagai `employee_id`, sedangkan audit trail memakai `userID` dari auth middleware.

## 1.3 Data model & relasi (ringkas)
Entity PR (field inti):
- `code` (unik)
- `supplier_id`, `payment_terms_id`, `business_unit_id`
- `employee_id`
- `request_date` (string, format yang dipakai UI: `YYYY-MM-DD`)
- `address`, `notes`
- `status`
- `tax_rate`, `tax_amount`, `delivery_cost`, `other_cost`, `subtotal`, `total_amount`

Entity PR Item:
- `product_id`, `quantity`, `purchase_price`, `discount`, `subtotal`, `notes`

## 1.4 Status lifecycle & aturan transisi
Status PR:
- `DRAFT`, `APPROVED`, `REJECTED`, `CONVERTED`

Rules utama:
- Create PR → selalu `DRAFT`
- Update PR → memaksa kembali ke `DRAFT`
- Approve/Reject → hanya dari `DRAFT`
- Convert → hanya dari `APPROVED`, lalu PR menjadi `CONVERTED`

## 1.5 Aturan perhitungan
Per item:
- `raw = quantity * purchase_price`
- `discount_amount = raw * (discount/100)`
- `item_subtotal = raw - discount_amount`

Per PR:
- `subtotal = SUM(item_subtotal)`
- `tax_amount = subtotal * (tax_rate/100)`
- `total_amount = subtotal + tax_amount + delivery_cost + other_cost`

## 1.6 Kontrak API (endpoint + behavior)
Catatan auth:
- Seluruh modul Purchase berada di bawah group protected `/api/v1` yang sudah memakai `AuthMiddleware()`.
- Router PR juga memanggil `AuthMiddleware()` lagi di level group purchase requisitions (redundan).

Base path:
- `/purchase/purchase-requisitions`

Endpoint:
- `GET /add` — data pendukung form create (suppliers + products grouped by supplier + stock, payment terms, business units, employees)
- `POST /` — create draft
- `GET /` — list (pagination + search + sort + filter tanggal)
- `GET /:id` — detail
- `PUT /:id` — update draft (replace items; force status ke `DRAFT`)
- `POST /:id/approve` — approve (hanya `DRAFT`)
- `POST /:id/reject` — reject (hanya `DRAFT`)
- `POST /:id/convert` — convert PR → PO (hanya `APPROVED`)
- `DELETE /:id` — delete
- `GET /:id/audit-trail` — audit trail
- `GET /export` — export list (default format excel)

Query params list (pola umum):
- `page` (default 1), `limit` (default 10, max 100)
- `search`, `search_by`
- `sort_by`, `sort_order`
- `start_date`, `end_date` (filter `request_date`)

## 1.7 Menu & Actions (UI)
Aksi yang umumnya ada:
- List/Search/Filter/Sort
- Add (prefetch data)
- Create Draft
- Detail
- Edit/Update (draft)
- Approve / Reject
- Convert to PO
- Delete
- Export
- Audit Trail

### Status → Allowed Actions (UI Gating Table)
| Status | Enabled actions | Disabled/locked | Notes |
|---|---|---|---|
| `DRAFT` | View/Detail, Edit/Update, Approve, Reject, Delete, Export, Audit Trail | Convert | Update memaksa tetap `DRAFT`. |
| `APPROVED` | View/Detail, Convert to PO, Export, Audit Trail | Edit/Update, Approve, Reject, Delete | Siap dikonversi. |
| `REJECTED` | View/Detail, Export, Audit Trail | Edit/Update, Approve, Reject, Convert, Delete | Jika butuh “re-open”, perlu endpoint baru. |
| `CONVERTED` | View/Detail, Export, Audit Trail | Edit/Update, Approve, Reject, Convert, Delete | Sudah terhubung ke PO. |

## 1.8 Audit trail
PR menyimpan audit log untuk create/update/approve/reject/convert/delete via helper:
- [apps/erp-api/internal/core/utils/save_audit_log.go](apps/erp-api/internal/core/utils/save_audit_log.go)

## 1.9 Kode dokumen PR (code generation)
PR code berbentuk:
- `PR{YEAR}{NNNN}` (contoh: `PR20260001`)

Catatan implementasi:
- Pola `count+1` bisa mengalami race condition di traffic tinggi.
- Pastikan ada unique index pada `code` dan mekanisme retry bila terjadi duplicate.

## 1.10 Catatan desain
`request_date` disimpan sebagai string, sehingga filter range `>=`/`<=` bergantung pada konsistensi format.

---

# 2) Purchase Orders (PO)

Sumber implementasi di repo ini:
- Router: [apps/erp-api/internal/purchase/presentation/router/purchase_order_routers.go](apps/erp-api/internal/purchase/presentation/router/purchase_order_routers.go)
- Handler: [apps/erp-api/internal/purchase/presentation/handler/purchase_order_handler.go](apps/erp-api/internal/purchase/presentation/handler/purchase_order_handler.go)
- DTO: [apps/erp-api/internal/purchase/domain/dto/purchase_order_dto.go](apps/erp-api/internal/purchase/domain/dto/purchase_order_dto.go)
- Usecase: [apps/erp-api/internal/purchase/domain/usecase/purchase_order_usecase.go](apps/erp-api/internal/purchase/domain/usecase/purchase_order_usecase.go)
- Repository: [apps/erp-api/internal/purchase/data/repositories/purchase_order_repository.go](apps/erp-api/internal/purchase/data/repositories/purchase_order_repository.go)
- Model: [apps/erp-api/internal/purchase/data/models/purchase_order.go](apps/erp-api/internal/purchase/data/models/purchase_order.go)
- API JSON: [apps/erp-api/docs/purchase/PURCHASE_ORDER_API_DOCUMENTATION.json](apps/erp-api/docs/purchase/PURCHASE_ORDER_API_DOCUMENTATION.json)

**Base path**:
- `/purchase/purchase-orders`

## 2.1 Tujuan modul
PO adalah dokumen order pembelian ke supplier. Di repo ini PO bisa dibuat:
- manual (draft)
- hasil konversi dari PR
- hasil pembuatan dari Sales Order (SO)

PO juga menjadi basis untuk proses lanjutan:
- Goods Receipt (GR)
- Supplier Invoice (invoice normal & down payment)
- Payment PO

## 2.2 Status PO & status turunan (computed)
Status PO (enum):
- `DRAFT`, `REVISED`, `APPROVED`, `CLOSED`

Pada response PO, backend juga mengisi status turunan berikut:
- `status_receipts`: `NOT_CREATED` / `PARTIAL` / `COMPLETED` (hasil perbandingan ordered vs received)
- `status_invoices`: `NOT_CREATED` / `PARTIAL` / `COMPLETED` (hanya menghitung invoice normal)
- `payment_status`: `NOT_CREATED` / `PARTIAL` / `COMPLETED` (berdasarkan total pembayaran confirmed vs total invoice normal)

Catatan penting implementasi status turunan:
- `status_receipts` menjumlahkan qty dari semua GR items yang ter-preload (di list/detail) untuk menentukan “COMPLETED/PARTIAL”.
- `status_invoices` menjumlahkan qty dari semua invoice items untuk invoice type `NORMAL`.

## 2.3 Aturan perhitungan PO (header & item)
Per PO item:
- `raw = quantity * price`
- `discount_amount = raw * (discount/100)`
- `item_subtotal = round(raw - discount_amount)`

Per PO:
- `sub_total = round(sum(item_subtotal))`
- `tax_amount = round(sub_total * (tax_rate/100))`
- `total_amount = round(sub_total + delivery_cost + other_cost + tax_amount)`

## 2.4 Status lifecycle & transisi
Rules utama (berdasarkan repository):
- Create PO → `DRAFT`
- Update PO → status dipaksa kembali ke `DRAFT`
- Confirm PO → `APPROVED` (boleh dari `DRAFT` atau `REVISED`)
- Revise PO → `REVISED` + `revision_comment` (boleh dari `DRAFT` atau `APPROVED`)

## 2.5 Kontrak API (endpoint + behavior)
Endpoint:
- `GET /add` — data pendukung form create
- `POST /` — create draft (manual) / create from PR / create from SO
- `GET /` — list (pagination/search/filter/sort)
- `GET /export` — export list
- `GET /:id` — detail
- `PUT /:id` — update (replace items optional; status → `DRAFT`)
- `DELETE /:id` — delete draft
- `POST /:id/confirm` — confirm (status → `APPROVED`)
- `POST /:id/revise` — revise (status → `REVISED`; butuh `revision_comment`)
- `GET /:id/print` — print PDF (hanya `APPROVED`)
- `GET /:id/audit-trail` — audit log

### Create PO (POST /purchase/purchase-orders)
DTO request: `PurchaseOrderCreateRequest`.

Validasi tanggal (handler):
- `order_date` wajib format `YYYY-MM-DD`
- `due_date` optional, jika diisi wajib `YYYY-MM-DD`

Tiga mode create:
1) **Create from PR**: jika request body berisi `purchase_requisitions_id`
	- rules usecase: PR harus `APPROVED` dan belum ada PO untuk PR tersebut
	- side effect: PR diubah menjadi `CONVERTED`
2) **Create from SO**: jika request body berisi `sales_order_id`
	- rules usecase: SO harus approved
	- rule tambahan: due date PO tidak boleh melewati due date SO (dibandingkan dengan parsing tanggal `YYYY-MM-DD`)
3) **Manual**: jika tidak mengisi `purchase_requisitions_id` dan `sales_order_id`
	- catatan harga: pada create manual, handler mengambil harga dari `product.cost_price` (bukan dari request)

### Update PO (PUT /purchase/purchase-orders/:id)
DTO request: `PurchaseOrderUpdateRequest`.

Behavior penting:
- Update akan memaksa status menjadi `DRAFT`.
- Jika `items` dikirim, items lama dihapus lalu dibuat ulang (replace).
- Catatan harga: pada update, handler memakai `price` dari request (bukan dari product cost price).

### Confirm (POST /purchase/purchase-orders/:id/confirm)
Rules (repository):
- hanya `DRAFT` atau `REVISED` yang bisa confirm
- status diubah menjadi `APPROVED`

### Revise (POST /purchase/purchase-orders/:id/revise)
Request body:
```json
{ "revision_comment": "..." }
```

Rules (repository):
- hanya `DRAFT` atau `APPROVED` yang bisa revise
- status diubah menjadi `REVISED`, `revision_comment` disimpan

### List (GET /purchase/purchase-orders)
Query params:
- `page` (default 1), `limit` (default 10)
- `status` (optional)
- `search` (optional)
- `searchBy` (optional) — jika diisi, search hanya pada kolom tersebut
- `sort_by` (optional), `sort_order` (`asc`/`desc`)
- `start_date`, `end_date` (filter `order_date`)

Searchable columns (repository):
- string: `code`, `revision_comment` (ILIKE)
- numeric: `id`, `supplier_id`, `created_by`, `total_amount` (hanya dicari jika search term numeric)

Sortable fields (repository):
- `id`, `code`, `order_date`, `status`, `total_amount`, `created_at`, `updated_at`, `supplier_id`, `created_by`, `revision_comment`

Catatan tanggal:
- `order_date` disimpan string; filter range mengandalkan format `YYYY-MM-DD`.

### Export (GET /purchase/purchase-orders/export?format=...)
- `format` default `excel`
- query params filter/search/sort sama dengan list

### Print (GET /purchase/purchase-orders/:id/print)
Rules (handler):
- hanya PO `APPROVED` yang bisa dicetak

## 2.6 Kode PO (code generation)
Repository membuat code unik pattern:
- `PO-YYYYMMDD-XXXX`

Catatan implementasi:
- Per-hari, nomor increment dihitung dari record terakhir pada hari itu (termasuk yang soft-deleted karena query memakai `Unscoped`).
- Pola ini tetap bisa race di traffic tinggi; unique index + retry tetap disarankan.

## 2.7 Menu & Actions (UI)
Aksi yang umumnya ada pada modul PO:
- List/Search/Filter/Sort
- Add (prefetch data)
- Create Draft
- Detail
- Edit/Update
- Confirm
- Revise (dengan revision comment)
- Print
- Export
- Delete
- Audit Trail

### Status → Allowed Actions (UI Gating Table)
| Status | Enabled actions | Disabled/locked | Notes |
|---|---|---|---|
| `DRAFT` | View/Detail, Edit/Update, Confirm, Revise, Delete, Print, Export, Audit Trail | - | - |
| `REVISED` | View/Detail, Edit/Update, Confirm, Delete, Print, Export, Audit Trail | Revise (opsional) | Setelah revise biasanya edit lalu confirm ulang. |
| `APPROVED` | View/Detail, Revise, Print, Export, Audit Trail | Edit/Update, Confirm, Delete | Dasar GR/invoice/payment. |
| `CLOSED` | View/Detail, Print, Export, Audit Trail | Edit/Update, Confirm, Revise, Delete | Enum tersedia; pastikan rule close sesuai kebutuhan. |

## 2.8 Audit trail
PO menyimpan audit log untuk create/update/delete/confirm/revise via helper:
- [apps/erp-api/internal/core/utils/save_audit_log.go](apps/erp-api/internal/core/utils/save_audit_log.go)

---

# 3) Goods Receipts (GR)

Sumber implementasi:
- Router: [apps/erp-api/internal/purchase/presentation/router/goods_receipt_routers.go](apps/erp-api/internal/purchase/presentation/router/goods_receipt_routers.go)
- Handler: [apps/erp-api/internal/purchase/presentation/handler/goods_receipt_handler.go](apps/erp-api/internal/purchase/presentation/handler/goods_receipt_handler.go)
- DTO: [apps/erp-api/internal/purchase/domain/dto/goods_receipt_dto.go](apps/erp-api/internal/purchase/domain/dto/goods_receipt_dto.go)
- Usecase: [apps/erp-api/internal/purchase/domain/usecase/goods_receipt_usecase.go](apps/erp-api/internal/purchase/domain/usecase/goods_receipt_usecase.go)
- Repository: [apps/erp-api/internal/purchase/data/repositories/goods_receipt_repository.go](apps/erp-api/internal/purchase/data/repositories/goods_receipt_repository.go)
- Model: [apps/erp-api/internal/purchase/data/models/goods_receipt.go](apps/erp-api/internal/purchase/data/models/goods_receipt.go)
- API JSON: [apps/erp-api/docs/purchase/GOODS_RECEIPT_API_DOCUMENTATION.json](apps/erp-api/docs/purchase/GOODS_RECEIPT_API_DOCUMENTATION.json)

**Base path**:
- `/purchase/goods-receipts`

## 3.1 Tujuan modul
GR adalah dokumen penerimaan barang dari supplier atas dasar PO.

Efek utama GR:
- mencatat penerimaan item per PO
- pada confirm (receive), biasanya memicu side effect inventory/stock (lihat usecase/repository)

## 3.2 Status lifecycle
Status GR:
- `PENDING`, `RECEIVED`

Catatan tambahan:
- Di beberapa tempat ada indikasi `PARTIAL` (untuk penerimaan sebagian). Implementasi UI dapat memakai status turunan di PO (`status_receipts`) untuk menampilkan “PARTIAL/COMPLETED/NOT_CREATED”.

Rules umum:
- Create → `PENDING`
- Update → tetap `PENDING` (update pending)
- Confirm/Receive → `RECEIVED`

## 3.3 Kontrak API (endpoint + behavior)
Endpoint:
- `GET /stats` — ringkasan (total/pending/received/total items, earliest/latest receipt date)
- `GET /add` — data pendukung form (warehouses + PO eligible)
- `POST /` — create pending
- `PUT /:id` — update pending
- `POST /:id/confirm` — receive/confirm
- `DELETE /:id` — delete pending
- `GET /` — list
- `GET /export` — export
- `GET /:id` — detail
- `GET /:id/print` — print PDF (hanya `RECEIVED`)
- `GET /:id/audit-trail` — audit log

### Add (GET /purchase/goods-receipts/add)
Yang dikembalikan:
- `warehouses`
- `purchase_orders` (eligible)

Rules eligibility PO di handler:
- hanya PO `APPROVED`
- PO yang punya GR pending akan di-skip (user harus confirm/delete GR pending dulu)
- PO yang semua itemnya sudah fully received (berdasarkan qty received) akan di-skip

### Create/Update
Validasi tanggal (handler):
- `receipt_date` wajib format `YYYY-MM-DD`

Items GR membawa field tambahan untuk inventory batch:
- `lot_number`, `expired_date` (opsional)

### List
Query params:
- `page`, `limit`
- `status`
- `search`, `searchBy`
- `sort_by`, `sort_order`
- `start_date`, `end_date` (filter `receipt_date`)

Searchable columns (handler meta):
- string: `code`
- numeric: `id`, `purchase_order_id`, `warehouse_id`, `received_by`

Sortable fields (handler meta):
- `id`, `code`, `receipt_date`, `status`, `created_at`, `updated_at`, `purchase_order_id`, `warehouse_id`, `received_by`

### Print (GET /purchase/goods-receipts/:id/print)
Rules (handler):
- hanya GR `RECEIVED` yang bisa dicetak

## 3.4 Menu & Actions (UI)
Aksi yang umumnya ada:
- Stats
- List/Search/Filter/Sort
- Add (prefetch: warehouses + PO eligible)
- Create
- Detail
- Edit/Update (hanya `PENDING`)
- Confirm/Receive
- Delete (hanya `PENDING`)
- Print (hanya `RECEIVED`)
- Export
- Audit Trail

### Status → Allowed Actions (UI Gating Table)
| Status | Enabled actions | Disabled/locked | Notes |
|---|---|---|---|
| `NOT_CREATED` | - | Semua aksi | State di UI PO saat belum ada GR (bukan record GR). |
| `PENDING` | View/Detail, Edit/Update, Confirm/Receive, Delete, Export, Audit Trail | Print | Print hanya untuk `RECEIVED`. |
| `RECEIVED` | View/Detail, Print, Export, Audit Trail | Edit/Update, Confirm/Receive, Delete | Setelah stok bergerak, biasanya dikunci. |

## 3.5 Audit trail
GR menyimpan audit log untuk create/update/confirm/delete via helper:
- [apps/erp-api/internal/core/utils/save_audit_log.go](apps/erp-api/internal/core/utils/save_audit_log.go)

---

# 4) Supplier Invoices (Normal)

Sumber implementasi:
- Router: [apps/erp-api/internal/purchase/presentation/router/supplier_invoce_routers.go](apps/erp-api/internal/purchase/presentation/router/supplier_invoce_routers.go)
- Handler: [apps/erp-api/internal/purchase/presentation/handler/supplier_invoce_handler.go](apps/erp-api/internal/purchase/presentation/handler/supplier_invoce_handler.go)
- DTO: [apps/erp-api/internal/purchase/domain/dto/supplier_invoice_dto.go](apps/erp-api/internal/purchase/domain/dto/supplier_invoice_dto.go)
- Usecase: [apps/erp-api/internal/purchase/domain/usecase/supplier_invoce_usecase.go](apps/erp-api/internal/purchase/domain/usecase/supplier_invoce_usecase.go)
- Repository: [apps/erp-api/internal/purchase/data/repositories/supplier_invoice_repository.go](apps/erp-api/internal/purchase/data/repositories/supplier_invoice_repository.go)
- Model: [apps/erp-api/internal/purchase/data/models/supplier_invoice.go](apps/erp-api/internal/purchase/data/models/supplier_invoice.go)
- API JSON: [apps/erp-api/docs/purchase/SUPPLIER_INVOICE_API_DOCUMENTATION.json](apps/erp-api/docs/purchase/SUPPLIER_INVOICE_API_DOCUMENTATION.json)

**Base path**:
- `/purchase/supplier-invoices`

**Type**:
- `NORMAL`

## 4.1 Tujuan modul
Supplier Invoice adalah tagihan dari supplier atas PO/GR, dan menjadi reference untuk Payment PO.

## 4.2 Status lifecycle
Status invoice:
- `DRAFT`, `UNPAID`, `PARTIAL`, `OVERDUE`, `PAID`

Pola transisi umum:
- Create → `DRAFT`
- Set Pending → biasanya `DRAFT` → `UNPAID`
- Payment confirmed → `UNPAID/PARTIAL` → `PARTIAL/PAID` (berdasarkan akumulasi pembayaran)

## 4.3 Kontrak API (endpoint + behavior)
Endpoint:
- `GET /add` — data pendukung form (PO eligible + payment terms)
- `POST /` — create invoice normal (DRAFT)
- `GET /` — list
- `GET /export` — export
- `GET /:id` — detail
- `PUT /:id` — update draft
- `DELETE /:id` — delete draft
- `POST /:id/pending` — set pending
- `POST /:id/tax-invoice` — attach tax invoice
- `GET /:id/print` — print PDF
- `GET /:id/audit-trail` — audit log

### Add (GET /purchase/supplier-invoices/add)
Rule eligibility PO di handler:
- hanya PO `APPROVED`
- PO harus punya received qty > 0
- qty invoiced (invoice normal) harus < qty received

Payload add juga menyertakan:
- daftar `payment_terms`
- informasi invoice DP (jika ada) di dalam PO response (`invoice_dp`)

### Create
Validasi tanggal (handler):
- `invoice_date` wajib `YYYY-MM-DD`
- `due_date` wajib `YYYY-MM-DD`

Request item mencakup:
- `product_id`, `quantity`, `price`, `discount`

### List
Query params:
- `page`, `limit`
- `status`
- `search`, `searchBy`
- `sort_by`, `sort_order`
- `start_date`, `end_date` (filter by invoice_date/due_date sesuai implementasi usecase/repository)

Searchable columns (handler meta):
- string: `code`, `invoice_number`
- numeric: `id`, `purchase_order_id`, `amount`

Sortable fields (handler meta):
- `id`, `code`, `invoice_number`, `invoice_date`, `due_date`, `amount`, `status`, `created_at`, `updated_at`, `purchase_order_id`

### Tax Invoice
Endpoint `/tax-invoice` menerima:
- `tax_invoice_number`, `tax_invoice_date` (format `YYYY-MM-DD`)

### Print
Print menghasilkan PDF dan mengambil data company. Di handler tidak ada rule status khusus sebelum print.

## 4.4 Menu & Actions (UI)
Aksi yang umumnya ada:
- List/Search/Filter/Sort
- Add (prefetch PO eligible + payment terms)
- Create (draft)
- Detail
- Edit/Update (draft)
- Set Pending
- Tax Invoice
- Print
- Export
- Delete (draft)
- Audit Trail

### Status → Allowed Actions (UI Gating Table)
| Status | Enabled actions | Disabled/locked | Notes |
|---|---|---|---|
| `NOT_CREATED` | - | Semua aksi | State di UI PO saat belum ada invoice normal. |
| `DRAFT` | View/Detail, Edit/Update, Set Pending, Delete, Print, Export, Tax Invoice, Audit Trail | - | Setelah pending biasanya dikunci. |
| `UNPAID` | View/Detail, Print, Export, Tax Invoice, Audit Trail | Edit/Update, Set Pending, Delete | Siap dibayar via Payment PO. |
| `PARTIAL` | View/Detail, Print, Export, Tax Invoice, Audit Trail | Edit/Update, Set Pending, Delete | Pembayaran sebagian sudah terjadi. |
| `OVERDUE` | View/Detail, Print, Export, Tax Invoice, Audit Trail | Edit/Update, Set Pending, Delete | Overdue biasanya berdasarkan due date vs tanggal saat ini (lihat usecase). |
| `PAID` | View/Detail, Print, Export, Tax Invoice, Audit Trail | Edit/Update, Set Pending, Delete | Pembayaran lunas. |

## 4.5 Audit trail
Invoice menyimpan audit log untuk create/update/pending/delete/tax-invoice via helper:
- [apps/erp-api/internal/core/utils/save_audit_log.go](apps/erp-api/internal/core/utils/save_audit_log.go)

---

# 5) Supplier Invoice Down Payments (DP)

Sumber implementasi:
- Router: [apps/erp-api/internal/purchase/presentation/router/supplier_invoice_down_payment_routers.go](apps/erp-api/internal/purchase/presentation/router/supplier_invoice_down_payment_routers.go)
- Handler: [apps/erp-api/internal/purchase/presentation/handler/supplier_invoice_down_payment_handler.go](apps/erp-api/internal/purchase/presentation/handler/supplier_invoice_down_payment_handler.go)
- DTO: [apps/erp-api/internal/purchase/domain/dto/supplier_invoice_down_payment_dto.go](apps/erp-api/internal/purchase/domain/dto/supplier_invoice_down_payment_dto.go)
- Usecase: [apps/erp-api/internal/purchase/domain/usecase/supplier_invoice_down_payment_usecase.go](apps/erp-api/internal/purchase/domain/usecase/supplier_invoice_down_payment_usecase.go)
- Repository: [apps/erp-api/internal/purchase/data/repositories/supplier_invoice_down_payment_repository.go](apps/erp-api/internal/purchase/data/repositories/supplier_invoice_down_payment_repository.go)
- Model utama: [apps/erp-api/internal/purchase/data/models/supplier_invoice.go](apps/erp-api/internal/purchase/data/models/supplier_invoice.go)

**Base path**:
- `/purchase/supplier-invoice-down-payments`

## 5.1 Tujuan & desain data
Down Payment **bukan** tabel terpisah. DP direpresentasikan oleh entitas Supplier Invoice yang sama, dengan:
- `type = DOWN_PAYMENT`

Karena tetap entitas invoice, DP bisa:
- punya status draft/unpaid/paid
- dibayar melalui Payment PO

## 5.2 Kontrak API (endpoint + behavior)
Endpoint:
- `GET /add` — PO eligible untuk DP
- `POST /` — create DP (DRAFT)
- `GET /` — list
- `GET /stats` — ringkasan
- `GET /export` — export
- `GET /:id` — detail
- `PUT /:id` — update draft
- `DELETE /:id` — delete draft
- `POST /:id/pending` — set pending
- `POST /:id/tax-invoice` — attach tax invoice
- `GET /:id/print` — print PDF
- `GET /:id/audit-trail` — audit

### Add (GET /purchase/supplier-invoice-down-payments/add)
Rule eligibility PO di handler:
- hanya PO `APPROVED`
- PO yang sudah punya invoice normal aktif akan di-skip (berdasarkan usecase/repository)

### Create
Validasi tanggal (handler):
- `invoice_date` wajib `YYYY-MM-DD`
- `due_date` wajib `YYYY-MM-DD`

DP request utama:
- `purchase_order_id`, `invoice_date`, `due_date`, `amount`, `notes`

## 5.3 Menu & Actions (UI)
Aksi yang umumnya ada:
- Stats
- List/Search/Filter/Sort
- Add (prefetch PO eligible)
- Create (draft)
- Detail
- Edit/Update (draft)
- Set Pending
- Tax Invoice (opsional)
- Print
- Export
- Delete (draft)
- Audit Trail

### Status → Allowed Actions (UI Gating Table)
| Status | Enabled actions | Disabled/locked | Notes |
|---|---|---|---|
| `NOT_CREATED` | - | Semua aksi | State di UI PO saat belum ada DP. |
| `DRAFT` | View/Detail, Edit/Update, Set Pending, Delete, Print, Export, Audit Trail | - | - |
| `UNPAID` | View/Detail, Print, Export, Audit Trail | Edit/Update, Set Pending, Delete | Siap dibayar via Payment PO. |
| `PARTIAL` | View/Detail, Print, Export, Audit Trail | Edit/Update, Set Pending, Delete | Pembayaran sebagian. |
| `OVERDUE` | View/Detail, Print, Export, Audit Trail | Edit/Update, Set Pending, Delete | Jika konsep overdue diaktifkan. |
| `PAID` | View/Detail, Print, Export, Audit Trail | Edit/Update, Set Pending, Delete | Lunas. |

---

# 6) Payment PO

Sumber implementasi:
- Router: [apps/erp-api/internal/purchase/presentation/router/payment_po_routers.go](apps/erp-api/internal/purchase/presentation/router/payment_po_routers.go)
- Handler: [apps/erp-api/internal/purchase/presentation/handler/payment_po_handler.go](apps/erp-api/internal/purchase/presentation/handler/payment_po_handler.go)
- Usecase: [apps/erp-api/internal/purchase/domain/usecase/payment_po_usecase.go](apps/erp-api/internal/purchase/domain/usecase/payment_po_usecase.go)
- Repository: [apps/erp-api/internal/purchase/data/repositories/payment_po_repository.go](apps/erp-api/internal/purchase/data/repositories/payment_po_repository.go)
- DTO: [apps/erp-api/internal/purchase/domain/dto/payment_po_dto.go](apps/erp-api/internal/purchase/domain/dto/payment_po_dto.go)
- Payment model (finance): [apps/erp-api/internal/finance/data/models/payments.go](apps/erp-api/internal/finance/data/models/payments.go)
- Migration (tabel payments): [apps/erp-api/migrations/20251216090927_initial_schema.sql](apps/erp-api/migrations/20251216090927_initial_schema.sql)
- API JSON: [apps/erp-api/docs/purchase/PAYMENT_PO_API_DOCUMENTATION.json](apps/erp-api/docs/purchase/PAYMENT_PO_API_DOCUMENTATION.json)

**Base path**:
- `/purchase/payments`

## 6.1 Tujuan & desain data
Payment PO tidak punya tabel “payment_po”. Modul ini memakai entitas finance `Payment` (tabel `payments`) dengan:
- `reference_type = SUPPLIER_INVOICE`
- `reference_id = supplier_invoice_id`

## 6.2 Aturan bisnis utama
Eligibility membuat payment:
- hanya invoice dengan status `UNPAID`, `PARTIAL`, atau `OVERDUE` (lihat usecase/repository)

Konfirmasi payment:
- hanya payment `PENDING` yang bisa confirm
- saat confirm, backend menghitung total pembayaran confirmed untuk invoice terkait:
  - jika total_confirmed < invoice_amount → invoice jadi `PARTIAL`
  - jika total_confirmed >= invoice_amount → invoice jadi `PAID`

## 6.3 Kontrak API (endpoint + behavior)
Endpoint:
- `GET /add` — data pendukung form (invoice eligible + bank accounts + chart of accounts)
- `POST /` — create payment (PENDING)
- `GET /` — list
- `GET /export` — export
- `GET /:id` — detail
- `PUT /:id` — update (umumnya hanya PENDING)
- `POST /:id/confirm` — confirm payment
- `DELETE /:id` — delete (umumnya PENDING)
- `GET /:id/print` — print PDF
- `GET /:id/audit-trail` — audit

### Add (GET /purchase/payments/add)
Handler mengembalikan:
- `invoices` (eligible) termasuk `paid_amount` dan `remaining_amount`
- `bank_accounts`
- `chart_of_accounts` (untuk allocations)

### List
Query params:
- `page`, `limit`
- `status`
- `search`, `searchBy`
- `sort_by`, `sort_order`
- `start_date`, `end_date` (filter `payment_date` sesuai implementasi usecase/repository)

Searchable columns (handler meta):
- string: `payment_method`, `reference_number`, `notes`
- numeric: `id`, `reference_id`, `amount`

Sortable fields (handler meta):
- `id`, `payment_date`, `amount`, `payment_method`, `reference_number`, `status`, `created_at`, `updated_at`, `reference_id`, `notes`

## 6.4 Menu & Actions (UI)
Aksi yang umumnya ada:
- List/Search/Filter/Sort
- Add (prefetch invoice eligible + bank + chart of accounts)
- Create Payment (PENDING)
- Detail
- Edit/Update (PENDING)
- Confirm
- Print
- Export
- Delete (PENDING)
- Audit Trail

### Status → Allowed Actions (UI Gating Table)
| Status | Enabled actions | Disabled/locked | Notes |
|---|---|---|---|
| `PENDING` | View/Detail, Edit/Update, Confirm, Delete, Print, Export, Audit Trail | - | - |
| `CONFIRMED` | View/Detail, Print, Export, Audit Trail | Edit/Update, Confirm, Delete | Confirm mengupdate status invoice. |

-->
