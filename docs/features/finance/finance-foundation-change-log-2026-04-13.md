# Finance Foundation Change Log

> **Module:** Finance
> **Sprint:** Foundation / Phase 0
> **Version:** 0.3.0
> **Status:** Phase 0 Complete (Code-Audited)
> **Last Updated:** April 15, 2026

## Overview

Dokumen ini disusun ulang dari audit file implementasi aktual (backend, frontend, seeder, routing, dan i18n), bukan pemindahan isi dokumen lama.

Scope Phase 0 yang sudah berjalan di kode mencakup:
- Foundation settings: Fiscal Year, Tax Configuration, Inventory Settings, Opening Balance.
- Journal lifecycle hardening: create/update/post/cancel/reverse + filter scope.
- Bridge route dan compatibility endpoint untuk migrasi path jurnal.
- Seeder foundation untuk bootstrap data PT. GiLabs.

## Audit Basis (File Groups)

### Backend domain and API wiring
- Models: fiscal year, tax configuration, inventory settings, opening balance line.
- Repositories, DTO, usecases, handlers, routers untuk semua foundation endpoint.
- Middleware validasi fiscal year aktif untuk operasi jurnal.
- Registration di finance `routes.go` dan database `migrate.go`.

### Backend journal lifecycle hardening
- Journal model diperluas: company/fiscal scope, journal number, reference, currency/exchange rate, cancelled status, reversal markers.
- Usecase jurnal diperluas: lock rule opening journal, cancel flow, posting fiscal-year validation, generation journal number by type.
- Router jurnal ditambah canonical path `/finance/journals` dan method compatibility (POST/PATCH).

### Seeder and permission/menu alignment
- Seeder foundation baru untuk fiscal year, tax config, inventory settings, opening balance.
- Seeder integration/e2e diperbarui agar mengisi `company_id` pada jurnal.
- Menu + permission seeder diselaraskan untuk route settings baru.

### Frontend settings and journal updates
- Finance settings pages diaktifkan (tidak redirect lagi), dengan panel operasional.
- Wizard opening balance ditulis ulang ke flow save-on-next (bukan autosave agresif).
- Journal UI/service dipindah ke base endpoint canonical `/finance/journals`.
- Status `cancelled`, aksi cancel, balance indicator, dan filter jurnal ditambahkan.

## Implemented Features (Phase 0)

### 1. Fiscal Year Management
- CRUD + activate + lock endpoint tersedia.
- Guardrail bisnis tersedia:
  - hanya satu fiscal year active per company,
  - lock mensyaratkan opening balance sudah posted,
  - lock menolak jika ada posted journal di rentang fiscal year,
  - validasi rentang 12 bulan penuh.

### 2. Tax Configuration
- CRUD + toggle status endpoint tersedia.
- Guardrail bisnis tersedia:
  - tax code unik per company,
  - rate tervalidasi 0..100,
  - account tax wajib account aktif + postable.

### 3. Inventory Settings
- Endpoint get + upsert + average cost tersedia.
- Lock semantics tersedia untuk mencegah perubahan valuation method setelah terkunci.
- Ownership rounding account dipindah dari inventory settings ke accounting mapping (single source of truth).

### 4. Opening Balance Draft/Simulate/Post
- Draft line disimpan di `opening_balance_lines`.
- Endpoint get, upsert, validate, simulate, summary, post tersedia.
- Posting menghasilkan journal type opening balance + journal lines + efek cash/bank jika account bank mapping tersedia.
- Draft line dibersihkan setelah post sukses.

### 5. Journal Lifecycle and Route Compatibility
- Status baru `cancelled` ditambahkan.
- Aksi `cancel` ditambahkan di backend + frontend.
- Aksi post/reverse mendukung method tambahan (`PATCH`) untuk compatibility.
- Filter list jurnal mendukung company/fiscal year/journal type.
- Canonical endpoint `/finance/journals` sudah aktif dan dipakai frontend.

### 6. Navigation, Route Validation, i18n
- Menu Finance Settings menambahkan Inventory Settings dan Opening Balance.
- `route-validator` menambahkan route settings baru.
- Label i18n EN/ID untuk menu baru dan status jurnal baru sudah ditambahkan.

## API Surface Added/Changed (Phase 0)

### Foundation settings
- `GET /api/v1/finance/fiscal-years`
- `POST /api/v1/finance/fiscal-years`
- `PUT /api/v1/finance/fiscal-years/:id`
- `PATCH /api/v1/finance/fiscal-years/:id/activate`
- `PATCH /api/v1/finance/fiscal-years/:id/lock`
- `GET /api/v1/finance/taxes`
- `POST /api/v1/finance/taxes`
- `PUT /api/v1/finance/taxes/:id`
- `PATCH /api/v1/finance/taxes/:id/toggle-status`
- `GET /api/v1/finance/inventory-settings`
- `PUT /api/v1/finance/inventory-settings`
- `GET /api/v1/finance/inventory-settings/avg-cost/:product_id`
- `GET /api/v1/finance/opening-balance`
- `PUT /api/v1/finance/opening-balance`
- `POST /api/v1/finance/opening-balance/validate`
- `POST /api/v1/finance/opening-balance/simulate`
- `GET /api/v1/finance/opening-balance/summary`
- `POST /api/v1/finance/opening-balance/post`

### Journal lifecycle (extended)
- `POST/PATCH /api/v1/finance/journals/:id/post`
- `POST/PATCH /api/v1/finance/journals/:id/reverse`
- `POST/PATCH /api/v1/finance/journals/:id/cancel`
- List jurnal: filter `company_id`, `fiscal_year_id`, `journal_type`, `status` (termasuk `cancelled`).

## Key Risks Observed During Audit

- Opening balance post masih bergantung pada kualitas mapping bank account terhadap COA; bila mapping tidak ada, efek cash/bank tidak terbentuk.
- Scope query (`company_id`, `fiscal_year_id`) masih eksplisit di banyak endpoint; konsistensi lintas modul perlu terus dijaga.
- Test execution penuh masih bisa terpengaruh constraint environment (CGO/WebP dependency).

## Evidence Reference

Dokumen rencana lanjutan sudah dipisah di:
- [finance-foundation-phase-1-plan.md](finance-foundation-phase-1-plan.md)
