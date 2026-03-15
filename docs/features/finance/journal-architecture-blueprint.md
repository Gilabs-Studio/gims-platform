# Journal Architecture Blueprint (Implementation Ready)

Dokumen ini adalah turunan eksekusi dari analisis arsitektur finance untuk memastikan flow berikut berjalan konsisten dan scalable:

Sales/Purchase/Inventory/Banking -> Journal -> General Ledger -> Financial Statements -> Financial Closing.

## 1. Scope dan Objective

### Objective utama

- Menjadikan Journal sebagai accounting engine tunggal lintas modul.
- Memastikan semua transaksi bisnis menghasilkan jurnal yang benar, balance, dan idempotent.
- Menyediakan menu journal profesional: Sales, Purchase, Adjustment, Valuation, dan Cash and Bank.
- Menutup gap antara transaksi operasional dan laporan keuangan.

### Scope implementasi

- Backend API di apps/api/internal/finance.
- Integrasi trigger jurnal di modul Sales, Purchase, Inventory, Banking.
- Reporting hanya memakai journal status posted.
- Closing period dan year-end close sebagai pengunci final.

---

## 2. Keputusan Arsitektur: Journal Entries dan Journal Lines Digabung sebagai Satu Aggregate

Catatan user: Journal Entries dan Journal Lines ingin diperlakukan sebagai satu kesatuan karena secara accounting lines memang detail dari header.

### Keputusan desain

Secara domain dan API, gunakan satu resource bernama JournalDocument:

- JournalDocument.header = Journal Entry.
- JournalDocument.lines = Journal Lines.
- Semua operasi create, update, post, reverse dilakukan di level JournalDocument.

Secara storage fisik, tetap disarankan dua tabel relasional:

- journal_entries
- journal_lines

Alasan:

- Normalisasi data dan integritas referensial.
- Query GL per akun jauh lebih efisien.
- Mendukung volume line tinggi tanpa duplikasi kolom header.
- Tetap sesuai prinsip bahwa header dan lines adalah aggregate tunggal di service layer.

### Rule aggregate

- Wajib minimal 2 lines.
- Wajib balance: total debit = total credit.
- Tidak boleh modify setelah posted.
- Koreksi via reverse entry, bukan edit posted document.

---

## 3. Posting Engine Standard

### 3.1 Trigger event

Posting dilakukan pada status event accounting-relevant:

- APPROVED
- CONFIRMED
- CLOSED
- POSTED
- YEAR_END_CLOSE

### 3.2 Idempotency

Semua auto journal wajib upsert by:

- reference_type
- reference_id

Prinsip:

- Bila jurnal belum ada: create + post.
- Bila ada dan masih draft: update lines + post.
- Bila sudah posted: immutable (fail fast).

### 3.3 Posting mode

- System-generated journal: auto post.
- Manual adjustment journal: draft dulu, post oleh accountant.

---

## 4. Posting Matrix (Template dan Starter Rows)

### 4.1 Starter rows (pre-filled)

