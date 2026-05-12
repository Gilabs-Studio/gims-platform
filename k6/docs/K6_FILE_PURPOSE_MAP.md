# k6 File Purpose Map

## Purpose

Dokumen ini menjelaskan tujuan setiap file penting di folder `k6/`, kapan file itu dipakai, dan apakah file tersebut termasuk fondasi, skenario, artefak, atau dokumen arah kerja.

## Root Folder Map

| File | Type | Purpose | When Used | Notes |
| --- | --- | --- | --- | --- |
| [../README.md](../README.md) | Overview | Ringkasan cara menjalankan suite k6 | Saat onboarding atau quick run | Pintu masuk paling praktis |
| [../benchmark-matrix.md](../benchmark-matrix.md) | Policy | Mendefinisikan urutan benchmark dan SLO default | Saat menentukan gate benchmark | Dokumen interpretasi hasil |
| [../config.js](../config.js) | Shared foundation | Menyimpan `BASE_URL`, kredensial, thresholds, workload preset, dan endpoint registry | Dipakai semua script | Pusat konfigurasi global |
| [../auth-helper.js](../auth-helper.js) | Shared foundation | Menyederhanakan login CSRF + JWT dan helper GET/POST/PATCH | Dipakai script yang butuh auth | Mengurangi duplikasi auth flow |
| [../smoke-test.js](../smoke-test.js) | Scenario | Validasi endpoint dasar dan auth flow | Sebelum test lain, deploy gate | Read-only dan cepat |
| [../load-test.js](../load-test.js) | Scenario | Simulasi traffic normal lintas modul | Baseline release benchmark | Dominan read dengan write ringan |
| [../stress-test.js](../stress-test.js) | Scenario | Mencari titik gagal saat tekanan dinaikkan | Capacity test | Abort saat error rate terlalu tinggi |
| [../transaction-test.js](../transaction-test.js) | Scenario | Validasi workflow bisnis Sales dari SQ sampai payment | Phase 1.5 dan investigasi transaksi | Paling dekat ke business flow nyata |

## Reports Folder Map

| File/Folder | Type | Purpose | Notes |
| --- | --- | --- | --- |
| [../reports/](../reports) | Artifact folder | Menyimpan output benchmark | Jejak historis hasil run |
| [../reports/generate-baseline-report.js](../reports/generate-baseline-report.js) | Utility | Menggabungkan summary JSON menjadi satu baseline report markdown | Dipakai setelah batch benchmark selesai |
| `../reports/*-smoke.json` | Artifact | Summary run smoke | Input untuk pelaporan |
| `../reports/*-load-baseline.json` | Artifact | Summary load baseline | Input untuk pelaporan |
| `../reports/*-load-peak.json` | Artifact | Summary peak load | Input untuk pelaporan |
| `../reports/*-stress-quick.json` | Artifact | Summary quick stress | Input untuk pelaporan |
| `../reports/*-stress-full.json` | Artifact | Summary full stress | Input untuk pelaporan |
| `../reports/*-soak.json` | Artifact | Summary soak | Input untuk pelaporan |
| `../reports/*-baseline-report.md` | Report | Human-readable summary lintas stage | Hasil final yang dibaca tim |

## Docs Folder Map

| File | Purpose | Audience |
| --- | --- | --- |
| [./INDEX.md](./INDEX.md) | Navigasi dokumen | Semua orang |
| [./K6_PRD.md](./K6_PRD.md) | Kebutuhan produk dan acceptance criteria | Lead, PM, reviewer |
| [./K6_MATURITY_ROADMAP.md](./K6_MATURITY_ROADMAP.md) | Roadmap phase 1 sampai 5 | Decision maker, implementer |
| [./PHASE1.5_ENHANCED_TEST_SUITE.md](./PHASE1.5_ENHANCED_TEST_SUITE.md) | Scope implementasi terdekat untuk enhanced suite | Engineer pelaksana |
| [./PHASE2_QUICKSTART.md](./PHASE2_QUICKSTART.md) | Arah CI/CD gate setelah phase 1.5 | Engineer DevOps/QA |
| [./K6_TEST_SUITE_ARCHITECTURE.md](./K6_TEST_SUITE_ARCHITECTURE.md) | Gambaran struktur implementasi aktual | Engineer baru di area k6 |
| [./K6_FILE_PURPOSE_MAP.md](./K6_FILE_PURPOSE_MAP.md) | Peta fungsi tiap file | Engineer yang ingin cepat memahami repo |
| [./K6_EXECUTION_PLAYBOOK.md](./K6_EXECUTION_PLAYBOOK.md) | Cara menjalankan suite sesuai tujuan | QA, backend, perf tester |

