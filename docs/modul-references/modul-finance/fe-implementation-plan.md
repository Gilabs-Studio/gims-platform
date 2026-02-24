# Actionable Working Plan: Finance Module Frontend (FE) Implementation

Berdasarkan Backend (BE) yang sudah selesai dikerjakan, berikut adalah rencana kerja mendetail untuk implementasi Frontend (FE) menggunakan **Next.js 16 (App Router)**, **Tailwind v4**, dan **Zustand/TanStack Query**.

---

## 🛠️ Tahap 1: Fondasi & Shared Utilities (Day 1)
*Membangun infrastruktur dasar yang akan digunakan oleh semua sub-modul.*

1. **Shared Types & Schemas**:
   - Mendefinisikan interface TypeScript di `src/features/finance/[module]/types` untuk setiap entitas (CoA, Journal, Asset, dll).
   - Membuat **Zod Schemas** untuk validasi form di `src/features/finance/[module]/schemas`.

2. **API Services**:
   - Mengimplementasikan service class di `src/features/finance/[module]/services` menggunakan `axios` instance yang sudah ada.
   - Setup **TanStack Query (useQuery/useMutation)** hooks untuk abstraction layer data fetching.

3. **Global Layout & Navigation**:
   - Review sidebar dan breadcrumbs untuk memastikan 18 page finance terdaftar dengan benar.

---

## 🏗️ Tahap 2: Master Data Finance (Day 1-2)
*Implementasi tampilan referensi dasar.*

1. **Chart of Accounts (CoA)**:
   - **Table View**: Menampilkan hirarki akun (Parent-Child) menggunakan Tree-style table.
   - **Form View**: Modal/Sheet untuk create/update akun dengan validasi parent yang tepat.
   - **Filters**: Filter berdasarkan Account Type (Asset, Liability, dll).

2. **Bank & Bank Account**:
   - CRUD Management untuk daftar Bank dan Rekening Perusahaan.
   - Relasi Dropdown CoA (hanya menampilkan akun tipe CASH/BANK).

3. **Payment Terms**:
   - CRUD sederhana untuk pengaturan termin pembayaran (Net 30, COD, dll).

---

## 💸 Tahap 3: Journal & Core Transactions (Day 2-3)
*Implementasi inti dari pencatatan keuangan.*

1. **Journal Entries (The Hub)**:
   - **List View**: Tabel komprehensif yang menampilkan semua transaksi (Reference Type, Date, Description).
   - **Detail View**: Tampilan popup untuk melihat Journal Lines (Debit/Credit balance).
   - **Search & Advanced Filters**: Filter berdasarkan Reference Type, Date Range, dan search description.

2. **Adjustment Journal (Manual Entries)**:
   - Form pembuatan jurnal manual dengan **Double-Entry validation** (total debit harus sama dengan total kredit).
   - Fitur "Add Line" dinamis untuk banyak akun dalam satu jurnal.

3. **Cash & Bank Transaction**:
   - Workflow Form: Pilih Akun Utama (Kas/Bank) -> Tambah Lines (Akun Lawan).
   - Integration: Tombol "Confirm/Approve" yang memicu posting jurnal ke BE.

---

## 📦 Tahap 4: Operational & specialized Modules (Day 3-4)
*Modul transaksional dengan workflow approval.*

1. **Non-Trade Payables (NTP)**:
   - Management List dengan status badge (Draft, Approved, Paid).
   - **Approval UI**: Tombol approve untuk manajer.
   - **Payment UI**: Modal untuk input tanggal bayar dan pilih bank saat membayar NTP.

2. **Salary & Up Country Cost**:
   - Form input biaya dinas dan struktur gaji.
   - Workflow approval yang memicu integrasi jurnal otomatis.

3. **Budgeting**:
   - Visualisasi: Progress bar untuk "Actual vs Planned" budget.
   - Warning UI: Indikator jika pengeluaran melebihi budget.

---

## 🏢 Tahap 5: Asset Management Center (Day 4)
*Pengelolaan aset tetap dan penyusutan.*

1. **Asset List**:
   - Detail View: Tabs untuk "Info Dasar", "Riwayat Lokasi", dan "Riwayat Penyusutan".
2. **Asset Operations**:
   - Tombol "Depreciate", "Transfer", "Revalue", dan "Adjust" dengan modal input masing-masing.
   - Tracking status transaksi asset (Draft -> Approved).

---

## 📊 Tahap 6: Financial Reports (The Grand Finale) (Day 5)
*Laporan premium untuk manajemen.*

1. **General Ledger (GL)**:
   - Expandable rows per akun untuk melihat riwayat transaksi detail.
2. **Balance Sheet & Profit & Loss**:
   - Tampilan laporan vertikal yang rapi.
   - **Real-time Drill-down**: Klik nama akun untuk langsung lari ke General Ledger akun tersebut.
3. **Export System**:
   - Tombol "Export to Excel" yang memicu stream dari BE.

---

## 💎 Design Consistency (Critical)
- Menggunakan **Radix UI / Shadcn** components untuk konsistensi.
- Implementasi **Skeleton Loading** di setiap transisi data-heavy.
- Animasi mikro menggunakan **Framer Motion** untuk `presence` dan `stagger` effect pada list.
- **Dark Mode Support** pada semua halaman Finance.
