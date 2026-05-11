# Fixed Assets Supporting Tables Research

**Last Updated:** May 9, 2026  
**Scope:** Research and implementation guidance for supporting fixed-asset menus/tables in GIMS

## Purpose

Dokumen ini menjelaskan kegunaan tabel berikut, bagaimana idealnya diterapkan, user journey yang umum, relasi datanya, dan trigger prosesnya:

- `asset_depreciations`
- `asset_depreciation_schedules`
- `asset_disposals`
- `asset_transfers`
- `asset_maintenance_logs`
- `asset_transactions`
- `asset_attachments`
- `asset_audit_logs`
- `asset_assignment_histories`

Dokumen ini menggabungkan:

- Observasi dari implementasi GIMS saat ini
- Struktur schema/migration yang ada di repo
- Best practice umum fixed asset lifecycle dari dokumentasi ERP vendor

## Executive Summary

Secara konsep, tabel-tabel ini membentuk 4 lapisan:

1. `asset_depreciation_schedules`: rencana periodik depresiasi
2. `asset_depreciations`, `asset_transactions`, `asset_disposals`, `asset_transfers`, `asset_maintenance_logs`: transaksi operasional dan akuntansi
3. `asset_attachments`, `asset_audit_logs`, `asset_assignment_histories`: evidence, auditability, dan custody trail
4. `fixed_assets`: master asset yang menjadi pusat semua relasi

Best practice utamanya:

- Pisahkan data plan dari data posting aktual
- Jangan jadikan perubahan status asset sebagai satu-satunya audit trail
- Semua mutasi penting harus punya trigger, approval boundary, dan referensi jurnal bila berdampak ke GL
- Assignment, transfer, disposal, dan depreciation harus idempotent dan tenant-scoped
- Attachment dan audit log harus diperlakukan sebagai bukti, bukan hanya pelengkap UI

## Current GIMS Findings

Berikut temuan yang penting untuk dipahami sebelum membangun menu atau workflow baru:

- Route yang sudah tampak aktif di GIMS adalah asset register, depreciation schedule/history/run, disposal preview/confirm, revaluation, attachments, assignment, return, audit logs, dan assignment history.
- Pada implementasi aktif, `asset_depreciations` dipakai untuk hasil run depresiasi aktual, bukan `asset_depreciation_schedules`.
- Disposal, transfer, revaluation, dan adjustment saat ini banyak memakai `asset_transactions` sebagai staging/draft transaction sebelum approval/posting.
- `asset_disposals` dan `asset_transfers` ada pada schema/model, tetapi alur aktif saat ini belum sepenuhnya menjadikannya source of truth utama untuk semua proses.
- Ada ketidakkonsistenan naming: model aktif menggunakan table `asset_assignment_history`, sedangkan daftar tenant migration menyebut `asset_assignment_histories`.
- Ada jejak schema lama yang memakai table `assets`, sedangkan model aktif GIMS memakai `fixed_assets`.

Implikasinya:

- Kalau tim mau membuat menu baru, jangan otomatis menganggap semua tabel di daftar sudah menjadi workflow aktif.
- Perlu diputuskan mana yang menjadi ledger resmi per domain: tabel domain-spesifik, atau `asset_transactions` sebagai transaction hub.

## Technical Inventory By Requested Table Name

Bagian ini mengikuti nama yang Anda berikan di `saas_tenant_migration.go`. Untuk tiap item, saya tandai apakah ditemukan sebagai:

- `Model aktif`: ada GORM model aktif
- `Migrasi legacy`: ada SQL migration lama
- `Exact table mismatch`: nama yang diminta berbeda dari nama aktif di branch ini
- `Notes`: hal penting yang perlu diperhatikan sebelum dipakai sebagai source of truth

### `asset_categories`

**Status**

- Model aktif: `AssetCategory`
- Table aktif: `asset_categories`
- Migrasi legacy: ada

**Columns yang ditemukan di model aktif**

- `id`
- `tenant_id`
- `name`
- `type`
- `depreciation_method`
- `useful_life_months`
- `depreciation_rate`
- `is_depreciable`
- `asset_account_id`
- `accumulated_depreciation_account_id`
- `depreciation_expense_account_id`
- `disposal_gain_account_id`
- `disposal_loss_account_id`
- `is_active`
- `created_at`
- `updated_at`
- `deleted_at`

**Relasi**

- Direferensikan oleh `fixed_assets.category_id`
- Dipakai oleh proses depreciation, disposal journal, dan revaluation

**Notes**

- Model aktif sudah jauh lebih kaya dibanding migration lama yang masih memakai account code, bukan account id.

### `asset_locations`

**Status**

- Model aktif: `AssetLocation`
- Table aktif: `asset_locations`
- Migrasi legacy: ada

**Columns yang ditemukan di model aktif**

- `id`
- `tenant_id`
- `name`
- `description`
- `address`
- `latitude`
- `longitude`
- `created_at`
- `updated_at`
- `deleted_at`

**Relasi**

