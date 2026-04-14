# Finance Commit Change Checklist

> Module: Finance
> Date: 2026-04-13
> Purpose: Dokumentasi untuk cek perubahan yang dilakukan berdasarkan commit

## Commit Acuan

### 1) Commit utama (fitur)
- Hash: `06feddde94ca89adb4ea41a7ab26a76736bf3192`
- Message: `feat(finance): realign menu architecture and canonical routes`
- Date: 2026-04-10 23:28:12 +0700

### 2) Commit pendukung (sebelumnya)
- Hash: `803c3c33fe1d44cea815c62482c4683672b8df56`
- Message: `step-8-canonical-parity: finish aliases and reactivate trial balance`
- Date: 2026-04-10 16:00:13 +0700

### 3) HEAD saat ini (merge)
- Hash: `f13a5bf85cb701e549600cc15b5f4573928be3a2`
- Message: `Merge branch 'dev' ... into fix/app/finance`
- Catatan: ini merge commit lintas modul, bukan hanya finance.

## Ringkasan Perubahan Berdasarkan Commit Utama (06feddde)

## Backend API/Router Finance
Perubahan utama ada pada normalisasi rute canonical finance dan bridge legacy:

- `apps/api/internal/finance/presentation/routes.go`
- `apps/api/internal/finance/presentation/router/legacy_route_bridges.go`
- `apps/api/internal/finance/presentation/router/finance_report_routers.go`
- `apps/api/internal/finance/presentation/router/finance_settings_routers.go`
- `apps/api/internal/finance/presentation/router/payment_routers.go`
- `apps/api/internal/finance/presentation/handler/financial_closing_handler.go`
- `apps/api/internal/finance/presentation/handler/system_account_mapping_handler.go`

Dampak:
- Struktur endpoint finance lebih konsisten dengan arsitektur menu/sidebar.
- Alias/bridge legacy tetap tersedia untuk transisi kompatibilitas.

## Seeder & RBAC
Perubahan sinkronisasi menu-permission-role finance:

- `apps/api/seeders/menu_seeder.go`
- `apps/api/seeders/permission_seeder.go`
- `apps/api/seeders/role_seeder.go`
- `apps/api/seeders/constants.go`

Dampak:
- Hirarki menu finance disejajarkan dengan canonical route baru.
- Permission mapping dan role assignment menyesuaikan struktur tersebut.

## Frontend Routes (App Router)
Banyak route canonical finance ditambahkan sebagai halaman redirect/bridge ke implementasi saat ini:

- AR/AP:
  - `apps/web/app/[locale]/(dashboard)/finance/ar/aging-reports/page.tsx`
  - `apps/web/app/[locale]/(dashboard)/finance/ar/credit-notes/page.tsx`
  - `apps/web/app/[locale]/(dashboard)/finance/ar/customer-payments/page.tsx`
  - `apps/web/app/[locale]/(dashboard)/finance/ap/aging-reports/page.tsx`
  - `apps/web/app/[locale]/(dashboard)/finance/ap/debit-notes/page.tsx`
  - `apps/web/app/[locale]/(dashboard)/finance/ap/supplier-invoices/page.tsx`
  - `apps/web/app/[locale]/(dashboard)/finance/ap/supplier-payments/page.tsx`
- Cash & Bank:
  - `apps/web/app/[locale]/(dashboard)/finance/cash-bank/bank-accounts/page.tsx`
  - `apps/web/app/[locale]/(dashboard)/finance/cash-bank/journals/page.tsx`
  - `apps/web/app/[locale]/(dashboard)/finance/cash-bank/transfers/page.tsx`
  - `apps/web/app/[locale]/(dashboard)/finance/cash-bank/reconciliation/page.tsx`
- Fixed Assets & Settings:
  - `apps/web/app/[locale]/(dashboard)/finance/fixed-assets/depreciation-schedule/page.tsx`
  - `apps/web/app/[locale]/(dashboard)/finance/fixed-assets/revaluation/page.tsx`
  - `apps/web/app/[locale]/(dashboard)/finance/settings/fiscal-years/page.tsx`
  - `apps/web/app/[locale]/(dashboard)/finance/settings/tax-config/page.tsx`
  - `apps/web/app/[locale]/(dashboard)/finance/settings/payment-terms/page.tsx`
  - `apps/web/app/[locale]/(dashboard)/finance/settings/currency/page.tsx`

Dampak:
- User dapat mengakses URL canonical tanpa 404.
- Migrasi URL lama ke URL baru bisa dilakukan bertahap.

## Frontend Navigation & Validation
- `apps/web/src/lib/navigation-config.ts`
- `apps/web/src/lib/route-validator.ts`
- `apps/web/src/i18n/messages/en.json`
- `apps/web/src/i18n/messages/id.json`

Dampak:
- Sidebar finance dan validasi route mengikuti canonical URL.
- Label/i18n mengikuti struktur menu baru.

## Service Layer Frontend Terkait Finance
- `apps/web/src/features/finance/non-trade-payables/services/finance-non-trade-payables-service.ts`
- `apps/web/src/features/finance/payments/services/finance-payments-service.ts`
- `apps/web/src/features/finance/shared/reference-source-matrix.ts`

Dampak:
- Sinkronisasi source/reference untuk modul payment & non-trade payables.

## Commit Pendukung (803c3c33) - Highlight
Fokus parity sebelum realignment:
- Reaktivasi trial balance route/page.
- Penyesuaian router aging report dan AR/AP reconciliation.
- Update menu, permission, navigation, route-validator.

File kunci:
- `apps/api/internal/finance/presentation/router/aging_report_routers.go`
- `apps/api/internal/finance/presentation/router/arap_reconciliation_routers.go`
- `apps/web/app/[locale]/(dashboard)/finance/reports/trial-balance/page.tsx`
- `apps/web/app/[locale]/(dashboard)/finance/reports/trial-balance/loading.tsx`

## Cara Cek Ulang Perubahan dari Commit

Gunakan perintah berikut dari root repo:

```bash
# 1) Lihat ringkasan 1 commit (metadata + file)
git show --name-status --stat --format=fuller 06feddde

# 2) Lihat detail patch commit utama
git show 06feddde

# 3) Lihat commit pendukung
git show --name-status --stat --format=fuller 803c3c33

# 4) Lihat riwayat singkat
git log --oneline -n 10

# 5) Jika perlu ringkas file saja
git diff --name-status 803c3c33..06feddde
```

## Catatan Validasi Penting
- URL finance canonical sudah dipasang luas, tetapi sebagian page masih berupa redirect bridge.
- Karena HEAD adalah merge commit lintas modul, review perubahan finance sebaiknya fokus ke commit `06feddde` dan `803c3c33`.
- Jika seeding diulang, pastikan URL menu dan permission seeder tetap sinkron agar tidak ada permission yang ter-skip.
