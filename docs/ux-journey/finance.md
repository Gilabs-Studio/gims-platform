
# 5. Budget

Budget digunakan untuk **kontrol pengeluaran perusahaan**.

Biasanya berdasarkan:

* Department
* COA
* Period

---

## Data Source

* COA
* Division
* Business Unit
* Expense Account

---

## Field

Header:

* Budget Name
* Fiscal Year
* Department

Lines:

* Account
* Planned Amount
* Period

---

## User Journey

### Membuat Budget Tahunan

1. Finance buka **Budget**
2. Klik **Create**
3. Pilih:

```
Year = 2026
Department = Sales
```

Tambah lines:

| Account           | Budget   |
| ----------------- | -------- |
| Marketing Expense | 100 juta |
| Travel Expense    | 50 juta  |

---

### Saat transaksi dibuat

Misalnya:

Cash Bank Journal:

```
Travel Expense = 5 juta
```

System cek:

```
Budget available = 50 juta
Used = 5 juta
Remaining = 45 juta
```

---

# 6. Salary

Modul ini untuk **pembayaran gaji karyawan**.

Biasanya terhubung dengan HR.

---

## Data Source

Dari HR:

* Employees
* Attendance
* Leave
* Overtime

Dari Finance:

* Bank Account
* COA

---

## Field

* Payroll Period
* Employee
* Basic Salary
* Allowance
* Deduction
* Net Salary

---

## User Journey

### Proses payroll

1. HR finalize attendance
2. Finance buka **Salary**
3. Generate payroll

System hitung:

```
Basic Salary
+ Allowance
+ Overtime
- Tax
- BPJS
```

4. Approve Payroll
5. Klik **Pay Salary**

System buat payment:

```
Dr Salary Expense
Cr Bank
```

---

# 7. Up Country Cost

Ini biasanya untuk **biaya perjalanan dinas / sales visit / project luar kota**.

Contoh:

* transport
* hotel
* makan
* uang harian

---

## Data Source

* Employees
* CRM Visit Reports
* Areas
* Budget

---

## Field

Header:

* Employee
* Trip Date
* Destination
* Purpose

Lines:

* Expense Type
* Amount
* Receipt

---

## User Journey

### Sales perjalanan ke kota lain

1. Sales submit **Up Country Cost**
2. Isi:

```
Transport = 1 juta
Hotel = 800rb
Meal = 300rb
```

3. Submit
4. Manager approve
5. Finance bayar reimbursement

System buat payment:

```
Dr Travel Expense
Cr Bank
```

---

# Hubungan Semua Modul (Flow)

```
Sales Invoice
      ↓
Customer Payment
      ↓
Bank Account
      ↓
Journal Entry
      ↓
General Ledger
```

```
Supplier Invoice
      ↓
Payment
      ↓
Bank Account
      ↓
Journal Entry
```

```
Salary
      ↓
Payment
      ↓
Bank
```

```
Up Country Cost
      ↓
Approval
      ↓
Payment
```

---

# Best Practice Struktur Modul (Sangat penting)

Biasanya ERP Finance dibagi:

### Banking

* Bank Accounts
* Payments
* Cash Bank Journal

### Cost Control

* Budget
* Up Country Cost

### HR Finance

* Salary

---

# Saran penting untuk sistem ERP Anda

Dari navigation Anda, modul ini **sudah cukup enterprise level**.

Yang penting:

**Payments harus bisa link ke:**

```
Customer Invoice
Supplier Invoice
Salary
Up Country Cost
Non Trade Payable
```

jadi **1 payment engine saja**.

---

Kalau Anda mau, saya bisa bantu juga:

* **ERD relasi tabel semua modul Finance**
* **Flow accounting otomatis (journal auto generate)**
* **Best practice struktur database finance ERP**

Karena bagian ini **salah desain sedikit bisa kacau semua laporan keuangan.**
