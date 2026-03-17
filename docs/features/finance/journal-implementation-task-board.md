# Journal Implementation Task Board (Sprint-by-Sprint)

Dokumen ini menurunkan blueprint arsitektur menjadi task board implementasi 3 sprint yang siap dieksekusi.

## 0. Cara Baca Dokumen

Gunakan dokumen ini dengan urutan sederhana berikut:

1. Lihat `Progress Snapshot` untuk tahu posisi implementasi saat ini.
2. Lihat `Prioritas Saat Ini` untuk tahu page mana yang harus dikerjakan berikutnya.
3. Masuk ke section sprint yang relevan, lalu kerjakan per page.
4. Gunakan `Dependency Map` hanya saat perlu mengecek blocker antar task.
5. Gunakan `Engineering Board View` jika perlu memecah pekerjaan menjadi ticket detail.

## 0.1 Legend Status

| Status | Arti |
|---|---|
| Done | Sudah selesai dan sudah masuk ke codebase |
| In Progress | Sudah mulai dikerjakan, tetapi belum complete end-to-end |
| Not Started | Belum mulai implementasi |
| Pending | Menunggu dependency, validasi, atau page lain selesai |

## 0.2 Prioritas Saat Ini

Fokus implementasi berikutnya supaya board ini bergerak paling efisien:

| Priority | Page | Kenapa Penting | Next Action |
|---|---|---|---|
| 1 | Finance Journal Adjustment Page | Dibutuhkan untuk manual correction path | Done |
| 2 | Finance Reports Pages | Menutup gap governance untuk export action | Gate export GL/BS/PL by permission |
| 3 | Journal Valuation Page | Menyediakan entry point valuation sesuai blueprint | Done (Valuation logic, idempotent API, UX Form, Dashboard KPI) |
| 4 | Finance Navigation & Journals Pages | Menyelesaikan UX split domain journal | Done |
| 5 | Reconciliation & QA Validation | Dibutuhkan untuk sign-off sprint 2 | Tambah mismatch report dan validasi tie-out |


## 1. Planning Assumptions

- Durasi sprint: 2 minggu (10 hari kerja)
- Tim minimum:
  - BE-1 (Finance Core)
  - BE-2 (Sales/Purchase Integration)
  - QA-1 (Regression + Reconciliation)
- Strategi delivery: parallel run + feature flag + cutover bertahap
- Feature flag utama: `FINANCE_JOURNAL_ENGINE_V2`

## 1.1 Progress Snapshot (per 2026-03-16)

Status ringkas implementasi per page / flow terhadap board ini:

| Page / Flow | Status | Catatan Progress Aktual |
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
| Customer invoice regular journal trigger | Done | Trigger jurnal invoice regular sudah di-implement di `customer_invoice_usecase.go` dengan `PostOrUpdateJournal` |
| Customer invoice DP journal trigger | Done | Trigger jurnal invoice DP sudah di-implement di `customer_invoice_down_payment_usecase.go` dengan `PostOrUpdateJournal` |
| Adjustment journal dedicated CRUD/API hardening | Done | Dedicated adjustment CRUD, posting, and reversal endpoints implemented with hardened domain cross-checks. |
| Journal valuation endpoint run flow | Done | Valuation list, skeleton run endpoint, dan RBAC sudah diimplementasikan. |
| FE export gating di report pages (GL/BS/PL) | Done | Tombol export GL/BS/PL sekarang hanya tampil untuk role dengan permission export dan layout report mengikuti komponen standar |
| FE navigation split domain journal + route sync | In Progress | Sales & Adjustment Journal pages + menu + route validator active, split domain lain masih lanjut |
| Sales Journal page (Frontend) | Done | Halaman baru `/finance/journals/sales` sudah aktif dengan `PermissionGuard`, `PageMotion`, table/filter/export |
| Sales Journal RBAC (Backend) | Done | Permission `sales_journal.read`/`sales_journal.export` + route guard endpoint sales journal sudah aktif |
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
| D5 | Trigger Customer Invoice journal (regular + DP) | D0, D2 | GL consistency phase 2 | Done |
| D6 | Trigger Stock Opname adjustment journal | D0 | Adjustment journal completion | Done |
| D7 | Closing hardening + lock enforcement | D3, D4, D5, D6 | Production cutover | In Progress |
| D8 | Reconciliation job + monitoring | D3, D4 | Cutover safety | Not Started |
| D9 | Full regression + sign-off | D2..D8 | Go-live | In Progress |
| D10 | RBAC hardening trial balance + report export gating | D2 | Governance-ready rollout | Done |
| D11 | FE menu split domain journal + route sync | D2, D10 | UX cutover | In Progress |
| D12 | Timezone compliance reversal journal (`apptime`) | D0 | Posting consistency | Done |