- Direferensikan oleh `fixed_assets.location_id`
- Direferensikan oleh `asset_assignment_history.location_id`
- Dipakai secara konseptual oleh `asset_transfers.from_location_id` dan `to_location_id`

**Notes**

- Migration lama masih punya kolom seperti `code`, `city`, `country`, `postal_code`; model aktif sekarang lebih ringkas dan fokus ke lokasi operasional.

### `assets`

**Status**

- Model aktif: tidak ditemukan
- Migrasi legacy: ada, table `assets`
- Exact table mismatch: implementasi aktif memakai `fixed_assets`

**Columns yang ditemukan di migration legacy `assets`**

- `id`
- `tenant_id`
- `company_id`
- `code`
- `name`
- `description`
- `asset_type`
- `category_id`
- `location_id`
- `department_id`
- `custodian_user_id`
- `serial_number`
- `asset_tag`
- `barcode_or_qr`
- `acquisition_date`
- `acquisition_cost`
- `salvage_value`
- `currency_code`
- `exchange_rate`
- `depreciation_method`
- `useful_life_months`
- `depreciation_start_date`
- `accumulated_depreciation`
- `book_value`
- `supplier_id`
- `supplier_name`
- `purchase_order_number`
- `invoice_number`
- `invoice_date`
- `status`
- `is_active`
- `activation_date`
- `disposal_date`
- `warranty_start_date`
- `warranty_end_date`
- `insurance_policy_number`
- `insurance_value`
- `notes`
- `cost_center_code`
- `fixed_asset_account_code`
- `depreciation_expense_account_code`
- `accumulated_depreciation_account_code`
- `created_by`
- `created_at`
- `updated_by`
- `updated_at`
- `deleted_at`

**Relasi di migration legacy**

- `category_id -> asset_categories.id`
- `location_id -> asset_locations.id`

**Notes**

- Jangan pakai `assets` sebagai asumsi table aktif tanpa verifikasi.
- Di branch ini source model aktif adalah `fixed_assets`, bukan `assets`.

### `asset_depreciations`

**Status**

- Model aktif: `AssetDepreciation`
- Table aktif: `asset_depreciations`
- Migrasi legacy SQL eksplisit: tidak terlihat di `20240115_create_fixed_assets_schema.sql`, tetapi dipakai aktif oleh model dan usecase

**Columns yang ditemukan di model aktif**

- `id`
- `tenant_id`
- `asset_id`
- `period`
- `depreciation_date`
- `method`
- `amount`
- `accumulated`
- `book_value`
- `status`
- `journal_entry_id`
- `created_by`
- `created_at`

**Relasi**

- `asset_id -> fixed_assets.id`
- `journal_entry_id -> journal_entries.id` secara logis
- Dipakai oleh depreciation history dan posting aktual

**Notes**

- Ini adalah ledger depresiasi aktual yang benar-benar dipakai oleh `RunDepreciation`.

### `asset_depreciation_schedules`

**Status**

- Model aktif: `AssetDepreciationSchedule`
- Table aktif: `asset_depreciation_schedules`
- Migrasi legacy: ada

**Columns yang ditemukan di model aktif**

- `id`
- `asset_id`
- `period_start_date`
- `period_end_date`
- `period_month`
- `depreciation_amount`
- `accumulated_depreciation`
- `book_value`
- `journal_entry_id`
- `is_posted`
- `posted_at`
- `created_at`
- `updated_at`

**Relasi**

- `asset_id -> fixed_assets.id` secara model relasi bisnis, walau migration lama masih mengarah ke `assets`
- `journal_entry_id -> journal_entries.id` secara logis

**Notes**

- Model ini ada, tetapi posting aktual di branch ini tetap memakai `asset_depreciations`.

### `asset_disposals`

**Status**

- Model aktif: `AssetDisposal`
- Table aktif: `asset_disposals`
- Migrasi legacy: ada

**Columns yang ditemukan di model aktif**

- `id`
- `asset_id`
- `disposal_type`
- `disposal_date`
- `disposal_value`
- `accumulated_depreciation_at_disposal`
- `gain_or_loss`
- `reference_type`
- `reference_number`
- `description`
- `approved_by`
- `approved_at`
- `created_by`
- `created_at`
- `updated_at`

**Relasi**

- `asset_id -> fixed_assets.id` secara model relasi bisnis
- Related ke transaction approval dan disposal journal

**Notes**

- Flow aktif saat ini masih banyak memakai `asset_transactions(type=dispose)` untuk workflow draft/approval.

### `asset_transfers`

**Status**

- Model aktif: `AssetTransfer`
- Table aktif: `asset_transfers`
- Migrasi legacy: ada

**Columns yang ditemukan di model aktif**

- `id`
- `asset_id`
- `from_location_id`
- `to_location_id`
- `from_department_id`
- `to_department_id`
- `from_custodian_id`
- `to_custodian_id`
- `transfer_date`
- `reason`
- `status`
- `approved_by`
- `approved_at`
- `created_by`
- `created_at`
- `updated_at`

**Relasi**

- `asset_id -> fixed_assets.id`
- Referensi konseptual ke location, department, user/custodian

