# POS Product F&B and Goods Extension

> **Module:** POS -> Shared Modules -> Master Data -> Product
> **Sprint:** Draft Planning
> **Version:** 0.1.0
> **Status:** Draft
> **Last Updated:** April 2026

---

## Table of Contents

1. [Overview](#overview)
2. [What Needs to Change](#what-needs-to-change)
3. [Scope](#scope)
4. [Product Type Behavior](#product-type-behavior)
5. [Data Ownership and Integration](#data-ownership-and-integration)
6. [Business Rules](#business-rules)
7. [API Reference](#api-reference)
8. [Frontend Components](#frontend-components)
9. [Technical Decisions](#technical-decisions)
10. [Notes and Open Questions](#notes-and-open-questions)
11. [Related Links](#related-links)

---

## Overview

Master Data Product remains the source of orderable items for POS. The change needed here is not a separate stock menu. Instead, the Product module must support two product kinds, goods and F&B, where F&B products carry recipe detail that drives inventory stock deduction and can inform purchase planning. The existing Inventory Stock feature can expose a recipe-stock tab or filter for the ingredient view.

This keeps the catalog reusable while allowing restaurant menu behavior without creating a new stock menu surface.

## What Needs to Change

- Add a product kind field with at least `GOODS` and `FNB` values.
- Allow F&B products to store recipe detail in the product record or its detail section.
- Keep goods products unchanged so distributor workflows remain intact.
- Expose recipe lines that map to stock items, quantities, units, and waste factors.
- Let POS consume the same product master for live menu display and table order entry.
- Provide purchase-planning visibility from F&B recipe consumption without creating a separate ingredient inventory menu.

## Scope

### In Scope

- Product kind management.
- F&B recipe detail on product records.
- Outlet-specific item visibility and display ordering.
- POS menu projection.
- Recipe-driven inventory deduction.
- Purchase replenishment signals based on recipe consumption.

### Out of Scope

- A separate stock menu.
- Rewriting the existing stock module UI.
- Finance posting or billing logic.
- Customer and loyalty logic.

## Product Type Behavior

| Product Kind | Behavior | Inventory Impact |
|---|---|---|
| GOODS | Standard sellable item for distributor or retail flows. | No recipe deduction. |
| FNB | Menu item that includes a recipe detail. | Deduct inventory stock based on the recipe snapshot when sold. |

### Recipe Detail Rules

- Recipe detail belongs to the product because it is an attribute of how the product is sold.
- The recipe is a configuration extension, not a separate menu.
- Each recipe line should map to a stock item or inventory code and a consumption quantity.
- The recipe snapshot used for a sale should be versioned so later edits do not rewrite historical transactions.
- Recipe consumption can be aggregated for purchase planning and supplier replenishment.

## Data Ownership and Integration

| Domain | Ownership | Notes |
|---|---|---|
| Product core | Master Data -> Product | Source of truth for SKU, category, brand, segment, type, UOM, pricing, and sellability. |
| F&B recipe detail | Product module extension | Stores recipe lines for F&B products without creating a separate ingredient inventory menu; the existing inventory feature can surface recipe stock as a tab/filter. |
| Inventory stock deduction | Stock | Stock module owns balances and movements; it consumes the recipe snapshot. |
| Purchase planning | Purchase | Recipe consumption can drive replenishment suggestions and supplier invoice flows. |
| POS catalog projection | POS | Read-only overlay used by live table maps and order drawers. |

### Integration Boundary

- POS must read products from the Product module and should not mutate master data from the live table screen.
- A POS catalog projection can be cached because the master product source remains authoritative.
- Goods products should remain sellable even when they have no recipe detail.
- F&B sale finalization should trigger stock deduction through the existing inventory flow.
- Purchase planning can use recipe consumption history, but purchase approval and supplier invoice flow remain owned by the Purchase module.

## Business Rules

- Only active and approved products should appear in the POS catalog.
- Product search should be prefix-friendly so the catalog remains indexable.
- The same product can have different display labels or visibility per outlet.
- F&B products should show recipe status in the detail panel so staff know whether stock deduction will occur.
- Goods products should not be forced to carry a recipe.
- When an F&B product is sold, inventory stock must be reduced using the recipe snapshot attached to that product version.

## API Reference

The Product module already exposes the following routes under `/product`.

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| POST | `/product/products` | product.create | Create a product. |
| GET | `/product/products` | product.read | List products. |
| GET | `/product/products/:id` | product.read | Get product detail. |
| PUT | `/product/products/:id` | product.update | Update a product, including type and recipe detail. |
| DELETE | `/product/products/:id` | product.delete | Delete a product. |
| POST | `/product/products/:id/submit` | product.update | Submit product for approval. |
| POST | `/product/products/:id/approve` | product.approve | Approve product. |

### POS Projection Endpoint

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/pos/outlets/{outletId}/product-catalog` | pos.table.manage | Get the outlet-specific orderable catalog projection for POS. |

## Frontend Components

| Component | Purpose |
|---|---|
| ProductTypeSwitcher | Lets staff mark the product as goods or F&B. |
| RecipeEditorPanel | Edits the recipe detail for F&B products. |
| RecipeLineTable | Shows ingredient rows and quantities for the recipe. |
| StockImpactPreview | Shows how the recipe affects inventory stock when sold. |
| ProductCatalogPicker | Searchable menu picker used in the POS order drawer. |
| CatalogSyncStatus | Shows whether POS catalog data is fresh or stale. |

## Technical Decisions

- **Keep Product master unchanged for goods flows**: The goods side should continue working without recipe overhead.
- **Store recipe detail on the product**: This keeps menu behavior and inventory impact in one place instead of splitting into a separate ingredient inventory menu.
- **Use recipe snapshots for sales**: Historical transactions must not change when recipes are edited later.
- **Let stock own the actual deduction**: Product describes the recipe; Stock applies the movement.
- **Feed purchase planning from recipe consumption**: The same recipe data can drive replenishment without changing the purchase module ownership model.

## Notes and Open Questions

- Should recipe detail be editable only on approved products, or also in draft state?
- Should F&B product recipes support modifiers and optional ingredients in the first version?
- Should purchase planning use live consumption, daily summaries, or both?

## Related Links

- [../../purchase/supplier-invoice-refactor.md](../../purchase/supplier-invoice-refactor.md) for the purchase flow that can consume recipe-driven replenishment signals.
