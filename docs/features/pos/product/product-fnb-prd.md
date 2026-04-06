# POS Product F&B and Goods Extension

> **Module:** POS -> Shared Modules -> Master Data -> Product
> **Sprint:** Draft Planning
> **Version:** 0.2.0
> **Status:** Draft
> **Last Updated:** April 2026

---

## Table of Contents

1. [Overview](#overview)
2. [What Needs to Change](#what-needs-to-change)
3. [Scope](#scope)
4. [Product Kind Behavior](#product-kind-behavior)
5. [Recipe / BOM System](#recipe--bom-system)
6. [Ingredient Handling](#ingredient-handling)
7. [Data Model Changes](#data-model-changes)
8. [Data Ownership and Integration](#data-ownership-and-integration)
9. [POS Stock Consumption Flow](#pos-stock-consumption-flow)
10. [Business Rules](#business-rules)
11. [API Reference](#api-reference)
12. [Frontend Components](#frontend-components)
13. [Technical Decisions](#technical-decisions)
14. [Notes and Open Questions](#notes-and-open-questions)
15. [Related Links](#related-links)

---

## Overview

Master Data Product remains the single source of orderable items for POS. The change is not a separate stock menu or ingredient module. Instead, the Product module supports three product kinds — `STOCK`, `RECIPE`, and `SERVICE` — where `RECIPE` products carry recipe detail (BOM) that drives ingredient-level inventory deduction and can inform purchase planning.

This keeps the catalog reusable for both distributor (goods) and F&B (restaurant/cafe) workflows while allowing recipe-based menu behavior without creating a new product surface.

### Key Design Principle

- **One Product module** for all product kinds.
- **`product_kind`** is a system-level behavior enum (controls how the system treats the product).
- **`TypeID`** remains the user-configurable classification lookup (Medicine, Food, Beverage, etc.).
- These two fields serve different purposes and do not conflict.

## What Needs to Change

- Add a `product_kind` field with values: `STOCK` (default), `RECIPE`, `SERVICE`.
- Add `is_inventory_tracked` boolean (true for STOCK, false by default for RECIPE/SERVICE).
- Add `is_pos_available` boolean (controls POS catalog visibility).
- Allow `RECIPE` products to store recipe detail via `product_recipe_items` (existing table).
- Keep `STOCK` products unchanged so distributor workflows remain intact.
- Expose recipe lines that map ingredient products to quantities, UOMs, and auto-calculated cost.
- Let POS consume the same product master for live menu display and table/basket order entry.
- Provide purchase-planning visibility from F&B recipe consumption.

## Scope

### In Scope

- Product kind management (`STOCK`, `RECIPE`, `SERVICE`).
- F&B recipe detail on product records via `product_recipe_items`.
- Auto-cost calculation: `recipe_cost = SUM(ingredient.cost_price * quantity)`.
- Outlet-specific item visibility via `is_pos_available` flag.
- POS menu projection endpoint.
- Recipe-driven inventory deduction per outlet (warehouse).
- Purchase replenishment signals based on recipe consumption.

### Out of Scope

- A separate stock/ingredient module.
- Rewriting the existing stock module UI.
- Finance posting or billing logic.
- Customer and loyalty logic.
- Multi-pricing (POS vs distributor price lists) — future sprint.
- Recipe versioning/snapshots — future sprint.

## Product Kind Behavior

| Product Kind | Behavior | Inventory Impact | Selling Price | Example |
|---|---|---|---|---|
| `STOCK` | Standard sellable item for distributor/retail. Also used for raw ingredients when `is_ingredient=true`. | Direct stock tracking via `inventory_batches`. | Required for sellable items. Optional (0) for ingredients. | Paracetamol 500mg, Rice 25kg, Coffee Beans |
| `RECIPE` | Menu item composed of ingredient products via BOM. | No direct stock. Deducts ingredient stock per recipe when sold. | Required. | Nasi Goreng, Kopi Susu, Es Teh Manis |
| `SERVICE` | Non-physical service item. | No stock impact. Not inventory-tracked. | Required. | Delivery Fee, Service Charge |

### Product Kind vs Existing Fields

| Field | Purpose | Changed? |
|---|---|---|
| `product_kind` | **NEW** — System behavior discriminator (STOCK/RECIPE/SERVICE) | New field |
| `TypeID` → `product_types` | User-configurable classification (Medicine, Food, etc.) | Unchanged |
| `is_ingredient` | Convenience flag for filtering ingredients in recipe builder UI | Unchanged |
| `is_inventory_tracked` | **NEW** — Controls whether product has inventory batches | New field |
| `is_pos_available` | **NEW** — Controls POS catalog visibility | New field |

## Recipe / BOM System

### Recipe Detail Rules

- Recipe detail uses the existing `product_recipe_items` table.
- Only `RECIPE` kind products can have recipe items.
- Each recipe line maps to a `STOCK` kind ingredient product with `is_ingredient=true`.
- Recipe lines specify quantity consumed per one unit of the parent product sold.
- Cost auto-calculated: `recipe_cost = SUM(ingredient.cost_price * recipe_item.quantity)`.
- Recipe items can use a different UOM than the ingredient base UOM.

### Recipe Item Structure

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `product_id` | UUID | Parent recipe product |
| `ingredient_product_id` | UUID | Ingredient product (`product_kind=STOCK` + `is_ingredient=true`) |
| `quantity` | decimal(15,4) | Consumption quantity per unit sold |
| `uom_id` | UUID (nullable) | Unit of measure for consumed quantity |
| `notes` | text | Optional notes |
| `sort_order` | int | Display ordering |

See [recipe-bom-system.md](recipe-bom-system.md) for full Recipe/BOM documentation.

## Ingredient Handling

### Critical Rule: Ingredients Stay in the Product Module

Ingredients are regular `STOCK` products with `is_ingredient=true`. They are **not** a separate module.

| Attribute | Ingredient Product |
|---|---|
| `product_kind` | `STOCK` |
| `is_ingredient` | `true` |
| `is_inventory_tracked` | `true` |
| `selling_price` | Can be 0 |
| `is_pos_available` | Usually `false` |
| Stock tracking | Via `inventory_batches` per warehouse |

## Data Model Changes

### New Fields on `products` Table

| Field | Type | Default | Index | Description |
|---|---|---|---|---|
| `product_kind` | `varchar(20)` | `'STOCK'` | Yes | System behavior: STOCK, RECIPE, SERVICE |
| `is_inventory_tracked` | `bool` | `true` | — | Whether product has inventory batches |
| `is_pos_available` | `bool` | `false` | Yes | Visible in POS product catalog |

### Existing: `product_recipe_items` Table

Already implemented. No schema changes needed.

## Data Ownership and Integration

| Domain | Ownership | Notes |
|---|---|---|
| Product core | Master Data -> Product | Source of truth for SKU, category, product_kind, pricing, sellability. |
| F&B recipe detail | Product module (`product_recipe_items`) | Recipe lines for RECIPE products. |
| Inventory stock deduction | Stock | Owns balances and movements. Consumes recipe detail for ingredient-level deduction. |
| Warehouse / Outlet | Warehouse module | POS uses warehouses with `is_pos_outlet=true`. See [warehouse-outlet-rbac.md](../shared/warehouse-outlet-rbac.md). |
| Purchase planning | Purchase | Recipe consumption drives replenishment suggestions. |
| POS catalog projection | POS | Read-only, filtered by `is_pos_available=true`. |

## POS Stock Consumption Flow

```
POS Sale Confirmed
    |
    v
Check product_kind
    |
    +-- STOCK --> Direct deduction from warehouse
    |             StockMovement(OUT) + reduce InventoryBatch
    |
    +-- RECIPE --> Recipe explosion:
    |              For each recipe_item:
    |                consumed_qty = recipe_item.quantity * sale_quantity
    |                StockMovement(OUT) per ingredient from warehouse
    |                Reduce InventoryBatch (FIFO, FOR UPDATE locking)
    |              Insufficient stock on ANY ingredient --> rollback
    |
    +-- SERVICE --> No stock impact
```

## Business Rules

- Only active, approved products appear in the POS catalog.
- Product search is prefix-friendly for index usage.
- `RECIPE` products must have at least one recipe item before sale.
- Recipe items can only reference `STOCK` products with `is_ingredient=true`.
- Circular dependencies not allowed.
- `is_pos_available` controls POS visibility independently of `product_kind`.
- Insufficient ingredient stock in target warehouse rejects the entire sale.
- `product_kind` defaults to `STOCK` for backward compatibility.
- `RECIPE` products display computed `recipe_cost` in detail.

## API Reference

### Existing Endpoints (Updated)

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| POST | `/product/products` | product.create | Create a product. Accepts `product_kind`, `is_inventory_tracked`, `is_pos_available`, optional `recipe_items[]`. |
| GET | `/product/products` | product.read | List products. Supports `product_kind` and `is_pos_available` filters. |
| GET | `/product/products/:id` | product.read | Get detail. Includes `recipe_items` for RECIPE and computed `recipe_cost`. |
| PUT | `/product/products/:id` | product.update | Update product including kind, flags, and recipe items. |
| DELETE | `/product/products/:id` | product.delete | Delete product. |

### New Endpoints

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/product/products/:id/recipe` | product.read | Get recipe items with ingredient details and computed cost. |
| PUT | `/product/products/:id/recipe` | product.update | Bulk update recipe items (replaces existing). |

### POS Projection

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/pos/outlets/{outletId}/product-catalog` | pos.order.read | Outlet-specific orderable catalog. |

## Frontend Components

| Component | Purpose |
|---|---|
| ProductKindSelector | Radio/tab selector for STOCK / RECIPE / SERVICE. |
| RecipeTab | Conditional tab for RECIPE kind. |
| RecipeItemTable | Editable ingredient rows with qty, UOM, cost preview. |
| IngredientProductPicker | Product selector filtered by `is_ingredient=true`. |
| RecipeCostPreview | Real-time `SUM(ingredient.cost_price * qty)` display. |
| ProductCatalogPicker | POS order drawer menu picker. |

## Technical Decisions

- **`product_kind` separate from `TypeID`**: System behavior vs user taxonomy. Avoids collision with `product_types` table. SaaS scalable.
- **Keep `is_ingredient` flag**: Fast indexed filtering for recipe builder. An ingredient is `product_kind=STOCK` + `is_ingredient=true`.
- **Auto-cost not stored**: Computed live from ingredient costs. No stale data.
- **Recipe uses existing `product_recipe_items`**: No migration for recipe structure.
- **Stock deduction via recipe explosion**: Per-ingredient StockMovement(OUT) with row-level locking.
- **Warehouse as outlet**: POS scoped to `is_pos_outlet=true` warehouses.

## Notes and Open Questions

- **Recipe versioning**: Update in-place for now; add snapshots in future sprint for cost auditing.
- **Recipe modifiers**: Optional/modifier ingredients (extra cheese, no onion) deferred to future sprint.
- **Stock consumption timing**: Deduct on order confirmation (before payment) to prevent overselling.
- **Multi-pricing**: Use existing `selling_price` for now; add price list feature later.

## Related Links

- [recipe-bom-system.md](recipe-bom-system.md) — Full Recipe/BOM system documentation.
- [../shared/warehouse-outlet-rbac.md](../shared/warehouse-outlet-rbac.md) — Warehouse as Outlet and WAREHOUSE scope.
- [../pos-dual-mode-architecture.md](../pos-dual-mode-architecture.md) — Dual-mode POS architecture.
- [../sales/sales-pos-prd.md](../sales/sales-pos-prd.md) — Goods/distributor POS sales branch.
