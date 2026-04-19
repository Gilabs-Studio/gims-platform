# GILABS Modular Pricing Strategy (On-Premise) - Target Total Rp1.200.000.000

Dokumen ini adalah draft strategi harga modular untuk model software house GILABS, dengan fokus:
- Paket bisa dipilih per modul (POS, ERP, CRM, HR)
- Tiap modul punya tier
- Dependency menu otomatis ikut agar fitur tidak "putus"
- Simulasi komersial disusun supaya total proyek on-premise bisa tepat di kisaran Rp1,2 M

> Basis menu dan dependency disusun dari struktur navigasi di [apps/web/src/lib/navigation-config.ts](../../apps/web/src/lib/navigation-config.ts).

## 1) Validasi POS Essential Rp149.000 / outlet / bulan

Jawaban singkat: **oke**, dan sudah masuk akal untuk entry package.

Agar alur transaksi tidak putus, POS Essential **wajib** membawa menu dependensi berikut.

## 2) Menu Matrix: POS Essential (Rp149k/outlet)

### 2.1 Modul utama yang didapat
- POS Terminal: `/pos/fb/terminal`
- Floor & Layout: `/pos/fb/floor-layout`
- Sales inti: `/sales/orders`, `/sales/invoices`, `/sales/payments`
- Purchase inti: `/purchase/purchase-orders`, `/purchase/supplier-invoices`, `/purchase/payments`
- Stock inti: `/stock/inventory`

### 2.2 Master data minimum (auto-include)

#### Organization
- Users: `/master-data/users`
- Employees: `/master-data/employees`
- Company: `/master-data/company`
- Outlets: `/master-data/outlet`
- Warehouses: `/master-data/warehouses`

#### Product
- Products: `/master-data/products`
- Categories: `/master-data/product-categories`
- Unit of Measure: `/master-data/uom`
- Packaging (opsional tapi direkomendasikan): `/master-data/packaging`

#### Customer & Supplier (untuk Sales/Purchase flow)
- Customers: `/master-data/customers`
- Customer Types: `/master-data/customer-types`
- Suppliers: `/master-data/suppliers`
- Supplier Types: `/master-data/supplier-types`

#### Payment references
- Payment Terms: `/master-data/payment-terms`
- Currencies: `/master-data/currencies`

### 2.3 Yang tidak termasuk di POS Essential
- Geographic: `/master-data/geographic`
- CRM module
- HR module
- Finance advanced (AR/AP aging, GL, trial balance, etc.)
- POS add-ons (feedback, loyalty)

## 3) Dependency Rules (Agar Modular tapi Tidak Putus)

Gunakan aturan bundling berikut saat menyusun quotation modular:

1. Jika aktifkan `Sales Orders`, wajib aktif:
- Customers
- Products
- Payment Terms
- Warehouses
- Outlets

2. Jika aktifkan `Customer Invoices`, wajib aktif:
- Sales Orders
- Currencies
- Payment Terms

3. Jika aktifkan `Purchase Orders`, wajib aktif:
- Suppliers
- Products
- Warehouses
- Payment Terms

4. Jika aktifkan `Supplier Invoices`, wajib aktif:
- Purchase Orders
- Currencies
- Payment Terms

5. Jika aktifkan `POS Terminal`, wajib aktif:
- Floor Layout
- Outlets
- Products
- Inventory
- Users/Employees

6. Jika aktifkan `Loyalty`, wajib aktif:
- POS Terminal
- Customers

7. Jika aktifkan `Feedback`, wajib aktif:
- POS Terminal
- Outlets

## 4) Tiering per Modul

## 4.1 POS Tiers (per outlet / bulan)

| Tier | Harga | Cocok untuk | Fitur |
|---|---:|---|---|
| POS Essential | Rp149.000 | Outlet tunggal / UMKM awal | POS Terminal, Floor Layout, Sales inti, Purchase inti, Inventory inti, master data minimum |
| POS Growth | Rp249.000 | Multi-outlet berkembang | Semua Essential + Feedback (responses/forms), Loyalty (programs/members), stock movement, basic dashboard outlet |
| POS Enterprise | Rp399.000 | Franchise skala besar | Semua Growth + role granularity, approval sederhana antar outlet, API access terbatas, audit trail prioritas |

## 4.2 ERP Tiers (per company / bulan)

| Tier | Harga | Fitur |
|---|---:|---|
| ERP Core | Rp2.500.000 | Sales + Purchase + Stock + master data inti untuk operasional end-to-end |
| ERP Pro | Rp5.900.000 | ERP Core + Finance Accounting dasar (COA, journal entries, closing) + reports menengah |
| ERP Enterprise | Rp11.900.000 | ERP Pro + finance reports lengkap, AR/AP lanjutan, governance & kontrol lebih dalam |

