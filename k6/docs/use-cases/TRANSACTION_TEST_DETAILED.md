# Transaction Test Detailed

## Purpose

Dokumen ini menjelaskan secara detail apa yang dilakukan oleh [../../transaction-test.js](../../transaction-test.js).

Untuk breakdown per modul, gunakan juga dokumen berikut:

- [modules/MODULE_TRANSACTION_COVERAGE.md](./modules/MODULE_TRANSACTION_COVERAGE.md)
- [modules/sales/SALES_REVENUE_CYCLE_IMPLEMENTED.md](./modules/sales/SALES_REVENUE_CYCLE_IMPLEMENTED.md)
- [modules/finance/FINANCE_TRANSACTION_COVERAGE.md](./modules/finance/FINANCE_TRANSACTION_COVERAGE.md)
- [modules/purchase/PURCHASE_TRANSACTION_WORKFLOW_PLANNED.md](./modules/purchase/PURCHASE_TRANSACTION_WORKFLOW_PLANNED.md)
- [modules/hrd/HRD_TRANSACTION_WORKFLOW_PLANNED.md](./modules/hrd/HRD_TRANSACTION_WORKFLOW_PLANNED.md)

Ini adalah script paling penting untuk Phase 1.5 karena ia tidak hanya mengukur performa. Script ini juga memverifikasi bahwa workflow bisnis Sales tetap valid saat dieksekusi berulang oleh beberapa VU.

## Module Coverage Summary

Saat ini transaction suite harus dibaca per modul seperti ini:

- Sales: implemented end-to-end
- Finance: covered indirectly through payment confirmation
- Purchase: planned
- HRD: planned

Jadi bila kamu ingin memahami flow transaksi yang benar-benar sudah dibuat, fokus utama saat ini harus ke modul Sales.

Workflow yang diuji:

- Sales Quotation
- Sales Order
- Delivery Order
- Customer Invoice
- Sales Payment
- Payment confirmation

Selain workflow reguler, script ini juga mencoba memicu konflik payment kedua pada invoice yang sama untuk melihat apakah backend menolak kondisi yang seharusnya tidak boleh terjadi.

## Why This Script Exists

Smoke, load, dan stress bisa lulus walaupun backend masih punya bug bisnis serius. Contohnya:

- dua payment untuk invoice yang sama sama-sama lolos
- document code bentrok saat concurrency
- DO gagal karena batch handling tidak robust
- invoice state transition salah tetapi endpoint tetap 200

Script ini ada untuk menangkap masalah-masalah seperti itu.

## High-Level Runtime Behavior

### Scenario Shape

Script membuat satu scenario `transaction_workflow` dengan pola:

- ramp up 30 detik
- steady state selama `DURATION`
- ramp down 30 detik

Default runtime saat ini:

- `VUS=3`
- `DURATION=3m`

### Thresholds

Threshold yang dipakai:

- `http_req_failed < 1%`
- `p95 < 1500ms`
- `p99 < 3000ms`
- `checks > 95%`

Threshold ini lebih longgar dari smoke karena flow ini jauh lebih stateful dan jauh lebih berat, tetapi tetap cukup ketat untuk menandai masalah nyata.

## Setup Phase in Detail

Di `setup()`, script melakukan beberapa hal yang sangat menentukan kestabilan run.

### 1. Authenticate

Script memanggil `getAuthToken(CREDENTIALS)`.

Kalau ini gagal, seluruh run dihentikan lebih awal. Ini mencegah error palsu di seluruh step berikutnya.

### 2. Resolve Required Master Data

Script mengambil record pertama dari endpoint berikut:

- customer
- employee
- business unit
- payment terms
- warehouse
- bank account

Tujuannya adalah menyiapkan semua foreign key minimum yang dibutuhkan oleh alur Sales.

### 3. Discover Batchable Products

Ini bagian yang sangat penting.

Script memanggil `collectBatchableProducts()` untuk mencari beberapa produk yang benar-benar punya batch tersedia di warehouse target. Fungsi ini:

1. mengambil daftar produk
2. untuk setiap produk, memanggil endpoint `select-batches`
3. hanya menyimpan produk yang benar-benar punya batch yang bisa dipakai

Kenapa langkah ini penting:

