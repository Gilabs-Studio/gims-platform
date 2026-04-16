# Finance Menu List

> Module: Finance
> Source of truth: `apps/web/src/lib/navigation-config.ts`
> Last updated: 2026-04-13

## Ringkasan

Dokumen ini berisi daftar menu Finance yang aktif di sidebar frontend, termasuk hierarki, URL, dan permission yang dipakai untuk akses menu.

## Struktur Menu Finance

```text
Finance
├── Accounting
│   ├── Chart of Accounts
│   ├── Journal
│   │   ├── Journal Entries
│   │   ├── Sales Journal
│   │   ├── Purchase Journal
│   │   └── Adjustment Journal
│   └── Financial Closing
├── Accounts Receivable (AR)
│   ├── Customer Invoices
│   ├── Customer Payments
│   ├── Credit Notes
│   └── AR Aging Reports
├── Accounts Payable (AP)
│   ├── Supplier Invoices
│   ├── Supplier Payments
│   ├── Debit Notes
│   ├── Non-Trade Payables
│   └── AP Aging Reports
├── Cash & Bank
│   ├── Bank Accounts
│   ├── Cash & Bank Journal
│   ├── Bank Transfers
│   └── Bank Reconciliation
├── Fixed Assets
│   ├── Asset Register
│   ├── Asset Categories
│   ├── Asset Locations
│   ├── Depreciation Schedule
│   ├── Asset Disposal
│   └── Asset Revaluation
├── Financial Reports
│   ├── General Ledger
│   ├── Trial Balance
│   ├── Balance Sheet
│   ├── Profit & Loss
│   └── Cash Flow Statement
└── Finance Settings
    ├── Accounting Mapping
    ├── Fiscal Years
    └── Tax Configuration
```

## Daftar Menu (Leaf)

| Group | Menu | URL | Permission |
|---|---|---|---|
| Accounting | Chart of Accounts | `/finance/accounting/coa` | `coa.read` |
| Accounting > Journal | Journal Entries | `/finance/accounting/journal-entries` | `journal.read` |
| Accounting > Journal | Sales Journal | `/finance/ar/customer-invoices` | `sales_journal.read` |
| Accounting > Journal | Purchase Journal | `/finance/accounting/journal-entries/purchase` | `purchase_journal.read` |
| Accounting > Journal | Adjustment Journal | `/finance/accounting/journal-entries/adjustment` | `adjustment_journal.read` |
| Accounting | Financial Closing | `/finance/accounting/closing` | `financial_closing.read` |
| Accounts Receivable (AR) | Customer Invoices | `/finance/ar/customer-invoices` | `sales_journal.read` |
| Accounts Receivable (AR) | Customer Payments | `/finance/ar/customer-payments` | `payment.read` |
| Accounts Receivable (AR) | Credit Notes | `/finance/ar/credit-notes` | `sales_return.read` |
| Accounts Receivable (AR) | AR Aging Reports | `/finance/ar/aging-reports` | `aging_report.read` |
| Accounts Payable (AP) | Supplier Invoices | `/finance/ap/supplier-invoices` | `supplier_invoice.read` |
| Accounts Payable (AP) | Supplier Payments | `/finance/ap/supplier-payments` | `payment.read` |
| Accounts Payable (AP) | Debit Notes | `/finance/ap/debit-notes` | `purchase_return.read` |
| Accounts Payable (AP) | Non-Trade Payables | `/finance/ap/non-trade-payables` | `non_trade_payable.read` |
| Accounts Payable (AP) | AP Aging Reports | `/finance/ap/aging-reports` | `aging_report.read` |
| Cash & Bank | Bank Accounts | `/finance/cash-bank/bank-accounts` | `bank_account.read` |
| Cash & Bank | Cash & Bank Journal | `/finance/cash-bank/journals` | `cash_bank_journal.read` |
| Cash & Bank | Bank Transfers | `/finance/cash-bank/transfers` | `cash_bank_journal.read` |
| Cash & Bank | Bank Reconciliation | `/finance/cash-bank/reconciliation` | `cash_bank_journal.read` |
| Fixed Assets | Asset Register | `/finance/fixed-assets/assets` | `asset.read` |
| Fixed Assets | Asset Categories | `/finance/fixed-assets/categories` | `asset_category.read` |
| Fixed Assets | Asset Locations | `/finance/fixed-assets/locations` | `asset_location.read` |
| Fixed Assets | Depreciation Schedule | `/finance/fixed-assets/depreciation-schedule` | `asset.depreciate` |
| Fixed Assets | Asset Disposal | `/finance/fixed-assets/disposal` | `asset_disposal.read` |
| Fixed Assets | Asset Revaluation | `/finance/fixed-assets/revaluation` | `asset.read` |
| Financial Reports | General Ledger | `/finance/reports/general-ledger` | `general_ledger_report.read` |
| Financial Reports | Trial Balance | `/finance/reports/trial-balance` | `trial_balance_report.read` |
| Financial Reports | Balance Sheet | `/finance/reports/balance-sheet` | `balance_sheet_report.read` |
| Financial Reports | Profit & Loss | `/finance/reports/profit-loss` | `profit_loss_report.read` |
| Financial Reports | Cash Flow Statement | `/finance/reports/cash-flow-statement` | `cash_flow_statement.read` |
| Finance Settings | Accounting Mapping | `/finance/settings/accounting-mapping` | `account_mappings.read` |
| Finance Settings | Fiscal Years | `/finance/settings/fiscal-years` | `finance_settings.read` |
| Finance Settings | Tax Configuration | `/finance/settings/tax-config` | `tax_invoice.read` |

