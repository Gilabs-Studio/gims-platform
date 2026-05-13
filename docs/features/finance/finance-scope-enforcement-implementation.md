# Finance Scope Enforcement Implementation

> **Module:** Finance
> **Scope:** Repository-level scope enforcement for company-scoped finance data
> **Status:** Implemented and validated locally
> **Last Updated:** 2026-05-03

## Full Finance Menu Analysis Plan

Dokumen ini diperluas menjadi peta kerja lengkap untuk semua menu Finance yang aktif di sidebar. Fokusnya bukan hanya scope enforcement, tetapi juga pemetaan end-to-end antara menu UI, router backend, handler, repository, dan tabel relasi yang dipakai tiap fitur.

### Tujuan

1. Memastikan setiap menu Finance punya jalur backend yang jelas dan konsisten.
2. Memastikan data yang dibaca user finance/accounting hanya berasal dari outlet/company yang memang di-assign ke employee tersebut.
3. Mengidentifikasi menu yang sudah selesai, menu yang masih legacy/bridging, dan menu yang masih butuh wiring penuh.
4. Menjadi baseline untuk review, hardening, dan implementasi scope outlet/warehouse pada seluruh modul Finance.

### Prinsip Scope

- User dengan scope `ALL` tetap bisa melihat seluruh data yang diizinkan oleh permission.
- User dengan scope `OUTLET` atau `WAREHOUSE` hanya melihat data Finance dari outlet yang terhubung ke employee assignment mereka.
- Karena struktur finance saat ini umumnya diikat ke `company_id`, maka outlet scope harus diterjemahkan ke company scope melalui relasi `outlets.company_id`.
- Untuk menu yang tidak menyimpan `outlet_id` langsung, filtering dilakukan di repository layer melalui `company_id` atau relasi owner lain yang berasal dari outlet.

### Cara Membaca Plan

Setiap baris menu di bawah menjelaskan:
- router / endpoint utama
- handler yang menerima request
- repository yang membaca data
- tabel relasi yang terlibat
- scope note, yaitu aturan access control yang harus ikut diterapkan

## 1) Menu Accounting

### 1.1 Chart of Accounts

- UI: `/finance/accounting/coa`
- Router: `apps/api/internal/finance/presentation/router/chart_of_account_routers.go`
- Handler: `apps/api/internal/finance/presentation/handler/chart_of_account_handler.go`
- Repository: `apps/api/internal/finance/data/repositories/chart_of_account_repository.go`
- Model: `apps/api/internal/finance/data/models/chart_of_account.go`
- Tabel relasi utama:
  - `chart_of_accounts`
  - `system_account_mappings`
  - `journal_entries`
  - `journal_lines`
  - `bank_accounts.chart_of_account_id`
  - `assets.chart_of_account_id` atau relasi akun aset lain bila dipakai
- Scope note:
  - COA adalah fondasi seluruh Finance.
  - Harus difilter by company / tenant / scope sebelum dipakai oleh menu lain.
  - Akses update/delete harus dicek karena COA dipakai banyak modul lintas flow.

### 1.2 Journal Entries

- UI: `/finance/accounting/journal-entries`
- Router: `apps/api/internal/finance/presentation/router/journal_entry_routers.go`
- Handler: `apps/api/internal/finance/presentation/handler/journal_entry_handler.go`
- Repository: `apps/api/internal/finance/data/repositories/journal_entry_repository.go`
- Model: `apps/api/internal/finance/data/models/journal_entry.go`, `journal_line.go`, `journal_attachment.go`, `journal_reversal.go`
- Tabel relasi utama:
  - `journal_entries`
  - `journal_lines`
  - `journal_attachments`
  - `journal_reversals`
  - `chart_of_accounts`
- Scope note:
  - Ini pusat double-entry, jadi harus menjadi checkpoint scope paling ketat.
  - Semua query list, detail, post, reverse, dan export harus ikut filter scope.

### 1.3 Sales Journal

