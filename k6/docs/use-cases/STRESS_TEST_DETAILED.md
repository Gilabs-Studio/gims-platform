# Stress Test Detailed

## Purpose

Dokumen ini menjelaskan secara detail apa yang dilakukan oleh [../../stress-test.js](../../stress-test.js).

Stress test dipakai untuk menaikkan tekanan sampai sistem mulai gagal memenuhi target kualitas. Fokusnya adalah batas kapasitas, bukan correctness workflow bisnis.

## What Happens When the Script Runs

### 1. Scenario Shape

Script mendefinisikan stage bertingkat.

Ada dua mode:

- quick mode untuk sanity stress singkat
- full mode untuk progression yang lebih agresif

Quick mode dipakai saat `QUICK=1`.

Full mode dipakai saat tidak ada override itu.

### 2. Abort Behavior

Threshold paling penting di script ini adalah:

- `http_req_failed < 1%` dengan `abortOnFail`

Artinya script akan berhenti ketika error rate melewati batas yang sudah dianggap tidak aman. Ini membuat stress test cocok untuk mencari titik gagal lebih cepat.

### 3. Setup Phase

Setup melakukan:

- auth
- fetch daftar produk
- fetch daftar customer

Data ini dipakai untuk variasi detail request acak saat load naik.

### 4. Main Iteration Flow

Setiap iterasi melakukan:

- core reads ke products, customers, sales orders, purchase orders, dashboard, dan COA
- detail reads acak untuk product dan customer
- think time kecil agar pola load tidak terlalu artifisial

### 5. Why This Pattern Is Simple

Stress test sengaja dibuat lebih sederhana daripada load test.

Alasannya:

- saat mencari bottleneck, kita butuh sinyal yang bersih
- semakin rumit traffic mix, semakin sulit menyimpulkan sumber degradasi
- core read endpoints biasanya cukup untuk menekan API, DB, auth middleware, dan cache layer

## What This Script Is Good At

Script ini bagus untuk menjawab:

- pada load berapa sistem mulai error
- kapan p95 dan p99 melonjak
- apakah ada endpoint inti yang lebih dulu collapse

## What This Script Is Not Trying to Do

Script ini tidak mencoba:

- menguji integritas dokumen transaksi
- memvalidasi alur SQ ke invoice ke payment
- mengecek apakah duplicate payment ditolak

Karena itu, stress pass tidak berarti transaction correctness aman.

## Common Failure Signals

Kegagalan stress sering menunjuk ke area berikut:

- DB connection pool habis
- query planner buruk pada endpoint berat
- lock contention
- cache miss beruntun
- auth atau middleware overhead terlalu mahal saat VU naik

## Recommended Usage

Gunakan stress test saat:

- ingin cari batas kapasitas
- ingin membandingkan hasil tuning infra
- ingin melihat apakah sistem punya headroom sebelum rollout besar
