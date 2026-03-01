# Geo Performance Report

Fitur visualisasi performa area berbasis peta choropleth interaktif. Memungkinkan owner dan manajemen untuk menganalisis distribusi revenue dan frekuensi order berdasarkan wilayah geografis (provinsi/kota).

## Fitur Utama

- **Choropleth Map** - Peta interaktif Indonesia dengan pewarnaan area berdasarkan metrik (revenue/frekuensi order)
- **Dual Mode Analysis** - Sales Order (Demand) dan Paid Invoice (Actual Revenue)
- **Multi-Level Aggregation** - Agregasi data per provinsi atau per kota/kabupaten
- **Filter Sales Rep** - Analisis performa per sales representative
- **Summary Cards** - Total revenue, total orders, avg order value, active areas
- **Area Ranking Table** - Tabel peringkat area berdasarkan performa
- **Map Style Switcher** - Auto/Light/Dark/Satellite tile layers
- **Tooltip on Hover** - Informasi detail area saat hover (revenue, orders, avg value)
- **Responsive Design** - Sidebar filter pada desktop, stacked pada mobile
- **i18n Support** - Bahasa Indonesia dan English

## Business Rules

- **Sales Order Mode**: Mengambil data dari sales_orders dengan status 'approved' atau 'closed' (demand analysis)
- **Paid Invoice Mode**: Mengambil data dari customer_invoices dengan status 'paid', menggunakan paid_amount sebagai revenue (actual revenue)
- **Province Level**: Agregasi berdasarkan provinsi customer, JOIN ke tabel provinces
- **City Level**: Agregasi berdasarkan kota/kabupaten customer, JOIN ke tabel cities + provinces (parent)
- **Default Date Range**: 12 bulan terakhir jika tidak diset user
- **GeoJSON Matching**: Province name dari database dicocokkan dengan property WADMPR di GeoJSON file indonesia-provinces-simple.geojson
- **Color Scale**: 7-level gradient (hijau untuk revenue, biru untuk frekuensi), area tanpa data tidak diwarnai
- **Avg Order Value**: Dihitung di usecase layer: total_revenue / total_orders (bukan dari database)

## Keputusan Teknis

- **Raw SQL di Repository**: Report bersifat read-only aggregation. Menggunakan raw SQL dengan GROUP BY untuk efisiensi, bukan GORM query builder. Mengikuti pattern sales_overview_repository.
- **GeoJSON Static File**: Menggunakan file GeoJSON yang sudah ada di `/public/geojson/indonesia-provinces-simple.geojson`. Fetch di client-side saat component mount. Trade-off: file besar di-load sekali, tapi avoid server-side processing.
- **Province Name Matching**: Backend mengembalikan nama provinsi dari tabel provinces. Frontend matching via `WADMPR` property di GeoJSON. Trade-off: harus konsisten naming, jika ada perbedaan nama antara database dan GeoJSON, area tidak akan ditampilkan.
- **Leaflet SSR Bypass**: Menggunakan `next/dynamic` dengan `ssr: false` di geo-performance-page.tsx karena Leaflet membutuhkan browser APIs (window, document).
- **No Models / No Migration**: Fitur ini murni reporting, tidak menambah tabel baru. Hanya membaca dari tabel yang sudah ada (sales_orders, customer_invoices, customers, provinces, cities).
- **City-level SQL Alias**: Menggunakan alias `ci2` untuk tabel cities di query paid_invoice mode untuk menghindari konflik dengan alias `ci` yang digunakan untuk customer_invoices.

## Struktur Folder

### Backend
```
apps/api/internal/report/
├── data/repositories/
│   └── geo_performance_repository.go  # Raw SQL aggregation queries
├── domain/
│   ├── dto/
│   │   └── geo_performance_dto.go     # Request/Response DTOs
│   └── usecase/
│       └── geo_performance_usecase.go # Business logic + validation
└── presentation/
    ├── handler/
    │   └── geo_performance_handler.go # HTTP handlers
    ├── router/
    │   └── geo_performance_router.go  # Route registration
    └── routers.go                     # Domain aggregator (modified)
```