- UI: `/finance/accounting/journal-entries` atau submenu sales journal di navigation legacy/extended
- Router: umumnya tetap lewat journal atau sales module yang mem-post jurnal
- Handler: journal handler atau handler transaksi sales yang memicu journal posting
- Repository: journal repository + sales-related repositories bila sumbernya dari sales flow
- Tabel relasi utama:
  - `journal_entries`
  - `sales_payments`
  - `customer_invoices`
  - `sales_orders`
  - `chart_of_accounts`
- Scope note:
  - Harus mengikuti outlet dari transaksi sumber, bukan hanya company dari jurnal akhir.
  - Jika transaksi sumber berasal dari outlet tertentu, jurnal yang dihasilkan juga harus tetap berada dalam scope outlet itu.

### 1.4 Purchase Journal

- UI: `/finance/accounting/journal-entries` atau submenu purchase journal
- Router: journal / purchase flow router
- Handler: journal handler atau purchase payment/invoice handlers yang mem-post jurnal
- Repository: journal repository + purchase-side repositories
- Tabel relasi utama:
  - `journal_entries`
  - `supplier_invoices`
  - `purchase_payments`
  - `non_trade_payables`
  - `chart_of_accounts`
- Scope note:
  - Harus konsisten dengan outlet/company asal supplier invoice atau payment.
  - Jika supplier transaction dipakai lintas outlet, perlu aturan scope yang eksplisit.

### 1.5 Adjustment Journal

- UI: `/finance/accounting/journal-entries/adjustment`
- Router: `journal_entry_routers.go` atau adjustment-specific handler/router bila ada
- Handler: adjustment workflow handler / journal handler
- Repository: journal entry repository
- Tabel relasi utama:
  - `journal_entries`
  - `journal_lines`
  - `financial_closings`
- Scope note:
  - Adjustment journal harus mengikuti period lock dan company scope.
  - Tidak boleh mengubah periode yang sudah ditutup.

### 1.6 Financial Closing

- UI: `/finance/accounting/closing`
- Router: `apps/api/internal/finance/presentation/router/financial_closing_routers.go`
- Handler: `apps/api/internal/finance/presentation/handler/financial_closing_handler.go`
- Repository: `apps/api/internal/finance/data/repositories/financial_closing_repository.go`
- Model: `apps/api/internal/finance/data/models/financial_closing.go`, `financial_closing_snapshot.go`, `financial_closing_log.go`, `accounting_period.go`, `fiscal_year.go`
- Tabel relasi utama:
  - `financial_closings`
  - `financial_closing_snapshots`
  - `financial_closing_logs`
  - `accounting_periods`
  - `fiscal_years`
  - `journal_entries`
- Scope note:
  - Closing harus dibatasi ke company scope.
  - Tindakan approve/reopen/lock harus memeriksa company dan period yang sesuai.

## 2) Menu Accounts Receivable (AR)

### 2.1 Customer Invoices

- UI: `/finance/ar/customer-invoices`
- Router: biasanya dari sales/customer flow, bukan finance core saja
- Handler: customer invoice handler atau sales journal handler tergantung modul aktif
- Repository: customer invoice repository / sales journal repository
- Tabel relasi utama:
  - `customer_invoices`
  - `customer_invoice_items`
  - `sales_orders`
  - `customers`
  - `journal_entries`
  - `payments`
- Scope note:
  - Ini harus dibatasi oleh outlet customer / sales outlet atau company parent dari transaksi.
  - Jika invoice berasal dari sales order, scope outlet harus ikut sales order outlet.

### 2.2 Customer Payments

- UI: `/finance/ar/customer-payments`
- Router: `apps/api/internal/finance/presentation/router/payment_routers.go` atau sales payment router
- Handler: `apps/api/internal/finance/presentation/handler/payment_handler.go`
- Repository: `apps/api/internal/finance/data/repositories/payment_repository.go`
- Model: `apps/api/internal/finance/data/models/payment.go`, `payment_allocation.go`
- Tabel relasi utama:
  - `payments`
  - `payment_allocations`
  - `customer_invoices`
  - `chart_of_accounts`
  - `bank_accounts`
