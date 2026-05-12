# Sales Revenue Cycle Implemented

## Purpose

Dokumen ini menjelaskan secara paling rinci workflow transaksi modul Sales yang saat ini benar-benar diimplementasikan di [../../../transaction-test.js](../../../transaction-test.js).

Ini adalah dokumentasi referensi utama untuk memahami bagaimana test flow Sales dibuat, dijalankan, dan divalidasi.

## Scope

Workflow Sales yang benar-benar diuji saat ini adalah:

1. create Sales Quotation
2. ubah SQ ke `sent`
3. ubah SQ ke `approved`
4. convert SQ menjadi Sales Order
5. ambil detail SO
6. submit SO
7. approve SO
8. create Delivery Order
9. progress DO sampai delivered
10. create Customer Invoice
11. submit Invoice
12. approve Invoice
13. create Payment
14. confirm Payment
15. coba payment kedua pada invoice yang sama untuk validasi penolakan concurrency

## Why Sales Is the First Implemented Module

Sales dipilih lebih dulu karena alurnya menyentuh beberapa area ERP yang kritis sekaligus:

- dokumen transaksi berantai
- inventory batch allocation
- invoice creation
- payment handling
- side effect finance saat confirm payment

Dengan satu script Sales, kita bisa menguji lebih dari sekadar HTTP latency. Kita bisa menguji correctness pada rangkaian transaksi nyata.

## End-to-End Flow Map

```text
Customer + Product + Warehouse + PaymentTerms + BankAccount
        │
        ▼
Sales Quotation (draft)
        ▼
Sales Quotation (sent)
        ▼
Sales Quotation (approved)
        ▼
Sales Order (draft)
        ▼
Sales Order (submitted)
        ▼
Sales Order (approved)
        ▼
Delivery Order (draft)
        ▼
Delivery Order (sent → approved → prepared → shipped → delivered)
        ▼
Customer Invoice (draft)
        ▼
Customer Invoice (submitted → approved)
        ▼
Sales Payment (created)
        ▼
Sales Payment (confirmed)
        ▼
Second payment attempt on same invoice must fail
```

## Setup Dependencies for Sales Flow

Sebelum iterasi dimulai, script mengambil master data berikut:

- customer
- employee untuk `salesRepId`
- business unit
- payment terms
- warehouse
- bank account

Selain itu script membangun kumpulan `batchableProducts`.

Alasan kumpulan ini penting:

- DO membutuhkan `inventory_batch_id`
- item SO harus bisa dipetakan ke batch stock nyata
- run multi-iterasi lebih stabil bila kandidat produk diputar

## Detailed Flow Per Step

### Sales Step 1. Create Sales Quotation

#### Tujuan

Memulai revenue cycle dengan dokumen Sales Quotation yang menjadi sumber untuk konversi ke SO.

#### Request intent

Payload menyertakan foreign key dan satu item line produk. Nilai penting yang diisi:

- `quotation_date`
- `payment_terms_id`
- `sales_rep_id`
- `business_unit_id`
- `customer_id`
- `tax_rate`
- `items[]`

#### Validation in test

Test memeriksa:

- response 2xx
- `sqId` tersedia

#### Kalau gagal, artinya biasanya

- FK master data tidak valid
- route atau field backend berubah
- generator code SQ di backend bermasalah pada concurrency

### Sales Step 2. Move SQ to Sent

#### Tujuan

Memastikan dokumen keluar dari draft ke state transisi yang dipakai bisnis sebelum approval.

#### Validation in test

Hanya mengecek bahwa PATCH status berhasil.

#### Makna bisnis

Ini menguji bahwa state transition antar dokumen penjualan masih kompatibel dengan kontrak backend yang sekarang.

### Sales Step 3. Move SQ to Approved

#### Tujuan

Menyiapkan SQ agar layak dikonversi menjadi SO.

#### Kenapa penting