### Frontend
```
apps/web/src/features/reports/geo-performance/
├── types/
│   └── index.d.ts                     # TypeScript type declarations
├── services/
│   └── geo-performance-service.ts     # API client calls
├── hooks/
│   ├── use-geo-performance.ts         # Main data query hook
│   └── use-geo-performance-form-data.ts # Form data (sales reps) hook
├── components/
│   ├── geo-performance-map.tsx        # Choropleth map + filters + table
│   └── geo-performance-page.tsx       # PageMotion wrapper + dynamic import
└── i18n/
    ├── en.ts                          # English translations
    └── id.ts                          # Indonesian translations
```

## API Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/reports/geo-performance` | `report_geo_performance.read` | Get geo performance data with filters |
| GET | `/api/v1/reports/geo-performance/form-data` | `report_geo_performance.read` | Get filter options (sales reps) |

### Query Parameters (GET /reports/geo-performance)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `start_date` | string (YYYY-MM-DD) | 12 months ago | Start date filter |
| `end_date` | string (YYYY-MM-DD) | today | End date filter |
| `mode` | string | `sales_order` | `sales_order` or `paid_invoice` |
| `level` | string | `province` | `province` or `city` |
| `sales_rep_id` | string (UUID) | - | Optional sales rep filter |

### Response Example

```json
{
  "success": true,
  "data": {
    "areas": [
      {
        "area_id": "uuid-province-id",
        "area_name": "JAWA BARAT",
        "parent_name": "",
        "total_revenue": 150000000,
        "total_orders": 45,
        "avg_order_value": 3333333
      }
    ],
    "total_revenue": 500000000,
    "total_orders": 150,
    "avg_order_value": 3333333,
    "areas_with_data": 12,
    "mode": "sales_order",
    "level": "province"
  },
  "meta": {
    "filters": {
      "start_date": "2024-01-01",
      "end_date": "2025-01-01",
      "mode": "sales_order",
      "level": "province"
    }
  }
}
```

## Cara Test Manual

1. Login sebagai user dengan permission `report_geo_performance.read`
2. Navigate ke `/reports/geo-performance`
3. Verify peta Indonesia tampil dengan choropleth coloring
4. Hover area berwarna → verify tooltip menampilkan revenue, orders, avg value
5. Ubah mode ke "Paid Invoices" → verify data berubah
6. Ubah level ke "City" → verify data menampilkan per kota (city-level belum ada GeoJSON matching)
7. Pilih sales rep dari dropdown → verify data ter-filter
8. Ubah date range → verify data berubah
9. Ubah metric "Color By" ke "Order Frequency" → verify warna berubah ke skala biru
10. Klik map style switcher → verify tile layer berubah (Light/Dark/Satellite)
11. Verify summary cards menampilkan total yang benar
12. Verify ranking table menampilkan area terurut

## Automated Testing

- **Backend Unit Tests**: `apps/api/internal/report/domain/usecase/geo_performance_usecase_test.go` (belum dibuat)
- **Frontend Unit Tests**: (belum dibuat)

**Run Tests**:
```bash
# Backend
cd apps/api && go test ./internal/report/...

# Frontend type check
cd apps/web && npx pnpm check-types
```

## Dependencies

- **Backend**: GORM (raw SQL), Gin (HTTP), PostgreSQL (database)
- **Frontend**: Leaflet + react-leaflet (map), TanStack Query (data fetching), next-intl (i18n), framer-motion (animations)
- **Data**: GeoJSON file (indonesia-provinces-simple.geojson), Sales Orders, Customer Invoices, Customers, Provinces, Cities tables

## Notes & Improvements

- **Known Limitation**: City-level choropleth visualization belum optimal karena GeoJSON file berisi data per desa/kelurahan dengan WADMKK sebagai identifier kota. Matching perlu disesuaikan.
- **Future Improvement**:
  - Drill-down dari province ke city saat klik area
  - Export report ke PDF/Excel
  - Comparison mode (periode A vs periode B)
  - Heatmap overlay untuk titik lokasi customer
  - Real-time data refresh via WebSocket
- **Performance**: GeoJSON file cukup besar (~MB), consider server-side simplification atau tiled vector rendering untuk skala besar.
