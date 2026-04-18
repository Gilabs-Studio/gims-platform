# Phase 5: Stabilization, Reporting & Operational Monitoring

> **Module:** Finance / Cash & Bank + Accounting Control  
> **Phase:** 5 - Stabilization & Reporting  
> **Version:** 1.0  
> **Status:** Planned  
> **Last Updated:** April 2026

---

## Table of Contents
1. [Overview](#overview)
2. [Stabilization Goals](#stabilization-goals)
3. [Reporting & Monitoring](#reporting--monitoring)
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

**Phase 5** fokus pada stabilisasi pasca hard lock. Setelah phase 4 memastikan posting tidak bisa menembus periode yang sudah ditutup, phase 5 memastikan tim finance punya visibilitas penuh terhadap kualitas data, status periode, mismatch report, dan kesehatan proses closing.

### Scope
- **Operational Monitoring**
  - Period health summary per company dan fiscal year
  - Monitoring mismatch source vs posted journal
  - Audit-ready snapshot untuk closing result
- **Reporting & Analytics**
  - GL / Trial Balance / Balance Sheet / Profit & Loss / Cash Flow consistency checks
  - Reconciliation summary per bank account
  - Closing variance trend dan exception report
- **Post-Launch Stabilization**
  - Daily monitoring untuk posting mismatch
  - Idempotency check pada proses close/reopen
  - Alert bagi finance manager ketika ada anomali

### Key Principle
**Phase 5 tidak menambah flow transaksi baru.** Tujuannya adalah memastikan semua flow phase 0-4 stabil, mudah diaudit, dan konsisten dari sisi data, report, dan operasional.

---

## Stabilization Goals

### Feature Overview

| Feature | Description | Role | Permission |
|---------|-------------|------|------------|
| Period Health Dashboard | Menampilkan status open/locked, pending approvals, dan coverage laporan | Finance Manager, Auditor | `financial_closing.read` |
| Posting Mismatch Monitor | Mendeteksi source transaction yang belum menghasilkan journal posted | Finance, Accountant | `journal.read` |
| Closing Result Snapshot | Snapshot hasil closing dan year-end close untuk audit | Finance Manager, Auditor | `financial_closing.read` |
| Report Consistency Check | Memvalidasi GL, TB, BS, PL terhadap source data | Accountant, Auditor | `general_ledger_report.read`, `trial_balance_report.read` |
| Reconciliation Summary | Ringkasan bank reconciliation per account/periode | Finance Officer, Manager | `bank_reconciliation.read` |
| Exception Alert Feed | Daftar exception yang harus ditindaklanjuti sebelum period close berikutnya | Finance Manager | `financial_closing.read` |

### User Journey (Stabilization)

1. Finance Manager membuka dashboard stabilisasi.
2. Sistem membaca status periode, report coverage, dan mismatch queue.
3. Jika ada anomali, user masuk ke detail report atau source transaction.
4. User melakukan koreksi melalui flow resmi yang sudah ada di phase 0-4.
5. Sistem menyimpan snapshot hasil verifikasi untuk audit.
6. Periode berikutnya dapat ditutup dengan confidence yang lebih tinggi.

### Stabilization Flow

```text
SYNC SOURCE -> VALIDATE REPORTS -> CHECK PERIOD HEALTH ->
REVIEW EXCEPTIONS -> SNAPSHOT -> CONTINUE OPERATIONS
```

---

## Reporting & Monitoring

### Feature Overview

| Feature | Description | Output | Audience |
|---------|-------------|--------|----------|
| GL Consistency Check | Membandingkan saldo GL dengan jurnal posted dan opening balance | Consistency report | Accountant, Auditor |
| Trial Balance Variance | Menampilkan perbedaan debit/kredit per period | Variance report | Accountant, Finance Manager |
| Closing Snapshot | Snapshot closing analysis saat approve/close | Locked audit record | Auditor, Finance Manager |
| Bank Reconciliation Summary | Ringkasan matched/unmatched/excluded item | Reconciliation dashboard | Finance Officer, Auditor |
| Period Lock Coverage | Cek apakah semua posting sudah tunduk pada period lock | Period health badge | Finance Manager |
| Exception Drilldown | Detail mismatch yang perlu tindakan | Action queue | Finance Staff, Accountant |

### Cash Flow Statement Implementation

Implementasi cash flow di phase 5 mengikuti data posted journal yang sudah stabil, dengan alur sebagai berikut:

1. Sistem mengambil daftar akun kas/bank (`AccountTypeCashBank`) untuk menghitung beginning dan ending cash dari balance report repository.
2. Sistem memuat journal lines yang memenuhi filter: status posted, entry date dalam rentang, source operational atau valuation, dan tidak soft-deleted.
3. Journal lines dikelompokkan per journal entry lalu entry yang termasuk opening/closing dikeluarkan dari kalkulasi.
4. Entry hanya diproses jika memiliki minimal satu cash line; perhitungan arus kas dilakukan pada non-cash lines.
5. Nilai movement per non-cash line dihitung dengan rumus `credit - debit`, lalu dijumlahkan ke section operating/investing/financing berdasarkan tipe akun.
6. Net change dihitung dari total tiga section, lalu direkonsiliasi dengan `ending_cash - beginning_cash` menggunakan tolerance `0.01`.

Klasifikasi section yang digunakan backend:
- `investing`: fixed asset.
- `financing`: liability, equity, trade payable.
- `operating`: tipe akun selain kategori investing dan financing.

### Reporting Journey

1. User membuka report dashboard.
2. Sistem menampilkan ringkasan periode aktif dan status lock.
3. User memilih report yang ingin dianalisis.
4. Sistem melakukan drilldown ke source transaction bila perlu.
5. Jika ditemukan mismatch, user diarahkan ke flow perbaikan yang sesuai.
6. Hasil pemeriksaan disimpan sebagai snapshot.

---

## System Architecture

### Backend Structure (Go/Gin)

```text
internal/finance/
├── domain/usecase/
│   ├── closing_guard.go
│   ├── financial_closing_usecase.go
│   └── finance_report_usecase.go        # Report generation and consistency checks
├── presentation/handler/
│   ├── finance_report_handler.go        # GL / TB / BS / PL / Cash Flow endpoints
│   └── financial_closing_handler.go     # Closing and snapshot endpoints
└── presentation/router/
    ├── finance_report_routers.go
    └── financial_closing_routers.go
```

### Frontend Structure (Next.js + React)

```text
src/features/finance/reports/
├── components/
│   ├── general-ledger-view.tsx
│   ├── balance-sheet-view.tsx
│   ├── profit-loss-view.tsx
│   └── report-summary-card.tsx
├── hooks/
│   ├── use-general-ledger.ts
│   ├── use-balance-sheet.ts
│   └── use-profit-loss.ts
└── services/
    ├── general-ledger-service.ts
    ├── balance-sheet-service.ts
    └── profit-loss-service.ts

src/features/finance/closing/
├── components/
│   ├── closing-list.tsx
│   ├── closing-detail.tsx
│   └── closing-wizard.tsx
├── hooks/
│   └── use-finance-closing.ts
└── services/
    └── finance-closing-service.ts
```

### Monitoring Flow

```text
Source Transaction -> Journal Posted -> Reports Read ->
Consistency Check -> Exception Queue -> Audit Snapshot
```

---

## Data Contracts

### Period Health Summary

```json
{
  "company_id": "uuid",
  "fiscal_year_id": "uuid",
  "period_status": "open|locked|reopen_requested",
  "posted_journal_count": 1200,
  "pending_approval_count": 4,
  "report_mismatch_count": 0,
  "latest_closing_status": "approved",
  "health_score": 98
}
```

### Posting Mismatch Item

```json
{
  "source_type": "cash_bank_transaction",
  "source_id": "uuid",
  "reference_code": "CBT-20260401-001",
  "expected_journal_status": "posted",
  "actual_journal_status": "draft",
  "difference_reason": "Awaiting auto-post",
  "created_at": "2026-04-17T09:15:00+07:00"
}
```

### Closing Audit Snapshot

```json
{
  "closing_id": "uuid",
  "period_end_date": "2026-03-31",
  "snapshot_version": 1,
  "generated_at": "2026-04-17T10:00:00+07:00",
  "generated_by": "employee_uuid",
  "status": "locked",
  "notes": "Final snapshot after year-end hard lock"
}
```

### Cash Flow Statement Response

```json
{
  "from_date": "2026-03-01T00:00:00+07:00",
  "to_date": "2026-03-31T23:59:59+07:00",
  "operating": {
    "name": "Operating Activities",
    "items": [
      {
        "account_id": "uuid",
        "code": "5-1000",
        "name": "Operating Expense",
        "account_type": "OPERATING_EXPENSE",
        "amount": -1250000,
        "is_total": false
      }
    ],
    "amount": 4250000
  },
  "investing": {
    "name": "Investing Activities",
    "items": [],
    "amount": -3000000
  },
  "financing": {
    "name": "Financing Activities",
    "items": [],
    "amount": 500000
  },
  "net_change": 1750000,
  "beginning_cash": 10000000,
  "ending_cash": 11750000
}
```

---

## API Reference

### Reporting & Monitoring Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | /api/v1/finance/reports/general-ledger | general_ledger_report.read | Get general ledger report |
| GET | /api/v1/finance/reports/balance-sheet | balance_sheet_report.read | Get balance sheet report |
| GET | /api/v1/finance/reports/profit-loss | profit_loss_report.read | Get profit and loss report |
| GET | /api/v1/finance/reports/trial-balance | trial_balance_report.read | Get trial balance report |
| GET | /api/v1/finance/reports/cash-flow-statement | cash_flow_report.read | Get cash flow report |
| GET | /api/v1/finance/reports/health | financial_closing.read | Get period health summary |
| GET | /api/v1/finance/reports/mismatch | journal.read | Get posting mismatch queue |
| GET | /api/v1/finance/closing/:id/snapshot | financial_closing.read | Get closing audit snapshot |
| GET | /api/v1/finance/bank-reconciliation/summary | bank_reconciliation.read | Get reconciliation summary |

### Cash Flow Statement Query Parameters

**Endpoint:** `GET /api/v1/finance/reports/cash-flow-statement`

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `start_date` | date (`YYYY-MM-DD`) | No | `apptime.Now().AddDate(0,-1,0)` | Start date report period |
| `end_date` | date (`YYYY-MM-DD`) | No | `apptime.Now()` | End date report period |
| `company_id` | UUID | No | `nil` | Optional scope filter for company |
| `fiscal_year_id` | UUID | No | `nil` | Optional scope filter for fiscal year |

Catatan perilaku:
- Jika `company_id` dan `fiscal_year_id` tidak dikirim, backend tetap memproses report dengan scope global sesuai data yang lolos filter tanggal dan status.
- `end_date` dinormalisasi ke akhir hari (`23:59:59.999999999`) sebelum query dijalankan.
- Response dibungkus format standar API (`success`, `data`, `meta`, `timestamp`, `request_id`).

### Validation Helpers

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | /api/v1/finance/reports/validate | financial_closing.read | Run report consistency check |
| POST | /api/v1/finance/reports/export-pack | financial_closing.read | Generate audit export pack |
| POST | /api/v1/finance/reports/notify-exceptions | financial_closing.read | Push exception alert feed |

---

## Business Rules

1. Phase 5 hanya membaca data hasil phase 0-4, tidak membuat jalur posting baru.
2. Report dan dashboard stabilisasi harus memakai data posted only.
3. Mismatch source vs journal harus ditampilkan sebelum period berikutnya ditutup.
4. Closing snapshot bersifat immutable setelah dibuat.
5. Health score harus turun jika ada pending approval, mismatch, atau lock violation.
6. Reconciliation summary harus sinkron dengan bank reconciliation yang sudah confirmed.
7. Semua timestamp report mengikuti timezone aplikasi melalui `apptime`.
8. Validasi konsistensi tidak boleh mengubah state transaksi operasional.
9. Klasifikasi cash flow wajib mengikuti account type: fixed asset ke investing; liability/equity/trade payable ke financing; selain itu ke operating.
10. Cash flow hanya boleh dibentuk dari journal entry berstatus posted dengan source operational atau valuation.
11. Entry opening/closing harus dikecualikan, termasuk reference type `OPENING_BALANCE`, `OPENING_BALANCE_REV`, `PERIOD_CLOSING`, `YEAR_END_CLOSING`.
12. Movement item non-cash dihitung menggunakan formula `credit - debit`.
13. Jika `beginning_cash + net_change` berbeda dari `ending_cash` melebihi tolerance `0.01`, sistem wajib fallback ke `net_change = ending_cash - beginning_cash`.

---

## Use Case by Role

| Role | Main Actions in Phase 5 |
|------|-------------------------|
| Finance Staff | Menindaklanjuti exception queue dan mismatch source |
| Accountant | Menganalisis variance report, GL consistency, dan audit snapshot |
| Finance Manager | Memantau period health, approval backlog, dan closing readiness |
| Auditor | Mengambil snapshot, menilai bukti closing, dan review reconciliations |

---

## Manual Testing Checklist

### Reporting & Monitoring

1. Buka dashboard stabilisasi untuk company dan fiscal year aktif.
2. Pastikan health score tampil dan status periode sesuai data backend.
3. Jalankan report GL, TB, BS, dan PL.
4. Verifikasi tidak ada mismatch antara source transaction dan journal posted.
5. Buka closing snapshot dan pastikan tidak bisa diedit.
6. Cek reconciliation summary untuk account bank utama.

### Exception Handling

1. Simulasikan sumber transaksi yang belum diposting.
2. Pastikan muncul di mismatch queue.
3. Posting transaksi melalui flow resmi phase 0-4.
4. Pastikan mismatch hilang setelah refresh.
5. Jalankan ulang consistency check dan verifikasi hasilnya bersih.

### Cash Flow Statement

1. Panggil endpoint cash flow dengan dan tanpa parameter optional (`company_id`, `fiscal_year_id`) untuk memastikan kedua mode berjalan.
2. Verifikasi response memiliki section `operating`, `investing`, `financing` serta field `net_change`, `beginning_cash`, `ending_cash`.
3. Buat jurnal posted dengan akun fixed asset, lalu pastikan nilainya masuk ke section investing.
4. Buat jurnal posted dengan akun liability/equity/trade payable, lalu pastikan nilainya masuk ke section financing.
5. Buat entry bertipe opening/closing (atau reference type yang dikecualikan), lalu pastikan tidak memengaruhi nilai cash flow.
6. Verifikasi rekonsiliasi akhir: jika total section tidak sama dengan ending-opening melebihi tolerance, nilai `net_change` mengikuti fallback ending-opening.
7. Uji ulang pada periode yang sama setelah tidak ada posting baru, pastikan output tetap konsisten (idempotent secara hasil data).

---

## Integration Points

| Module | Integration in Phase 5 |
|--------|------------------------|
| Journal Engine | Membaca posted journal dan mismatch queue |
| Closing Control | Mengambil snapshot, status lock, dan health summary |
| Cash-Bank Operations | Mengambil reconciliation summary dan exception feed |
| Reports | Menjadi sumber data utama report dashboard |
| Audit & Compliance | Menyimpan bukti verifikasi dan snapshot final |

---

## Notes & Future Improvements

- **Known Limitation**: Phase 5 masih sangat bergantung pada kualitas source data phase 0-4.
- **Future Improvement**:
  - Add configurable health score threshold per company.
  - Add scheduled nightly monitoring job.
  - Add downloadable audit pack per fiscal year.
  - Add drilldown from mismatch item directly to source transaction detail.
- **Operational Benefit**: Tim finance dapat mendeteksi issue lebih awal sebelum tutup buku berikutnya.

## Related Documents

- [phase-4-closing-hard-lock.md](phase-4-closing-hard-lock.md)
- [CASH_BANK_MASTER.md](CASH_BANK_MASTER.md)
- [PRESENTATION.md](PRESENTATION.md)
