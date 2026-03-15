# Journal Implementation Task Board (Sprint-by-Sprint)

Dokumen ini menurunkan blueprint arsitektur menjadi task board implementasi 3 sprint yang siap dieksekusi.

## 1. Planning Assumptions

- Durasi sprint: 2 minggu (10 hari kerja)
- Tim minimum:
  - BE-1 (Finance Core)
  - BE-2 (Sales/Purchase Integration)
  - QA-1 (Regression + Reconciliation)
- Strategi delivery: parallel run + feature flag + cutover bertahap
- Feature flag utama: `FINANCE_JOURNAL_ENGINE_V2`

## 1.1 Progress Snapshot (per 2026-03-15)

Status ringkas implementasi terhadap board ini:

| Area | Status | Catatan Progress Aktual |
|---|---|---|
| Domain Journal API (sales/purchase/inventory/cash-bank) | Done | Endpoint list domain sudah aktif di router/handler/usecase finance |
| Purchase auto-post idempotent | Done | GR, Supplier Invoice, Supplier Invoice DP, Purchase Payment sudah pindah ke `PostOrUpdateJournal` |
| Sales payment auto-post idempotent | Done | Trigger sales payment sudah pindah ke `PostOrUpdateJournal` |
| Reversal timezone compliance | Done | Reversal journal date sudah pakai `apptime.Now()` |
| Trial balance permission split | Done | Route trial balance sudah pakai `trial_balance_report.read` + seeder permission ditambahkan |
| Stock opname -> journal adjustment | Done | Stock opname post sekarang trigger jurnal adjustment idempotent |
| Journal reversal/attachment model & migration | Done | Model baru, auto-migrate registration, dan SQL migration files sudah dibuat |
| Frontend journals PageMotion | Done | Journals page sudah mengikuti `PageMotion` |
| Frontend trial balance action gating | Done | Tombol trial balance di journals list sudah pakai permission report khusus |
| Postman update (journal entries + trial balance) | Done | Collection finance sudah ditambah endpoint baru |
| Unit/integration test journal core | Done | Test validasi line + mapping domain + reverse metadata sudah ditambahkan |
| Customer invoice regular journal trigger | Not Started | Belum di-implement di `customer_invoice_usecase.go` |
| Customer invoice DP journal trigger | Not Started | Belum di-implement di `customer_invoice_down_payment_usecase.go` |
| Adjustment journal dedicated CRUD/API hardening | In Progress | Struktur domain sudah siap, endpoint khusus adjustment masih perlu finalisasi |
| Journal valuation endpoint run flow | Not Started | Baru tahap rencana, belum ada implementasi endpoint run yang lengkap |
| FE export gating di report pages (GL/BS/PL) | Not Started | Belum dipatch pada komponen report |
| FE navigation split domain journal + route sync | Not Started | Belum dipatch di navigation config dan route-validator |
| Closing hardening all posting paths | In Progress | Guard sudah ada, audit enforcement lintas jalur posting masih perlu finalisasi |
| Year-end close idempotency hardening | In Progress | Core year-end close sudah ada, hardening final belum complete |
| Reconciliation daily job + monitoring | Not Started | Belum ada implementasi job/report harian mismatch |

## 2. Dependency Map (Ringkas)