| Domain | Process | Status Trigger | Source Doc | Reference Type | Debit Account Role | Credit Account Role | Tax Role | Amount Basis | Posting Mode | Reverse Policy | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Sales | Customer Invoice Regular | Approved or Unpaid | Customer Invoice | CUSTOMER_INVOICE | AR, COGS | Revenue, VAT Out, Inventory | VAT Output | Invoice gross, tax, HPP | Auto posted | Reverse by credit note or reversal journal | Tambahkan trigger di customer invoice usecase |
| Sales | Customer Invoice Down Payment | Unpaid | DP Invoice | CUSTOMER_INVOICE_DP | AR DP | Customer Advance | Optional | DP amount | Auto posted | Reverse via DP cancellation or reversal | Saat ini belum auto-journal |
| Sales | Sales Payment | Confirmed | Sales Payment | SALES_PAYMENT | Cash or Bank | AR or Customer Advance | No | Payment amount | Auto posted | Reverse payment journal | Sudah ada pola trigger |
| Purchase | Goods Receipt | Closed | Goods Receipt | GOODS_RECEIPT | Inventory | GRIR | No | Received qty x cost | Auto posted | Reverse via return adjustment | Sudah ada, perlu upsert-post |
| Purchase | Supplier Invoice Normal | Approved to Unpaid | Supplier Invoice | SUPPLIER_INVOICE | GRIR, VAT In, Expense | AP | VAT Input | Subtotal, tax, extra cost | Auto posted | Reverse via debit note or reversal | Sudah ada, perlu upsert-post |
| Purchase | Supplier Invoice Down Payment | Approved to Unpaid | Supplier DP Invoice | SUPPLIER_INVOICE_DP | Supplier Advance | AP | No | DP amount | Auto posted | Reverse via DP void/reversal | Sudah ada, perlu upsert-post |
| Purchase | Purchase Payment | Confirmed | Purchase Payment | PURCHASE_PAYMENT | AP or Supplier Advance | Cash or Bank | No | Payment amount | Auto posted | Reverse payment journal | Sudah ada pola trigger |
| Inventory | Stock Opname Gain | Posted | Stock Opname | STOCK_OPNAME_GAIN | Inventory | Inventory Gain | No | Positive variance x cost | Auto posted | Reverse adjustment | Belum ada journal finance |
| Inventory | Stock Opname Loss | Posted | Stock Opname | STOCK_OPNAME_LOSS | Inventory Loss | Inventory | No | Negative variance x cost | Auto posted | Reverse adjustment | Belum ada journal finance |
| Inventory | Revaluation Up | Approved | Revaluation Run | INVENTORY_REVAL | Inventory | Revaluation Surplus | No | Revalued delta | Auto posted | Reverse revaluation | New feature |
| Inventory | Revaluation Down | Approved | Revaluation Run | INVENTORY_REVAL | Revaluation Loss | Inventory | No | Revalued delta | Auto posted | Reverse revaluation | New feature |
| Banking | Cash In | Posted | Cash and Bank Journal | CASH_BANK | Cash or Bank | Clearing or Revenue or AR | Optional | Transaction amount | Auto posted | Reverse journal | Sudah ada di cash-bank |
| Banking | Cash Out | Posted | Cash and Bank Journal | CASH_BANK | Expense or AP or Clearing | Cash or Bank | Optional | Transaction amount | Auto posted | Reverse journal | Sudah ada di cash-bank |
| Banking | Bank Transfer | Posted | Cash and Bank Journal | CASH_BANK_TRANSFER | Destination Bank | Source Bank | No | Transfer amount | Auto posted | Reverse transfer journal | Sudah ada di cash-bank |
| Finance | Year End Closing | Year-end close | Closing Run | YEAR_END_CLOSE | Revenue close lines, retained earnings for net loss | Expense close lines, retained earnings for net profit | No | Fiscal year aggregates | Auto posted | Reopen latest period then reverse | Sudah ada core logic |

### 4.2 Template kosong siap isi COA real

Gunakan tabel berikut untuk mapping final per perusahaan:

| Domain | Process | Status Trigger | Reference Type | Debit COA Code | Debit COA Name | Credit COA Code | Credit COA Name | Tax COA Code | Amount Formula | Source Field | Post Rule | Idempotency Key | Owner | Remarks |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Sales |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Sales |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Purchase |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Purchase |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Inventory |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Banking |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Finance |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

---

## 5. Draft API Contract Baru

Semua API ini adalah filtered view dari JournalDocument aggregate.

### 5.1 Sales Journal

- GET /api/v1/finance/journals/sales
- GET /api/v1/finance/journals/sales/export

Query params:

- page, per_page, search
- start_date, end_date
- status
- customer_id
- reference_type
- reference_id
- chart_of_account_id

Response data (ringkas):

- summary: total_debit, total_credit, posted_count, draft_count
- items[]:
	- journal_id
	- entry_date
	- description
	- reference_type
	- reference_id
	- status
	- lines[]
	- source_context (customer_name, invoice_number, payment_number)

### 5.2 Purchase Journal

- GET /api/v1/finance/journals/purchase
- GET /api/v1/finance/journals/purchase/export

Query params tambahan:

- supplier_id, purchase_order_id, goods_receipt_id, supplier_invoice_id

Response identik struktur sales journal.

### 5.3 Adjustment Journal

- GET /api/v1/finance/journals/adjustments
- POST /api/v1/finance/journals/adjustments
- PUT /api/v1/finance/journals/adjustments/:id
- POST /api/v1/finance/journals/adjustments/:id/post
- POST /api/v1/finance/journals/adjustments/:id/reverse

Create payload:

