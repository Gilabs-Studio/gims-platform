# ERP Enterprise Cross-Module Evaluation (Sales, Purchase, Journal, Financial Statements)

## Executive Summary

Evaluasi ini menilai konsistensi flow bisnis, correctness akuntansi, dan traceability lintas modul berdasarkan implementasi aktual pada:

- Sales: `apps/api/internal/sales`
- Purchase: `apps/api/internal/purchase`
- Journal & Finance: `apps/api/internal/finance`
- UAT Journey: `docs/features/finance/frontend-journey-uat-checklist.md`

### Overall Verdict

- Business flow: **Partially compliant**
- Accounting correctness: **Partially compliant**
- Traceability: **Partially compliant**
- Control & auditability: **Partially compliant**
- Overall ERP enterprise readiness: **Partially compliant (hardening required for audit-ready)**

### Key Conclusions

1. Arsitektur cross-module sudah benar secara fondasi: Sales/Purchase usecase memanggil `JournalEntryUsecase` langsung.
2. Trigger jurnal utama sudah ada untuk transaksi finansial inti (invoice, payment, goods receipt, supplier invoice pending).
3. Mekanisme balancing journal dan period closing guard tersedia, tetapi ada gap kontrol kritikal pada error handling jurnal di konfirmasi payment.
4. Report layer sudah menggunakan posted/reversed journal sebagai sumber utama, tetapi konsistensi status source transaction vs journal belum dijaga dengan guard atomik di semua flow.
5. Traceability `reference_type/reference_id` sudah berjalan, namun masih ada risiko orphan/mismatch pada beberapa edge case.

## Module-by-Module Analysis

## 1) Sales End-to-End Flow: SO -> DO -> Invoice -> Payment -> Journal

### A. SO (Sales Order)

Source:
- `apps/api/internal/sales/presentation/router/sales_order_router.go`
- `apps/api/internal/sales/domain/usecase/sales_order_usecase.go`

Trigger event:
- `POST /sales/sales-orders` create SO
- `PATCH /sales/sales-orders/:id/status` update status
- `POST /sales/sales-orders/:id/approve` approve

Valid status transition:
- `draft -> submitted/cancelled`
- `submitted -> approved/rejected`
- `approved -> closed/cancelled`
- `rejected -> draft`

Kontrol penting:
- Saat `approved`, sistem reserve stock (`inventoryUC.ReserveStock`) dalam transaksi.
- Saat `cancelled`, sistem release stock dalam transaksi.

Journal timing:
- **Tidak ada jurnal langsung di SO** (masih non-financial commitment).

Accounting impact:
- Belum berdampak ke AR/revenue/cash.

### B. DO (Delivery Order)

Source:
- `apps/api/internal/sales/presentation/router/delivery_order_router.go`
- `apps/api/internal/sales/domain/usecase/delivery_order_usecase.go`

Trigger event:
- `POST /sales/delivery-orders` create DO
- `PATCH /sales/delivery-orders/:id/status`
- `POST /sales/delivery-orders/:id/ship`
- `POST /sales/delivery-orders/:id/deliver`

Valid status transition:
- `draft -> sent/cancelled`
- `sent -> approved/rejected`
- `approved -> prepared/cancelled`
- `prepared -> shipped/cancelled`
- `shipped -> delivered`
- `rejected -> draft`

Kontrol penting:
- Cancel DO release reservasi batch + product stock.
- Ship DO melakukan release reservasi + deduct stock + stock movement outbound.

Journal timing:
- **Tidak ada jurnal langsung di DO** (inventory movement operasional, revenue recognition di invoice).

Accounting impact:
- Tidak langsung ke AR/revenue/cash.

### C. Customer Invoice

Source:
- `apps/api/internal/sales/presentation/router/customer_invoice_router.go`
- `apps/api/internal/sales/domain/usecase/customer_invoice_usecase.go`