| ID | Task | Depends On | Blocking For | Status |
|---|---|---|---|
| D0 | Domain contract + DTO journal domain | - | Semua endpoint baru | Done |
| D1 | Repository filter by domain journal | D0 | Handler dan router domain journal | Done |
| D2 | Route/handler Sales-Purchase-Adjustment-Valuation journal | D0, D1 | FE/QA API test | In Progress |
| D3 | Ubah auto-post Purchase (GR, SI, SIDP, Payment) | D0 | GL consistency phase 1 | Done |
| D4 | Ubah auto-post Sales Payment | D0 | GL consistency phase 1 | Done |
| D5 | Trigger Customer Invoice journal (regular + DP) | D0, D2 | GL consistency phase 2 | Not Started |
| D6 | Trigger Stock Opname adjustment journal | D0 | Adjustment journal completion | Done |
| D7 | Closing hardening + lock enforcement | D3, D4, D5, D6 | Production cutover | In Progress |
| D8 | Reconciliation job + monitoring | D3, D4 | Cutover safety | Not Started |
| D9 | Full regression + sign-off | D2..D8 | Go-live | In Progress |
| D10 | RBAC hardening trial balance + report export gating | D2 | Governance-ready rollout | In Progress |
| D11 | FE menu split domain journal + route sync | D2, D10 | UX cutover | Not Started |
| D12 | Timezone compliance reversal journal (`apptime`) | D0 | Posting consistency | Done |

## 3. Sprint 1 (Foundation + Safe Parallel Run)

### Sprint Goal

- Menyediakan API domain journal baru tanpa mengganggu flow existing.
- Menyalakan parallel run untuk Purchase + Sales Payment.

### Execution by Page/Area

| Page/Area | Scope | Files | Output | Estimate |
|---|---|---|---|---|
| Finance Journal Domain API (Backend) | Finalisasi contract aggregate `JournalDocument` + DTO list domain journal | `apps/api/internal/finance/domain/dto/journal_entry_dto.go` | Contract API siap dipakai handler | 1 hari |
| Finance Journal Repository (Backend) | Tambah query helper filter by domain (sales/purchase/adjustment/valuation) | `apps/api/internal/finance/data/repositories/journal_entry_repository.go` | Query reusable dan siap unit test | 1 hari |
| Finance Journal Domain Endpoint (Backend) | Tambah usecase facade + handler read-only domain journal | `apps/api/internal/finance/domain/usecase/journal_entry_usecase.go`, `apps/api/internal/finance/presentation/handler/journal_entry_handler.go` | Logic query domain journal aktif | 1 hari |
| Finance Journal Routing (Backend) | Register route domain journal dan wiring route finance | `apps/api/internal/finance/presentation/router/journal_entry_routers.go`, `apps/api/internal/finance/presentation/routes.go` | Endpoint domain journal terdaftar | 1 hari |
| Purchase Pages Posting Path (Backend) | Ubah semua auto-journal purchase ke upsert+post idempotent | `apps/api/internal/purchase/domain/usecase/goods_receipt_usecase.go`, `apps/api/internal/purchase/domain/usecase/supplier_invoice_usecase.go`, `apps/api/internal/purchase/domain/usecase/supplier_invoice_down_payment_usecase.go`, `apps/api/internal/purchase/domain/usecase/purchase_payment_usecase.go` | Purchase posting path posted + idempotent | 1 hari |
| Sales Payment Page Posting Path (Backend) | Ubah trigger sales payment ke upsert+post | `apps/api/internal/sales/domain/usecase/sales_payment_usecase.go` | Sales payment masuk GL tanpa draft tersisa | 0.5 hari |
| Journal Reversal Control (Backend) | Timezone compliance reversal `time.Now` -> `apptime.Now` | `apps/api/internal/finance/domain/usecase/journal_entry_usecase.go` | Reversal date konsisten timezone aplikasi | 0.25 hari |
| Trial Balance Permission Page (Backend Security) | Pisahkan permission trial balance dari `journal.read` + update seeder | `apps/api/internal/finance/presentation/router/journal_entry_routers.go`, `apps/api/seeders/permission_seeder.go` | SoD report vs jurnal lebih granular | 0.5 hari |
| Journal Observability Layer (Backend) | Tambah logging event posting dan trace key idempotency | `apps/api/internal/finance/domain/usecase/journal_entry_usecase.go` dan usecase trigger terkait | Observability baseline aktif | 0.5 hari |
| Finance Reports Validation Page (QA) | Smoke test report consistency setelah update path posting | test suite finance/purchase/sales | Baseline GL/BS/PL consistency pass | 1 hari |
| API Documentation Page | Update Postman endpoint domain journal + release candidate notes | `docs/postman/postman.json` | Contract sinkron FE/QA + RC Sprint 1 | 1 hari |