**Notes**

- Usecase aktif transfer saat ini membuat `asset_transactions(type=transfer)` untuk approval flow.

### `asset_maintenance_logs`

**Status**

- Model aktif: `AssetMaintenanceLog`
- Table aktif: `asset_maintenance_logs`
- Migrasi legacy: ada

**Columns yang ditemukan di model aktif**

- `id`
- `asset_id`
- `maintenance_type`
- `maintenance_date`
- `description`
- `cost`
- `service_provider`
- `parts_replaced`
- `duration_hours`
- `next_maintenance_date`
- `recorded_by`
- `created_at`
- `updated_at`

**Relasi**

- `asset_id -> fixed_assets.id`
- Secara konseptual bisa diperkuat dengan attachment dan vendor/provider

**Notes**

- Struktur data sudah cukup bagus untuk preventive, corrective, dan emergency maintenance.

### `asset_transactions`

**Status**

- Model aktif: `AssetTransaction`
- Table aktif: `asset_transactions`
- SQL migration eksplisit untuk create table: tidak terlihat pada file legacy yang saya cek, tetapi model dan usecase aktif menggunakannya

**Columns yang ditemukan di model aktif**

- `id`
- `tenant_id`
- `asset_id`
- `type`
- `transaction_date`
- `amount`
- `description`
- `status`
- `reference_type`
- `reference_id`
- `proceeds_amount`
- `bank_account_id`
- `book_value_at_transaction`
- `gain_loss_amount`
- `gain_loss_account_id`
- `created_by`
- `created_at`

**Relasi**

- `asset_id -> fixed_assets.id`
- Relasi logis ke disposal, transfer, revaluation, adjustment, acquisition event

**Notes**

- Ini adalah workflow hub aktif di branch ini.

### `asset_attachments`

**Status**

- Model aktif: `AssetAttachment`
- Table aktif: `asset_attachments`
- Migrasi legacy: ada

**Columns yang ditemukan di model aktif**

- `id`
- `asset_id`
- `file_name`
- `file_path`
- `file_url`
- `file_type`
- `file_size`
- `mime_type`
- `description`
- `uploaded_by`
- `uploaded_at`
- `created_at`
- `updated_at`
- `deleted_at`

**Relasi**

- `asset_id -> fixed_assets.id`
- `uploaded_by -> users.id`

**Notes**

- Model aktif lebih kaya daripada migration awal karena ada `file_url`, `mime_type`, dan soft delete.

### `asset_audit_logs`

**Status**

- Model aktif: `AssetAuditLog`
- Table aktif: `asset_audit_logs`
- Migrasi legacy: ada

**Columns yang ditemukan di model aktif**

- `id`
- `asset_id`
- `action`
- `changes`
- `performed_by`
- `performed_at`
- `ip_address`
- `user_agent`
- `metadata`
- `created_at`

**Relasi**

- `asset_id -> fixed_assets.id`
- `performed_by -> users.id`

**Notes**

- Model aktif memakai `changes JSON` dan `metadata JSON`, lebih bagus daripada schema lama yang hanya field-by-field string log.

### `asset_assignment_histories`

**Status**

- Model aktif exact name: tidak ditemukan
- Exact table mismatch: model aktif memakai `asset_assignment_history` (singular)
- Migrasi aktif: ada `asset_assignment_history`

**Columns yang ditemukan di model aktif `asset_assignment_history`**

- `id`
- `asset_id`
- `employee_id`
- `department_id`
- `location_id`
- `assigned_at`
- `assigned_by`
- `returned_at`
- `return_reason`
- `notes`
- `created_at`

**Relasi**

- `asset_id -> fixed_assets.id`
- `employee_id -> employees.id`
- `department_id -> departments.id`
- `location_id -> asset_locations.id` di model aktif
- `assigned_by -> users.id`

**Notes**

- Daftar tenant migration saat ini menyebut `asset_assignment_histories`, tetapi model aktif dan migration yang ditemukan memakai `asset_assignment_history`.
- Ini perlu dirapikan agar tenant migration, ORM, dan DB schema tidak drift.

### Active Replacement: `fixed_assets`

Karena `assets` pada daftar Anda bukan model aktif, berikut table pengganti yang benar-benar dipakai branch ini.

**Status**

- Model aktif: `Asset`
- Table aktif: `fixed_assets`

**Columns yang ditemukan di model aktif**

- `id`
- `tenant_id`
- `code`
- `name`
- `description`
- `asset_type_id`
- `serial_number`
- `barcode`
- `qr_code`
- `asset_tag`
- `category_id`
- `location_id`
- `company_id`
- `business_unit_id`
- `department_id`
- `assigned_to_employee_id`
- `assignment_date`
- `acquisition_date`
- `acquisition_cost`
- `salvage_value`
- `supplier_id`
- `purchase_order_id`
- `supplier_invoice_id`
- `custodian_user_id`
- `shipping_cost`
- `installation_cost`
- `tax_amount`
- `other_costs`
- `accumulated_depreciation`
- `book_value`
- `depreciation_method`
- `useful_life_months`
- `depreciation_start_date`
- `status`
- `lifecycle_stage`
- `disposed_at`
- `is_capitalized`
- `is_depreciable`
- `is_fully_depreciated`
- `parent_asset_id`
- `is_parent`
- `warranty_start`
- `warranty_end`
- `warranty_provider`
- `warranty_terms`
- `insurance_policy_number`
- `insurance_provider`
- `insurance_start`
- `insurance_end`
- `insurance_value`
- `created_by`
- `approved_by`
- `approved_at`
- `created_at`
- `updated_at`
- `deleted_at`

