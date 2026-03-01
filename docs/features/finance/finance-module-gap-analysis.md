# Finance Module — Gap Analysis & Professional Accounting Standards

> **Document Type**: Gap Analysis + Best Practice Reference
> **Created**: 2026-03-02
> **Module**: Finance (Distribution ERP)
> **Scope**: Semua menu Finance yang tampil di sidebar

---

## Daftar Isi

1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Penjelasan Setiap Menu Finance](#2-penjelasan-setiap-menu-finance)
3. [Business Flow End-to-End](#3-business-flow-end-to-end)
4. [Business Rules & Accounting Standards](#4-business-rules--accounting-standards)
5. [Relasi Antar Modul (Finance ↔ Sales ↔ Purchase ↔ Stock)](#5-relasi-antar-modul)
6. [Gap Analysis: Current vs Professional Standard](#6-gap-analysis-current-vs-professional-standard)
7. [Rekomendasi Prioritas Perbaikan](#7-rekomendasi-prioritas-perbaikan)

---

## 1. Ringkasan Eksekutif

Modul Finance saat ini mencakup **16 sub-modul** dengan ~100 file backend. Secara fungsional, core accounting (COA, Journal, Payment, Closing) sudah solid. Namun ada **29 gap** yang teridentifikasi — mulai dari permission mismatch kritis hingga fitur accounting profesional yang belum diimplementasi.

### Skor Kematangan Modul

| Area | Skor | Keterangan |
|------|------|------------|
| Chart of Accounts | ⭐⭐⭐⭐⭐ | Lengkap: CRUD + tree + type-aware |
| Journal Entry/Lines | ⭐⭐⭐⭐⭐ | Lengkap: balanced validation, posting, sub-ledger |
| Payments | ⭐⭐⭐⭐ | Baik: multi-allocation, auto-journal. Kurang: bank reconciliation |
| Financial Closing | ⭐⭐⭐⭐ | Baik: period lock + analysis. Kurang: reopen, year-end closing |
| Asset Management | ⭐⭐⭐⭐⭐ | Sangat lengkap: depreciation, dispose, revalue, transfer |
| Budget | ⭐⭐⭐⭐ | Baik: CRUD + sync actuals. Kurang: budget guard non-blocking |
| Cash Bank Journal | ⭐⭐⭐⭐ | Baik: cash in/out + auto-journal |
| Tax Invoices | ⭐⭐⭐ | Cukup: CRUD saja. Kurang: PPN/PPh calculation, e-Faktur |
| Salary | ⭐⭐ | Minimal: hanya basic salary. Kurang: komponen, payroll, PPh 21 |
| Financial Reports | ⭐⭐⭐⭐ | Baik: GL + BS + P&L + Excel export |

---

## 2. Penjelasan Setiap Menu Finance

### 2.1 Accounting

#### 2.1.1 Chart of Accounts (Bagan Akun / COA)

**Apa ini?**
Fondasi dari seluruh sistem accounting. COA adalah daftar lengkap semua akun keuangan perusahaan yang dikelompokkan berdasarkan jenis: Asset, Liability, Equity, Revenue, Expense.

**Standar Profesional (PSAK/IFRS):**
- Mengikuti penomoran standar Indonesia:
  - `1xxxx` = **Asset** (Harta) — kas, piutang, persediaan, aset tetap
  - `2xxxx` = **Liability** (Kewajiban) — hutang dagang, hutang bank
  - `3xxxx` = **Equity** (Modal) — modal disetor, laba ditahan
  - `4xxxx` = **Revenue** (Pendapatan) — penjualan, pendapatan jasa
  - `5xxxx` = **COGS** (Harga Pokok Penjualan)
  - `6xxxx` = **Expense** (Beban) — beban operasional, administrasi

**Business Rules:**
- Setiap akun harus memiliki kode unik
- Struktur hierarki (parent-child) untuk grouping
- Akun yang sudah digunakan di journal tidak boleh dihapus
- Tipe akun menentukan sisi normal: Asset/Expense = Debit Normal, Liability/Equity/Revenue = Credit Normal

**Status Implementasi:** ✅ Lengkap

---

#### 2.1.2 Journal Entries (Jurnal Umum)

**Apa ini?**
Catatan utama dari setiap transaksi keuangan. Setiap event bisnis (penjualan, pembelian, pembayaran) pada akhirnya harus tercatat sebagai journal entry dengan prinsip **double-entry bookkeeping**.

**Standar Profesional:**
- **Double-Entry**: Setiap transaksi harus memiliki minimal 2 baris (debit dan credit)
- **Balancing Rule**: $\sum\text{Debit} = \sum\text{Credit}$ (wajib seimbang)
- **Immutability**: Journal yang sudah "Posted" tidak boleh diubah. Koreksi dilakukan via **Reversing Entry** (jurnal balik)
- **Audit Trail**: Setiap journal harus memiliki tanggal, deskripsi, referensi dokumen sumber, dan pembuat

**Business Flow:**
```
Draft → Review → Post (irreversible)
                   ↓
            Koreksi? → Buat Reversing Entry baru
```

**Jenis Journal berdasarkan sumber (Reference Type):**
| Reference Type | Sumber | Contoh |
|---|---|---|
| `MANUAL` | Input manual akuntan | Jurnal penyesuaian, jurnal koreksi |
| `SO` | Sales module | Revenue recognition |
| `PO` / `GR` | Purchase module | Goods Receipt accrual |
| `PAYMENT` | Payment approval | Kas keluar/masuk |
| `ASSET_DEP` | Asset depreciation | Beban penyusutan bulanan |
| `CASH_BANK` | Cash Bank Journal posting | Transaksi kas/bank harian |
| `NTP` | Non-Trade Payable | Hutang non-dagang |
| `UP_COUNTRY` | Up Country Cost | Biaya perjalanan dinas |

**Status Implementasi:** ✅ Lengkap

---

#### 2.1.3 Journal Lines (Buku Besar / Sub-Ledger)

**Apa ini?**
Tampilan detail per-akun dari semua journal entry. Ini adalah **General Ledger (Buku Besar)** — menampilkan saldo berjalan (running balance) per akun COA.

**Fungsi Utama:**
- Melihat semua transaksi untuk akun tertentu (misal: semua transaksi di "Kas")
- Running balance yang dihitung sesuai sisi normal akun
- Filter berdasarkan: akun, tipe akun, tanggal, status, reference type
- Export ke CSV untuk audit

**Standar Profesional:**
- Opening balance dihitung dari semua transaksi sebelum periode filter
- Balance dihitung berdasarkan **account nature**:
  - Debit-normal (Asset, Expense): Balance = Debit - Credit
  - Credit-normal (Liability, Equity, Revenue): Balance = Credit - Debit

**Status Implementasi:** ✅ Lengkap

---

#### 2.1.4 Financial Closing (Tutup Buku)

**Apa ini?**
Proses mengunci periode akuntansi agar tidak ada perubahan data di periode yang sudah ditutup. Ini adalah **kontrol internal** yang kritis.

**Standar Profesional (SAK/PSAK):**
- Penutupan bulanan mengunci semua transaksi pada/sebelum tanggal tutup
- Urutan kronologis wajib (tidak bisa tutup Januari tanpa tutup Desember)
- **Year-End Closing**: Menutup akun pendapatan dan beban ke Laba Ditahan (Retained Earnings)

**Business Rules Saat Ini:**
1. Draft → Approved (mengunci periode)
2. Semua journal entry, payment, dan cash bank journal memvalidasi terhadap closing guard
3. Tidak bisa membuat transaksi pada periode yang sudah ditutup
4. Analysis endpoint menampilkan saldo per-akun (opening vs closing)

**Status Implementasi:** ⭐⭐⭐⭐ — Kurang: Year-End Closing, Reopen Period

---

### 2.2 Banking & Payments

#### 2.2.1 Bank Accounts (Rekening Bank)

**Apa ini?**
Master data rekening bank perusahaan. Setiap rekening terhubung ke akun COA tipe Cash/Bank.

**Business Rules:**
- Setiap bank account harus di-mapping ke 1 akun COA
- Digunakan sebagai referensi di: Payment, Cash Bank Journal
- Snapshot data bank account disimpan di transaksi (untuk audit trail)

**Status Implementasi:** ✅ Lengkap (di modul Core)

---

#### 2.2.2 Payments (Pembayaran)

**Apa ini?**
Pencatatan pembayaran yang bersifat **finance-centric** — bukan sales payment atau purchase payment, tapi pembayaran umum yang dialokasikan ke berbagai akun.

**Business Flow:**
```
Buat Payment (Draft)
  → Tambah Allocation Lines (akun COA + amount)
  → Validasi: ΣAllocation = TotalAmount
  → Approve
     → Auto-create Journal Entry (Posted):
        Dr: Masing-masing COA allocation
        Cr: COA Bank Account
     → Budget Guard check (soft warning)
```

**Standar Profesional:**
- Setiap pembayaran harus memiliki referensi dokumen
- Alokasi harus detail per akun untuk audit trail
- Bukti pembayaran (payment voucher) harus diarsip

**Status Implementasi:** ⭐⭐⭐⭐ — Kurang: Bank Reconciliation

---

#### 2.2.3 Cash Bank Journal (Jurnal Kas/Bank)

**Apa ini?**
Pencatatan transaksi kas dan bank harian. Terpisah dari jurnal umum karena perlakuan khusus: uang masuk (cash_in) dan uang keluar (cash_out).

**Business Flow:**
```
Buat Cash Bank Journal (Draft)
  → Type: cash_in / cash_out
  → Tambah Line Items (COA + amount + referensi)
  → Post
     → Auto-create Journal Entry:
        cash_in:  Dr Bank COA, Cr Masing-masing line COA
        cash_out: Dr Masing-masing line COA, Cr Bank COA
```

**Standar Profesional:**
- Di perusahaan distribusi, jurnal kas/bank digunakan untuk:
  - Penerimaan dari customer (jika tidak via sales payment)
  - Pengeluaran operasional harian (pembelian ATK, bensin, dll)
  - Transfer antar bank
  - Setoran/penarikan kas
- Harus di-reconcile dengan mutasi bank (bank statement)

**Status Implementasi:** ⭐⭐⭐⭐ — Kurang: Bank Reconciliation, Transfer antar bank

---

### 2.3 Receivables & Payables

#### 2.3.1 Non-Trade Payables (Hutang Non-Dagang)

**Apa ini?**
Pencatatan hutang yang **bukan dari pembelian barang dagang** — misalnya hutang sewa, hutang jasa konsultan, hutang biaya utilitas.

**Business Flow:**
```
Buat NTP (Draft)
  → Auto-generate code: NTP-YYYYMM-NNNN
  → Approve
     → Auto-journal: Dr Expense COA, Cr "Hutang Non-Dagang" COA
  → Pay
     → Auto-journal: Dr "Hutang Non-Dagang" COA, Cr Bank COA
```

**⚠️ Gap Kritis: Hardcoded COA Lookup**
Saat ini implementasi mencari COA dengan `name ILIKE '%Hutang Non-Dagang%'`. Jika nama akun diubah, fitur ini akan **error**. Seharusnya menggunakan kode akun yang dikonfigurasi.

**Status Implementasi:** ⭐⭐⭐ — Kurang: COA lookup by code, partial payment

---

#### 2.3.2 Tax Invoices (Faktur Pajak)

**Apa ini?**
Pengelolaan faktur pajak sesuai regulasi perpajakan Indonesia. Terhubung ke Customer Invoice (PPN Keluaran) atau Supplier Invoice (PPN Masukan).

**Standar Profesional (DJP Indonesia):**
- Nomor seri faktur pajak harus sesuai format DJP
- PPN Keluaran: dari penjualan ke customer (11% atas DPP)
- PPN Masukan: dari pembelian dari supplier (bisa dikreditkan)
- Setiap bulan: PPN Keluaran - PPN Masukan = PPN yang harus disetor/lebih bayar
- Integrasi e-Faktur untuk pelaporan elektronik

**Business Rules:**
| Field | Keterangan |
|---|---|
| DPP (Dasar Pengenaan Pajak) | Harga sebelum pajak |
| VAT Amount | 11% × DPP (tarif PPN Indonesia) |
| Total | DPP + VAT |

**Status Implementasi:** ⭐⭐⭐ — Kurang: PPN calculation engine, e-Faktur export, SPT Masa PPN

---

#### 2.3.3 Aging Reports (Umur Piutang/Hutang)

**Apa ini?**
Laporan yang mengelompokkan piutang (AR) dan hutang (AP) berdasarkan **umur jatuh tempo**. Ini adalah alat utama untuk manajemen cash flow.

**Bucket Standar:**
| Bucket | Range | Risiko |
|---|---|---|
| Current | Belum jatuh tempo | ✅ Normal |
| 1-30 hari | Overdue ringan | ⚠️ Perlu follow-up |
| 31-60 hari | Overdue sedang | ⚠️ Perlu tindakan |
| 61-90 hari | Overdue berat | 🔴 Eskalasi |
| >90 hari | Bad Debt Risk | 🔴 Provisi piutang ragu |

**Standar Profesional:**
- PSAK 71 (IFRS 9): Perusahaan wajib membuat **cadangan kerugian piutang** (allowance for doubtful accounts) berdasarkan aging analysis
- Rumus provisi: Saldo per bucket × % estimasi kerugian

**Status Implementasi:** ⭐⭐⭐⭐ — Kurang: Allowance calculation, provisioning journal

---

### 2.4 Budgeting & Cost

#### 2.4.1 Budget (Anggaran)

**Apa ini?**
Perencanaan keuangan per periode dengan alokasi per akun COA. Digunakan untuk mengendalikan pengeluaran perusahaan.

**Business Flow:**
```
Buat Budget (Draft)
  → Tambah Budget Items (COA + amount per item)
  → Approve (immutable setelah ini)
  → Sync Actuals (tarik data realisasi dari journal lines)
  → Bandingkan: Budget vs Actual → Variance Analysis
```

**⚠️ Gap: Budget Guard Non-Blocking**
Saat ini `EnsureWithinBudget()` dipanggil saat approve payment, tapi errornya **dibuang** (`_ = EnsureWithinBudget(...)`). Artinya pengeluaran melebihi budget tetap bisa diproses tanpa warning.

**Standar Profesional:**
- Budget harus bisa dipecah per: divisi, departemen, bulan
- Variance analysis: `Actual - Budget = Favorable/Unfavorable`
- Threshold alert: notifikasi saat realisasi mendekati/melebihi budget (80%, 100%)

**Status Implementasi:** ⭐⭐⭐ — Kurang: budget enforcement, variance report, threshold alerts

---

#### 2.4.2 Salary (Gaji)

**Apa ini?**
Pengelolaan struktur gaji karyawan. Saat ini hanya menyimpan **basic salary** per karyawan.

**Gap Signifikan dengan Standar Profesional:**

Modul salary yang profesional untuk perusahaan distribusi seharusnya mencakup:

| Komponen | Status | Keterangan |
|---|---|---|
| Basic Salary | ✅ Ada | Gaji pokok |
| Tunjangan Transport | ❌ Belum | Tunjangan tetap |
| Tunjangan Makan | ❌ Belum | Tunjangan tetap |
| Tunjangan Jabatan | ❌ Belum | Berdasarkan posisi |
| BPJS Kesehatan | ❌ Belum | 4% perusahaan + 1% karyawan |
| BPJS Ketenagakerjaan (JHT) | ❌ Belum | 3.7% perusahaan + 2% karyawan |
| BPJS JP | ❌ Belum | 2% perusahaan + 1% karyawan |
| PPh 21 | ❌ Belum | Pajak penghasilan karyawan |
| Lembur (Overtime) | ❌ Belum | Integrasi dengan HRD Overtime |
| Potongan | ❌ Belum | Kasbon, pinjaman, BPJS |
| Payslip Generation | ❌ Belum | Slip gaji per karyawan |
| Auto-Journal on Payroll | ❌ Belum | Dr Beban Gaji, Cr Bank/Kas |

**Status Implementasi:** ⭐⭐ — Sangat minimal, hanya basic salary

---

#### 2.4.3 Up Country Cost (Biaya Perjalanan Dinas)

**Apa ini?**
Pencatatan biaya perjalanan dinas karyawan — termasuk transport, akomodasi, makan, BBM, dan biaya lainnya.

**Business Flow:**
```
Buat UCC (Draft)
  → Auto-generate code: UCC-YYYYMM-NNNN
  → Tambah Employees (siapa yang pergi)
  → Tambah Cost Items (transport, akomodasi, makan, BBM, lainnya)
  → Approve
     → Auto-journal: Dr "Perjalanan Dinas" COA, Cr "Hutang Biaya" COA
```

**⚠️ Gap: Hardcoded COA Lookup** — sama seperti NTP, mencari COA by name `'%Perjalanan Dinas%'` dan `'%Hutang Biaya%'`

**Status Implementasi:** ⭐⭐⭐ — Kurang: settlement/reimbursement flow, per diem calculation

---

### 2.5 Asset Management

#### 2.5.1 Assets (Aset Tetap)

**Apa ini?**
Pengelolaan aset tetap perusahaan (kendaraan, mesin, peralatan kantor, gedung). Termasuk siklus hidup penuh: akuisisi → penyusutan → pelepasan.

**Lifecycle:**
```
Acquire (Beli/Terima)
  → Monthly Depreciation (Penyusutan Bulanan)
     → Approve → Auto-journal: Dr Beban Penyusutan, Cr Akumulasi Penyusutan
  → Transfer (Pindah Lokasi)
  → Revalue (Penilaian Kembali)
  → Dispose (Pelepasan/Penjualan)
     → Auto-journal: Gain/Loss on Disposal
```

**Metode Penyusutan:**
- **Straight Line (Garis Lurus)**: $\frac{\text{Acquisition Cost} - \text{Salvage Value}}{\text{Useful Life}}$
- **Declining Balance (Saldo Menurun)**: $\text{Book Value} \times \text{Depreciation Rate}$

**Standar Profesional (PSAK 16 / IAS 16):**
- Aset tetap dapat diakui jika: (a) manfaat ekonomi mengalir ke perusahaan, (b) biaya perolehan dapat diukur
- Book Value = Acquisition Cost - Accumulated Depreciation
- Impairment test diperlukan jika ada indikasi penurunan nilai

**Status Implementasi:** ⭐⭐⭐⭐⭐ — Sangat lengkap

---

#### 2.5.2 Asset Categories (Kategori Aset)

**Apa ini?**
Klasifikasi aset berdasarkan jenis, menentukan metode dan masa penyusutan, serta mapping ke akun COA.

**Setiap kategori terhubung ke 3 akun COA:**
1. **Asset Account** — COA tempat mencatat nilai aset (misal: "Kendaraan" → 1510)
2. **Accumulated Depreciation Account** — COA akumulasi penyusutan (misal: "Akum. Penyusutan Kendaraan" → 1599)
3. **Depreciation Expense Account** — COA beban penyusutan (misal: "Beban Penyusutan Kendaraan" → 6110)

**Status Implementasi:** ✅ Lengkap

---

#### 2.5.3 Asset Locations (Lokasi Aset)

**Apa ini?**
Master data lokasi fisik aset — untuk tracking dimana aset berada (kantor pusat, gudang, cabang).

**Status Implementasi:** ✅ Lengkap

---

### 2.6 Financial Statements (Laporan Keuangan)

#### 2.6.1 General Ledger (Buku Besar)

**Apa ini?**
Laporan rinci per akun COA menampilkan semua transaksi dengan saldo berjalan. Ini adalah laporan dasar untuk audit.

**Standar Profesional:**
- Opening balance → transaksi detail → running balance → closing balance
- Filter per akun atau range akun
- Export untuk external auditor

**Status Implementasi:** ✅ Lengkap (API + UI + Excel export)

---

#### 2.6.2 Balance Sheet (Neraca)

**Apa ini?**
Laporan posisi keuangan pada suatu tanggal tertentu. Menampilkan: **Asset = Liability + Equity**

**Standar Profesional (PSAK 1 / IAS 1):**
```
ASSETS
  Current Assets (Aset Lancar)
    - Cash & Cash Equivalents
    - Trade Receivables
    - Inventory
  Non-Current Assets (Aset Tidak Lancar)
    - Fixed Assets (net of depreciation)
    - Intangible Assets

LIABILITIES
  Current Liabilities (Kewajiban Jangka Pendek)
    - Trade Payables
    - Tax Payable
  Non-Current Liabilities (Kewajiban Jangka Panjang)
    - Bank Loans

EQUITY (Modal)
  - Paid-in Capital
  - Retained Earnings
  - Current Year P&L (auto-calculated)
```

**Fundamental equation:** $\text{Assets} = \text{Liabilities} + \text{Equity}$

**Status Implementasi:** ✅ Lengkap (+ Excel export)

---

#### 2.6.3 Profit & Loss (Laba Rugi)

**Apa ini?**
Laporan kinerja keuangan selama periode tertentu. Menampilkan pendapatan, beban, dan laba/rugi bersih.

**Struktur Standar:**
```
Revenue (Pendapatan)
  - Sales Revenue
  - Other Income
(-) Cost of Goods Sold (HPP)
  = Gross Profit (Laba Kotor)
(-) Operating Expenses (Beban Operasional)
  - Salary Expense
  - Depreciation Expense
  - Office Expense
  - Delivery Expense
  = Operating Income (Laba Operasional)
(-) Tax Expense
  = Net Income (Laba Bersih)
```

**Status Implementasi:** ✅ Lengkap (+ Excel export)

---

## 3. Business Flow End-to-End

### 3.1 Sales → Finance Flow (Distribusi)

```
Customer Order (SO)
  → Delivery Order (DO)
     → Auto-journal: Dr COGS, Cr Inventory (pengakuan HPP)
  → Customer Invoice
     → Auto-journal: Dr Trade Receivables, Cr Sales Revenue, Cr VAT Output
  → Customer Payment (Sales module)
     → Auto-journal: Dr Bank/Cash, Cr Trade Receivables
     → Invoice status: UNPAID → PARTIAL → PAID
     → SO auto-CLOSED when fully paid
  → Tax Invoice (Finance module)
     → Link ke Customer Invoice untuk pelaporan PPN
```

### 3.2 Purchase → Finance Flow

```
Purchase Requisition (PR)
  → Purchase Order (PO)
  → Goods Receipt (GR)
     → Stock: tambah quantity + update HPP
     → Auto-journal: Dr Inventory (Asset), Cr GR/IR Clearing (Liability)
  → Supplier Invoice (SI)
     → Auto-journal: Dr GR/IR Clearing, Dr VAT Input, Cr Accounts Payable
  → Purchase Payment
     → Auto-journal: Dr Accounts Payable, Cr Bank/Cash
  → Tax Invoice (Finance module)
     → Link ke Supplier Invoice untuk kredit PPN Masukan
```

### 3.3 Monthly Closing Flow

```
Awal Bulan:
  ✅ Pastikan semua transaksi bulan lalu sudah dicatat
  ✅ Run Asset Depreciation → Approve
  ✅ Sync Budget Actuals
  ✅ Review Trial Balance (Dr = Cr)
  ✅ Create Adjustment Entries jika perlu
  ✅ Financial Closing → Approve (kunci periode)

Akhir Tahun (belum diimplementasi):
  ❌ Close Revenue & Expense accounts ke Retained Earnings
  ❌ Generate Annual Financial Statements
  ❌ Tax reporting (SPT Tahunan)
```

### 3.4 Cash Flow Daily Operations

```
Harian:
  Cash Bank Journal (cash_in/cash_out)
    → Penerimaan kas dari customer
    → Pengeluaran operasional (ATK, bensin, dll)
  
Mingguan/Bulanan:
  → Bank Reconciliation (❌ belum ada)
  → Review Aging Reports (AR & AP)
  → Follow-up overdue invoices
```

---

## 4. Business Rules & Accounting Standards

### 4.1 Core Accounting Rules (Sudah Diimplementasi)

| Rule | Standard | Implementation |
|------|----------|---------------|
| Double-entry bookkeeping | PSAK/IFRS | ✅ Setiap journal entry harus balance |
| Accrual basis | PSAK 1 | ✅ Pendapatan & beban diakui saat terjadi, bukan saat kas diterima/dibayar |
| Period closing guard | Internal Control | ✅ Mencegah entry di periode tertutup |
| Immutable posted journals | Audit Standard | ✅ Journal posted tidak bisa diubah |
| COA hierarchy | PSAK | ✅ Tree structure dengan parent-child |
| Asset depreciation | PSAK 16 / IAS 16 | ✅ Straight Line + Declining Balance |

### 4.2 Distribution-Specific Rules

| Rule | Keterangan | Status |
|------|------------|--------|
| **Inventory Valuation (HPP)** | Weighted Average method untuk hitung HPP | ✅ Di modul Stock |
| **Revenue Recognition** | Diakui saat delivery (DO confirmed) | ✅ Di modul Sales |
| **Matching Principle** | HPP diakui bersamaan dengan Revenue | ✅ Auto-journal saat DO |
| **GR/IR Clearing** | Bridge account antara goods receipt dan supplier invoice | ✅ |
| **3-Way Matching** | PO vs GR vs SI harus cocok sebelum bayar | ⚠️ Partial — belum ada auto-validation |
| **Tax Compliance** | PPN 11%, PPh calculation | ❌ Kurang |

---

## 5. Relasi Antar Modul

```
┌─────────────────────────────────────────────────────────────────┐
│                         FINANCE MODULE                          │
│                                                                 │
│  ┌──────────┐    ┌──────────────┐    ┌────────────────┐        │
│  │   COA    │◄───│ Journal Line │───►│ Journal Entry   │        │
│  │ (master) │    │ (sub-ledger) │    │ (general ledger)│        │
│  └──────────┘    └──────────────┘    └────────┬───────┘        │
│       ▲                                        │                │
│       │                                        │ auto-create    │
│  ┌────┴─────┐ ┌──────────┐ ┌──────────┐ ┌────┴───────┐       │
│  │ Budget   │ │ Payment  │ │ CashBank │ │ NTP/UCC    │       │
│  │ Item     │ │ Allocate │ │ Journal  │ │ Approve    │       │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘       │
│                                                                 │
│  ┌──────────┐ ┌────────────┐ ┌──────────┐                     │
│  │  Asset   │ │ Asset      │ │ Salary   │                     │
│  │ Depr.    │ │ Category   │ │ Structure│                     │
│  └──────────┘ └────────────┘ └──────────┘                     │
└───────────────────────┬─────────────────────────────────────────┘
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
   ┌────────────┐ ┌──────────┐ ┌──────────┐
   │   SALES    │ │ PURCHASE │ │   HRD    │
   │            │ │          │ │          │
   │ Invoice───►│ │◄──GR     │ │ Employee │
   │ Payment   │ │ SI       │ │ Overtime │
   │ DO (HPP)  │ │ Payment  │ │ Leave    │
   └─────┬──────┘ └─────┬────┘ └──────────┘
         │               │
         ▼               ▼
   ┌────────────────────────────┐
   │        STOCK MODULE        │
   │  Inventory qty + valuation │
   └────────────────────────────┘
```

### Cross-Module Relations Detail

| From | To | Relation | Keterangan |
|------|----|----------|------------|
| Sales → Finance | Customer Invoice → Tax Invoice | FK | Faktur pajak keluaran |
| Sales → Finance | Sales Payment → Journal Entry | Auto-create | Jurnal penerimaan kas |
| Sales → Finance | DO Confirm → Journal Entry | Auto-create | Dr COGS, Cr Inventory |
| Purchase → Finance | Supplier Invoice → Tax Invoice | FK | Faktur pajak masukan |
| Purchase → Finance | GR Confirm → Journal Entry | Auto-create | Dr Inventory, Cr GR/IR |
| Purchase → Finance | SI Posting → Journal Entry | Auto-create | Dr GR/IR, Cr AP |
| Purchase → Finance | Purchase Payment → Journal Entry | Auto-create | Dr AP, Cr Bank |
| HRD → Finance | Employee → Salary Structure | FK | Struktur gaji per karyawan |
| HRD → Finance | Employee → Up Country Cost | FK (via pivot) | Karyawan yang perjalanan dinas |
| Organization → Finance | Division → Budget | FK | Budget per divisi |
| Core → Finance | Bank Account → Payment, CashBank | FK | Rekening untuk pembayaran |

---

## 6. Gap Analysis: Current vs Professional Standard

### 🔴 CRITICAL (Harus Segera Diperbaiki)

#### GAP-001: Permission Code Mismatch pada Finance Reports

**Masalah:** Tiga layer menggunakan kode permission berbeda untuk fitur yang sama:

| Layer | General Ledger | Balance Sheet | Profit & Loss |
|-------|---------------|---------------|---------------|
| **Router** (middleware) | `finance_report.gl` | `finance_report.bs` | `finance_report.pl` |
| **Seeder** (permission) | `general_ledger_report.read` | `balance_sheet_report.read` | `profit_loss_report.read` |
| **Navigation** (frontend) | `general_ledger_report.read` ¹ | `balance_sheet_report.read` ¹ | `profit_loss_report.read` ¹ |

¹ Baru diperbaiki dari `finance_report.gl/bs/pl`

**Dampak:** 
- Router mengecek permission `finance_report.gl`, tapi seeder tidak pernah membuat permission dengan kode tersebut
- Artinya **semua user akan mendapat 403 Forbidden** saat mengakses finance reports API
- Menu muncul di sidebar (karena navigation config sekarang cocok dengan seeder), tapi klik akan error

**Solusi:** Sinkronkan permission code. Opsi terbaik — ubah **seeder** agar cocok dengan router:
```go
// Ganti di permission_seeder.go:
{"/finance/reports/general-ledger", "finance_report.gl", "View General Ledger", "VIEW", "finance_report"},
{"/finance/reports/balance-sheet", "finance_report.bs", "View Balance Sheet", "VIEW", "finance_report"},
{"/finance/reports/profit-loss", "finance_report.pl", "View Profit & Loss", "VIEW", "finance_report"},
// + export permissions
{"/finance/reports/general-ledger", "finance_report.export_gl", "Export General Ledger", "EXPORT", "finance_report"},
{"/finance/reports/balance-sheet", "finance_report.export_bs", "Export Balance Sheet", "EXPORT", "finance_report"},
{"/finance/reports/profit-loss", "finance_report.export_pl", "Export Profit & Loss", "EXPORT", "finance_report"},
```

Dan update **navigation-config.ts**:
```typescript
{ name: "General Ledger", permission: "finance_report.gl" },
{ name: "Balance Sheet", permission: "finance_report.bs" },
{ name: "Profit & Loss", permission: "finance_report.pl" },
```

---

#### GAP-002: Hardcoded COA Lookup by Name (Fragile)

**Masalah:** Tiga fitur mencari COA berdasarkan nama menggunakan `ILIKE`:
- `NonTradePayable.Approve`: `name ILIKE '%Hutang Non-Dagang%'`
- `NonTradePayable.Pay`: `name ILIKE '%Hutang Non-Dagang%'`
- `UpCountryCost.Approve`: `name ILIKE '%Perjalanan Dinas%'` dan `name ILIKE '%Hutang Biaya%'`

**Dampak:** Jika user mengubah nama akun di COA, fitur NTP dan Up Country Cost akan **gagal total**.

**Solusi:** Gunakan **COA code** yang tetap, atau buat tabel konfigurasi `finance_settings`:
```go
// Contoh configurasi
type FinanceSetting struct {
    Key   string // "ntp_liability_coa_code"
    Value string // "21500"
}
```

---

#### GAP-003: Budget Guard Non-Blocking

**Masalah:** Di `payment_usecase.go`, budget check dipanggil tapi error dibuang:
```go
_ = EnsureWithinBudget(...)  // error silently ignored
```

**Dampak:** Pengeluaran yang melebihi budget tetap diproses tanpa blocking maupun warning.

**Solusi:** Minimal implementasi **soft warning** yang dicatat di response:
```json
{
  "success": true,
  "data": {...},
  "warnings": ["Budget exceeded by Rp 5.000.000 for account 6200"]
}
```

---

### 🟡 HIGH (Perlu Ditambahkan)

#### GAP-004: Tidak Ada Bank Reconciliation

**Masalah:** Tidak ada fitur untuk mencocokkan transaksi sistem dengan mutasi bank (bank statement).

**Mengapa Penting:** Bank reconciliation adalah **kontrol internal wajib** di setiap perusahaan. Tanpa ini:
- Tidak bisa mendeteksi transaksi yang belum tercatat
- Tidak bisa mendeteksi selisih kas
- Auditor akan menandai sebagai weakness

**Solusi:** Implementasi Bank Reconciliation module:
```
Upload Bank Statement (CSV/Excel)
  → Auto-match dengan transaksi di sistem
  → Manual match untuk yang tidak cocok
  → Buat jurnal penyesuaian untuk selisih
  → Generate Reconciliation Report
```

---

#### GAP-005: Year-End Closing Belum Ada

**Masalah:** Financial closing hanya mengunci periode (monthly). Tidak ada proses **year-end closing** yang menutup akun pendapatan/beban ke Retained Earnings.

**Standar Profesional:**
```
Year-End Closing Process:
1. Close all Revenue accounts → Cr Income Summary
2. Close all Expense accounts → Dr Income Summary
3. Close Income Summary → Dr/Cr Retained Earnings
4. Close Dividend (if any) → Dr Retained Earnings
```

**Dampak:** Saat awal tahun baru, akun pendapatan dan beban masih membawa saldo tahun lalu.

---

#### GAP-006: Salary Module Sangat Minimal

**Masalah:** Hanya menyimpan basic salary. Tidak ada:
- Komponen gaji (tunjangan, potongan)
- Payroll processing
- PPh 21 calculation
- BPJS calculation
- Payslip generation
- Auto-journal saat payroll

**Dampak:** Perusahaan tidak bisa menggunakan sistem untuk proses penggajian yang sebenarnya.

---

#### GAP-007: Tax Management Tidak Lengkap

**Masalah:** Tax Invoice hanya CRUD tanpa:
- PPN calculation engine (11% otomatis)
- SPT Masa PPN (monthly tax return)
- PPh 21 (employee income tax)
- PPh 23 (withholding tax for services)
- e-Faktur export format
- Tax reconciliation

---

#### GAP-008: Tidak Ada Form-Data Endpoint

**Masalah:** Sesuai konvensi project, setiap fitur dengan foreign key harus memiliki `GET /form-data` endpoint. **Tidak satupun** entitas finance memiliki ini.

**Entitas yang membutuhkan:**
| Entity | Dropdown yang dibutuhkan |
|--------|------------------------|
| Payment | Bank accounts + COA list |
| Cash Bank Journal | Bank accounts + COA list |
| Budget | COA list |
| Journal Entry | COA list |
| Non-Trade Payable | COA list |
| Asset | Categories + Locations |
| Asset Category | COA (3 akun) |
| Salary Structure | Employee list |
| Up Country Cost | Employee list |
| Tax Invoice | Customer/Supplier invoices |

---

### 🟢 MEDIUM (Nice to Have)

#### GAP-009: Tidak Ada Reversing Entry

**Masalah:** Tidak ada fitur untuk membuat jurnal pembalik otomatis dari journal yang sudah posted. Saat ini harus buat manual journal baru.

---

#### GAP-010: Tidak Ada Multi-Currency Support

**Masalah:** Snapshot field untuk currency ada di Payment model, tapi **tidak ada logic konversi mata uang**. Untuk perusahaan distribusi yang melakukan import/export, ini penting.

---

#### GAP-011: Tidak Ada Financial Closing Reopen

**Masalah:** Period yang sudah dihapprove tidak bisa dibuka kembali. Jika ada kesalahan, tidak ada cara untuk koreksi.

---

#### GAP-012: Repository Pattern Inconsistency

**Masalah:** Sebagian besar entitas finance melakukan CRUD langsung via `db.Transaction` di usecase, bukan melalui repository. Ini menyimpang dari design pattern project.

---

#### GAP-013: Tidak Ada Scope Filtering di Beberapa Repository

**Masalah:** `ApplyScopeFilter` diterapkan di JournalEntry, JournalLine, Payment, CashBankJournal — tapi **TIDAK** di Budget, FinancialClosing, TaxInvoice, NonTradePayable, Asset, SalaryStructure, UpCountryCost.

**Dampak:** User dengan scope terbatas (OWN/DIVISION) tetap bisa melihat semua data pada entitas yang tidak menerapkan scope filter.

---

#### GAP-014: Tidak Ada Unit Test

**Masalah:** Tidak ada file test (`.._test.go`) di seluruh modul finance (~100 file code tanpa test).

---

#### GAP-015: 3-Way Matching Belum Otomatis

**Masalah:** Purchase Order → Goods Receipt → Supplier Invoice harus cocok (quantity dan nominal) sebelum pembayaran diproses. Saat ini hanya ada integrasi tapi belum ada **automated matching validation**.

---

#### GAP-016: Cash Flow Statement Belum Ada

**Masalah:** Laporan arus kas (cash flow statement) belum diimplementasi. Ini adalah laporan keuangan wajib ke-3 (selain Neraca dan Laba Rugi) menurut PSAK 2 / IAS 7.

---

#### GAP-017: Allowance for Doubtful Accounts

**Masalah:** Aging report sudah ada tapi tidak ada perhitungan otomatis untuk **cadangan kerugian piutang** berdasarkan umur piutang (PSAK 71 / IFRS 9).

---

#### GAP-018: Down Payment (DP) Tracking di Finance

**Masalah:** DP dari Sales dan Purchase sudah ada di masing-masing modul, tapi belum ada consolidated view di Finance untuk tracking semua DP (uang muka diterima/dibayar).

---

#### GAP-019: Inter-Bank Transfer

**Masalah:** Cash Bank Journal tidak memiliki tipe khusus "transfer" untuk perpindahan dana antar bank. Saat ini harus dibuat 2 jurnal terpisah (cash_out dari bank A + cash_in ke bank B).

---

#### GAP-020: Audit Log untuk Finance

**Masalah:** Finance adalah modul paling sensitif — setiap perubahan data harus memiliki **audit log** yang detail (siapa, kapan, apa yang berubah, nilai sebelum dan sesudah).

---

## 7. Rekomendasi Prioritas Perbaikan

### Phase 1: Critical Fixes (Segera)
| # | Item | Effort | Impact |
|---|------|--------|--------|
| 1 | GAP-001: Fix permission mismatch finance reports | 1 jam | 🔴 Menu broken tanpa ini |
| 2 | GAP-002: Replace hardcoded COA name lookup | 2 jam | 🔴 NTP & UCC bisa gagal |
| 3 | GAP-003: Enable budget guard (min. soft warning) | 1 jam | 🔴 Budget control tidak berfungsi |
| 4 | GAP-008: Add form-data endpoints | 4 jam | 🟡 UX improvement |

### Phase 2: Accounting Compliance (1-2 Sprint)
| # | Item | Effort | Impact |
|---|------|--------|--------|
| 5 | GAP-005: Year-end closing | 3 hari | 🟡 Accounting standard |
| 6 | GAP-004: Bank reconciliation | 5 hari | 🟡 Internal control |
| 7 | GAP-009: Reversing entry | 1 hari | 🟡 Operational efficiency |
| 8 | GAP-016: Cash flow statement | 3 hari | 🟡 Required statement |
| 9 | GAP-011: Financial closing reopen | 1 hari | 🟡 Error correction |
| 10 | GAP-017: Allowance for doubtful accounts | 2 hari | 🟡 PSAK 71 compliance |

### Phase 3: Distribution ERP Enhancement (3-4 Sprint)
| # | Item | Effort | Impact |
|---|------|--------|--------|
| 11 | GAP-006: Full salary/payroll module | 10 hari | 🟡 HR-Finance integration |
| 12 | GAP-007: Tax management (PPN, PPh) | 10 hari | 🟡 Tax compliance |
| 13 | GAP-015: 3-way matching automation | 5 hari | 🟢 Process improvement |
| 14 | GAP-010: Multi-currency | 5 hari | 🟢 Import/Export support |
| 15 | GAP-019: Inter-bank transfer | 1 hari | 🟢 Operational |
| 16 | GAP-014: Unit tests | 5 hari | 🟢 Code quality |

---

## Lampiran: Daftar Lengkap Menu Finance

| # | Menu Path | Backend | Permission | Gap |
|---|-----------|---------|------------|-----|
| 1 | Accounting > Chart of Accounts | ✅ | `coa.read` | - |
| 2 | Accounting > Journal > Journal Entries | ✅ | `journal.read` | - |
| 3 | Accounting > Journal > Journal Lines | ✅ | `journal_line.read` | - |
| 4 | Accounting > Financial Closing | ✅ | `financial_closing.read` | GAP-005, GAP-011 |
| 5 | Banking > Bank Accounts | ✅ | `bank_account.read` | - |
| 6 | Banking > Payments | ✅ | `payment.read` | GAP-004 |
| 7 | Banking > Cash Bank Journal | ✅ | `cash_bank.read` | GAP-019 |
| 8 | Receivables > Non-Trade Payables | ✅ | `non_trade_payable.read` | GAP-002 |
| 9 | Receivables > Tax Invoices | ✅ | `tax_invoice.read` | GAP-007 |
| 10 | Receivables > Aging Reports | ✅ | `journal.read` | GAP-017 |
| 11 | Budgeting > Budget | ✅ | `budget.read` | GAP-003 |
| 12 | Budgeting > Salary | ✅ | `salary.read` | GAP-006 |
| 13 | Budgeting > Up Country Cost | ✅ | `up_country_cost.read` | GAP-002 |
| 14 | Asset Management > Assets | ✅ | `asset.read` | - |
| 15 | Asset Management > Asset Categories | ✅ | `asset_category.read` | - |
| 16 | Asset Management > Asset Locations | ✅ | `asset_location.read` | - |
| 17 | Statements > General Ledger | ✅ | `finance_report.gl` ² | GAP-001 |
| 18 | Statements > Balance Sheet | ✅ | `finance_report.bs` ² | GAP-001 |
| 19 | Statements > Profit & Loss | ✅ | `finance_report.pl` ² | GAP-001 |

² Permission mismatch antara router dan seeder — lihat GAP-001