### Sprint 1 Exit Criteria

- Endpoint domain journal read-only aktif. ✅
- Purchase + Sales Payment auto-post idempotent. ✅
- Laporan GL/BS/PL tidak regression pada sample period. ✅ (smoke/targeted test level)

---

## 4. Sprint 2 (Sales Invoice + Inventory Adjustment)

### Sprint Goal

- Menutup gap utama: Sales Invoice journal dan Stock Opname adjustment journal.

### Execution by Page/Area

| Page/Area | Scope | Files | Output | Estimate |
|---|---|---|---|---|
| Sales Invoice Posting Matrix Page | Finalisasi posting matrix invoice regular/DP termasuk VAT dan COGS | blueprint/matrix working sheet | Mapping account role final approved | 0.5 hari |
| Sales Customer Invoice Page (Backend) | Implement trigger jurnal invoice regular | `apps/api/internal/sales/domain/usecase/customer_invoice_usecase.go` | AR/Revenue/Tax/COGS jurnal posted | 1 hari |
| Sales Customer DP Invoice Page (Backend) | Implement trigger jurnal invoice down payment | `apps/api/internal/sales/domain/usecase/customer_invoice_down_payment_usecase.go` | DP customer jurnal posted | 1 hari |
| Stock Opname Posting Page (Backend) | Implement adjustment journal saat post opname | `apps/api/internal/stock_opname/domain/usecase/stock_opname_usecase.go` | Gain/loss adjustment masuk GL | 1 hari |
| Adjustment Journal Page/API | Implement endpoint create/update/post/reverse adjustment | `apps/api/internal/finance/presentation/router/journal_entry_routers.go` + handler/usecase terkait | Manual adjustment process siap dipakai | 1 hari |
| Journal Valuation Page/API | Implement valuation list + skeleton run endpoint | finance router/handler/usecase valuation | Entry point valuation tersedia | 1 hari |
| End-to-End Flow Validation Page (QA) | Uji skenario SO/DO/Invoice/Payment, GR/SI/Payment, Stock Opname | test suite backend + integration scripts | Cross-module journal completeness report | 1 hari |
| Finance Reports Pages (Frontend RBAC) | Gate export action berdasarkan permission export | `apps/web/src/features/finance/reports/components/general-ledger-view.tsx`, `apps/web/src/features/finance/reports/components/balance-sheet-view.tsx`, `apps/web/src/features/finance/reports/components/profit-loss-view.tsx` | Export action sinkron dengan RBAC backend | 1 hari |
| Finance Navigation Pages (Frontend UX) | Split menu domain journal, sync route validator, apply `PageMotion` | `apps/web/src/lib/navigation-config.ts`, `apps/web/src/lib/route-validator.ts`, `apps/web/app/[locale]/(dashboard)/finance/journals/page.tsx`, `apps/web/app/[locale]/(dashboard)/finance/closing/page.tsx` | UX + menu-action sesuai desain audit | 1 hari |
| Reconciliation & Stabilization Page | Build mismatch report, bugfix severity tinggi, sprint sign-off | reconciliation script + regression fixes | Ready for closing hardening | 2 hari |

### Sprint 2 Exit Criteria

- Customer Invoice regular + DP menghasilkan jurnal posted. ⏳ Pending
- Stock Opname menghasilkan adjustment journal. ✅
- Mismatch source vs posted journal menurun ke nol pada data uji. ⏳ Pending
- Tombol export report hanya tampil untuk role dengan permission export. ⏳ Pending
- Menu domain journal tampil sesuai desain target dan route valid. ⏳ Pending

---

## 5. Sprint 3 (Closing Hardening + Production Cutover)

### Sprint Goal

- Memastikan period lock, year-end close, dan kontrol produksi stabil.