## 3. Sprint 1 (Foundation + Safe Parallel Run)

### Sprint Goal

- Menyediakan API domain journal baru tanpa mengganggu flow existing.
- Menyalakan parallel run untuk Purchase + Sales Payment.

### Sprint 1 Pages

- Finance Journal Entries
- Purchase Posting Pages
- Sales Payment Page
- Trial Balance Page
- Journal Reversal Control
- Finance Validation & Documentation

### Execution by Page

#### Page: Finance Journal Entries

Tujuan page ini pada Sprint 1 adalah menyediakan read model journal engine yang bisa dipecah per domain tanpa mengganggu flow lama.

| Process | Task | Files | Output | Sprint Status |
|---|---|---|---|---|
| P1-1 | Finalisasi DTO/domain contract untuk list journal | `apps/api/internal/finance/domain/dto/journal_entry_dto.go` | Contract list journal siap dipakai handler | Done |
| P1-2 | Tambah repository filter by domain/reference type | `apps/api/internal/finance/data/repositories/journal_entry_repository.go` | Query reusable untuk sales/purchase/inventory/cash-bank | Done |
| P1-3 | Tambah facade usecase list by domain | `apps/api/internal/finance/domain/usecase/journal_entry_usecase.go` | Usecase domain journal aktif | Done |
| P1-4 | Tambah handler domain journal read-only | `apps/api/internal/finance/presentation/handler/journal_entry_handler.go` | Handler sales/purchase/inventory/cash-bank aktif | Done |
| P1-5 | Register route domain journal | `apps/api/internal/finance/presentation/router/journal_entry_routers.go`, `apps/api/internal/finance/presentation/routes.go` | Endpoint domain journal terdaftar | Done |
| P1-6 | Tambah observability baseline posting/idempotency trace | `apps/api/internal/finance/domain/usecase/journal_entry_usecase.go` dan trigger terkait | Baseline observability | Done |

#### Page: Purchase Posting Pages

Tujuan page ini pada Sprint 1 adalah memastikan semua transaksi Purchase yang menghasilkan jurnal masuk ke engine secara idempotent dan auto-post.

| Process | Task | Files | Output | Sprint Status |
|---|---|---|---|---|
| P1-7 | Convert Goods Receipt trigger ke upsert-post | `apps/api/internal/purchase/domain/usecase/goods_receipt_usecase.go` | GR journal posted + idempotent | Done |
| P1-8 | Convert Supplier Invoice trigger ke upsert-post | `apps/api/internal/purchase/domain/usecase/supplier_invoice_usecase.go` | SI journal posted + idempotent | Done |
| P1-9 | Convert Supplier Invoice DP trigger ke upsert-post | `apps/api/internal/purchase/domain/usecase/supplier_invoice_down_payment_usecase.go` | SIDP journal posted + idempotent | Done |
| P1-10 | Convert Purchase Payment trigger ke upsert-post | `apps/api/internal/purchase/domain/usecase/purchase_payment_usecase.go` | Purchase payment posted + idempotent | Done |

#### Page: Sales Payment Page

Tujuan page ini pada Sprint 1 adalah memastikan pembayaran customer masuk ke GL tanpa menyisakan draft journal.

| Process | Task | Files | Output | Sprint Status |
|---|---|---|---|---|
| P1-11 | Convert Sales Payment trigger ke upsert-post | `apps/api/internal/sales/domain/usecase/sales_payment_usecase.go` | Sales payment masuk GL tanpa draft tersisa | Done |

#### Page: Trial Balance Page

Tujuan page ini pada Sprint 1 adalah memisahkan privilege report dari privilege operasional journal.

