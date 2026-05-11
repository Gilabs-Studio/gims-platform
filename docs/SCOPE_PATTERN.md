# Scope Pattern Audit

## Audit Notes

- File yang disebut di request, `apps/web/src/features/general/dashboard/types.ts`, tidak ditemukan.
- Tipe dashboard yang aktual berada di [apps/web/src/features/general/dashboard/types/index.d.ts](../apps/web/src/features/general/dashboard/types/index.d.ts).
- Temuan penting dari audit ini: `InjectDashboardScope` membaca `role_id`, tetapi `AuthMiddleware` tidak pernah mengisi `role_id` ke context. Itu membuat override scope dashboard berisiko tidak pernah aktif pada request normal kecuali ada middleware lain di luar file referensi ini yang mengisi key tersebut.

## A. Arsitektur Middleware Chain

Urutan yang terbaca dari kode aktual untuk route dashboard adalah:

1. `AuthMiddleware` → validasi JWT, set `user_id`, `user_email`, `user_role`, `tenant_id`, `is_system_admin`, `user_permissions`, `user_permissions_scope` → context keys: `user_id`, `user_email`, `user_role`, `tenant_id`, `is_system_admin`, `user_permissions`, `user_permissions_scope`
2. `ScopeMiddleware` → resolve employee profile dan assignment outlet/warehouse/area → context keys: `scope_context`, `scope_user_id`, `scope_employee_id`, `scope_division_id`, `scope_outlet_ids`, `scope_area_ids`, `scope_warehouse_ids`
3. `InjectDashboardScope` → baca `role_id`, `user_id`, `tenant_id`, query `role_menu_access` untuk menu `/dashboard`, override scope dashboard → context key: `permission_scope`; jika scope `OUTLET`, juga inject `scope_outlet_ids`
4. `RequirePermission("dashboard.view")` → validasi permission dan inject scope permission level → context key: `permission_scope`
5. Handler → baca `user_id` dan query params, lalu kirim ke usecase

Referensi kode:
- [AuthMiddleware](../apps/api/internal/core/middleware/auth.go)
- [ScopeMiddleware](../apps/api/internal/core/middleware/scope.go)
- [InjectDashboardScope dan RequirePermission](../apps/api/internal/core/middleware/permission.go)
- [Dashboard router](../apps/api/internal/general/presentation/router/dashboard_router.go)
- [Route registration](../apps/api/internal/general/presentation/routers.go)

## B. Scope Resolution Flow

1. `Client` → kirim request dashboard dengan JWT dan query params `scope`, `start_date`, `end_date`, `year`, opsional `outlet_id` → request diterima router.
2. `AuthMiddleware` → validasi token, isi identitas user dan permission map → `user_id`, `user_role`, `tenant_id`, `user_permissions`, `user_permissions_scope`.
3. `ScopeMiddleware` → resolve employee row dari `employees` dan assignment dari `employee_areas`, `employee_outlets`, `employee_warehouses` → `scope_employee_id`, `scope_outlet_ids`, `scope_warehouse_ids`, `scope_area_ids`, dll.
4. `InjectDashboardScope` → query menu `/dashboard` lalu `role_menu_access.scope` → override `permission_scope`; jika scope `OUTLET`, query outlet assignment user dan inject `scope_outlet_ids`.
5. `RequirePermission("dashboard.view")` → cek akses, lalu set `permission_scope` final ke context.
6. `DashboardHandler` → bind query params, tempel `user_id` ke DTO request, lalu pilih `GetOverview` atau `GetOverviewByScope`.
7. `DashboardUsecase` → tentukan scope spesifik; untuk `pos` jalur masuk ke `loadPOSScopedResponse`, untuk `hr` ke `loadHRScopedResponse`, untuk `crm` ke `loadCRMScopedResponse`.
8. `dashboard_repository` → ambil `permission_scope` dan `scope_*` dari context, lalu pilih filter:
   - `buildScopeWhereClause` untuk `sales_orders`, `employees`, `journal_entries`
   - `resolveDashboardOutletIDs` untuk KPI dashboard umum
   - `resolveAccessiblePOSOutletIDs` untuk summary POS yang lebih spesifik