### Execution by Page/Area

| Page/Area | Scope | Files | Output | Estimate |
|---|---|---|---|---|
| Financial Closing Control Page (Backend) | Audit dan enforce period lock di semua jalur posting | `apps/api/internal/finance/domain/usecase/closing_guard.go` + jalur posting terkait | Backdated posting ke closed period selalu ditolak | 1 hari |
| Year-End Close Page (Backend) | Hardening year-end close idempotency + guard latest reopen | `apps/api/internal/finance/domain/usecase/financial_closing_usecase.go` | Closing tahunan aman untuk rerun | 1 hari |
| Lock & Reopen Test Page (QA/Backend) | Tambah negative test period lock/reopen/close | test suite finance closing | Regression control lock-period lengkap | 1 hari |
| Financial Statements Validation Page (QA) | Full tie-out GL/BS/PL dan konsistensi pre-close vs post-close | regression suite + reconciliation evidence | Evidence sign-off QA + Finance | 1 hari |
| Documentation & Runbook Page | Update blueprint, board, postman, cutover runbook | `docs/features/finance/journal-architecture-blueprint.md`, `docs/features/finance/journal-implementation-task-board.md`, `docs/postman/postman.json` | Dokumen operasional final | 1 hari |
| Governance UAT Page | Uji role visibility: trial balance permission split, export gating, menu visibility | UAT scripts per role | Bukti UAT RBAC/UX untuk audit sign-off | 0.5 hari |
| Staging Cutover Page | Rehearsal cutover dengan feature flag aktif | deployment/checklist artifacts | Dry run tanpa blocker | 1 hari |
| Production Readiness Page | Final go/no-go review + rollback/monitoring/on-call check | readiness checklist | Keputusan go-live terverifikasi | 0.5 hari |
| Production Cutover Page | Aktivasi bertahap V2 engine di produksi | rollout plan | V2 engine aktif stabil | 0.5 hari |
| Hypercare Page | Monitoring mismatch, incident response, closeout report | monitoring dashboard + incident log | Stabilization complete | 2 hari |

### Sprint 3 Exit Criteria

- Semua posting path lolos period lock. ⏳ In Progress
- Year-end close dan reopen mengikuti rule kronologis. ⏳ In Progress
- Cutover production stabil, mismatch nol atau dalam toleransi yang disepakati. ⏳ Pending

---

## 6. Engineering Board View (Updated by Actual Progress)

