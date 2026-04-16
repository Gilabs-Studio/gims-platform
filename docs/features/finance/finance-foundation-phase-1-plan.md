# Finance Foundation Phase 1 Plan

> **Module:** Finance
> **Sprint:** Foundation / Phase 1
> **Version:** 0.2.0
> **Status:** Ready for Execution (Code-Audited)
> **Last Updated:** April 15, 2026

## Overview

Dokumen ini berisi backlog Phase 1 yang diturunkan dari audit file implementasi aktual Phase 0.

Baseline implementasi yang sudah selesai:
- [finance-foundation-change-log-2026-04-13.md](finance-foundation-change-log-2026-04-13.md)

## Audit-Driven Gap Summary

### Sudah selesai di Phase 0
- Endpoint foundation (fiscal year, tax, inventory settings, opening balance) sudah aktif.
- Opening balance wizard sudah menggunakan save-on-next (menghindari overwrite autosave agresif).
- Journal lifecycle sudah mendukung cancel/reverse/post dengan status `cancelled`.
- Canonical route frontend ke `/finance/journals` sudah dipakai.

### Masih menjadi target Phase 1
- Hardening observability dan explainability saat side effect posting tidak lengkap.
- Konsolidasi konsistensi scope antar endpoint (query/body/path) agar contract seragam.
- Penguatan test coverage lintas flow foundation dan lifecycle jurnal.
- Sinkronisasi final ownership account mapping lintas settings dan posting.

## Objectives

1. Menutup gap reliability pada posting side effects dan audit trail.
2. Menstandarkan contract scope endpoint untuk mengurangi mismatch frontend-backend.
3. Meningkatkan confidence release lewat test coverage dan regression checklist.
4. Menetapkan ownership final account mapping sebagai source tunggal posting configuration.

## Scope (Phase 1)

### 1. Posting Side-Effect Hardening
- Tambahkan warning/error terstruktur saat opening balance line terkait bank account tidak punya mapping aktif.
- Tambahkan event/audit log yang eksplisit untuk side effect yang berhasil/gagal parsial.
- Definisikan perilaku rollback yang tegas untuk kondisi side effect kritikal.

### 2. Scope Contract Consistency
- Standarkan penggunaan `company_id` dan `fiscal_year_id` (query vs body) untuk endpoint foundation.
- Pastikan format request/response konsisten dengan API standards di seluruh endpoint baru.
- Tambahkan validasi ownership/scope yang seragam di handler/usecase.

### 3. UX Explainability and Recovery
- Perkaya payload simulation opening balance agar alasan `REVIEW_REQUIRED` lebih granular dan actionable.
- Tambahkan UX hint yang lebih jelas pada step summary/post saat data belum memenuhi syarat.
- Sediakan mekanisme recovery state yang aman tanpa menimpa draft pengguna.

### 4. Test and Regression Expansion
- Tambahkan integration test untuk:
  - posting opening balance end-to-end,
  - lock fiscal year dengan kombinasi kondisi opening balance dan jurnal posted,
  - journal cancel/reverse lifecycle.
- Tambahkan regression checklist lintas frontend-backend untuk route canonical jurnal.

### 5. Accounting Mapping Ownership Finalization
- Pastikan seluruh account-level shared configuration (termasuk rounding/adjustment ownership) terpusat di Accounting Mapping.
- Cegah duplikasi konfigurasi account pada module settings lain.

## Delivery Plan

1. API contract harmonization and validation pass.
2. Side-effect observability and audit improvements.
3. Simulation/explainability payload enhancement.
4. Integration/regression test additions.
5. Documentation and rollout checklist update.

## Risks and Dependencies

- Kualitas data seed dan keterhubungan COA-bank-account akan memengaruhi hasil hardening side effect.
- Lingkungan test dengan dependency CGO/WebP dapat membatasi full automated run; perlu fallback strategy di pipeline.
- Perubahan contract endpoint perlu koordinasi sinkron frontend agar tidak memutus flow operasional.

## Definition of Done

- Semua target Phase 1 di atas terimplementasi dan tervalidasi.
- Tidak ada regression pada flow Phase 0 yang sudah berjalan.
- Changelog dan plan tetap sinkron dengan status implementasi terkini.