- Scope note:
  - Payment list/detail harus hanya menampilkan transaksi dari outlet yang diizinkan.
  - Jika payment menggunakan bank account, bank account itu harus berada dalam company scope user.

### 2.3 Credit Notes

- UI: `/finance/ar/credit-notes`
- Router: kemungkinan sales module router / returns router
- Handler: sales return / credit note handler
- Repository: sales return repository / invoice adjustment repository
- Tabel relasi utama:
  - `credit_notes` atau tabel retur penjualan yang dipakai repo saat ini
  - `customer_invoices`
  - `journal_entries`
- Scope note:
  - Harus mengikuti outlet asal penjualan.
  - Tidak boleh muncul pada outlet/company lain.

### 2.4 AR Aging Reports

- UI: `/finance/ar/aging-reports`
- Router: aging report router
- Handler: `apps/api/internal/finance/presentation/handler/aging_report_handler.go`
- Repository: `apps/api/internal/finance/data/repositories/aging_report_repository.go`
- Tabel relasi utama:
  - `customer_invoices`
  - `customer_payments`
  - `journal_entries`
  - `customers`
- Scope note:
  - Semua aging calculation harus scope-aware.
  - Bucket aging tidak boleh menggabungkan data antar outlet yang tidak diizinkan.

## 3) Menu Accounts Payable (AP)

### 3.1 Supplier Invoices

- UI: `/finance/ap/supplier-invoices`
- Router: `apps/api/internal/finance/presentation/router/tax_invoice_routers.go` untuk tax-related flow dan supplier flow module lain bila invoice AP dipisah
- Handler: supplier invoice handler yang ada di purchase/supplier side, atau finance adapter bila exposed di finance menu
- Repository: supplier invoice repository / purchase repository
- Tabel relasi utama:
  - `supplier_invoices`
  - `supplier_invoice_items`
  - `purchase_orders`
  - `suppliers`
  - `journal_entries`
- Scope note:
  - Scope harus diturunkan dari outlet pembuat transaksi atau company pemilik PO/invoice.

### 3.2 Supplier Payments

- UI: `/finance/ap/supplier-payments`
- Router: payment router atau purchase payment router
- Handler: payment handler / purchase payment handler
- Repository: payment repository
- Tabel relasi utama:
  - `payments`
  - `payment_allocations`
  - `supplier_invoices`
  - `bank_accounts`
- Scope note:
  - Harus mengikuti outlet yang punya hak atas supplier payable flow.
  - Bank account yang dipilih untuk pembayaran harus berada dalam company scope.

### 3.3 Debit Notes

- UI: `/finance/ap/debit-notes`
- Router: purchase return / debit note router jika tersedia
- Handler: purchase return handler
- Repository: purchase return repository
- Tabel relasi utama:
  - `debit_notes` atau tabel retur pembelian yang aktif
  - `supplier_invoices`
  - `journal_entries`
- Scope note:
  - Hanya data dari outlet company yang sama yang boleh tampil.

### 3.4 Non-Trade Payables

- UI: `/finance/ap/non-trade-payables`
- Router: `apps/api/internal/finance/presentation/router/non_trade_payable_routers.go`
- Handler: `apps/api/internal/finance/presentation/handler/non_trade_payable_handler.go`
- Repository: `apps/api/internal/finance/data/repositories/non_trade_payable_repository.go`
- Model: `apps/api/internal/finance/data/models/non_trade_payable.go`
- Tabel relasi utama:
  - `non_trade_payables`
  - `journal_entries`
  - `chart_of_accounts`
  - `bank_accounts`
- Scope note:
  - Non-trade payables sering dipakai lintas unit, jadi wajib ada guard company/outlet.

### 3.5 AP Aging Reports