## 4.3 CRM Tiers (per user / bulan)

| Tier | Harga | Fitur |
|---|---:|---|
| CRM Basic | Rp79.000 | Leads, pipeline, tasks |
| CRM Growth | Rp149.000 | CRM Basic + visit reports, area mapping, sales target |
| CRM Enterprise | Rp249.000 | CRM Growth + full CRM settings (pipeline stages, lead sources, statuses, contact roles, activity types) |

## 4.4 HR Tiers (per employee aktif / bulan)

| Tier | Harga | Fitur |
|---|---:|---|
| HR Basic | Rp39.000 | Attendance, holidays, work schedule |
| HR Growth | Rp69.000 | HR Basic + leave requests + overtime |
| HR Enterprise | Rp99.000 | HR Growth + evaluation + recruitment + approval policy lanjutan |

## 5) Add-on Modular

| Add-on | Harga | Satuan |
|---|---:|---|
| Feedback module | Rp59.000 | per outlet / bulan |
| Loyalty module | Rp79.000 | per outlet / bulan |
| AI Assistant (chatbot + settings) | Rp3.500.000 | per company / bulan |
| Additional API pack | Rp2.000.000 | per company / bulan |
| Advanced reports pack | Rp2.500.000 | per company / bulan |

## 6) Strategi Harga On-Premise

Untuk klien on-premise, gunakan struktur komersial 4 komponen berikut.

## 6.1 Komponen biaya

| Komponen | Nilai |
|---|---:|
| One-time License On-Premise | Rp420.000.000 |
| Implementation & Rollout (discovery, konfigurasi, UAT, training, go-live) | Rp180.000.000 |
| Year-1 Support & Maintenance (SLA, patch, update minor) | Rp120.000.000 |
| Year-1 Subscription Modules (POS/ERP/CRM/HR) | Rp480.000.000 |
| **Total Year-1** | **Rp1.200.000.000** |

## 6.2 Contoh komposisi Year-1 Subscription Modules = Rp480.000.000

Contoh paket campuran (modular):
- POS Growth: 80 outlet x Rp249.000 x 12 = Rp239.040.000
- ERP Pro: 1 company x Rp5.900.000 x 12 = Rp70.800.000
- CRM Growth: 40 user x Rp149.000 x 12 = Rp71.520.000
- HR Growth: 120 employee x Rp69.000 x 12 = Rp99.360.000
- **Total subscription tahunan** = **Rp480.720.000** (dibulatkan komersial menjadi Rp480.000.000)

## 6.3 Formula scaling

Gunakan formula ini agar mudah simulasi:

`Total Tahunan = (POS tier x outlet x 12) + (ERP tier x company x 12) + (CRM tier x user x 12) + (HR tier x employee x 12) + add-ons`

## 7) Paket Rekomendasi Siap Jual

## 7.1 Paket A - POS First
- POS Essential sebagai pintu masuk
- Tambah Feedback/Loyalty per outlet saat sudah ada repeat customer
- Upgrade ke ERP Core saat transaksi antar modul sudah stabil

## 7.2 Paket B - Franchise Growth
- POS Growth / Enterprise untuk seluruh outlet
- ERP Pro di level HQ
- CRM Growth untuk tim sales area
- HR Growth untuk operasional cabang

## 7.3 Paket C - Enterprise On-Premise 1.2M
- Struktur komersial mengikuti tabel 6.1
- Tetap modular di subscription agar saat cabang bertambah, biaya naik proporsional, bukan re-implement total

## 8) Guardrail Komersial (Supaya Scope Aman)

1. Menu yang dipilih tidak boleh menghapus dependency wajib.
2. Quotation harus menampilkan dua bagian:
- Included menus
- Auto-included dependencies
3. Jika klien minta "menu A saja", lakukan validasi dependensi sebelum lock harga.
4. Semua custom di luar matriks tier diposisikan sebagai Change Request terpisah.

## 9) Rekomendasi Implementasi di Proposal

Format proposal 1 halaman:
- Bagian A: Tier yang dipilih per modul
- Bagian B: Daftar menu termasuk dependency auto-include
- Bagian C: Komponen on-premise (license, implementasi, support, subscription)
- Bagian D: Total komersial (target Rp1,2 M) + opsi upgrade 12-24 bulan

Dengan model ini, pricing tetap modular, fleksibel, dan logic antarmenu tetap utuh.