Trigger event:
- `POST /sales/customer-invoices`
- `PATCH /sales/customer-invoices/:id/status`

Valid status transition (utama):
- `draft -> submitted/approved/cancelled`
- `submitted -> approved/unpaid/rejected`
- `approved -> unpaid/partial/paid/cancelled`
- `unpaid|waiting_payment|partial -> .../cancelled`

Journal timing:
- Jurnal dibuat saat invoice regular masuk state post-approved: `unpaid/waiting_payment/partial/paid`.
- Jurnal reversal dipicu saat invoice yang sudah post-approved menjadi `cancelled`.

Akun debit/credit utama:
- DR `11300` Trade Receivables
- DR `21200` Sales Advance (jika apply DP)
- CR `4100` Sales Revenue
- CR `21500` VAT Output
- DR `5100` COGS
- CR `11400` Inventory

Accounting impact:
- AR naik saat invoicing.
- Revenue dan output VAT diakui.
- COGS & inventory movement akuntansi diakui.

### D. Sales Payment

Source:
- `apps/api/internal/sales/presentation/router/sales_payment_routers.go`
- `apps/api/internal/sales/domain/usecase/sales_payment_usecase.go`

Trigger event:
- `POST /sales/payments`
- `POST /sales/payments/:id/confirm`

Flow status:
- Payment dibuat `pending`.
- Confirm payment -> `confirmed`, update invoice (`unpaid/partial/paid`), update `paid_amount`, `remaining_amount`, optional close SO.

Journal timing:
- Jurnal dipicu saat `confirm` payment.

Akun debit/credit utama:
- DR Cash/Bank (`bank_account.chart_of_account_id`, fallback `11100`)
- CR `11300` Trade Receivables (invoice regular)
- CR `21200` Sales Advances (invoice down payment)

Accounting impact:
- AR turun, cash/bank naik.

Critical note:
- Jika trigger jurnal gagal saat confirm payment, transaksi payment **tetap confirmed** (error hanya log, tidak rollback).

## 2) Purchase End-to-End Flow: PO -> GR -> Supplier Invoice -> Payment -> Journal

### A. PO (Purchase Order)

Source:
- `apps/api/internal/purchase/presentation/router/purchase_order_routers.go`
- `apps/api/internal/purchase/domain/usecase/purchase_order_usecase.go`

Trigger event:
- `POST /purchase/purchase-orders`
- `POST /purchase/purchase-orders/:id/submit`
- `POST /purchase/purchase-orders/:id/approve`
- `POST /purchase/purchase-orders/:id/reject`
- `POST /purchase/purchase-orders/:id/close`

Status utama:
- `draft -> submitted -> approved -> closed`
- `submitted -> rejected`

Journal timing:
- **Tidak ada jurnal langsung di PO** (commitment stage).

Accounting impact:
- Belum berdampak ke AP/inventory/cash.

### B. GR (Goods Receipt)

Source:
- `apps/api/internal/purchase/presentation/router/goods_receipt_routers.go`
- `apps/api/internal/purchase/domain/usecase/goods_receipt_usecase.go`

Trigger event:
- `POST /purchase/goods-receipt`
- `POST /purchase/goods-receipt/:id/submit`
- `POST /purchase/goods-receipt/:id/approve`
- `POST /purchase/goods-receipt/:id/close`
- Legacy `POST /confirm` juga tersedia

Status utama:
- New workflow: `draft -> submitted -> approved -> closed`
- Legacy path: `draft -> confirmed`

Journal timing:
- Saat GR `close` (dan juga legacy `confirm`), sistem memicu jurnal accrual.

Akun debit/credit utama:
- DR `11400` Inventory
- CR `21100` GR/IR

Accounting impact:
- Inventory naik, liability accrual GR/IR naik.

### C. Supplier Invoice

Source:
- `apps/api/internal/purchase/presentation/router/supplier_invoice_routers.go`
- `apps/api/internal/purchase/domain/usecase/supplier_invoice_usecase.go`

