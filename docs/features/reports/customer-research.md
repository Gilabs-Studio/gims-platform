# Customer Research

Fitur report analitik pelanggan untuk membantu owner/manager melihat performa pelanggan berdasarkan pendapatan, aktivitas order, dan tren revenue dalam rentang waktu tertentu.

## Fitur Utama
- KPI cards: total customers, active customers, inactive customers, total revenue, average order value.
- Revenue trend chart dengan interval `daily`, `weekly`, dan `monthly`.
- Revenue by customer chart dan purchase frequency chart.
- Tabel insight pelanggan dengan tab `top`, `inactive`, dan `payment behavior`.
- Filter tanggal global dengan date range picker.
- Search pelanggan berdasarkan nama atau kode.
- Detail panel pelanggan via right drawer saat klik nama pelanggan.

## Business Rules
- Data report dihitung dari data order yang valid (`status NOT IN ('draft', 'cancelled')`).
- Date range default adalah 30 hari terakhir jika filter tanggal tidak diberikan.
- `inactive customers` dihitung dari pelanggan tanpa order pada periode terpilih.
- Pagination dibatasi maksimal 100 item per halaman.
- Endpoint report dilindungi permission `report_customer_research.read`.

## Keputusan Teknis
- Query menggunakan agregasi langsung dari `customers`, `sales_orders`, dan `sales_order_items` agar implementasi Sprint 1 cepat dan konsisten dengan report existing.
- Struktur backend mengikuti vertical slice report saat ini (repository/usecase/handler/router) untuk menjaga konsistensi kode.
- Frontend mengikuti pola komponen pada `sales-overview` dan `product-analysis` (page-level composition + hooks + service + i18n).

## Struktur Folder
```text
apps/web/src/features/reports/customer-research/
├── components/
│   ├── customer-kpi-cards.tsx
│   ├── customer-list-table.tsx
│   ├── customer-research-page.tsx
│   └── customer-revenue-trend-chart.tsx
├── hooks/
│   ├── use-customer-list.ts
│   ├── use-customer-research-kpis.ts
│   └── use-revenue-trend.ts
├── i18n/
│   ├── en.ts
│   └── id.ts
├── services/
│   └── customer-research-service.ts
└── types/
    └── index.d.ts
```

## API Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/reports/customer-research/kpis` | `report_customer_research.read` | KPI ringkasan customer research |
| GET | `/api/v1/reports/customer-research/revenue-by-customer` | `report_customer_research.read` | Ranking pelanggan berdasarkan revenue |
| GET | `/api/v1/reports/customer-research/purchase-frequency` | `report_customer_research.read` | Ranking pelanggan berdasarkan jumlah order |
| GET | `/api/v1/reports/customer-research/revenue-trend` | `report_customer_research.read` | Data tren revenue berdasarkan interval |
| GET | `/api/v1/reports/customer-research/customers` | `report_customer_research.read` | Daftar customer insight (top/inactive/payment behavior) |
| GET | `/api/v1/reports/customer-research/customers/:customer_id` | `report_customer_research.read` | Detail metrik pelanggan |

## Cara Test Manual
1. Login dengan user yang punya permission `report_customer_research.read`.
2. Buka menu `Reports > Customer Research`.
3. Pastikan KPI cards tampil dan nilai berubah saat date range diganti.
4. Ubah interval chart (`daily/weekly/monthly`) dan pastikan chart ikut berubah.
5. Verifikasi chart `Revenue by Customer` dan `Purchase Frequency` menampilkan data top 10.
6. Coba tab table `Top Customers`, `Inactive Customers`, dan `Payment Behavior`.
7. Gunakan search pelanggan, pastikan hasil tabel terfilter.
8. Klik nama pelanggan di tabel, pastikan right drawer detail terbuka.

## Automated Testing
- Backend compile check: `cd apps/api && go build ./internal/report/...`
- Frontend type-check menggunakan IDE diagnostics (CLI `pnpm` lokal saat ini belum tersedia di environment ini).

## Dependencies
- Backend: Gin, GORM, PostgreSQL aggregation queries.
- Frontend: Next.js App Router, TanStack Query, Recharts, next-intl, shadcn/ui.

## Related Links
- Planning source: `docs/reports-customer-supplier-research.md`
- API standards: `docs/api-standart/README.md`

## Notes & Improvements
- Sprint 1 saat ini belum menggunakan snapshot table `report_customer_snapshot`; masih query agregasi runtime.
- Untuk scale-up, lanjutkan implementasi background snapshot job sesuai dokumen riset.
- Payment behavior detail masih berupa agregasi list umum dan bisa diperdalam di sprint berikutnya.
