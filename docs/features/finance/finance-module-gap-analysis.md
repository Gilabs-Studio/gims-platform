# Finance Module — Gap Analysis & Professional Accounting Standards

> **Document Type**: Gap Analysis + Best Practice Reference
> **Created**: 2026-03-02
> **Last Updated**: 2026-03-02 (Sprint 1 — 8 gaps fixed)
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

Modul Finance saat ini mencakup **16 sub-modul** dengan ~100 file backend. Secara fungsional, core accounting (COA, Journal, Payment, Closing) sudah solid. Awalnya ada **29 gap** yang teridentifikasi — **8 gap sudah diselesaikan di Sprint 1** (GAP-001, 002, 003, 005, 008, 009, 011, 019), menyisakan **21 gap terbuka** untuk sprint berikutnya.

> ✅ **Sprint 1 Fixes (2026-03-02):** Permission mismatch, hardcoded COA lookup, budget guard blocking, year-end closing, reversing entry, financial closing reopen, inter-bank transfer, form-data endpoints (8 modul).

### Skor Kematangan Modul

| Area | Skor | Keterangan |
|------|------|------------|
| Chart of Accounts | ⭐⭐⭐⭐⭐ | Lengkap: CRUD + tree + type-aware |
| Journal Entry/Lines | ⭐⭐⭐⭐⭐ | Lengkap: balanced validation, posting, sub-ledger |
| Payments | ⭐⭐⭐⭐ | Baik: multi-allocation, auto-journal, form-data. Kurang: bank reconciliation |
| Financial Closing | ⭐⭐⭐⭐⭐ | Lengkap: period lock, reopen, year-end closing ke Retained Earnings |
| Asset Management | ⭐⭐⭐⭐⭐ | Sangat lengkap: depreciation, dispose, revalue, transfer, form-data |
| Budget | ⭐⭐⭐⭐⭐ | Lengkap: CRUD + sync actuals + budget guard blocking |
| Cash Bank Journal | ⭐⭐⭐⭐ | Baik: cash in/out/transfer + auto-journal + form-data. Kurang: reconciliation |
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
            Koreksi? → POST /:id/reverse (auto-creates reversed journal, auto-posted)
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

**Status Implementasi:** ✅ Lengkap — Year-End Closing + Reopen Period sudah diimplementasi

**Endpoint Baru (Sprint 1):**
- `POST /finance/financial-closings/year-end-close` — tutup buku tahunan (Revenue/Expense → Retained Earnings)
- `POST /finance/financial-closings/:id/reopen` — buka kembali periode (approved → draft)

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

**Endpoint Baru (Sprint 1):** `GET /finance/payments/form-data`

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
        cash_in:   Dr Bank COA, Cr Masing-masing line COA
        cash_out:  Dr Masing-masing line COA, Cr Bank COA
        transfer:  Cr Source Bank COA, Dr Destination COA(s)