Trigger event:
- `POST /purchase/supplier-invoices`
- `POST /purchase/supplier-invoices/:id/submit`
- `POST /purchase/supplier-invoices/:id/approve`
- `POST /purchase/supplier-invoices/:id/pending`
- `POST /purchase/supplier-invoices/:id/cancel`

Status utama:
- `draft -> submitted -> approved -> pending`
- Dari submitted: `rejected`
- Cancel diizinkan dari `draft/submitted/approved`

Journal timing:
- Jurnal AP recognition dipicu saat `pending` (inside transaction, blocking on error).

Akun debit/credit utama:
- CR `21000` Accounts Payable (total amount)
- DR `21100` GR/IR (sub total)
- DR `11800` VAT Input
- DR `61000` Delivery/Other expense

Accounting impact:
- AP naik, GR/IR clearing, VAT input claim, additional expense recognition.

### D. Purchase Payment

Source:
- `apps/api/internal/purchase/presentation/router/purchase_payment_routers.go`
- `apps/api/internal/purchase/domain/usecase/purchase_payment_usecase.go`

Trigger event:
- `POST /purchase/payments`
- `POST /purchase/payments/:id/confirm`

Flow status:
- Payment dibuat `pending`.
- Confirm -> `confirmed`, update supplier invoice `partial/paid`, recalc remaining, optional close PO.

Journal timing:
- Jurnal dipicu saat confirm payment.

Akun debit/credit utama:
- DR `21000` AP (regular invoice)
- DR `11900` Purchase Advances (DP invoice)
- CR Cash/Bank (`bank_account.chart_of_account_id`, fallback `11100`)

Accounting impact:
- AP turun, cash/bank turun.

Critical note:
- Jika trigger jurnal gagal saat confirm payment, payment tetap confirmed (non-blocking log only).

## 3) Journal Logic Technical Evaluation

Source:
- `apps/api/internal/finance/domain/usecase/journal_entry_usecase.go`
- `apps/api/internal/finance/data/models/journal_entry.go`
- `apps/api/internal/finance/domain/usecase/closing_guard.go`

### 3.1 Sumber journal generation

Auto (system-generated):
- Sales invoice posting event
- Sales payment confirm
- Goods receipt close/confirm
- Supplier invoice pending
- Purchase payment confirm
- Financial closing/year-end

Manual:
- `POST /finance/journal-entries`
- Adjustment journal endpoints (`/adjustment`)

### 3.2 Debit/credit line building

- Dibangun di source usecase masing-masing (Sales/Purchase) menggunakan COA by code.
- Journal core memvalidasi line-level rules:
  - minimal 2 lines
  - COA wajib
  - debit/credit tidak boleh negatif
  - satu line tidak boleh debit+credit bersamaan

### 3.3 Balancing rule & rejection

- `validateLines` enforce debit = credit (rounding-aware).
- Unbalanced => reject (`ErrJournalUnbalanced`).
- Saat `Post`, sistem cek total line balance lagi sebelum status menjadi posted.

### 3.4 Posting lifecycle

- Lifecycle utama: `draft -> posted -> reversed`
- `posted/reversed` immutable terhadap update/delete.
- Reversal membuat entry baru (debit/credit swap), auto-post, lalu original status jadi `reversed`.

### 3.5 Idempotency & reference tracking

- `PostOrUpdateJournal` melakukan upsert berdasarkan `(reference_type, reference_id)`.
- Model `journal_entries` memiliki unique index `idx_journal_entry_reference` pada `reference_type + reference_id`.
- Ini memberi idempotency pada trigger berbasis source transaction.

### 3.6 Reversal & audit trail

- Reversal tersimpan di `journal_reversals` dan original entry ditandai `reversed`.
- Source module juga menulis audit log action (`*.create`, `*.status_change`, `*.confirm`, dll).

## 4) Financial Reports Derivation (Technical)