9. `Repository query` → SQL dijalankan dengan filter outlet/warehouse/division/area/own sesuai scope yang tersisa.

Referensi utama:
- [Dashboard handler](../apps/api/internal/general/presentation/handler/dashboard_handler.go)
- [Dashboard usecase](../apps/api/internal/general/domain/usecase/dashboard_usecase.go)
- [Dashboard repository](../apps/api/internal/general/data/repositories/dashboard_repository.go)

## C. Pola Pembuatan MenuScope Middleware

Template generik yang diekstrak dari `InjectDashboardScope`:

### Input yang dibutuhkan

- `db *gorm.DB`
- context request yang sudah punya `user_id`, `tenant_id`, dan idealnya `role_id`
- menu URL target, saat ini hardcoded ke `/dashboard`

### Cara baca `role_menu_access` dari DB

1. Cari `menu_id` dari tabel `menus` berdasarkan `url = '/dashboard'` dan `deleted_at IS NULL`.
2. Cari record aktif di `role_menu_access` dengan filter:
   - `role_id = ?`
   - `menu_id = ?`
   - `is_enabled = true`
   - `deleted_at IS NULL`
3. Ambil kolom `scope` sebagai override.

### Cara override `permission_scope` di context

- Normalisasi scope ke uppercase.
- Set `permission_scope` pada Gin context dan request context.
- Override ini terjadi sebelum `RequirePermission` dijalankan, sehingga scope menu-level bisa mengalahkan scope permission-level.

### Cara inject `outlet_ids` jika scope = OUTLET

- Jika `menuScope == 'OUTLET'` dan `user_id` tersedia, query `employee_outlets` via join ke `employees` dengan `employees.user_id = ?`.
- Jika outlet ditemukan, set `scope_outlet_ids` ke Gin context dan request context.
- Jika kosong, middleware hanya menyimpan `permission_scope` dan downstream repository akan melihat no-access / empty-slice behavior.

Catatan audit:
- Pola ini saat ini hanya dipakai di dashboard.
- Karena `role_id` tidak diisi oleh `AuthMiddleware`, middleware ini kemungkinan besar tidak aktif pada request normal sampai ada sumber `role_id` lain.

Referensi:
- [InjectDashboardScope](../apps/api/internal/core/middleware/permission.go)

## D. Pola Repository Scope Filter

### Signature yang direkomendasikan

```text
ApplyScopeFilter(db *gorm.DB, ctx context.Context, opts ScopeQueryOptions) *gorm.DB
```

### Kondisi return semua data

- `permission_scope` kosong
- `permission_scope == 'ALL'`
- user adalah system admin

### Kondisi filter by outlet_ids

- scope aktif adalah `OUTLET`
- atau scope aktif `WAREHOUSE` dan `scope_outlet_ids` sudah di-resolve dari warehouse assignment
- query memakai `opts.OutletIDColumn`, atau fallback ke `opts.OutletJoinSQL`, atau fallback subquery employee-outlet

### Kondisi return empty

- scope `OUTLET` tapi `scope_outlet_ids` kosong → return `1 = 0` / empty slice
- scope `WAREHOUSE` tapi warehouse assignment kosong dan tidak ada fallback outlet
- scope `OWN` / `DIVISION` / `AREA` tapi assignment terkait kosong → fallback ke own atau return empty sesuai helper yang dipakai

### Pola resolver yang benar-benar dipakai di repo dashboard

- `resolveDashboardOutletIDs(ctx, db)` → untuk KPI dashboard umum.
- `resolveAccessiblePOSOutletIDs(ctx, db, userID)` → untuk POS summary yang mempertimbangkan full access, explicit outlet assignment, manager outlet, lalu warehouse fallback.

Referensi:
- [Scope resolver](../apps/api/internal/core/infrastructure/security/scope_resolver.go)
- [Dashboard repository](../apps/api/internal/general/data/repositories/dashboard_repository.go)

## E. Pola Frontend Service

### Cara scope param dikirim ke API

