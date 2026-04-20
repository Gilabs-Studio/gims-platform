# Phase 6: Purchase-Finance Cash-Bank Orchestration & Batch Settlement

> **Module:** Finance / Cash & Bank + Purchase Integration
> **Phase:** 6 - Payment Orchestration & Batch Settlement
> **Version:** 1.0
> **Status:** Implemented / Stabilizing
> **Last Updated:** April 2026

---

## Table of Contents
1. [Overview](#overview)
2. [Phase 6 Goals](#phase-6-goals)
3. [Process Alignment](#process-alignment)
4. [System Architecture](#system-architecture)
5. [Data Contracts](#data-contracts)
6. [API Reference](#api-reference)
7. [Business Rules](#business-rules)
8. [Use Case by Role](#use-case-by-role)
9. [Manual Testing Checklist](#manual-testing-checklist)
10. [Integration Points](#integration-points)
11. [Notes & Future Improvements](#notes--future-improvements)

---

## Overview

**Phase 6** mengisi gap antara phase 5 (stabilization/reporting) dan phase 7 (sales posting reliability) dengan fokus pada alur pembayaran purchase yang berdampak langsung ke cash-bank dan jurnal.

Fase ini menstandarkan dua area operasional utama:

- **Batch supplier payment** untuk multi-invoice dalam satu aksi operasional.
- **Cash-bank orchestration** saat konfirmasi payment agar posting kas keluar konsisten dan dapat ditelusuri dari dokumen purchase.

### Scope

- Canonical API untuk single payment dan batch payment purchase.
- Konfirmasi payment yang atomic (status invoice + accounting diproses dalam satu transaksi DB).
- Integrasi purchase payment ke `cash_bank_transactions` (auto-post `payment_out`) saat dependency tersedia.
- Penyimpanan link trace `cash_bank_transaction_id` di purchase payment.
- Reverse accounting yang mengikuti sumber posting (cash-bank dulu, fallback journal bila perlu).
- Compatibility alias endpoint PATCH untuk flow confirm/post.

### Key Principle

**Supplier payment confirmation harus all-or-nothing.** Jika posting accounting gagal, status payment/invoice tidak boleh berubah setengah jalan.

---

## Phase 6 Goals

| Feature | Description | Role | Permission |
|--------|-------------|------|------------|
| Single Purchase Payment | Buat 1 payment pending untuk 1 supplier invoice | AP Staff, Finance Officer | `purchase_payment.create` |
| Batch Purchase Payment | Buat beberapa payment pending lintas invoice dalam satu request | AP Staff, Finance Officer | `purchase_payment.create` |
| Atomic Confirm | Konfirmasi payment + update invoice + posting accounting dalam 1 transaksi | AP Staff, Finance Officer | `purchase_payment.confirm` |
| Cash-Bank Linkage | Simpan `cash_bank_transaction_id` di payment detail untuk traceability | Accountant, Auditor | `purchase_payment.read` |
| Batch Confirm | Konfirmasi beberapa payment sekaligus dengan guard dedupe | AP Lead, Finance Officer | `purchase_payment.confirm` |
| Backward Route Compatibility | Alias endpoint `/post` dan `/confirm` berbasis PATCH | Existing clients | `purchase_payment.confirm` |

### Operational Journey

1. User membuat payment pending (single atau batch).
2. Sistem memvalidasi invoice status, amount, dan bank account aktif.
3. Saat confirm, sistem lock payment + invoice rows.
4. Sistem update paid/remaining/status invoice berdasarkan total settlement (termasuk DP).
5. Sistem posting accounting:
   - Prefer `cash_bank_transactions` (`payment_out`, auto-post).
   - Fallback ke journal purchase payment bila cash-bank dependency tidak tersedia.
6. Sistem menyimpan link transaction (`cash_bank_transaction_id`) untuk audit trail.

### High-Level Flow

```text
CREATE PENDING (SINGLE/BATCH) -> CONFIRM (ATOMIC) ->
UPDATE INVOICE SETTLEMENT -> POST CASH-BANK/JOURNAL -> STORE TRACE LINK
```

---

## Process Alignment

### 1. Create Pending Payment (Single)

- Endpoint: `POST /api/v1/purchase/payments`
- Guard utama:
  - Invoice status harus salah satu: `UNPAID`, `PARTIAL`, `WAITING_PAYMENT`.
  - `amount > 0` dan tidak boleh melebihi `remaining_amount` invoice.
  - `bank_account_id` wajib ada dan `is_active=true`.
  - Method hanya `BANK` atau `CASH`.
- Jika request identik ditemukan pada pending payment terbaru (idempotency retry), sistem mengembalikan payment pending yang sama.

### 2. Create Pending Payment (Batch)

- Endpoint: `POST /api/v1/purchase/payments/batch`
- Guard tambahan:
  - `items` minimal 1.
  - `invoice_id` dalam batch tidak boleh duplikat.
  - Setiap invoice tidak boleh sudah punya pending payment lain.
  - Setiap amount item harus valid dan tidak melebihi outstanding invoice.
- Output: daftar payment detail + `total_amount` + `count`.

### 3. Confirm Payment (Single/Batch)

- Endpoints:
  - Single: `POST /:id/confirm`, `PATCH /:id/confirm`, `PATCH /:id/post`
  - Batch: `PATCH /batch/confirm`, `PATCH /batch/post`
- Proses utama:
  - Hanya payment status `PENDING` yang dapat dikonfirmasi.
  - Hitung `totalSettled = sum(confirmed payments) + current payment + down_payment_amount`.
  - Tolak jika `totalSettled` melewati nilai invoice.
  - Update invoice `status`, `paid_amount`, `remaining_amount`, dan `payment_at`.

### 4. Accounting Posting Strategy

Pada confirm, posting accounting dijalankan di transaction yang sama:

1. **Primary path:** create `cash_bank_transaction` (`type=payment_out`, `auto_post=true`).
2. Simpan `cash_bank_transaction_id` ke payment record.
3. **Fallback path:** jika dependency cash-bank tidak tersedia, posting via journal purchase payment.

### 5. Reverse Strategy

- Reverse payment hanya valid untuk status `CONFIRMED`.
- Invoice di-recalculate ulang (status, paid, remaining) pasca reverse.
- Reversal accounting:
  - Jika ada `cash_bank_transaction_id`, reverse cash-bank transaction.
  - Jika tidak ada, reverse journal berdasarkan reference purchase payment.

---

## System Architecture

### Backend Structure (Go/Gin)

```text
internal/purchase/
├── data/models/
│   └── purchase_payment.go                 # includes cash_bank_transaction_id
├── domain/dto/
│   └── purchase_payment_dto.go             # single+batch contracts
├── domain/usecase/
│   └── purchase_payment_usecase.go         # create/confirm/reverse orchestration
├── presentation/handler/
│   └── purchase_payment_handler.go
└── presentation/router/
    └── purchase_payment_routers.go

internal/finance/
├── domain/usecase/
│   └── cash_bank_transaction_usecase.go    # payment_out create/reverse
└── presentation/routes.go                  # exposes CashBankTransactionUC via FinanceDeps
```

### Wiring Pattern

- Finance module mengekspos `CashBankTransactionUC` pada `FinanceDeps`.
- Purchase module menerima dependency itu saat register routes.
- Purchase payment usecase memilih jalur posting otomatis berdasarkan ketersediaan dependency tersebut.

### Posting Flow (Phase 6)

```text
PurchasePayment Confirm -> postPaymentAccounting
  -> CashBankTransaction.Create (payment_out, auto-post)
  -> update purchase_payments.cash_bank_transaction_id
  -> (fallback) Purchase journal posting
```

---

## Data Contracts

### Create Batch Payment Request

```json
{
  "bank_account_id": "uuid",
  "payment_date": "2026-04-20",
  "method": "BANK",
  "reference_number": "BATCH-AP-001",
  "notes": "optional",
  "items": [
    {
      "invoice_id": "uuid",
      "amount": 1500000
    },
    {
      "invoice_id": "uuid",
      "amount": 2750000
    }
  ]
}
```

### Confirm Batch Request

```json
{
  "payment_ids": ["uuid-1", "uuid-2", "uuid-3"]
}
```

### Purchase Payment Detail (Excerpt)

```json
{
  "id": "uuid",
  "payment_date": "2026-04-20",
  "amount": 2750000,
  "method": "BANK",
  "status": "CONFIRMED",
  "reference_number": "BATCH-AP-001",
  "cash_bank_transaction_id": "uuid"
}
```

### Batch Response (Excerpt)

```json
{
  "payments": [
    {
      "id": "uuid",
      "status": "CONFIRMED"
    }
  ],
  "total_amount": 4250000,
  "count": 2
}
```

---

## API Reference

### Purchase Payment Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/purchase/payments/add` | `purchase_payment.create` | Get form data (bank accounts + payable invoices) |
| GET | `/api/v1/purchase/payments` | `purchase_payment.read` | List purchase payments |
| GET | `/api/v1/purchase/payments/export` | `purchase_payment.export` | Export payment list |
| POST | `/api/v1/purchase/payments` | `purchase_payment.create` | Create single pending payment |
| POST | `/api/v1/purchase/payments/batch` | `purchase_payment.create` | Create batch pending payments |
| GET | `/api/v1/purchase/payments/:id` | `purchase_payment.read` | Payment detail |
| GET | `/api/v1/purchase/payments/:id/audit-trail` | `purchase_payment.read` | Payment audit trail |
| DELETE | `/api/v1/purchase/payments/:id` | `purchase_payment.delete` | Delete pending payment |
| POST | `/api/v1/purchase/payments/:id/confirm` | `purchase_payment.confirm` | Confirm single payment |
| PATCH | `/api/v1/purchase/payments/:id/confirm` | `purchase_payment.confirm` | Confirm single payment (alias) |
| PATCH | `/api/v1/purchase/payments/:id/post` | `purchase_payment.confirm` | Confirm single payment (legacy alias) |
| PATCH | `/api/v1/purchase/payments/batch/confirm` | `purchase_payment.confirm` | Confirm multiple payments |
| PATCH | `/api/v1/purchase/payments/batch/post` | `purchase_payment.confirm` | Confirm multiple payments (legacy alias) |

---

## Business Rules

1. Payment creation membutuhkan actor terautentikasi.
2. Method payment hanya `BANK` atau `CASH`.
3. Invoice yang boleh diproses hanya berstatus `UNPAID`, `PARTIAL`, atau `WAITING_PAYMENT`.
4. Amount harus `> 0` dan tidak boleh melebihi `remaining_amount` invoice.
5. Bank account harus aktif (`is_active=true`).
6. Untuk batch create, invoice di dalam request tidak boleh duplikat.
7. Untuk batch create, invoice tidak boleh sudah memiliki pending payment lain.
8. Hanya payment `PENDING` yang boleh di-confirm atau di-delete.
9. Confirm payment menghitung settlement dengan memperhitungkan down payment invoice (`down_payment_amount`).
10. Confirm ditolak jika settlement melebihi amount invoice.
11. Jika invoice normal sudah fully paid, purchase order terkait ditutup (`closed`).
12. Jika yang confirmed adalah DP invoice, regular invoice dalam PO terkait direkalkulasi terhadap total DP yang telah paid.
13. Posting accounting pada confirm harus atomic dengan update status payment/invoice.
14. Saat cash-bank dependency tersedia, payment confirm harus menghasilkan `cash_bank_transaction` dan menyimpan link ID ke payment.
15. Reverse payment mengikuti sumber posting: reverse cash-bank transaction bila linked ID tersedia; fallback reverse journal bila tidak.

---

## Use Case by Role

| Role | Main Actions in Phase 6 |
|------|-------------------------|
| AP Staff | Create single/batch pending payment, review add-data, confirm payment |
| Finance Officer | Menjalankan confirm payment harian dan memonitor konflik outstanding |
| Accountant | Verifikasi posting cash-bank/journal dan rekonsiliasi trace `cash_bank_transaction_id` |
| AP Lead | Mengelola batch confirm, memastikan tidak ada over-settlement |
| Auditor | Menelusuri payment -> cash-bank transaction -> journal posted |

---

## Manual Testing Checklist

### Single Payment

1. Buat payment pending untuk invoice `UNPAID`.
2. Pastikan create gagal untuk amount `<= 0` atau melebihi outstanding.
3. Confirm payment, verifikasi status payment menjadi `CONFIRMED`.
4. Verifikasi invoice `paid_amount`, `remaining_amount`, dan `status` ter-update.
5. Verifikasi `cash_bank_transaction_id` terisi pada payment detail.

### Batch Payment

1. Kirim batch create dengan minimal 2 invoice valid.
2. Pastikan duplicate `invoice_id` dalam request ditolak.
3. Confirm batch menggunakan `payment_ids`.
4. Verifikasi response mengembalikan `count` dan `total_amount` sesuai hasil.
5. Pastikan semua payment batch tercatat audit log `purchase_payment.batch_create` dan `purchase_payment.batch_confirm`.

### Reversal

1. Reverse payment yang sudah `CONFIRMED`.
2. Verifikasi status payment menjadi `REVERSED`.
3. Verifikasi invoice direkalkulasi ulang (status/paid/remaining).
4. Jika payment punya `cash_bank_transaction_id`, verifikasi cash-bank transaction ikut reversed.
5. Jika tidak ada linked ID, verifikasi fallback reversal journal berjalan.

---

## Integration Points

| Module | Integration in Phase 6 |
|--------|------------------------|
| Purchase Supplier Invoice | Sumber outstanding dan status payable untuk payment creation/confirm |
| Purchase Order | Auto-close saat invoice normal fully paid |
| Finance Cash-Bank Transaction | Primary posting path untuk `payment_out` saat confirm |
| Finance Journal Engine | Fallback posting/reversal path saat cash-bank path tidak tersedia |
| Finance Settings + COA | Resolusi contra account (`coa.purchase_payable` / `coa.purchase_advance`) |
| Audit Service | Event log create/confirm/batch/reverse |

---

## Notes & Future Improvements

- **Known Limitation**:
  - Reverse payment belum diekspos sebagai endpoint publik khusus pada router purchase payment.
  - Validasi granular per-item reason pada batch conflict belum diekspos detail ke client.

- **Future Improvement**:
  - Tambah endpoint reverse payment yang eksplisit dengan permission terpisah.
  - Tambah observability dashboard untuk chain `purchase_payment -> cash_bank_transaction -> journal`.
  - Tambah idempotency key explicit untuk batch requests (bukan hanya dedupe by state).
  - Tambah contract-level integration test untuk fallback path ketika cash-bank dependency tidak tersedia.

## Related Documents

- [phase-5-stabilization-reporting.md](phase-5-stabilization-reporting.md)
- [phase-7-reserved-placeholder.md](phase-7-reserved-placeholder.md)
- [phase-8-ar-ap-aging-ntp-cash-flow.md](phase-8-ar-ap-aging-ntp-cash-flow.md)
- [CASH_BANK_MASTER.md](CASH_BANK_MASTER.md)