**Relasi**

- `category_id -> asset_categories.id`
- `location_id -> asset_locations.id`
- `company_id -> companies.id`
- `business_unit_id -> business_units.id`
- `department_id -> departments.id`
- `assigned_to_employee_id -> employees.id`
- `supplier_id -> contacts.id`
- `purchase_order_id -> purchase_orders.id`
- `supplier_invoice_id -> supplier_invoices.id`
- `custodian_user_id -> users.id`
- `parent_asset_id -> fixed_assets.id`
- One-to-many ke:
  - `asset_depreciations`
  - `asset_transactions`
  - `asset_attachments`
  - `asset_audit_logs`
  - `asset_assignment_history`

**Notes**

- Kalau tujuan Anda adalah mendokumentasikan keadaan aktual branch ini, `fixed_assets` harus dicantumkan berdampingan dengan daftar `assets` dari migration tenant.

## Lifecycle View

User journey fixed asset yang sehat biasanya mengikuti urutan ini:

1. Asset dibuat di `fixed_assets`
2. Dokumen pendukung diunggah ke `asset_attachments`
3. Asset di-assign ke user/divisi/lokasi dan histori dicatat di `asset_assignment_history`
4. Bila pindah lokasi/custodian/divisi, mutasi dicatat di `asset_transfers` atau setidaknya `asset_transactions`
5. Jadwal depresiasi dibangkitkan di `asset_depreciation_schedules`
6. Run depresiasi aktual menghasilkan `asset_depreciations`, update book value, lalu posting jurnal
7. Maintenance dicatat di `asset_maintenance_logs`
8. Disposal/sale/write-off dibuat sebagai draft transaction, di-approve, lalu menghasilkan posting dan perubahan status asset
9. Semua mutasi penting menghasilkan `asset_audit_logs`

## Table-by-Table Research

### 1. `asset_depreciations`

**Kegunaan**

Tabel ini adalah ledger depresiasi aktual per asset per periode. Ia mewakili hasil eksekusi depresiasi, bukan sekadar simulasi.

**Peran bisnis**

- Menyimpan depresiasi yang benar-benar sudah dihitung untuk periode tertentu
- Menjadi dasar histori depresiasi
- Menjadi jembatan ke jurnal akuntansi
- Menjaga idempotency per `asset_id + period`

**User journey**

1. User membuka menu depreciation schedule/history
2. User memilih periode
3. Sistem mem-preview candidate asset yang eligible
4. User menjalankan proses `Run Depreciation`
5. Sistem membuat record `asset_depreciations`
6. Sistem posting jurnal ke expense dan accumulated depreciation
7. Sistem update `fixed_assets.accumulated_depreciation` dan `fixed_assets.book_value`

**Relasi data**

- Many-to-one ke `fixed_assets`
- Optional link ke `journal_entries`
- Secara logis terkait ke `asset_audit_logs`

**Trigger**

- Manual batch run bulanan
- Bisa juga dipicu scheduler yang tetap harus idempotent

**Best practice**

- Wajib unique per `asset_id + period`
- Simpan amount, accumulated, book value setelah posting
- Jangan update histori lama tanpa reversal/adjustment
- Wajib simpan reference ke journal entry kalau posting ke GL
- Gunakan approval/status untuk membedakan pending vs posted/approved

**GIMS note**

Di branch ini, `RunDepreciation` memang membuat `asset_depreciations`, membuat jurnal, meng-update asset, dan menulis audit log. Ini sudah mengikuti pola ledger aktual yang baik.

### 2. `asset_depreciation_schedules`

**Kegunaan**

Tabel ini idealnya menyimpan rencana depresiasi per periode sebelum dieksekusi. Ini adalah planning/projection layer.

**Peran bisnis**

- Menampilkan future depreciation forecast
- Membantu finance memeriksa metode, useful life, salvage, dan dampak per bulan
- Menjadi dasar UI “schedule” terpisah dari “history”

**User journey**

1. User membuka menu Depreciation Schedule
2. Sistem men-generate atau membaca jadwal per asset
3. User memeriksa periode, amount, book value projection
4. Saat periode dijalankan, status schedule berubah menjadi posted atau linked ke transaksi aktual

**Relasi data**

- Many-to-one ke `fixed_assets`
- Optional one-to-one atau many-to-one ke `journal_entries`
- Secara logis berkorelasi ke `asset_depreciations`

**Trigger**

- Generate saat asset diaktifkan/capitalized
- Regenerate saat useful life, depreciation method, salvage value, atau acquisition value berubah
- Rebuild saat revaluation material mengubah basis depresiasi