- `dashboardService.getOverviewScope(scope, filter, outletId)` mengirim query params:
  - `start_date`
  - `end_date`
  - `year`
  - `scope`
  - `outlet_id` jika ada

### Bagaimana outlet_id opsional dikirim

- `outlet_id` hanya ditambahkan jika parameter `outletId` terisi.
- Hook POS memanggil service dua kali: sekali untuk overview umum, sekali lagi untuk outlet terpilih jika bukan `all`.

### TypeScript interface yang dipakai

- `DashboardDateFilter`
- `DashboardOverviewScope`
- `DashboardOverviewData`
- `WidgetConfig`

Struktur aktual ada di [apps/web/src/features/general/dashboard/types/index.d.ts](../apps/web/src/features/general/dashboard/types/index.d.ts).

### Pola hook fetching data

- `useDashboardWidgetOverview(widgetType, { enabled, outletId })`
- `usePosOutletOverview(widgetType, enabled, options)` membungkus hook dashboard dan mengelola outlet selection state.

Referensi:
- [dashboard-service.ts](../apps/web/src/features/general/dashboard/services/dashboard-service.ts)
- [use-dashboard.ts](../apps/web/src/features/general/dashboard/hooks/use-dashboard.ts)
- [use-pos-outlet-overview.ts](../apps/web/src/features/general/dashboard/hooks/use-pos-outlet-overview.ts)

## F. Gap Analysis per Modul

| Modul | File Repository | Ada ApplyScopeFilter? | Ada MenuScope middleware? | Status |
|---|---|---:|---:|---|
| finance | [apps/api/internal/finance/data/repositories/journal_entry_repository.go](../apps/api/internal/finance/data/repositories/journal_entry_repository.go) | Ya | Tidak | Present, scope repository sudah berjalan |
| sales | [apps/api/internal/sales/data/repositories/sales_order_repository.go](../apps/api/internal/sales/data/repositories/sales_order_repository.go) | Ya | Tidak | Present, scope repository sudah berjalan |
| purchase | [apps/api/internal/purchase/data/repositories/purchase_order_repository.go](../apps/api/internal/purchase/data/repositories/purchase_order_repository.go) | Ya | Tidak | Present, scope repository sudah berjalan |
| crm | [apps/api/internal/crm/data/repositories/lead_repository.go](../apps/api/internal/crm/data/repositories/lead_repository.go) | Ya | Tidak | Present, scope repository sudah berjalan |
| hrd | [apps/api/internal/hrd/data/repositories/attendance_record_repository.go](../apps/api/internal/hrd/data/repositories/attendance_record_repository.go) | Ya | Tidak | Present, scope repository sudah berjalan |
| stock/inventory | [apps/api/internal/inventory/data/repositories/stock_movement_repository.go](../apps/api/internal/inventory/data/repositories/stock_movement_repository.go) | Ya | Tidak | Present, scope repository sudah berjalan |
| reports | [apps/api/internal/report/data/repositories/sales_overview_repository.go](../apps/api/internal/report/data/repositories/sales_overview_repository.go) | Tidak | Tidak | Gap, masih tenant-only dan belum pakai ApplyScopeFilter |
| travel_planner | [apps/api/internal/travel_planner/data/repositories/travel_plan_repository.go](../apps/api/internal/travel_planner/data/repositories/travel_plan_repository.go) | Tidak | Tidak | Gap, repository masih pakai pengecekan `permission_scope` ad hoc |

Catatan:
- Modul reports memang memakai tenant scoping via `resolveReportTenantScope`, tetapi bukan `ApplyScopeFilter`.
- Modul travel_planner memang punya `ApplyScopeFilter` di usecase [visit_planner_usecase.go](../apps/api/internal/travel_planner/domain/usecase/visit_planner_usecase.go), tetapi bukan di repository.

## G. Daftar Context Keys

