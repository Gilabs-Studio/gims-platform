# GIMS Pricing Scenarios, Hidden Costs, and Change Requests

Dokumen ini dipakai untuk menjawab pertanyaan lanjutan seperti:
- biaya migrasi data lama
- biaya integrasi ke tools lain
- biaya penambahan modul baru
- biaya yang sering tidak terlihat di proposal awal

Tujuannya agar quotation lebih transparan dan tidak ada biaya yang terasa "mendadak" di tengah jalan.

## Prinsip Pricing Scenario

- Paket standar hanya mencakup scope yang sudah tertulis di dokumen paket.
- Semua kebutuhan di luar scope standar dihitung sebagai add-on.
- Semakin besar historis data, semakin besar effort cleansing, mapping, validasi, dan UAT.
- Integrasi pihak ketiga dihitung berdasarkan jumlah sistem, jumlah endpoint, dan kompleksitas sinkronisasi.
- Modul baru dihitung berdasarkan tipe modul: master data, workflow, transaksi, atau cross-module.

## Kondisi Lapangan di Indonesia

Skenario harga di dokumen ini disusun supaya realistis untuk kondisi proyek ERP di Indonesia:

- Banyak client masih menyimpan data awal di Excel, Google Sheets, CSV, atau aplikasi lama yang tidak rapi.
- Struktur kode customer, supplier, produk, dan gudang sering tidak konsisten antar cabang.
- Approval harian sering lewat WhatsApp, email, atau grup operasional, jadi integrasi notifikasi cukup sering dibutuhkan.
- Go-live biasanya diminta di luar jam operasional, akhir pekan, atau setelah closing bulanan.
- Banyak client meminta training onsite, minimal untuk finance, admin, dan user gudang.
- Klien luar kota sering butuh biaya perjalanan, akomodasi, dan waktu tambahan untuk UAT.
- Harga di dokumen ini **belum termasuk PPN 11%**.

## Hidden Cost yang Perlu Diantisipasi

| Item | Biaya | Keterangan |
|---|---:|---|
| Discovery / workshop awal | Rp7.500.000 | Analisis scope, alur bisnis, dan risiko implementasi |
| Data cleansing | Rp10.000.000 | Pembersihan data sebelum migrasi |
| Data mapping | Rp12.500.000 | Pemetaan field lama ke field baru |
| User training 1 sesi | Rp3.500.000 | Maksimal 15 peserta per sesi |
| UAT support | Rp7.500.000 | Pendampingan saat user acceptance test |
| Go-live support | Rp12.500.000 | Pendampingan awal setelah sistem live |
| Extra branch setup | Rp7.500.000 | Setup cabang tambahan di luar scope paket |
| Extra role / permission design | Rp5.000.000 | Penyesuaian struktur akses yang tidak standar |
| Production hardening | Rp15.000.000 | Security baseline, backup flow, dan stabilisasi awal |
| On-site visit Jakarta / Bodetabek | Rp3.500.000 / kunjungan | Transport lokal dan koordinasi onsite |
| On-site visit luar kota | Rp7.500.000 / hari | Belum termasuk tiket dan hotel |
| WhatsApp notification integration | Rp22.500.000 | Cocok untuk approval, reminder, dan follow-up tim lapangan |
| Tax invoice / PPN document setup | Rp12.500.000 | Untuk penyesuaian format faktur dan dokumen pajak lokal |
| Annual maintenance | 15% dari nilai lisensi | Untuk on-premise atau license-based project |

## Scenario: Migrasi Data

### 1. Migrasi data ringan

Cocok untuk:
- data aktif 1 tahun terakhir
- format data relatif rapi
- jumlah sheet / tabel terbatas

| Scope | Biaya |
|---|---:|
| Migrasi data ringan | Rp15.000.000 |

### 2. Migrasi data menengah

Cocok untuk:
- data 2–3 tahun
- butuh cleansing dan mapping beberapa field
- ada histori transaksi yang masih dipakai untuk laporan

| Scope | Biaya |
|---|---:|
| Migrasi data menengah | Rp35.000.000 |

### 3. Migrasi data 5 tahun

Ini skenario yang sering ditanyakan client.

| Scope | Biaya |
|---|---:|
| Migrasi data 5 tahun | Rp55.000.000 |

### 3A. Migrasi data 5 tahun dengan format lapangan Indonesia

