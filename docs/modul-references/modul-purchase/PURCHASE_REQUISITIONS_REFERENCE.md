# Purchase Requisitions (PR) — Reference Implementation Guide

Dokumen ini merangkum fitur/modul **Purchase Requisitions (PR)** yang ada di project ini sebagai referensi untuk Anda implementasikan di project lain.

Sumber implementasi di repo ini (sebagai rujukan):
- Router: [apps/erp-api/internal/purchase/presentation/router/purchase_requisition_routers.go](apps/erp-api/internal/purchase/presentation/router/purchase_requisition_routers.go)
- Handler: [apps/erp-api/internal/purchase/presentation/handler/purchase_requisition_handler.go](apps/erp-api/internal/purchase/presentation/handler/purchase_requisition_handler.go)
- Usecase: [apps/erp-api/internal/purchase/domain/usecase/purchase_requisition_usecase.go](apps/erp-api/internal/purchase/domain/usecase/purchase_requisition_usecase.go)
- Repository: [apps/erp-api/internal/purchase/data/repositories/purchase_requisition_repository.go](apps/erp-api/internal/purchase/data/repositories/purchase_requisition_repository.go)
- Model: [apps/erp-api/internal/purchase/data/models/purchase_requisition.go](apps/erp-api/internal/purchase/data/models/purchase_requisition.go), [apps/erp-api/internal/purchase/data/models/purchase_requisition_item.go](apps/erp-api/internal/purchase/data/models/purchase_requisition_item.go)
- Schema DB: [apps/erp-api/migrations/20251216090927_initial_schema.sql](apps/erp-api/migrations/20251216090927_initial_schema.sql)

---

## 1) Tujuan modul
PR adalah dokumen permintaan pembelian ke supplier (sebelum Purchase Order/PO). Modul ini menangani:
- pembuatan PR (draft) beserta item barang
- perhitungan subtotal/tax/total
- approval/reject
- konversi PR → PO
- list + pencarian/sort/filter
- export list PR
- audit trail setiap perubahan (create/update/approve/reject/convert/delete)

---

## 2) Ketergantungan (master data) yang dipakai
PR di repo ini bergantung pada master data berikut:
- Supplier
- Payment Terms
- Business Unit
- Product
- Employee (Requested By)

Catatan penting: **Requested By** pada PR disimpan sebagai `employee_id` (bukan user_id). Namun audit trail memakai `userID` dari token (auth middleware).

Endpoint “Add” juga mengambil:
- daftar karyawan (employees)
- stock per product (via usecase product)
- grouping product by supplier

---

## 3) Data model & relasi

### 3.1 Entity: Purchase Requisition
Field inti (sesuai model & schema):
- `id`
- `code` (unik)
- `supplier_id`
- `payment_terms_id`
- `business_unit_id`
- `employee_id` (dipetakan sebagai `requested_by` pada JSON)
- `request_date` (string)
- `address` (nullable)
- `notes` (text)
- `status`
- `tax_rate`, `tax_amount`
- `delivery_cost`, `other_cost`
- `subtotal`, `total_amount`
- timestamps (created_at/updated_at/deleted_at)

Relasi:
- PR → Supplier (many-to-1)
- PR → Payment Terms (many-to-1)
- PR → Business Unit (many-to-1)
- PR → Employee (many-to-1)
- PR → PurchaseRequisitionItems (one-to-many)

### 3.2 Entity: Purchase Requisition Item
Field inti:
- `id`
- `purchase_requisition_id`
- `product_id`
- `quantity` (int)
- `purchase_price` (harga beli)
- `discount` (persen)
- `subtotal` (hasil perhitungan)
- `notes` (nullable)
- timestamps

Relasi:
- Item → Product (many-to-1)
- Item → PurchaseRequisition (many-to-1)

---

## 4) Status lifecycle & aturan transisi
Status PR (enum):
- `DRAFT`
- `APPROVED`
- `REJECTED`
- `CONVERTED`

Aturan transisi yang diterapkan:
- Create PR selalu menghasilkan status `DRAFT`.
- Update PR (endpoint update draft) **selalu memaksa status kembali menjadi `DRAFT`**.
- Approve hanya boleh jika status saat ini `DRAFT`.
- Reject hanya boleh jika status saat ini `DRAFT`.
- Convert hanya boleh jika status saat ini `APPROVED`.
- Setelah convert, status PR menjadi `CONVERTED`.

Catatan integrasi dengan PO:
- Ada jalur pembuatan PO dari PR lewat modul PO juga (lihat penjelasan bagian konversi). Setelah PO tercipta dari PR, PR juga di-set ke `CONVERTED`.
- Jika PO draft yang berasal dari PR dihapus, PR dikembalikan ke `APPROVED` (agar bisa dikonversi ulang).

---

## 5) Aturan perhitungan keuangan
Per item:
- `raw = quantity * purchase_price`
- `discount_amount = raw * (discount/100)`
- `item_subtotal = raw - discount_amount`