| Process | Task | Files | Output | Sprint Status |
|---|---|---|---|---|
| P1-12 | Pisahkan permission trial balance dari `journal.read` | `apps/api/internal/finance/presentation/router/journal_entry_routers.go` | Report access lebih granular | Done |
| P1-13 | Update seeder permission trial balance | `apps/api/seeders/permission_seeder.go` | SoD report vs journal enforced | Done |

#### Page: Journal Reversal Control

Tujuan page ini pada Sprint 1 adalah memastikan reversal konsisten terhadap timezone aplikasi.

| Process | Task | Files | Output | Sprint Status |
|---|---|---|---|---|
| P1-14 | Ganti `time.Now()` ke `apptime.Now()` pada reversal | `apps/api/internal/finance/domain/usecase/journal_entry_usecase.go` | Reversal konsisten timezone aplikasi | Done |

#### Page: Finance Validation & Documentation

Tujuan page ini pada Sprint 1 adalah memastikan QA dan API contract sudah siap dipakai user internal/QA.

| Process | Task | Files | Output | Sprint Status |
|---|---|---|---|---|
| P1-15 | Smoke test finance report consistency | test suite finance/purchase/sales | Baseline GL/BS/PL pass | Done |
| P1-16 | Update Postman domain journal + trial balance | `docs/postman/postman.json` | Contract sinkron FE/QA | Done |

### Sprint 1 Exit Criteria

- Endpoint domain journal read-only aktif. ✅
- Purchase + Sales Payment auto-post idempotent. ✅
- Laporan GL/BS/PL tidak regression pada sample period. ✅ (smoke/targeted test level)

---

## 4. Sprint 2 (Sales Invoice + Inventory Adjustment)

### Sprint Goal

- Menutup gap utama: Sales Invoice journal dan Stock Opname adjustment journal.

### Sprint 2 Pages

- Finance Journal Sales Page
- Sales Customer DP Invoice Page
- Stock Opname Posting Page
- Finance Journal Adjustment Page
- Journal Valuation Page
- Finance Reports Pages
- Finance Navigation & Journals Pages
- Reconciliation & QA Validation

### Execution by Page

#### Page: Finance Journal Sales Page

Tujuan page ini pada Sprint 2 adalah menyediakan page journal khusus Sales yang bisa dipakai audit, reconciliation, dan review transaksi revenue secara terpisah dari journal umum.

| Process | Task | Files | Output | Sprint Status |
|---|---|---|---|---|
| P2-1 | Finalisasi posting matrix invoice regular | blueprint/matrix working sheet | Mapping AR/Revenue/Tax/COGS approved | Done |
| P2-2 | Implement trigger journal untuk customer invoice regular | `apps/api/internal/sales/domain/usecase/customer_invoice_usecase.go` | AR/Revenue/Tax/COGS jurnal posted | Done |
| P2-3 | Tambah page frontend Sales Journal | `apps/web/app/[locale]/(dashboard)/finance/journals/sales/page.tsx`, `apps/web/src/features/finance/journals/components/sales-journals-list.tsx` | Page Sales Journal aktif | Done |
| P2-4 | Tambah reusable UI untuk page ini (`StandardTable`, `FilterToolbar`, `ExportButton`) | `apps/web/src/features/finance/journals/components/standard-table.tsx`, `apps/web/src/features/finance/journals/components/filter-toolbar.tsx`, `apps/web/src/features/finance/journals/components/export-button.tsx` | UI konsisten dan reusable | Done |
| P2-5 | Tambah route service/hook khusus Sales Journal | `apps/web/src/features/finance/journals/services/finance-journals-service.ts`, `apps/web/src/features/finance/journals/hooks/use-finance-journals.ts` | Page bisa fetch data domain sales | Done |
| P2-6 | Tambah permission khusus Sales Journal | `apps/api/seeders/permission_seeder.go`, `apps/api/internal/finance/presentation/router/journal_entry_routers.go` | Access read/export terpisah dari journal umum | Done |
| P2-7 | Tambah menu dan route validator untuk Sales Journal | `apps/web/src/lib/navigation-config.ts`, `apps/web/src/lib/route-validator.ts` | Menu dan route valid | Done |
| P2-8 | Tambah unit/integration test fokus Sales Journal | `apps/api/internal/sales/domain/usecase/customer_invoice_usecase_test.go`, `apps/api/internal/finance/data/repositories/journal_entry_repository_test.go`, `apps/api/internal/finance/domain/usecase/journal_entry_integration_test.go` | Coverage flow sales journal tersedia | Done |