Cocok untuk kondisi yang umum ditemukan di lapangan:
- data tersebar di beberapa file Excel
- ada perbedaan penamaan item antar cabang
- transaksi lama perlu dicocokkan ulang dengan stok dan finance
- data customer/supplier mengandung duplikasi nomor dan nama

| Scope | Biaya |
|---|---:|
| Migrasi data 5 tahun + cleansing lapangan | Rp75.000.000 |

### 4. Migrasi data panjang / legacy

Cocok untuk:
- 5 tahun ke atas
- banyak perubahan format data
- ada beberapa sumber file atau database lama
- perlu verifikasi silang antar modul

| Scope | Biaya |
|---|---:|
| Migrasi data legacy besar | Rp95.000.000 |

### Komponen yang biasanya tidak masuk harga migrasi dasar
- koreksi data duplikat
- rekonsiliasi saldo lama
- normalisasi kode produk/customer/supplier
- migrasi attachment / file scan
- verifikasi lintas modul

## Scenario: Integrasi ke Tools Lain

### Google Calendar

| Scope | Biaya |
|---|---:|
| Sinkronisasi event satu arah | Rp18.000.000 |
| Sinkronisasi dua arah | Rp29.000.000 |

Use case:
- reminder meeting sales
- jadwal visit CRM
- jadwal approval atau aktivitas tim

### Google Workspace / SSO

| Scope | Biaya |
|---|---:|
| Login Google Workspace | Rp25.000.000 |
| SSO + role mapping | Rp35.000.000 |

### WhatsApp notification

| Scope | Biaya |
|---|---:|
| Notifikasi WhatsApp basic | Rp22.500.000 |
| Notifikasi WhatsApp dengan template approval | Rp32.500.000 |

### Spreadsheet / Excel import automation

| Scope | Biaya |
|---|---:|
| Import dari Excel / CSV standar | Rp12.500.000 |
| Import dengan validasi field dan mapping khusus | Rp25.000.000 |

### Email / SMTP automation

| Scope | Biaya |
|---|---:|
| Setup email automation | Rp12.500.000 |

### Integrasi API internal / external system

| Scope | Biaya |
|---|---:|
| 1 sistem pihak ketiga sederhana | Rp25.000.000 |
| 1 sistem pihak ketiga dengan sync dua arah | Rp45.000.000 |
| Integrasi multi-system | Rp75.000.000 |

### Catatan integrasi
- API rate limit dari pihak ketiga bisa mempengaruhi timeline.
- Integrasi yang butuh webhook, retry queue, atau audit log biasanya lebih mahal.
- Jika sistem lama tidak punya dokumentasi API, perlu discovery terpisah.

## Scenario: Penambahan Modul Baru

Kalau client minta fitur baru di luar paket standar, gunakan klasifikasi berikut.

| Tipe Modul | Contoh | Biaya |
|---|---|---:|
| Simple master data module | Referensi baru, daftar, form, export | Rp25.000.000 |
| Workflow module | Approval, status, routing, notifikasi | Rp45.000.000 |
| Transaction module | Create/update/posting, relasi ke stok/finance | Rp75.000.000 |
| Cross-module module | Menghubungkan sales, purchase, stock, finance | Rp120.000.000 |
| Advanced reporting module | Dashboard analitik, filter kompleks, export | Rp35.000.000 |

### Contoh request modul baru

#### Contoh 1: Client minta menu "Vehicle Management"
Jika hanya master data + list + form:
- harga: Rp25.000.000

Jika ada workflow servis, reminder, dan approval:
- harga: Rp45.000.000

Jika vehicle management terhubung ke stok sparepart dan finance:
- harga: Rp120.000.000

#### Contoh 2: Client minta modul "Project Costing"
Biasanya masuk kategori cross-module, karena akan menyentuh:
- budget
- procurement
- approval
- laporan biaya

Harga: Rp120.000.000

## Scenario: Custom Workflow

| Skenario | Biaya |
|---|---:|
| Tambah 1 approval step | Rp7.500.000 |
| Tambah 2 approval step | Rp12.500.000 |
| Approval matrix kompleks | Rp25.000.000 |
| Delegasi approval / fallback approver | Rp15.000.000 |

## Scenario: Deployment

### Cloud / Hosted

| Item | Biaya |
|---|---:|
| Setup cloud environment | Termasuk paket standar |