| Epic | Ticket | Priority | Owner | Sprint | Estimate | Status |
|---|---|---|---|---|---|---|
| Journal Domain API | Add sales journal endpoint | High | BE-1 | Sprint 1 | 1d | Done |
| Journal Domain API | Add purchase journal endpoint | High | BE-1 | Sprint 1 | 1d | Done |
| Journal Domain API | Add inventory/cash-bank journal endpoint | High | BE-1 | Sprint 1 | 1d | Done |
| Journal Domain API | Add adjustment journal endpoint | High | BE-1 | Sprint 2 | 1d | In Progress |
| Journal Domain API | Add valuation journal endpoint | Medium | BE-1 | Sprint 2 | 1d | Not Started |
| Purchase Integration | Convert GR trigger to upsert-post | High | BE-2 | Sprint 1 | 0.5d | Done |
| Purchase Integration | Convert SI trigger to upsert-post | High | BE-2 | Sprint 1 | 0.5d | Done |
| Purchase Integration | Convert SIDP trigger to upsert-post | High | BE-2 | Sprint 1 | 0.5d | Done |
| Purchase Integration | Convert Purchase Payment trigger to upsert-post | High | BE-2 | Sprint 1 | 0.5d | Done |
| Sales Integration | Convert Sales Payment trigger to upsert-post | High | BE-2 | Sprint 1 | 0.5d | Done |
| Finance Core | Replace reversal time.Now with apptime.Now | Critical | BE-1 | Sprint 1 | 0.25d | Done |
| Finance Security | Split trial balance permission from journal.read | High | BE-1 | Sprint 1 | 0.5d | Done |
| Finance Security | Add trial balance permission seeder entries | High | BE-1 | Sprint 1 | 0.5d | Done |
| Finance Security | Add accountant/auditor role seeding | High | BE-1 | Sprint 1 | 0.5d | Done |
| Sales Integration | Add Customer Invoice journal trigger | Critical | BE-2 | Sprint 2 | 2d | Not Started |
| Sales Integration | Add Customer DP Invoice journal trigger | Critical | BE-2 | Sprint 2 | 2d | Not Started |
| Inventory Integration | Add Stock Opname adjustment journal | Critical | BE-2 | Sprint 2 | 2d | Done |
| Frontend RBAC | Gate trial balance action by report permission in journals page | High | FE-1 | Sprint 2 | 0.5d | Done |
| Frontend RBAC | Gate GL export button by export permission | High | FE-1 | Sprint 2 | 0.5d | Not Started |
| Frontend RBAC | Gate BS export button by export permission | High | FE-1 | Sprint 2 | 0.5d | Not Started |
| Frontend RBAC | Gate PL export button by export permission | High | FE-1 | Sprint 2 | 0.5d | Not Started |
| Frontend UX | Split menu to domain journal hierarchy | Medium | FE-1 | Sprint 2 | 1d | Not Started |
| Frontend UX | Sync route-validator with new finance journal routes | Medium | FE-1 | Sprint 2 | 0.5d | Not Started |
| Frontend UX | Apply PageMotion to journals and closing pages | Medium | FE-1 | Sprint 2 | 0.5d | In Progress |
| Closing Controls | Enforce period lock all posting paths | Critical | BE-1 | Sprint 3 | 2d | In Progress |
| Closing Controls | Harden year-end close idempotency | High | BE-1 | Sprint 3 | 1d | In Progress |
| QA and Reconciliation | Build mismatch daily report | High | QA-1 | Sprint 2 | 1d | Not Started |
| QA and Reconciliation | Full financial regression suite | Critical | QA-1 | Sprint 3 | 2d | In Progress |
| QA Governance | RBAC + export + menu visibility UAT | High | QA-1 | Sprint 3 | 1d | Not Started |
| Documentation | Update postman collection for new journal endpoints | Medium | BE-1 | Sprint 1 | 0.5d | Done |
| Testing | Add journal core unit/integration tests | Medium | BE-1 | Sprint 1 | 0.5d | Done |

---

## 7. Risk Register dan Mitigasi

| Risk | Dampak | Mitigasi |
|---|---|---|
| Journal duplicate karena retry | GL overstated | Wajib upsert by reference_type + reference_id |
| Timezone reversal tidak konsisten | Salah period posting | Wajib gunakan `apptime.Now()` di reversal |
| Report privilege leakage | Data export tidak sesuai role | Pisahkan permission read vs export dan gate di FE |
| Transaksi posted tapi journal draft | Laporan understate | Auto-post mode untuk system-generated journal |
| Closing lock tidak konsisten | Backdated mutation | Centralize `ensureNotClosed` di semua jalur posting |
| Mismatch antar modul | Audit finding | Daily reconciliation report + alert |
| Cutover failure | Operasional terganggu | Feature flag rollback plan + staged rollout |

## 8. Go-Live Gate

Go-live hanya jika semua poin ini pass:

- G1: API domain journal stable dan backward compatible.
- G2: Semua posting path utama menghasilkan posted journal.
- G3: Trial balance tie-out pass.
- G4: Balance sheet dan profit-loss tie-out pass.
- G5: Period lock negative tests pass.
- G6: Reconciliation mismatch = 0 pada 3 hari berturut-turut di staging.
- G7: Rollback rehearsal sukses.
- G8: Trial balance/report export permissions tervalidasi per role.
- G9: Menu-action domain journal tervalidasi per role.
