# Reports Module: Customer & Supplier Research Analytics

## 1. Overview

This document defines the implementation plan for two new analytics pages in the **Reports** module: **Customer Research** and **Supplier Research**. These pages are not transactional reports; they are **business intelligence dashboards** that provide relationship insights and long-term performance metrics.

The goal is to enable business owners and managers to answer strategic questions such as:

- Which customers are driving revenue and which are becoming inactive?
- Which suppliers are dependable, cost-effective, and critical dependencies?

To meet performance, maintainability, and architectural standards, analytics will not query operational tables directly. Instead, periodic **snapshot-based aggregated reporting tables** will be populated by scheduled background jobs. Frontend pages will consume these snapshots via API endpoints.

This document follows the internal standards in `docs/.cursor/rules/standart.mdc` and `docs/api-standart/*.md` for API design, naming conventions, architecture, and data modeling.

---

## 2. Architecture Decision

### 2.1 Why Snapshot-based Analytics

1. **Performance**: Operational tables (orders, invoices, payments) are high-write, high-concurrency. Aggregation queries across these tables are expensive, especially for dashboard charts.
2. **Consistency**: Snapshot tables provide a stable, read-optimized dataset that is consistent across charts and tables.
3. **Separation of Concerns**: Operational modules remain responsible for transactional integrity; analytics logic is isolated in a reporting pipeline.
4. **Scalability**: Snapshot computations can be scheduled during off-peak hours and scaled independently from the API.

### 2.2 Snapshot Generation Pattern

- A scheduled background worker (cron or queue worker) will periodically compute analytics metrics from source operational tables.
- Snapshots are maintained in dedicated tables in the reporting schema:
  - `report_customer_snapshot`
  - `report_supplier_snapshot`
- Snapshot refresh cadence: **every 6 hours** (configurable). On startup or when forced, a full refresh can be performed.
- The snapshot process should be **idempotent** and **incremental** whenever possible.

### 2.3 Standards Compliance

The design follows the backend conventions in `docs/api-standart/api-response-standards.md` and `docs/api-standart/api-folder-structure.md`:

- All API responses use the standard wrapper:
  ```json
  {
    "success": true,
    "data": { ... },
    "meta": { ... },
    "timestamp": "2024-01-15T10:30:45+07:00",
    "request_id": "req_abc123"
  }
  ```

- Error codes follow `docs/api-standart/api-error-codes.md` (e.g., `VALIDATION_ERROR`, `RESOURCE_NOT_FOUND`).
- API route paths follow the versioned pattern `/api/v1/reports/...`.

---

## 3. Sprint 1: Customer Research

### 3.1 Sprint Goal

Create a report page that allows business owners to analyze customer behavior and performance using aggregated snapshot data.

### 3.2 Problem Statement

Current operational modules spread customer activity across multiple tables (sales orders, invoices, payments). Business owners need consolidated insights into customer quality, revenue trends, and payment reliability without running complex OLAP queries.

### 3.3 User Story

**As a** business owner,
**I want** a Customer Research report page that shows KPIs, charts, and tables based on customer activity,
**so that** I can identify high-value customers, understand customer churn, and measure payment behavior.

### 3.4 Functional Requirements

#### 3.4.1 KPI Metrics (Top-level Cards)
- Total Customers (in snapshot window)
- Active Customers (customers with at least one order in the selected date range)
- Inactive Customers (customers without orders in the selected date range)
- Total Revenue (sum of invoice net amounts for the selected period)
- Average Order Value (total revenue / total number of orders)

