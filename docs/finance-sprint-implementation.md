# Finance Module: Sprint Implementation Plan

Berdasarkan analisis *User Experience (UX) Journey* untuk modul **Finance**, berikut adalah rencana implementasi yang dibagi ke dalam 3 Sprint (Phase) mendalam yang berfokus pada 3 modul utama: **Budget**, **Salary**, dan **Up Country Cost**. Sesuai arahan, hanya terdapat tepat 3 Sprint.

---

## Sprint 1: Modul Budget

**Tujuan:**
Mengimplementasikan modul kontrol pengeluaran perusahaan (Budget) berdasarkan Department, COA, dan Period yang secara langsung te-record seiring berjalannya jurnal keuangan.

**Konsep UI/UX:**
- Menggunakan widget berbentuk **Card dengan Half-Circular Progress Bar** untuk memberikan visualisasi rasio penggunaan budget (*Budget vs Actual*) secara cepat dan elegan di sisi atas halaman utama.

**Ilustrasi UI (ASCII):**
```text
+-------------------------------------------------------------+
| BUDGET DASHBOARD 2026                                       |
+-------------------------------------------------------------+
| Filter: [ Year: 2026 ] [ Department: Sales ]     [+ Create] |
+-------------------------------------------------------------+
|                                                             |
|  +--------------------+      +--------------------+         |
|  |     Marketing      |      |      Travel        |         |
|  |       .---.        |      |       .---.        |         |
|  |     /       \      |      |     /       \      |         |
|  |    |  75%    |     |      |    |  10%    |     |         |
|  |    '---------'     |      |    '---------'     |         |
|  |  Rp 75M / Rp 100M  |      |   Rp 5M / Rp 50M   |         |
|  +--------------------+      +--------------------+         |
|                                                             |
+-------------------------------------------------------------+
| Account           | Period | Budget   | Used  | Remaining   |
+-------------------+--------+----------+-------+-------------+
| Marketing Expense | 2026   | 100 juta | 75 jt |   25 juta   |
| Travel Expense    | 2026   |  50 juta |  5 jt |   45 juta   |
+-------------------+--------+----------+-------+-------------+
```

**Task Utama (Sprint Backlog):**
1. Pembuatan Schema, Store, dan Services untuk Header Budget & Budget Lines.
2. Desain dan integrasi UI Card `Half-Circular Progress` di file overview (menggunakan `framer-motion` dan indikator warna dinamis).
3. Pembuatan halaman Budget Table dan form modal pembuatan Budget tahunan.
4. Integrasi validasi logic terhadap Payment/Journal (pengurangan `Budget available`).

---

## Sprint 2: Modul Salary

**Tujuan:**
Mengimplementasikan halaman penggajian (Payroll) yang berintegrasi langsung secara dinamis dengan data dari modul **Employee**. Modul ini mengambil base reference pattern dari komponen `base-salary`.

**Konsep UI/UX:**
- Menampilkan grafik **Overview** tren pengeluaran payroll di bagian atas dari tabel (referensi dari `base-salary-table-with-chart.tsx`).
- Menarik data (list item) langsung dari **Employee**.
- Tabel utama bersifat *Expandable* (tiap row karyawan memiliki tombol *dropdown*).
- Jika dropdown diekspansi: Membuka baris detail yang menunjukkan **History Salary** karyawan tersebut beserta grafik spesifik mini baris itu, dan menampilkan tombol aksi **"Add Specific"** (untuk *specific allowance/deduction*).

