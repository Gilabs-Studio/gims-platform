# k6 Clean Architecture Map

## Purpose

Dokumen ini menjelaskan bagaimana dokumentasi `k6/docs` dipecah ke struktur berlapis supaya lebih mudah dipahami dan dirawat.

Struktur ini tidak mencoba memaksa script k6 menjadi aplikasi clean architecture penuh. Tujuannya adalah membuat dokumentasi mengikuti pola berpikir clean architecture:

- layer paling dalam menjelaskan tujuan domain benchmark
- layer tengah menjelaskan use case benchmark per script
- layer luar menjelaskan komponen teknis pendukung seperti auth, config, dan reporting

## Folder Structure

```text
k6/docs/
├── INDEX.md
├── architecture/
│   └── CLEAN_ARCHITECTURE_MAP.md
├── use-cases/
│   ├── SMOKE_TEST_DETAILED.md
│   ├── LOAD_TEST_DETAILED.md
│   ├── STRESS_TEST_DETAILED.md
│   └── TRANSACTION_TEST_DETAILED.md
├── infrastructure/
│   └── FOUNDATION_COMPONENTS.md
├── K6_PRD.md
├── K6_MATURITY_ROADMAP.md
├── PHASE1.5_ENHANCED_TEST_SUITE.md
└── PHASE2_QUICKSTART.md
```

## Layer Mapping

### 1. Domain and Strategy Layer

Dokumen di layer ini menjelaskan kenapa benchmark ada dan target bisnis apa yang ingin dilindungi.

- [../K6_PRD.md](../K6_PRD.md)
- [../K6_MATURITY_ROADMAP.md](../K6_MATURITY_ROADMAP.md)
- [../PHASE1.5_ENHANCED_TEST_SUITE.md](../PHASE1.5_ENHANCED_TEST_SUITE.md)
- [../PHASE2_QUICKSTART.md](../PHASE2_QUICKSTART.md)

Peran layer ini:

- mendefinisikan tujuan benchmark
- mendefinisikan phase roadmap
- mendefinisikan area ekspansi berikutnya

### 2. Use Case Layer

Dokumen di layer ini menjelaskan perilaku tiap script benchmark sebagai use case yang bisa dijalankan.

- [../use-cases/SMOKE_TEST_DETAILED.md](../use-cases/SMOKE_TEST_DETAILED.md)
- [../use-cases/LOAD_TEST_DETAILED.md](../use-cases/LOAD_TEST_DETAILED.md)
- [../use-cases/STRESS_TEST_DETAILED.md](../use-cases/STRESS_TEST_DETAILED.md)
- [../use-cases/TRANSACTION_TEST_DETAILED.md](../use-cases/TRANSACTION_TEST_DETAILED.md)

Peran layer ini:

- menjelaskan apa yang terjadi saat script dijalankan
- menjelaskan input, setup, flow per iterasi, output, dan arti hasil
- menjelaskan kapan script dipakai dan kapan tidak

### 3. Infrastructure Layer

Dokumen di layer ini menjelaskan komponen teknis bersama yang dipakai oleh semua use case.

- [../infrastructure/FOUNDATION_COMPONENTS.md](../infrastructure/FOUNDATION_COMPONENTS.md)

Peran layer ini:

- menjelaskan `config.js`
- menjelaskan `auth-helper.js`
- menjelaskan artefak `reports/`
- menjelaskan helper validasi dan override environment variable

## Why This Structure Helps

Masalah umum pada dokumentasi benchmark adalah semua informasi bercampur di satu tempat. Akibatnya:

- engineer baru sulit tahu harus mulai dari mana
- sulit membedakan strategi jangka panjang dari perilaku script aktual
- sulit menjelaskan bug pada script transaction tanpa membuka kode langsung

Dengan struktur ini, alur bacanya menjadi lebih jelas:

1. baca strategi bila ingin tahu alasan benchmark ada
2. baca use case bila ingin tahu apa yang dilakukan script
3. baca infrastructure bila ingin tahu komponen teknis pendukung

## Recommended Reading Path

### Untuk memahami gambaran besar

1. [../K6_MATURITY_ROADMAP.md](../K6_MATURITY_ROADMAP.md)
2. [./CLEAN_ARCHITECTURE_MAP.md](./CLEAN_ARCHITECTURE_MAP.md)
3. [../use-cases/TRANSACTION_TEST_DETAILED.md](../use-cases/TRANSACTION_TEST_DETAILED.md)

### Untuk debugging script tertentu

1. baca dokumen di `use-cases/`
2. lanjut ke [../infrastructure/FOUNDATION_COMPONENTS.md](../infrastructure/FOUNDATION_COMPONENTS.md)
3. baru buka file script aslinya di folder `k6/`

### Untuk onboarding engineer baru

1. [../INDEX.md](../INDEX.md)
2. [./CLEAN_ARCHITECTURE_MAP.md](./CLEAN_ARCHITECTURE_MAP.md)
3. [../use-cases/SMOKE_TEST_DETAILED.md](../use-cases/SMOKE_TEST_DETAILED.md)
4. [../use-cases/LOAD_TEST_DETAILED.md](../use-cases/LOAD_TEST_DETAILED.md)
5. [../use-cases/TRANSACTION_TEST_DETAILED.md](../use-cases/TRANSACTION_TEST_DETAILED.md)
