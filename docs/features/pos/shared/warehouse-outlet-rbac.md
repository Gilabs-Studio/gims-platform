# Warehouse as Outlet and WAREHOUSE RBAC Scope

> **Module:** POS -> Shared -> Warehouse / Outlet / RBAC
> **Sprint:** Draft Planning
> **Version:** 0.1.0
> **Status:** Draft
> **Last Updated:** April 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Design Decision](#design-decision)
3. [Warehouse Model Extension](#warehouse-model-extension)
4. [User-Warehouse Assignment](#user-warehouse-assignment)
5. [WAREHOUSE Scope](#warehouse-scope)
6. [Scope Resolution Flow](#scope-resolution-flow)
7. [Navigation Context](#navigation-context)
8. [API Reference](#api-reference)
9. [Frontend Integration](#frontend-integration)
10. [Business Rules](#business-rules)
11. [Technical Decisions](#technical-decisions)
12. [Notes and Improvements](#notes-and-improvements)

---

## Overview

POS outlets are **warehouses** with `is_pos_outlet = true`. This reuses the existing warehouse infrastructure (addresses, geographic scope, inventory batches, stock movements) without creating a duplicate "outlet" entity.

A new `WAREHOUSE` scope is added to the permission system, allowing users to be assigned to specific warehouses/outlets. This enables fine-grained access control for POS operations.

## Design Decision

### Why Warehouse = Outlet?

| Alternative | Pros | Cons |
|---|---|---|
| **New `outlets` table** | Clean separation | Duplicates warehouse fields, double-maintenance, breaks inventory integration |
| **Warehouse with `is_pos_outlet` flag** | Reuses infra, inventory, stock, geographic scope | Shared table (minor namespace concern) |

**Decision**: Use warehouse with `is_pos_outlet` flag. The benefits of reusing inventory infrastructure far outweigh the minor naming concern, which is handled via i18n navigation labels.

## Warehouse Model Extension

### New Field

| Field | Type | Default | Index | Description |
|---|---|---|---|---|
| `is_pos_outlet` | `bool` | `false` | Yes | Marks this warehouse as a POS outlet |

### GORM Model Addition

```go
// In warehouse model
IsPosOutlet bool `gorm:"column:is_pos_outlet;default:false;index" json:"is_pos_outlet"`
```

### Migration

Auto-migrated via GORM. Default `false` ensures backward compatibility — existing warehouses are not affected.

## User-Warehouse Assignment

### `user_warehouses` Junction Table (NEW)

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `user_id` | UUID | No | FK to users |
| `warehouse_id` | UUID | No | FK to warehouses |
| `created_at` | timestamptz | No | — |
| `updated_at` | timestamptz | No | — |
| `deleted_at` | timestamptz | Yes | Soft delete |

### Indexes

| Index | Columns | Type |
|---|---|---|
| Unique | `user_id, warehouse_id` | Prevent duplicate assignments |
| FK | `user_id` | B-tree |
| FK | `warehouse_id` | B-tree |

### Relations

```
users (1) ─── (N) user_warehouses (N) ─── (1) warehouses
```

### GORM Model

```go
package models

import "github.com/gilabs/gims/api/internal/core/data/models"

type UserWarehouse struct {
    models.BaseModel
    UserID      string `gorm:"column:user_id;type:uuid;not null;uniqueIndex:idx_user_warehouse" json:"user_id"`
    WarehouseID string `gorm:"column:warehouse_id;type:uuid;not null;uniqueIndex:idx_user_warehouse" json:"warehouse_id"`
}

func (UserWarehouse) TableName() string {
    return "user_warehouses"
}
```

## WAREHOUSE Scope

### New Scope Constant

```go
// In role_permission.go
const ScopeWarehouse = "WAREHOUSE"
```

### Scope Hierarchy

| Scope | Resolves To | Use Case |
|---|---|---|
| `OWN` | User's own records | Personal data |
| `WAREHOUSE` | Records in user's assigned warehouses | **POS outlet operations** |
| `DIVISION` | Records in user's division | Departmental access |
| `AREA` | Records in user's geographic areas | Regional access |
| `ALL` | All records | Admin/manager |

### Scope Precedence

`OWN < WAREHOUSE < DIVISION < AREA < ALL`

Higher scopes include lower scopes. A user with `AREA` scope can access all warehouses in their area.

## Scope Resolution Flow

### ScopeMiddleware Extension

```go
// Current ScopeContext (existing fields)
type ScopeContext struct {
    UserID      string
    EmployeeID  string
    DivisionID  string
    AreaIDs     []string
    // NEW
    WarehouseIDs []string  // From user_warehouses
}
```

### Resolution Process

```
1. Extract user from JWT
2. Resolve EmployeeID from UserID
3. Resolve DivisionID from Employee
4. Resolve AreaIDs from Division/Geographic
5. NEW: Resolve WarehouseIDs from user_warehouses WHERE user_id = X
6. Store in context
```

### Query Filtering by Scope

```go
func ApplyWarehouseScope(db *gorm.DB, scope ScopeContext, scopeLevel string) *gorm.DB {
    switch scopeLevel {
    case ScopeWarehouse:
        return db.Where("warehouse_id IN ?", scope.WarehouseIDs)
    case ScopeDivision:
        return db.Where("warehouse_id IN (SELECT id FROM warehouses WHERE division_id = ?)", scope.DivisionID)
    case ScopeArea:
        return db.Where("warehouse_id IN (SELECT id FROM warehouses WHERE area_id IN ?)", scope.AreaIDs)
    case ScopeAll:
        return db // No filter
    default:
        return db.Where("1 = 0") // Deny by default
    }
}
```

## Navigation Context

### i18n-Driven Labels

The same `warehouses` table is displayed differently based on navigation context:

| Context | Sidebar Label | i18n Key | Filter |
|---|---|---|---|
| Inventory | "Warehouses" | `warehouse.title` | All warehouses |
| POS | "Outlets" | `posOutlet.title` | `is_pos_outlet = true` |

### Frontend Implementation

```tsx
// Inventory navigation
<NavItem href="/warehouses" label={t("warehouse.title")} />

// POS navigation
<NavItem href="/pos/outlets" label={t("posOutlet.title")} />
```

Both lead to similar UIs but with different filters and available actions.

## API Reference

### Warehouse Endpoints (Updated)

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/warehouse/warehouses` | warehouse.read | List all warehouses |
| GET | `/warehouse/warehouses?is_pos_outlet=true` | warehouse.read | List POS outlets |
| POST | `/warehouse/warehouses` | warehouse.create | Create warehouse (with is_pos_outlet) |
| PUT | `/warehouse/warehouses/:id` | warehouse.update | Update (can toggle is_pos_outlet) |

### POS Outlet Endpoints

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/pos/outlets` | pos.outlet.read | List outlets assigned to current user |
| GET | `/pos/outlets/:id` | pos.outlet.read | Get outlet detail |

### User-Warehouse Assignment

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/user/users/:id/warehouses` | user.read | Get user's assigned warehouses |
| PUT | `/user/users/:id/warehouses` | user.update | Set user's warehouse assignments |

## Frontend Integration

### Components

| Component | Purpose |
|---|---|
| OutletSelector | POS: dropdown to select active outlet at session start |
| WarehouseOutletToggle | Admin: toggle `is_pos_outlet` in warehouse edit form |
| UserWarehouseAssignment | Admin: assign warehouses to users |
| OutletList | POS: list of user's accessible outlets |

### User Assignment UI

In the user management form, add a multi-select for warehouse assignment:

```tsx
<FormField label={t("user.assignedWarehouses")}>
  <MultiSelect
    options={warehouses.map(w => ({ value: w.id, label: w.name }))}
    value={selectedWarehouseIds}
    onChange={setSelectedWarehouseIds}
  />
</FormField>
```

## Business Rules

- `is_pos_outlet` defaults to `false` for new warehouses.
- Users with `WAREHOUSE` scope can only access their assigned outlets.
- A user can be assigned to multiple outlets.
- Removing a user's outlet assignment revokes their POS access to that outlet.
- POS session can only be opened at assigned outlets (or with higher scope).
- Stock operations (movements, batches) use the same warehouse_id for outlets.
- Inventory reports work the same whether warehouse is an outlet or not.

## Technical Decisions

- **Flag on warehouse vs separate table**: Flag is simpler, reuses all warehouse infrastructure.
- **Junction table for assignment**: Standard many-to-many pattern. Clean and queryable.
- **WAREHOUSE scope level**: Positioned between OWN and DIVISION in hierarchy.
- **Scope resolution at middleware level**: Consistent with existing scope resolution.
- **i18n for navigation labels**: Clean UX without backend changes.

## Notes and Improvements

### Planned

- Outlet-specific settings (operating hours, tax rate, receipt template).
- Outlet transfer requests (move stock between outlets).
- Outlet performance dashboard.
- Outlet grouping (franchises, regions).
- Bulk user-outlet assignment.

### Known Limitations

- No outlet-specific product pricing (uses global selling_price).
- No outlet operating hours enforcement.
- No outlet-specific receipt templates.
- No outlet hierarchy (flat structure).