### On-Premise

| Item | Biaya |
|---|---:|
| Instalasi di server client | Rp35.000.000 |
| Security hardening on-premise | Rp15.000.000 |
| Backup / restore procedure setup | Rp12.500.000 |
| Annual maintenance | 15% dari nilai lisensi |

### On-Premise Subscription di Indonesia

Model ini cocok untuk client yang:
- punya server sendiri
- ingin budget operasional bulanan yang lebih mudah dibaca finance
- tetap butuh support vendor setelah go-live

| Item | Biaya |
|---|---:|
| Setup server client | Rp35.000.000 |
| Subscription software on-premise | Rp19.900.000 / bulan |
| Support SLA | Termasuk paket bulanan |
| Major custom request | Dihitung terpisah |

### On-Premise Perpetual License

Model ini cocok untuk client yang ingin license sekali bayar.

| Item | Biaya |
|---|---:|
| License on-premise | Rp449.000.000 |
| Installation dan handover | Rp49.000.000 |
| Annual maintenance | 15% dari nilai license |
| Support bulanan opsional | Rp6.500.000 / bulan |

## Scenario: Extra User, Branch, dan Company

| Item | Biaya |
|---|---:|
| Extra user | Rp150.000 / user / bulan |
| Extra branch | Rp7.500.000 / branch |
| Extra company | Rp15.000.000 / company |

## Scenario: Kondisi Operasional yang Umum di Indonesia

### 1. Client multi-cabang dengan approval manual

Kondisi yang sering ditemui:
- cabang ada di kota berbeda
- approval masih lewat WhatsApp atau tanda tangan manual
- user finance pusat ingin semua transaksi masuk ke satu dashboard

| Scope | Biaya |
|---|---:|
| Workflow approval multi-cabang | Rp25.000.000 |
| Notifikasi approval ke WhatsApp | Rp22.500.000 |
| Training onsite per cabang | Rp3.500.000 / sesi |

### 2. Client pindah dari Excel ke ERP

| Scope | Biaya |
|---|---:|
| Discovery + mapping struktur Excel | Rp12.500.000 |
| Import data master + transaksi | Rp25.000.000 |
| Validasi hasil migrasi | Rp15.000.000 |

### 3. Go-live setelah closing atau payroll

| Scope | Biaya |
|---|---:|
| Pendampingan go-live malam / weekend | Rp12.500.000 |
| Re-check laporan setelah go-live | Rp7.500.000 |

### 4. Client area luar Jabodetabek

| Scope | Biaya |
|---|---:|
| Transport dan akomodasi onsite | Actual cost + handling fee |
| Visit tambahan jika scope berubah | Rp3.500.000 / kunjungan |

## Cara Menghitung Quotation Cepat

Gunakan rumus berikut:

**Total = Paket dasar + add-on modul + migrasi data + integrasi + deployment + training + support go-live**

### Contoh perhitungan

Client meminta:
- Full Standard
- migrasi data 5 tahun
- Google Calendar two-way sync
- 1 modul tambahan sederhana

Maka estimasi:
- Full Standard: Rp249.000.000
- Migrasi data 5 tahun: Rp55.000.000
- Google Calendar two-way sync: Rp29.000.000
- Simple master data module: Rp25.000.000

**Total awal = Rp358.000.000**

## Catatan Penjualan

- Jangan campur custom request ke dalam harga paket standar.
- Jika scope belum jelas, jual discovery workshop dulu.
- Kalau client ingin cepat go-live, tawarkan paket standar lalu tambah modul setelah stabil.
- Kalau client punya banyak historis data, jangan janji harga migrasi murah sebelum data dicek.

## Aturan Praktis untuk Sales

- Pertanyaan "fitur ini berapa?" → pakai tabel harga menu.
- Pertanyaan "kalau full berapa?" → pakai paket Full Standard.
- Pertanyaan "data lama 5 tahun kena berapa?" → pakai scenario migrasi data 5 tahun.
- Pertanyaan "bisa integrasi ke tools lain?" → cek kategori integrasi.
- Pertanyaan "ada fitur khusus yang belum ada?" → pakai tabel penambahan modul baru.
- Pertanyaan "bisa on-premise tapi langganan?" → pakai skema On-Premise Subscription.
- Pertanyaan "server kami sendiri, sekali beli saja bisa?" → pakai skema On-Premise Perpetual License.