**Best practice**

- Perlakukan schedule sebagai derived data, bukan ledger final
- Simpan `is_posted` atau status serupa
- Jaga ability untuk regenerate secara aman
- Pisahkan schedule projection dari posted history agar user tidak keliru

**GIMS note**

Di implementasi saat ini, menu schedule ada, tetapi source of truth posting aktual tetap `asset_depreciations`. Ini bagus. `asset_depreciation_schedules` sebaiknya diposisikan sebagai schedule/projection, bukan duplikasi ledger.

### 3. `asset_disposals`

**Kegunaan**

Tabel ini dipakai untuk event penghentian asset: disposal, scrap, donation, retirement, atau transfer-out permanen.

**Peran bisnis**

- Menyimpan detail final disposal event
- Menyimpan nilai pelepasan, accumulated depreciation saat disposal, dan gain/loss
- Menjadi jejak bisnis yang lebih spesifik daripada sekadar status asset = disposed

**User journey**

1. User pilih asset yang akan dilepas
2. User input disposal date, proceeds, alasan, dan dokumen pendukung
3. Sistem preview gain/loss
4. User submit
5. Approver menyetujui
6. Sistem posting jurnal disposal
7. Status asset berubah jadi disposed/sold/written-off

**Relasi data**

- One-to-one atau one-to-many ke `fixed_assets` tergantung kebijakan parsial disposal
- Terkait ke `asset_transactions`
- Terkait ke `journal_entries`
- Diperkuat oleh `asset_attachments` dan `asset_audit_logs`

**Trigger**

- Manual submit disposal
- Partial disposal
- End-of-life write-off
- Asset sale

**Best practice**

- Disposal harus menjadi final event dan biasanya last posting besar pada asset
- Wajib hitung gain/loss dari proceeds vs net book value
- Wajib cek accounting period masih terbuka
- Simpan approval info dan evidence
- Jika mendukung sale vs scrap vs donation, simpan type yang eksplisit

**GIMS note**

Flow aktif GIMS saat ini lebih banyak memakai `asset_transactions` type `dispose` dan approval transaction sebelum posting jurnal. `asset_disposals` belum tampak jadi ledger utama flow aktif. Jika ingin memperjelas domain, ada dua opsi:

1. Jadikan `asset_disposals` sebagai header bisnis final dan `asset_transactions` sebagai workflow/staging
2. Jadikan `asset_transactions` ledger universal dan pertahankan `asset_disposals` hanya jika perlu detail disposal yang lebih kaya

Rekomendasi: opsi 1 lebih jelas untuk audit dan reporting bisnis.

### 4. `asset_transfers`

**Kegunaan**

Mencatat perpindahan asset antar lokasi, departemen, cost center, atau custodian.

**Peran bisnis**

- Menjaga chain of custody
- Menjelaskan kenapa lokasi/custodian asset berubah
- Memisahkan perpindahan permanen/administratif dari assignment harian

**User journey**

1. User mengajukan transfer asset
2. User memilih lokasi/departemen/custodian tujuan dan alasan
3. Approver menyetujui
4. Sistem update current location/custodian pada `fixed_assets`
5. Sistem catat histori transfer
6. Bila perlu, sistem update assignment history juga

**Relasi data**

- Many-to-one ke `fixed_assets`
- FK ke lokasi/departemen/user sumber dan tujuan
- Berkaitan erat dengan `asset_assignment_history`
- Dapat direferensikan oleh `asset_transactions`

**Trigger**

- Relokasi fisik
- Pergantian PIC/custodian
- Reorganisasi cabang/departemen
- Transfer intercompany atau antar-BU bila didukung

**Best practice**

- Pisahkan request transfer dari approval completion
- Simpan from/to snapshot, bukan hanya nilai akhir
- Jangan overwrite current location tanpa histori
- Sinkronkan perubahan ke assignment/custodian jika asset dipakai employee tertentu
- Validasi bahwa asset tidak sedang disposed

**GIMS note**

Di branch ini, transfer saat ini dibuat sebagai `asset_transactions` type `transfer` dengan `reference_id` berisi target location untuk approval. Ini workable, tetapi `asset_transfers` masih lebih cocok bila tim butuh histori perpindahan yang eksplisit dan kaya metadata.

### 5. `asset_maintenance_logs`

**Kegunaan**

Menyimpan histori maintenance preventif, korektif, dan emergency.

**Peran bisnis**

- Mengontrol reliability asset
- Menyediakan histori biaya pemeliharaan
- Membantu keputusan repair vs replace
- Menjadi dasar next maintenance date

**User journey**

1. User atau teknisi membuka asset
2. User log maintenance event
3. User isi jenis maintenance, provider, part replaced, durasi, biaya, dan next service date
4. Sistem simpan log
5. Reporting membaca total biaya maintenance dan overdue service

**Relasi data**

- Many-to-one ke `fixed_assets`
- Dapat punya attachment invoice/service report
- Dapat dipetakan ke purchase/vendor/payment bila ingin lebih matang