- entry_date
- description
- adjustment_type
- reference_type (optional)
- reference_id (optional)
- lines[]: chart_of_account_id, debit, credit, memo

Validation:

- balanced
- period open
- account active
- minimal 2 lines

### 5.4 Journal Valuation

- GET /api/v1/finance/journals/valuations
- POST /api/v1/finance/journals/valuations/inventory-revaluation
- POST /api/v1/finance/journals/valuations/fx-revaluation
- POST /api/v1/finance/journals/valuations/depreciation-run

Run response:

- valuation_run_id
- status
- generated_journal_ids[]
- warnings[]
- totals

### 5.5 Response envelope

Seluruh endpoint menggunakan response standar API project:

- success
- data
- meta.pagination (untuk list)
- timestamp
- request_id

---

## 6. Checklist Refactor Granular Per File + Estimasi Effort

### Legend

- Effort S: 0.5 sampai 1.5 jam
- Effort M: 2 sampai 4 jam
- Effort L: 5 sampai 8 jam
- Effort XL: 9 sampai 16 jam

### 6.1 Finance Core

| No | File | Change | Output | Effort | Risk |
|---|---|---|---|---|---|
| 1 | apps/api/internal/finance/domain/dto/journal_entry_dto.go | Tambah DTO untuk sales/purchase/adjustment/valuation list response | Contract siap dipakai FE | M | Low |
| 2 | apps/api/internal/finance/data/repositories/journal_entry_repository.go | Tambah query helper filter by domain journal | Reusable list function | M | Low |
| 3 | apps/api/internal/finance/domain/usecase/journal_entry_usecase.go | Tambah facade list by domain, jaga aggregate behavior header+lines | Single aggregate API | M | Medium |
| 4 | apps/api/internal/finance/presentation/handler/journal_entry_handler.go | Tambah handlers list domain journal | Endpoint domain journal aktif | M | Low |
| 5 | apps/api/internal/finance/presentation/router/journal_entry_routers.go | Register route baru journal domain | Routing siap dipakai | S | Low |
| 6 | apps/api/internal/finance/presentation/routes.go | Wire dependency usecase-handler baru | Endpoint terdaftar | S | Low |

### 6.2 Purchase Integration

| No | File | Change | Output | Effort | Risk |
|---|---|---|---|---|---|
| 7 | apps/api/internal/purchase/domain/usecase/goods_receipt_usecase.go | Ubah journalUC.Create jadi PostOrUpdateJournal | GR auto-post idempotent | M | Medium |
| 8 | apps/api/internal/purchase/domain/usecase/supplier_invoice_usecase.go | Ubah trigger journal ke PostOrUpdateJournal | SI auto-post idempotent | M | Medium |
| 9 | apps/api/internal/purchase/domain/usecase/supplier_invoice_down_payment_usecase.go | Ubah trigger DP journal ke PostOrUpdateJournal | SI DP auto-post idempotent | M | Medium |
| 10 | apps/api/internal/purchase/domain/usecase/purchase_payment_usecase.go | Ubah trigger payment journal ke PostOrUpdateJournal | Payment auto-post idempotent | M | Medium |

### 6.3 Sales Integration

| No | File | Change | Output | Effort | Risk |
|---|---|---|---|---|---|
| 11 | apps/api/internal/sales/domain/usecase/sales_payment_usecase.go | Ubah trigger journal ke PostOrUpdateJournal | Sales payment auto-post idempotent | M | Medium |
| 12 | apps/api/internal/sales/domain/usecase/customer_invoice_usecase.go | Tambah trigger AR and Revenue journal pada event accounting | Sales invoice masuk GL | L | High |
| 13 | apps/api/internal/sales/domain/usecase/customer_invoice_down_payment_usecase.go | Tambah trigger jurnal DP customer | DP customer masuk GL | L | High |

### 6.4 Inventory and Valuation

| No | File | Change | Output | Effort | Risk |
|---|---|---|---|---|---|
| 14 | apps/api/internal/stock_opname/domain/usecase/stock_opname_usecase.go | Tambah trigger adjustment journal saat post opname | Adjustment journal aktif | L | High |
| 15 | apps/api/internal/finance/domain/usecase/asset_usecase.go | Konsolidasi reference_type valuation agar terbaca menu valuation | Journal valuation konsisten | M | Medium |
| 16 | apps/api/internal/finance/presentation/router/journal_entry_routers.go | Tambah route valuation runs | Endpoint valuation siap | M | Medium |

