# POS Dual-Mode Architecture

> **Module:** POS -> Architecture
> **Sprint:** Draft Planning
> **Version:** 0.2.0
> **Status:** Draft
> **Last Updated:** April 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Modes](#architecture-modes)
3. [System Architecture](#system-architecture)
4. [Module Dependency Map](#module-dependency-map)
5. [Shared Foundation](#shared-foundation)
6. [Mode A: Goods/Distributor](#mode-a-goodsdistributor)
7. [Mode B: F&B/Restaurant](#mode-b-fbrestaurant)
8. [Warehouse as Outlet](#warehouse-as-outlet)
9. [Stock Consumption Models](#stock-consumption-models)
10. [Permission and Scope](#permission-and-scope)
11. [Technical Decisions](#technical-decisions)
12. [Navigation and UX](#navigation-and-ux)
13. [Notes and Improvements](#notes-and-improvements)

---

## Overview

GIMS POS supports two operational modes sharing the same backend infrastructure:

- **Mode A: Goods/Distributor** — Traditional POS for retail, pharmacies, small shops selling physical goods.
- **Mode B: F&B/Restaurant** — Full-service POS with floor layout, table management, recipe-based menu items, and kitchen operations.

Both modes use the same Product, Warehouse, Inventory, and Transaction modules. The difference lies in workflow, product kind handling, and UI presentation.

## Architecture Modes

| Aspect | Mode A: Goods | Mode B: F&B |
|---|---|---|
| Product Kind Focus | `STOCK` items | `RECIPE` and `SERVICE` items |
| Stock Deduction | Direct from warehouse | Recipe explosion (ingredient-level) |
| Floor Layout | Not used | Tables, zones, and floor plans |
| Order Flow | Cart → Payment → Done | Table → Order → Kitchen → Serve → Payment |
| Kitchen Display | Not applicable | Kitchen ticket routing |
| Split Billing | Not applicable | Per-table split |
| Receipt | Standard sales receipt | Restaurant receipt with table info |

## System Architecture

```
┌──────────────────────────────────────────────────────┐
│                   POS Frontend                       │
│  ┌─────────────┐   ┌──────────────────────────────┐  │
│  │ Goods Mode  │   │  F&B Mode                    │  │
│  │ (Cart POS)  │   │ (Floor → Table → Order)      │  │
│  └──────┬──────┘   └───────────┬──────────────────┘  │
│         │                      │                     │
│         └──────┬───────────────┘                     │
│                │                                     │
│         ┌──────▼──────┐                              │
│         │ POS Service │                              │
│         │  Layer      │                              │
│         └──────┬──────┘                              │
└────────────────┼─────────────────────────────────────┘
                 │ REST API
┌────────────────┼─────────────────────────────────────┐
│                ▼ Backend                             │
│  ┌─────────────────────────────┐                     │
│  │      POS Domain             │                     │
│  │  (Orders, Floor Layout)     │                     │
│  └──────────┬──────────────────┘                     │
│             │                                        │
│  ┌──────────▼──────────────────┐                     │
│  │  Shared Domains             │                     │
│  │  ┌─────────┐ ┌───────────┐  │                     │
│  │  │ Product │ │ Warehouse │  │                     │
│  │  │ Master  │ │ / Outlet  │  │                     │
│  │  └────┬────┘ └─────┬─────┘  │                     │
│  │       │            │        │                     │
│  │  ┌────▼────────────▼───┐    │                     │
│  │  │    Stock Module     │    │                     │
│  │  │  (Inventory Batch,  │    │                     │
│  │  │   Stock Movement)   │    │                     │
│  │  └─────────────────────┘    │                     │
│  └─────────────────────────────┘                     │
└──────────────────────────────────────────────────────┘
```

## Module Dependency Map

```
POS Domain
├── reads → Product (catalog, product_kind, recipe items)
├── reads → Warehouse (outlet info, is_pos_outlet)
├── writes → Stock (deduction via StockMovement)
├── reads → Customer (optional loyalty)
└── writes → Sales (transaction record)

Product Domain (source of truth)
├── owns → products table (incl. product_kind, is_pos_available)
├── owns → product_recipe_items table
└── provides → catalog, pricing, recipe detail

Stock Domain
├── owns → inventory_batches, stock_movements
├── consumes → recipe detail for ingredient explosion
└── scoped → per warehouse (outlet)

Warehouse Domain
├── owns → warehouses table (incl. is_pos_outlet)
└── provides → outlet list for POS scope
```

## Shared Foundation

Both modes share:

| Module | Role |
|---|---|
| Product Master | SKU catalog, pricing, product_kind, recipes |
| Warehouse | Outlet locations (is_pos_outlet=true) |
| Inventory | Stock batches and movement tracking |
| Customer | Optional loyalty and membership |
| Sales Transaction | Order/receipt records |
| Auth/RBAC | User → Outlet scope via WAREHOUSE permission |

## Mode A: Goods/Distributor

### Workflow

1. Cashier selects outlet (warehouse).
2. Scans/searches products (STOCK kind).
3. Adds items to cart with quantities.
4. Applies discounts (item-level or order-level).
5. Processes payment (cash, card, QRIS).
6. System deducts stock directly from outlet warehouse.
7. Receipt generated.

### Key Characteristics

- Products are `STOCK` kind with direct inventory.
- No floor layout or table management.
- Simple cart-based flow.
- Stock deduction: 1:1 product-to-inventory.

## Mode B: F&B/Restaurant

### Workflow

1. Staff selects outlet, sees floor layout.
2. Assigns customers to table/zone.
3. Takes order on tablet/POS (RECIPE and STOCK kind items).
4. Order sent to kitchen display system (KDS).
5. Kitchen prepares items, marks as ready.
6. Staff serves items, updates table status.
7. Customer requests bill, optional split.
8. Payment processed, stock deducted via recipe explosion.
9. Table released.

### Key Characteristics

- Products primarily `RECIPE` kind with ingredient-level deduction.
- Floor layout: zones, tables, seats (see [floor-layout-designer-prd.md](fnb/floor-layout-designer-prd.md)).
- Real-time table status tracking.
- Kitchen ticket display routing.
- Split billing and gratuity support.

## Warehouse as Outlet

POS outlets are warehouses with `is_pos_outlet = true`. This reuses existing warehouse infrastructure without creating a new entity.

See [warehouse-outlet-rbac.md](shared/warehouse-outlet-rbac.md) for full details.

### Navigation Context

| Module | Label | Same Entity |
|---|---|---|
| Inventory → Warehouses | "Warehouses" | `warehouses` table |
| POS → Outlets | "Outlets" | `warehouses` table where `is_pos_outlet=true` |

Both views show the same data, filtered differently based on context. i18n translation keys:
- Inventory: `warehouse.title` → "Warehouses"
- POS: `posOutlet.title` → "Outlets"

## Stock Consumption Models

### Mode A: Direct Deduction (STOCK products)

```
Sale Item (qty=5, product_kind=STOCK)
  → StockMovement(OUT, product_id, warehouse_id, qty=5)
  → InventoryBatch balance reduced (FIFO, FOR UPDATE lock)
```

### Mode B: Recipe Explosion (RECIPE products)

```
Sale Item (qty=2, product_kind=RECIPE, recipe has 3 ingredients)
  → For each recipe_item:
      consumed_qty = recipe_item.quantity * 2 (sale qty)
      → StockMovement(OUT, ingredient_product_id, warehouse_id, consumed_qty)
      → InventoryBatch balance reduced per ingredient (FIFO, FOR UPDATE lock)
  → If ANY ingredient insufficient → rollback entire sale item
```

### Mode A/B: SERVICE

```
Sale Item (qty=1, product_kind=SERVICE)
  → No stock movement
  → Revenue recorded only
```

## Permission and Scope

POS adds a `WAREHOUSE` scope that limits users to specific outlets:

| Scope | Access |
|---|---|
| `WAREHOUSE` | Only assigned outlets (via `user_warehouses` table) |
| `DIVISION` | All outlets in user's division |
| `AREA` | All outlets in user's area/geographic scope |
| `ALL` | All outlets (admin/manager) |

See [warehouse-outlet-rbac.md](shared/warehouse-outlet-rbac.md) for implementation details.

### POS Permissions

| Permission | Description |
|---|---|
| `pos.outlet.read` | View outlet list and details |
| `pos.outlet.manage` | Manage outlet settings |
| `pos.order.create` | Create POS orders |
| `pos.order.read` | View POS orders |
| `pos.recipe.read` | View recipe details |
| `pos.recipe.manage` | Edit recipes |
| `pos.floor.read` | View floor layouts |
| `pos.floor.manage` | Edit floor layouts |

## Technical Decisions

- **Single backend, dual frontend mode**: Reduces code duplication. Mode selection at UI level based on outlet configuration.
- **Warehouse as outlet**: Leverage existing warehouse infra, inventory, stock movements. No new entity.
- **Recipe explosion at sale time**: Real-time ingredient deduction prevents overselling.
- **FIFO batch consumption**: InventoryBatch consumed oldest-first with row-level locking.
- **ScopeWarehouse**: New scope level for fine-grained outlet access control.

## Navigation and UX

### Sidebar Navigation (i18n-driven)

POS sidebar uses contextual labels:

```
POS
├── Dashboard (pos.dashboard)
├── Outlets (pos.outlets)           // Filtered warehouses
├── Menu Catalog (pos.menuCatalog)  // Product catalog for POS
├── Floor Layouts (pos.floorLayouts)
├── Live Orders (pos.liveOrders)
├── Reports (pos.reports)
└── Settings (pos.settings)
```

### Mode Detection

The frontend determines mode based on outlet configuration:
- If outlet has floor layouts → Show F&B mode UI
- If outlet has no floor layouts → Show Goods mode UI
- Users can be assigned to outlets of different types

## Notes and Improvements

### Completed

- Floor layout designer with zones, tables, and seats.
- Product model with `product_kind` support.
- `product_recipe_items` table for recipe/BOM.

### Planned

- Kitchen Display System (KDS) for order routing.
- Real-time WebSocket for live order tracking.
- Split billing and gratuity calculation.
- Offline mode for intermittent connectivity.
- Multi-printer support (kitchen, bar, receipt).
- Shift management and cash drawer tracking.

### Known Limitations

- Recipe versioning not yet implemented (in-place update only).
- No recipe modifiers (extra/remove ingredients) yet.
- Multi-pricing (different prices per outlet) deferred.