## Relasi Menu Berdasarkan SAI

Bagian ini memetakan relasi antar menu mengikuti logika siklus akuntansi standar:

1. **Setup / Master Data** - menyiapkan akun, mapping, periode, dan referensi aset/bank.
2. **Recognition / Posting** - mencatat transaksi sumber ke jurnal atau sub-ledger.
3. **Settlement / Control** - menyelesaikan pembayaran, transfer, dan penutupan periode.
4. **Reporting** - menyusun laporan keuangan dari data yang sudah diposting.

| Menu | Peran Akuntansi | Relasi Utama | Menu Terkait | Catatan SAI |
|---|---|---|---|---|
| Chart of Accounts | Master akun | Menjadi fondasi untuk semua posting | Journal Entries, Customer Payments, Supplier Payments, Cash & Bank Journal, Asset Register, Reports | Semua transaksi pada akhirnya harus mengarah ke COA yang valid dan postable |
| Journal Entries | Jurnal umum inti | Menampung koreksi, penyesuaian, dan posting manual | Adjustment Journal, Financial Closing, General Ledger, Trial Balance | Ini adalah pusat double-entry dan sumber audit utama |
| Sales Journal | Sub-ledger piutang usaha | Mencatat transaksi penjualan ke piutang | Customer Invoices, Customer Payments, AR Aging Reports, General Ledger | Mengalir dari transaksi penjualan ke piutang lalu ke pelunasan |
| Purchase Journal | Sub-ledger hutang usaha | Mencatat transaksi pembelian ke hutang | Supplier Invoices, Supplier Payments, AP Aging Reports, General Ledger | Mengalir dari pembelian ke hutang lalu ke pembayaran |
| Adjustment Journal | Koreksi dan penyesuaian | Memperbaiki saldo, accrual, prepayment, dan koreksi akhir periode | Journal Entries, Financial Closing, Trial Balance, Profit & Loss | Dipakai untuk jurnal penyesuaian sebelum tutup buku |
| Financial Closing | Kontrol periode | Mengunci periode dan menutup laba/rugi | Journal Entries, Adjustment Journal, Trial Balance, Balance Sheet, Profit & Loss | Urutan tutup buku harus kronologis dan tidak boleh melompati periode |
| Customer Invoices | Sumber piutang | Memicu pengakuan pendapatan dan piutang | Sales Journal, Customer Payments, Credit Notes, AR Aging Reports | Di SAI, invoice adalah sumber awal pengakuan pendapatan |
| Customer Payments | Pelunasan piutang | Menurunkan saldo piutang dan menambah kas/bank | Cash Accounts, Cash & Bank Journal, Sales Journal, AR Aging Reports | Harus direkonsiliasi dengan kas/bank |
| Credit Notes | Koreksi pendapatan | Mengurangi piutang dan pendapatan terkait retur | Sales Journal, Adjustment Journal, AR Aging Reports | Mewakili retur/penyesuaian penjualan |
| AR Aging Reports | Pengendalian piutang | Menilai umur piutang dan risiko penagihan | Customer Invoices, Customer Payments, General Ledger | Dipakai untuk kontrol kolektibilitas dan follow-up collection |
| Supplier Invoices | Sumber hutang | Memicu pengakuan hutang dan beban/persediaan | Purchase Journal, Supplier Payments, Debit Notes, AP Aging Reports | Di SAI, invoice pemasok adalah dasar pencatatan hutang |
| Supplier Payments | Pelunasan hutang | Menurunkan hutang dan mengurangi kas/bank | Cash Accounts, Cash & Bank Journal, Purchase Journal, AP Aging Reports | Harus sinkron dengan rekening bank atau kas |
| Debit Notes | Koreksi pembelian | Mengurangi hutang atau biaya akibat retur pembelian | Purchase Journal, Adjustment Journal, AP Aging Reports | Setara debit note pada proses retur pembelian |
| Non-Trade Payables | Hutang non-dagang | Mencatat akrual/utang biaya non-inventori | Journal Entries, Supplier Payments, General Ledger | Dipakai untuk sewa, jasa, utilitas, dan biaya lain di luar pembelian barang dagang |
| AP Aging Reports | Pengendalian hutang | Menilai umur hutang dan prioritas pembayaran | Supplier Invoices, Supplier Payments, General Ledger | Dipakai untuk kontrol jatuh tempo dan cash planning |
| Bank Accounts | Master kas/bank | Menjadi sumber dan tujuan semua transaksi kas/bank | Customer Payments, Supplier Payments, Cash & Bank Journal, Bank Transfers, Bank Reconciliation | Rekening bank adalah referensi operasional untuk transaksi settlement |
| Cash & Bank Journal | Jurnal kas/bank | Mencatat cash in/out, transfer, dan mutasi harian | Bank Accounts, Bank Transfers, Bank Reconciliation, General Ledger | Menu ini adalah jembatan antara transaksi operasional dan ledger |
| Bank Transfers | Mutasi antar rekening | Memindahkan saldo antar bank tanpa mengubah hasil laba rugi | Bank Accounts, Cash & Bank Journal, Bank Reconciliation | Harus menjaga keseimbangan antar rekening kas/bank |
| Bank Reconciliation | Kontrol eksternal | Mencocokkan jurnal internal dengan mutasi bank | Bank Accounts, Cash & Bank Journal, Customer Payments, Supplier Payments | Dipakai untuk memastikan saldo kas/bank sesuai statement |
| Asset Register | Master aset tetap | Menjadi basis depresiasi, disposal, dan revaluasi | Asset Categories, Asset Locations, Depreciation Schedule, Asset Disposal, Asset Revaluation, General Ledger | Aset tetap harus punya kategori, lokasi, dan nilai perolehan yang benar |
| Asset Categories | Klasifikasi aset | Menentukan kelompok aset dan pola depresiasi | Asset Register, Depreciation Schedule | Membantu penentuan umur manfaat dan akun terkait |
| Asset Locations | Lokasi aset | Menentukan penempatan fisik dan audit aset | Asset Register, Asset Transfer, Asset Disposal | Penting untuk audit trail dan kontrol fisik |
| Depreciation Schedule | Beban penyusutan | Menghasilkan beban periodik ke jurnal | Asset Register, Journal Entries, Financial Closing, Profit & Loss | Mengakui penurunan manfaat ekonomis secara periodik |
| Asset Disposal | Pelepasan aset | Mengakui penghapusan dan laba/rugi pelepasan | Asset Register, Journal Entries, Profit & Loss, Balance Sheet | Dipakai saat aset dijual atau dihapus dari pembukuan |
| Asset Revaluation | Penilaian kembali aset | Menyesuaikan nilai buku aset | Asset Register, Journal Entries, Balance Sheet | Dipakai bila perusahaan menerapkan revaluasi aset |
| General Ledger | Buku besar | Menampilkan saldo dan mutasi seluruh akun | Journal Entries, Sales Journal, Purchase Journal, Cash & Bank Journal, Asset transactions | Ini adalah ringkasan akuntansi paling universal |
| Trial Balance | Neraca saldo | Menjadi checkpoint keseimbangan sebelum laporan akhir | General Ledger, Financial Closing, Balance Sheet, Profit & Loss | Dipakai untuk memastikan total debit dan kredit konsisten |
| Balance Sheet | Laporan posisi keuangan | Menampilkan aset, liabilitas, dan ekuitas | Trial Balance, Financial Closing, Asset Register, Bank Accounts, COA | Dibangun dari saldo akun neraca setelah posting |
| Profit & Loss | Laporan laba rugi | Menampilkan pendapatan dan beban | Trial Balance, Financial Closing, Journal Entries, Sales Journal, Purchase Journal | Menggambarkan performa periode berjalan |
| Cash Flow Statement | Laporan arus kas | Menampilkan arus kas operasi, investasi, dan pendanaan | Bank Accounts, Cash & Bank Journal, Customer Payments, Supplier Payments, Asset Disposal | Di repo saat ini endpoint-nya belum fully implemented, jadi relasinya masih konseptual |
| Accounting Mapping | Konfigurasi mapping akun | Menentukan akun default untuk proses otomatis | Customer Payments, Supplier Payments, Cash & Bank Journal, Non-Trade Payables, Stock Opname, Asset flows | Ini adalah lapisan kontrol untuk menghindari hardcoded COA |
| Fiscal Years | Kontrol periode fiskal | Mengatur periode aktif dan penutupan tahunan | Financial Closing, Trial Balance, Balance Sheet, Profit & Loss | Harus konsisten dengan aturan tutup buku |
| Tax Configuration | Master pajak | Menentukan aturan pajak untuk transaksi kena pajak | Tax Invoices, Supplier Invoices, Customer Invoices, Journal Entries | Mengikat logika PPN dan konfigurasi pajak lainnya |