#### Page: Sales Customer DP Invoice Page

Tujuan page ini pada Sprint 2 adalah menutup gap journal untuk invoice DP customer agar flow sales lengkap.

| Process | Task | Files | Output | Sprint Status |
|---|---|---|---|---|
| P2-9 | Implement trigger jurnal invoice down payment | `apps/api/internal/sales/domain/usecase/customer_invoice_down_payment_usecase.go` | DP customer jurnal posted | Done |
| P2-10 | Tambah test DP invoice -> journal | sales finance tests | Flow DP tervalidasi | Done |

#### Page: Stock Opname Posting Page

Tujuan page ini pada Sprint 2 adalah memastikan adjustment inventory tercermin di GL saat stock opname diposting.

| Process | Task | Files | Output | Sprint Status |
|---|---|---|---|---|
| P2-11 | Implement adjustment journal saat post opname | `apps/api/internal/stock_opname/domain/usecase/stock_opname_usecase.go` | Gain/loss adjustment masuk GL | Done |

#### Page: Finance Journal Adjustment Page

Tujuan page ini pada Sprint 2 adalah menyiapkan manual adjustment process yang controlled dan reversible.

| Process | Task | Files | Output | Sprint Status |
|---|---|---|---|---|
| P2-12 | Finalisasi endpoint create/update/post/reverse adjustment | `apps/api/internal/finance/presentation/router/journal_entry_routers.go` + handler/usecase terkait | Manual adjustment process siap dipakai | Done |

#### Page: Journal Valuation Page

Tujuan page ini pada Sprint 2 adalah membuka entry point untuk valuation flow tanpa memaksa final engine sekaligus.

| Process | Task | Files | Output | Sprint Status |
|---|---|---|---|---|
| P2-13 | Implement valuation list + skeleton run endpoint | finance router/handler/usecase valuation | Entry point valuation tersedia | Done |

#### Page: Finance Reports Pages

Tujuan page ini pada Sprint 2 adalah menyelaraskan tombol export report dengan RBAC backend.

| Process | Task | Files | Output | Sprint Status |
|---|---|---|---|---|
| P2-14 | Gate export action GL/BS/PL by permission export | `apps/web/src/features/finance/reports/components/general-ledger-view.tsx`, `apps/web/src/features/finance/reports/components/balance-sheet-view.tsx`, `apps/web/src/features/finance/reports/components/profit-loss-view.tsx` | Export action sinkron dengan RBAC backend | Done |

#### Page: Finance Navigation & Journals Pages

Tujuan page ini pada Sprint 2 adalah memecah UX journal per domain secara bertahap agar user flow lebih jelas.

| Process | Task | Files | Output | Sprint Status |
|---|---|---|---|---|
| P2-15 | Split menu domain journal hierarchy | `apps/web/src/lib/navigation-config.ts` | Hierarki menu journal lebih jelas | Done |
| P2-16 | Sync route validator dengan page journal baru | `apps/web/src/lib/route-validator.ts` | Route journal baru tervalidasi | Done |
| P2-17 | Apply `PageMotion` pada journals/closing page terkait | `apps/web/app/[locale]/(dashboard)/finance/journals/page.tsx`, `apps/web/app/[locale]/(dashboard)/finance/closing/page.tsx`, `apps/web/app/[locale]/(dashboard)/finance/journals/adjustment/page.tsx` | UX konsisten sesuai design system | Done |

#### Page: Reconciliation & QA Validation

Tujuan page ini pada Sprint 2 adalah memastikan flow antar modul tie-out terhadap journal engine.

| Process | Task | Files | Output | Sprint Status |
|---|---|---|---|---|
| P2-18 | Uji skenario SO/DO/Invoice/Payment, GR/SI/Payment, Stock Opname | test suite backend + integration scripts | Cross-module journal completeness report | In Progress |
| P2-19 | Build mismatch report + stabilization fixes | reconciliation script + regression fixes | Ready for closing hardening | Not Started |

### Sprint 2 Exit Criteria

