# Supplier Research

Dashboard analitik untuk mengevaluasi performa supplier berdasarkan snapshot data pelaporan (bukan query langsung tabel transaksi).

## Fitur Utama
- KPI utama: total supplier, supplier aktif, total nilai pembelian, rata-rata lead time
- Tiga visual analitik: purchase volume, delivery time, spend trend
- Tabel tabbed: top spenders, slow delivery, reliability
- Filter global: date range/tahun, category IDs, min-max purchase value
- Halaman detail supplier dari klik baris tabel

## Business Rules
- Semua data report mengonsumsi endpoint `/reports/supplier-research/*`
- Tabel list tetap paginasi (`per_page` maksimum 100)
- Saat data kosong, UI menampilkan empty state yang jelas
- Klik elemen interaktif menggunakan `cursor-pointer`

## Keputusan Teknis
- Mengikuti pola report existing (`sales-overview`, `product-analysis`) untuk konsistensi UX dan maintainability
- Logic data-fetching dipisahkan ke hooks TanStack Query; komponen fokus presentasi
- Route report menggunakan `PermissionGuard` dengan permission `report_supplier_research.read`

## Struktur Folder
```
apps/web/src/features/reports/supplier-research/
├── components/
│   ├── supplier-research-page.tsx
│   ├── supplier-research-kpi-cards.tsx
│   ├── supplier-research-charts.tsx
│   ├── supplier-research-table.tsx
│   └── supplier-detail-page.tsx
├── hooks/
│   ├── use-supplier-research-kpis.ts
│   ├── use-supplier-spend-trend.ts
│   ├── use-purchase-volume-list.ts
│   ├── use-delivery-time-list.ts
│   ├── use-supplier-table-list.ts
│   └── use-supplier-detail.ts
├── services/
│   └── supplier-research-service.ts
├── types/
│   └── index.d.ts
└── i18n/
    ├── en.ts
    └── id.ts
```

## API Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/reports/supplier-research/kpis` | report_supplier_research.read | KPI cards |
| GET | `/api/v1/reports/supplier-research/purchase-volume` | report_supplier_research.read | Purchase volume chart/list |
| GET | `/api/v1/reports/supplier-research/delivery-time` | report_supplier_research.read | Delivery time analytics |
| GET | `/api/v1/reports/supplier-research/spend-trend` | report_supplier_research.read | Spend trend chart |
| GET | `/api/v1/reports/supplier-research/suppliers` | report_supplier_research.read | Tabbed supplier table |
| GET | `/api/v1/reports/supplier-research/suppliers/:supplier_id` | report_supplier_research.read | Supplier detail |

## Manual Testing
1. Login dengan user yang memiliki permission `report_supplier_research.read`
2. Buka `/reports/supplier-research`
3. Ubah filter tahun/date range dan pastikan KPI/charts/tabel ikut refresh
4. Pindah tab tabel dan verifikasi data berubah sesuai tab
5. Klik supplier pada tabel, pastikan pindah ke detail supplier
6. Verifikasi loading/error/empty state tampil sesuai kondisi API