Source:
- `apps/api/internal/finance/domain/usecase/finance_report_usecase.go`
- `apps/api/internal/finance/data/repositories/finance_report_repository.go`

### 4.1 Data source rule

- Report memakai journal status `posted` dan `reversed` sebagai source data.
- Report tidak mengambil langsung dari tabel transaksi Sales/Purchase.

### 4.2 Profit & Loss derivation

- Basis: movement per akun revenue/COGS/expense dari `journal_lines` + tipe COA.
- Rumus:
  - Revenue movement: credit - debit
  - COGS/Expense movement: debit - credit
  - Gross Profit = Revenue - COGS
  - Net Profit = Gross Profit - Expense

### 4.3 Balance Sheet derivation

- Basis: closing balance per akun (opening + period movement) dengan normal balance type-aware.
- Kelompok: Assets, Liabilities, Equities.
- Tambahan:
  - Retained earnings (historical net profit)
  - Current year profit
- Balancing:
  - `AssetTotal` vs `Liability + EquityFinal`
  - `IsBalanced` true jika selisih <= tolerance 0.01

### 4.4 General Ledger derivation

- Per akun: opening balance + transaksi jurnal terurut (entry_date, id).
- Menyediakan running balance dan reference metadata (`reference_type`, `reference_id`, `reference_code`).

### 4.5 Trial Balance rule

- Menyajikan opening/debit/credit/balance per akun.
- Digunakan bersama financial closing validation untuk memastikan balance.

## 5) Integrasi Data Antar Modul

## 5.1 Bagaimana Sales/Purchase masuk ke Journal

- Sales/Purchase usecase inject `JournalEntryUsecase` dan memanggil `PostOrUpdateJournal`.
- Mapping transaksi -> jurnal:
  - Sales Invoice -> `reference_type=SALES_INVOICE`
  - Sales Payment -> `SALES_PAYMENT`
  - Goods Receipt -> `GOODS_RECEIPT`
  - Supplier Invoice -> `SUPPLIER_INVOICE`
  - Purchase Payment -> `PURCHASE_PAYMENT`

## 5.2 Apakah semua transaksi finansial berujung journal?

- Secara desain: **ya untuk transaksi finansial inti**.
- Secara implementasi saat ini: **belum 100% terjamin** karena ada path non-atomic (payment confirm bisa sukses walau jurnal gagal).

## 5.3 Relasi source -> reference_type/reference_id -> report

- Source transaction id disimpan sebagai `reference_id` jurnal.
- Report/GL menurunkan drilldown dari journal ke reference metadata.
- Resolver `BatchResolveJournalReferenceCodes` memberi `reference_code` human-readable.

## 5.4 Titik rawan orphan/mismatch

1. Payment confirmed tanpa jurnal (karena trigger jurnal non-blocking di confirm).
2. Perbedaan workflow legacy vs new (GR confirm vs close) berpotensi double-path operasional.
3. Supplier invoice cancel tidak meliputi status `pending`, sehingga recovery setelah AP recognized terbatas.
4. Financial closing validation menolak adanya entry `reversed` pada periode, berpotensi blocking operasional koreksi sah.

## 6) User Journey End-to-End (Transaction to Report to Closing)

Referensi UAT:
- `docs/features/finance/frontend-journey-uat-checklist.md`

Journey target:
1. User membuat transaksi source (SO/PO -> DO/GR -> Invoice -> Payment).
2. Sistem menghasilkan jurnal via trigger usecase.
3. User buka report (GL/P&L/BS/TB) yang bersumber dari jurnal posted/reversed.
4. User drilldown report -> journal -> source transaction.
5. User melakukan closing period dan analisis.

Audit traceability readiness:
- **Sebagian besar bisa ditelusuri**, tetapi audit journey belum fully safe dari dead-end saat ada mismatch source-vs-journal akibat non-atomic confirm.

## 7) Edge-Case Matrix