- UI: `/finance/ap/aging-reports`
- Router: aging report router
- Handler: `aging_report_handler.go`
- Repository: `aging_report_repository.go`
- Tabel relasi utama:
  - `supplier_invoices`
  - `supplier_payments`
  - `journal_entries`
  - `suppliers`
- Scope note:
  - Perhitungan aging harus tetap terpisah per outlet/company.

## 4) Menu Cash & Bank

### 4.1 Bank Accounts

- UI: `/finance/cash-bank/bank-accounts`
- Router: `apps/api/internal/core/presentation/router/bank_account_router.go`
- Handler: `apps/api/internal/core/presentation/handler/bank_account_handler.go`
- Repository: `apps/api/internal/core/data/repositories/bank_account_repository.go`
- Model: `apps/api/internal/core/data/models/bank_account.go`
- Tabel relasi utama:
  - `bank_accounts`
  - `companies`
  - `chart_of_accounts`
  - `currencies`
  - `villages`
  - `banks`
  - `cash_bank_transactions`
  - `payments`
  - `bank_transfers`
  - `bank_reconciliations`
- Scope note:
  - Ini salah satu titik paling penting untuk outlet scoping.
  - Karena model saat ini memakai `company_id`, outlet scope harus diterjemahkan ke company scope.
  - Semua list/detail/history/balance/toggle harus scope-safe.

### 4.2 Cash & Bank Journal

- UI: `/finance/cash-bank/journals`
- Router: `apps/api/internal/finance/presentation/router/cash_bank_journal_routers.go`
- Handler: `apps/api/internal/finance/presentation/handler/cash_bank_journal_handler.go`
- Repository: `apps/api/internal/finance/data/repositories/cash_bank_journal_repository.go`
- Model: `apps/api/internal/finance/data/models/cash_bank_journal.go`, `cash_bank_journal_line.go`
- Tabel relasi utama:
  - `cash_bank_journals`
  - `cash_bank_journal_lines`
  - `bank_accounts`
  - `journal_entries`
- Scope note:
  - Data jurnal kas/bank harus mengikuti scope bank account/company.

### 4.3 Bank Transfers

- UI: `/finance/cash-bank/transfers`
- Router: `apps/api/internal/finance/presentation/router/bank_transfer_routers.go`
- Handler: `apps/api/internal/finance/presentation/handler/bank_transfer_handler.go`
- Repository: `apps/api/internal/finance/data/repositories/bank_transfer_repository.go`
- Model: `apps/api/internal/finance/data/models/bank_transfer.go`
- Tabel relasi utama:
  - `bank_transfers`
  - `bank_accounts` (source dan target)
  - `journal_entries`
- Scope note:
  - Transfer hanya boleh antar bank account yang masuk scope user.

### 4.4 Bank Reconciliation

- UI: `/finance/cash-bank/reconciliation`
- Router: `apps/api/internal/finance/presentation/router/bank_reconciliation_routers.go`
- Handler: `apps/api/internal/finance/presentation/handler/bank_reconciliation_handler.go`
- Repository: `apps/api/internal/finance/data/repositories/bank_reconciliation_repository.go`
- Model: `apps/api/internal/finance/data/models/bank_reconciliation.go`
- Tabel relasi utama:
  - `bank_reconciliations`
  - `bank_accounts`
  - `cash_bank_journals`
  - `payments`
- Scope note:
  - Reconciliation harus dibatasi per bank account scope.

## 5) Menu Fixed Assets

### 5.1 Asset Register

- UI: `/finance/fixed-assets/assets`
- Router: `apps/api/internal/finance/presentation/router/asset_routers.go`
- Handler: `apps/api/internal/finance/presentation/handler/asset_handler.go`
- Repository: `apps/api/internal/finance/data/repositories/asset_repository.go`
- Model: `apps/api/internal/finance/data/models/asset.go`, `asset_transaction.go`, `asset_assignment_history.go`, `asset_audit_log.go`, `asset_attachment.go`
- Tabel relasi utama:
  - `assets`
  - `asset_transactions`
  - `asset_assignment_histories`
  - `asset_audit_logs`
  - `asset_attachments`
  - `chart_of_accounts`
  - `asset_categories`
  - `asset_locations`
