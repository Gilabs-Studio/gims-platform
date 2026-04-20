# Phase 8: AR/AP Aging Canonicalization, NTP Lifecycle & Cash Flow Compatibility

> **Module:** Finance / Cash & Bank + AP/AR Reporting  
> **Phase:** 8 - Contract Alignment & Operational Completion  
> **Version:** 1.0  
> **Status:** Implemented / Stabilizing  
> **Last Updated:** April 2026

---

## Table of Contents
1. [Overview](#overview)
2. [Phase 8 Goals](#phase-8-goals)
3. [Contract Alignment](#contract-alignment)
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

**Phase 8** menyelesaikan penyelarasan kontrak backend dan frontend untuk area finance yang kritikal pada operasional harian:

- AR/AP aging report menggunakan **canonical endpoints** dan struktur data grouped-summary.
- AP aging kini mencakup union data **trade payable + non-trade payable**.
- Lifecycle Non-Trade Payable (NTP) disederhanakan ke alur **post -> partial/paid -> cancel** dengan compatibility alias.
- Cash flow statement mendukung endpoint alias + parameter alias serta metadata rekonsiliasi (`method`, `is_reconciled`, `reconciliation_gap`).

### Scope
- **AR/AP Aging Canonical Contract**
  - Endpoint standar: `/finance/ar/aging`, `/finance/ap/aging`
  - Partner grouping (`customers` / `suppliers`) + summary metrics
  - Filter: `include_current`, `min_amount`, partner filter
- **Non-Trade Payable Lifecycle Completion**
  - Canonical lifecycle actions: `post`, `cancel`, `payments`
  - Multi-payment support via status `partial`
  - Outstanding tracking (`paid_amount`, `remaining_amount`)
- **Cash Flow Compatibility Upgrade**
  - Endpoint alias: `/cash-flow` + `/cash-flow-statement`
  - Date alias: `from_date|start_date`, `to_date|end_date`
  - Reconciliation indicator di response
- **Frontend Operational Alignment**
  - Aging page tab redirect (`?tab=ar|ap`)
  - NTP UI status/action mengikuti lifecycle baru
  - Cash flow page tidak lagi placeholder

### Key Principle
**Phase 8 memprioritaskan canonical contract tanpa memutus kompatibilitas klien lama.** Endpoint baru menjadi standar implementasi, endpoint lama tetap tersedia sebagai alias transisi.

---

## Phase 8 Goals

### Feature Overview

| Feature | Description | Role | Permission |
|---------|-------------|------|------------|
| AR Aging Canonical API | Unified AR aging contract dengan summary + grouping customer | Finance, Accountant | `aging_report.read` |
| AP Aging Union API | AP aging menggabungkan supplier invoice dan non-trade payable outstanding | Finance, Accountant | `aging_report.read` |
| NTP Canonical Lifecycle | Action standar `post`, `cancel`, `payments` + backward aliases | Finance Staff, AP Officer | `non_trade_payable.*` |
| NTP Outstanding Visibility | Expose `paid_amount` dan `remaining_amount` di response NTP | Finance, Manager | `non_trade_payable.view` |
| Cash Flow Compatibility Layer | Support endpoint/date alias + reconciliation metadata | Finance Manager, Auditor | `cash_flow_statement.read` |
| Frontend Route & UX Alignment | Redirect tab aging, cash flow page aktif, menu AR/AP konsisten | Finance User | Route-based + permission guard |

### Operational Journey

1. User membuka AR/AP aging dari menu finance.
2. Sistem memanggil canonical API (`/finance/ar/aging` atau `/finance/ap/aging`).
3. User review summary partner/outstanding dan drilldown row berdasarkan `source_type`.
4. Untuk NTP, user melakukan posting lalu pembayaran bertahap sampai status `paid`.
5. User membuka cash flow report dari endpoint canonical baru (`/cash-flow`) dengan date alias.
6. Sistem menampilkan status rekonsiliasi cash flow untuk memastikan kualitas laporan.

### High-Level Flow

```text
CANONICAL API ADOPTION -> BACKWARD COMPATIBILITY ->
FRONTEND ALIGNMENT -> RECONCILIATION VISIBILITY -> STABLE OPERATIONS
```

---

## Contract Alignment

### 1. AR Aging

- Canonical endpoint: `GET /api/v1/finance/ar/aging`
- Legacy endpoint (tetap aktif):
  - `GET /api/v1/finance/reports/ar-aging`
  - `GET /api/v1/finance/reports/aging/ar`
- Data utama:
  - `rows[]` dengan `source_type`, `customer_id`, `customer_name`
  - `summary` agregat outstanding/current/overdue
  - `customers[]` grouping per customer

### 2. AP Aging

- Canonical endpoint: `GET /api/v1/finance/ap/aging`
- Legacy endpoint (tetap aktif):
  - `GET /api/v1/finance/reports/ap-aging`
  - `GET /api/v1/finance/reports/aging/ap`
- AP aging canonical menggabungkan:
  - `SUPPLIER_INVOICE`
  - `NON_TRADE_PAYABLE`
- Data utama:
  - `rows[]` dengan `source_type`
  - `summary` agregat
  - `suppliers[]` grouping per supplier/vendor

### 3. Non-Trade Payable Lifecycle

- Canonical actions:
  - `POST /:id/post`
  - `POST /:id/cancel`
  - `POST /:id/payments`
- Backward-compatible aliases:
  - `submit -> post`
  - `approve -> post`
  - `reject -> cancel`
  - `pay -> payments`

Status lifecycle operasional:

```text
draft -> posted -> partial -> paid
          \-> cancel
```

### 4. Cash Flow Endpoint & Parameter Compatibility

- Canonical read endpoint: `GET /api/v1/finance/reports/cash-flow`
- Compatible alias endpoint: `GET /api/v1/finance/reports/cash-flow-statement`
- Date parameter aliasing:
  - start: `from_date` (preferred) atau `start_date` (legacy)
  - end: `to_date` (preferred) atau `end_date` (legacy)

---

## System Architecture

### Backend Structure (Go/Gin)

```text
internal/finance/
├── data/repositories/
│   └── aging_report_repository.go          # AR/AP query + AP union NTP
├── domain/dto/
│   ├── aging_report_dto.go                 # summary/group contracts
│   ├── non_trade_payable_dto.go            # paid/remaining + payment request
│   └── financial_report_engine_dto.go      # cash flow reconciliation fields
├── domain/usecase/
│   ├── aging_report_usecase.go             # canonical AR/AP aging orchestration
│   ├── non_trade_payable_usecase.go        # post/cancel/pay lifecycle
│   └── finance_report_usecase.go           # cash flow classification/reconciliation
└── presentation/
    ├── handler/
    │   ├── aging_report_handler.go
    │   ├── non_trade_payable_handler.go
    │   └── finance_report_handler.go
    └── router/
        ├── aging_report_routers.go
        ├── non_trade_payable_routers.go
        └── finance_report_routers.go
```

### Frontend Structure (Next.js + React)

```text
src/features/finance/
├── aging-reports/
│   ├── types/index.d.ts
│   ├── services/finance-aging-reports-service.ts
│   └── components/aging-reports-view.tsx
├── non-trade-payables/
│   ├── types/index.d.ts
│   ├── services/finance-non-trade-payables-service.ts
│   ├── hooks/use-finance-non-trade-payables.ts
│   └── components/
│       ├── non-trade-payables-list.tsx
│       └── pay-dialog.tsx
└── reports/cash-flow-statement/
    ├── types/index.d.ts
    ├── services/cash-flow-statement-service.ts
    ├── hooks/use-cash-flow-statement.ts
    └── components/cash-flow-statement-view.tsx
```

### App Route Integration

```text
app/[locale]/(dashboard)/finance/
├── ar/aging-reports/page.tsx      # redirect -> /finance/aging-reports?tab=ar
├── ap/aging-reports/page.tsx      # redirect -> /finance/aging-reports?tab=ap
└── reports/cash-flow-statement/page.tsx
```

---

## Data Contracts

### AR Aging Canonical Response (Data Section)

```json
{
  "as_of_date": "2026-04-20T23:59:59+07:00",
  "summary": {
    "partner_count": 12,
    "invoice_count": 40,
    "total_outstanding": 140000000,
    "total_overdue": 35000000,
    "total_current": 105000000,
    "buckets": {
      "current": 105000000,
      "days_1_30": 12000000,
      "days_31_60": 9000000,
      "days_61_90": 7000000,
      "over_90": 7000000
    }
  },
  "rows": [
    {
      "invoice_id": "uuid",
      "source_type": "CUSTOMER_INVOICE",
      "code": "INV-AR-001",
      "invoice_number": "AR-2026-001",
      "customer_id": "uuid",
      "customer_name": "PT ABC",
      "invoice_date": "2026-04-01T00:00:00+07:00",
      "due_date": "2026-04-15T00:00:00+07:00",
      "days_past_due": 5,
      "amount": 10000000,
      "remaining_amount": 8000000,
      "buckets": {
        "current": 0,
        "days_1_30": 8000000,
        "days_31_60": 0,
        "days_61_90": 0,
        "over_90": 0
      }
    }
  ],
  "customers": [
    {
      "customer_id": "uuid",
      "customer_name": "PT ABC",
      "invoice_count": 3,
      "total_outstanding": 25000000,
      "buckets": {
        "current": 10000000,
        "days_1_30": 9000000,
        "days_31_60": 6000000,
        "days_61_90": 0,
        "over_90": 0
      },
      "invoices": []
    }
  ]
}
```

### AP Aging Canonical Response (Data Section)

```json
{
  "as_of_date": "2026-04-20T23:59:59+07:00",
  "summary": {
    "partner_count": 9,
    "invoice_count": 28,
    "total_outstanding": 110000000,
    "total_overdue": 24000000,
    "total_current": 86000000,
    "buckets": {
      "current": 86000000,
      "days_1_30": 10000000,
      "days_31_60": 7000000,
      "days_61_90": 4000000,
      "over_90": 3000000
    }
  },
  "rows": [
    {
      "invoice_id": "uuid",
      "source_type": "SUPPLIER_INVOICE",
      "code": "INV-AP-001",
      "invoice_number": "AP-2026-001",
      "supplier_id": "uuid",
      "supplier_name": "PT Supplier A",
      "invoice_date": "2026-03-20T00:00:00+07:00",
      "due_date": "2026-04-10T00:00:00+07:00",
      "days_past_due": 10,
      "amount": 15000000,
      "paid_amount": 3000000,
      "remaining_amount": 12000000,
      "buckets": {
        "current": 0,
        "days_1_30": 12000000,
        "days_31_60": 0,
        "days_61_90": 0,
        "over_90": 0
      }
    },
    {
      "invoice_id": "uuid",
      "source_type": "NON_TRADE_PAYABLE",
      "code": "NTP-2026-001",
      "invoice_number": "",
      "supplier_id": "uuid",
      "supplier_name": "Vendor Utility",
      "invoice_date": "2026-04-05T00:00:00+07:00",
      "due_date": "2026-04-20T00:00:00+07:00",
      "days_past_due": 0,
      "amount": 5000000,
      "paid_amount": 2000000,
      "remaining_amount": 3000000,
      "buckets": {
        "current": 3000000,
        "days_1_30": 0,
        "days_31_60": 0,
        "days_61_90": 0,
        "over_90": 0
      }
    }
  ]
}
```

### Non-Trade Payable Payment Request

```json
{
  "payment_date": "2026-04-20",
  "bank_reference": "TRX-12345",
  "bank_account_id": "uuid",
  "amount": 2500000
}
```

Catatan:
- `chart_of_account_id` bisa dikirim langsung.
- Jika `chart_of_account_id` tidak dikirim, sistem resolve dari `bank_account_id`.

### Cash Flow Statement Response (Data Section)

```json
{
  "from_date": "2026-04-01T00:00:00+07:00",
  "to_date": "2026-04-30T23:59:59+07:00",
  "method": "indirect",
  "operating": { "name": "Operating Activities", "items": [], "amount": 4500000 },
  "investing": { "name": "Investing Activities", "items": [], "amount": -1200000 },
  "financing": { "name": "Financing Activities", "items": [], "amount": 800000 },
  "net_change": 4100000,
  "beginning_cash": 10000000,
  "ending_cash": 14100000,
  "is_reconciled": true,
  "reconciliation_gap": 0
}
```

---

## API Reference

### Aging Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | /api/v1/finance/ar/aging | aging_report.read | Canonical AR aging (summary + grouped customers) |
| GET | /api/v1/finance/ap/aging | aging_report.read | Canonical AP aging (supplier invoice + NTP union) |
| GET | /api/v1/finance/reports/ar-aging | aging_report.read | Legacy AR aging endpoint |
| GET | /api/v1/finance/reports/ap-aging | aging_report.read | Legacy AP aging endpoint |
| GET | /api/v1/finance/reports/aging/ar | aging_report.read | Legacy AR alias |
| GET | /api/v1/finance/reports/aging/ap | aging_report.read | Legacy AP alias |

### Aging Query Parameters (Canonical)

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `as_of_date` | date (`YYYY-MM-DD`) | No | today (`apptime.Now`) | Tanggal acuan aging |
| `search` | string | No | `""` | Search code/invoice/partner |
| `include_current` | bool (`true/false/1/0`) | No | `true` | Sertakan invoice yang belum jatuh tempo |
| `min_amount` | number | No | `0` | Minimal outstanding; nilai negatif dianggap `0` |
| `customer_id` | UUID | No | `""` | Filter khusus AR |
| `supplier_id` | UUID | No | `""` | Filter khusus AP |

### Non-Trade Payable Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | /api/v1/finance/ap/non-trade-payables | non_trade_payable.view | List NTP |
| GET | /api/v1/finance/ap/non-trade-payables/:id | non_trade_payable.view | Detail NTP |
| POST | /api/v1/finance/ap/non-trade-payables | non_trade_payable.create | Create draft NTP |
| PUT | /api/v1/finance/ap/non-trade-payables/:id | non_trade_payable.update | Update draft NTP |
| DELETE | /api/v1/finance/ap/non-trade-payables/:id | non_trade_payable.delete | Delete draft/cancelled NTP |
| POST | /api/v1/finance/ap/non-trade-payables/:id/post | non_trade_payable.submit | Canonical post lifecycle |
| POST | /api/v1/finance/ap/non-trade-payables/:id/cancel | non_trade_payable.reject | Canonical cancel lifecycle |
| POST | /api/v1/finance/ap/non-trade-payables/:id/payments | non_trade_payable.pay | Canonical payment action |

### NTP Backward-Compatible Alias Endpoints

| Method | Endpoint | Mapped To |
|--------|----------|-----------|
| POST | /api/v1/finance/ap/non-trade-payables/:id/submit | `/:id/post` |
| POST | /api/v1/finance/ap/non-trade-payables/:id/approve | `/:id/post` |
| POST | /api/v1/finance/ap/non-trade-payables/:id/reject | `/:id/cancel` |
| POST | /api/v1/finance/ap/non-trade-payables/:id/pay | `/:id/payments` |

### Cash Flow Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | /api/v1/finance/reports/cash-flow | cash_flow_statement.read | Canonical cash flow endpoint |
| GET | /api/v1/finance/reports/cash-flow-statement | cash_flow_statement.read | Compatibility alias endpoint |

### Cash Flow Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `from_date` | date (`YYYY-MM-DD`) | No | now - 1 month | Preferred start date |
| `to_date` | date (`YYYY-MM-DD`) | No | now | Preferred end date |
| `start_date` | date (`YYYY-MM-DD`) | No | fallback | Legacy start date alias |
| `end_date` | date (`YYYY-MM-DD`) | No | fallback | Legacy end date alias |
| `company_id` | UUID | No | nil | Optional scope filter |
| `fiscal_year_id` | UUID | No | nil | Optional scope filter |

---

## Business Rules

1. Canonical aging endpoint mengembalikan detail + summary + partner grouping dalam satu response.
2. `as_of_date` dinormalisasi sampai akhir hari untuk kalkulasi days past due.
3. AR aging hanya memuat invoice dengan status unpaid/partial/waiting_payment dan outstanding > 0.
4. AP aging canonical menggabungkan supplier invoice dan NTP outstanding berdasarkan `source_type`.
5. AP NTP outstanding dihitung dari posted journal dengan reference type `NTP_PAYMENT`.
6. Filter `include_current=false` mengecualikan invoice yang belum jatuh tempo (`days_past_due <= 0`).
7. NTP hanya bisa di-edit saat status `draft`.
8. NTP hanya bisa di-delete saat status `draft` atau `cancelled`.
9. NTP payment hanya diizinkan setelah posted (bukan draft/submitted) dan tidak boleh melebihi outstanding.
10. NTP akan berubah ke `partial` saat pembayaran parsial dan `paid` saat outstanding selesai (toleransi 0.01).
11. NTP status `paid` tidak boleh di-cancel.
12. Cash flow hanya menghitung entry posted yang relevan dan mengecualikan opening/closing entries.
13. Jika `opening_cash + net_change` tidak match `ending_cash` melebihi tolerance, sistem fallback ke `net_change = ending_cash - opening_cash`.

---

## Use Case by Role

| Role | Main Actions in Phase 8 |
|------|-------------------------|
| AP Officer | Post NTP, proses pembayaran bertahap, monitor outstanding vendor |
| AR Officer | Monitor aging customer per bucket dan tindak lanjut overdue |
| Accountant | Validasi union AP aging dan konsistensi cash flow reconciliation |
| Finance Manager | Pantau ringkasan AR/AP exposure dan status rekonsiliasi cash flow |
| Auditor | Review compatibility strategy, lifecycle trace, dan report outputs |

---

## Manual Testing Checklist

### AR/AP Aging

1. Panggil `GET /api/v1/finance/ar/aging` dan `GET /api/v1/finance/ap/aging` tanpa parameter; verifikasi response berisi `rows`, `totals`, `summary`, serta grouping partner.
2. Uji `include_current=false`; verifikasi baris current tidak muncul.
3. Uji `min_amount`; verifikasi baris di bawah threshold terfilter.
4. Uji `customer_id` atau `supplier_id`; verifikasi hanya partner terkait yang muncul.
5. Validasi nilai AP aging memuat `source_type` campuran (`SUPPLIER_INVOICE` dan `NON_TRADE_PAYABLE`).

### Non-Trade Payable Lifecycle

1. Buat NTP draft, lalu post via `/:id/post`; verifikasi status menjadi `posted`.
2. Lakukan payment parsial via `/:id/payments`; verifikasi status `partial` dan nilai `paid_amount`/`remaining_amount`.
3. Lakukan payment pelunasan; verifikasi status `paid`.
4. Coba payment melebihi outstanding; verifikasi request ditolak.
5. Coba cancel NTP berstatus `paid`; verifikasi ditolak.
6. Uji alias lama (`submit`, `approve`, `reject`, `pay`) dan pastikan hasilnya sama dengan endpoint canonical.

### Cash Flow Compatibility

1. Panggil endpoint canonical `GET /reports/cash-flow` menggunakan `from_date`/`to_date`.
2. Panggil endpoint alias `GET /reports/cash-flow-statement` menggunakan `start_date`/`end_date`.
3. Verifikasi output section `operating`, `investing`, `financing` konsisten di kedua mode.
4. Verifikasi field `method`, `is_reconciled`, `reconciliation_gap` tersedia pada response data.
5. Simulasikan kondisi gap rekonsiliasi; verifikasi fallback `net_change = ending - beginning` dijalankan.

### Frontend Alignment

1. Akses `/finance/ar/aging-reports`; verifikasi redirect ke `/finance/aging-reports?tab=ar`.
2. Akses `/finance/ap/aging-reports`; verifikasi redirect ke `/finance/aging-reports?tab=ap`.
3. Buka page cash flow statement; verifikasi report tampil (bukan placeholder).
4. Verifikasi action NTP di UI hanya menampilkan action sesuai status lifecycle.

---

## Integration Points

| Module | Integration in Phase 8 |
|--------|------------------------|
| Finance Reports | Canonical AR/AP aging + cash flow compatibility endpoint |
| Journal Engine | NTP payment accumulation dari posted journal entries |
| AP Operations | NTP lifecycle canonical actions dan status progression |
| Navigation Layer | AR/AP route normalization dan menu correction |
| Frontend Query Layer | React Query hooks ke canonical endpoints |

---

## Notes & Future Improvements

- **Known Limitation**:
  - Aging canonical saat ini mengambil dataset besar tanpa pagination server-side (`limit` internal besar), cocok untuk volume menengah namun perlu strategi scale-out untuk volume tinggi.
  - Nama action lama di UI (`submit/reject`) masih dipertahankan untuk kompatibilitas istilah user lama.

- **Future Improvement**:
  - Tambah server-side pagination untuk canonical aging endpoint dengan tetap mempertahankan summary aggregate.
  - Tambah endpoint dedicated analytics untuk top overdue customers/suppliers.
  - Tambah monitoring job untuk NTP yang lama di status `partial`.
  - Tambah flag granular rekonsiliasi cash flow per section.

- **Operational Benefit**:
  - Finance team memperoleh kontrak API yang stabil, backward compatible, dan siap untuk transisi bertahap tanpa menghentikan operasi.

## Related Documents

- [phase-5-stabilization-reporting.md](phase-5-stabilization-reporting.md)
- [phase-4-closing-hard-lock.md](phase-4-closing-hard-lock.md)
- [Phase-8-Seeder-Refactor.md](../finance/Phase-8-Seeder-Refactor.md)
- [CASH_BANK_MASTER.md](CASH_BANK_MASTER.md)