#### 3.4.2 Charts
- Revenue by Customer (bar chart)
- Customer Purchase Frequency (bar chart; #orders per customer)
- Revenue Trend Over Time (line chart; revenue aggregated by time bucket)

#### 3.4.3 Tables
- Top Customers
- Inactive Customers
- Customer Payment Behavior

#### 3.4.4 Detail View
When clicking a customer row, open a detail panel showing:
- Customer summary (ID, name, segment, lifecycle state)
- Revenue timeline (chart)
- Order frequency (chart)
- Payment behavior (table / sparkline)

#### 3.4.5 Filters
- Date range (start / end)
- Customer segment (dropdown, multi-select)
- Revenue range (min / max)

### 3.5 Non-functional Requirements

- Page must load in under **1.5s** for the default 30-day range.
- Ensure queries use snapshot tables only; no joins to operational tables at runtime.
- API responses must be paginated when returning lists (max 100 per page).
- The page must comply with accessibility standards (keyboard nav, screen reader labels).
- Server must enforce RBAC; only users with `reports.customer_research.read` can access.

### 3.6 Data Architecture

#### 3.6.1 Source Tables (Operational)
- `sales_orders` (order header, customer_id, order_date, total_amount)
- `customer_invoices` (invoice_date, total_amount, status, due_date)
- `customer_payments` (payment_date, amount, invoice_id, payment_term_days)

#### 3.6.2 Snapshot Table
- Table: `report_customer_snapshot`
- Purpose: store pre-aggregated metrics per customer and timeline buckets.

### 3.7 Snapshot Schema Design

#### Table: `report_customer_snapshot`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Primary key; UUID generated per record. |
| `company_id` | UUID | Company scope (multi-tenant). |
| `customer_id` | UUID | FK to customers. |
| `snapshot_date` | date | Date of snapshot (daily). |
| `snapshot_window_start` | timestamp with time zone | Start of aggregated window (inclusive). |
| `snapshot_window_end` | timestamp with time zone | End of aggregated window (inclusive). |
| `total_revenue` | numeric(18, 2) | Sum of invoice amounts in window. |
| `total_orders` | integer | Number of sales orders in window. |
| `average_order_value` | numeric(18, 2) | `total_revenue / NULLIF(total_orders, 0)`. |
| `last_order_date` | timestamptz | Most recent order date in window. |
| `total_payments` | numeric(18, 2) | Sum of payments in window. |
| `average_payment_days` | numeric(10, 2) | Average days between invoice due date and payment date (positive = late). |
| `late_payment_count` | integer | Count of payments made after due date. |
| `orders_in_window` | integer | Number of orders in window (same as total_orders). |
| `is_active` | boolean | `total_orders > 0` (for filter). |
| `created_at` | timestamptz | Record insertion timestamp. |
| `updated_at` | timestamptz | Record update timestamp. |

**Indexes**
- `idx_report_customer_snapshot_company_customer` on `(company_id, customer_id, snapshot_date)`
- `idx_report_customer_snapshot_company_date` on `(company_id, snapshot_date)`
- `idx_report_customer_snapshot_total_revenue` on `(company_id, total_revenue DESC)`

### 3.8 API Endpoints

All endpoints under `/api/v1/reports/customer-research`.

#### 3.8.1 GET `/api/v1/reports/customer-research/kpis`
- Permissions: `reports.customer_research.read`
- Query Parameters:
  - `start_date` (required, date)
  - `end_date` (required, date)
  - `segment_ids` (optional, CSV UUIDs)
  - `min_revenue` (optional, numeric)
  - `max_revenue` (optional, numeric)

**Response:**
```json
{
  "success": true,
  "data": {
    "total_customers": 1234,
    "active_customers": 987,
    "inactive_customers": 247,
    "total_revenue": "1234567.89",
    "average_order_value": "234.56"
  },
  "meta": null,
  "timestamp": "2026-03-17T10:30:45+07:00",
  "request_id": "req_abc123"
}
```

#### 3.8.2 GET `/api/v1/reports/customer-research/revenue-by-customer`
- Permissions: `reports.customer_research.read`
- Query Parameters: same as KPIs + `page`, `per_page`, `sort_by` (e.g., `total_revenue`), `sort_order` (`asc|desc`).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "customer_id": "...",
      "customer_name": "Acme Corp",
      "total_revenue": "123456.78",
      "total_orders": 12,
      "average_order_value": "10288.07"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "per_page": 20,
      "total": 250
    }
  },
  "timestamp": "...",
  "request_id": "..."
}
```

#### 3.8.3 GET `/api/v1/reports/customer-research/purchase-frequency`
- Returns customers ordered by order count.
- Response structure similar to revenue-by-customer.

#### 3.8.4 GET `/api/v1/reports/customer-research/revenue-trend`
- Returns time series data for revenue aggregated by time bucket.
- Query Parameters:
  - `interval` (optional, `daily|weekly|monthly`, default `daily`)

**Response:**
```json
{
  "success": true,
  "data": [
    { "period": "2026-03-01", "total_revenue": "12345.67" },
    { "period": "2026-03-02", "total_revenue": "23456.78" }
  ],
  "meta": null,
  "timestamp": "...",
  "request_id": "..."
}
```

#### 3.8.5 GET `/api/v1/reports/customer-research/customers`
- Returns paginated table data for Top Customers or Inactive customers.
- Query Parameters:
  - `tab` (`top` | `inactive` | `payment_behavior`)
  - `page`, `per_page`, `sort_by`, `sort_order`

#### 3.8.6 GET `/api/v1/reports/customer-research/customers/{customer_id}`
- Returns detail panel data for a single customer.

**Response:**
```json
{
  "success": true,
  "data": {
    "customer_id": "...",
    "customer_name": "Acme Corp",
    "segment": "Enterprise",
    "total_revenue": "123456.78",
    "order_count": 12,
    "average_order_value": "10288.07",
    "payment_behavior": {
      "average_payment_days": 8.3,
      "late_payment_count": 2,
      "payment_terms_days": 14
    },
    "timeline": {
      "revenue_by_date": [
        { "date": "2026-03-01", "revenue": "12345.00" }
      ],
      "orders_by_date": [
        { "date": "2026-03-01", "order_count": 2 }
      ]
    }
  },
  "meta": null,
  "timestamp": "...",
  "request_id": "..."
}
```

### 3.9 Backend Logic

#### 3.9.1 Snapshot Generation (Background Job)
- **Input**: `start_date`, `end_date` (segmented by daily snapshot)
- **Process**:
  1. Select active customers from `sales_orders` within the window.
  2. Join with `customer_invoices` and `customer_payments`.
  3. Compute aggregated metrics per customer.
  4. Upsert into `report_customer_snapshot` using `ON CONFLICT (company_id, customer_id, snapshot_date)`.

- **Payment behavior calculation**:
  - `average_payment_days` = average of `payment_date - invoice_due_date` (positive if late, negative if early).
  - `late_payment_count` = count where `payment_date > invoice_due_date`.

- **Inactive customers**:
  - Determine by `customer_id` in `customer_master` not present in `sales_orders` during the window.
  - Insert rows with `total_orders = 0`, `is_active = false`, and `total_revenue = 0`.

#### 3.9.2 API Layer

The API layer follows the vertical slice pattern (handler → usecase → repository):

- `internal/reports/customer-research/presentation/handler/customer_research_handler.go`
- `internal/reports/customer-research/domain/usecase/customer_research_usecase.go`
- `internal/reports/customer-research/data/repository/customer_snapshot_repository.go`

The handler validates query parameters, calls usecase, and returns standard response.

#### 3.9.3 Query Optimizations
- Use indexed snapshot tables only.
- Avoid `SELECT DISTINCT` where possible.
- Ensure pagination queries use `LIMIT`/`OFFSET` with `ORDER BY` on indexed columns.

### 3.10 Frontend UI Layout

#### 3.10.1 Page Location
- Path: `/app/[locale]/(dashboard)/reports/customer-research/page.tsx`
- Loading component: `app/[locale]/(dashboard)/reports/customer-research/loading.tsx`
- Route validation: Add to `src/lib/route-validator.ts`

#### 3.10.2 Layout Structure
- **Top section**: KPI cards (Total Customers, Active, Inactive, Total Revenue, AOV)
- **Middle section**: Charts (Revenue by Customer, Purchase Frequency, Revenue Trend)
- **Bottom section**: Tabs for tables (Top Customers / Inactive / Payment Behavior)
- **Detail panel**: Slide-over panel from right when a row is clicked.

#### 3.10.3 Component Breakdown

- `features/reports/customer-research/components/CustomerResearchPage.tsx` (server component)
- `features/reports/customer-research/hooks/useCustomerResearch.ts` (client hook using TanStack Query)
- `features/reports/customer-research/services/customerResearchService.ts` (API calls)
- `features/reports/customer-research/components/KpiCards.tsx` (UI component)
- `features/reports/customer-research/components/Charts/*` (chart components using Recharts or Chart.js)
- `features/reports/customer-research/components/Tables/*` (table components with sorting and pagination)
- `features/reports/customer-research/components/CustomerDetailPanel.tsx`

### 3.11 Chart Definitions

#### 3.11.1 Revenue by Customer (Bar Chart)
- X-axis: customer name (top N customers by revenue)
- Y-axis: total revenue
- Data source: `GET /reports/customer-research/revenue-by-customer` (top 20 by default)
- Tooltip: shows revenue, order count, average order value

#### 3.11.2 Customer Purchase Frequency (Bar Chart)
- X-axis: customer name
- Y-axis: order count
- Data source: `GET /reports/customer-research/purchase-frequency`

#### 3.11.3 Revenue Trend Over Time (Line Chart)
- X-axis: date (time bucket)
- Y-axis: revenue
- Data source: `GET /reports/customer-research/revenue-trend`
- Controls: interval selector (daily/weekly/monthly)

### 3.12 Table Definitions

#### 3.12.1 Top Customers
Columns:
- Customer name (clickable)
- Total revenue
- Total orders
- Average order value
- Last order date
- Active status badge

#### 3.12.2 Inactive Customers
Columns:
- Customer name
- Last order date
- Days since last order
- Total revenue (lifetime)
- Segment

#### 3.12.3 Customer Payment Behavior
Columns:
- Customer name
- Average payment days
- Late payment count
- Total payments
- Payment term days

### 3.13 Filters and Search

#### 3.13.1 Filters
- Date range: start/end date picker (defaults to last 30 days)
- Customer segment: multi-select dropdown (segmentation data comes from `customer_segment` table)
- Revenue range: min/max numeric inputs

#### 3.13.2 Search
- Global search input: searches customer name or customer code
- Applies filter to all tables and charts

### 3.14 Permissions (RBAC)

#### Roles and Permissions
- Permission name: `reports.customer_research.read`
- Available in the role matrix (`roles_permissions` config). Only roles with business analyst or executive privileges should receive it.
- API endpoints enforce permission via middleware `RequirePermission("reports.customer_research.read")`.

### 3.15 Edge Cases

- **No data**: show empty state UI with clear instructions (e.g., `No customer activity found for selected date range.`)
- **Date range too wide**: enforce max range (e.g., 365 days). Return `VALIDATION_ERROR` if exceeded.
- **Snapshot lag**: if snapshot is stale (older than 24h), show warning banner: `Data may be outdated. Latest snapshot: 2026-03-16 00:00 UTC.`
- **Missing segment mapping**: if `segment_id` is null, categorize as `Unsegmented`.
- **Large customer list**: enforce max `per_page=100`. Reject larger values with `VALIDATION_ERROR`.

### 3.16 Performance Considerations

- Ensure snapshot queries use indexes on `(company_id, snapshot_date)` and `total_revenue`.
- Cache KPI results for 5 minutes in memory (per request) using `ristretto` or in-memory map with TTL.
- Avoid N+1: Prefetch customer names and segments in a single query.
- Use `LIMIT` and `OFFSET` for pagination; for deep pagination, consider cursor-based if performance issues arise.

### 3.17 Acceptance Criteria

1. A new menu item appears under **Reports**: **Customer Research**.
2. The page loads and displays KPI cards with accurate data from snapshot tables.
3. Charts render correctly and update when filters change.
4. Tables offer pagination, sorting, and filtering.
5. Clicking a customer opens a detail panel with a revenue timeline and payment behavior.
6. The API returns correct responses matching the documented schema.
7. The page is accessible (keyboard navigation, screen reader labels) and responsive.
8. RBAC is enforced: users without permission receive `403 FORBIDDEN`.
9. Snapshot is refreshed at least once every 6 hours via background job.

---

## 4. Sprint 2: Supplier Research

### 4.1 Sprint Goal

Create a report page that allows business owners to evaluate supplier performance, reliability, and dependency risk using aggregated snapshot data.

### 4.2 Problem Statement

Supplier performance and dependency risks are hard to assess because data is stored across purchase orders, goods receipts, invoices, and payments. Managers need consolidated supplier analytics to negotiate better terms, avoid bottlenecks, and reduce supplier concentration risk.

### 4.3 User Story

**As a** procurement manager,
**I want** a Supplier Research dashboard with KPIs, charts, and detail panels,
**so that** I can identify top suppliers, evaluate delivery reliability, and detect dependency risks.

### 4.4 Functional Requirements

#### 4.4.1 KPI Metrics
- Total Suppliers
- Active Suppliers (suppliers with purchase activity in the selected range)
- Total Purchase Value (invoice-based) 
- Average Supplier Lead Time (days between PO and GR)

#### 4.4.2 Charts
- Purchase Volume by Supplier (bar chart)
- Supplier Delivery Time (boxplot or bar chart showing average lead time)
- Supplier Spend Trend (line chart)

#### 4.4.3 Tables
- Top Suppliers by Spend
- Slow Delivery Suppliers
- Supplier Reliability

#### 4.4.4 Detail View
Clicking a supplier row opens a detail panel showing:
- Supplier summary (category, country, etc.)
- Purchase history (timeline)
- Delivery performance (lead time distribution, on-time rate)
- Payment history and terms

#### 4.4.5 Filters
- Date range (start/end)
- Supplier category (multi-select)
- Purchase value range (min/max)

### 4.5 Non-functional Requirements

- Page must load in under **1.5s** for default date range (last 30 days).
- No direct queries to operational tables at runtime; use snapshot tables exclusively.
- API responses must follow pagination and standard response format.
- Enforce RBAC: only users with `reports.supplier_research.read` may access.
- Page must meet accessibility standards.

### 4.6 Data Architecture

#### 4.6.1 Source Tables (Operational)
- `purchase_orders` (order_date, supplier_id, total_amount, status)
- `goods_receipts` (receipt_date, purchase_order_id, received_quantity, expected_quantity)
- `supplier_invoices` (invoice_date, due_date, total_amount, status)
- `supplier_payments` (payment_date, amount, invoice_id)

#### 4.6.2 Snapshot Table
- Table: `report_supplier_snapshot`

### 4.7 Snapshot Schema Design

#### Table: `report_supplier_snapshot`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Primary key. |
| `company_id` | UUID | Company scope. |
| `supplier_id` | UUID | FK to supplier entity. |
| `snapshot_date` | date | Daily snapshot date. |
| `snapshot_window_start` | timestamptz | Window start. |
| `snapshot_window_end` | timestamptz | Window end. |
| `total_purchase_value` | numeric(18, 2) | Sum of invoice amounts in window. |
| `total_purchase_orders` | integer | Count of POs in window. |
| `average_lead_time_days` | numeric(10, 2) | Avg days from PO date to GR date. |
| `supplier_on_time_rate` | numeric(5, 2) | % of receipts on/ before expected date. |
| `late_delivery_count` | integer | Count of receipts after expected date. |
| `dependency_score` | numeric(5, 2) | Proportion of spend relative to total spend (0-100). |
| `is_active` | boolean | true when `total_purchase_orders > 0`. |
| `created_at` | timestamptz | Created timestamp. |
| `updated_at` | timestamptz | Updated timestamp. |

**Indexes**
- `idx_report_supplier_snapshot_company_supplier` on `(company_id, supplier_id, snapshot_date)`
- `idx_report_supplier_snapshot_company_date` on `(company_id, snapshot_date)`
- `idx_report_supplier_snapshot_total_purchase_value` on `(company_id, total_purchase_value DESC)`

### 4.8 API Endpoints

All endpoints under `/api/v1/reports/supplier-research`.

#### 4.8.1 GET `/api/v1/reports/supplier-research/kpis`
- Permissions: `reports.supplier_research.read`
- Query Parameters:
  - `start_date`, `end_date` (required)
  - `category_ids` (optional, CSV)
  - `min_purchase_value`, `max_purchase_value` (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "total_suppliers": 123,
    "active_suppliers": 87,
    "total_purchase_value": "987654.32",
    "average_lead_time_days": 9.7
  },
  "meta": null,
  "timestamp": "...",
  "request_id": "..."
}
```

#### 4.8.2 GET `/api/v1/reports/supplier-research/purchase-volume`
- Returns spend by supplier.
- Supports pagination and sorting by spend.

#### 4.8.3 GET `/api/v1/reports/supplier-research/delivery-time`
- Returns average lead time per supplier.
- Response includes on-time rate.

#### 4.8.4 GET `/api/v1/reports/supplier-research/spend-trend`
- Returns time-series spend data.
- Supports interval `daily|weekly|monthly`.

#### 4.8.5 GET `/api/v1/reports/supplier-research/suppliers`
- Returns table rows for the three tables: top spenders, slow delivery, reliability.
- Query parameter `tab` (`top_spenders|slow_delivery|reliability`).

#### 4.8.6 GET `/api/v1/reports/supplier-research/suppliers/{supplier_id}`
- Returns detailed supplier analytics.

**Response:**
```json
{
  "success": true,
  "data": {
    "supplier_id": "...",
    "supplier_name": "Supplier A",
    "category": "Raw Materials",
    "total_purchase_value": "123456.78",
    "average_lead_time_days": 10.2,
    "on_time_rate": 92.5,
    "dependency_score": 18.3,
    "timeline": {
      "purchase_value_by_date": [
        { "date": "2026-03-01", "value": "12345.00" }
      ],
      "lead_time_by_date": [
        { "date": "2026-03-01", "lead_time_days": 9 }
      ]
    }
  },
  "meta": null,
  "timestamp": "...",
  "request_id": "..."
}
```

### 4.9 Backend Logic

#### 4.9.1 Snapshot Generation (Background Job)
- **Input**: `start_date`, `end_date`, `company_id`
- **Process**:
  1. Query purchase orders, goods receipts, invoices, and payments for the window.
  2. Compute lead time: `receipt_date - purchase_order_date`.
  3. Compute on-time rate: percent of receipts where `receipt_date <= expected_receipt_date`.
  4. Compute dependency score: supplier spend / total spend (in window) * 100.
  5. Upsert into `report_supplier_snapshot` (idempotent).

#### 4.9.2 API Layer

- Handler: `internal/reports/supplier-research/presentation/handler/supplier_research_handler.go`
- Usecase: `internal/reports/supplier-research/domain/usecase/supplier_research_usecase.go`
- Repository: `internal/reports/supplier-research/data/repository/supplier_snapshot_repository.go`

#### 4.9.3 Query Optimizations
- Use snapshot table indexes to fetch top suppliers quickly.
- Use `WHERE company_id = ? AND snapshot_date BETWEEN ? AND ?`.
- For time-series, use `GROUP BY snapshot_date` and ensure date is indexed.

### 4.10 Frontend UI Layout

#### 4.10.1 Page Location
- Path: `/app/[locale]/(dashboard)/reports/supplier-research/page.tsx`
- Loading: `app/[locale]/(dashboard)/reports/supplier-research/loading.tsx`
- Route validation updated in `src/lib/route-validator.ts`

#### 4.10.2 Layout Structure
- **Top section**: KPI cards (Total Suppliers, Active, Total Purchase Value, Avg Lead Time)
- **Middle section**: Charts (Purchase Volume by Supplier, Delivery Time, Spend Trend)
- **Bottom section**: Tabbed tables (Top Suppliers, Slow Delivery, Reliability)
- **Detail panel**: Slide-over panel from right for supplier details.

#### 4.10.3 Component Breakdown
- `features/reports/supplier-research/components/SupplierResearchPage.tsx`
- `features/reports/supplier-research/hooks/useSupplierResearch.ts`
- `features/reports/supplier-research/services/supplierResearchService.ts`
- `features/reports/supplier-research/components/Charts/*`
- `features/reports/supplier-research/components/Tables/*`
- `features/reports/supplier-research/components/SupplierDetailPanel.tsx`

### 4.11 Chart Definitions

#### 4.11.1 Purchase Volume by Supplier (Bar Chart)
- X-axis: supplier name (top N by spend)
- Y-axis: total purchase value
- Data source: `/reports/supplier-research/purchase-volume`

#### 4.11.2 Supplier Delivery Time (Bar Chart)
- X-axis: supplier name
- Y-axis: average lead time (days)
- Includes on-time rate visual (dot or stacked bar)
- Data source: `/reports/supplier-research/delivery-time`

#### 4.11.3 Supplier Spend Trend (Line Chart)
- X-axis: date
- Y-axis: total purchase value
- Data source: `/reports/supplier-research/spend-trend`

### 4.12 Table Definitions

#### 4.12.1 Top Suppliers by Spend
Columns:
- Supplier name (clickable)
- Total purchase value
- Total purchase orders
- Dependency score (% of spend)
- Category

#### 4.12.2 Slow Delivery Suppliers
Columns:
- Supplier name
- Average lead time (days)
- Late delivery count
- On-time rate (%)
- Expected lead time

#### 4.12.3 Supplier Reliability
Columns:
- Supplier name
- On-time rate (%)
- Lead time variance (std dev)
- Invoice accuracy (orders vs invoices)
- Payment timeliness (average payment days)

### 4.13 Filters and Search

#### 4.13.1 Filters
- Date range: start/end
- Supplier category: multi-select
- Purchase value range: min/max

#### 4.13.2 Search
- Global supplier search by name or code
- Applies across charts and tables

### 4.14 Permissions (RBAC)

- Permission: `reports.supplier_research.read`
- Enforced in API middleware and frontend route validation.
- Should be assignable to roles such as Procurement Manager, CFO, or Admin.

### 4.15 Edge Cases

- **No suppliers in date range**: show empty state with explanation.
- **Stale snapshot**: show warning if latest snapshot older than 24h.
- **Supplier without receipts**: treat as `on_time_rate = 0` and `average_lead_time_days = null`.
- **Divide by zero**: compute `average_lead_time_days` only when `total_purchase_orders > 0`.
- **Large supplier list**: enforce `per_page <= 100`.

### 4.16 Performance Considerations

- Snapshot table queries must use indexes on (company_id, snapshot_date).
- Pre-compute dependency score in snapshot to avoid recalculation.
- Cache API results for 5-10 minutes where appropriate.
- For time-series endpoints, use materialized view or pre-aggregated snapshot rows at day-level.

### 4.17 Acceptance Criteria

1. A new menu item appears under **Reports**: **Supplier Research**.
2. The page displays KPI cards, charts, and tables based on snapshot data.
3. Table sorting, pagination, and filters work correctly.
4. Clicking a supplier opens a detail panel with purchase and delivery performance.
5. RBAC is enforced; unauthorized users receive `403 FORBIDDEN`.
6. Snapshot refresh job runs every 6 hours and updates report tables.
7. UI is accessible, responsive, and uses cursor-pointer on clickable elements.

---

## 5. Snapshot Data Architecture

### 5.1 Snapshot Generation Pipeline

1. **Scheduler**: Cron job or background worker triggers snapshot pipeline every 6 hours.
2. **Extractor**: Reads operational tables (orders, invoices, payments).
3. **Transformer**: Aggregates and computes metrics.
4. **Loader**: Writes to snapshot tables using UPSERT.

### 5.2 Snapshot Table Naming and Versioning

- Use explicit naming prefix `report_`.
- Each snapshot table includes `snapshot_date` for time-based slicing.
- If schema changes, introduce new table version (e.g., `report_customer_snapshot_v2`) and migrate in a controlled deployment.

### 5.3 Snapshot Table Schema Guidelines

- Use numeric types with precision (`numeric(18,2)` for amounts).
- Use `timestamptz` for all date/time columns.
- Keep record-level metadata (`created_at`, `updated_at`).
- Include `company_id` for multi-tenancy.
- Index commonly filtered columns (company_id, snapshot_date, customer_id/supplier_id).

---

## 6. API Design

### 6.1 API Folder Structure (Backend)

```
internal/reports/
  customer-research/
    data/
      repository/
    domain/
      dto/
      mapper/
      usecase/
    presentation/
      handler/
      router/
  supplier-research/
    ...
```

### 6.2 API Response Standard

All endpoints must return the standard response:

```json
{
  "success": true,
  "data": { ... },
  "meta": { ... } | null,
  "timestamp": "2026-03-17T10:30:45+07:00",
  "request_id": "req_abc123"
}
```

### 6.3 Error Responses

Follow `docs/api-standart/api-error-codes.md`. Example:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "start_date is required and must be a date",
    "details": { "start_date": "required" }
  },
  "timestamp": "...",
  "request_id": "..."
}
```

### 6.4 Pagination Contract

- All list endpoints accept `page` (default 1) and `per_page` (default 20, max 100).
- Response includes `meta.pagination`:

```json
"meta": {
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 123,
    "total_pages": 7
  }
}
```

### 6.5 RBAC Enforcement

Use `RequirePermission` middleware in router. Example:

```go
reports.GET("/customer-research/kpis", middleware.RequirePermission("reports.customer_research.read"), handler.GetKpis)
```

---

## 7. UI Layout Specification

### 7.1 Shared UI Patterns

- Use `PageMotion` for page transitions.
- Use `Skeleton` components for loading states.
- Use `Tabs` with `TabsContent` for tabbed tables to enable lazy rendering.
- Use `Table` component with `sortable` columns.
- Ensure all clickable rows / buttons use `cursor-pointer`.

### 7.2 Customer Research Page Layout

1. **Header**: Page title, date range filter, segment filter, revenue range filter.
2. **KPI Row**: 5 cards (Total Customers, Active, Inactive, Total Revenue, AOV).
3. **Charts Row**:
   - Left: Revenue by Customer (Bar chart)
   - Middle: Purchase Frequency (Bar chart)
   - Right: Revenue Trend (Line chart)
4. **Tabs**:
   - Tab 1: Top Customers (table)
   - Tab 2: Inactive Customers (table)
   - Tab 3: Payment Behavior (table)
5. **Detail Panel**: slide-over with charts and tables.

### 7.3 Supplier Research Page Layout

1. **Header**: Page title, date range filter, category filter, purchase value range filter.
2. **KPI Row**: 4 cards (Total Suppliers, Active, Total Purchase, Avg Lead Time).
3. **Charts Row**:
   - Left: Purchase Volume by Supplier (Bar)
   - Middle: Delivery Time (Bar)
   - Right: Spend Trend (Line)
4. **Tabs**:
   - Tab 1: Top Suppliers by Spend
   - Tab 2: Slow Delivery Suppliers
   - Tab 3: Supplier Reliability
5. **Detail Panel**: slide-over.

---

## 8. Background Job Logic

### 8.1 Job Runner

A dedicated background worker (e.g., `cmd/reports-snapshot/main.go`) or cron task executed in the API container.

- Configurable via env vars:
  - `REPORT_SNAPSHOT_CRON="0 */6 * * *"`
  - `REPORT_SNAPSHOT_WINDOW_HOURS=6`