- Scope note:
  - Asset register sering memakai company/outlet/location scoping sekaligus.

### 5.2 Asset Categories

- UI: `/finance/fixed-assets/categories`
- Router: `apps/api/internal/finance/presentation/router/asset_category_routers.go`
- Handler: `apps/api/internal/finance/presentation/handler/asset_category_handler.go`
- Repository: `apps/api/internal/finance/data/repositories/asset_category_repository.go`
- Model: `apps/api/internal/finance/data/models/asset_category.go`
- Tabel relasi utama:
  - `asset_categories`
  - `assets`
- Scope note:
  - Master data ini biasanya company-scoped atau global tergantung seed; perlu konsistensi.

### 5.3 Asset Locations

- UI: `/finance/fixed-assets/locations`
- Router: `apps/api/internal/finance/presentation/router/asset_location_routers.go`
- Handler: `apps/api/internal/finance/presentation/handler/asset_location_handler.go`
- Repository: `apps/api/internal/finance/data/repositories/asset_location_repository.go`
- Model: `apps/api/internal/finance/data/models/asset_location.go`
- Tabel relasi utama:
  - `asset_locations`
  - `assets`
- Scope note:
  - Lokasi aset bisa menjadi jembatan penting untuk outlet ownership.

### 5.4 Depreciation Schedule

- UI: `/finance/fixed-assets/depreciation-schedule`
- Router: asset router / depreciation workflow router bila ada
- Handler: asset handler / depreciation handler
- Repository: asset repository + journal repository
- Tabel relasi utama:
  - `asset_transactions`
  - `journal_entries`
  - `journal_lines`
- Scope note:
  - Harus mengikuti aset owner company/outlet.

### 5.5 Asset Disposal

- UI: `/finance/fixed-assets/disposal`
- Router: asset router
- Handler: asset handler
- Repository: asset repository
- Tabel relasi utama:
  - `assets`
  - `asset_transactions`
  - `journal_entries`
- Scope note:
  - Disposal tidak boleh dilepas lintas company.

### 5.6 Asset Revaluation

- UI: `/finance/fixed-assets/revaluation`
- Router: asset router
- Handler: asset handler
- Repository: asset repository
- Tabel relasi utama:
  - `assets`
  - `asset_transactions`
  - `journal_entries`
- Scope note:
  - Revaluation merupakan transaksi sensitif dan harus mengacu ke company scope.

## 6) Menu Financial Reports

### 6.1 General Ledger

- UI: `/finance/reports/general-ledger`
- Router: report router
- Handler: `apps/api/internal/finance/presentation/handler/finance_report_handler.go`
- Repository: `apps/api/internal/finance/data/repositories/finance_report_repository.go`
- Tabel relasi utama:
  - `journal_entries`
  - `journal_lines`
  - `chart_of_accounts`
- Scope note:
  - Report harus menjadi output, bukan sumber data yang bisa bocor lintas scope.

### 6.2 Trial Balance

- UI: `/finance/reports/trial-balance`
- Router: report router
- Handler: finance report handler
- Repository: finance report repository / journal repository
- Tabel relasi utama:
  - `journal_entries`
  - `journal_lines`
  - `chart_of_accounts`
- Scope note:
  - Trial balance harus konsisten dengan closing period dan company scope.

### 6.3 Balance Sheet

- UI: `/finance/reports/balance-sheet`
- Router: report router
- Handler: finance report handler
- Repository: finance report repository
- Tabel relasi utama:
  - `journal_entries`
  - `journal_lines`
  - `chart_of_accounts`
  - `financial_closings`
- Scope note:
  - Report must be period-aware and company-aware.

