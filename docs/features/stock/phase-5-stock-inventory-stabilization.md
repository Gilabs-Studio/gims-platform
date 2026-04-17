# Phase 5: Stock & Inventory Stabilization, Reporting & Operational Control

> **Module:** Stock & Inventory Management  
> **Phase:** 5 - Stabilization & Reporting  
> **Version:** 1.0  
> **Status:** Planned  
> **Last Updated:** April 2026

---

## Table of Contents
1. [Overview](#overview)
2. [Stabilization Goals](#stabilization-goals)
3. [Reporting & Monitoring](#reporting--monitoring)
4. [System Architecture](#system-architecture)
5. [Data Contracts](#data-contracts)
6. [API Reference](#api-reference)
7. [Business Rules](#business-rules)
8. [Use Case by Role](#use-case-by-role)
9. [Manual Testing Checklist](#manual-testing-checklist)
10. [Integration Points](#integration-points)
11. [Notes & Future Improvements](#notes--future-improvements)

---

## Overview

**Phase 5** fokus pada stabilisasi dan monitoring pasca implementasi core stock/inventory (phases 0-4). Setelah phase 4 memastikan posting stock dan stock opname berjalan konsisten, phase 5 memastikan tim operations & warehouse punya visibilitas penuh terhadap kualitas data, akurasi stok, anomali ledger, dan kesehatan process stock opname.

### Scope
- **Operational Monitoring**
  - Stock accuracy health dashboard per warehouse dan product category
  - Variance monitoring antara ledger dan physical count
  - Real-time stock level alerts (low stock, out-of-stock, overstock)
  - Ledger inconsistency detection (missing postings, orphaned movements)
- **Reporting & Analytics**
  - Stock ledger consistency checks (beginning + movements = ending)
  - Batch/lot expiry tracking dan aged inventory reporting
  - Stock movement audit trail dengan full change history
  - Stock opname completion rate dan variance analysis
  - Inventory valuation report (FIFO, LIFO, weighted average)
- **Post-Launch Stabilization**
  - Daily inventory health monitoring
  - Reconciliation workflow untuk variance investigation
  - Immutable snapshot untuk audit trail per opname cycle
  - Alert bagi warehouse manager ketika ada anomali atau threshold breach

### Key Principle
**Phase 5 tidak menambah flow operasional stock/movement baru.** Tujuannya adalah memastikan semua flow phase 0-4 stabil, mudah diaudit, dan memberikan visibility maksimal untuk decision-making dan compliance.

---

## Stabilization Goals

### Feature Overview

| Feature | Description | Role | Permission |
|---------|-------------|------|------------|
| Stock Health Dashboard | Menampilkan accuracy rate, variance count, alert summary per company/warehouse | Warehouse Manager, Operations Manager | `inventory.read` |
| Stock Ledger Consistency Check | Validasi beginning + in - out = ending untuk setiap product per warehouse per periode | Accountant, Auditor | `inventory.read` |
| Batch/Lot Expiry Monitor | Track produk dengan batch expiring dalam 30d, expired dengan qty, aging analysis | Warehouse Manager, QA | `inventory.read` |
| Stock Movement Audit Log | Full history setiap GR/GI/TRANSFER dengan user, timestamp, approval status, value impact | Auditor, Compliance | `stock_movement.read` |
| Stock Opname Health | Track opname completion rate, variance trending, adjustment journal link, approval status | Operations Manager, Finance | `stock_opname.read`, `financial_closing.read` |
| Inventory Valuation Report | FIFO/LIFO/Weighted Average valuation per product dengan P&L impact | Finance, Accountant | `general_ledger_report.read` |
| Level-Based Alerts | Real-time notification untuk low-stock, out-of-stock, overstock threshold breach | Warehouse Manager, Procurement | `inventory.read` |
| Reconciliation Queue | Daftar variance item yang pending investigation/approval sebelum dibuat adjustment | Operations Manager, Finance | `stock_opname.read` |

### User Journey (Stabilization)

1. Warehouse Manager membuka inventory health dashboard.
2. Sistem menampilkan status akurasi stok, alert count, dan periode last opname.
3. Jika ada variance, manager masuk ke detail ledger atau item-level investigation.
4. Manager investigasi root cause melalui movement audit log atau batch tracking.
5. Manager membuat adjustment atau stock opname cycle baru jika diperlukan.
6. System menyimpan investigasi hasil sebagai audit record.
7. Periode berikutnya dapat direncanakan dengan confidence lebih tinggi.

### Stabilization Flow

```text
MONITOR LEDGER -> DETECT VARIANCE -> INVESTIGATE SOURCE ->
CREATE ADJUSTMENT/OPNAME -> APPROVAL WORKFLOW -> SNAPSHOT -> CONTINUE
```

---

## Reporting & Monitoring

### Feature Overview

| Feature | Description | Output | Audience |
|---------|-------------|--------|----------|
| Stock Accuracy Score | Persentase item yang balance ledger = last opname count | Health metric | Manager, Auditor |
| Variance Inventory Report | Detail item dengan variance qty, value, last checked date | Variance table | Warehouse, Finance |
| Expiry Age Analysis | Batch/lot dengan expiry date, qty on-hand, days remaining | Aged inventory list | QA, Warehouse |
| Movement Transaction Log | Setiap GR/GI/TRANSFER dengan full details, approval chain, finance link | Audit trail | Auditor, Compliance |
| Stock Opname Trending | Cycle ke cycle variance reduction, approval pace, journal posting latency | Trending chart | Operations, Finance |
| Inventory Valuation Impact | COGS vs. current valuation method, P&L variance, cost method effectiveness | Valuation summary | Finance, Accounting |
| Low-Stock Alert Feed | Real-time queue item masuk low-stock, out-of-stock, overstock zone | Alert dashboard | Procurement, Warehouse |
| Period Reconciliation Summary | Total variance, total adjustment value, reconciliation time, pending items | Reconciliation KPI | Finance Manager, Auditor |

### Stock Ledger Consistency Check

Validasi konsistensi ledger dilakukan setiap hari untuk setiap product-warehouse-period:

**Formula:**
```
Expected Ending = Beginning Balance + Total Qty In - Total Qty Out
Actual Ending = Last Opname Count OR Current Ledger Running Qty
Variance = Expected - Actual
```

**Trigger untuk adjustment:**
- Variance > threshold (configurable per company, default 2%)
- Negative stock terdeteksi
- Orphaned movement (GR tanpa receiving, GI tanpa issue doc)

### Batch/Lot Expiry Tracking

- **Real-time monitoring** untuk batch dengan expiry date ≤ 30 hari
- **Aged inventory** report untuk batch sudah expired tapi masih ada qty
- **FIFO enforcement** di GI process (recommend batch FIFO)
- **Alert drilldown** ke batch detail, warehouse location, recommended action

### Reporting Journey

1. User membuka inventory health dashboard.
2. Sistem menampilkan accuracy score, active alerts, dan trending.
3. User memilih monitoring report yang ingin dianalisis.
4. Sistem melakukan drilldown ke product, batch, warehouse, atau movement level.
5. Jika ditemukan variance, user dapat langsung create opname atau adjustment.
6. Hasil verifikasi disimpan sebagai record untuk audit trail.

---

## System Architecture

### Backend Structure (Go/Gin)

```text
internal/inventory/
├── domain/usecase/
│   ├── inventory_health_usecase.go       # Health score, accuracy calc
│   ├── ledger_consistency_usecase.go     # Variance detection
│   ├── batch_expiry_usecase.go           # Expiry tracking, aging
│   ├── movement_audit_usecase.go         # Audit log generation
│   └── inventory_valuation_usecase.go    # Valuation method calc
├── presentation/handler/
│   ├── inventory_health_handler.go       # Dashboard endpoints
│   ├── ledger_consistency_handler.go     # Consistency report
│   ├── batch_expiry_handler.go           # Batch tracking
│   ├── movement_audit_handler.go         # Audit log query
│   └── inventory_valuation_handler.go    # Valuation report
└── presentation/router/
    ├── inventory_health_routers.go
    ├── inventory_report_routers.go
    └── inventory_audit_routers.go

internal/stock_opname/
├── domain/usecase/
│   └── opname_health_usecase.go          # Opname trending, variance analysis
└── presentation/handler/
    └── opname_health_handler.go
```

### Frontend Structure (Next.js + React)

```text
src/features/finance/inventory-reports/
├── components/
│   ├── stock-health-dashboard.tsx
│   ├── variance-report.tsx
│   ├── expiry-monitor.tsx
│   ├── movement-audit-log.tsx
│   ├── opname-health-trending.tsx
│   └── inventory-valuation-view.tsx
├── hooks/
│   ├── use-stock-health.ts
│   ├── use-variance-report.ts
│   ├── use-expiry-monitor.ts
│   ├── use-movement-audit.ts
│   ├── use-opname-health.ts
│   └── use-inventory-valuation.ts
└── services/
    ├── stock-health-service.ts
    ├── variance-report-service.ts
    ├── expiry-monitor-service.ts
    ├── movement-audit-service.ts
    ├── opname-health-service.ts
    └── inventory-valuation-service.ts

src/features/stock/stock-ledger/
├── components/stock-ledger-page.tsx     # Enhanced with audit features
├── hooks/use-stock-ledger.ts
└── services/stock-ledger.service.ts
```

### Monitoring Flow

```text
Stock Ledger -> Calculate Balance ->
Detect Variance -> Generate Alert -> Audit Log ->
Investigation Queue -> Adjustment/Opname -> Approval ->
Snapshot -> Close Cycle
```

---

## Data Contracts

### Stock Health Summary

```json
{
  "company_id": "uuid",
  "warehouse_id": "uuid",
  "period_start_date": "2026-04-01",
  "period_end_date": "2026-04-30",
  "total_skus": 1200,
  "accuracy_score": 98.5,
  "variance_count": 18,
  "low_stock_count": 45,
  "out_of_stock_count": 8,
  "overstock_count": 3,
  "expiring_batch_count": 12,
  "expired_batch_count": 2,
  "last_opname_date": "2026-04-15T10:30:00+07:00",
  "pending_reconciliation_count": 5,
  "health_status": "healthy|warning|critical"
}
```

### Stock Ledger Variance Item

```json
{
  "product_id": "uuid",
  "product_code": "SKU-001",
  "product_name": "Widget A",
  "warehouse_id": "uuid",
  "warehouse_name": "Main Warehouse",
  "beginning_balance": 100,
  "total_qty_in": 50,
  "total_qty_out": 30,
  "expected_ending": 120,
  "actual_ending": 115,
  "variance_qty": -5,
  "variance_percentage": -4.17,
  "last_verified_date": "2026-04-15",
  "unit_cost": 50000,
  "variance_value": -250000,
  "variance_status": "detected|assigned|resolved"
}
```

### Batch/Lot Expiry Item

```json
{
  "batch_id": "uuid",
  "batch_number": "BATCH-2026-001",
  "product_id": "uuid",
  "product_name": "Medicine XYZ",
  "warehouse_id": "uuid",
  "current_quantity": 500,
  "reserved_quantity": 100,
  "available_quantity": 400,
  "expiry_date": "2026-06-30",
  "days_to_expiry": 74,
  "expiry_status": "normal|expiring_30d|expiring_7d|expired",
  "unit_cost": 10000,
  "total_value": 5000000,
  "last_movement_date": "2026-04-10T14:22:00+07:00"
}
```

### Stock Movement Audit Log Item

```json
{
  "movement_id": "uuid",
  "transaction_type": "GR|GI|TRANSFER|OPNAME",
  "transaction_id": "GR-2026-001",
  "product_id": "uuid",
  "product_code": "SKU-001",
  "warehouse_from": "Main Warehouse",
  "warehouse_to": "Branch Warehouse",
  "movement_date": "2026-04-17T09:00:00+07:00",
  "quantity": 100,
  "unit_cost": 50000,
  "total_value": 5000000,
  "created_by": "employee_uuid",
  "created_by_name": "John Doe",
  "approved_by": "manager_uuid",
  "approval_date": "2026-04-17T10:30:00+07:00",
  "approval_status": "pending|approved|rejected",
  "journal_reference": "JNL-2026-001",
  "journal_status": "draft|posted",
  "notes": "Stock transfer for branch opening"
}
```

### Inventory Valuation Report

```json
{
  "company_id": "uuid",
  "valuation_date": "2026-04-30",
  "valuation_method": "weighted_average|fifo|lifo",
  "total_items": 1200,
  "total_on_hand_qty": 15000,
  "total_value": 750000000,
  "average_unit_cost": 50000,
  "valuation_items": [
    {
      "product_id": "uuid",
      "product_code": "SKU-001",
      "product_name": "Widget A",
      "on_hand_qty": 100,
      "unit_cost": 50000,
      "total_value": 5000000,
      "valuation_method_cost": 49500,
      "valuation_value": 4950000,
      "cogs_impact": -50000
    }
  ],
  "period_cogs": 10000000,
  "valuation_reserve": 100000
}
```

### Stock Opname Health Trending

```json
{
  "company_id": "uuid",
  "period_month": "2026-04",
  "opname_cycles": [
    {
      "cycle_id": "uuid",
      "opname_date": "2026-04-15T10:00:00+07:00",
      "total_items_counted": 1200,
      "variance_items": 18,
      "variance_percentage": 1.5,
      "adjustment_journal_count": 2,
      "approval_days": 2,
      "status": "completed|in_progress|pending_approval"
    }
  ],
  "average_variance_percentage": 1.8,
  "trend_direction": "improving|stable|degrading",
  "recommendation": "Continue current opname frequency"
}
```

---

## API Reference

### Reporting & Monitoring Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | /api/v1/inventory/health | inventory.read | Get stock health dashboard |
| GET | /api/v1/inventory/health/summary | inventory.read | Get health summary by company/warehouse |
| GET | /api/v1/inventory/variance-report | inventory.read | Get variance detection report |
| GET | /api/v1/inventory/variance-report/:id | inventory.read | Get variance item detail |
| GET | /api/v1/inventory/batch-expiry | inventory.read | Get batch/lot expiry monitor |
| GET | /api/v1/inventory/batch-expiry/:batch_id | inventory.read | Get batch expiry detail |
| GET | /api/v1/inventory/movement-audit-log | stock_movement.read | Get movement audit log |
| GET | /api/v1/inventory/movement-audit-log/:movement_id | stock_movement.read | Get movement audit detail |
| GET | /api/v1/inventory/valuation-report | general_ledger_report.read | Get inventory valuation report |
| GET | /api/v1/stock-opname/health-trending | stock_opname.read | Get opname health trending |

### Stock Health Query Parameters

**Endpoint:** `GET /api/v1/inventory/health`

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `company_id` | UUID | Yes | - | Company filter |
| `warehouse_id` | UUID | No | `nil` | Warehouse filter (all if omitted) |
| `period_start_date` | date (`YYYY-MM-DD`) | No | `apptime.TodayForCompany()` - 30 days | Period start |
| `period_end_date` | date (`YYYY-MM-DD`) | No | `apptime.TodayForCompany()` | Period end |

### Variance Report Query Parameters

**Endpoint:** `GET /api/v1/inventory/variance-report`

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `company_id` | UUID | Yes | - | Company filter |
| `warehouse_id` | UUID | No | `nil` | Warehouse filter |
| `product_id` | UUID | No | `nil` | Product filter |
| `variance_threshold` | float | No | 2.0 | Variance % threshold |
| `status` | string | No | `detected,assigned` | Filter status |
| `page` | int | No | 1 | Page number |
| `per_page` | int | No | 20 | Items per page (max 100) |

### Batch Expiry Query Parameters

**Endpoint:** `GET /api/v1/inventory/batch-expiry`

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `company_id` | UUID | Yes | - | Company filter |
| `warehouse_id` | UUID | No | `nil` | Warehouse filter |
| `expiry_status` | string | No | `expiring_30d,expiring_7d,expired` | Status filter |
| `product_category` | string | No | `nil` | Category filter |
| `page` | int | No | 1 | Page number |
| `per_page` | int | No | 20 | Items per page |

### Movement Audit Log Query Parameters

**Endpoint:** `GET /api/v1/inventory/movement-audit-log`

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `company_id` | UUID | Yes | - | Company filter |
| `transaction_type` | string | No | `nil` | GR, GI, TRANSFER, OPNAME |
| `warehouse_id` | UUID | No | `nil` | Warehouse filter |
| `start_date` | date | No | `apptime.NowForCompany()` - 30 days | Period start |
| `end_date` | date | No | `apptime.NowForCompany()` | Period end |
| `approval_status` | string | No | `nil` | pending, approved, rejected |
| `page` | int | No | 1 | Page number |
| `per_page` | int | No | 20 | Items per page |

### Valuation Report Query Parameters

**Endpoint:** `GET /api/v1/inventory/valuation-report`

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `company_id` | UUID | Yes | - | Company filter |
| `valuation_date` | date | No | `apptime.TodayForCompany()` | Valuation date |
| `valuation_method` | string | No | `weighted_average` | weighted_average, fifo, lifo |
| `warehouse_id` | UUID | No | `nil` | Warehouse filter |

---

## Business Rules

1. **Phase 5 hanya membaca data** dari phase 0-4, tidak membuat jalur movement baru.
2. **Health dashboard harus** menampilkan data real-time (cache max 5 menit).
3. **Variance detection** wajib dijalankan setiap hari untuk setiap company/warehouse.
4. **Alert status** harus immutable setelah investigation dimulai, hanya bisa change via approval.
5. **Ledger consistency** = Beginning + Sum(In) - Sum(Out) = Last Opname atau Running Qty.
6. **Batch expiry tracking** harus include reserved qty (tidak dihitung available jika reserved > 0).
7. **Movement audit log** tidak boleh soft-delete, hanya tracking perubahan via status change.
8. **Opname health trending** harus ingat 12 bulan terakhir untuk trend analysis.
9. **Inventory valuation** harus sinkron dengan GL posting setiap GL adjustment post.
10. **Low-stock alert** triggered saat qty < min_stock, harus re-trigger jika item masuk kuantitas baru.
11. **Stock accuracy score** = (Total SKU - Variance SKU) / Total SKU * 100%.
12. **Timestamp semua** report mengikuti timezone aplikasi via `apptime` per company.
13. **Reconciliation queue** harus include user assignment + SLA tracking (default 7 hari untuk resolve).
14. **Snapshot immutable** setelah opname cycle close, hanya untuk audit reference.

---

## Use Case by Role

| Role | Main Actions in Phase 5 |
|------|-------------------------|
| Warehouse Manager | Monitor inventory health, investigate variance, manage low-stock alerts, recommend opname |
| Operations Manager | Review variance trending, approve adjustment/opname, release stock for operations |
| Finance Manager | Validate inventory valuation, link GL posting, audit trail review, P&L reconciliation |
| Accountant | Monitor reconciliation queue, create GL adjustments, maintain audit snapshot |
| Auditor | Review trail, verify snapshot immutability, validate opname completion, assess controls |
| Procurement Manager | Monitor low-stock alerts, forecast reorder needs, track expiry for supplier claims |
| QA Manager | Track batch/lot expiry, monitor FIFO compliance, audit quality issues linked to stock |

---

## Manual Testing Checklist

### Health Dashboard

1. Buka inventory health dashboard untuk company dan periode spesifik.
2. Pastikan accuracy score tampil dan calculation benar (consistency check).
3. Verifikasi alert count (low-stock, out-of-stock, expiring, variance).
4. Cek bahwa health-status reflect kondisi: healthy (>95%), warning (85-95%), critical (<85%).
5. Buka detail drilldown untuk warehouse/product dan verifikasi data konsisten.

### Variance Detection

1. Create test stock movement untuk menghasilkan variance.
2. Run variance detection job (manual trigger atau scheduled).
3. Verifikasi variance item muncul di report dengan calculation benar.
4. Test filter by status (detected, assigned, resolved).
5. Create opname cycle dan verifikasi variance marker link ke opname.

### Batch Expiry Tracking

1. Create product batch dengan expiry date dalam 30 hari.
2. Verifikasi batch muncul di expiry monitor dengan correct status.
3. Test filter by expiry status (normal, expiring_30d, expiring_7d, expired).
4. Buat GI (goods issue) dan verifikasi FIFO batch recommended di UI.
5. Cek aging batch dengan qty tersisa dan verify report.

### Movement Audit Log

1. Buat GR, GI, TRANSFER dengan berbagai approval status.
2. Query audit log dan verifikasi semua movement tercatat dengan detail lengkap.
3. Check linked journal reference dan status posting.
4. Test filter by transaction type, approval status, date range.
5. Export audit log dan verifikasi format & completeness.

### Opname Health Trending

1. Create multiple stock opname cycles dalam periode 3 bulan.
2. Run trending analysis dan verify calculation (variance %, approval days, completion rate).
3. Cek trend direction (improving/stable/degrading) logic.
4. Validate recommendation generation based on trending data.
5. Ensure 12-month history available untuk year-over-year comparison.

### Inventory Valuation

1. Get valuation report dengan method weighted_average/fifo/lifo.
2. Verify calculation = on_hand_qty * unit_cost untuk each product.
3. Compare dengan GL inventory account balance (should match ±rounding).
4. Test method switching dan verify COGS impact calculation.
5. Check P&L reconciliation dengan finance closing data.

### Integration Testing

1. Create stock opname dan verify variance automatically linked.
2. Post opname adjustment journal dan verify GL posting + inventory update.
3. Run health dashboard refresh dan verify all data sync within 5min cache window.
4. Test alert triggering when low-stock threshold crossed.
5. Verify audit log capture untuk semua operation kompleks (opname, adjustment, revaluation).

---

## Integration Points

| Module | Integration in Phase 5 |
|--------|------------------------|
| Stock Ledger | Membaca ledger consistency, detect variance, feed untuk health score |
| Stock Movement | Audit log source, movement history tracking |
| Stock Opname | Opname cycle linking, variance resolution, adjustment journal bridge |
| Finance / GL | Inventory valuation posting, P&L reconciliation, journal linking |
| Product Master | Product attribute (category, valuation method), SKU grouping |
| Warehouse / Location | Warehouse health aggregation, location-level tracking |
| Alert System | Low-stock, variance alert triggering, notification delivery |
| Batch / Lot Management | Batch attributes (expiry, cost), FIFO tracking |

---

## Notes & Future Improvements

- **Known Limitation**: 
  - Phase 5 masih bergantung pada kualitas input movement dari phase 0-4.
  - Real-time accuracy score limited by batch job frequency (currently daily).
  - Expiry tracking belum include temperature/humidity condition monitoring.

- **Future Improvement**:
  - Add configurable variance threshold per product category.
  - Add scheduled nightly variance detection job dengan alert push.
  - Add downloadable inventory audit pack per cycle.
  - Add cycle-counting workflow untuk continuous accuracy improvement (not full opname).
  - Add batch-level traceability integration dengan QA/quality tracking.
  - Add supplier return/claim workflow tied to batch expiry/variance.
  - Add predictive low-stock alert dengan demand forecasting.
  - Add multi-warehouse transfer optimization based on variance & level balance.
  - Add mobile app untuk warehouse staff checkin/checkout batch ops.

- **Operational Benefit**: 
  - Tim warehouse dapat mendeteksi stock discrepancy lebih awal sebelum jadi masalah besar.
  - Finance dapat reconcile inventory dengan GL lebih cepat dan audit-ready.
  - Procurement dapat forecast reorder dengan lebih akurat berdasarkan trend & expiry.
  - Audit mendapat immutable trail untuk compliance & SOX-readiness.

---

## Related Documents

- [phase-4-stock-opname-journal-integration.md](phase-4-stock-opname-journal-integration.md) *(linked when created)*
- [hrd-attendance.md](../hrd/hrd-attendance.md) *(for reference on documentation pattern)*
- [../cash-bank/phase-5-stabilization-reporting.md](../cash-bank/phase-5-stabilization-reporting.md) *(parallel finance stabilization)*
