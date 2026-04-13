# POS Menu and Inventory Integration

> **Module:** POS -> Menu and Inventory
> **Sprint:** Draft Planning
> **Version:** 0.2.0
> **Status:** Draft
> **Last Updated:** April 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Menu Catalog Projection](#menu-catalog-projection)
3. [Inventory Integration](#inventory-integration)
4. [Stock Availability Display](#stock-availability-display)
5. [Recipe Cost Tracking](#recipe-cost-tracking)
6. [Low Stock Alerts](#low-stock-alerts)
7. [Purchase Replenishment](#purchase-replenishment)
8. [API Reference](#api-reference)
9. [Frontend Components](#frontend-components)
10. [Business Rules](#business-rules)
11. [Technical Decisions](#technical-decisions)
12. [Notes and Improvements](#notes-and-improvements)

---

## Overview

POS Menu and Inventory integration bridges the Product catalog and Stock module for live POS operations. The POS reads from Product Master (including recipe detail) and writes to Stock (via inventory deduction). This document covers how menu items are projected to the POS UI, how stock availability is checked, and how consumption drives replenishment.

### Key Principle

> POS does **not** own products or inventory. It reads the catalog, checks availability, and triggers stock deduction through the Stock module.

## Menu Catalog Projection

The POS catalog is a **read-only projection** of the Product Master, filtered for POS relevance.

### Catalog Filter Criteria

| Filter | Condition | Purpose |
|---|---|---|
| `is_pos_available` | `= true` | Product marked for POS display |
| `is_active` | `= true` | Product is active |
| `is_approved` | `= true` | Product approved by admin |
| `status` | `= 'APPROVED'` | Product approval status |
| `product_kind` | Any (STOCK, RECIPE, SERVICE) | All kinds can appear in POS |

### Catalog Response Structure

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "code": "NGR-001",
      "name": "Nasi Goreng Special",
      "product_kind": "RECIPE",
      "category": { "id": "uuid", "name": "Main Course" },
      "selling_price": 35000,
      "recipe_cost": 18500,
      "image_url": "/uploads/nasi-goreng.webp",
      "is_available": true,
      "stock_info": {
        "type": "recipe",
        "max_servings": 42,
        "limited_by": "Rice 1kg"
      }
    },
    {
      "id": "uuid",
      "code": "PCM-500",
      "name": "Paracetamol 500mg",
      "product_kind": "STOCK",
      "category": { "id": "uuid", "name": "Medicine" },
      "selling_price": 5000,
      "image_url": null,
      "is_available": true,
      "stock_info": {
        "type": "direct",
        "available_qty": 250,
        "uom": "tablet"
      }
    }
  ]
}
```

### Catalog Fields by Product Kind

| Field | STOCK | RECIPE | SERVICE |
|---|---|---|---|
| `selling_price` | From product | From product | From product |
| `recipe_cost` | N/A | Computed from ingredients | N/A |
| `stock_info.type` | `"direct"` | `"recipe"` | `"unlimited"` |
| `stock_info.available_qty` | Warehouse balance | N/A | N/A |
| `stock_info.max_servings` | N/A | Min(ingredient_balance / recipe_qty) | N/A |
| `is_available` | balance > 0 | All ingredients available | Always true |

## Inventory Integration

### Stock Check per Product Kind

#### STOCK Products

```
available_qty = SUM(inventory_batches.quantity)
  WHERE product_id = X AND warehouse_id = outlet_warehouse_id
  AND quantity > 0
```

#### RECIPE Products

```
For each recipe_item in product.recipe_items:
  ingredient_balance = SUM(inventory_batches.quantity)
    WHERE product_id = recipe_item.ingredient_product_id
    AND warehouse_id = outlet_warehouse_id
  
  max_servings_for_ingredient = FLOOR(ingredient_balance / recipe_item.quantity)

max_servings = MIN(max_servings_for_ingredient across all ingredients)
is_available = max_servings > 0
limited_by = ingredient with lowest max_servings
```

#### SERVICE Products

```
is_available = true  (always)
stock_info = null     (no inventory)
```

### Stock Deduction

See [pos-live-operations-prd.md](pos-live-operations-prd.md#stock-deduction-flow) for detailed deduction flow.

## Stock Availability Display

### UI Indicators

| Indicator | Condition | Display |
|---|---|---|
| Available | Stock or servings > threshold | Normal display |
| Low Stock | Stock or servings <= threshold | Warning badge |
| Out of Stock | Stock = 0 or any ingredient = 0 | Greyed out, "Sold Out" |
| Unlimited | SERVICE product | No stock indicator |

### Threshold Configuration

```
Low stock threshold (per outlet):
  - STOCK: configurable qty (default: 10 units)
  - RECIPE: configurable servings (default: 5 servings)
```

## Recipe Cost Tracking

### Cost Calculation

```
recipe_cost = SUM(ingredient.cost_price * recipe_item.quantity)
  FOR each recipe_item in product.recipe_items
```

### Margin Display (Admin)

```
selling_price = 35,000
recipe_cost   = 18,500
margin        = 16,500 (47.1%)
```

### Cost Update Trigger

Recipe cost recalculates when:
- Ingredient `cost_price` changes (e.g., new purchase batch).
- Recipe items modified (add/remove/change quantity).

Cost is **computed live** (not stored) to avoid stale data.

## Low Stock Alerts

### Alert Triggers

| Trigger | Condition | Action |
|---|---|---|
| Ingredient below reorder point | `balance < reorder_point` | Dashboard notification |
| Recipe unavailable | Any ingredient balance = 0 | POS catalog: "Sold Out" |
| Post-sale deduction warning | Balance after sale < reorder point | Notification to manager |

### Alert Delivery

- POS dashboard: Real-time low stock widget.
- Manager notification: In-app notification.
- Future: Push notification / email.

## Purchase Replenishment

### Consumption-Based Replenishment Signal

```
For each ingredient consumed via recipe sales:
  daily_consumption = SUM(stock_movements.quantity)
    WHERE type = OUT AND created_at >= today
  
  days_of_stock = current_balance / avg_daily_consumption
  
  IF days_of_stock < reorder_days_threshold:
    → Signal: "Reorder {ingredient} for {outlet}"
```

### Purchase Integration

| Signal | Target Module | Action |
|---|---|---|
| Low ingredient stock | Purchase | Suggest Purchase Request |
| Consumption trend | Report | Weekly consumption report |
| Cost trend | Finance | Ingredient cost tracking |

## API Reference

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/pos/outlets/:id/product-catalog` | pos.order.read | Outlet catalog with availability |
| GET | `/pos/outlets/:id/stock-summary` | pos.outlet.read | Stock summary per outlet |
| GET | `/pos/outlets/:id/low-stock` | pos.outlet.read | Low stock alerts |
| GET | `/product/products/:id/recipe` | product.read | Recipe detail with cost |

## Frontend Components

| Component | Purpose |
|---|---|
| ProductCatalogGrid | Main POS product grid with categories |
| ProductCard | Product card with image, price, availability |
| StockBadge | Available / Low / Sold Out indicator |
| RecipeCostPreview | Cost and margin display (admin view) |
| LowStockWidget | Dashboard widget for low stock alerts |
| StockAvailabilityTooltip | Hover info showing ingredient availability |
| CategoryFilter | Filter catalog by product category |
| SearchBar | Prefix search for products |

## Business Rules

- Catalog only shows active, approved, POS-available products.
- Stock availability refreshed on catalog load and after each sale.
- "Sold Out" products are visible but not orderable.
- Recipe max_servings calculation must be real-time (no cache).
- Search uses prefix matching for index performance.
- Category filtering uses product category hierarchy.
- Image fallback to placeholder when no product image.

## Technical Decisions

- **Live recipe cost calculation**: No stored `recipe_cost` column. Computed on-demand from ingredient costs. Prevents stale data.
- **Max servings = MIN across ingredients**: Conservative approach ensures no overselling.
- **Stock check on catalog load + order confirm**: Dual check prevents race conditions.
- **Prefix search**: Uses `LIKE 'term%'` for GIN index performance instead of `%term%`.

## Notes and Improvements

### Planned

- Real-time stock update via WebSocket (no page refresh needed).
- Smart reorder suggestions based on consumption patterns (ML).
- Ingredient substitution when primary ingredient unavailable.
- Batch-aware stock display (show expiring batches first).
- Menu scheduling (time-based availability, e.g., breakfast menu).

### Known Limitations

- Stock availability calculated per request (no server-side cache).
- No ingredient substitution support.
- No time-based menu scheduling.
- Reorder suggestions are simple threshold-based (no ML).