- Customer Invoice regular + DP menghasilkan jurnal posted. ✅
- Stock Opname menghasilkan adjustment journal. ✅
- Mismatch source vs posted journal menurun ke nol pada data uji. ⏳ Pending
- Tombol export report hanya tampil untuk role dengan permission export. ✅
- Menu domain journal tampil sesuai desain target dan route valid. ⏳ Pending

---

## 5. Sprint 3 (Closing Hardening + Production Cutover)

### Sprint Goal

- Memastikan period lock, year-end close, dan kontrol produksi stabil.

### Sprint 3 Pages

- Financial Closing Control Page
- Year-End Close Page
- Lock, Reopen, and Closing Tests
- Financial Statements Validation Page
- Documentation & Runbook Page
- Governance UAT Page
- Staging Cutover Page
- Production Readiness Page
- Production Cutover Page
- Hypercare Page

### Execution by Page

#### Page: Financial Closing Control Page

Tujuan page ini pada Sprint 3 adalah memastikan semua jalur posting tunduk pada period lock secara konsisten.

| Process | Task | Files | Output | Sprint Status |
|---|---|---|---|---|
| P3-1 | Audit semua jalur posting terhadap `ensureNotClosed` | `apps/api/internal/finance/domain/usecase/closing_guard.go` + jalur posting terkait | Backdated posting ke closed period selalu ditolak | In Progress |

#### Page: Year-End Close Page

Tujuan page ini pada Sprint 3 adalah mengeraskan closing tahunan supaya aman di-rerun dan taat kronologi reopen.

| Process | Task | Files | Output | Sprint Status |
|---|---|---|---|---|
| P3-2 | Hardening idempotency + guard latest reopen | `apps/api/internal/finance/domain/usecase/financial_closing_usecase.go` | Closing tahunan aman untuk rerun | In Progress |

#### Page: Lock, Reopen, and Closing Tests

Tujuan page ini pada Sprint 3 adalah memberi regression safety net untuk fitur closing.

| Process | Task | Files | Output | Sprint Status |
|---|---|---|---|---|
| P3-3 | Tambah negative test period lock/reopen/close | test suite finance closing | Regression control lock-period lengkap | Not Started |

#### Page: Financial Statements Validation Page

Tujuan page ini pada Sprint 3 adalah memastikan tie-out laporan keuangan sebelum dan sesudah close.

| Process | Task | Files | Output | Sprint Status |
|---|---|---|---|---|
| P3-4 | Full tie-out GL/BS/PL dan konsistensi pre-close vs post-close | regression suite + reconciliation evidence | Evidence sign-off QA + Finance | In Progress |

#### Page: Documentation & Runbook Page

Tujuan page ini pada Sprint 3 adalah mengunci dokumentasi operasional final sebelum cutover.

| Process | Task | Files | Output | Sprint Status |
|---|---|---|---|---|
| P3-5 | Update blueprint, task board, postman, runbook cutover | `docs/features/finance/journal-architecture-blueprint.md`, `docs/features/finance/journal-implementation-task-board.md`, `docs/postman/postman.json` | Dokumen operasional final | In Progress |

#### Page: Governance UAT Page

Tujuan page ini pada Sprint 3 adalah menyiapkan bukti audit untuk role visibility dan privilege gating.

| Process | Task | Files | Output | Sprint Status |
|---|---|---|---|---|
| P3-6 | Uji trial balance split, export gating, menu visibility per role | UAT scripts per role | Bukti UAT RBAC/UX untuk audit sign-off | Not Started |

#### Page: Staging Cutover Page

Tujuan page ini pada Sprint 3 adalah melakukan dry run end-to-end sebelum produksi.

| Process | Task | Files | Output | Sprint Status |
|---|---|---|---|---|
| P3-7 | Rehearsal cutover dengan feature flag aktif | deployment/checklist artifacts | Dry run tanpa blocker | Not Started |

#### Page: Production Readiness Page

Tujuan page ini pada Sprint 3 adalah memutuskan go/no-go dengan data readiness yang lengkap.

| Process | Task | Files | Output | Sprint Status |
|---|---|---|---|---|
| P3-8 | Final go/no-go review + rollback/monitoring/on-call check | readiness checklist | Keputusan go-live terverifikasi | Not Started |

#### Page: Production Cutover Page