### 6.5 Closing and Controls

| No | File | Change | Output | Effort | Risk |
|---|---|---|---|---|---|
| 17 | apps/api/internal/finance/domain/usecase/closing_guard.go | Audit semua jalur posting agar wajib check period lock | Konsistensi period lock | M | Medium |
| 18 | apps/api/internal/finance/domain/usecase/financial_closing_usecase.go | Hardening year-end close idempotency + observability | Closing aman produksi | M | Medium |

### 6.6 Documentation and QA

| No | File | Change | Output | Effort | Risk |
|---|---|---|---|---|---|
| 19 | docs/postman/postman.json | Tambah endpoint domain journal | API docs up to date | M | Low |
| 20 | docs/features/finance/journal-architecture-blueprint.md | Maintain blueprint as source of truth | Referensi tim lintas modul | S | Low |

### Estimasi total

- Backend core + integration: 58 sampai 86 jam engineering.
- QA dan regression: 16 sampai 24 jam.
- Total delivery: 74 sampai 110 jam.

Dengan 2 engineer backend + 1 QA, target realistis 2 sampai 3 sprint.

---

## 7. Migration Plan Aman (Tanpa Breaking Existing Flow)

### Phase 1 (Parallel run)

- Tambah endpoint domain journal baru tanpa menghapus endpoint lama.
- Aktifkan melalui feature flag FINANCE_JOURNAL_ENGINE_V2.
- Generate log pembanding journal lama vs baru.

### Phase 2 (Selective cutover)

- Cutover trigger Purchase dan Sales Payment dulu.
- Validasi GL, trial balance, BS, PL sebelum dan sesudah cutover.

### Phase 3 (High impact cutover)

- Aktivasi trigger Customer Invoice dan Stock Opname.
- Jalankan regression full periode.

### Phase 4 (Closing hard lock)

- Enforcement period lock di semua jalur posting.
- Year-end close dry run di staging.

### Phase 5 (Stabilization)

- Monitor mismatch report harian.
- Reconcile source transaction vs posted journal.

---

## 8. Acceptance Criteria Produksi

- Semua transaksi accounting-relevant menghasilkan posted journal.
- Seluruh jurnal auto-generated lolos rule balance.
- Report GL, BS, PL hanya membaca posted journal.
- Reopen closing hanya bisa dari periode approved terbaru.
- Tidak ada backdated posting ke periode yang sudah locked.
- Reconciliation source vs journal mismatch = 0 untuk periode uji.

---

## 9. Audit Final: Severity-Based Findings

Bagian ini memetakan temuan aktual dari validasi backend, frontend, RBAC, dan UX agar prioritas implementasi jelas.

| Severity | Finding | Current Evidence | Impact | Required Action | Owner |
|---|---|---|---|---|---|
| Critical | Trigger jurnal lintas modul belum konsisten idempotent karena masih pakai `journalUC.Create` | purchase: goods receipt, supplier invoice, supplier invoice DP, purchase payment; sales payment | Risiko duplicate posting saat retry/concurrency, mismatch GL | Standarkan semua trigger ke `PostOrUpdateJournal` dengan key `reference_type + reference_id` | BE-2 |
| Critical | Reversal journal masih gunakan `time.Now()` | `journal_entry_usecase.go` pada create reversal entry date | Risiko timezone drift, tidak konsisten standar `apptime` | Ganti ke `apptime.Now()` | BE-1 |
| High | Trial balance masih reuse permission `journal.read` | `journal_entry_routers.go` route `/reports/trial-balance` | Segregation of duties report vs journal entry tidak granular | Tambah permission khusus `trial_balance_report.read` | BE-1 |
| High | Tombol export report di FE belum gated by export permission | `general-ledger-view.tsx`, `balance-sheet-view.tsx`, `profit-loss-view.tsx` | UX menampilkan aksi yang berakhir 403, mengurangi trust | Tambah `useUserPermission` untuk permission export per report | FE-1 |
| Medium | Menu journal masih generic (Journal Entries + Journal Lines), belum domain-journal centric | `navigation-config.ts` | Flow operasional-ke-akuntansi kurang eksplisit untuk user enterprise | Split menu ke Sales/Purchase/Adjustment/Valuation/Cash-Bank Journal views | FE-1 |
| Medium | `route-validator.ts` hardcoded route lama | `route-validator.ts` list `/finance/journals`, `/finance/journal-lines` | Risiko route validasi tertinggal saat menu domain journal diaktifkan | Update route list mengikuti menu baru | FE-1 |
| Medium | Konsistensi `PageMotion` belum merata pada halaman finance utama | reports pages sudah pakai, journals/closing belum | Inconsistent UX transition terhadap standar | Samakan wrapper `PageMotion` di journals/closing pages | FE-1 |

