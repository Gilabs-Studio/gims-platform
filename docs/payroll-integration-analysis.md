# Analisis & Rencana Integrasi Modul Payroll GIMS HRIS

Dokumen ini berisi pemetaan dan rekomendasi implementasi **Modul Payroll** pada sistem GIMS HRIS berdasarkan modul HRD dan Finance yang sudah ada (Work Schedule, Holidays, Attendance, Leave Requests, Overtime, Evaluation, Recruitment, dan Core Finance).

---

## 1. Ringkasan Ketersediaan Modul Pendukung

| Modul Eksisting HRD / Finance | Status di GIMS | Kontribusi & Integrasi ke Payroll |
| :--- | :---: | :--- |
| **Employee & Contract** | ✅ Ready | Data PTKP (`TK/0` s/d `K/I/3`), NIK, NPWP, BPJS, Bank Account, Tgl Masuk/Resign |
| **Salary Structure** | ✅ Ready | Gaji Pokok (`basic_salary`) & Komponen Gaji per Karyawan |
| **Work Schedule & Holidays** | ✅ Ready | Total Hari Kerja Efektif & Pembagi Prorata / Tarif Lembur Libur |
| **Attendance** | ✅ Ready | Total Kehadiran, Jam Terlambat, Pulang Cepat, & Potongan Mangkir |
| **Leave Requests** | ✅ Ready | Cuti Berbayar (*Paid*) vs Cuti Di Luar Tanggungan (*Unpaid Leave*) |
| **Overtime Requests** | ✅ Ready | Kalkulasi Jam Lembur (*Approved*) & Nominal Upah Lembur |
| **Evaluations** | ✅ Ready | Skor KPI / Performa untuk acuan Bonus & Insentif |
| **Recruitment** | ✅ Ready | Gaji awal karyawan baru dari proses *Offering Letter* |
| **Finance (COA & Journal)** | ✅ Ready | Post Jurnal Otomatis (Beban Gaji vs Utang/Kas) saat Payroll Disetujui |

---

## 2. Fitur Payroll yang SIAP Diimplementasikan & Diintegrasikan

Berikut adalah fitur payroll inti yang **dapat langsung dibangun dan diintegrasikan** secara penuh dengan modul yang ada:

### 1. Perhitungan Gaji Dasar & Prorata Otomatis
*   **Gaji Pokok & Tunjangan Tetap:** Mengambil data dari `SalaryStructure` karyawan.
*   **Prorata Gaji:** Otomatis dihitung berdasarkan tanggal *Join/Resign* di `EmployeeContract` dikali rasio hari kerja aktif dari `WorkSchedule` & `Holidays`.

### 2. Kalkulasi Komponen Variabel Inti
*   **Upah Lembur Otomatis:** Mengambil data `OvertimeRequest` dengan status `approved`, dihitung otomatis mengikuti standar Depnaker/Kemnaker berdasarkan jam kerja reguler & hari libur (`Holidays`).
*   **Potongan Mangkir & Unpaid Leave:** Memotong gaji harian berdasarkan catatan `AttendanceRecord` (status `absent`) dan `LeaveRequest` berkategori *Unpaid Leave*.
*   **Tunjangan Kehadiran / Uang Makan:** Dihitung dari akumulasi kehadiran sah (`present` / `late`) pada `AttendanceRecord`.
*   **Bonus Evaluasi / Performance:** Mengambil indikator nilai akhir dari modul `EmployeeEvaluation`.

### 3. Perpajakan (PPh 21 TER) & BPJS Indonesia
*   **PPh 21 TER (Tarif Efektif Rata-rata):** Kalkulasi otomatis menggunakan tabel TER (Kategori A, B, C) sesuai variabel `PTKPStatus` di profil `Employee`.
*   **BPJS Kesehatan & Ketenagakerjaan:** 
    *   BPJS Kesehatan: 1% potongan karyawan, 4% kontribusi perusahaan (dengan batas *upper cap*).
    *   BPJS Ketenagakerjaan: JHT (2%+3.7%), JP (1%+2%), JKK, dan JKM.

### 4. Workflow Approval & Kunci Periode (Payroll Lock)
*   **Multi-Step Approval:** Alur status: `Draft` (HR Input) $\rightarrow$ `Under Review` (Finance) $\rightarrow$ `Approved` (Management/Owner).
*   **Payroll Period Lock:** Ketika payroll disetujui, data `Attendance`, `Overtime`, dan `Leave` pada periode tersebut dikunci (*locked*) agar tidak bisa diubah retroaktif.
*   **Audit Trail:** Mencatat log setiap perubahan nominal, pembuat draft, dan pihak yang melakukan approval.

