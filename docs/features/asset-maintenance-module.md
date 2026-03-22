# Asset Maintenance Module

## Overview

Modul Asset Management untuk melacak jadwal pemeliharaan preventif, perbaikan (corrective maintenance), dan inventory spare parts untuk fixed assets.

## Features

### 1. Preventive Maintenance
- Membuat jadwal pemeliharaan (harian, mingguan, bulanan, tahunan)
- Generate work order otomatis berdasarkan jadwal
- Track maintenance history per asset
- Notifikasi maintenance reminder

### 2. Corrective Maintenance (Repairs)
- Work order management untuk perbaikan
- Track biaya perbaikan dan downtime
- Vendor/contractor management
- Attach foto dan dokumen ke repair records

### 3. Spare Parts Inventory
- Track stock levels spare parts
- Link spare parts ke asset tertentu
- Reorder point alerts
- Usage history tracking

## Database Schema

### Tables

#### asset_maintenance_schedules
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| asset_id | UUID | Reference to assets |
| schedule_type | VARCHAR(20) | preventive/corrective |
| frequency | VARCHAR(20) | daily/weekly/monthly/yearly/custom |
| frequency_value | INTEGER | Multiplier untuk frequency |
| last_maintenance_date | DATE | Tanggal maintenance terakhir |
| next_maintenance_date | DATE | Tanggal maintenance berikutnya |
| description | TEXT | Deskripsi maintenance |
| estimated_cost | DECIMAL(15,2) | Biaya estimasi |
| assigned_to | UUID | Reference to employees |
| is_active | BOOLEAN | Status aktif |

#### asset_work_orders
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| wo_number | VARCHAR(50) | Nomor work order (unique) |
| asset_id | UUID | Reference to assets |
| schedule_id | UUID | Reference to maintenance schedule (optional) |
| wo_type | VARCHAR(20) | preventive/corrective/emergency |
| status | VARCHAR(20) | open/in_progress/completed/cancelled |
| priority | VARCHAR(10) | low/medium/high/critical |
| description | TEXT | Deskripsi pekerjaan |
| planned_date | DATE | Tanggal rencana |
| completed_date | DATE | Tanggal selesai |
| assigned_to | UUID | Reference to employees |
| actual_cost | DECIMAL(15,2) | Biaya aktual |
| downtime_hours | DECIMAL(8,2) | Jam downtime |
| notes | TEXT | Catatan |

#### asset_spare_parts
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| part_number | VARCHAR(50) | Nomor part (unique) |
| part_name | VARCHAR(255) | Nama part |
| description | TEXT | Deskripsi |
| unit_of_measure | VARCHAR(20) | Satuan (pcs, kg, liter, dll) - dari master data UOM |
| current_stock | INTEGER | Stok saat ini |
| min_stock_level | INTEGER | Level stok minimum |
| max_stock_level | INTEGER | Level stok maksimum (opsional) |
| reorder_point | INTEGER | Titik reorder |
| unit_cost | DECIMAL(15,2) | Harga per unit |
| location | VARCHAR(50) | Lokasi gudang - dari master data Warehouse |
| is_active | BOOLEAN | Status aktif |

#### asset_spare_part_links
Tabel junction untuk many-to-many relationship antara asset dan spare parts.

#### work_order_spare_parts
Tabel untuk tracking penggunaan spare parts di work orders.

## API Endpoints

### Dashboard & Alerts
```
GET /api/v1/finance/maintenance/dashboard
GET /api/v1/finance/maintenance/alerts
```

### Form Data
```
GET /api/v1/finance/maintenance/form-data
```
Response mencakup data untuk dropdown selections:
- `assets` - List active assets (id, code, name)
- `employees` - List active employees (id, employee_code, name, email)
- `uoms` - List active units of measure (id, name, symbol)
- `warehouses` - List active warehouses (id, code, name)

### Maintenance Schedules
```
GET    /api/v1/finance/maintenance/schedules
POST   /api/v1/finance/maintenance/schedules
GET    /api/v1/finance/maintenance/schedules/:id
PUT    /api/v1/finance/maintenance/schedules/:id
DELETE /api/v1/finance/maintenance/schedules/:id
```

### Work Orders
```
GET    /api/v1/finance/maintenance/work-orders
POST   /api/v1/finance/maintenance/work-orders
GET    /api/v1/finance/maintenance/work-orders/:id
PUT    /api/v1/finance/maintenance/work-orders/:id
PUT    /api/v1/finance/maintenance/work-orders/:id/status
DELETE /api/v1/finance/maintenance/work-orders/:id
POST   /api/v1/finance/maintenance/work-orders/:id/spare-parts
DELETE /api/v1/finance/maintenance/work-orders/:id/spare-parts/:spare_part_id
```

### Spare Parts
```
GET    /api/v1/finance/maintenance/spare-parts
POST   /api/v1/finance/maintenance/spare-parts
GET    /api/v1/finance/maintenance/spare-parts/:id
PUT    /api/v1/finance/maintenance/spare-parts/:id
PUT    /api/v1/finance/maintenance/spare-parts/:id/stock
DELETE /api/v1/finance/maintenance/spare-parts/:id
```

### Asset-Spare Part Links
```
POST   /api/v1/finance/maintenance/asset-spare-part-links
DELETE /api/v1/finance/maintenance/asset-spare-part-links/:asset_id/:spare_part_id
```

## Permissions

| Permission Code | Description |
|-----------------|-------------|
| asset_maintenance.read | View maintenance data |
| asset_maintenance.create | Create schedules and work orders |
| asset_maintenance.update | Update maintenance records |
| asset_maintenance.delete | Delete maintenance records |
| asset_maintenance.approve | Approve work orders |

## Status Work Order