Konversi ke SO biasanya membutuhkan SQ sudah approved. Kalau step ini gagal, step konversi berikutnya hampir pasti ikut gagal.

### Sales Step 4. Convert SQ to Sales Order

#### Tujuan

Mengubah Sales Quotation yang sudah approved menjadi Sales Order.

#### Validation in test

- response 2xx
- `soId` tersedia

#### Data yang dipakai lanjut

`soId` dan item SO hasil GET detail akan dipakai pada step DO dan Invoice.

### Sales Step 5. Fetch SO Detail

#### Tujuan

Mendapatkan `soItems` aktual dari backend.

#### Kenapa tidak memakai item awal saja

Karena test ingin mengikuti data canonical dari backend setelah konversi, bukan hanya asumsi dari payload SQ.

#### Data yang diambil

- `so.items`
- `product_id`
- `quantity`
- `price`
- `id` item SO

### Sales Step 6. Submit SO

#### Tujuan

Mendorong SO ke state submitted sebelum approval.

#### Makna testing

Menguji bahwa state machine SO masih menerima transisi yang dipakai flow bisnis inti.

### Sales Step 7. Approve SO

#### Tujuan

Menjadikan SO valid untuk dipakai sebagai dasar Delivery Order.

#### Kalau gagal, artinya biasanya

- backend validation berubah
- step sebelumnya belum menghasilkan state yang diharapkan
- approval route atau permission berubah

### Sales Step 8. Resolve Inventory Batch Per SO Item

#### Tujuan

Sebelum membuat DO, script harus tahu batch mana yang dipakai untuk setiap item SO.

#### Mekanisme helper

Untuk tiap item SO, helper `pickBatchId()` memanggil endpoint `select-batches` dengan:

- `product_id`
- `warehouse_id`
- `quantity`
- `method=FIFO`

#### Precheck penting

Kalau ada item yang tidak mendapatkan `inventory_batch_id`, script berhenti lebih awal dengan log `DO precheck failed`.

#### Kenapa precheck ini penting

Karena tanpa precheck, error create DO akan terlihat terlalu umum. Dengan precheck, kita tahu sumber masalahnya berada di batch availability atau batch selection.

### Sales Step 9. Create Delivery Order

#### Tujuan

Membuat DO dari SO yang sudah approved dengan batch inventory yang valid.

#### Payload intent

Payload berisi:

- `delivery_date`
- `warehouse_id`
- `sales_order_id`
- `delivered_by_id`
- data penerima
- `items[]` dengan `sales_order_item_id`, `product_id`, `inventory_batch_id`, `quantity`, dan `price`

#### Validation in test

Test memastikan `doId` tersedia setelah POST.

#### Failure interpretation

Kalau DO create gagal, kemungkinan umumnya:

- batch tidak valid lagi saat request dikirim
- code generation DO bentrok di backend
- contract item DO berubah

### Sales Step 10. Progress DO Through Delivery States

#### Tujuan

Mendorong Delivery Order melewati state bisnis yang cukup lengkap sebelum invoice dibuat.

#### State path yang diuji

- `sent`
- `approved`
- `prepared`
- `ship`
- `deliver`

#### Kenapa lengkap sampai delivered

Karena tujuan test bukan hanya membuat DO, tetapi memastikan DO benar-benar menjadi dokumen pengiriman yang matang untuk dipakai downstream.

### Sales Step 11. Create Customer Invoice

#### Tujuan

Membuat invoice reguler dari Sales Order dan Delivery Order.

#### Payload intent

Payload memakai:

- `invoice_date`
- `due_date`
- `type=regular`
- `sales_order_id`
- `delivery_order_id`
- `payment_terms_id`
- `tax_rate`
- `items[]` dari item SO

#### Data penting yang diambil dari response

- `invoiceId`
- `invoiceAmount`

`invoiceAmount` kemudian menjadi dasar payment di step berikutnya.

### Sales Step 12. Submit Invoice

