# Working Plan: Recreate Finance Module (BE & FE)

Berdasarkan dokumentasi logic Modul Finance (18 halaman) serta aturan standar backend (`docs/api-standart`) dan frontend (`.cursor/rules/standart.mdc`), berikut adalah rencana kerja (Working Plan) komprehensif untuk me-recreate Modul Finance. 

Sistem membutuhkan sinkronisasi yang ketat antara **"Clean Architecture"** berlapis-lapis di backend dan penerapan **"Next.js 16 App Router Server Components"** yang kaya sisi performa di frontend.

Karena dependensi modul berjalan dari hierarki terbawah (Master Data) naik menuju ke transaksional dan diakhiri dengan Reporting (Report), eksekusi akan dilakukan secara **Bottom-Up**.

---

## 🏁 Fase 1: Setup & Konvensi Arsitektur

### 1. Backend (Go - Clean Architecture)
- Menyiapkan/review **Model (GORM)** dari 18 scope Finance, melengkapi tipe enum, format presisi `float64/decimal`, dan foreign key sesuai dokumen (Cascade/Restrict rules).
- Menyesuaikan **API Routing** pada kerangka struktur API Standard `controllers -> usecases -> repositories`.
- Memastikan wrapper payload Return mengikuti **API Response Standards** (`success`, `data`, `meta`, `error`), serta mengintegrasikan Custom **API Error Codes**.

### 2. Frontend (Next.js 16 + Tailwind v4 + Zustand)
- Menginisiasi struktur folder fitur di `apps/web/src/features/finance` yang berisi: `types/`, `schemas/`, `stores/`, `hooks/`, `services/`, dan `components/`.
- Membangun konvensi `schema` menggunakan **Zod** yang sinkron dengan validasi Backend untuk setiap Input Form Finance.
- Menyiapkan UI wrapper animasi bawaan (`PageMotion`, `StaggerContainer`) dan pattern `loading.tsx` per router.

---

## 🏗️ Fase 2: Pengerjaan Tahap 1 — Master Data & Journal Core
*Fase ini meletakkan pondasi referensi akun akuntansi.*

### Milestone Backend:
1. [x] **Chart of Accounts (CoA):** Implementasi CRUD dengan logic hierarki parent-child dan filter account type.
2. [x] **Bank & Bank Account:** CRUD dasar dipadukan relasi akun `CASH_BANK` ke CoA.
3. [x] **Payment Terms:** Setup skema aturan hari tagihan.
4. [x] **Shared Utility - Journal Posting:** Melahirkan fungsi `PostJournal()` dan `PostOrUpdateJournal()` dengan proteksi transaksi (TX DB) dan validasi balance debit/kredit yang digunakan lintas use-case.

### Milestone Frontend:
1. Menyusun tipe data DTO untuk _Master Data_ pada `types/index.d.ts`.
2. Pembuatan halaman `master-data/finance/*`. UI didesain _Server Component_ untuk tabel utamanya, dan form diserahkan ke _Client Wrapper_ melalui perantara `useMutation` (TanStack Query).
3. Penerapan strict *null safety* (`obj?.name ?? "-"`) saat me-render tabel *Master Data*.

---

## ⚙️ Fase 3: Pengerjaan Tahap 2 — Transaksional Modul (Workflow)
*Fase ini membungkus perpindahan arus kas dan approval workflow.*

### Milestone Backend:
1. [x] **General & Manual Journals:** Membuat logic _Adjustment Journal_ (manual) dan view khusus untuk _Purchase, Sales, Valuation Journals_ (read-only dari transaksi modul sebelah).
2. [x] **Cash & Bank Transaction:** Implementasi Draft -> Confirmed, yang trigger fungsi `PostJournal()` jika disetujui.
3. [x] **Non-Trade Payables (NTP):** Auto-generate nomor referensi NTP, memodelingkan workflow `Draft -> Approved -> Paid`. Membangun skematik _Payment Allocation_ apabila dibayarkan ke berbagai CoA.
4. [x] **Base Salary & Up Country Cost:** Logika workflow HR & Finance (`Draft -> Active`). Untuk claim dinas, saat approval akan otomatis menyuntik *Journal Entry*.
5. [x] **Budgeting:** Implementasi budget limit dan query penarikan `Actual Amount` dari Journal Lines dengan status budget.

