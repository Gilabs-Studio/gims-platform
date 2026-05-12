# k6 Test Suite Architecture

## Purpose

Dokumen ini menjelaskan bagaimana folder `k6/` disusun, alasan tiap script ada, dan bagaimana semuanya terhubung ke roadmap benchmark GIMS.

Dokumen lain yang sudah ada seperti [K6_PRD.md](./K6_PRD.md), [K6_MATURITY_ROADMAP.md](./K6_MATURITY_ROADMAP.md), dan [PHASE1.5_ENHANCED_TEST_SUITE.md](./PHASE1.5_ENHANCED_TEST_SUITE.md) menjelaskan kebutuhan dan strategi. Dokumen ini menjelaskan implementasi aktual di repository.

## Big Picture

Suite `k6/` di GIMS dibagi ke tiga lapisan:

1. Lapisan fondasi bersama
   - Menyediakan konfigurasi target, threshold, auth flow, endpoint registry, dan helper validasi.
2. Lapisan skenario benchmark
   - Menjalankan jenis test berbeda: smoke, load, stress, dan transaction.
3. Lapisan artefak dan dokumentasi
   - Menyimpan hasil benchmark, generator report, dan dokumen roadmap agar hasil run bisa dibaca dalam konteks engineering plan.

## Architecture Layers

### 1. Shared Foundation

- [../config.js](../config.js)
  - Sumber konfigurasi bersama untuk URL API, kredensial test, threshold global, workload preset, dan endpoint registry.
  - Dipakai oleh semua script utama.

- [../auth-helper.js](../auth-helper.js)
  - Menangani auth flow khas GIMS: CSRF cookie lalu login lalu Bearer token reuse.
  - Dipakai agar script benchmark fokus pada skenario, bukan detail login.

### 2. Scenario Scripts

- [../smoke-test.js](../smoke-test.js)
  - Validasi cepat bahwa endpoint kritis masih hidup dan auth masih bekerja.
  - Fungsinya sebagai gate paling awal sebelum benchmark yang lebih mahal dijalankan.

- [../load-test.js](../load-test.js)
  - Simulasi traffic normal jam kerja dengan dominasi read operations dan sedikit write ringan.
  - Fungsinya mengukur performa harian yang paling realistis untuk release gate.

- [../stress-test.js](../stress-test.js)
  - Menaikkan tekanan secara bertahap sampai sistem mulai gagal memenuhi SLO.
  - Fungsinya mencari batas kapasitas dan sinyal bottleneck awal.

- [../transaction-test.js](../transaction-test.js)
  - Menjalankan workflow bisnis end-to-end pada Sales revenue cycle.
  - Fungsinya bukan hanya performance, tetapi juga validasi integritas transaksi dan bug concurrency pada alur bisnis inti.

### 3. Documentation and Reporting

- [../benchmark-matrix.md](../benchmark-matrix.md)
  - Mendefinisikan urutan benchmark standar dan SLO default untuk interpretasi hasil.

- [../reports/generate-baseline-report.js](../reports/generate-baseline-report.js)
  - Mengubah summary JSON dari beberapa run menjadi satu laporan markdown baseline.

- [../reports/](../reports)
  - Menyimpan artefak hasil benchmark yang bisa dibaca ulang dan dibandingkan antar run.

- [./INDEX.md](./INDEX.md)
  - Entry point dokumentasi.

## How the Current Suite Maps to the Roadmap

### Phase 1: Baseline Measurement

Status saat ini: sudah tercermin dalam script berikut:

- [../smoke-test.js](../smoke-test.js)
- [../load-test.js](../load-test.js)
- [../stress-test.js](../stress-test.js)
- [../benchmark-matrix.md](../benchmark-matrix.md)
- [../reports/generate-baseline-report.js](../reports/generate-baseline-report.js)

Tujuan Phase 1 adalah menjawab:

- Apakah API hidup?
- Berapa latency baseline dan peak?
- Di mana titik awal bottleneck saat load dinaikkan?
- Apakah hasil benchmark bisa diringkas menjadi laporan yang repeatable?