**Trigger**

- Jadwal preventive maintenance
- Breakdown/corrective repair
- Warranty service
- Emergency incident

**Best practice**

- Pisahkan maintenance expense dari capitalization improvement
- Simpan next maintenance date untuk reminder/reporting
- Gunakan maintenance type/code yang konsisten
- Hubungkan ke vendor/provider bila biaya eksternal material
- Jangan menaikkan nilai asset untuk routine maintenance

**GIMS note**

Schema GIMS sudah mengarah benar: ada type, cost, provider, parts replaced, duration, dan next maintenance date. Ini sudah cukup baik untuk menu maintenance log.

### 6. `asset_transactions`

**Kegunaan**

Ini adalah transaction hub generik untuk event acquire, update, depreciate, transfer, dispose, revalue, dan adjust.

**Peran bisnis**

- Menjadi draft/approval queue mutasi asset
- Menyatukan workflow transaksi lintas jenis
- Menyimpan reference antar event dan status approval

**User journey**

1. User submit mutasi asset
2. Sistem buat `asset_transactions` status `draft`
3. Approver review
4. Saat approved, sistem post efek ke `fixed_assets`, jurnal, atau tabel domain lain

**Relasi data**

- Many-to-one ke `fixed_assets`
- Related to `journal_entries`
- Bisa reference ke `asset_disposals`, `asset_transfers`, atau object lain via `reference_type/reference_id`

**Trigger**

- Acquisition
- Transfer request
- Disposal draft
- Revaluation
- Adjustment

**Best practice**

- Cocok untuk approval workflow lintas transaksi
- Jangan terlalu generik sampai kehilangan detail domain
- Untuk transaksi kompleks, gunakan pattern header detail:
  - `asset_transactions` = workflow header
  - tabel spesifik = domain detail
- Simpan status yang jelas: draft, approved, rejected, cancelled
- Hindari field serbaguna yang akhirnya overload makna

**GIMS note**

Di branch ini, `asset_transactions` adalah pusat workflow aktif untuk transfer, disposal, revaluation, adjustment, dan acquisition logging. Itu membuat implementasi cepat, tetapi tetap perlu disiplin agar detail domain tidak hilang.

### 7. `asset_attachments`

**Kegunaan**

Menyimpan dokumen dan bukti aset: invoice, receipt, photo, warranty, manual, BA serah-terima, service report, disposal approval, dan sebagainya.

**Peran bisnis**

- Evidence repository per asset
- Membantu audit dan investigasi
- Mempercepat operasional saat butuh invoice/warranty/manual

**User journey**

1. User buka detail asset
2. User upload dokumen
3. Sistem simpan metadata file
4. User lain melihat/unduh sesuai permission

**Relasi data**

- Many-to-one ke `fixed_assets`
- Optional relation ke uploader (`users`)
- Secara konseptual bisa di-tag ke maintenance/disposal/transfer tertentu

**Trigger**

- Saat create asset
- Saat maintenance
- Saat warranty claim
- Saat transfer/disposal

**Best practice**

- Simpan metadata lengkap: type, mime, size, uploader, uploaded_at
- Gunakan storage path yang tenant-scoped
- Pisahkan logical attachment type dari MIME type
- Terapkan access control dan antivirus/content checks bila ada upload publik/internal
- Jangan simpan hanya file path tanpa audit uploader

**GIMS note**

Model aktif GIMS sudah memuat `file_name`, `file_path`, `file_url`, `file_type`, `mime_type`, `description`, `uploaded_by`, dan soft delete. Ini sudah cukup matang untuk baseline attachment management.

### 8. `asset_audit_logs`

**Kegunaan**

Tabel ini adalah jejak audit perubahan master dan lifecycle asset.

**Peran bisnis**

- Menjawab siapa mengubah apa, kapan, dari nilai lama ke baru
- Membantu audit internal, compliance, dan RCA insiden
- Menjadi pembeda antara histori bisnis dan histori perubahan data

**User journey**

1. User atau sistem melakukan perubahan asset
2. Sistem otomatis menulis audit log
3. Auditor/manager membuka menu audit logs
4. Mereka memeriksa action, perubahan field, actor, waktu, dan metadata konteks

**Relasi data**

- Many-to-one ke `fixed_assets`
- Optional relation ke `users`
- Berkaitan secara naratif dengan semua tabel transaksi

**Trigger**

- Create/update/delete logical
- Depreciation posting
- Transfer approval
- Disposal approval
- Revaluation/adjustment approval
- Assignment/return

**Best practice**

- Simpan structured change set, bukan string bebas saja
- Simpan actor, timestamp, IP, user agent, dan metadata event
- Audit log harus append-only
- Bedakan business event dari field diff jika perlu
- Jangan mengandalkan audit log sebagai satu-satunya source untuk reporting bisnis

**GIMS note**

Model aktif memakai `changes` JSON dan `metadata` JSON, yang jauh lebih baik dibanding versi schema lama yang hanya `field_name`, `old_value`, `new_value`. Rekomendasi: pertahankan model aktif yang structured.