| Edge Case | Current Handling | Report Impact | Recovery Path | Assessment |
|---|---|---|---|---|
| Invoice dibatalkan/dihapus (Sales) | Cancel pada status post-approved memicu reversal jurnal; delete dibatasi draft/unpaid | Umumnya netral setelah reversal | Reverse otomatis via `journalUC.Reverse` | Partially compliant |
| Supplier invoice dibatalkan | Cancel hanya draft/submitted/approved; tidak ada cancel dari pending | Risiko stuck jika sudah AP recognized dan perlu batal | Perlu credit note/reversal flow eksplisit | Non-compliant |
| Payment gagal/partial | Partial status diinvoice didukung; pending payment lock ada | Jika confirm sukses, report update; jika confirm gagal aman | Retry payment confirm | Compliant |
| Jurnal tidak balance | Ditolak di validate/post | Tidak masuk report | Perbaiki lines lalu post ulang | Compliant |
| Transaksi pada periode closed | `ensureNotClosed` mencegah create/update/post jurnal | Mencegah posting ke periode tertutup | Reopen closing jika diperlukan | Partially compliant |
| Reversal setelah posting | Didukung (create reversal + mark original reversed) | Report membaca posted+reversed, net effect tercermin | Reversal endpoint | Partially compliant |
| Payment confirmed tapi jurnal gagal | Confirm tetap commit, jurnal hanya log warning | Risiko mismatch subledger vs GL | Belum ada auto-compensation/retry queue | Non-compliant |

## 8) Accounting Validation Matrix

| Source Transaction | Trigger Journal Point | Expected Accounts | Expected Journal Status | Expected Report Impact | Current Validation |
|---|---|---|---|---|---|
| Sales Invoice Regular | Invoice status ke unpaid/waiting/partial/paid | DR AR 11300; CR Revenue 4100; CR VAT Out 21500; DR COGS 5100; CR Inv 11400 | posted | AR, Revenue, COGS, Inventory, Tax | Implemented |
| Sales Payment | Payment confirm | DR Cash/Bank (BA COA/11100); CR AR 11300 atau Sales Advance 21200 | posted | Cash up, AR down | Implemented but non-atomic |
| Goods Receipt | GR close/confirm | DR Inventory 11400; CR GRIR 21100 | posted | Inventory up, GRIR up | Implemented |
| Supplier Invoice | Supplier invoice pending | CR AP 21000; DR GRIR 21100; DR VAT In 11800; DR Expense 61000 | posted | AP recognition, GRIR clearing | Implemented |
| Purchase Payment | Payment confirm | DR AP 21000 atau DR Advance 11900; CR Cash/Bank | posted | AP down, Cash down | Implemented but non-atomic |
| Financial Closing | Approve/year-end close | Close P&L ke retained earnings | posted | Lock period + equity transfer | Implemented |

## 9) Compliance Scorecard

| Domain | Verdict | Evidence Summary |
|---|---|---|
| Business Flow | Partially compliant | Status transition & workflow tersedia, tapi coexist legacy/new path menambah kompleksitas kontrol |
| Accounting Correctness | Partially compliant | COA mapping dan balancing kuat, tetapi payment confirm non-atomic terhadap journal creation |
| Traceability | Partially compliant | Reference tracking kuat via `reference_type/reference_id`, namun masih ada risiko orphan journal link pada failure path |
| Control & Auditability | Partially compliant | Audit log dan closing guard ada, tetapi edge case cancellation/reversal purchase belum komplet |

## 10) Gap List & Prioritized Fix

## Critical

### G1. Payment confirm non-atomic terhadap jurnal
- Severity: Critical
- Affected module: Sales Payment, Purchase Payment
- Impact: Mismatch subledger vs GL, laporan keuangan bisa under/overstated
- Root cause teknis: error trigger jurnal di confirm hanya di-log, tidak rollback transaksi payment
- Rekomendasi:
  - Jadikan journal posting bagian transaksi confirm (hard fail rollback), atau
  - Terapkan reliable outbox + retry worker + status `journal_sync_status`.