### Milestone Frontend:
1. Membangun halaman Transaksional yang kompleks dan form _wizard/steps_ (contoh form input berulang untuk `CashBankJournalLine` atau jurnal Debit-Kredit). Di-handle dengan React Hook Form (`useFieldArray`).
2. Membuat tampilan Dashboard Statistik (Cash in/out bulanan) menggunakan grafik-grafik dasar. Suspense Loading diaplikasikan spesifik pada chart area saja (Code Splitting lazy mode).
3. Menangani UX _Error Boundary_, ketika `PostJournal` menolak transaksi tidak _balance_, error code ditampilkan elegan pada Toast tanpa men-_crash_-kan client UI.

---

## 🏢 Fase 4: Pengerjaan Tahap 3 — Asset Management Center
*Fase asset manajemen ini memiliki 5 subsistem yang menjalin kaitan erat satu sama lain secara internal.*

### Pengerjaan Full Stack Secara Bersamaan:
1. [x] Eksekusi pembuatan **Asset Category** dan **Asset Location** (CRUD dasar).
2. [x] **Asset List:** Generator code `AST-YYYY-XXX` dan integrasi UI form mendata status _Acquisition Cost_ vs _Accumulated Depreciation_.
3. [x] **Asset Transaction & Depreciation:** Modul _Atomic Approval_. Saat user klik "Approve" pada FE, BE memanggil function yang serempak meng-_update_ entitas Asset, melempar _Journal Entry_, dan mengikat id Journal-nya ke histori penyusutan.
4. **Optimasi FE:** Menggunakan *Radix UI Tabs (`TabsContent`)* sesuai `standart.mdc` dengan implementasi `lazy()` agar semua UI tab kelima aset tersebut hanya dipanggil jika spesifik ditekan user (code-splitting efisien).

---

## 📊 Fase 5: Pengerjaan Tahap 4 — Financial Reporting (The Big Three)
*Membuat laporan final dengan komputasi agregasi berat.*

### Perakitan Laporan (Backend):
1. [x] **General Ledger:** Mengolah agregasi array `JournalLines` untuk spesifik target akun dengan filter periode tanggal (Start-End).
2. [x] **Balance Sheet (Neraca):** Mengalkulasi nilai CoA dengan tipe Assets melawan Liabilities + Equity.
3. [x] **Profit & Loss (Laba Rugi):** Menarik seluruh saldo masuk dari Revenue digabungkan dengan Expense/COGS untuk menghasilkan persentase *Net Profit*.
4. [x] Pembuatan fitur *Export to Excel* pada usecase BE melalui stream untuk setiap laporan ini.

### Perakitan Laporan (Frontend):
1. Membangun halaman *Data-Heavy Table* dengan filter berlapis yang canggih (search, sort, custom date pickers).
2. Mengamankan eksekusi perhitungan angka yang dapat bermasalah atau `undefined` (contoh: format currency manual). Semuanya akan dililit validasi default `fallback ?? 0`. Menggunakan styling _cursor pointer_ memadai untuk setiap baris akun yang bisa di klik menukik ke detail.

---

## 🔒 Fase 6: Finalisasi & Audit Kesesuaian Standar
- Merevisi bila terdapat pelanggaran _Clean Code_, entah logic Business berada di dalam component UI, atau Handler API mengandung logic query SQL raw.
- Memeriksa fungsionalitas Skeleton/Spinners pada FE, serta optimasi Server Sidebar Caching Next.js.
- End-to-end (E2E) simulasi proses: (Contoh) Membuat akun _Base Salary_ → Membayarkan Kas Bank → Mengecek apakah nominal laba/rugi di _Neraca_ berubah sempurna secara waktu nyata (real-time).