## Relasi Siklus Akuntansi

Urutan relasi yang paling aman dan umum dipakai di Finance adalah:

```text
COA + Accounting Mapping + Fiscal Years + Tax Configuration
    → Customer Invoices / Supplier Invoices / Cash & Bank Journal / Asset Register / Non-Trade Payables
    → Customer Payments / Supplier Payments / Bank Transfers / Depreciation / Disposal / Revaluation
    → Journal Entries / Adjustment Journal
    → Financial Closing
    → Trial Balance
    → Balance Sheet + Profit & Loss + Cash Flow Statement
```

Interpretasi praktisnya:
- **COA dan Accounting Mapping** adalah fondasi setup.
- **AR/AP/Cash & Bank/Assets** adalah sumber transaksi operasional.
- **Journal Entries** adalah pusat pencatatan double-entry.
- **Financial Closing** mengunci periode sebelum laporan akhir dibaca.
- **Reports** hanya membaca data yang sudah diposting dan tidak seharusnya menjadi sumber transaksi.

## Catatan

- Menu parent seperti `Accounting`, `Journal`, `AR`, `AP`, `Cash & Bank`, `Fixed Assets`, `Financial Reports`, dan `Finance Settings` adalah container (tanpa URL langsung).
- Beberapa menu memakai permission lintas domain legacy (contoh: `payment.read`, `sales_return.read`, `purchase_return.read`).
- Jika butuh sinkronisasi backend seeder, bandingkan juga dengan [apps/api/seeders/menu_seeder.go](../../../apps/api/seeders/menu_seeder.go).
- Ada route legacy/deprecated yang masih muncul di backend, jadi relasi di dokumen ini mengikuti menu aktif di sidebar, bukan semua route historis.