| key_name | type | di-set oleh middleware mana | dipakai di mana |
|---|---|---|---|
| user_id | string | AuthMiddleware | ScopeMiddleware, InjectDashboardScope, handler dashboard, repository dashboard, travel_planner repo, audit/logging |
| user_email | string | AuthMiddleware | audit/logging dan request context infra |
| user_role | string | AuthMiddleware | RequirePermission, auth bypass, repo scope helpers, logging |
| tenant_id | string | AuthMiddleware | InjectDashboardScope, repository `scoped`, report tenant scope |
| is_system_admin | bool | AuthMiddleware | `IsSystemAdmin`, RequirePermission bypass, repository scoped, report tenant scope |
| user_permissions | map[string]bool | AuthMiddleware | RequirePermission |
| user_permissions_scope | map[string]string | AuthMiddleware | RequirePermission, `permissionScopeFromContext` |
| scope_context | *middleware.ScopeContext | ScopeMiddleware | `GetScopeContext` helper, downstream handlers/services bila diperlukan |
| scope_user_id | string | ScopeMiddleware | `ApplyScopeFilter`, dashboard repository scope helpers |
| scope_employee_id | string | ScopeMiddleware | `ApplyScopeFilter`, dashboard repository scope helpers |
| scope_division_id | string | ScopeMiddleware | `ApplyScopeFilter`, dashboard repository scope helpers |
| scope_area_ids | []string | ScopeMiddleware | `ApplyScopeFilter`, dashboard repository scope helpers |
| scope_outlet_ids | []string | ScopeMiddleware, InjectDashboardScope | `ApplyScopeFilter`, dashboard repository, POS resolver |
| scope_warehouse_ids | []string | ScopeMiddleware | `ApplyScopeFilter`, dashboard repository, POS resolver |
| permission_scope | string | RequirePermission, InjectDashboardScope | dashboard repository, travel_planner repo, `ApplyScopeFilter`, `scope_check` helpers |
| role_id | string | tidak di-set oleh auth/scope/permission middleware ini | dibaca oleh `InjectDashboardScope`; ini gap nyata |
| client_ip | string | AuthMiddleware via request context | audit/infra services |
| user_agent | string | AuthMiddleware via request context | audit/infra services |

## Kontrak Backend

1. Setiap domain usecase yang scope-aware wajib menerima `ctx context.Context` dan membaca scope dari context, bukan dari header atau query string langsung.
2. Untuk endpoint yang mengembalikan payload parsial, bentuk standar yang dipakai adalah `Get<Feature>ByScope(ctx context.Context, req <Feature>Request)`.
3. Helper repository standar adalah `ApplyScopeFilter(db *gorm.DB, ctx context.Context, opts ScopeQueryOptions) *gorm.DB`.
4. Jika domain punya pengecualian akses berbasis menu, middleware standar yang dipakai adalah `InjectMenuScope(db *gorm.DB) gin.HandlerFunc` atau variasi spesifik per menu, tetapi tetap harus mengisi `permission_scope` dan, bila perlu, `scope_outlet_ids`.
5. Middleware scope harus tetap berurutan: Auth → Scope → MenuScope → RequirePermission.

## Kontrak Frontend

1. Interface standar untuk parameter scope adalah gabungan `DashboardDateFilter` + `scope` + opsional `outletId`; jika distandardisasi, nama yang konsisten adalah `DashboardScopeParams`.
2. Hook pattern standar adalah `use<Feature>WidgetOverview(widgetType, options)` atau `use<Feature>Overview(scope, filter, outletId)`.
3. Integrasi i18n tidak memakai folder `locales`; pola aktual adalah feature-level i18n di bawah `apps/web/src/features/<feature>/i18n/`, lalu di-merge di [apps/web/src/i18n/request.ts](../apps/web/src/i18n/request.ts).
4. Untuk dashboard, message bundle sudah terdaftar di `request.ts` lewat `dashboardEnMessages` dan `dashboardIdMessages`; fitur baru harus mengikuti pola import/merge yang sama.

## Definition of Done Phase 0

- [x] Semua file referensi telah dibaca dan dipahami sejauh file yang benar-benar ada
- [x] Pattern documentation lengkap (A-G)
- [x] Gap analysis per modul terisi
- [x] Kontrak backend dan frontend terdefinisi
- [x] Tidak ada kode yang ditulis