- DO membutuhkan `inventory_batch_id`
- jika script memakai produk yang tidak punya batch, workflow akan mati di tengah
- jika script hanya memakai satu produk terus-menerus, stock bisa habis dan memunculkan false failure

Karena itu script menyimpan pool `batchableProducts`, bukan satu produk tetap.

## Iteration Model

Setiap iterasi menjalankan dua group:

1. `workflow-1-regular`
2. `workflow-2-concurrent-payment`

Artinya satu iterasi tidak hanya menguji happy path, tetapi juga happy path plus satu skenario penolakan payment kedua.

## Detailed Step-by-Step Flow

### Step 0. Pick Workflow Target

Sebelum membuat dokumen apa pun, script memanggil `pickWorkflowTarget(data)`.

Fungsi ini:

- mengambil kandidat dari pool `batchableProducts`
- merotasi kandidat berdasarkan `__VU` dan `__ITER`
- mengecek lagi apakah batch masih tersedia saat itu juga

Tujuan desain ini adalah menghindari reuse satu produk yang sama terus-menerus dan mengurangi kegagalan karena batch habis.

### Step 1. Create Sales Quotation

Script membuat payload SQ dengan:

- `quotation_date`
- `payment_terms_id`
- `sales_rep_id`
- `business_unit_id`
- `customer_id`
- `tax_rate`
- satu line item produk

Setelah POST, script mengecek:

- status 2xx
- response memiliki `sqId`

Jika SQ gagal dibuat, workflow langsung berhenti untuk iterasi itu dan log error dicetak.

### Step 2. Move SQ to Sent and Approved

Setelah SQ berhasil, script memaksa state transition:

- `sent`
- `approved`

Ini penting karena konversi ke SO mensyaratkan SQ sudah dalam state yang valid.

### Step 3. Convert SQ to SO

Script memanggil endpoint konversi quotation ke sales order.

Lalu script mengambil `soId` dari response dan memverifikasi bahwa konversi sukses.

Kalau step ini gagal, artinya biasanya salah satu dari ini:

- status SQ belum valid
- payload/route backend berubah
- constraint internal backend berubah

### Step 4. Fetch SO Detail and Approve SO

Script mengambil detail SO agar bisa membaca `soItems`.

Ini penting karena item SO dipakai lagi untuk:

- membuat Delivery Order items
- membuat Invoice items

Setelah itu script mendorong state SO ke:

- `submitted`
- `approved`

### Step 5. Build DO Items with Inventory Batch

Ini salah satu bagian paling rawan.

Untuk setiap item SO, script:

1. mengambil `product_id` dan `quantity`
2. memanggil `pickBatchId()`
3. mengisi `inventory_batch_id`

Sebelum request DO dikirim, script melakukan precheck:

- bila ada item tanpa `inventory_batch_id`, workflow dihentikan lebih awal dengan log `DO precheck failed`

Alasan precheck ini ada:

- supaya error lebih jelas
- supaya kita tahu masalah ada pada batch selection, bukan pada create DO payload secara umum

### Step 6. Create and Progress Delivery Order

Setelah payload DO siap, script membuat DO lalu mendorong statusnya melalui beberapa tahap:

- sent
- approved
- prepared
- ship
- deliver

Tujuannya adalah memastikan workflow bergerak sampai tahap yang cukup matang untuk invoice dan payment.

### Step 7. Create Customer Invoice

Invoice dibuat dari kombinasi informasi berikut:

- `sales_order_id`
- `delivery_order_id`
- `payment_terms_id`
- `invoice_date`
- `due_date`
- `type=regular`
- item yang dibentuk dari item SO

Script mengambil `invoiceId` dan `invoiceAmount` dari response. Nilai `invoiceAmount` kemudian dipakai untuk payment di step berikutnya.

### Step 8. Submit and Approve Invoice

Script memindahkan invoice ke state yang siap dibayar:

- `submitted`
- `approved`

Jika backend mengubah kontrak state transition, bagian ini akan jadi salah satu titik gagal pertama.

### Step 9. Create Payment

Script membuat payment penuh sebesar `invoiceAmount`.

Field penting yang dipakai:

- `invoice_id`
- `bank_account_id`
- `payment_date`
- `amount`
- `method`
- `reference_number`

Jika payment berhasil dibuat, script mengambil `paymentId`.

### Step 10. Confirm Payment

Setelah payment dibuat, script memanggil endpoint confirm payment.