### 9. `asset_assignment_histories` / `asset_assignment_history`

**Kegunaan**

Mencatat histori peminjaman, penyerahan, atau penugasan asset ke employee/departemen/lokasi.

**Peran bisnis**

- Menyimpan chain of custody tingkat user/employee
- Membantu asset accountability
- Memudahkan return process dan aging assignment

**User journey**

1. Admin asset assign asset ke employee
2. Sistem menutup assignment aktif sebelumnya bila ada
3. Sistem membuat histori assignment baru
4. Saat asset dikembalikan, assignment di-mark returned
5. User bisa melihat timeline assignment asset

**Relasi data**

- Many-to-one ke `fixed_assets`
- Optional FK ke `employees`, `departments`, `asset_locations`, `users`
- Sangat dekat dengan `asset_transfers`, tetapi level maknanya berbeda

**Trigger**

- Asset dipinjamkan ke karyawan
- Reassignment antar employee
- Asset dikembalikan
- Asset pindah unit kerja

**Best practice**

- Hanya boleh ada satu assignment aktif per asset pada satu waktu
- Saat reassignment, assignment lama harus ditutup, bukan di-overwrite
- Simpan assigned_at, returned_at, assigned_by, return_reason, notes
- Tampilkan timeline aktif vs histori selesai
- Bedakan assignment ke employee dari transfer antar lokasi jika prosesnya memang berbeda

**GIMS note**

Usecase aktif sudah menutup assignment lama lalu membuat record baru. Itu sudah sesuai best practice. Yang perlu dibereskan adalah konsistensi nama tabel di migration tenant list versus model aktif.

## Recommended Menu Mapping

Agar user tidak bingung, pemetaan menu yang disarankan adalah:

- `Depreciation Schedule`
  - Source utama: `asset_depreciation_schedules`
  - Fungsi: plan/projection
- `Depreciation History`
  - Source utama: `asset_depreciations`
  - Fungsi: posted history
- `Asset Disposal`
  - Source utama: `asset_disposals` atau `asset_transactions(type=dispose)` bila masih memakai workflow generik
  - Fungsi: retirement/sale/write-off
- `Asset Transfer`
  - Source utama: `asset_transfers`
  - Fungsi: perpindahan antar lokasi/custodian/unit
- `Asset Maintenance`
  - Source utama: `asset_maintenance_logs`
  - Fungsi: service history dan maintenance planning
- `Asset Attachments`
  - Source utama: `asset_attachments`
  - Fungsi: evidence/documents
- `Asset Audit Logs`
  - Source utama: `asset_audit_logs`
  - Fungsi: change trail
- `Assignment History`
  - Source utama: `asset_assignment_history`
  - Fungsi: custody trail per employee

## Data Relation Blueprint

Relasi yang disarankan:

- `fixed_assets` 1..n `asset_depreciation_schedules`
- `fixed_assets` 1..n `asset_depreciations`
- `fixed_assets` 1..n `asset_transactions`
- `fixed_assets` 1..n `asset_attachments`
- `fixed_assets` 1..n `asset_audit_logs`
- `fixed_assets` 1..n `asset_maintenance_logs`
- `fixed_assets` 1..n `asset_assignment_history`
- `fixed_assets` 1..n `asset_transfers`
- `fixed_assets` 1..n `asset_disposals`

Relasi pendukung:

- `asset_depreciations` n..1 `journal_entries`
- `asset_transactions` optionally n..1 `journal_entries`
- `asset_disposals` optionally 1..1 `asset_transactions`
- `asset_transfers` optionally 1..1 `asset_transactions`
- `asset_attachments` optionally bisa diperluas ke transaction-level attachment jika kebutuhan audit makin tinggi

## Trigger Matrix

| Event | Main Table | Supporting Effects |
|---|---|---|
| Asset created | `fixed_assets` | create `asset_transactions(acquire)`, `asset_audit_logs`, optional `asset_attachments` |
| Asset capitalized/activated | `fixed_assets` | generate `asset_depreciation_schedules`, `asset_audit_logs` |
| Run monthly depreciation | `asset_depreciations` | update `fixed_assets`, create journal, audit log |
| Transfer requested | `asset_transfers` or `asset_transactions` | approval workflow, audit log |
| Transfer approved | `fixed_assets` | update location/custodian, write transfer history, audit log |
| Maintenance logged | `asset_maintenance_logs` | optional attachment, optional reminder/next service |
| Disposal preview | no final ledger yet | compute gain/loss only |
| Disposal approved | `asset_disposals` or `asset_transactions` | update `fixed_assets`, create journal, audit log |
| Asset assigned | `asset_assignment_history` | update current assignment fields on `fixed_assets` |
| Asset returned | `asset_assignment_history` | close active record, clear assignment on `fixed_assets` |

## Recommended Best Practice for GIMS

### A. Keep the split between planning and posting

- `asset_depreciation_schedules` = projection
- `asset_depreciations` = actual posting history

Ini sudah pola yang benar dan perlu dipertahankan.

### B. Use specific domain tables for business-final records