## High

### G2. Purchase invoice cancellation setelah AP recognition belum jelas
- Severity: High
- Affected module: Supplier Invoice / Purchase Journal
- Impact: Sulit koreksi invoice yang sudah pending/posted tanpa prosedur credit note formal
- Root cause teknis: status cancel tidak mencakup `pending`; tidak ada flow otomatis reversal AP invoice
- Rekomendasi:
  - Tambah flow `void/reverse supplier invoice` dengan generated reversing journal dan audit reason wajib.

### G3. Legacy dan new GR workflow berjalan bersamaan
- Severity: High
- Affected module: Goods Receipt
- Impact: Potensi inkonsistensi SOP dan test coverage (confirm vs close path)
- Root cause teknis: route dan usecase legacy tetap aktif
- Rekomendasi:
  - Deprecate route legacy `confirm` bertahap, enforce single workflow `draft->submitted->approved->closed`.

## Medium

### G4. Closing validation terlalu ketat terhadap reversed entries
- Severity: Medium
- Affected module: Financial Closing
- Impact: Periode bisa gagal close meski koreksi reversal sah secara akuntansi
- Root cause teknis: validation rule menolak semua status `reversed` dalam periode
- Rekomendasi:
  - Ubah rule: izinkan reversed jika pasangan reversal posted ada dan net impact valid.

### G5. Formal reconciliation matrix belum otomatis dieksekusi
- Severity: Medium
- Affected module: Cross-module controls
- Impact: Sulit membuktikan completeness source-to-journal ke auditor
- Root cause teknis: belum ada job/endpoint rekonsiliasi periodik
- Rekomendasi:
  - Tambah kontrol rekonsiliasi periodik:
    - source count vs journal count per reference_type
    - source amount vs journal net movement
    - mismatch report + blocking close jika mismatch > threshold.

## Low

### G6. Standardisasi reference type masih campuran alias legacy
- Severity: Low
- Affected module: Journal integration/report resolver
- Impact: Menambah kompleksitas resolver dan potensi salah mapping minor
- Root cause teknis: coexist canonical + legacy alias
- Rekomendasi:
  - Enforce canonical enum untuk semua producer journal dan migrasi data lama bertahap.

## Prioritized Remediation Plan

## Quick Wins (1-2 sprint)

1. Ubah confirm payment menjadi fail-fast bila journal posting gagal.
2. Tambah reconciliation endpoint/report harian (source->journal completeness).
3. Tambah alert monitoring untuk journal trigger failed dengan retry count.
4. Deprecation warning untuk GR legacy confirm route.

## Structural Fixes (3-6 sprint)

1. Implement outbox/event-driven journal posting dengan idempotent consumer.
2. Implement purchase invoice reversal/credit-note flow end-to-end.
3. Refactor closing validation agar reversal-aware (pairing original-reversal).
4. Unified accounting policy matrix per transaction type (single source of truth COA mapping + status gate).

## Assumptions & Open Risks

1. Evaluasi ini berbasis artefak backend/router/usecase/repository yang disebutkan; tidak semua handler/service/frontend detail diverifikasi baris-per-baris.
2. Belum diverifikasi data migration historis terkait konsistensi `reference_type` lama.
3. Belum ada bukti eksekusi full integration test untuk semua edge case dalam satu skenario periode close.
4. Area selain scope (mis. return, non-trade payable, asset maintenance) tidak dijadikan basis verdict utama.

## Conclusion

Implementasi saat ini sudah memiliki fondasi ERP enterprise yang kuat pada level arsitektur dan accounting engine. Namun, untuk mencapai audit-ready enterprise standard, prioritas utama adalah menutup gap atomicity source transaction vs journal posting, memperkuat reversal/cancellation flow purchase, dan menambahkan kontrol rekonsiliasi formal lintas modul sebelum financial closing.