Per PR:
- `subtotal = SUM(item_subtotal)`
- `tax_amount = subtotal * (tax_rate/100)`
- `total_amount = subtotal + tax_amount + delivery_cost + other_cost`

Validasi input terkait:
- `quantity` minimal 1
- `purchase_price` minimal 0
- `discount` rentang 0..100
- `tax_rate` rentang 0..100
- `delivery_cost` minimal 0
- `other_cost` minimal 0

---

## 6) Kontrak API (endpoint + behavior)
Semua route PR berada di group `purchase-requisitions` dan memakai Auth Middleware (Bearer token).

Base path (sesuai router):
- `/purchase-requisitions`

### 6.1 GET /purchase-requisitions/add
Tujuan: data pendukung untuk halaman “Create PR”.

Yang dikembalikan (high-level):
- `suppliers`: list supplier, masing-masing punya `products` (product yang punya supplier itu)
  - setiap product mencakup `stock` dan `current_hpp` selain field umum
- `payment_terms`
- `business_units`
- `employees` (list ringkas: id, user_id, name, username)

Catatan:
- Produk digroup per supplier.
- Produk yang `SupplierID == 0` tidak disertakan.

### 6.2 POST /purchase-requisitions
Nama implementasi: “CreateDraft”.

Request body (ringkas):
- `supplier_id`, `payment_terms_id`, `business_unit_id`
- `request_date` (string)
- `address` (nullable)
- `requested_by` (employee id)
- `tax_rate`, `delivery_cost`, `other_cost`
- `notes`
- `items[]` minimal 1:
  - `product_id`, `quantity`, `purchase_price`, `discount`, `notes`

Behavior penting:
- Validasi: supplier/payment terms/business unit/employee harus ada.
- Validasi: product_id setiap item harus ada.
- Kode PR di-generate otomatis (lihat bagian 7).
- Audit log action `create` disimpan.

Response: mengembalikan PR lengkap (dengan relasi supplier/payment_terms/business_unit/user(items)).

### 6.3 GET /purchase-requisitions
List PR dengan pagination + search + sort + filter.

Query params:
- `page` (default 1)
- `limit` (default 10, max 100)
- `search` (string)
- `search_by` (opsional; kalau kosong akan global search)
- `sort_by` (default `created_at` di handler, tapi repository default `updated_at DESC` bila sort_by kosong)
- `sort_order` (`asc`/`desc`)
- `start_date`, `end_date` (filter berdasarkan `request_date`)

Search behavior:
- Kolom string: `code`, `notes`, `address` pakai ILIKE.
- Kolom numeric: `id`, `supplier_id`, `payment_terms_id`, `business_unit_id`, `employee_id`.
- Global search: gabungan ILIKE untuk string columns, plus numeric columns jika search term numeric.

Response:
- `data`: list item (PurchaseRequisitionListResponse)
- `meta`: pagination + info search/sort/filter + daftar kolom yang bisa di-search/sort

Catatan format tanggal:
- Karena `request_date` disimpan sebagai string, filtering range `>=` `<=` bergantung pada konsistensi format.
  - Rekomendasi: simpan sebagai format ISO `YYYY-MM-DD` agar sorting/filter range stabil.

### 6.4 GET /purchase-requisitions/:id
Mengambil PR detail (termasuk items dan relasi).

### 6.5 PUT /purchase-requisitions/:id
Update draft.

Behavior penting:
- Validasi master data & product sama seperti create.
- Items direplace total:
  - item lama di-delete
  - item baru dibuat
- Status PR dipaksa kembali `DRAFT`.
- Total keuangan dihitung ulang.
- Audit log action `update` disimpan.

### 6.6 POST /purchase-requisitions/:id/approve
Approve PR.

Rules:
- hanya boleh jika PR status `DRAFT`.
- Audit log action `approve` disimpan.

### 6.7 POST /purchase-requisitions/:id/reject
Reject PR.

Rules:
- hanya boleh jika PR status `DRAFT`.
- Audit log action `reject` disimpan.

### 6.8 POST /purchase-requisitions/:id/convert
Convert PR → PO.

Rules:
- hanya boleh jika status `APPROVED`.

Behavior:
- buat PO baru dengan `purchase_requisitions_id` mengarah ke PR.
- create PO items dari PR items.
- set PR status menjadi `CONVERTED`.
- Audit log action `convert` disimpan.

Output:
- Response mengembalikan ringkasan PO yang baru dibuat.

Catatan: di repo ini ada 2 jalur convert:
1) Convert dari endpoint PR (di atas): PO dibuat “murni copy” dari PR (order_date = sekarang, created_by diambil dari employee.user).
2) Convert lewat endpoint PO (CreateFromPurchaseRequisition) yang menerima request body PO (mis. address/due_date/is_indent/order_date, dll). Jalur ini juga akan mengubah PR menjadi `CONVERTED`.

