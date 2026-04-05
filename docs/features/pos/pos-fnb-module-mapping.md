# POS F&B Module Mapping (POS-Only Live Operations)

> **Module:** POS + F&B Operations  
> **Sprint:** Draft Planning  
> **Version:** 0.5.0  
> **Status:** Draft (POS-only UX + shared module split)  
> **Last Updated:** April 2026

---

## Table of Contents

1. [Context](#context)
2. [Strategic Recommendation](#strategic-recommendation)
3. [Menu Mapping (Current -> Adjustment -> Target)](#menu-mapping-current---adjustment---target)
4. [Proposed POS Navigation Tree](#proposed-pos-navigation-tree)
5. [Module Split and Shared Menus](#module-split-and-shared-menus)
6. [Relationship to Existing Modules](#relationship-to-existing-modules)
7. [Subscription Packaging](#subscription-packaging)
8. [POS Access Pattern](#pos-access-pattern)
9. [Data and Module Integration](#data-and-module-integration)
10. [End-to-End Transaction Flow](#end-to-end-transaction-flow)
11. [Implementation Phases](#implementation-phases)
12. [Risks and Mitigation](#risks-and-mitigation)
13. [Final Recommendation](#final-recommendation)

---

## Context

Current platform is strong in ERP + CRM for distributor workflows. F&B POS requires additional operational layers, but the POS package itself should stay focused on live operations only.

- Multi outlet operations with rule: `company = outlet`
- Table and floor plan operations with a 2D gamified layout
- Real-time reservation handling and table assignment
- Billing and settlement live in the Sales module
- Ingredient inventory, reports, and company profile live in their own parent modules
- Customer master data for loyalty and feedback lives under `Master Data -> Customer`

### Non-Negotiable Scope Rule

- Existing ERP and CRM modules must remain unchanged.
- POS is built as a separate parent module/package that consumes data from existing modules via API or read model.
- No forced refactor on distributor workflows.

---

## Strategic Recommendation

Short answer: **Yes, POS F&B should connect to Stock/Inventory and Finance**, but only through module boundaries so ERP/CRM code is not touched.

Recommended approach:

- Keep existing ERP/CRM as source systems only.
- Build POS as an independent module tree with its own routes, usecases, and UI pages.
- Use mapping adapters between POS and the shared modules so cross-module contracts stay stable.
- Apply tenant model: one company record is treated as one outlet in POS context.
- Keep customer identity, loyalty, and feedback under `Master Data -> Customer`.
- Keep company/outlet profile under `Master Data -> Organization -> Company`.
- Keep ingredient inventory under `Stock` and operational reports under `Reports`.
- Keep invoice, payment, and settlement under `Sales`.

---

## Menu Mapping (Current -> Adjustment -> Target)

Interpretation note for this revision:

- `Perlu diubah` means added mapping/adapter behavior in the owning module.
- It does not mean changing existing internals unless the target module is explicitly the owner.

| Current Menu/Module (Read-Only Source) | Perlu Diubah di Target Module | Target Tree |
|---|---|---|
| Master Data Company | Company profile is the tenant source for POS | `Master Data -> Organization -> Company` |
| Master Data Product (Distributor SKU) | POS catalog projection for menu display and recipe linkage | `Master Data -> Product` + POS catalog projection |
| Stock Inventory | Ingredient stock, recipe/BOM, and stock reservation live here | `Stock -> Ingredient Inventory / Recipe / BOM / Stock Reservation` |
| Sales Order | Order capture, order audit trail, and settlement view | `Sales -> Sales Orders` |
| Sales Invoice | Invoice generation and billing lifecycle | `Sales -> Customer Invoices` |
| Payments | Payment capture and payment settlement | `Sales -> Payments` |
| Master Data Customer | Loyalty and feedback managed in customer master | `Master Data -> Customer -> Loyalty Program / Feedback` |
| Reports | Sales and operational analytics | `Reports -> Sales Summary / Table Utilization / Ingredient COGS` |
| Organization/Floor | Floor, room, table, and seating layout live in POS operations | `POS -> Floor & Layout Designer` |
| Queue Management | Waiting list and SLA warning live in POS operations | `POS -> Reservation / Waiting List` |
| Master Data Payment & Courier | Hidden from POS-only package | Not shown in POS package |

### Requested Example Mapping Format

- menu1 (perlu diubah) -> menu2
- Master Data Company (perlu diubah via company profile) -> Master Data -> Organization -> Company
- Master Data Product (perlu diubah via POS catalog projection) -> Master Data -> Product
- Sales Invoice B2B (perlu diubah via Sales billing lifecycle) -> Sales -> Customer Invoices
- Stock Inventory umum (perlu diubah via stock module ownership) -> Stock -> Ingredient Inventory
- CRM Feedback umum (perlu diubah via customer master subtree) -> Master Data -> Customer -> Feedback

---

## Proposed POS Navigation Tree

The POS platform should appear as a new parent menu in the navigation tree. Existing ERP and CRM menus stay intact and unchanged.
This navigation tree is the F&B branch only; goods / distributor mode should use a separate menu tree under the same POS shell.

```text
POS
├── Overview
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

### UI Recommendation

- `Live Table Map` should be the default operational surface for cashier and host roles in F&B mode.
- Clicking a table should open the order drawer in-place or as a slide-over, not navigate away to a separate page.
- The order drawer is a UI state inside `Live Table Map`, not a separate top-level menu.
- `Reservation` and `Floor & Layout Designer` remain separate because they are different work modes inside F&B mode.
- `Waiting List` is not a top-level POS menu; it lives inside `Reservation` as the host queue for full-house scenarios.
- `Settings` is removed from the POS tree.
- Billing handoff goes to `Sales`, so the POS surface stays light and fast.
- Goods / distributor mode must not show table-specific navigation.

### Menu Purpose by Section

| Menu | Purpose | Depends On |
|---|---|---|
| Overview | Ringkasan outlet, sales hari ini, status meja, order berjalan | POS order state, reservation state |
| Live Table Map | Satu UI 2D untuk table selection, live orders, and handoff to Sales | Live table state, order state |
| Reservation | Manage reservations and waiting queue for full-house flow | Table availability, queue state |
| Floor & Layout Designer | Configure floor, room, table, and cashier placement | Outlet/company profile |

---

## Module Split and Shared Menus

The POS package should stay focused on live operations. Customer engagement, company profile, inventory, reports, and billing are owned by their own parent modules.

### Sibling Module Trees

```text
Master Data
└── Customer
    ├── Customer List
    ├── Loyalty Program
    └── Feedback
```

```text
Master Data
└── Organization
    └── Company
        ├── Company List
        └── Company Profile
```

```text
Stock
├── Ingredient Inventory
├── Recipe / BOM
└── Stock Reservation
```

```text
Reports
├── Sales Summary
├── Table Utilization
└── Ingredient COGS
```

```text
Sales
├── Sales Orders
├── Customer Invoices
└── Payments
```

### Ownership Summary

| Domain | Parent Module | In POS Tree? | Notes |
|---|---|---|---|
| Customer, Loyalty, Feedback | Master Data -> Customer | No | shared customer management |
| Company / outlet profile | Master Data -> Organization -> Company | No | outlet identity and company profile |
| Ingredient inventory | Stock | No | stock module owns ingredients and BOM |
| Operational reports | Reports | No | reporting module owns analytics |
| Billing, invoicing, payments | Sales | No | Sales owns the commercial transaction lifecycle |
| POS live operations | POS | Yes | only live table map, reservation, and floor layout |

### Master Data Navigation Tree (Customer)

```text
Master Data
└── Customer
    ├── Customer List
    ├── Loyalty Program
    └── Feedback
```

### Master Data Navigation Tree (Organization)

```text
Master Data
└── Organization
    └── Company
        ├── Company List
        └── Company Profile
```

Notes:
- Loyalty earns and redeems are recorded per outlet (company = outlet) but managed here.
- Feedback entries should reference `outlet_id`, `table_id`, and `invoice_id` where applicable.
- Outlet profile belongs to company profile, so POS does not need a dedicated outlet profile menu.

---

## Relationship to Existing Modules

POS does not replace existing modules. It consumes them as source data and writes back only through bridge layers where needed.

```text
ERP / CRM Existing Core
├── Master Data
│   ├── Company (used as outlet tenant in POS)
│   ├── Product (used as source catalog)
│   └── Customer (used for member / guest identity)
├── Stock
│   └── Warehouse stock (used for ingredient adapter)
├── Sales
│   ├── Sales order
│   ├── Customer invoices
│   └── Payments
├── Finance
│   └── Journal / receivable / cash bank (used by finance bridge)
└── CRM
    └── Feedback / loyalty campaign (used through integration sync, not direct refactor)
```

### Module Relationship Summary

| Existing Module | Relation to POS | Notes |
|---|---|---|
| Master Data Company | POS uses it as outlet tenant source | In POS context, `company = outlet` |
| Master Data Product | POS uses a channel-specific catalog projection | Distributor product behavior stays intact |
| Master Data Customer | POS uses it for guest/member reference and customer engagement | Feedback and loyalty live under master data customer |
| Master Data Organization / Company | POS reads outlet identity from here | Outlet profile is not a POS menu |
| Master Data Payment & Courier | Not part of POS-only package | Hidden unless another package requires it |
| Stock | POS reads ingredient stock through bridge | Ingredient inventory lives in Stock |
| Reports | POS sends operational metrics to reporting module | Analytics are not in the POS tree |
| Sales | POS hands off order, invoice, and payment lifecycle | Sales owns billing and settlement |
| Finance | POS posts payment and settlement data through bridge | Finance remains the accounting source of truth |
| CRM | POS can optionally sync customer events only | CRM module stays untouched |

---

## Subscription Packaging

The POS package should be sold as three tiers. Global platform menus like Dashboard and the shared master data modules remain unchanged; the package only controls what appears under the `POS` parent menu.

### Global Modules That Stay Visible

| Module | Status | Why |
|---|---|---|
| Dashboard | Always visible | Platform entry point |
| Master Data -> Organization | Always visible | Shared company / outlet data |
| Master Data -> Customer | Always visible | Shared customer engagement data |
| Stock | Always visible | Shared inventory owner |
| Reports | Always visible | Shared analytics owner |
| Sales, Purchase, Finance, HRD, CRM | Existing core modules | Not part of POS subscription gating |

### Package Menu Matrix

| POS Tier | Included Menus | Access Notes |
|---|---|---|
| Essential | Overview, Live Table Map, Reservation | Base cashier flow for table selection and queue handling |
| Growth | Essential + Floor & Layout Designer | Adds floor editing, multi-room setup, cashier placement |
| Franchise | Growth + franchise access controls | Same menus as Growth, with multi-outlet defaults, role-based shortcuts, quick launcher, and custom landing routes |

### Packaging Guidance

- `Dashboard`, `Customer`, `Company`, `Stock`, `Reports`, and `Sales` stay in their own parent modules; they are not sold as POS menus.
- `Payment & Courier` is hidden from POS-only package exposure.
- If you want simpler admin, only POS-specific config can be mirrored into `POS -> Floor & Layout Designer` or `POS -> Reservation` state.
- The menu difference between Growth and Franchise is mostly access control and routing, not extra POS screens.

---

## POS Access Pattern

The UX feels off when `Live Table Map` is treated as a route jump instead of a working surface. For POS, the fastest pattern is to keep the user inside one context and change state, not page.

### Recommended Access Flow

```text
Sidebar / Top Bar
└── POS
    ├── Overview (role-based default for managers)
    ├── Live Table Map (default operational surface for cashier / host)
    ├── Reservation
    └── Floor & Layout Designer
```

### UX Guidance

- Make `POS` a top-level, pinned menu so it is always one click away.
- Let `Live Table Map` be the default landing screen for cashier and host roles.
- Clicking a table should open the order drawer in-place or as a slide-over, not move to another full page.
- Keep the user in the same screen until they hand off the order to `Sales`.
- Use role-based default landing routes:
  - cashier -> `POS -> Live Table Map`
  - host -> `POS -> Reservation`
  - manager -> `POS -> Overview`
- Add a keyboard shortcut or quick launcher for POS entry if users switch often between modules.

### UX Recommendation

Yes, one main menu is more comfortable than splitting `Live Table Map` and `Order Panel` into separate top-level items. The split felt off because those are the same cashier mental model:

- select table
- add items
- hand off to Sales

So the best UX is a single `Live Table Map` workspace with an embedded order drawer, not a separate order menu.

---

## Data and Module Integration

### Core Integrations

| Source Module | POS Module | Integration Rule |
|---|---|---|
| Master Data (Company/Org) | Outlet, Floor, Table, Station | In POS context: 1 company = 1 outlet; floor/table/station managed by POS |
| Product Master | Menu Catalog | Menu display and item selection use product master as source |
| Inventory/Stock | Ingredient Ledger | Ingredient stock changes are owned by Stock |
| Sales | Sales Orders / Customer Invoices / Payments | Sales owns order finalization, billing, and settlement |
| Finance | Journal/AR/Cash Bank | Payment posted to finance; status invoice updated in Sales |
| CRM | Customer events only | Customer points, feedback, and loyalty stay in Master Data -> Customer |
| Reports | Reporting bridge | Analytics stay in Reports |

### Integration Boundary Rules

- ERP/CRM endpoints are consumed by POS, not modified by POS.
- POS writes only to POS-owned tables for operational flow.
- Cross-module updates to Finance, Reports, and Customer happen via bridge API/event contract.
- If packaging is enabled per company, activation is done by feature flags at company level.

### POS Domain Additions (New)

- FloorPlan
- Table
- TableSession
- Reservation
- WaitingList
- WaitingSLAWarning
- OrderDraft
- OrderItemDraft
- TableActionEvent

---

## End-to-End Transaction Flow

1. Company (as outlet tenant) opens active shift at cashier station.
2. Guest arrives via reservation, walk-in, or waitlist.
3. Reservation is confirmed or assigned to a table.
4. Cashier or host opens `Live Table Map`.
5. User selects the table and adds items in the order drawer.
6. POS hands the draft order to the `Sales` module.
7. Sales generates the invoice and handles payment.
8. Stock module deducts ingredients based on the order.
9. Finance posts the accounting entry.
10. Loyalty and feedback are written to `Master Data -> Customer`.
11. QR/barcode feedback shared for the outlet, table, or invoice.

---

## Risks and Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| POS accidentally couples with ERP/CRM internals | High upgrade risk | Enforce integration boundary, adapter layer, and no direct cross-domain writes |
| Too many top-level menus | Slower cashier workflow | Keep POS to four items maximum |
| Sales handoff feels like a context switch | User confusion | Use an embedded order drawer and keep the user on Live Table Map |
| Module ownership becomes unclear | Maintenance cost | Keep Customer, Company, Stock, Reports, and Sales in sibling module trees |
| Multi-outlet configuration complexity | Slow onboarding | Provide outlet setup wizard and default templates |
| Loyalty abuse/fraud | Margin loss | Use rules engine, audit trail, and max redeem constraints |

---

## Final Recommendation

- Keep POS shallow and fast.
- Use `Live Table Map` as the single main operational screen.
- Keep `Reservation` and `Floor & Layout Designer` as the only other POS menus.
- Remove `Settings` from POS.
- Keep invoice, payment, and settlement in `Sales`.
- Put customer, loyalty, and feedback in `Master Data -> Customer`.
- Put company/outlet profile in `Master Data -> Organization -> Company`.
- Put ingredient inventory in `Stock` and analytics in `Reports`.
- Prioritize an in-place order drawer so the cashier never feels like they are bouncing between two equivalent screens.
