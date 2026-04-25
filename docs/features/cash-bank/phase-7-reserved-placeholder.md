# Phase 7: Sales-Finance Posting Reliability & DP Settlement

> **Module:** Finance / Cash & Bank + Sales Integration  
> **Phase:** 7 - Posting Reliability & Settlement Hardening  
> **Version:** 1.0  
> **Status:** Implemented / Stabilizing  
> **Last Updated:** April 2026

---

## Table of Contents
1. [Overview](#overview)
2. [Phase 7 Goals](#phase-7-goals)
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

**Phase 7** adalah fase hardening transaksi sales yang berdampak langsung ke cash-bank dan jurnal keuangan. Fokus utama fase ini adalah memastikan posting jurnal terjadi pada event bisnis yang tepat, tidak duplikat, dan tetap atomic dalam transaksi database.

### Scope
- **Delivery-Based COGS Posting**
  - Jurnal COGS dan pelepasan inventory diposting saat DO di-ship.
  - Cost snapshot (`avg_cost_snapshot`, `cogs_amount`) disimpan di level item DO.
- **Invoice Posting Realignment**
  - Jurnal Sales Invoice regular hanya mem-posting AR + Revenue + VAT.
  - Jika invoice terkait DO yang sudah punya jurnal, posting invoice dilewati untuk cegah duplikasi.
- **Down Payment Lifecycle Accounting**
  - Approval Customer DP Invoice memicu jurnal DP invoice.
  - Regular invoice yang memakai DP memicu jurnal aplikasi DP (`SALES_DP_APPLICATION`).
- **Payment Confirmation Atomic Posting**
  - Konfirmasi payment memicu jurnal di dalam DB transaction (rollback jika gagal).
  - Profil jurnal dipilih otomatis berdasarkan tipe invoice (regular vs down payment).
- **Cash Method Compatibility**
  - Metode CASH boleh tanpa input `bank_account_id`; sistem resolve akun aktif milik company actor.

### Key Principle
**Phase 7 memastikan pengakuan akuntansi mengikuti momen ekonomi transaksi** (shipment, approval, payment confirmation) dengan guard terhadap duplicate posting dan partial failure.

---

## Phase 7 Goals

### Feature Overview

| Feature | Description | Role | Permission |
|---------|-------------|------|------------|
| Delivery Shipment Journal | Posting COGS + inventory release saat ship DO | Sales Ops, Warehouse, Finance | `delivery_order.ship` |
| Sales Invoice Journal Guard | Skip posting invoice jika DO journal sudah ada | Accountant, Finance | `customer_invoice.update` |
| DP Invoice Journal Trigger | Approval DP invoice mem-posting AR vs advance liability | Finance AP/AR, Accountant | `customer_invoice_dp.approve` |
| DP Application Journal | Aplikasi DP ke regular invoice diposting terpisah | Accountant, Finance | `customer_invoice.update` |
| Atomic Payment Confirmation | Confirm payment + posting journal dalam 1 transaksi | Cashier, Finance Officer | `sales_payment.confirm` |
| Payment Method Resolution | CASH fallback akun aktif company jika bank account tidak diinput | Cashier, Finance Officer | `sales_payment.create` |

### Operational Journey

1. Tim sales menyiapkan dan mengirim delivery order.
2. Saat ship, sistem deduct stok, simpan snapshot cost, lalu posting jurnal logistics.
3. Tim finance menyetujui invoice dan/atau DP invoice.
4. Untuk invoice regular yang memakai DP, sistem posting jurnal aplikasi DP secara terpisah.
5. Tim finance membuat dan mengonfirmasi payment customer.
6. Sistem melakukan posting jurnal payment secara atomic dengan profile sesuai tipe invoice.

### High-Level Flow

```text
SHIP DELIVERY -> POST COGS JOURNAL ->
APPROVE INVOICE/DP -> APPLY DP JOURNAL ->
CONFIRM PAYMENT -> POST PAYMENT JOURNAL (ATOMIC)
```

---

## Process Alignment

### 1. Delivery Recognition (Logistics + COGS)

- Trigger utama: `POST /api/v1/sales/delivery-orders/:id/ship`
- Pada saat ship:
  - Reservation batch dan product dilepas.
  - Stock movement outbound dibuat (`SkipJournaling=true` di movement level).
  - Snapshot biaya item disimpan ke DO item.
  - Jurnal delivery diposting via `SalesJournalService.GenerateSalesJournal`.

### 2. Sales Invoice Recognition

- Trigger utama: perubahan status invoice regular ke status post-eligible.
- Jurnal invoice regular memakai profile `ProfileSalesInvoice` (AR, revenue, VAT).
- Jika invoice terhubung ke DO yang sudah punya `journal_entry_id`, posting invoice dilewati untuk mencegah double-recognition.

### 3. Down Payment Recognition

- Approval DP invoice (`SUBMITTED -> UNPAID`) memicu jurnal `SALES_INVOICE_DP`.
- DP yang sudah dibayar bisa ditautkan ke regular invoice dan dikurangi dari nilai invoice.
- Saat regular invoice post-eligible dengan DP terpasang, jurnal `SALES_DP_APPLICATION` diposting untuk reclass advance -> receivable settlement.

### 4. Payment Recognition

- Trigger utama: `POST /api/v1/sales/payments/:id/confirm`
- Confirm payment memuat preload invoice context, update status payment+invoice, lalu posting jurnal di transaction yang sama.
- Profile jurnal:
  - `ProfileSalesPayment` untuk invoice regular.
  - `ProfileSalesPaymentDP` untuk invoice down payment.

---

## System Architecture

### Backend Structure (Go/Gin)

```text
internal/sales/
├── domain/service/
│   └── sales_journal_service.go                # Delivery, DP invoice, DP application journal
├── domain/usecase/
│   ├── delivery_order_usecase.go               # Ship flow + stock + cost snapshot + journal link
│   ├── customer_invoice_usecase.go             # Invoice posting guard + DP application logic
│   ├── customer_invoice_down_payment_usecase.go# DP approval journal trigger
│   └── sales_payment_usecase.go                # Atomic confirm + payment journal
└── presentation/router/
    ├── delivery_order_router.go
    ├── customer_invoice_router.go
    ├── customer_invoice_down_payment_router.go
    └── sales_payment_routers.go
```

### Finance Posting Profiles (Used in Phase 7)

```text
internal/finance/domain/accounting/posting_profile.go
├── ProfileSalesInvoice
├── ProfileSalesInvoiceDP
├── ProfileSalesPayment
└── ProfileSalesPaymentDP
```

### Frontend Structure (Next.js + React)

```text
src/features/sales/
├── delivery/
│   ├── components/delivery-form.tsx
│   └── hooks/use-delivery-form.ts
├── invoice/
│   ├── components/invoice-form.tsx
│   ├── hooks/use-invoice-form.ts
│   └── types/index.d.ts
└── payments/
    └── components/sales-payment-form.tsx
```

---

## Data Contracts

### Delivery Item Cost Snapshot (Response Excerpt)

```json
{
  "id": "uuid",
  "product_id": "uuid",
  "quantity": 10,
  "price": 120000,
  "subtotal": 1200000,
  "avg_cost_snapshot": 85000,
  "cogs_amount": 850000
}
```

### Regular Invoice with DP Link (Response Excerpt)

```json
{
  "id": "uuid",
  "type": "REGULAR",
  "down_payment_invoice_id": "uuid",
  "down_payment_amount": 3000000,
  "amount": 12000000,
  "paid_amount": 0,
  "remaining_amount": 12000000
}
```

### Sales Payment Create Request (Phase 7)

```json
{
  "invoice_id": "uuid",
  "bank_account_id": "uuid_optional_for_cash",
  "payment_date": "2026-04-20",
  "amount": 2500000,
  "method": "BANK_OR_CASH",
  "reference_number": "TRX-001",
  "notes": "optional"
}
```

### Journal Reference Types Used

| Reference Type | Source Event | Purpose |
|----------------|--------------|---------|
| `DELIVERY_ORDER` | Delivery ship | COGS + inventory release |
| `SALES_INVOICE` | Regular invoice post-eligible | AR + revenue + VAT |
| `SALES_INVOICE_DP` | DP invoice approval | DP receivable vs advance liability |
| `SALES_DP_APPLICATION` | Regular invoice with linked DP | Settle advance against receivable |
| `SALES_PAYMENT` | Payment confirm | Cash/bank receipt vs receivable/advance |

---

## API Reference

### Sales-Finance Posting Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/api/v1/sales/delivery-orders/:id/ship` | `delivery_order.ship` | Ship DO, update stock, post delivery journal |
| PATCH | `/api/v1/sales/customer-invoices/:id/status` | `customer_invoice.update` | Status transition, trigger invoice/DP-application journal when eligible |
| POST | `/api/v1/sales/customer-invoice-down-payments/:id/approve` | `customer_invoice_dp.approve` | Approve DP invoice and post DP invoice journal |
| POST | `/api/v1/sales/payments` | `sales_payment.create` | Create pending payment |
| POST | `/api/v1/sales/payments/:id/confirm` | `sales_payment.confirm` | Confirm payment and post journal atomically |
| DELETE | `/api/v1/sales/payments/:id` | `sales_payment.delete` | Cancel/delete pending payment before confirm |

---

## Business Rules

1. Delivery Order hanya bisa di-ship dari status `prepared`.
2. Product inventory-tracked pada DO wajib memiliki `inventory_batch_id` saat ship.
3. Saat ship, sistem menyimpan `avg_cost_snapshot` dan `cogs_amount` di setiap item DO.
4. Posting jurnal delivery dilakukan sebelum status DO diubah ke `shipped`.
5. Sales invoice regular tidak mem-posting COGS; COGS diakui di delivery journal.
6. Jika invoice regular terhubung ke DO yang sudah memiliki jurnal, posting invoice dilewati untuk cegah duplikasi.
7. Jurnal DP invoice hanya dipicu pada transisi DP invoice ke `UNPAID`.
8. Jurnal aplikasi DP hanya dipicu jika regular invoice memiliki `down_payment_amount > 0` dan terkait delivery journal.
9. Konfirmasi payment memicu posting jurnal di dalam DB transaction yang sama (all-or-nothing).
10. Profile payment journal dipilih berdasarkan tipe invoice (`regular` vs `down_payment`).
11. Metode `BANK` wajib `bank_account_id`; metode `CASH` boleh fallback ke akun aktif company actor.
12. Reversal invoice/payment juga melakukan reversal journal untuk menjaga trace audit.

---

## Use Case by Role

| Role | Main Actions in Phase 7 |
|------|-------------------------|
| Warehouse/Sales Ops | Ship delivery order dan memastikan batch assignment valid |
| AR Finance Staff | Approve customer invoice, review DP linkage, monitor remaining amount |
| Cashier / Finance Officer | Create payment, confirm payment, validasi metode cash/bank |
| Accountant | Verifikasi jurnal sales posting, settlement DP, dan reversal consistency |
| Auditor | Review trace reference_type dari source transaction sampai posted journal |

---

## Manual Testing Checklist

### Delivery & COGS

1. Buat DO berstatus `prepared` dengan item inventory-tracked.
2. Ship DO dan pastikan stok berkurang, reservation release, dan movement outbound tercatat.
3. Verifikasi item DO memiliki `avg_cost_snapshot` dan `cogs_amount`.
4. Verifikasi jurnal `DELIVERY_ORDER` terbentuk dan DO menyimpan `journal_entry_id`.

### Invoice & Down Payment

1. Approve DP invoice (`submitted -> unpaid`), verifikasi jurnal `SALES_INVOICE_DP` terbentuk.
2. Buat invoice regular yang linked ke DP paid/partial, verifikasi `down_payment_invoice_id` dan pengurangan amount.
3. Ubah status invoice regular ke post-eligible, verifikasi jurnal aplikasi DP (`SALES_DP_APPLICATION`) terbentuk bila syarat terpenuhi.
4. Pastikan invoice yang terkait DO berjurnal tidak membuat duplikasi jurnal sales invoice.

### Payment Confirmation

1. Buat payment pending dan konfirmasi payment.
2. Verifikasi status payment jadi `CONFIRMED`, status/paid amount invoice ter-update.
3. Verifikasi jurnal `SALES_PAYMENT` terbentuk sesuai profile invoice type.
4. Simulasikan kegagalan posting jurnal dan pastikan confirm payment rollback.
5. Uji metode `CASH` tanpa `bank_account_id` dan pastikan fallback akun aktif berjalan.

---

## Integration Points

| Module | Integration in Phase 7 |
|--------|------------------------|
| Sales Delivery | Trigger source untuk COGS recognition dan inventory release journal |
| Sales Invoice | Revenue/AR posting + DP application settlement orchestration |
| Sales Payment | Cash receipt posting saat payment confirmation |
| Inventory | Batch deduction, reservation release, movement out dengan cost snapshot |
| Finance Journal Engine | Generate + post + reverse journal dari profile-based rules |
| System Account Mapping | Fallback COA untuk bank/cash ketika mapping akun langsung tidak tersedia |

---

## Notes & Future Improvements

- **Known Limitation**:
  - Penyelesaian DP saat ini mengandalkan linkage invoice dan status transisi; skenario multi-DP kompleks masih perlu monitoring tambahan.
  - Ketika profile/mapping COA belum lengkap, trigger posting akan gagal by design untuk menjaga integritas jurnal.

- **Future Improvement**:
  - Tambah observability dashboard khusus event `journal_observability` untuk sales posting chain.
  - Tambah reconciliation view antar reference type (`DELIVERY_ORDER`, `SALES_INVOICE`, `SALES_PAYMENT`, `SALES_DP_APPLICATION`).
  - Tambah automated regression suite untuk kombinasi partial payment + DP application + reversal.

## Related Documents

- [phase-6-reserved-placeholder.md](phase-6-reserved-placeholder.md)
- [phase-8-ar-ap-aging-ntp-cash-flow.md](phase-8-ar-ap-aging-ntp-cash-flow.md)
- [phase-5-stabilization-reporting.md](phase-5-stabilization-reporting.md)
- [CASH_BANK_MASTER.md](CASH_BANK_MASTER.md)
- [../sales/sales-payment-journal-posting.md](../sales/sales-payment-journal-posting.md)