### 6.9 DELETE /purchase-requisitions/:id
Hapus PR.

Behavior:
- item PR dihapus terlebih dulu, lalu PR.
- Audit log action `delete` disimpan.

### 6.10 GET /purchase-requisitions/:id/audit-trail
Audit trail PR dengan pagination.

Query params:
- `page` (default 1)
- `limit` (default 10, max 100)

Response:
- `data[]`: entry audit log (action, before_data, after_data, user, timestamp)
- `meta.pagination`: total/page/limit

### 6.11 GET /purchase-requisitions/export?format=...
Export data PR.

Query params (sejalan dengan list):
- `format` default `excel` (format yang didukung mengikuti export factory project ini)
- `search`, `search_by`, `sort_by`, `sort_order`, `start_date`, `end_date`

Kolom export (header):
- ID, Code, Request Date, Address, Status
- Supplier, Payment Terms, Business Unit, Requested By
- Subtotal, Tax Amount, Tax Rate (%), Delivery Cost, Other Cost, Total Amount
- Notes, Items Count, Created At, Updated At

---

## 7) Kode dokumen PR (code generation)
PR code di-generate dalam bentuk:
- `PR{YEAR}{NNNN}`

Contoh (tahun 2026):
- PR20260001
- PR20260002

Implementasi saat ini:
- menghitung jumlah PR (termasuk yang soft-deleted) dengan prefix `PR{YEAR}`
- next number = count + 1
- diformat 4 digit

Catatan untuk implementasi di project lain:
- Pola count+1 bisa mengalami race condition di traffic tinggi.
- Pastikan ada unique index pada `code`, dan siapkan mekanisme retry bila terjadi duplicate.

---

## 8) Skema database (minimum yang dibutuhkan)
Minimal ada 2 tabel:

### 8.1 Tabel purchase_requisitions
Kolom penting:
- `code` unique
- FK:
  - `supplier_id` → suppliers
  - `payment_terms_id` → payment_terms
  - `business_unit_id` → business_units
  - `employee_id` → employees

Index yang dipakai:
- `code` unique
- `supplier_id`, `payment_terms_id`, `business_unit_id`, `status`, `deleted_at`

### 8.2 Tabel purchase_requisition_items
Kolom penting:
- FK:
  - `purchase_requisition_id` → purchase_requisitions
  - `product_id` → products

Index:
- `deleted_at`

Catatan: di schema ini `quantity` disimpan sebagai bigint di DB.

---

## 9) Audit trail (yang perlu ditiru)
Konsep audit trail di repo ini:
- Setiap aksi penting menyimpan record ke tabel audit log dengan:
  - `user_id` (pelaku dari token)
  - `action` (create/update/delete/approve/reject/convert)
  - `entity` = "PurchaseRequisition"
  - `entity_id` = id PR
  - `before_data` dan/atau `after_data` (string JSON)

Helper yang digunakan: [apps/erp-api/internal/core/utils/save_audit_log.go](apps/erp-api/internal/core/utils/save_audit_log.go)

---

## 10) Checklist implementasi di project lain
Jika Anda ingin mengimplementasikan modul PR dengan behavior yang sama, checklist minimumnya:

1) Database
- Buat tabel `purchase_requisitions` + `purchase_requisition_items` sesuai schema.
- Tambahkan unique index pada `purchase_requisitions.code`.
- Pastikan FK dan index dasar untuk query list.

2) Domain/model
- Definisikan enum status PR: DRAFT/APPROVED/REJECTED/CONVERTED.
- Model PR + items dan relasi (preload/join untuk detail response).

3) Business rules
- Implementasikan perhitungan item subtotal + PR totals sesuai rumus.
- Terapkan validasi range discount/tax_rate dan minimal quantity.

4) API
- Buat endpoint setara:
  - GET add
  - POST create draft
  - GET list (pagination, search, sort, filter)
  - GET by id
  - PUT update (replace items; force status to DRAFT)
  - POST approve/reject
  - POST convert
  - DELETE
  - GET audit-trail
  - GET export

5) Integrasi PR → PO
- Saat create PO dari PR, set `purchase_requisitions_id` pada PO.
- Setelah PO tercipta, update PR status jadi `CONVERTED`.
- Jika PO draft dihapus, revert PR ke `APPROVED`.

6) Audit log
- Simpan audit log di setiap aksi penting, dengan before/after JSON.

---

## 11) Catatan desain (agar implementasi stabil)
- `request_date` masih string. Jika Anda mendesain ulang di project baru, lebih aman gunakan tipe `date`/`timestamptz` agar filter dan sorting tidak tergantung format string.
- Export: implementasi saat ini export list level (bukan detail item per baris). Jika Anda butuh export detail items, definisikan format yang berbeda.
- Endpoint Add mengembalikan supplier+produk yang digroup dan mengikutkan stock map. Ini memudahkan UI, tapi membuat payload besar bila product banyak. Alternatif di project baru: lazy-load products per supplier.
