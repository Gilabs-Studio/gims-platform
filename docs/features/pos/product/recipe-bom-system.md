# Recipe / BOM System

> **Module:** POS -> Product -> Recipe / BOM
> **Sprint:** Draft Planning
> **Version:** 0.1.0
> **Status:** Draft
> **Last Updated:** April 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Terminology](#terminology)
3. [Data Model](#data-model)
4. [Recipe Management](#recipe-management)
5. [Cost Calculation](#cost-calculation)
6. [Validation Rules](#validation-rules)
7. [Stock Consumption via Recipe](#stock-consumption-via-recipe)
8. [API Reference](#api-reference)
9. [Frontend Components](#frontend-components)
10. [Business Rules](#business-rules)
11. [Technical Decisions](#technical-decisions)
12. [Notes and Improvements](#notes-and-improvements)

---

## Overview

The Recipe/BOM (Bill of Materials) system allows RECIPE-kind products to define their composition in terms of STOCK-kind ingredient products. When a RECIPE product is sold, the system "explodes" the recipe into individual ingredient stock movements, deducting each ingredient from the outlet warehouse.

This system is **not** a separate module. Recipes live in the Product module via the existing `product_recipe_items` table.

## Terminology

| Term | Definition |
|---|---|
| Recipe Product | A product with `product_kind = 'RECIPE'` that has recipe items. |
| Ingredient Product | A product with `product_kind = 'STOCK'` and `is_ingredient = true`. |
| Recipe Item | A line in `product_recipe_items` linking a recipe to an ingredient with quantity. |
| Recipe Cost | Computed total: `SUM(ingredient.cost_price * recipe_item.quantity)`. |
| Recipe Explosion | The process of converting a recipe sale into per-ingredient stock movements. |
| BOM | Bill of Materials — synonym for recipe in manufacturing context. |

## Data Model

### `product_recipe_items` Table (Existing)

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `product_id` | UUID | No | FK to parent recipe product |
| `ingredient_product_id` | UUID | No | FK to ingredient product |
| `quantity` | decimal(15,4) | No | Consumption per unit of parent |
| `uom_id` | UUID | Yes | Unit of measure for quantity |
| `notes` | text | Yes | Optional notes |
| `sort_order` | int | No | Display ordering |
| `created_at` | timestamptz | No | — |
| `updated_at` | timestamptz | No | — |
| `deleted_at` | timestamptz | Yes | Soft delete |

### Indexes

| Index | Columns | Type |
|---|---|---|
| FK index | `product_id` | B-tree |
| FK index | `ingredient_product_id` | B-tree |
| Unique | `product_id, ingredient_product_id` | B-tree (prevent duplicates) |

### Relationships

```
products (parent, product_kind=RECIPE)
    └── product_recipe_items (1:N)
           └── products (ingredient, product_kind=STOCK, is_ingredient=true)
           └── uoms (optional unit)
```

## Recipe Management

### Create/Update Recipe

Recipe items are managed as a **bulk replace** operation. Sending a PUT replaces all existing recipe items for the product.

```json
PUT /product/products/:id/recipe

{
  "recipe_items": [
    {
      "ingredient_product_id": "uuid-rice",
      "quantity": 0.15,
      "uom_id": "uuid-kg",
      "notes": "Steamed rice",
      "sort_order": 1
    },
    {
      "ingredient_product_id": "uuid-egg",
      "quantity": 2.0,
      "uom_id": null,
      "notes": "Fried eggs",
      "sort_order": 2
    },
    {
      "ingredient_product_id": "uuid-oil",
      "quantity": 0.02,
      "uom_id": "uuid-liter",
      "notes": "",
      "sort_order": 3
    }
  ]
}
```

### Get Recipe with Cost

```json
GET /product/products/:id/recipe

{
  "success": true,
  "data": {
    "product_id": "uuid-nasi-goreng",
    "product_name": "Nasi Goreng Special",
    "recipe_cost": 18500.00,
    "recipe_items": [
      {
        "id": "uuid-item-1",
        "ingredient": {
          "id": "uuid-rice",
          "code": "ING-RICE-1KG",
          "name": "Beras Premium 1kg",
          "cost_price": 12000.00,
          "uom": { "id": "uuid-kg", "name": "Kilogram", "code": "kg" }
        },
        "quantity": 0.15,
        "uom": { "id": "uuid-kg", "name": "Kilogram", "code": "kg" },
        "cost_contribution": 1800.00,
        "notes": "Steamed rice",
        "sort_order": 1
      }
    ]
  }
}
```

## Cost Calculation

### Formula

```
recipe_cost = SUM(
  ingredient_product.cost_price * recipe_item.quantity
) FOR each recipe_item

margin = selling_price - recipe_cost
margin_percent = (margin / selling_price) * 100
```

### Cost Update Triggers

Recipe cost changes automatically when:
- Ingredient `cost_price` is updated (new purchase batch).
- Recipe items are added, removed, or quantity changed.

### Implementation

Cost is **computed live** on every request. Not stored in a column.

```go
func CalculateRecipeCost(recipeItems []RecipeItemWithIngredient) decimal.Decimal {
    total := decimal.Zero
    for _, item := range recipeItems {
        contribution := item.Ingredient.CostPrice.Mul(item.Quantity)
        total = total.Add(contribution)
    }
    return total
}
```

## Validation Rules

### Recipe Item Validation

| Rule | Description |
|---|---|
| Ingredient must exist | `ingredient_product_id` must reference a valid product |
| Ingredient must be STOCK | `ingredient.product_kind` must be `STOCK` |
| Ingredient must be flagged | `ingredient.is_ingredient` must be `true` |
| Quantity must be positive | `quantity > 0` |
| No self-reference | `ingredient_product_id != product_id` |
| No duplicate ingredients | Same ingredient cannot appear twice in one recipe |
| No circular dependency | RECIPE cannot reference another RECIPE |

### Product-Level Validation

| Rule | Description |
|---|---|
| Only RECIPE kind | Only products with `product_kind = 'RECIPE'` can have recipe items |
| At least one item | RECIPE must have >= 1 recipe item before being sold |
| STOCK/SERVICE must not have items | Reject recipe items for non-RECIPE products |

## Stock Consumption via Recipe

### Recipe Explosion Process

```
Input: sale_qty (number of RECIPE products sold), outlet_warehouse_id

For each recipe_item in product.recipe_items:
    consumed_qty = recipe_item.quantity * sale_qty
    
    SELECT inventory_batches
      WHERE product_id = recipe_item.ingredient_product_id
        AND warehouse_id = outlet_warehouse_id
        AND quantity > 0
      ORDER BY created_at ASC  -- FIFO
      FOR UPDATE               -- Row lock
    
    Deduct consumed_qty across batches (oldest first)
    
    INSERT stock_movement (
        type = 'OUT',
        product_id = recipe_item.ingredient_product_id,
        warehouse_id = outlet_warehouse_id,
        quantity = consumed_qty,
        reference_type = 'POS_SALE',
        reference_id = order_id
    )

IF ANY ingredient has insufficient stock:
    ROLLBACK entire transaction
    RETURN error: INSUFFICIENT_INGREDIENT_STOCK
```

### Availability Check (Pre-sale)

```
For each recipe_item:
    ingredient_balance = SUM(inventory_batches.quantity)
        WHERE product_id = recipe_item.ingredient_product_id
          AND warehouse_id = outlet_warehouse_id

    max_servings_for_ingredient = FLOOR(ingredient_balance / recipe_item.quantity)

max_servings = MIN(max_servings_for_ingredient) across all items
limited_by = ingredient with lowest max_servings
is_available = max_servings > 0
```

## API Reference

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/product/products/:id/recipe` | product.read | Get recipe items with cost |
| PUT | `/product/products/:id/recipe` | product.update | Bulk replace recipe items |

### Error Codes

| Code | Description |
|---|---|
| `PRODUCT_NOT_FOUND` | Product ID does not exist |
| `INVALID_PRODUCT_KIND` | Product is not RECIPE kind |
| `INGREDIENT_NOT_FOUND` | Ingredient product ID does not exist |
| `INVALID_INGREDIENT` | Product is not a valid ingredient (not STOCK or not flagged) |
| `DUPLICATE_INGREDIENT` | Same ingredient listed twice |
| `CIRCULAR_DEPENDENCY` | Ingredient references itself or another RECIPE |
| `INSUFFICIENT_INGREDIENT_STOCK` | Not enough stock during sale |

## Frontend Components

| Component | File | Purpose |
|---|---|---|
| RecipeTab | `recipe-tab.tsx` | Tab panel containing recipe editor (shown when product_kind=RECIPE) |
| RecipeItemTable | `recipe-item-table.tsx` | Editable table of recipe lines |
| RecipeItemRow | `recipe-item-row.tsx` | Single row: ingredient picker, qty, UOM, cost |
| IngredientProductPicker | `ingredient-product-picker.tsx` | Product combobox filtered by `is_ingredient=true` |
| RecipeCostPreview | `recipe-cost-preview.tsx` | Live cost total + margin display |
| AddRecipeItemButton | — | Button to add new empty row |

### Recipe Tab Visibility

```tsx
// Only show recipe tab when product_kind is RECIPE
{productKind === "RECIPE" && (
  <TabsContent value="recipe">
    <RecipeTab productId={productId} />
  </TabsContent>
)}
```

## Business Rules

- Only RECIPE products can have recipe items.
- Recipe items can only reference STOCK + is_ingredient products.
- Recipe cost is always computed live (never stored).
- Bulk replace: sending PUT replaces all recipe items (delete + insert in transaction).
- Recipe must have at least one item before the product can be sold in POS.
- Maximum 50 recipe items per product (prevent abuse).
- Quantity precision up to 4 decimal places.
- Ingredient UOM can differ from ingredient base UOM (UI shows both).

## Technical Decisions

- **Bulk replace instead of incremental CRUD**: Simpler UI and API. No partial state. Atomic operation.
- **Live cost calculation**: No stale data. Trade-off: slightly more expensive query per request.
- **Existing table reused**: `product_recipe_items` already exists with correct schema. No migration needed.
- **FIFO batch consumption**: Industry standard for inventory. Oldest stock used first.
- **Row-level locking**: `FOR UPDATE` on inventory batches prevents race conditions during concurrent sales.
- **No recipe versioning (yet)**: In-place updates. Snapshots planned for future cost auditing.

## Notes and Improvements

### Planned

- Recipe versioning/snapshots for cost history auditing.
- Recipe modifiers (optional/substitutable ingredients).
- Recipe templates (copy recipe from existing product).
- Sub-recipe support (RECIPE referencing another RECIPE as ingredient).
- Waste tracking (actual vs expected consumption).
- Recipe costing report (margin analysis across menu).

### Known Limitations

- No recipe versioning (in-place update only).
- No modifier/optional ingredients.
- No sub-recipe support (flat BOM only).
- No UOM conversion between recipe UOM and ingredient base UOM.
