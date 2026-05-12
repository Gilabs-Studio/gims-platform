# Smoke Test Detailed

## Purpose

Dokumen ini menjelaskan secara detail apa yang dilakukan oleh [../../smoke-test.js](../../smoke-test.js).

Smoke test adalah gate paling awal. Tujuannya bukan mengukur kapasitas, tetapi menjawab satu pertanyaan sederhana:

apakah environment masih cukup sehat untuk benchmark dan validasi lain?

## What Happens When the Script Runs

### 1. Options and Runtime Mode

Script memakai:

- threshold default dari `config.js`
- workload `SMOKE_WORKLOAD`
- mode `RELAXED` opsional untuk lokal

Efeknya:

- default run mengecek latency dan error rate
- run `RELAXED=1` hanya fokus ke availability dasar

### 2. Setup Phase

Di `setup()`, script melakukan autentikasi sekali dan membagikan hasil auth ke semua iterasi.

Tujuannya:

- mengurangi noise login berulang
- memastikan test berhenti lebih cepat bila credential salah atau auth rusak

Jika auth gagal, smoke test langsung gagal sebelum masuk ke endpoint lain.

### 3. Main Iteration Flow

Setiap iterasi dibagi ke group berikut:

1. public endpoints
2. auth endpoints
3. master data
4. finance
5. HRD
6. sales
7. purchase
8. dashboard

### 4. Validation Style

Smoke test memakai validasi yang sederhana dan defensif:

- status code 2xx
- response punya field `success`
- untuk endpoint tertentu ada check spesifik seperti health status atau API root message

Script ini sengaja read-only hampir sepenuhnya. Tujuannya menghindari polusi data saat dipakai sebagai gate harian.

## Why Smoke Test Exists Separately

Kalau smoke digabung dengan load atau stress, maka saat environment dasar rusak kita akan membuang waktu menunggu benchmark panjang yang sebenarnya sudah invalid dari awal.

Smoke dipisah supaya:

- fault dasar terlihat cepat
- deploy verification bisa singkat
- run selanjutnya punya baseline kesehatan minimum

## What a Passing Run Means

Kalau smoke test lolos, artinya biasanya:

- server hidup
- route publik dasar hidup
- auth flow dasar hidup
- endpoint protected utama masih accessible

Smoke pass tidak berarti:

- performa bagus di bawah load
- transaction workflow benar
- concurrency aman

Itu diuji oleh script lain.

## What a Failure Usually Means

Kategori kegagalan yang umum:

- environment down
- credential salah
- auth/CSRF contract berubah
- route berubah tetapi endpoint registry belum diupdate
- middleware baru memblokir request yang dulu lolos

## When to Use It

Gunakan smoke saat:

- selesai deploy
- sebelum mulai load/stress
- setelah ubah auth, proxy, middleware, route group, atau permission

## When Not to Use It Alone

Jangan pakai smoke sebagai satu-satunya bukti kalau sistem aman dirilis untuk perubahan performa berat atau perubahan workflow bisnis.

Untuk itu, smoke harus dilanjutkan minimal dengan load baseline, dan bila perubahan menyentuh transaksi, lanjut dengan transaction test.