**Ilustrasi UI (ASCII):**
```text
+-------------------------------------------------------------+
| SALARY & PAYROLL DASHBOARD                            [Pay] |
+-------------------------------------------------------------+
| OVERVIEW CHART                                              |
|   /▔▔▔▔\        /▔▔\     (Total Salary Expense History)     |
|  /      \      /    \                                       |
| /        \____/      \                                      |
+-------------------------------------------------------------+
| Employee Name | Basic Salary | Net Salary | Status | Action |
+-------------------------------------------------------------+
| [v] John Doe  | Rp 10.000.000| Rp 9.500.000| Unpaid | [...]  |
|   +-----------------------------------------------------+   |
|   | Employee History Chart:  /\/\/\                     |   |
|   | Period      | Basic   | Allowance | Tax | Net     |   |
|   | Jan 2026    | 10 juta | 1 juta    | 5%  | 10.5jt  |   |
|   | Feb 2026    | 10 juta | 1 juta    | 5%  | 10.5jt  |   |
|   |                                                     |   |
|   |                         [+ Add Specific Component ] |   |
|   +-----------------------------------------------------+   |
+-------------------------------------------------------------+
| [>] Jane Smith| Rp  8.000.000| Rp 7.500.000| Paid   | [...]  |
+-------------------------------------------------------------+
```

**Task Utama (Sprint Backlog):**
1. Integrasi API Data Source modul HR (Employee & Attendance) dalam format API/Service di frontend.
2. Pembuatan Komponen Tabel Expandable menggunakan reusability table styles dari `base-salary-table.tsx`.
3. Integrasi Grafik Overview (top page) & Grafik History per baris (`salary-history-chart.tsx`).
4. Fitur pengisian Form "Add Specific" saat row ter-expand.
5. Pay Salary integration.

---

## Sprint 3: Modul Up Country Cost

**Tujuan:**
Membangun sistem *Expense Management* untuk *business travel* (Transport, Hotel, Uang Harian) dan integrasinya ke approval serta sistem *Reimbursement/Payment*.

**Konsep UI/UX:**
- Dashboad dengan "Overview Cards" di bagian atas (menginfokan Total Request, Pending Approval, dan Approved).
- Tabel utama yang solid dengan pencarian & filter (*Employees*, *Date*, *Destination*).
- *Dialog/Modal Form* yang ringkas untuk header perjalanan dan input multi-baris dinamis untuk *Expense Lines* termasuk tombol upload receipt di setiap baris pengeluaran.

**Ilustrasi UI (ASCII):**
```text
+-------------------------------------------------------------+
| UP COUNTRY COST (TRAVEL EXPENSES)                           |
+-------------------------------------------------------------+
|  +----------------+  +----------------+  +----------------+ |
|  | TOTAL REQUEST  |  | PENDING APPRV  |  | APPROVED / PD  | |
|  | Rp 45.000.000  |  | Rp 15.000.000  |  | Rp 30.000.000  | |
|  +----------------+  +----------------+  +----------------+ |
+-------------------------------------------------------------+
| Filter: [ Date ] [ Employee ] [ Status ]      [+ Add Cost ] |
+-------------------------------------------------------------+
| Employee    | Destination | Trip Date  | Amount    | Status |
+-------------+-------------+------------+-----------+--------+
| John Doe    | Jakarta     | 10-03-2026 | 2.500.000 | PENDNG |
| Jane Smith  | Bandung     | 12-03-2026 | 1.200.000 | APPRVD |
| Bob Johnson | Surabaya    | 15-03-2026 | 4.500.000 | REJECT |
+-------------+-------------+------------+-----------+--------+

[Detail View / Modal] -> Form Request:
+---------------------------------------------------------+
| Requestor: Jane Smith   Destination: Bandung            |
| ------------------------------------------------------- |
| Expense Type    | Amount    | Receipt                   |
| Transport       | 1.000.000 | [View File: taxi.jpg]     |
| Meal            |   200.000 | [View File: food.jpg]     |
| ------------------------------------------------------- |
| TOTAL           | 1.200.000     [Approve] [Reject]      |
+---------------------------------------------------------+
```

**Task Utama (Sprint Backlog):**
1. Pembuatan Halaman Index Up Country Cost beserta widget rekapitulasi data.
2. Pembuatan Header-Lines Form (seperti pada Quotation/PO) yang mensupport baris pengeluaran baru (*dynamic fields*).
3. Pembuatan Modal Detail & fungsi Approval untuk Manager di Action kolom table.
4. Integrasi Final ke Payment Engine (melalui *Dr Travel Expense*, *Cr Bank*).