### Phase 1.5: Enhanced Transaction Coverage

Status saat ini: sudah mulai direalisasikan oleh:

- [../transaction-test.js](../transaction-test.js)
- [../auth-helper.js](../auth-helper.js)
- [./PHASE1.5_ENHANCED_TEST_SUITE.md](./PHASE1.5_ENHANCED_TEST_SUITE.md)

Tujuan Phase 1.5 adalah menutup gap yang tidak bisa dijawab oleh smoke/load/stress biasa, terutama:

- workflow transaksi end-to-end
- concurrency bug pada resource bisnis kritis
- validasi bahwa backend contract yang dipakai UI dan workflow bisnis benar-benar stabil di bawah load

### Phase 2: CI/CD Quality Gates

Dokumen dan arah implementasi ada di:

- [./PHASE2_QUICKSTART.md](./PHASE2_QUICKSTART.md)

Script benchmark yang ada hari ini menjadi fondasi untuk quality gate nanti. Artinya, struktur file di `k6/` memang sengaja dibuat agar:

- bisa dijalankan lokal
- bisa dipakai di staging
- nantinya bisa dipanggil dari pipeline tanpa mengubah logika inti

## Design Principles Used in This Suite

### Separate shared concerns from scenario logic

Konfigurasi, auth, dan helper validasi ditempatkan di file terpisah agar script skenario tetap pendek dan bisa berkembang tanpa duplikasi.

### Keep benchmark layers explicit

Smoke, load, stress, dan transaction dipisah karena masing-masing menjawab pertanyaan yang berbeda. Mencampur semuanya ke satu script akan membuat hasil sulit diinterpretasikan.

### Favor backend-contract alignment over synthetic assumptions

Khusus [../transaction-test.js](../transaction-test.js), payload dan route mengikuti kontrak backend aktual. Ini penting karena tujuan test tersebut adalah memverifikasi workflow bisnis nyata, bukan hanya throughput HTTP.

### Preserve reproducibility

Folder `reports/` dan dokumen roadmap disimpan bersama di `k6/` agar ada jejak yang jelas antara:

- script yang dijalankan
- hasil yang dihasilkan
- phase roadmap yang sedang dikerjakan

## Current Execution Model

Urutan praktis yang direkomendasikan saat ini:

1. Jalankan smoke untuk memastikan environment layak diuji.
2. Jalankan load baseline dan peak untuk mengukur performa operasional normal.
3. Jalankan stress untuk melihat titik degradasi.
4. Jalankan transaction test untuk memverifikasi alur bisnis kritis dan mendeteksi bug race condition.
5. Simpan artefak run ke `k6/reports/` lalu ringkas hasilnya.

## Current Gaps and Planned Expansion

Beberapa area masih sengaja belum selesai karena berada di phase lanjutan:

- multi-tenant distribution yang lebih realistis
- spike/soak script yang lebih khusus dan terpisah
- purchase transaction workflow
- rate limiting scenario
- concurrent mutation scenario di luar payment flow
- CI automation dan release gate formal

Karena itu, suite saat ini sebaiknya dibaca sebagai kombinasi:

- baseline suite yang sudah runnable
- transaction suite yang sedang menjadi fokus Phase 1.5
- fondasi untuk CI gating di Phase 2

## Recommended Reading Order

1. [./K6_MATURITY_ROADMAP.md](./K6_MATURITY_ROADMAP.md)
2. [./PHASE1.5_ENHANCED_TEST_SUITE.md](./PHASE1.5_ENHANCED_TEST_SUITE.md)
3. [./K6_TEST_SUITE_ARCHITECTURE.md](./K6_TEST_SUITE_ARCHITECTURE.md)
4. [./K6_FILE_PURPOSE_MAP.md](./K6_FILE_PURPOSE_MAP.md)
5. [./K6_EXECUTION_PLAYBOOK.md](./K6_EXECUTION_PLAYBOOK.md)