Tujuan page ini pada Sprint 3 adalah mengaktifkan V2 engine secara bertahap dan terkendali.

| Process | Task | Files | Output | Sprint Status |
|---|---|---|---|---|
| P3-9 | Aktivasi bertahap V2 engine di produksi | rollout plan | V2 engine aktif stabil | Not Started |

#### Page: Hypercare Page

Tujuan page ini pada Sprint 3 adalah menjaga stabilisasi awal produksi sampai mismatch terkendali.

| Process | Task | Files | Output | Sprint Status |
|---|---|---|---|---|
| P3-10 | Monitoring mismatch, incident response, closeout report | monitoring dashboard + incident log | Stabilization complete | Not Started |

### Sprint 3 Exit Criteria

- Semua posting path lolos period lock. ⏳ In Progress
- Year-end close dan reopen mengikuti rule kronologis. ⏳ In Progress
- Cutover production stabil, mismatch nol atau dalam toleransi yang disepakati. ⏳ Pending

---

## 6. Engineering Board View (Ticket View)

Bagian ini dipakai jika task per page di atas perlu diturunkan lagi menjadi ticket implementasi yang lebih granular.

| Epic | Ticket | Priority | Owner | Sprint | Estimate | Status |
|---|---|---|---|---|---|---|
| Journal Domain API | Add sales journal endpoint | High | BE-1 | Sprint 1 | 1d | Done |
| Journal Domain API | Add purchase journal endpoint | High | BE-1 | Sprint 1 | 1d | Done |
| Journal Domain API | Add inventory/cash-bank journal endpoint | High | BE-1 | Sprint 1 | 1d | Done |
| Journal Domain API | Add adjustment journal endpoint | High | BE-1 | Sprint 2 | 1d | Done |
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
| Sales Integration | Add Customer Invoice journal trigger | Critical | BE-2 | Sprint 2 | 2d | Done |
| Sales Integration | Add Customer DP Invoice journal trigger | Critical | BE-2 | Sprint 2 | 2d | Done |
| Finance Security | Add Sales Journal permission + endpoint guard | High | BE-1 | Sprint 2 | 0.5d | Done |
| Frontend Page | Add Finance Sales Journal page | High | FE-1 | Sprint 2 | 1d | Done |
| Inventory Integration | Add Stock Opname adjustment journal | Critical | BE-2 | Sprint 2 | 2d | Done |
| Frontend RBAC | Gate trial balance action by report permission in journals page | High | FE-1 | Sprint 2 | 0.5d | Done |
| Frontend RBAC | Gate GL export button by export permission | High | FE-1 | Sprint 2 | 0.5d | Done |
| Frontend RBAC | Gate BS export button by export permission | High | FE-1 | Sprint 2 | 0.5d | Done |
| Frontend RBAC | Gate PL export button by export permission | High | FE-1 | Sprint 2 | 0.5d | Done |
| Frontend UX | Split menu to domain journal hierarchy | Medium | FE-1 | Sprint 2 | 1d | In Progress |
| Frontend UX | Sync route-validator with new finance journal routes | Medium | FE-1 | Sprint 2 | 0.5d | In Progress |
| Frontend UX | Apply PageMotion to journals and closing pages | Medium | FE-1 | Sprint 2 | 0.5d | In Progress |
| Closing Controls | Enforce period lock all posting paths | Critical | BE-1 | Sprint 3 | 2d | In Progress |
| Closing Controls | Harden year-end close idempotency | High | BE-1 | Sprint 3 | 1d | In Progress |
| QA and Reconciliation | Build mismatch daily report | High | QA-1 | Sprint 2 | 1d | Not Started |
| QA and Reconciliation | Full financial regression suite | Critical | QA-1 | Sprint 3 | 2d | In Progress |
| QA Governance | RBAC + export + menu visibility UAT | High | QA-1 | Sprint 3 | 1d | Not Started |
| Documentation | Update postman collection for new journal endpoints | Medium | BE-1 | Sprint 1 | 0.5d | Done |
| Testing | Add journal core unit/integration tests | Medium | BE-1 | Sprint 1 | 0.5d | Done |
| Testing | Add sales journal focused unit/integration tests | Medium | BE-2 | Sprint 2 | 0.5d | Done |

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
