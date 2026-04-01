# Frontend Journey UAT Checklist (Analyzer-Aligned)

## Ringkasan
Checklist ini memastikan semua skenario analyzer yang sudah lulus di backend dapat direplikasi end-to-end dari frontend tanpa workaround.

## Scope
- Sales flow: SO -> Invoice -> Payment -> Journal
- Purchase flow: PO -> GR -> Invoice -> Payment -> Journal
- Finance flow: Journal -> GL -> P&L -> BS -> Closing
- Operational flow: Valuation run -> Journal impact, Financial closing run -> Journal/report impact
- Audit flow: Report -> Journal -> Source transaction

## Preconditions
- User login dengan role yang memiliki izin minimum: read + critical action sesuai modul
- Data master dan transaksi seed/test tersedia untuk semua skenario
- Tidak ada feature flag yang memblokir route atau action

## A. RBAC & Navigation
- [ ] Menu unauthorized tidak tampil di sidebar untuk semua modul (sales, purchase, finance)
- [ ] Route unauthorized redirect/block berjalan konsisten
- [ ] Tombol action kritikal tersembunyi/disabled saat permission tidak ada
- [ ] Tidak ada menu/route dead-end (klik menu selalu membuka halaman valid)

## B. Sales Journey
- [ ] Buka Sales Order dari list
- [ ] Dari SO, navigasi ke Invoice terkait berjalan
- [ ] Dari Invoice, navigasi ke Payment terkait berjalan
- [ ] Dari Payment/Sales impact, trace ke Journal berjalan
- [ ] Dari Journal, reference_code membuka source transaction yang benar

## C. Purchase Journey
- [ ] Buka Purchase Order dari list
- [ ] Dari PO, navigasi ke Goods Receipt terkait berjalan
- [ ] Dari GR, navigasi ke Supplier Invoice terkait berjalan
- [ ] Dari Invoice, navigasi ke Purchase Payment terkait berjalan
- [ ] Dari Payment/Purchase impact, trace ke Journal berjalan

## D. Finance Operational Actions
- [ ] Create journal manual berhasil
- [ ] Post journal dari status draft berhasil
- [ ] Reverse journal dari status posted berhasil
- [ ] Run valuation berhasil dan menampilkan hasil run + link ke jurnal hasil
- [ ] Run financial closing (create/approve/year-end) berhasil sesuai permission
- [ ] Setiap action menampilkan feedback sukses/gagal yang jelas

## E. Reports & Drill-Down Audit
- [ ] General Ledger menampilkan tombol Open Journal dan Open Source per transaksi
- [ ] Drill-down GL -> Journal -> Source transaction konsisten
- [ ] P&L -> Open GL -> Open Journal -> Open Source berjalan
- [ ] Balance Sheet -> Open GL -> Open Journal -> Open Source berjalan
- [ ] Tidak ada reference_type utama yang berakhir di path tidak valid

## F. UI State Consistency (Finance Main Lists)
- [ ] Loading state tersedia di list utama (journals, valuation, closing)
- [ ] Empty state tersedia dan informatif
- [ ] Error state konsisten dan visible
- [ ] Pagination/sorting/filter berjalan konsisten
- [ ] Clickable action punya affordance yang jelas

## G. Cross-Module Traceability
- [ ] Invoice -> Payment -> Journal -> Report dapat ditelusuri dua arah
- [ ] Sales/Purchase source dapat ditelusuri ke dampak finance
- [ ] Closing dan valuation impact bisa ditelusuri sampai ke laporan

## Defect Rules
- Prioritas P0: action kritikal tidak bisa dieksekusi
- Prioritas P1: drill-down salah tujuan/route invalid
- Prioritas P2: inconsistency state UI (loading/error/empty) tanpa bloker flow

## Exit Criteria
- 100% checklist lulus
- Tidak ada P0/P1 tersisa
- Semua flow analyzer map dapat dieksekusi manual di frontend
