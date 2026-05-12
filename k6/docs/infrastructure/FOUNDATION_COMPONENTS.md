# Foundation Components

## Purpose

Dokumen ini menjelaskan komponen fondasi yang dipakai oleh semua script k6 di repository ini.

Komponen yang dibahas:

- [../../config.js](../../config.js)
- [../../auth-helper.js](../../auth-helper.js)
- [../../benchmark-matrix.md](../../benchmark-matrix.md)
- [../../reports/](../../reports)

## Shared Configuration

### File

- [../../config.js](../../config.js)

### Tanggung Jawab

`config.js` adalah pusat konfigurasi bersama. File ini menyimpan:

- target host API
- kredensial default test
- threshold global
- preset workload
- endpoint registry
- helper validasi response

### Kenapa Penting

Tanpa file ini, setiap script akan memiliki:

- base URL sendiri
- threshold sendiri
- definisi endpoint sendiri
- helper validasi sendiri

Itu akan membuat suite cepat drift dan sulit dipelihara.

### Isi Penting

- `BASE_URL`
- `API_V1`
- `CREDENTIALS`
- `THRESHOLDS`
- `CRITICAL_THRESHOLDS`
- preset workload seperti `SMOKE_WORKLOAD`
- `AUTH_ENDPOINTS`
- helper `checkSuccess()` dan `checkList()`

## Authentication Helper

### File

- [../../auth-helper.js](../../auth-helper.js)

### Tanggung Jawab

`auth-helper.js` membungkus flow auth khas GIMS:

1. ambil CSRF token
2. login dengan header `X-CSRF-Token`
3. ambil access token dari HttpOnly cookie
4. gunakan Bearer token untuk request berikutnya

### Helper yang Disediakan

- `getAuthToken()`
- `authHeaders()`
- `authGet()`
- `authPost()`
- `authPatch()`
- `clearTokenCache()`

### Kenapa Token Cache Penting

K6 menjalankan banyak iterasi. Jika setiap iterasi login ulang, hasil benchmark akan tercampur dengan biaya auth yang seharusnya tidak selalu menjadi fokus. Karena itu token disimpan di cache per VU.

### Konsekuensi Desain Ini

- script bisa fokus ke skenario bisnis
- login tidak membanjiri backend di tiap iterasi
- benchmark lebih stabil dan lebih dekat ke pola user yang sudah login

## Benchmark Policy

### File

- [../../benchmark-matrix.md](../../benchmark-matrix.md)

### Tanggung Jawab

Dokumen ini menetapkan kebijakan benchmark standar:

- urutan run
- target SLO default
- interpretasi pass/fail

File ini bukan script dan bukan konfigurasi runtime. Fungsinya adalah policy reference untuk membaca hasil.

## Reporting and Artifacts

### Folder

- [../../reports/](../../reports)

### Utility

- [../../reports/generate-baseline-report.js](../../reports/generate-baseline-report.js)

### Tanggung Jawab

Folder ini menyimpan hasil run agar benchmark tidak berhenti sebagai output terminal sesaat.

Jenis artefak yang ada saat ini:

- summary JSON per stage benchmark
- report markdown hasil agregasi beberapa stage

### Kenapa Penting

Benchmark baru bernilai bila hasilnya bisa:

- dibandingkan antar run
- dijadikan bukti di review release
- dijadikan referensi tuning di sprint berikutnya

## Environment Overrides

Sebagian besar script menerima override lewat environment variable. Yang paling sering dipakai:

- `BASE_URL`
- `TEST_EMAIL`
- `TEST_PASSWORD`
- `VUS`
- `DURATION`
- `MAX_VUS`
- `QUICK`
- `RELAXED`

Tujuan desain ini adalah memisahkan:

- perilaku default untuk local/staging
- kebutuhan eksperimen tanpa harus mengubah file script

## How Foundation Is Used by Each Script

### Smoke

Memakai threshold dan workload preset dari `config.js`, lalu memakai auth helper untuk akses endpoint protected.

### Load

Memakai threshold default, auth helper, dan endpoint registry sebagai dasar traffic mix lintas modul.

### Stress

Memakai auth helper dan endpoint registry, tetapi mendefinisikan stage sendiri karena pola tekanannya berbeda dari load biasa.

### Transaction

Memakai auth helper sebagai fondasi paling penting, lalu menambahkan wrapper lokal seperti `apiGet`, `apiPost`, dan `apiPatch` agar flow bisnis lebih mudah dibaca.

## Maintenance Guidance

Kalau ada perubahan berikut, titik edit utamanya biasanya di layer foundation:

- perubahan auth contract
- perubahan path endpoint global
- perubahan threshold default lintas script
- perubahan base URL atau policy environment

Karena itu sebelum menyalahkan script use case, cek dulu apakah perubahan backend memerlukan update di komponen fondasi.
