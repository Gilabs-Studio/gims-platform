# Phase 3: Adjustment Control & Financial Closing

> **Module:** Finance / Cash & Bank + Accounting Control  
> **Phase:** 3 - Period-End Governance  
> **Version:** 1.0  
> **Status:** Complete  
> **Last Updated:** April 2026

---

## Table of Contents
1. [Overview](#overview)
2. [Adjustment Journal Governance](#adjustment-journal-governance)
3. [Financial Closing & Year-End](#financial-closing--year-end)
4. [System Architecture](#system-architecture)
5. [Data Contracts](#data-contracts)
6. [API Reference](#api-reference)
7. [Business Rules](#business-rules)
8. [Use Case by Role](#use-case-by-role)
9. [Manual Testing Checklist](#manual-testing-checklist)
10. [Integration Points](#integration-points)

---

## Overview

**Phase 3** menambahkan lapisan kontrol periode akhir untuk memastikan jurnal penyesuaian dan proses tutup buku berjalan ter-governed, traceable, dan siap audit.

### Scope
- **Adjustment Journal Governance**
  - Submit approval workflow
  - Approve/reject decision + history timeline
  - Template-based prefill untuk mempercepat recurring adjustment
- **Financial Closing Governance**
  - Closing draft management
  - 4-step wizard: pre-check, review, execute, complete
  - Optional year-end close trigger

### Key Principle
**Tidak semua jurnal adjustment boleh langsung diposting tanpa kontrol.** Period-end action harus memiliki jejak approval dan analisis saldo sebelum closing di-approve.

---

## Adjustment Journal Governance

### Feature Overview

| Feature | Description | Role | Permission |
|---------|-------------|------|------------|
| List Adjustment Journals | Menampilkan jurnal adjustment dengan filter dan pagination | Finance, Accountant | adjustment_journal.read |
| Create/Update Adjustment | Membuat dan mengubah draft adjustment | Finance | adjustment_journal.create, adjustment_journal.update |
| Submit for Approval | Mengirim draft ke proses approval | Finance | adjustment_journal.submit |
| Approve/Reject Adjustment | Keputusan approval/reject | Approver | adjustment_journal.approve, adjustment_journal.reject |
| Approval History | Timeline aksi submitted/approved/rejected | Finance, Approver, Auditor | adjustment_journal.read |
| Post Adjustment | Posting adjustment yang valid | Finance | adjustment_journal.post |
| Reverse Adjustment | Reversal adjustment yang sudah posted | Finance/Accountant | adjustment_journal.reverse |
| Apply Journal Template | Prefill lines dari template | Finance | journal_template.use |

### User Journey (Adjustment)

1. User masuk ke halaman adjustment journals.
2. User buat draft jurnal adjustment.
3. User opsional apply template agar line jurnal terisi otomatis.
4. User submit approval.
5. Approver pilih approve atau reject.
6. Semua aksi tersimpan di approval history.
7. Jika approved dan valid, jurnal dapat diposting.
8. Jika ada kesalahan setelah posting, lakukan reversal (bukan edit posted entry).

### Workflow State

```text
DRAFT
  -> submit-approval
PENDING_APPROVAL (logical workflow state)
  -> approve -> READY/APPROVED_TO_POST
  -> reject  -> DRAFT/REJECTED
POSTED
  -> reverse -> REVERSED
```

---

## Financial Closing & Year-End

### Feature Overview

| Feature | Description | Role | Permission |
|---------|-------------|------|------------|
| Create Closing Draft | Membuat draft closing per period_end_date | Finance Manager | financial_closing.create |
| Closing Analysis | Menampilkan row saldo akhir vs saldo awal + selisih | Finance, Finance Manager | financial_closing.read |
| Approve Closing | Mengunci closing period | Finance Manager | financial_closing.approve |
| Reopen Closing | Membuka kembali closing yang approved | Finance Manager | financial_closing.reopen |
| Delete Draft Closing | Menghapus closing draft | Finance Manager | financial_closing.delete |
| Year-End Close | Proses tutup akhir tahun | Finance Manager | financial_closing.year_end |

### Closing Wizard (Frontend)

Wizard pada UI menstandardisasi flow approval closing menjadi 4 tahap:

1. **Pre-Check**
   - Load analysis
   - Ringkasan total akun, total closing/opening balance, total difference
2. **Review**
   - Tabel trial-balance-like rows per account
   - Validasi manual sebelum eksekusi
3. **Execute**
   - Konfirmasi approve closing
4. **Complete**
   - Success state
   - Opsi lanjut year-end close (optional)

### User Journey (Closing)

1. Finance Manager membuat closing draft.
2. Sistem menyiapkan data analisis saldo.
3. Finance Manager menjalankan closing wizard.
4. Review hasil analisis per akun.
5. Approve closing.
6. Opsional lanjut year-end close.
7. Status closing berubah dari draft ke approved.

---

## System Architecture

### Backend Structure (Go/Gin)

```text
internal/finance/
├── presentation/router/
│   ├── journal_entry_routers.go
│   │   ├── /finance/journals/adjustment
│   │   ├── /finance/journals/:id/submit-approval
│   │   ├── /finance/journals/:id/approve
│   │   ├── /finance/journals/:id/reject
│   │   └── /finance/journals/:id/approvals
│   └── financial_closing_routers.go
│       ├── /finance/closing
│       ├── /finance/closing/:id/analysis
│       ├── /finance/closing/:id/approve
│       ├── /finance/closing/:id/reopen
│       └── /finance/closing/year-end-close
```

### Frontend Structure (Next.js + React)

```text
src/features/finance/journals/
├── components/
│   ├── adjustment-journals-list.tsx
│   ├── adjustment-approval-history-dialog.tsx
│   └── journal-form.tsx
├── hooks/
│   └── use-finance-journals.ts
├── services/
│   └── finance-journals-service.ts
└── types/
    └── index.d.ts

src/features/finance/closing/
├── components/
│   ├── closing-list.tsx
│   ├── closing-detail.tsx
│   └── closing-wizard.tsx
├── hooks/
│   └── use-finance-closing.ts
├── services/
│   └── finance-closing-service.ts
└── types/
    └── index.d.ts
```

---

## Data Contracts

### Adjustment Approval Item

```json
{
  "id": "uuid",
  "journal_id": "uuid",
  "action": "submitted|approved|rejected",
  "actor_id": "uuid",
  "notes": "optional",
  "created_at": "2026-04-16T10:30:45+07:00"
}
```

### Closing Analysis Row

```json
{
  "account_id": "uuid",
  "account_code": "1101",
  "account_name": "Cash on Hand",
  "closing_balance": 1000000,
  "opening_balance": 800000,
  "difference": 200000
}
```

### Financial Closing Entity

```json
{
  "id": "uuid",
  "period_end_date": "2026-03-31",
  "status": "draft|approved",
  "notes": "optional",
  "approved_at": "2026-04-16T11:00:00+07:00",
  "approved_by": "employee_uuid"
}
```

---

## API Reference

### Adjustment & Journal Template

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | /api/v1/finance/journals/adjustment | adjustment_journal.read | List adjustment journals |
| POST | /api/v1/finance/journals/adjustment | adjustment_journal.create | Create adjustment draft |
| PUT | /api/v1/finance/journals/adjustment/:id | adjustment_journal.update | Update adjustment draft |
| PATCH | /api/v1/finance/journals/:id/submit-approval | adjustment_journal.submit | Submit for approval |
| PATCH | /api/v1/finance/journals/:id/approve | adjustment_journal.approve | Approve adjustment |
| PATCH | /api/v1/finance/journals/:id/reject | adjustment_journal.reject | Reject adjustment |
| GET | /api/v1/finance/journals/:id/approvals | adjustment_journal.read | Approval history |
| POST | /api/v1/finance/journals/adjustment/:id/post | adjustment_journal.post | Post adjustment |
| POST | /api/v1/finance/journals/adjustment/:id/reverse | adjustment_journal.reverse | Reverse adjustment |
| GET | /api/v1/finance/journal-templates | journal_template.read | List journal templates |
| POST | /api/v1/finance/journal-templates | journal_template.create | Create journal template |
| POST | /api/v1/finance/journal-templates/:id/use | journal_template.use | Get prefill data from template |

### Financial Closing

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | /api/v1/finance/closing | financial_closing.read | List closing records |
| POST | /api/v1/finance/closing | financial_closing.create | Create closing draft |
| GET | /api/v1/finance/closing/:id | financial_closing.read | Get closing detail |
| GET | /api/v1/finance/closing/:id/analysis | financial_closing.read | Get analysis rows |
| POST | /api/v1/finance/closing/:id/approve | financial_closing.approve | Approve closing |
| POST | /api/v1/finance/closing/:id/reopen | financial_closing.reopen | Reopen approved closing |
| DELETE | /api/v1/finance/closing/:id | financial_closing.delete | Delete closing draft |
| POST | /api/v1/finance/closing/year-end-close | financial_closing.year_end | Execute year-end close |

---

## Business Rules

1. Adjustment journal approval action wajib tercatat pada approval history.
2. Posted journal tidak diedit langsung; perbaikan dilakukan dengan reversal.
3. Adjustment hanya bisa submit/approve/reject pada state yang valid.
4. Closing approval hanya dilakukan setelah review analysis.
5. Reopen hanya berlaku untuk closing dengan status approved.
6. Year-end close dijalankan oleh role yang punya permission khusus.
7. Semua endpoint phase 3 tetap mengikuti response standard global API.

---

## Use Case by Role

| Role | Main Actions in Phase 3 |
|------|-------------------------|
| Finance Staff | Create/edit adjustment, submit approval, apply template |
| Approver | Approve/reject adjustment, review approval history |
| Finance Manager | Create closing draft, run closing wizard, approve/reopen closing, year-end close |
| Auditor/Internal Control | Review approval trail dan analysis result |

---

## Manual Testing Checklist

### Adjustment Governance

1. Buat draft adjustment journal dengan line balanced.
2. Apply template dan verifikasi line otomatis terisi.
3. Submit approval, lalu cek history berisi action submitted.
4. Approve adjustment, cek history berisi action approved.
5. Ulangi untuk reject flow, cek history berisi action rejected.
6. Post adjustment yang telah approved.
7. Reverse adjustment posted dan verifikasi status berubah.

### Closing Wizard

1. Create closing draft (period_end_date + notes).
2. Jalankan wizard dari list action.
3. Step pre-check menampilkan summary analysis.
4. Step review menampilkan rows account + difference.
5. Step execute approve closing.
6. Step complete tampil sukses.
7. Coba centang opsi year-end close, eksekusi, dan verifikasi toast sukses.
8. Coba reopen closing yang sudah approved.

---

## Integration Points

| Module | Integration in Phase 3 |
|--------|------------------------|
| Journal Engine (Phase 1) | Posting/reversal behavior tetap memakai engine yang sama |
| Trial Balance / Reports | Closing analysis memakai data saldo GL per akun |
| Permission System | Semua aksi governance dipagari permission granular |
| Audit & Compliance | Approval history dan closing status jadi jejak audit |

---

## Related Documents

- [phase-0-opening-balance.md](phase-0-opening-balance.md)
- [phase-1-journal-engine.md](phase-1-journal-engine.md)
- [phase-2-operations.md](phase-2-operations.md)
- [PRESENTATION.md](PRESENTATION.md)
- [QA_TEST_GUIDE.md](QA_TEST_GUIDE.md)
