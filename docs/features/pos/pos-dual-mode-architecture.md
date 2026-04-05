# POS Dual-Mode Architecture Product Requirements Document

> **Module:** POS Platform
> **Sprint:** Draft Planning
> **Version:** 0.1.0
> **Status:** Draft
> **Last Updated:** April 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Why Dual Mode](#why-dual-mode)
3. [Mode Matrix](#mode-matrix)
4. [Shared POS Core](#shared-pos-core)
5. [Navigation Model](#navigation-model)
6. [F&B Mode](#fb-mode)
7. [Goods / Distributor Mode](#goods--distributor-mode)
8. [Permissions and Outlet Scope](#permissions-and-outlet-scope)
9. [Product Master Strategy](#product-master-strategy)
10. [ASCII Layouts](#ascii-layouts)
11. [Technical Decisions](#technical-decisions)
12. [Implementation Guidance](#implementation-guidance)

---

## Overview

POS should be treated as a platform with two logic flows, not one universal workflow:

- F&B mode for outlets that need table, room, reservation, and waiting-list behavior.
- Goods / distributor mode for outlets that sell products without table view.

The key rule is simple: **table view is optional and only appears in F&B mode**.

## Why Dual Mode

The current ERP and CRM foundation was built for distributor workflows. F&B adds spatial service behavior, but that should not force the same interaction model onto goods sales.

Dual mode keeps the platform flexible:

- F&B gets table maps, reservations, and layout design.
- Goods gets quick sale, basket, invoice, delivery, and returns without spatial overhead.
- Both modes still share the same customer, product, sales, finance, and stock backbone.

## Mode Matrix

| Mode | Primary Use Case | Needs Table View? | Core Screens |
|---|---|---|---|
| F&B | Restaurant, cafe, bar, lounge | Yes | Overview, Live Table Map, Reservation, Floor & Layout Designer |
| Goods / Distributor | Retail, wholesale, direct selling | No | Overview, Quick Sale, Basket, Delivery / Pickup, Returns / Exchange |

## Shared POS Core

The shared core should stay small and stable. Both modes reuse it.

| Core Capability | Shared? | Notes |
|---|---|---|
| Outlet scope | Yes | One company equals one outlet context in POS. |
| Product catalog | Yes | Master Data Product remains source of orderable items. |
| Cart / order draft | Yes | Same order object can be used in both modes. |
| Pricing / discount / tax | Yes | Calculated in shared commerce logic. |
| Invoice handoff | Yes | Sales owns billing and settlement. |
| Payment state | Yes | Payment flows through Sales / Finance boundary. |
| Customer lookup | Yes | Customer master is shared. |
| Inventory deduction | Yes | Stock is shared, but consumption rules vary by mode. |

## Navigation Model

POS navigation should branch by mode after outlet resolution.

```text
POS
├── Overview
├── Mode Switcher
├── F&B Mode
│   ├── Live Table Map
│   ├── Reservation
│   │   ├── Reservation List
│   │   └── Waiting List
│   └── Floor & Layout Designer
└── Goods / Distributor Mode
    ├── Quick Sale
    ├── Sales Basket
    ├── Delivery / Pickup
    └── Returns / Exchange
```

### Navigation Rules

- `Overview` is the common entry point for both modes.
- `Mode Switcher` is shown only when the user or outlet is allowed to access more than one mode.
- `F&B Mode` is the only mode that shows Live Table Map, Reservation, and Floor & Layout Designer.
- `Goods / Distributor Mode` must never require table view.
- The UI should never force users to pass through Live Table Map unless they are explicitly in F&B mode.

## F&B Mode

F&B mode is the spatial, table-based experience.

### Core Pages

- Overview
- Live Table Map
- Reservation List
- Waiting List
- Floor & Layout Designer

### Key Behaviors

- Table selection opens an order drawer in place.
- Waiting time drives service urgency.
- Reservation and queue flow are outlet-scoped.
- Layout design supports floor, room, cashier, table, and chair objects.

### Typical Flow

```text
Overview
  -> Live Table Map
  -> Table Selection
  -> Order Drawer
  -> Sales Invoice Handoff
```

## Goods / Distributor Mode

Goods mode is product-first and does not need spatial service primitives.

### Core Pages

- Overview
- Quick Sale
- Sales Basket
- Delivery / Pickup
- Returns / Exchange

### Key Behaviors

- Users search, scan, or pick products directly from the product master projection.
- Cart items are assembled without table, chair, or room context.
- The checkout flow can still hand off to Sales and Finance.
- Stock deduction happens from the sold product or its downstream recipe mapping, depending on business rules.

### Typical Flow

```text
Overview
  -> Quick Sale
  -> Product Search / Scan
  -> Basket
  -> Invoice / Payment
```

## Permissions and Outlet Scope

Outlet scope should be resolved by permission, not by a generic selector for every user.

| Permission / Scope | Behavior |
|---|---|
| `OWN` | User is auto-bound to one outlet. No outlet picker is needed. |
| `ALL` | User may switch outlet and, if allowed, choose mode. |
| Mode access | Controlled separately from outlet access so one outlet can expose F&B, goods, or both. |

### Rule of Thumb

- Permission decides which outlet(s) are visible.
- Package or feature flag decides which mode(s) are enabled.
- Mode decides which menu tree is rendered.

## Product Master Strategy

Product master should remain the source of orderable items for both modes.

### Product Fields That Matter

| Field | Why It Matters |
|---|---|
| id | Stable order reference. |
| code / barcode | Search and scanning. |
| name | Display in POS baskets and drawers. |
| category / type / segment | Menu grouping and filtering. |
| uom / packaging | Quantity and selling unit. |
| selling price | Checkout calculation. |
| tax flags | Fiscal calculation. |
| status / is_active | Only active items should be sellable. |

### Mode-Specific Overlay

- F&B overlays may add modifiers, prep routing, serving priority, or recipe links.
- Goods overlays may add warehouse source, packaging rules, or distributor price tiers.
- These overlays should live outside the core product master so the product model stays reusable.

## ASCII Layouts

### POS Shell

```text
+-------------------------------------------------------------------------------+
| POS | Outlet A | Mode: F&B / Goods | [Overview] [Mode Switcher] [Profile]    |
+----------------------+--------------------------------------------------------+
| Sidebar              | Workspace                                             |
|----------------------|--------------------------------------------------------|
| Overview             | Mode-specific content appears here                    |
| F&B Mode             |                                                        |
| Goods / Distributor  |                                                        |
|                      |                                                        |
+----------------------+--------------------------------------------------------+
```

### F&B Branch

```text
POS
├── Overview
├── F&B Mode
│   ├── Live Table Map
│   ├── Reservation
│   │   ├── Reservation List
│   │   └── Waiting List
│   └── Floor & Layout Designer
```

### Goods Branch

```text
POS
├── Overview
├── Goods / Distributor Mode
│   ├── Quick Sale
│   ├── Sales Basket
│   ├── Delivery / Pickup
│   └── Returns / Exchange
```

## Technical Decisions

### Separate Mode From Core

- **Decision**: Keep table-based F&B logic separate from product-first goods logic.
- **Reason**: This avoids forcing the same UX on two different business models.
- **Trade-off**: There are more menus and more conditional routing.

### Shared Order Draft

- **Decision**: Use one shared order draft shape with nullable spatial fields like table_id or floor_id.
- **Reason**: The checkout pipeline stays consistent across modes.
- **Trade-off**: The domain model needs mode-aware validation.

### Mode-Driven Menu Tree

- **Decision**: Render menus based on mode, not just role.
- **Reason**: A cashier in goods mode should never see table-centric controls.
- **Trade-off**: Navigation logic becomes a little more dynamic.

## Implementation Guidance

1. Define shared POS core contracts first: outlet scope, product projection, order draft, invoice handoff.
2. Add mode resolution next: F&B vs goods/distributor based on outlet package or feature flag.
3. Build F&B and goods as separate menu trees on top of the shared core.
4. Keep Live Table Map optional and mode-gated so it never becomes mandatory for goods sales.
