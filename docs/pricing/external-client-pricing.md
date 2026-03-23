# GIMS External Pricing Guide

Dokumen ini ditujukan untuk tim sales dan calon klien. Tujuannya adalah memberi harga yang jelas per menu/fitur, bukan sekadar range, supaya pertanyaan seperti “fitur ini berapa?” bisa dijawab cepat dan konsisten.

> Catatan: angka di bawah adalah **list price** yang dipakai untuk quotation awal. Diskon, termin pembayaran, dan skema kontrak bisa diatur terpisah.
> Seluruh harga di dokumen ini **belum termasuk PPN 11%** dan biaya pajak lain yang berlaku.

## Prinsip Pricing

- Harga dipisahkan antara **paket standar**, **harga per menu**, dan **biaya tambahan**.
- **Starter** dipakai untuk masuk pasar dengan scope kecil dan cepat go-live.
- **Full** adalah paket lengkap standar GIMS, **tanpa custom tambahan**.
- Fitur custom, integrasi khusus, migrasi data besar, dan deployment on-premise dihitung terpisah.
- Dashboard selalu termasuk di semua paket.

## Ringkasan Paket

| Paket | Cocok Untuk | Model | Harga Setup | Harga Berjalan |
|---|---|---:|---:|---:|
| Starter / Market Entry | UMKM kecil yang butuh sistem inti | Cloud / hosted | Rp29.000.000 | Rp2.900.000 / bulan |
| Growth | Perusahaan yang mulai butuh kontrol antar divisi | Cloud / hosted | Rp89.000.000 | Rp7.900.000 / bulan |
| Full Standard | Perusahaan menengah sampai besar dengan proses end-to-end | Cloud / hosted | Rp249.000.000 | Rp14.900.000 / bulan |
| Full On-Premise Subscription | Perusahaan yang harus simpan data di server internal, tapi tetap ingin model berlangganan | Client server / on-premise | Rp299.000.000 | Rp19.900.000 / bulan |
| Full On-Premise License | Perusahaan yang ingin license sekali bayar di server sendiri | Client server / on-premise | Rp449.000.000 | Rp6.500.000 / bulan support opsional |

## Model Komersial

### 1. Cloud / Hosted Subscription
- Cocok untuk klien yang ingin cepat jalan tanpa urus server.
- Biaya terdiri dari setup awal dan subscription bulanan.
- Semua infrastruktur, backup rutin, dan monitoring dasar dikelola vendor.

### 2. On-Premise Subscription
- Cocok untuk klien yang ingin aplikasi berjalan di server milik sendiri, tetapi tetap membayar berlangganan.
- Monthly fee mencakup license use, bug fixing, minor update, dan remote support.
- Infrastruktur server, listrik, backup lokal, dan tim IT internal tetap menjadi tanggung jawab client.

### 3. On-Premise Perpetual License
- Cocok untuk perusahaan yang lebih nyaman dengan CAPEX daripada OPEX.
- Client membayar license sekali di awal, lalu membayar maintenance tahunan.
- Cocok untuk implementasi yang butuh kontrol penuh terhadap data dan deployment internal.

## Paket Paling Murah: Starter / Market Entry

### Scope yang termasuk

**1. Dashboard**
- Ringkasan operasional
- Widget KPI dasar
- Shortcut ke menu utama

**2. Master Data**
- Geographic
- Organization: Company, Divisions, Job Positions
- Employees
- Suppliers
- Customers
- Products
- Warehouses
- Payment & Courier: Currencies, Payment Terms
- Users

**3. Sales**
- Quotations
- Sales Orders
- Customer Invoices
- Payments

**4. Purchase**
- Requisitions
- Purchase Orders
- Goods Receipt
- Supplier Invoices
- Payments

**5. Stock**
- Inventory
- Stock Movement

**6. Reports**
- Sales Overview
- Top Product

### Batasan Starter
- Belum termasuk Finance penuh
- Belum termasuk HRD
- Belum termasuk CRM
- Belum termasuk AI Assistant
- Belum termasuk Stock Opname
- Belum termasuk return flow dan DP invoice
- Belum termasuk custom workflow dan integrasi pihak ketiga

## Paket Full Standard

Paket ini berisi seluruh menu standar yang ada di navigation config dan GIMS Documentation, tanpa custom tambahan.

### Scope yang termasuk

**Dashboard**
- Dashboard

**Master Data**
- Geographic
- Organization: Company, Divisions, Job Positions, Business Units, Business Types, Areas
- Employees
- Supplier: Suppliers, Supplier Types, Banks
- Customer: Customers, Customer Types
- Product: Products, Categories, Brands, Segments, Types, Packaging, Unit of Measure, Procurement Types
- Warehouses
- Payment & Courier: Currencies, Payment Terms, Courier Agencies, SO Sources
- Leave Types
- Users