Secara bisnis, ini adalah tahap yang biasanya juga terkait dengan posting accounting atau journal entry di backend. Karena itu step ini sangat penting untuk integritas transaksi.

## Regular Flow Verification

Kalau `withConcurrencyCheck=false`, script hanya memeriksa invoice setelah payment dan memastikan statusnya berada di salah satu state yang masih dianggap valid oleh backend saat ini:

- `PAID`
- `PARTIAL`
- `WAITING_PAYMENT`
- `WAITING_APPROVAL`

Check ini sengaja dibuat cukup defensif agar contract state transition minor tidak langsung menghasilkan false negative selama hasil bisnis utamanya masih konsisten.

## Concurrent Payment Check

Kalau `withConcurrencyCheck=true`, setelah payment pertama dikonfirmasi script langsung mencoba membuat payment kedua untuk invoice yang sama.

### Expected Behavior

Payment kedua seharusnya gagal.

Script menandai response 4xx/5xx di call kedua sebagai expected status. Ini penting supaya conflict yang memang diharapkan tidak dihitung sebagai kegagalan benchmark yang menipu.

### What the Script Checks

Setelah payment kedua dicoba, script memeriksa:

- apakah payment kedua ditolak
- apakah jumlah row payment untuk invoice tidak meledak tidak wajar

Kalau payment kedua malah sukses, script mencetak log kritis karena itu menunjuk ke lost update bug atau locking bug.

## Helper Functions and Why They Exist

### `parseBody()`

Membuat parsing response lebih aman. Kalau response bukan JSON valid, workflow tidak langsung crash di titik parsing.

### `firstItem()`

Mengambil item pertama dari response list yang bisa berbentuk:

- `data: []`
- `data.items: []`

Ini ada karena shape response antar endpoint tidak selalu identik.

### `extractFieldErrors()`

Membantu menampilkan error field validation secara ringkas saat create gagal.

### `pickBatchId()`

Menggunakan endpoint `select-batches` untuk memilih batch yang masih punya stok cukup. Ini adalah helper terpenting untuk DO.

### `collectBatchableProducts()`

Membangun pool produk yang valid untuk workflow. Tanpa ini, test cenderung rapuh terhadap stok yang habis.

### `pickWorkflowTarget()`

Merotasi kandidat produk per VU dan iterasi supaya run lebih stabil di bawah beberapa VU.

## Common Failure Modes and Their Meaning

### `setup failed: no product with inventory batch available`

Artinya environment tidak punya produk yang benar-benar bisa dipakai untuk DO path. Ini masalah fixture atau stok, bukan masalah HTTP biasa.

### `DO precheck failed: inventory_batch_id missing`

Artinya script tidak berhasil menemukan batch untuk salah satu item SO. Ini biasanya karena:

- stok batch habis
- endpoint batch selection tidak mengembalikan kandidat yang cukup
- produk yang dipilih tidak lagi batchable pada saat iterasi berjalan

### `duplicate key value violates unique constraint idx_sales_quotations_code` atau `idx_delivery_orders_code`

Ini bukan error normal benchmark. Ini biasanya menunjukkan race condition di backend code generation saat beberapa request membuat dokumen dengan prefix yang sama.

### `second payment unexpectedly succeeded`

Ini adalah sinyal paling serius. Artinya backend mungkin gagal menahan double payment pada invoice yang sama.

## What This Script Is Good At

Script ini sangat bagus untuk:

- validasi revenue cycle Sales
- mendeteksi bug contract dan workflow
- mendeteksi masalah locking atau race condition
- membuktikan bahwa benchmark bukan hanya soal latency, tetapi juga correctness

## What This Script Is Not Ideal For

Script ini bukan pilihan terbaik untuk:

- mencari peak throughput setinggi mungkin
- mengukur kapasitas maksimum read-heavy API
- benchmark yang benar-benar steril tanpa write

Untuk itu gunakan `load-test.js` atau `stress-test.js`.

## Recommended Debugging Order When It Fails

1. cek apakah setup berhasil resolve semua master data
2. cek apakah batchable product pool berhasil dibentuk
3. cek step pertama yang gagal di console log
4. bedakan antara expected conflict dan unexpected internal error
5. kalau error terkait duplicate code atau payment conflict aneh, audit backend transaction/locking logic