### 6.4 Profit & Loss

- UI: `/finance/reports/profit-loss`
- Router: report router
- Handler: finance report handler
- Repository: finance report repository
- Tabel relasi utama:
  - `journal_entries`
  - `journal_lines`
  - `chart_of_accounts`
  - `financial_closings`
- Scope note:
  - Laba rugi harus memfilter only posted data per company/outlet.

### 6.5 Cash Flow Statement

- UI: `/finance/reports/cash-flow-statement`
- Router: report router jika sudah tersedia; bila belum, ini masih konseptual di UI
- Handler: finance report handler atau future cash flow handler
- Repository: finance report repository / cash movement repository
- Tabel relasi utama:
  - `bank_accounts`
  - `payments`
  - `bank_transfers`
  - `cash_bank_journals`
  - `journal_entries`
- Scope note:
  - Harus konsisten dengan sumber cash movement dan bank scope user.

## 7) Menu Finance Settings

### 7.1 Accounting Mapping

- UI: `/finance/settings/accounting-mapping`
- Router: `apps/api/internal/finance/presentation/router/system_account_mapping_routers.go`
- Handler: `apps/api/internal/finance/presentation/handler/system_account_mapping_handler.go`
- Repository: `apps/api/internal/finance/data/repositories/system_account_mapping_repository.go`
- Model: `apps/api/internal/finance/data/models/system_account_mapping.go`
- Tabel relasi utama:
  - `system_account_mappings`
  - `chart_of_accounts`
- Scope note:
  - Mapping bisa global atau company-scoped tergantung desain data.

### 7.2 Fiscal Years

- UI: `/finance/settings/fiscal-years`
- Router: `apps/api/internal/finance/presentation/router/fiscal_year_routers.go`
- Handler: `apps/api/internal/finance/presentation/handler/fiscal_year_handler.go`
- Repository: `apps/api/internal/finance/data/repositories/fiscal_year_repository.go`
- Model: `apps/api/internal/finance/data/models/fiscal_year.go`, `opening_balance.go`, `opening_balance_line.go`
- Tabel relasi utama:
  - `fiscal_years`
  - `opening_balances`
  - `opening_balance_lines`
  - `companies`
- Scope note:
  - Tahun fiskal adalah entity company-level dan tidak boleh bocor lintas company.

### 7.3 Tax Configuration

- UI: `/finance/settings/tax-config`
- Router: `apps/api/internal/finance/presentation/router/tax_configuration_routers.go`
- Handler: `apps/api/internal/finance/presentation/handler/tax_configuration_handler.go`
- Repository: `apps/api/internal/finance/data/repositories/tax_configuration_repository.go`
- Model: `apps/api/internal/finance/data/models/tax_configuration.go`
- Tabel relasi utama:
  - `tax_configurations`
  - `tax_invoices`
  - `supplier_invoices`
  - `customer_invoices`
- Scope note:
  - Konfigurasi pajak bisa company-specific, jadi harus dicek company scope.

## 8) Cash-Bank Core Entities yang Perlu Dimasukkan ke Scope Plan

Bagian ini penting karena menu Finance tidak hanya memanggil finance internal domain, tetapi juga core master-data dan transaksi lintas module.

### 8.1 Bank Account Core

- File utama:
  - `apps/api/internal/core/data/models/bank_account.go`
  - `apps/api/internal/core/data/repositories/bank_account_repository.go`
  - `apps/api/internal/core/presentation/handler/bank_account_handler.go`
  - `apps/api/internal/core/presentation/router/bank_account_router.go`
- Relasi nyata di model:
  - `CompanyID`
  - `BankID`
  - `CurrencyID`
  - `ChartOfAccountID`
  - `VillageID`
- Scope plan:
  - Ini harus menjadi prioritas utama enforcement karena dipakai oleh customer payment, supplier payment, cash bank journal, transfer, dan reconciliation.

### 8.2 Company dan Outlet