### 9.1 Constraint valid yang sudah baik

- Laporan GL/BS/PL sudah mengambil data `posted` only.
- Closing guard sudah mencegah posting ke periode yang sudah ditutup.

---

## 10. Final RBAC Matrix (Role-Action)

Matrix ini adalah target final untuk pemisahan tugas (SoD) yang aman dan realistis untuk ERP skala menengah-besar.

Keterangan:

- `Y` = boleh
- `N` = tidak boleh
- `C` = conditional (butuh approval policy atau threshold nominal)

| Action | Super Admin | Finance Manager | Accountant | Finance Staff | Auditor | Viewer |
|---|---|---|---|---|---|---|
| journal.read | Y | Y | Y | Y | Y | Y |
| journal.create | Y | C | Y | C | N | N |
| journal.update (draft) | Y | C | Y | C | N | N |
| journal.delete (draft) | Y | C | Y | N | N | N |
| journal.post | Y | C | Y | N | N | N |
| journal.reverse | Y | Y | C | N | N | N |
| journal_line.read | Y | Y | Y | Y | Y | Y |
| trial_balance_report.read | Y | Y | Y | Y | Y | Y |
| general_ledger_report.read | Y | Y | Y | Y | Y | Y |
| general_ledger_report.export | Y | Y | Y | N | C | N |
| balance_sheet_report.read | Y | Y | Y | Y | Y | Y |
| balance_sheet_report.export | Y | Y | Y | N | C | N |
| profit_loss_report.read | Y | Y | Y | Y | Y | Y |
| profit_loss_report.export | Y | Y | Y | N | C | N |
| financial_closing.create | Y | Y | Y | N | N | N |
| financial_closing.approve | Y | Y | N | N | N | N |
| financial_closing.reopen | Y | Y | N | N | N | N |
| financial_closing.year_end | Y | Y | N | N | N | N |

Catatan kebijakan:

- `C` untuk Finance Manager/Accountant mengikuti nominal threshold dan approval matrix internal.
- Auditor dapat diberi export report terbatas jika ada legal/audit requirement tertulis.

---

## 11. Final Menu-Action Matrix per Jurnal Domain

Semua menu ini tetap membaca aggregate JournalDocument (header+lines), bukan membuat sumber ledger terpisah.

| Menu Domain Journal | Primary Purpose | Read | Create | Edit Draft | Post | Reverse | Export | Notes |
|---|---|---|---|---|---|---|---|---|
| Journal Entries (Generic) | Back-office maintenance & fallback | Y | Y | Y | Y | Y | Y | Dipertahankan selama masa transisi V1 -> V2 |
| Sales Journal | Observability transaksi sales ke ledger | Y | N | N | N | C | Y | Auto-generated dari Sales module, immutable by source |
| Purchase Journal | Observability transaksi purchase ke ledger | Y | N | N | N | C | Y | Auto-generated dari Purchase module |
| Adjustment Journal | Koreksi manual akuntansi | Y | Y | Y | Y | Y | Y | Wajib approval policy untuk nominal besar |
| Journal Valuation | Revaluation/depreciation runs | Y | C (run) | N | Y (run result) | C | Y | Lines hasil run tidak editable manual |
| Cash and Bank Journal | Operasional kas/bank + transfer | Y | Y | Y | Y | Y | Y | Tetap enforce idempotency by reference |

Kebijakan UX menu:

- Menu domain bukan duplikasi data, hanya filtered views dari sumber jurnal yang sama.
- Aksi manual hanya dibuka pada domain yang memang membutuhkan intervention (`Adjustment`, sebagian `Cash and Bank`).

---

## 12. Sprintized Remediation Plan per File (Audit-Driven)

Plan ini melengkapi checklist sebelumnya dengan fokus langsung pada temuan severity.