### 5. Slip Gaji Digital & Riwayat
*   **Portal Karyawan:** Karyawan dapat melihat dan mengunduh Slip Gaji (PDF) dari akun masing-masing.
*   **Riwayat Payroll:** Histori penggajian bulan-bulan sebelumnya tersimpan rapi per karyawan.

### 6. Integrasi Keuangan & Export Bank Transfer
*   **Post Jurnal Otomatis ke Finance:** Membuat transaksi `JournalEntry` otomatis di modul Finance (Beban Gaji, Beban BPJS, Utang PPh 21, Utang Gaji).
*   **Export Payroll Batch (CSV/TXT):** Format file transaksi massal untuk di-upload ke sistem e-Banking (BCA KlikBCC Bisnis, Mandiri MCM, BRI, BNI).

---

## 3. Fitur Payroll yang SEBAIKNYA DITUNDA (Belum Saatnya Diimplementasikan)

Fitur-fitur berikut **direkomendasikan untuk ditunda** karena belum memiliki modul pendukung di GIMS atau membutuhkan integrasi eksternal yang kompleks:

| Fitur yang Ditunda | Alasan & Kendala Arsitektur | Alternatif Sementara |
| :--- | :--- | :--- |
| **1. Potongan Kasbon / Pinjaman Karyawan (*Employee Loan*)** | Belum ada modul pendukung *Kasbon / Employee Loan* untuk mencatat plafon, sisa pinjaman, dan skema cicilan bulanan. | Input manual nominal potongan kasbon di komponen tunjangan/potongan kustom saat buat draft payroll. |
| **2. Komisi Penjualan Otomatis (*Sales Commission Integration*)** | Modul Sales/POS GIMS belum memiliki rule engine untuk kalkulasi persen komisi per salesman. | Input manual komisi pada komponen tunjangan variabel bulanan. |
| **3. Integrasi Bank Host-to-Host (H2H Direct Disbursement API)** | Membutuhkan kredensial API Bank/Payment Gateway corporate, biaya lisensi, dan persetujuan legal per bank. | Gunakan fitur **Export Batch File CSV/TXT** standar bank yang bisa langsung di-upload ke internet banking. |
| **4. Skema Pajak Ekspatriat / WNA (PPh 26 & Tax Treaty)** | Membutuhkan penanganan sertifikat domisili (DGT), *tax treaty* antar negara, dan struktur data WNA yang belum ada di `Employee`. | Difokuskan dulu untuk Tenaga Kerja Indonesia (PPh 21 TER). |
| **5. E-Bupot & Integrasi DJP Online (Bukti Potong 1721-A1/A2)** | Format e-Bupot DJP membutuhkan pendaftaran sertifikat elektronik perusahaan dan skema ekspor XML/JSON spesifik DJP. | Rekapitulasi bulanan PPh 21 diexport dalam format Excel internal terlebih dahulu. |
| **6. Potongan Koperasi & Asuransi Swasta Pihak Ke-3** | Belum ada pendaftaran entitas Koperasi / Asuransi Rekanan di Master Data GIMS. | Gunakan kolom potongan kustom *General Deductions*. |

---

## 4. Rekomendasi Tahapan Pelaksanaan (Roadmap)

### 📌 Fase 1 (MVP Payroll Core - Fokus Saat Ini)
1. Master Data Gaji (`SalaryStructure` & Komponen Tunjangan/Potongan).
2. Agregasi otomatis dari `Attendance`, `Overtime` (Depnaker), dan `LeaveRequest`.
3. Perhitungan PPh 21 TER & BPJS.
4. Payroll Processing, Approval Workflow, Audit Trail, & Locking Period.
5. Digital Payslip (PDF/Portal) & Export File Transfer Bank (BCA/Mandiri CSV).
6. Auto-Journal Entry ke modul Finance.

### 📌 Fase 2 (Pengembangan Lanjutan - Masa Depan)
1. Modul Kasbon Karyawan (*Employee Loan & Advance*) $\rightarrow$ Integrasi ke Potongan Payroll.
2. Modul Reimbursement Khusus $\rightarrow$ Integrasi ke Pembayaran Payroll.
3. Integrasi Komisi Sales otomatis dari Modul Sales/POS.
4. Export format e-Bupot PPh 21 untuk SPT Tahunan.

---
*Dokumen ini disusun sebagai panduan teknis dan analisis scope fitur Payroll GIMS.*