- File utama:
  - `apps/api/internal/organization/data/models/company.go`
  - `apps/api/internal/organization/data/models/outlet.go`
  - `apps/api/internal/organization/data/models/employee_outlet.go`
- Relasi nyata:
  - `outlets.company_id` → `companies.id`
  - `employee_outlets.employee_id` → `employees.id`
  - `employee_outlets.outlet_id` → `outlets.id`
- Scope plan:
  - User finance/accounting dengan scope outlet harus diterjemahkan dari assignment employee → outlet → company.
  - Repository finance yang company-scoped harus ikut membaca hasil scope outlet ini.

### 8.3 Scope Middleware / Security

- File utama:
  - `apps/api/internal/core/middleware/scope.go`
  - `apps/api/internal/core/infrastructure/security/scope_resolver.go`
- Scope context yang sudah tersedia:
  - `scope_user_id`
  - `scope_employee_id`
  - `scope_division_id`
  - `scope_outlet_ids`
  - `scope_warehouse_ids`
  - `scope_area_ids`
- Scope plan:
  - Finance repository harus memakai context ini sebagai sumber utama filtering.
  - Bila data tidak punya `outlet_id` langsung, gunakan relasi owner/company yang bisa diturunkan dari outlet.

## 9) Backend Implementation Order

Urutan implementasi yang paling aman untuk seluruh menu Finance adalah:

1. **Bank Account Core**
   - tambah filter outlet/company di repository
   - pastikan list/detail/history/balance aman
2. **Cash & Bank Transaksi**
   - payment, bank transfer, cash bank journal, reconciliation
3. **Accounting Core**
   - COA, Journal Entries, Closing, Settings
4. **AR/AP Flows**
   - invoice, payment, aging, credit/debit notes
5. **Fixed Assets**
   - asset register dan seluruh turunan posting
6. **Reports**
   - general ledger, trial balance, balance sheet, P&L, cash flow

## 10) Acceptance Criteria

- Semua menu Finance aktif punya mapping router, handler, repository, dan tabel relasi yang terdokumentasi.
- User dengan scope WAREHOUSE/OUTLET hanya melihat data Finance dari outlet yang ter-assign.
- User tidak bisa menembus data Finance milik outlet/company lain hanya dengan tahu ID.
- Bank account core menjadi titik validasi utama untuk flow cash-bank.
- Dokumen ini bisa dipakai sebagai checklist saat menambah menu baru atau melakukan hardening scope.

## 11) Follow-up yang Disarankan

1. Jadikan peta ini sebagai index utama semua dokumentasi Finance.
2. Pecah menjadi dokumen per kelompok menu jika implementasi lanjutan terlalu besar.
3. Sinkronkan plan ini dengan frontend route navigation agar URL sidebar, permission, dan endpoint backend konsisten.
4. Jadikan scope outlet/warehouse sebagai test case wajib untuk semua repository Finance yang membaca data company-scoped.

## Purpose

Dokumen ini menjelaskan perubahan scope enforcement yang sudah dipasang di Finance, plus langkah manual testing yang bisa dipakai untuk memverifikasi bahwa data hanya muncul sesuai scope user.

## What Changed

### Backend

- Scope filter ditambahkan ke repository Finance yang sebelumnya masih bisa membaca data lintas company/scope.
- Jalur detail, list, history, delete, dan balance lookup untuk bank account core juga sekarang melewati `ApplyScopeFilter(...)`.
- Repository yang sudah diperbarui mencakup:
  - bank account core
  - bank transfer
  - bank reconciliation
  - cash/bank transaction
  - fiscal year
  - tax configuration
  - financial closing
  - valuation run

### Behavior Impact

- User dengan scope terbatas tidak lagi bisa mengambil data lintas company hanya dengan menebak `id`.
- List endpoint tetap berjalan seperti biasa, tetapi hasilnya disaring oleh scope yang ada di request context.
- Jika detail record berada di luar scope, hasilnya tidak akan diekspos oleh repository dan biasanya diterjemahkan handler sebagai not found.