**Sales**
- Quotations
- Sales Orders
- Delivery Orders
- Customer Invoices
- Customer Invoices DP
- Returns
- Payments
- Receivables Recap

**Purchase**
- Requisitions
- Purchase Orders
- Goods Receipt
- Supplier Invoices
- Supplier Invoices DP
- Returns
- Payments
- Payable Recap

**Stock**
- Inventory
- Stock Movement
- Stock Opname

**Finance**
- Accounting: Chart of Accounts, Journal, Financial Closing
- Banking & Payments: Bank Accounts, Payments, Cash Bank Journal
- Receivables & Payables: Non-Trade Payables, Tax Invoices, Aging Reports
- Budgeting & Cost: Budget, Salary, Up Country Cost
- Asset Management: Assets, Asset Categories, Asset Locations, Asset Budgets
- Financial Statements: General Ledger, Balance Sheet, Profit & Loss

**HRD**
- Attendance
- Leave Requests
- Evaluation
- Recruitment
- Work Schedule
- Holidays

**CRM**
- Leads
- Pipeline
- Tasks
- Visit Reports
- Area Mapping
- Sales Targets
- CRM Settings

**Reports**
- Sales Overview
- Top Product
- Geo Performance
- Customer Research
- Supplier Research

**AI Assistant**
- Chatbot
- Settings

### Batasan Full Standard
- Tidak termasuk fitur custom yang dibuat khusus untuk satu klien
- Tidak termasuk integrasi khusus ke tools pihak ketiga
- Tidak termasuk migrasi data kompleks di luar scope standar
- Tidak termasuk penyesuaian besar pada approval flow standar

## On-Premise Commercial Notes

Jika klien meminta deployment di server mereka sendiri, gunakan aturan berikut:

- **Subscription di server client** = biaya berlangganan software, bukan biaya hosting.
- **Perpetual license** = bayar di awal untuk hak pakai software, lalu maintenance tahunan terpisah.
- **Installation fee** = setup environment, database, domain, SSL, backup flow, dan handover ke tim IT client.
- **SLA support** = response time, bug fixing, dan update minor sesuai kontrak.

### Rekomendasi harga on-premise

| Model | Setup / License | Berjalan |
|---|---:|---:|
| Starter On-Premise Subscription | Rp39.000.000 | Rp4.900.000 / bulan |
| Growth On-Premise Subscription | Rp109.000.000 | Rp10.900.000 / bulan |
| Full On-Premise Subscription | Rp299.000.000 | Rp19.900.000 / bulan |
| Starter On-Premise License | Rp69.000.000 | Rp5.500.000 / bulan support opsional |
| Growth On-Premise License | Rp159.000.000 | Rp6.500.000 / bulan support opsional |
| Full On-Premise License | Rp449.000.000 | Rp6.500.000 / bulan support opsional |

> Untuk on-premise license, annual maintenance direkomendasikan di kisaran 15% dari nilai license per tahun.

## Harga Menu Per Fitur

Bagian ini dipakai kalau klien bertanya harga satu fitur spesifik.

### Dashboard

| Fitur | Harga |
|---|---:|
| Dashboard | Termasuk paket |

### Master Data

| Fitur | Harga |
|---|---:|
| Geographic | Rp4.500.000 |
| Organization - Company | Rp7.500.000 |
| Organization - Divisions | Rp4.500.000 |
| Organization - Job Positions | Rp4.500.000 |
| Organization - Business Units | Rp5.000.000 |
| Organization - Business Types | Rp4.500.000 |
| Organization - Areas | Rp4.500.000 |
| Employees | Rp12.500.000 |
| Supplier - Suppliers | Rp9.500.000 |
| Supplier - Supplier Types | Rp3.500.000 |
| Supplier - Banks | Rp4.000.000 |
| Customer - Customers | Rp9.500.000 |
| Customer - Customer Types | Rp3.500.000 |
| Product - Products | Rp15.000.000 |
| Product - Categories | Rp4.000.000 |
| Product - Brands | Rp4.000.000 |
| Product - Segments | Rp4.000.000 |
| Product - Types | Rp4.000.000 |
| Product - Packaging | Rp4.000.000 |
| Product - Unit of Measure | Rp4.000.000 |
| Product - Procurement Types | Rp4.000.000 |
| Warehouses | Rp7.500.000 |
| Payment & Courier - Currencies | Rp3.000.000 |
| Payment & Courier - Payment Terms | Rp3.500.000 |
| Payment & Courier - Courier Agencies | Rp4.000.000 |
| Payment & Courier - SO Sources | Rp3.000.000 |
| Leave Types | Rp4.500.000 |
| Users | Rp6.500.000 |

### Sales

