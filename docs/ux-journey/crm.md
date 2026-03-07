Berikut saya buat **scenario POV seorang Sales / Marketer** yang menggunakan CRM secara **seamless dari Lead → Deal → Customer → Activity → Visit Report**. Saya akan buat seperti **cerita workflow sehari-hari**, tapi sekaligus menunjukkan **flow bisnis CRM yang rapi** untuk ERP kamu.

Agar nanti **modul CRM kamu konsisten**, biasanya struktur terbaik adalah:

```
Lead → Opportunity / Pipeline → Customer → Activities → Tasks → Visit → Report → Deal Won / Lost
```

Jangan langsung Lead → Customer, karena **belum tentu semua lead jadi customer**.

---

# 1. Scenario Awal — Sales Mencari Leads

**POV: Sales bernama Andi**

Pagi hari Andi membuka aplikasi CRM perusahaan.

Ia masuk ke menu **Lead Finder** yang terintegrasi dengan **Google Maps / Google Places API**.

Andi ingin mencari:

> Klinik dan rumah sakit di Semarang.

Ia mengetik:

```
keyword: klinik
location: Semarang
radius: 10km
```

CRM lalu menampilkan daftar:

| Nama                 | Alamat   | Rating | Phone    |
| -------------------- | -------- | ------ | -------- |
| Klinik Sehat Sentosa | Semarang | 4.5    | 0812xxxx |
| Klinik Medika Jaya   | Semarang | 4.2    | 0813xxxx |

Andi memilih beberapa lead yang menarik.

Kemudian klik:

```
Import to CRM → Create Leads
```

CRM otomatis membuat record:

```
Lead
- Company Name
- Address
- Phone
- Source = Google Maps
- Industry = Healthcare
- Owner = Andi
- Status = New
```

---

# 2. Sales Mulai Menghubungi Lead

Setelah lead masuk CRM.

Andi mulai melakukan outreach.

Ia membuka detail lead:

```
Lead: Klinik Sehat Sentosa
Status: New
```

Ia klik tombol:

```
Add Activity
```

Activity:

```
Type: Call
Result: Interested
Note: mereka tertarik demo sistem CRM
```

CRM otomatis:

```
Lead Status → Contacted
```

---

# 3. Lead Menjadi Opportunity (Pipeline)

Setelah telepon, klinik tertarik melihat demo.

Andi menekan tombol:

```
Convert Lead → Opportunity
```

CRM membuat:

```
Opportunity
Pipeline: Sales CRM Healthcare
Stage: Qualification
Value: 120 juta
Expected Close: 3 bulan
```

Lead tidak dihapus, tetapi berubah status:

```
Lead Status = Converted
Linked Opportunity = OPP-2026-001
```

Ini penting untuk **tracking marketing source**.

---

# 4. Opportunity Masuk Pipeline

Sekarang opportunity muncul di **Pipeline Board**.

Contoh pipeline:

```
Qualification
↓
Needs Analysis
↓
Demo
↓
Proposal
↓
Negotiation
↓
Won / Lost
```

Opportunity Klinik Sehat Sentosa sekarang ada di:

```
Qualification
```

---

# 5. Sales Menjadwalkan Tasks

Andi ingin melakukan demo.

Ia membuat task:

```
Task
Type: Demo
Due date: 12 March
Assigned to: Andi
Related to: Opportunity OPP-2026-001
```

CRM akan menampilkan di dashboard:

```
Today's Tasks
Upcoming Tasks
Overdue Tasks
```

---

# 6. Sales Melakukan Visit

Karena klien ingin meeting langsung.

Andi membuat:

```
Visit Plan
Location: Klinik Sehat Sentosa
Date: 12 March
Purpose: Demo CRM
```

CRM dapat menampilkan:

```
Map Direction
Check-in
Check-out
```

Saat tiba di lokasi, Andi klik:

```
Check In Visit
```

GPS tercatat.

---

# 7. Setelah Meeting → Visit Report

Setelah meeting selesai.

Andi membuat:

```
Visit Report
```

Isi laporan:

```
Meeting Summary:
Client tertarik dengan fitur CRM + WhatsApp automation.

Next Action:
Kirim proposal harga.

Decision Maker:
Dr. Budi
```

CRM otomatis melakukan:

```
Opportunity Stage → Demo Completed
```

---

# 8. Sales Mengirim Proposal

Sales menambahkan activity:

```
Activity
Type: Send Proposal
Attachment: proposal.pdf
```

Opportunity berpindah stage:

```
Proposal
```

---

# 9. Klien Deal

Beberapa minggu kemudian klien setuju.

Andi klik:

```
Mark Opportunity → WON
```

CRM otomatis membuat:

```
Customer
Company: Klinik Sehat Sentosa
Status: Active Customer
```

Dan juga bisa membuat:

```
Project
Invoice
Subscription
Support Ticket
```

---

# 10. Setelah Jadi Customer

Sekarang modul lain ERP mulai bekerja.

Contoh:

Customer bisa memiliki:

```
Projects
Invoices
Support Tickets
Contracts
Renewals
```

---

# Flow CRM yang Paling Ideal

Flow final CRM kamu sebaiknya seperti ini:

```
Lead
  ↓
Activity (Call / Email)
  ↓
Convert
  ↓
Opportunity
  ↓
Pipeline Stages
  ↓
Tasks / Activities
  ↓
Visit
  ↓
Visit Report
  ↓
Proposal
  ↓
Deal Won
  ↓
Customer
```