| Sprint | Priority | File | Change | Owner | Estimate |
|---|---|---|---|---|---|
| Sprint 1 | Critical | apps/api/internal/purchase/domain/usecase/goods_receipt_usecase.go | Ganti `journalUC.Create` ke `PostOrUpdateJournal` | BE-2 | 0.5d |
| Sprint 1 | Critical | apps/api/internal/purchase/domain/usecase/supplier_invoice_usecase.go | Ganti `journalUC.Create` ke `PostOrUpdateJournal` | BE-2 | 0.5d |
| Sprint 1 | Critical | apps/api/internal/purchase/domain/usecase/supplier_invoice_down_payment_usecase.go | Ganti `journalUC.Create` ke `PostOrUpdateJournal` | BE-2 | 0.5d |
| Sprint 1 | Critical | apps/api/internal/purchase/domain/usecase/purchase_payment_usecase.go | Ganti `journalUC.Create` ke `PostOrUpdateJournal` | BE-2 | 0.5d |
| Sprint 1 | Critical | apps/api/internal/sales/domain/usecase/sales_payment_usecase.go | Ganti `journalUC.Create` ke `PostOrUpdateJournal` | BE-2 | 0.5d |
| Sprint 1 | Critical | apps/api/internal/finance/domain/usecase/journal_entry_usecase.go | Ganti reversal `time.Now()` -> `apptime.Now()` | BE-1 | 0.25d |
| Sprint 1 | High | apps/api/internal/finance/presentation/router/journal_entry_routers.go | Pisahkan permission trial balance (`trial_balance_report.read`) | BE-1 | 0.25d |
| Sprint 1 | High | apps/api/seeders/permission_seeder.go | Tambah permission `trial_balance_report.read` dan optional `trial_balance_report.export` | BE-1 | 0.5d |
| Sprint 2 | High | apps/web/src/features/finance/reports/components/general-ledger-view.tsx | Gate tombol export by `general_ledger_report.export` | FE-1 | 0.5d |
| Sprint 2 | High | apps/web/src/features/finance/reports/components/balance-sheet-view.tsx | Gate tombol export by `balance_sheet_report.export` | FE-1 | 0.5d |
| Sprint 2 | High | apps/web/src/features/finance/reports/components/profit-loss-view.tsx | Gate tombol export by `profit_loss_report.export` | FE-1 | 0.5d |
| Sprint 2 | Medium | apps/web/src/lib/navigation-config.ts | Tambah hierarki menu Sales/Purchase/Adjustment/Valuation Journal | FE-1 | 1d |
| Sprint 2 | Medium | apps/web/src/lib/route-validator.ts | Sinkronkan route valid dengan menu domain journal baru | FE-1 | 0.5d |
| Sprint 2 | Medium | apps/web/app/[locale]/(dashboard)/finance/journals/page.tsx | Tambah wrapper `PageMotion` | FE-1 | 0.25d |
| Sprint 2 | Medium | apps/web/app/[locale]/(dashboard)/finance/closing/page.tsx | Tambah wrapper `PageMotion` | FE-1 | 0.25d |
| Sprint 3 | High | apps/api/internal/sales/domain/usecase/customer_invoice_usecase.go | Tambah trigger jurnal invoice regular (AR/Revenue/Tax/COGS) | BE-2 | 2d |
| Sprint 3 | High | apps/api/internal/sales/domain/usecase/customer_invoice_down_payment_usecase.go | Tambah trigger jurnal invoice DP | BE-2 | 2d |
| Sprint 3 | High | apps/api/internal/stock_opname/domain/usecase/stock_opname_usecase.go | Tambah trigger jurnal stock gain/loss | BE-2 | 2d |
| Sprint 3 | High | apps/api/internal/finance/domain/usecase/closing_guard.go | Audit enforce period lock di seluruh jalur posting | BE-1 | 1d |
| Sprint 3 | High | apps/api/internal/finance/domain/usecase/financial_closing_usecase.go | Hardening year-end idempotency + observability | BE-1 | 1d |

---

## 13. Catatan Implementasi Penting

- Domain-level digabung: JournalDocument aggregate.
- Storage-level tetap dua tabel untuk performa dan integritas.
- Jangan merge fisik jadi satu tabel wide karena akan menurunkan kualitas query GL dan maintainability.
- Bila diperlukan tampilan gabungan, gunakan view materialized atau query join terstandar.