### 8.2 Snapshot Generation Process

1. Determine processing window: `now` (apptime.Now()) and `now - window`.
2. For each company:
   - Compute customer snapshot metrics.
   - Compute supplier snapshot metrics.
   - Write to snapshot tables.
3. Log processing time and record in `report_snapshot_run_log` (optional).

### 8.3 Idempotency

- Use `ON CONFLICT (company_id, customer_id, snapshot_date)` and `ON CONFLICT (company_id, supplier_id, snapshot_date)`.
- Make sure all timestamp columns are deterministic.

### 8.4 Error Handling

- Failures in one company should not stop others.
- Error logs must include `company_id` and time window.
- Retry strategy: exponential backoff, max 3 attempts.

---

## 9. Performance Considerations

### 9.1 Snapshot Storage

- Keep snapshot tables slim: avoid storing raw JSON.
- Use numeric types and avoid text columns where possible.

### 9.2 Query Performance

- Enforce `company_id` in every query.
- Use prepared statements / query caching in repository layer.
- Validate `per_page` and `page` to prevent heavy queries.

### 9.3 Frontend Performance

- Use server components where possible; fetch data in server side to reduce client bundle.
- Lazy load charts and tables (with `dynamic()` and `Suspense`).
- Debounce filter inputs to avoid repeated API calls.

