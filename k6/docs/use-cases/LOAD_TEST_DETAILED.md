# Load Test Detailed

## Purpose

Dokumen ini menjelaskan secara detail apa yang dilakukan oleh [../../load-test.js](../../load-test.js).

Load test bertujuan meniru traffic normal jam kerja dengan dominasi request baca lintas modul. Script ini dipakai untuk baseline benchmark dan peak benchmark melalui env override.

## What Happens When the Script Runs

### 1. Scenario Shape

Script membuat satu scenario `average_load` dengan pola:

- warmup ringan
- ramp up ke target VU
- steady state sesuai `DURATION`
- ramp down

Target default:

- `VUS=20`
- `DURATION=5m`

### 2. Setup Phase

Di `setup()`, script melakukan:

- auth sekali
- fetch daftar customer
- fetch daftar product
- fetch daftar warehouse

ID hasil fetch ini kemudian dipakai untuk:

- detail request acak
- variasi traffic agar tidak semua iterasi memanggil endpoint list yang sama persis

### 3. SharedArray Usage

Script menggunakan `SharedArray` untuk daftar nama produk benchmark.

Tujuannya:

- menghindari alokasi ulang array besar di setiap VU
- menyediakan sumber nama acak saat create ringan dilakukan

### 4. Main Iteration Flow

Setiap iterasi secara garis besar melakukan:

1. dashboard and billing
2. master data reads
3. finance reads
4. sales reads
5. purchase reads
6. inventory reads
7. HRD reads
8. lightweight create dengan probabilitas kecil

### 5. Traffic Philosophy

Load test ini sengaja lebih realistis dibanding benchmark sintetis yang hanya spam satu endpoint.

Karakter traffic-nya:

- banyak GET ke list endpoint
- beberapa detail endpoint secara acak
- sedikit operasi create agar ada sentuhan write, tetapi tidak sampai merusak data benchmark berulang

### 6. Lightweight Create Path

Hanya sekitar 5% iterasi yang menjalankan create produk ringan.

Tujuannya:

- memasukkan sedikit write pressure
- tetap menjaga load test cocok dipakai berkali-kali tanpa polusi data berlebihan

Ini bukan transaction workflow. Ini hanya write ringan agar load mix lebih mendekati sistem nyata.

## What This Script Is Good At

Load test bagus untuk menjawab pertanyaan berikut:

- berapa latency operasional normal
- apakah throughput stabil pada traffic harian
- apakah modul utama mengalami regresi performa setelah perubahan backend

## What This Script Is Not Trying to Do

Script ini tidak bertujuan untuk:

- mencari breaking point tertinggi
- memvalidasi workflow bisnis multi-step
- mendeteksi race condition pada invoice/payment/document code

Hal-hal itu ditangani lebih baik oleh `stress-test.js` dan `transaction-test.js`.

## Common Interpretation of Results

Kalau load test gagal threshold, artinya biasanya salah satu dari ini:

- query atau join menjadi lebih berat
- response size membesar
- caching atau indexing berubah
- service dependency melambat

Kalau load test lolos, itu berarti baseline operasional masih sehat, tetapi tidak otomatis berarti workflow bisnis kritis juga aman.

## Recommended Usage

Gunakan load test untuk:

- baseline release benchmark
- verifikasi hasil tuning performa
- pembanding antar environment staging/perf
