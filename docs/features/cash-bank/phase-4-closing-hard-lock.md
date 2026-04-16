# Phase 4: Closing Hard Lock & Year-End Hardening

> **Module:** Finance / Cash & Bank + Accounting Control  
> **Phase:** 4 - Closing Hard Lock  
> **Version:** 1.0  
> **Status:** Planned / In Progress  
> **Last Updated:** April 2026

---

## Table of Contents
1. [Overview](#overview)
2. [Closing Hard Lock](#closing-hard-lock)
3. [Year-End Close Hardening](#year-end-close-hardening)
4. [System Architecture](#system-architecture)
5. [Data Contracts](#data-contracts)
6. [API Reference](#api-reference)
7. [Business Rules](#business-rules)
8. [Use Case by Role](#use-case-by-role)
9. [Manual Testing Checklist](#manual-testing-checklist)
10. [Integration Points](#integration-points)

---

## Overview

**Phase 4** menambahkan lapisan pengunci final pada modul finance agar semua jalur posting benar-benar tunduk pada period lock dan year-end close berjalan aman, idempotent, dan mudah diaudit.

### Scope
- **Closing Hard Lock**
  - Enforcement period lock di semua jalur posting
  - Validasi create/update/post/reverse terhadap status periode
  - Penolakan eksplisit untuk transaksi backdated ke periode terkunci
- **Year-End Close Hardening**
  - Dry run year-end close sebelum eksekusi
  - Idempotency guard untuk mencegah double close
  - Reopen hanya untuk closing terbaru yang approved

### Key Principle
**Periode yang sudah ditutup tidak boleh menerima posting baru.** Jika ada koreksi, harus melalui reopen/rollback flow yang terkontrol, bukan bypass langsung ke jurnal.

---

## Closing Hard Lock

### Feature Overview

| Feature | Description | Role | Permission |
|---------|-------------|------|------------|
| Validate Period Lock | Menolak create/update/post bila tanggal transaksi masuk periode closed | System | (Auto) |
| Enforce Lock on Journal Posting | Semua jalur posting jurnal wajib cek closing guard | System | (Auto) |
| Enforce Lock on Cash-Bank Posting | Transaksi kas/bank tidak bisa diposting ke periode terkunci | Cashier, Finance | `cash_bank_transaction.post` |
| Enforce Lock on Payments | Payment approval/posting wajib tunduk ke period lock | Cashier, Accountant | `payment.post` |
| Enforce Lock on Reversal | Reversal juga harus mengikuti aturan periode open/allowed reversal window | Accountant | `journal.reverse` |
| Period Lock Alert | Menampilkan alasan penolakan yang jelas saat periode terkunci | Finance, Auditor | `journal.read` |

### User Journey (Closing Hard Lock)

1. User membuka form transaksi keuangan.
2. Sistem membaca tanggal transaksi dan fiscal period aktif.
3. Jika periode masih open, user dapat melanjutkan save/post.
4. Jika periode closed, sistem menolak aksi dengan error yang jelas.
5. User diarahkan untuk membuat transaksi pada periode yang masih open atau meminta reopen melalui approval flow.

### Workflow State

```text
OPEN
  -> approve-close -> CLOSED
CLOSED
  -> reopen-request -> REOPEN_REQUESTED
  -> reopen-approve -> OPEN
```

---

## Year-End Close Hardening

### Feature Overview

| Feature | Description | Role | Permission |
|---------|-------------|------|------------|
| Dry Run Year-End Close | Simulasi sebelum eksekusi close final | Finance Manager | `financial_closing.read` |
| Execute Year-End Close | Posting penutupan tahunan ke retained earnings | Finance Manager | `financial_closing.year_end` |
| Idempotency Guard | Mencegah close dua kali untuk fiscal year yang sama | System | (Auto) |
| Reopen Latest Approved Closing | Membuka kembali closing terakhir yang approved | Finance Manager | `financial_closing.reopen` |
| Audit Closing Result | Menyimpan jejak hasil close dan siapa yang mengeksekusi | Auditor, Finance Manager | `financial_closing.read` |

### User Journey (Year-End Close)

1. Finance Manager membuka halaman closing.
2. Sistem menampilkan analisis saldo akhir dan hasil simulasi year-end close.
3. User memverifikasi semua akun revenue/expense yang akan ditutup.
4. User menekan execute jika hasil dry run valid.
5. Sistem mem-post jurnal penutup ke retained earnings.
6. Fiscal year dikunci dan hanya bisa dibuka melalui reopen flow yang sah.

### Year-End Flow

```text
PRE-CHECK
  -> REVIEW
  -> EXECUTE
  -> COMPLETE
```

---

## System Architecture

### Backend Structure (Go/Gin)

```text
internal/finance/
├── domain/usecase/
│   ├── closing_guard.go                 # Period lock validation across posting flows
│   └── financial_closing_usecase.go     # Year-end close and reopen logic
├── presentation/router/
│   ├── journal_entry_routers.go         # Posting endpoints guarded by closing lock
│   └── financial_closing_routers.go     # Closing, analysis, reopen, year-end close
└── presentation/handler/
    ├── journal_entry_handler.go
    └── financial_closing_handler.go
```

### Frontend Structure (Next.js + React)

```text
src/features/finance/closing/
├── components/
│   ├── closing-list.tsx
│   ├── closing-detail.tsx
│   ├── closing-wizard.tsx
│   └── period-lock-alert.tsx
├── hooks/
│   └── use-finance-closing.ts
├── services/
│   └── finance-closing-service.ts
└── types/
    └── index.d.ts
```

### Enforcement Flow

```text
User Action -> Load Period -> Check Closing Guard ->
  Open Period? yes -> Continue Posting
  Open Period? no  -> Reject with PERIOD_CLOSED
```

---

## Data Contracts

### Closing Analysis Row

```json
{
  "account_id": "uuid",
  "account_code": "1101",
  "account_name": "Cash on Hand",
  "opening_balance": 800000,
  "closing_balance": 1000000,
  "difference": 200000,
  "is_locked": true
}
```

### Financial Closing Entity

```json
{
  "id": "uuid",
  "period_end_date": "2026-03-31",
  "status": "draft|approved|closed",
  "approved_at": "2026-04-16T11:00:00+07:00",
  "approved_by": "employee_uuid",
  "year_end_closed_at": "2026-04-16T11:05:00+07:00",
  "year_end_closed_by": "employee_uuid"
}
```

### Period Lock Decision

```json
{
  "allowed": false,
  "reason": "PERIOD_CLOSED",
  "message": "Posting is blocked because the selected period has already been closed."
}
```

---

## API Reference

### Closing Controls

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | /api/v1/finance/closing | financial_closing.read | List closing records |
| GET | /api/v1/finance/closing/:id/analysis | financial_closing.read | Get closing analysis rows |
| POST | /api/v1/finance/closing | financial_closing.create | Create closing draft |
| POST | /api/v1/finance/closing/:id/approve | financial_closing.approve | Approve closing |
| POST | /api/v1/finance/closing/:id/reopen | financial_closing.reopen | Reopen approved closing |
| DELETE | /api/v1/finance/closing/:id | financial_closing.delete | Delete closing draft |
| POST | /api/v1/finance/closing/year-end-close | financial_closing.year_end | Execute year-end close |

### Lock Enforcement Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | /api/v1/finance/journals | journal.create | Blocked automatically if period is closed |
| POST | /api/v1/finance/journals/:id/post | journal.post | Blocked automatically if period is closed |
| POST | /api/v1/finance/journals/:id/reverse | journal.reverse | Blocked automatically if period is closed or beyond reversal window |
| POST | /api/v1/finance/cash-bank/:id/post | cash_bank_transaction.post | Blocked automatically if period is closed |
| POST | /api/v1/finance/payments/:id/approve | payment.post | Blocked automatically if period is closed |

---

## Business Rules

1. Semua jalur posting wajib memanggil closing guard sebelum commit.
2. Transaksi pada periode closed harus ditolak dengan error yang eksplisit.
3. Reversal tidak boleh dipakai sebagai cara untuk menembus closing lock.
4. Year-end close hanya boleh dijalankan sekali untuk satu fiscal year aktif.
5. Reopen hanya bisa dilakukan dari closing terakhir yang sudah approved.
6. Dry run year-end close harus lolos sebelum execute final.
7. Semua timestamp closing mengikuti timezone aplikasi melalui `apptime`.
8. Jika close gagal di tengah proses, sistem harus rollback penuh dan tetap idempotent.

---

## Use Case by Role

| Role | Main Actions in Phase 4 |
|------|-------------------------|
| Finance Staff | Membuat transaksi, menerima notifikasi penolakan jika periode closed |
| Accountant | Melakukan review, reversal valid, dan verifikasi dampak closing |
| Finance Manager | Approve closing, jalankan year-end close, reopen bila diperlukan |
| Auditor/Internal Control | Audit period lock, hasil dry run, dan jejak eksekusi year-end close |

---

## Manual Testing Checklist

### Closing Hard Lock

1. Buat transaksi dengan tanggal pada periode open, lalu post.
2. Tutup periode tersebut dari menu closing.
3. Coba buat transaksi baru dengan tanggal yang sama.
4. Verifikasi sistem menolak aksi dengan pesan `PERIOD_CLOSED`.
5. Coba reverse jurnal pada periode yang terkunci dan pastikan tetap ditolak jika melewati rule.

### Year-End Close Hardening

1. Buat closing draft untuk fiscal year berjalan.
2. Jalankan dry run dan cek hasil analysis.
3. Execute year-end close sekali.
4. Coba execute ulang dan pastikan sistem menolak double close.
5. Reopen closing terakhir yang approved dan verifikasi periode kembali open.

---

## Integration Points

| Module | Integration in Phase 4 |
|--------|------------------------|
| Journal Engine | Semua posting jurnal wajib tunduk pada closing guard |
| Cash-Bank Operations | Payment in/out dan transfer tidak bisa menembus periode closed |
| Financial Closing | Closing, reopen, dan year-end close menjadi kontrol final |
| Reports | Trial balance, GL, dan closing analysis membaca status locked/open |
| Audit & Compliance | Semua penolakan dan eksekusi close harus tercatat |

---

## Related Documents

- [phase-0-opening-balance.md](phase-0-opening-balance.md)
- [phase-1-journal-engine.md](phase-1-journal-engine.md)
- [phase-2-operations.md](phase-2-operations.md)
- [phase-3-adjustment-closing.md](phase-3-adjustment-closing.md)
- [journal-architecture-blueprint.md](../finance/journal-architecture-blueprint.md)