### 9.4 Caching

- Use in-memory caching for KPI requests (5 min TTL).
- Use `Cache-Control` headers for stable data (e.g., `s-maxage=300` for CDN). (If applicable)

---

## 10. Acceptance Criteria

### 10.1 General

- Both pages exist under Reports module and are accessible via UI.
- Snapshot tables are created and populated by background job.
- API endpoints return correct data structures and follow the standard response format.
- UI components render correctly for default filters and respond to user interaction.
- RBAC is enforced on all API endpoints.
- Pages are accessible (keyboard / screen reader) and responsive.

### 10.2 Customer Research Specific

- KPI cards display correct computed values.
- Charts render with correct axes and tooltips.
- Tables support pagination, sorting, and filtering.
- Detail panel shows correct customer summary and timeline charts.

### 10.3 Supplier Research Specific

- KPI cards display correct computed values.
- Charts render with correct supplier spend and lead-time data.
- Tables support pagination, sorting, and filtering.
- Detail panel shows correct supplier performance metrics.

---

**Notes:**
- All implementations must follow the folder structure and naming conventions in `docs/.cursor/rules/standart.mdc`.
- Ensure all API implementations are registered in the main router aggregator for reports (`internal/reports/presentation/routers.go`).
- Update `docs/postman/postman.json` with new endpoints after implementation.