#### Tujuan

Mendorong invoice keluar dari draft ke state siap approval.

#### Makna testing

Menguji state machine invoice dan kontrak endpoint transisi invoice.

### Sales Step 13. Approve Invoice

#### Tujuan

Membawa invoice ke state yang valid untuk menerima payment.

#### Failure interpretation

Kalau step ini gagal, flow payment sesudahnya biasanya tidak lagi representatif.

### Sales Step 14. Create Payment

#### Tujuan

Membuat payment penuh untuk invoice yang baru approved.

#### Payload intent

Field utama:

- `invoice_id`
- `bank_account_id`
- `payment_date`
- `amount = invoiceAmount`
- `method = BANK`
- `reference_number`

#### Validation in test

Test memastikan `paymentId` tersedia.

#### Makna bisnis

Ini adalah titik paling sensitif karena menyentuh piutang, alokasi payment, dan kemungkinan lost update.

### Sales Step 15. Confirm Payment

#### Tujuan

Mengonfirmasi payment agar side effect downstream di backend ikut berjalan.

#### Coverage yang diperoleh

Secara tidak langsung, step ini juga menyentuh area Finance karena payment confirmation biasanya memicu pencatatan accounting atau journal posting di backend.

#### Catatan

Script ini belum melakukan verifikasi DB langsung atas journal entry. Jadi coverage Finance di sini masih coverage tidak langsung.

### Sales Step 16. Attempt Second Payment on the Same Invoice

#### Tujuan

Menguji apakah invoice yang sama dapat dibayar dua kali secara tidak sah.

#### Expected behavior

Payment kedua harus gagal.

#### Perlakuan khusus di test

Response 4xx/5xx untuk payment kedua diperlakukan sebagai expected status sehingga tidak merusak metrik benchmark secara menipu.

#### Check lanjutan

Setelah payment kedua dicoba, test juga mengambil daftar payment invoice dan memeriksa jumlah row payment tidak membengkak secara tidak wajar.

#### Makna bila payment kedua sukses

Ini menunjuk ke bug concurrency/locking yang serius.

## Sales Workflow Checks That Matter Most

Check paling penting yang dipakai script saat ini:

- `SQ created`
- `SO converted`
- `invoice paid or partial after payment`
- `second payment rejected`
- `invoice has at most 2 payment rows`

## Common Sales Failure Modes

### Duplicate code on SQ or DO

Biasanya berarti generator code backend tidak aman terhadap concurrency.

### Missing inventory batch

Biasanya berarti stok batch habis, fixture tidak cukup, atau endpoint batch selection tidak memberi kandidat yang valid.

### SO has no items

Biasanya berarti contract conversion SQ ke SO berubah atau backend gagal menyalin item.

### Invoice created but payment confirm fails

Biasanya berarti ada masalah pada validation payment, state invoice, atau side effect accounting saat confirm.

## What This Sales Workflow Proves

Kalau flow Sales ini lolos, maka yang sedang dibuktikan bukan hanya latency. Test ini juga membuktikan beberapa hal berikut:

- dokumen penjualan bisa bergerak end-to-end
- batch inventory bisa dipilih dan dipakai untuk DO
- invoice bisa dibuat dari dokumen upstream
- payment utama bisa dibuat dan dikonfirmasi
- payment ganda pada invoice yang sama ditolak atau setidaknya terdeteksi

## What This Sales Workflow Still Does Not Prove

Walaupun detail, flow ini belum membuktikan semua hal berikut:

- journal entry benar-benar tercatat dengan isi yang tepat di DB
- semua amount accounting terverifikasi lewat assertion database
- flow DP invoice sudah aman
- seluruh variasi partial payment sudah diuji
- seluruh variasi split delivery sudah diuji

Jadi dokumentasi ini harus dibaca sebagai coverage implementasi saat ini, bukan final state semua test Sales yang diinginkan roadmap.