```
open → in_progress → completed
  ↓
cancelled
```

Transition yang valid:
- `open` → `in_progress`, `cancelled`
- `in_progress` → `completed`, `cancelled`

## Business Logic

### Auto-generate WO Number
Format: `WO-YYYYMM-XXXX`
Contoh: `WO-202503-0001`

### Schedule Next Maintenance
Ketika work order selesai (status = completed), sistem otomatis:
1. Update `last_maintenance_date` schedule
2. Hitung `next_maintenance_date` berdasarkan frequency
3. Simpan perubahan schedule

### Stock Management
- Stock berkurang otomatis ketika spare part ditambahkan ke work order
- Stock bertambah otomatis ketika spare part dihapus dari work order
- Validasi stock mencukupi sebelum pengurangan

### Alerts
Sistem menghasilkan 3 jenis alert:
1. **Overdue**: Maintenance yang sudah lewat tanggal
2. **Upcoming**: Maintenance dalam 7 hari ke depan
3. **Low Stock**: Spare parts dengan stock ≤ reorder point

## Frontend Components

### Pages
- `/finance/maintenance` - Maintenance dashboard
- `/finance/maintenance/schedules` - Schedule list
- `/finance/maintenance/work-orders` - Work order list
- `/finance/maintenance/spare-parts` - Spare parts inventory

### Key Components
- `MaintenanceDashboard` - Overview stats dan alerts
- `AssetMaintenancePage` - Main page dengan tab navigation (Dashboard, Schedules, Work Orders, Spare Parts)
- `MaintenanceScheduleList` - Daftar jadwal dengan filter
- `ScheduleForm` - Form create/edit maintenance schedule dengan Calendar date picker
- `WorkOrderList` - Daftar WO dengan status badges
- `WorkOrderForm` - Form create/edit WO dengan Calendar date picker
- `SparePartList` - Inventory dengan stock indicators
- `SparePartForm` - Form create/edit spare part dengan UOM dan Warehouse selection
- `StockUpdateDialog` - Dialog untuk update stock dengan reason
- `AddSparePartDialog` - Dialog untuk menambah spare part ke work order
- `DeleteDialog` - Konfirmasi hapus dengan AlertDialog
- `MaintenanceAlerts` - Komponen alert cards (overdue, upcoming, low stock)

### Form Data Integration
Semua form yang memerlukan selection data menggunakan endpoint `/form-data`:
- **Asset Selection**: Dropdown assets aktif
- **Employee Selection**: Dropdown employees aktif
- **UOM Selection**: Dropdown units of measure aktif (Product module)
- **Warehouse Selection**: Dropdown warehouses aktif (Warehouse module)

## Integration

### With Asset Module
- Tab "Maintenance" di detail asset
- Link ke maintenance history per asset
- Quick create WO dari asset page

### With HR Module
- Assign employee ke maintenance schedule
- Assign employee ke work order
- Employee dropdown dari HR data

### With Product Module (Master Data)
- **Unit of Measure**: Spare parts menggunakan UOM dari master data product (`units_of_measure` table)
- UOM selection menampilkan `name (symbol)` format
- Data diambil dari endpoint `/form-data` dengan filter `is_active = true`

### With Warehouse Module (Master Data)
- **Location**: Spare parts location menggunakan warehouse dari master data (`warehouses` table)
- Warehouse selection menampilkan `code - name` format
- Data diambil dari endpoint `/form-data` dengan filter `is_active = true`

## Future Enhancements

1. **Maintenance Templates** - Template jadwal berdasarkan asset category
2. **Barcode Scanning** - Scan spare parts untuk quick lookup
3. **Maintenance Reports** - Cost analysis, MTBF, MTTR
4. **Mobile App** - Field technician mobile interface
5. **IoT Integration** - Predictive maintenance dengan sensor data

## Implementation Status

- **Backend**: ✅ Complete
  - Models: 5 tables (schedules, work_orders, spare_parts, links, usage)
  - Repository: Full CRUD + dashboard queries + form data queries
  - Usecase: Business logic + status transitions + stock management
  - Handler: HTTP handlers
  - Router: API endpoints
  - Permissions: 5 permission codes
  - Master Data Integration: UOM (Product), Warehouse (Warehouse), Employee (HR)

- **Frontend**: ✅ Complete
  - Types: TypeScript interfaces
  - Service: API service
  - Hooks: React Query hooks
  - i18n: EN + ID translations
  - Components:
    - ✅ Dashboard dengan stats dan alerts
    - ✅ Maintenance Schedules (list, form, delete)
    - ✅ Work Orders (list, form, status update, delete)
    - ✅ Spare Parts (list, form, stock update, delete)
    - ✅ Asset linking dialog
    - ✅ Work Order spare parts management
  - UI Components: Calendar date picker, Select dropdowns, Tab navigation

## Implementation Notes

- Module ini adalah bagian dari **Fase 1** Asset Management Improvement Plan
- **Status**: Implementation completed
- Dependencies:
  - Asset module (sudah ada)
  - HR module (untuk employee data)
  - Product module (untuk UOM master data)
  - Warehouse module (untuk warehouse/lokasi master data)

## Changelog

### v1.0.0 (Completed)
- ✅ Full CRUD untuk Maintenance Schedules
- ✅ Full CRUD untuk Work Orders dengan status workflow
- ✅ Full CRUD untuk Spare Parts Inventory
- ✅ Dashboard dengan metrics dan alerts
- ✅ Stock management dengan auto-update saat WO menggunakan spare parts
- ✅ Integration dengan master data (Assets, Employees, UOM, Warehouses)
- ✅ Calendar date picker untuk semua date fields
- ✅ Responsive UI dengan tab navigation
- ✅ i18n support (EN + ID)