```

**Standar Profesional:**
- Di perusahaan distribusi, jurnal kas/bank digunakan untuk:
  - Penerimaan dari customer (jika tidak via sales payment)
  - Pengeluaran operasional harian (pembelian ATK, bensin, dll)
  - Transfer antar bank ✅ (tipe `transfer` sudah diimplementasi)
  - Setoran/penarikan kas
- Harus di-reconcile dengan mutasi bank (bank statement)

**Status Implementasi:** ⭐⭐⭐⭐ — Kurang: Bank Reconciliation

**Endpoint Baru (Sprint 1):** `GET /finance/cash-bank/form-data`

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

**✅ Sprint 1 Fix:** COA lookup sekarang menggunakan `FindByCode("21200")` — tidak lagi bergantung pada nama akun yang bisa berubah.

**Status Implementasi:** ⭐⭐⭐⭐ — COA lookup by code sudah diperbaiki. Kurang: partial payment

**Endpoint Baru (Sprint 1):** `GET /finance/non-trade-payables/form-data`

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

**✅ Sprint 1 Fix:** `EnsureWithinBudget()` sekarang **blocking** — payment yang melebihi budget akan gagal dengan error deskriptif (`"payment would exceed approved budget"`). Error tidak lagi di-ignore.

**Standar Profesional:**
- Budget harus bisa dipecah per: divisi, departemen, bulan
- Variance analysis: `Actual - Budget = Favorable/Unfavorable`
- Threshold alert: notifikasi saat realisasi mendekati/melebihi budget (80%, 100%)

**Status Implementasi:** ⭐⭐⭐⭐ — Budget guard sudah blocking. Kurang: variance report, threshold alerts

**Endpoint Baru (Sprint 1):** `GET /finance/budget/form-data`

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

**✅ Sprint 1 Fix:** COA lookup sekarang menggunakan `FindByCode("62000")` untuk Travel Expense dan `FindByCode("21300")` untuk Accrued Expense — tidak lagi bergantung pada nama akun.

**Status Implementasi:** ⭐⭐⭐⭐ — COA lookup by code sudah diperbaiki. Kurang: settlement/reimbursement flow, per diem calculation

**Endpoint Baru (Sprint 1):** `GET /finance/up-country-costs/form-data`

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
  ✅ Reopen Period jika ada koreksi (POST /:id/reopen)

Akhir Tahun:
  ✅ POST /finance/financial-closings/year-end-close
     → Kalkulasi Revenue - Expense = Net Income
     → Buat journal entry: Dr Revenue, Cr Expense, Dr/Cr Retained Earnings
     → Buat FinancialClosing record untuk 31 Des (auto-approved)
  ❌ Generate Annual Financial Statements (belum)
  ❌ Tax reporting / SPT Tahunan (belum)
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

### ✅ FIXED in Sprint 1 (2026-03-02)

> Semua item berikut sudah diimplementasi dan build Go sudah diverifikasi clean.

#### ~~GAP-001~~: ✅ FIXED — Permission Code Mismatch pada Finance Reports

**Masalah sebelumnya:** Router menggunakan `finance_report.gl/bs/pl` tapi seeder menggunakan `general_ledger_report.read/balance_sheet_report.read/profit_loss_report.read` — semua user mendapat 403.

**Solusi yang diimplementasi:** Router dan navigation-config.ts disesuaikan untuk menggunakan permission code yang sama dengan seeder (`finance_report.gl`, `finance_report.bs`, `finance_report.pl` + export variants).

---

#### ~~GAP-002~~: ✅ FIXED — Hardcoded COA Lookup by Name

**Masalah sebelumnya:** `NonTradePayable` dan `UpCountryCost` mencari COA dengan `name ILIKE '%...'` — rapuh jika nama akun diubah.

**Solusi yang diimplementasi:** Dibuat file konstanta `finance_coa_codes.go` dengan kode akun tetap (`COACodeNonTradePayable="21200"`, `COACodeTravelExpense="62000"`, `COACodeAccruedExpense="21300"`). Semua lookup sekarang menggunakan `coaRepo.FindByCode(ctx, code)`. COA seed baru juga ditambahkan.

---

#### ~~GAP-003~~: ✅ FIXED — Budget Guard Non-Blocking

**Masalah sebelumnya:** `_ = EnsureWithinBudget(...)` — error dibuang, pengeluaran melebihi budget tetap lolos.

**Solusi yang diimplementasi:** Diganti dengan `if err := EnsureWithinBudget(...); err != nil { return fmt.Errorf("payment would exceed approved budget: %w", err) }` — sekarang **blocking** di payment approval.

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

---

#### ~~GAP-005~~: ✅ FIXED — Year-End Closing

**Masalah sebelumnya:** Financial closing hanya mengunci periode bulanan. Tidak ada year-end closing.

**Solusi yang diimplementasi:**
- Endpoint `POST /finance/financial-closings/year-end-close` — menerima `{"fiscal_year": 2025}`
- Menghitung total Revenue - Expense dari semua journal entries tahun tersebut
- Membuat closing journal entry: `Dr Revenue accounts, Cr Expense accounts, Dr/Cr Retained Earnings (COA 32000)`
- Membuat FinancialClosing record untuk 31 Desember (auto-approved)
- Seed COA baru: `31000 Paid-in Capital`, `32000 Retained Earnings`

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

---

#### ~~GAP-008~~: ✅ FIXED — Form-Data Endpoints

**Masalah sebelumnya:** Tidak ada `GET /form-data` endpoint di satupun entitas finance.

**Solusi yang diimplementasi:** `GetFormData` ditambahkan ke interface, usecase, handler, dan router untuk semua modul yang membutuhkan:

| Endpoint | Response |
|----------|----------|
| `GET /finance/payments/form-data` | COA list + bank accounts |
| `GET /finance/cash-bank/form-data` | COA list + bank accounts + type enums |
| `GET /finance/budget/form-data` | COA list |
| `GET /finance/journal-entries/form-data` | COA list |
| `GET /finance/non-trade-payables/form-data` | COA list |
| `GET /finance/assets/form-data` | Categories + locations |
| `GET /finance/asset-categories/form-data` | COA list + depreciation method enums |
| `GET /finance/up-country-costs/form-data` | Cost type enums |

Files baru: `form_data_dto.go`, `form_data.go` (usecases), `form_data_handlers.go`.

---

### 🟢 MEDIUM (Nice to Have)

#### ~~GAP-009~~: ✅ FIXED — Reversing Entry

**Masalah sebelumnya:** Tidak ada fitur untuk membuat jurnal pembalik dari journal yang sudah posted.

**Solusi yang diimplementasi:** Endpoint `POST /finance/journal-entries/:id/reverse`:
- Membuat journal entry baru dengan debit/credit dibalik
- Auto-posts journal baru
- `reference_type = "reversal"`, `reference_id` menunjuk ke journal asli
- Permission: `journal.reverse` (ditambahkan ke seeder)

---

#### GAP-010: Tidak Ada Multi-Currency Support

**Masalah:** Snapshot field untuk currency ada di Payment model, tapi **tidak ada logic konversi mata uang**. Untuk perusahaan distribusi yang melakukan import/export, ini penting.

---

#### ~~GAP-011~~: ✅ FIXED — Financial Closing Reopen

**Masalah sebelumnya:** Period yang sudah approved tidak bisa dibuka kembali.

**Solusi yang diimplementasi:** Endpoint `POST /finance/financial-closings/:id/reopen`:
- Mengubah status approved → draft
- Validasi: tidak bisa reopen jika ada periode yang lebih baru sudah di-close (menjaga urutan kronologis)
- Permission: `financial_closing.reopen` (ditambahkan ke seeder)

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

#### ~~GAP-019~~: ✅ FIXED — Inter-Bank Transfer

**Masalah sebelumnya:** Cash Bank Journal tidak punya tipe "transfer", perlu 2 jurnal terpisah.

**Solusi yang diimplementasi:**
- Konstanta `CashBankTypeTransfer = "transfer"` ditambahkan ke model
- Validasi type di Create/Update usecase diperluas menerima `transfer`
- Post method menangani transfer: `Cr Source Bank COA, Dr Destination COA(s)`
- Form-data endpoint mengembalikan type enums termasuk `transfer`

---

#### GAP-020: Audit Log untuk Finance

**Masalah:** Finance adalah modul paling sensitif — setiap perubahan data harus memiliki **audit log** yang detail (siapa, kapan, apa yang berubah, nilai sebelum dan sesudah).

---

## 7. Rekomendasi Prioritas Perbaikan

### ~~Phase 1: Critical Fixes~~ ✅ SELESAI (Sprint 1 — 2026-03-02)
| # | Item | Status |
|---|------|--------|
| 1 | GAP-001: Fix permission mismatch finance reports | ✅ Done |
| 2 | GAP-002: Replace hardcoded COA name lookup | ✅ Done |
| 3 | GAP-003: Enable budget guard (blocking) | ✅ Done |
| 4 | GAP-008: Add form-data endpoints (8 modul) | ✅ Done |
| 5 | GAP-005: Year-end closing | ✅ Done |
| 6 | GAP-009: Reversing entry | ✅ Done |
| 7 | GAP-011: Financial closing reopen | ✅ Done |
| 8 | GAP-019: Inter-bank transfer | ✅ Done |

### Phase 2: Accounting Compliance (Sprint 2)
| # | Item | Effort | Impact |
|---|------|--------|--------|
| 5 | GAP-004: Bank reconciliation | 5 hari | 🟡 Internal control |
| 6 | GAP-016: Cash flow statement | 3 hari | 🟡 Laporan keuangan wajib ke-3 |
| 7 | GAP-017: Allowance for doubtful accounts | 2 hari | 🟡 PSAK 71 compliance |

### Phase 3: Distribution ERP Enhancement (3-4 Sprint)
| # | Item | Effort | Impact |
|---|------|--------|--------|
| 11 | GAP-006: Full salary/payroll module | 10 hari | 🟡 HR-Finance integration |
| 12 | GAP-007: Tax management (PPN, PPh) | 10 hari | 🟡 Tax compliance |
| 13 | GAP-015: 3-way matching automation | 5 hari | 🟢 Process improvement |
| 14 | GAP-010: Multi-currency | 5 hari | 🟢 Import/Export support |
| 15 | ~~GAP-019: Inter-bank transfer~~ | ✅ Done | — |
| 16 | GAP-014: Unit tests | 5 hari | 🟢 Code quality |
| 17 | GAP-013: Scope filtering di semua repository | 3 hari | 🟢 Data security |
| 18 | GAP-020: Audit log untuk finance | 5 hari | 🟢 Compliance & forensics |

---

## Lampiran: Daftar Lengkap Menu Finance

| # | Menu Path | Backend | Permission | Gap |
|---|-----------|---------|------------|-----|
| 1 | Accounting > Chart of Accounts | ✅ | `coa.read` | - |
| 2 | Accounting > Journal > Journal Entries | ✅ | `journal.read` | - |
| 3 | Accounting > Journal > Journal Lines | ✅ | `journal_line.read` | - |
| 4 | Accounting > Financial Closing | ✅ | `financial_closing.read` | — *(GAP-005 ✅, GAP-011 ✅)* |
| 5 | Banking > Bank Accounts | ✅ | `bank_account.read` | - |
| 6 | Banking > Payments | ✅ | `payment.read` | GAP-004 |
| 7 | Banking > Cash Bank Journal | ✅ | `cash_bank.read` | — *(GAP-019 ✅)* |
| 8 | Receivables > Non-Trade Payables | ✅ | `non_trade_payable.read` | — *(GAP-002 ✅)* |
| 9 | Receivables > Tax Invoices | ✅ | `tax_invoice.read` | GAP-007 |
| 10 | Receivables > Aging Reports | ✅ | `journal.read` | GAP-017 |
| 11 | Budgeting > Budget | ✅ | `budget.read` | — *(GAP-003 ✅)* |
| 12 | Budgeting > Salary | ✅ | `salary.read` | GAP-006 |
| 13 | Budgeting > Up Country Cost | ✅ | `up_country_cost.read` | — *(GAP-002 ✅)* |
| 14 | Asset Management > Assets | ✅ | `asset.read` | - |
| 15 | Asset Management > Asset Categories | ✅ | `asset_category.read` | - |
| 16 | Asset Management > Asset Locations | ✅ | `asset_location.read` | - |
| 17 | Statements > General Ledger | ✅ | `finance_report.gl` | — *(GAP-001 ✅)* |
| 18 | Statements > Balance Sheet | ✅ | `finance_report.bs` | — *(GAP-001 ✅)* |
| 19 | Statements > Profit & Loss | ✅ | `finance_report.pl` | — *(GAP-001 ✅)* |

> ² Permission sudah diselaraskan di Sprint 1 — router dan navigation config kini menggunakan kode yang sama.
