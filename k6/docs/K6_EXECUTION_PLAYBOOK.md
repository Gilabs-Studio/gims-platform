# k6 Execution Playbook

## Purpose

Dokumen ini menjelaskan cara menjalankan suite k6 berdasarkan tujuan engineering, bukan hanya berdasarkan nama script.

Dengan kata lain, dokumen ini menjawab pertanyaan berikut:

- kalau ingin validasi deploy, script mana yang dipakai
- kalau ingin release benchmark, urutannya bagaimana
- kalau ingin investigasi workflow bisnis, script mana yang relevan
- kalau ingin membaca hasil benchmark, artefaknya ada di mana

## Execution Modes

### 1. Health and Deploy Verification

Gunakan ini saat ingin jawaban cepat: environment hidup atau tidak.

Command utama:

```bash
pnpm k6:smoke
```

Gunakan mode ini ketika:

- selesai deploy backend
- selesai ubah auth, routing, middleware, atau proxy
- ingin memastikan staging siap untuk benchmark yang lebih berat

Keputusan yang bisa diambil dari hasil smoke:

- jika smoke gagal, jangan lanjut ke load atau stress
- jika smoke lolos, environment cukup sehat untuk benchmark berikutnya

### 2. Release Baseline Benchmark

Gunakan ini saat ingin mengukur performa operasi normal dan peak.

Urutan command:

```bash
pnpm k6:smoke
pnpm k6:load:baseline
pnpm k6:load:peak
```

Gunakan mode ini ketika:

- sebelum release candidate
- setelah optimasi query, cache, atau infra
- saat ingin membandingkan performa antar commit atau antar environment

Apa yang diuji:

- latency baseline
- latency peak
- error rate pada traffic normal
- kestabilan throughput lintas modul utama

### 3. Capacity and Bottleneck Discovery

Gunakan ini saat ingin tahu batas sistem mulai turun kualitasnya.

Command utama:

```bash
pnpm k6:stress:quick
pnpm k6:stress:full
```

Gunakan mode ini ketika:

- mau cari breaking point
- mau validasi scaling result
- mau cek efek tuning connection pool, Redis, worker, atau DB

Apa yang diuji:

- kapan error rate mulai naik
- kapan p95 dan p99 melewati SLO
- endpoint mana yang lebih dulu gagal saat tekanan naik

### 4. Long-Run Stability

Gunakan ini untuk melihat apakah sistem stabil saat dibebani lebih lama.

Command utama:

```bash
pnpm k6:soak
```

Gunakan mode ini ketika:

- ingin mendeteksi kebocoran resource
- ingin melihat drift latency, error, atau connection exhaustion
- ingin validasi sistem sebelum milestone besar

### 5. Business Transaction Validation

Gunakan ini saat fokusnya bukan cuma cepat atau lambat, tapi apakah alur bisnis tetap benar di bawah load.

Command utama:

```bash
pnpm k6:transaction
pnpm k6:transaction:local
pnpm k6:transaction:extended
```

Gunakan mode ini ketika:

- menguji sales revenue cycle end-to-end
- menginvestigasi race condition, duplicate payment, atau duplicate document code
- memvalidasi bahwa perubahan backend tidak merusak kontrak workflow inti

Apa yang diuji:

- create SQ
- convert ke SO
- create DO
- create invoice
- create dan confirm payment
- penolakan payment kedua atau konflik yang diharapkan

## Recommended Run Sequence by Goal

### Goal: Quick sanity check

```bash
pnpm k6:smoke
```

### Goal: Standard benchmark before release

```bash
pnpm k6:smoke
pnpm k6:load:baseline
pnpm k6:load:peak
pnpm k6:stress:quick
```

### Goal: Full benchmark package

```bash
pnpm k6:smoke
pnpm k6:load:baseline
pnpm k6:load:peak
pnpm k6:stress:quick
pnpm k6:stress:full
pnpm k6:soak
```

### Goal: Investigate Sales transaction flow

```bash
pnpm k6:transaction:local
pnpm k6:transaction
pnpm k6:transaction:extended
```

## Script Selection Guide

| If your question is... | Use this |
| --- | --- |
| Apakah environment hidup? | [../smoke-test.js](../smoke-test.js) |
| Berapa baseline latency di traffic normal? | [../load-test.js](../load-test.js) |
| Kapan sistem mulai gagal saat load naik? | [../stress-test.js](../stress-test.js) |
| Apakah workflow Sales tetap benar di bawah load? | [../transaction-test.js](../transaction-test.js) |
| Apa urutan benchmark standar tim? | [../benchmark-matrix.md](../benchmark-matrix.md) |
| Apa konteks roadmap dan phase-nya? | [./K6_MATURITY_ROADMAP.md](./K6_MATURITY_ROADMAP.md) |

## Artifacts and Output Handling

Hasil benchmark yang bernilai jangka panjang sebaiknya disimpan sebagai artefak.

Format yang saat ini dipakai di repo:

- summary JSON per run di `k6/reports/`
- baseline markdown report hasil agregasi di `k6/reports/`

Utility yang dipakai:

- [../reports/generate-baseline-report.js](../reports/generate-baseline-report.js)

Prinsip pembacaannya:

- JSON adalah sumber data mentah
- report markdown adalah ringkasan untuk manusia
- benchmark matrix memberi konteks pass/fail

## How This Playbook Fits the Roadmap

### Sekarang

Yang paling relevan hari ini adalah kombinasi:

- baseline suite dari Phase 1
- transaction suite dari Phase 1.5

### Berikutnya

Saat Phase 1.5 stabil, suite yang sama akan dipasang ke quality gate Phase 2.

Itu sebabnya execution model saat ini sudah dipisah jelas:

- smoke untuk gate cepat
- load/stress untuk performa sistem
- transaction untuk integritas bisnis

## Practical Notes for This Repository

Beberapa hal penting spesifik untuk implementasi GIMS saat ini:

- `transaction-test.js` adalah script paling sensitif terhadap contract drift backend.
- `load-test.js` lebih aman untuk baseline karena mayoritas read-only.
- `stress-test.js` berguna untuk melihat bottleneck, tetapi bukan pengganti transaction validation.
- jika ada error 500 di `transaction-test.js`, itu sering kali berarti bug bisnis atau race condition backend, bukan sekadar hasil benchmark biasa.

## Suggested Team Usage

### Backend engineer

Fokus utama:

- [../transaction-test.js](../transaction-test.js)
- [../load-test.js](../load-test.js)
- [../benchmark-matrix.md](../benchmark-matrix.md)

### QA or performance tester

Fokus utama:

- [../README.md](../README.md)
- [./K6_EXECUTION_PLAYBOOK.md](./K6_EXECUTION_PLAYBOOK.md)
- [../reports/](../reports)

### Lead or reviewer

Fokus utama:

- [./K6_MATURITY_ROADMAP.md](./K6_MATURITY_ROADMAP.md)
- [./PHASE1.5_ENHANCED_TEST_SUITE.md](./PHASE1.5_ENHANCED_TEST_SUITE.md)
- [./K6_TEST_SUITE_ARCHITECTURE.md](./K6_TEST_SUITE_ARCHITECTURE.md)