| Fitur | Harga |
|---|---:|
| Quotations | Rp8.500.000 |
| Sales Orders | Rp8.500.000 |
| Delivery Orders | Rp9.500.000 |
| Customer Invoices | Rp10.500.000 |
| Customer Invoices DP | Rp8.500.000 |
| Returns | Rp8.500.000 |
| Payments | Rp7.500.000 |
| Receivables Recap | Rp5.500.000 |

### Purchase

| Fitur | Harga |
|---|---:|
| Requisitions | Rp8.500.000 |
| Purchase Orders | Rp9.000.000 |
| Goods Receipt | Rp9.000.000 |
| Supplier Invoices | Rp10.500.000 |
| Supplier Invoices DP | Rp8.500.000 |
| Returns | Rp8.500.000 |
| Payments | Rp7.500.000 |
| Payable Recap | Rp5.500.000 |

### Stock

| Fitur | Harga |
|---|---:|
| Inventory | Rp7.500.000 |
| Stock Movement | Rp9.000.000 |
| Stock Opname | Rp12.500.000 |

### Finance

| Fitur | Harga |
|---|---:|
| Accounting bundle | Rp15.000.000 |
| - Chart of Accounts | Included in Accounting bundle |
| - Journal | Included in Accounting bundle |
| - Financial Closing | Included in Accounting bundle |
| Banking & Payments bundle | Rp12.000.000 |
| - Bank Accounts | Included in Banking & Payments bundle |
| - Payments | Included in Banking & Payments bundle |
| - Cash Bank Journal | Included in Banking & Payments bundle |
| Receivables & Payables bundle | Rp9.000.000 |
| - Non-Trade Payables | Included in Receivables & Payables bundle |
| - Tax Invoices | Included in Receivables & Payables bundle |
| - Aging Reports | Included in Receivables & Payables bundle |
| Budgeting & Cost bundle | Rp10.000.000 |
| - Budget | Included in Budgeting & Cost bundle |
| - Salary | Included in Budgeting & Cost bundle |
| - Up Country Cost | Included in Budgeting & Cost bundle |
| Asset Management bundle | Rp15.000.000 |
| - Assets | Included in Asset Management bundle |
| - Asset Categories | Included in Asset Management bundle |
| - Asset Locations | Included in Asset Management bundle |
| - Asset Budgets | Included in Asset Management bundle |
| Financial Statements bundle | Rp15.000.000 |
| - General Ledger | Included in Financial Statements bundle |
| - Balance Sheet | Included in Financial Statements bundle |
| - Profit & Loss | Included in Financial Statements bundle |

### HRD

| Fitur | Harga |
|---|---:|
| Attendance | Rp15.000.000 |
| Leave Requests | Rp18.000.000 |
| Evaluation | Rp12.500.000 |
| Recruitment | Rp15.000.000 |
| Work Schedule | Rp12.500.000 |
| Holidays | Rp5.000.000 |

### CRM

| Fitur | Harga |
|---|---:|
| Leads | Rp9.000.000 |
| Pipeline | Rp11.500.000 |
| Tasks | Rp7.500.000 |
| Visit Reports | Rp10.000.000 |
| Area Mapping | Rp8.500.000 |
| Sales Targets | Rp8.500.000 |
| CRM Settings | Rp12.500.000 |

### Reports

| Fitur | Harga |
|---|---:|
| Sales Overview | Rp6.500.000 |
| Top Product | Rp6.500.000 |
| Geo Performance | Rp8.500.000 |
| Customer Research | Rp8.500.000 |
| Supplier Research | Rp8.500.000 |

### AI Assistant

| Fitur | Harga |
|---|---:|
| Chatbot | Rp25.000.000 |
| Settings | Rp4.500.000 |

## Paket Full vs Add-On

### Kalau klien ambil Full Standard
- Semua menu standar sudah included
- Harga custom tambahan tidak termasuk
- Integrasi pihak ketiga tetap dihitung terpisah
- Migrasi data kompleks tetap dihitung terpisah

### Kalau klien ambil menu satuan
- Gunakan harga per fitur di atas
- Kalau ambil lebih dari 3 fitur dalam satu cluster, gunakan bundle pricing internal
- Bundling lebih cocok untuk closing cepat karena totalnya lebih efisien daripada beli satuan

## Aturan Komersial Singkat

- 1 paket = 1 company utama
- Penambahan company atau branch dihitung terpisah
- Training dasar termasuk dalam paket setup
- Support setelah go-live mengikuti level kontrak
- Custom request selalu dibuat sebagai add-on baru, bukan dicampur ke scope standar

## Cara Pakai Dokumen Ini

- Jika klien tanya harga satu fitur, buka tabel menu per fitur.
- Jika klien tanya harga awal yang paling murah, tawarkan Starter / Market Entry.
- Jika klien butuh semua menu standar tanpa custom, tawarkan Full Standard.
- Jika klien wajib on-premise, gunakan Full On-Premise.