## Script-by-Script Intent

### [../config.js](../config.js)

Tujuan file ini:

- menjadi single source of truth untuk parameter benchmark umum
- memastikan semua script memakai threshold dan endpoint naming yang konsisten
- memudahkan override lewat environment variable tanpa mengedit script utama

File ini bukan test runner. File ini adalah dependency configuration untuk script lain.

### [../auth-helper.js](../auth-helper.js)

Tujuan file ini:

- membungkus flow auth yang spesifik ke GIMS
- mencegah login diulang terus di tiap request
- menyediakan helper `authGet`, `authPost`, dan `authPatch`

Tanpa file ini, setiap skenario akan mengulang boilerplate CSRF dan parsing cookie.

### [../smoke-test.js](../smoke-test.js)

Tujuan file ini:

- memastikan server hidup
- memastikan login dan endpoint inti masih accessible
- memberi sinyal cepat apakah environment cukup sehat untuk test berikutnya

Karakteristiknya:

- kecil
- cepat
- mostly read-only
- cocok untuk deploy verification dan CI smoke gate

### [../load-test.js](../load-test.js)

Tujuan file ini:

- mensimulasikan traffic normal lintas modul GIMS
- memberi angka baseline untuk latency, throughput, dan error rate pada kondisi business-hours

Karakteristiknya:

- mayoritas request adalah GET
- ada sedikit write dengan probabilitas kecil agar pola traffic tidak terlalu steril
- dipakai untuk baseline dan peak profile melalui env override

### [../stress-test.js](../stress-test.js)

Tujuan file ini:

- menaikkan load secara progresif sampai sistem mulai gagal memenuhi threshold
- mengidentifikasi titik awal degradasi atau bottleneck

Karakteristiknya:

- fokus ke tekanan, bukan ke kelengkapan workflow bisnis
- memakai `abortOnFail` untuk menghentikan run saat error rate melewati batas
- cocok untuk capacity probing, bukan untuk release confidence sendirian

### [../transaction-test.js](../transaction-test.js)

Tujuan file ini:

- memverifikasi alur bisnis Sales yang lengkap
- menguji integritas state transition dokumen
- mendeteksi masalah concurrency seperti duplicate payment atau race pada document generation

Karakteristiknya:

- stateful
- write-heavy dibanding script lain
- paling dekat dengan acceptance test bisnis yang berbasis load
- menjadi jembatan antara performance testing dan business workflow validation

## How These Files Work Together

Urutan ketergantungan yang paling penting:

1. [../config.js](../config.js) mendefinisikan target dan rules umum.
2. [../auth-helper.js](../auth-helper.js) menyediakan akses authenticated API.
3. Script skenario memakai keduanya untuk menjalankan benchmark.
4. Output benchmark disimpan ke `reports/`.
5. Dokumen di `docs/` menjelaskan kenapa benchmark itu ada dan bagaimana membacanya.

## Which File to Touch for What

Jika ingin melakukan perubahan tertentu, titik edit yang tepat biasanya seperti ini:

| Need | Main file to edit |
| --- | --- |
| Ganti target URL default | [../config.js](../config.js) |
| Tambah helper request authenticated | [../auth-helper.js](../auth-helper.js) |
| Tambah endpoint ke smoke coverage | [../smoke-test.js](../smoke-test.js) |
| Ubah pola traffic normal | [../load-test.js](../load-test.js) |
| Ubah profile pressure/capacity test | [../stress-test.js](../stress-test.js) |
| Tambah workflow bisnis baru | [../transaction-test.js](../transaction-test.js) atau script transaction baru |
| Ubah urutan benchmark standard | [../benchmark-matrix.md](../benchmark-matrix.md) |
| Ubah narasi roadmap dan phase | [./K6_MATURITY_ROADMAP.md](./K6_MATURITY_ROADMAP.md) |
| Ubah scope implementasi Phase 1.5 | [./PHASE1.5_ENHANCED_TEST_SUITE.md](./PHASE1.5_ENHANCED_TEST_SUITE.md) |