Untuk proses seperti disposal dan transfer, sebaiknya:

- `asset_transactions` dipakai sebagai workflow header/draft
- `asset_disposals` dan `asset_transfers` dipakai sebagai final business record

Ini membuat reporting dan audit lebih jelas daripada semua event dipaksa lewat satu tabel generik.

### C. Make audit and evidence first-class

- Semua action material wajib menulis `asset_audit_logs`
- Semua proses sensitif seperti disposal, transfer, maintenance besar, dan warranty claim sebaiknya mendukung `asset_attachments`

### D. Enforce tenant isolation everywhere

Karena GIMS multi-tenant:

- Semua query wajib tenant-scoped
- File storage path harus tenant-scoped
- Cache/report/export juga harus tenant-scoped
- Jangan pernah mengambil `tenant_id` dari body/query user

### E. Align naming before extending more features

Sebelum memperluas feature:

- Konsistenkan `assets` vs `fixed_assets`
- Konsistenkan `asset_assignment_histories` vs `asset_assignment_history`

Kalau tidak, migration, ORM model, tenant migration, dan reporting akan mudah drift.

## Concrete Recommendations

1. Tetapkan `asset_transactions` sebagai workflow table, bukan satu-satunya business ledger.
2. Jadikan `asset_disposals` dan `asset_transfers` sebagai record final yang lebih kaya metadata.
3. Pertahankan `asset_depreciations` sebagai satu-satunya actual depreciation ledger.
4. Gunakan `asset_depreciation_schedules` hanya untuk plan/projection dan reconciliation.
5. Pastikan satu asset hanya punya satu assignment aktif.
6. Tambahkan attachment relation ke disposal/maintenance/transfer bila tim butuh evidentiary audit yang lebih kuat.
7. Rapikan mismatch naming sebelum migrasi tenant/full rollout berikutnya.

## External Research Notes

Referensi praktik umum yang paling relevan dengan desain di atas:

- Microsoft Learn menjelaskan bahwa fixed asset lifecycle idealnya memisahkan acquisition, depreciation, maintenance, dan disposal sebagai proses yang berbeda, dengan posting jurnal dan reporting masing-masing.
- Microsoft Learn juga menekankan bahwa maintenance adalah operating expense, bukan otomatis capital improvement.
- Microsoft Learn menjelaskan disposal sebagai transaksi final yang menghitung gain/loss dan menjadi posting terakhir yang signifikan untuk asset tersebut.
- SAP audit trail documentation menekankan change logging yang traceable, evaluable, dan konsisten.
- NetSuite fixed assets overview menunjukkan bahwa acquisition, depreciation, revaluation, retirement, maintenance, dan insurance biasanya dikelola sebagai lifecycle yang saling terkait, bukan satu menu tunggal.

## Source Links

- GIMS repo:
  - `apps/api/internal/core/infrastructure/database/migrations/saas_tenant_migration.go`
  - `apps/api/migrations/20240115_create_fixed_assets_schema.sql`
  - `apps/api/migrations/20260319_extend_fixed_assets_schema.sql`
  - `apps/api/internal/finance/data/models/asset.go`
  - `apps/api/internal/finance/data/models/asset_depreciation.go`
  - `apps/api/internal/finance/data/models/asset_extended.go`
  - `apps/api/internal/finance/data/models/asset_transaction.go`
  - `apps/api/internal/finance/data/models/asset_attachment.go`
  - `apps/api/internal/finance/data/models/asset_audit_log.go`
  - `apps/api/internal/finance/data/models/asset_assignment_history.go`
  - `apps/api/internal/finance/domain/usecase/depreciation_usecase.go`
  - `apps/api/internal/finance/domain/usecase/asset_usecase.go`
  - `apps/api/internal/finance/presentation/router/asset_routers.go`
- External:
  - Microsoft Learn, Fixed asset depreciation conventions: https://learn.microsoft.com/en-us/dynamics365/finance/fixed-assets/fixed-asset-depreciation-conventions
  - Microsoft Learn, Fixed asset depreciation: https://learn.microsoft.com/en-us/dynamics365/finance/fixed-assets/fixed-asset-depreciation
  - Microsoft Learn, Dispose or retire fixed assets: https://learn.microsoft.com/en-ca/dynamics365/business-central/fa-how-dispose-retire
  - Microsoft Learn, Maintain fixed assets: https://learn.microsoft.com/en-gb/dynamics365/business-central/fa-how-maintain
  - Microsoft Learn, Set up fixed asset maintenance: https://learn.microsoft.com/en-us/dynamics365/business-central/fa-how-setup-maintenance
  - Microsoft Learn, Acquire fixed assets: https://learn.microsoft.com/en-us/dynamics365/business-central/fa-how-acquire
  - SAP Help, Audit Trail: https://help.sap.com/docs/ABAP_PLATFORM_NEW/854a52b763004c1087e27e1b4bfe4285/5c75c9c74b614cf08dd533e4c2fd5448.html
  - Oracle NetSuite, Fixed Assets Management Overview: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_N2126441.html