### Validation Performed

- Package validation sudah dijalankan untuk repository yang disentuh.
- Hasilnya bersih:
  - `go test ./internal/core/data/repositories ./internal/finance/data/repositories`

## Manual Testing Guide

Gunakan langkah berikut untuk memastikan scope enforcement bekerja.

### Prerequisites

- Backend API sudah berjalan.
- Database sudah terisi minimal dua company dengan data Finance yang berbeda.
- Anda punya minimal dua akun user:
  - user A dengan akses ke Company A
  - user B dengan akses ke Company B, atau user dengan scope lebih sempit
- Browser atau REST client siap dipakai.

### Test 1: Finance list hanya tampil data dalam scope

1. Login sebagai user dengan akses terbatas ke Company A.
2. Buka halaman Finance yang menampilkan list data, misalnya:
   - Bank Accounts
   - Bank Transfer
   - Bank Reconciliation
   - Cash/Bank Transactions
   - Fiscal Years
   - Tax Configurations
3. Pastikan query company masih mengarah ke company yang memang boleh diakses user.

Expected result:

- Data yang muncul hanya milik company yang boleh diakses user.
- Tidak ada record dari company lain yang ikut tampil.
- Pagination tetap normal.

### Test 2: Direct detail lookup di luar scope

1. Ambil satu ID record Finance dari company yang tidak boleh diakses user.
2. Panggil endpoint detail secara langsung, misalnya lewat browser atau REST client.
3. Coba akses resource seperti bank account, bank transfer, bank reconciliation, atau fiscal year.

Expected result:

- Record tidak terbuka.
- Respons biasanya `404 Not Found` atau hasil setara not found dari handler.
- Tidak ada field sensitif yang bocor di respons.

### Test 3: History/balance lookup untuk bank account

1. Login sebagai user terbatas.
2. Ambil ID bank account yang berada di company lain.
3. Panggil endpoint history atau balance detail untuk bank account tersebut.

Expected result:

- History tidak bisa dibaca jika bank account di luar scope.
- Balance computation tidak berjalan untuk record yang tidak boleh diakses.
- Hasilnya tetap tertahan di not found / empty response sesuai handler.

### Test 4: Delete/toggle action tidak menembus scope

1. Login sebagai user dengan akses terbatas.
2. Coba lakukan aksi mutasi pada record Finance dari company lain, misalnya delete, toggle status, reopen, atau cancel.

Expected result:

- Aksi tidak mengubah data di luar scope.
- Record target tetap utuh.
- Respons biasanya gagal dengan not found atau forbidden, tergantung handler yang memetakan error.

### Test 5: Compare with unrestricted user

1. Login sebagai user admin/system admin, atau user dengan scope `ALL`.
2. Ulangi list dan detail lookup yang sama.

Expected result:

- Semua data yang memang seharusnya terlihat oleh user unrestricted kembali tampil.
- Tidak ada false negative pada data yang valid.

## Suggested Manual Checklist

- [ ] List endpoint hanya menampilkan data company yang sesuai scope.
- [ ] Detail endpoint tidak bisa membuka record luar scope.
- [ ] Delete/toggle/reopen/cancel tidak berhasil pada record luar scope.
- [ ] Admin atau scope `ALL` tetap melihat data lengkap.
- [ ] Pagination dan sorting tetap konsisten setelah scope filter aktif.

## Notes

- Frontend Finance pada implementasi ini tidak membutuhkan parameter scope baru, karena kontrak yang ada sudah mengirim `company_id` pada flow yang memang butuh company selection.
- Pengecekan utama ada di backend repository layer, sehingga validasi manual yang paling penting adalah detail lookup lintas company dan list lintas company.
- Jika Anda ingin, dokumen berikutnya bisa dibuat khusus untuk matrix test per endpoint Finance, lengkap dengan request contoh dan expected status code.