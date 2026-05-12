# Finance Transaction Coverage

## Purpose

Dokumen ini menjelaskan bagaimana modul Finance saat ini tercakup dalam suite transaction k6.

Poin pentingnya: modul Finance belum punya workflow transaction mandiri yang runnable, tetapi sudah tersentuh secara tidak langsung melalui confirm payment di flow Sales.

## Current Coverage Status

Status saat ini: partially covered.

Coverage yang ada sekarang datang dari step berikut di flow Sales:

- create Sales Payment
- confirm Sales Payment

Secara bisnis, confirm payment biasanya menjadi titik yang memicu side effect accounting seperti journal entry atau posting receivable settlement.

## What Is Actually Being Tested Today

Yang benar-benar diuji hari ini:

- endpoint confirm payment bisa dipanggil setelah payment berhasil dibuat
- backend tidak gagal secara langsung saat confirm payment dijalankan
- flow bisnis Sales bisa berlanjut sampai tahap confirm

## What Is Not Yet Proven for Finance

Yang belum terbukti secara eksplisit oleh suite saat ini:

- debit dan credit journal benar-benar seimbang
- akun yang dipilih benar
- journal entry benar-benar tersimpan di DB dengan isi yang tepat
- posting accounting tahan terhadap concurrency sendiri

## Planned Finance Workflow in Phase 1.5

Roadmap sebelumnya sudah menyebut target Finance berikut:

- Journal Entry atomic debit/credit
- validasi accounting equation
- kemungkinan concurrent updates pada account yang sama

Saat workflow ini nanti diimplementasikan, Finance sebaiknya punya script atau sub-workflow yang secara eksplisit mengecek:

- sum debit = sum credit
- jurnal tidak tercipta separuh
- side effect rollback benar saat ada kegagalan

## Reading Relation to Sales

Untuk sekarang, bila ingin memahami coverage Finance yang nyata, bacalah [../sales/SALES_REVENUE_CYCLE_IMPLEMENTED.md](../sales/SALES_REVENUE_CYCLE_IMPLEMENTED.md) terutama pada step confirm payment.
