# POS F&B Parent Module Mapping (Modular, No ERP/CRM Changes)

> **Module:** POS + F&B Operations  
> **Sprint:** Draft Planning  
> **Version:** 0.3.0  
> **Status:** Draft (Packaging + Navigation Strategy)  
> **Last Updated:** April 2026

---

## Table of Contents

1. [Context](#context)
2. [Strategic Recommendation](#strategic-recommendation)
3. [Menu Mapping (Current -> Adjustment -> Target)](#menu-mapping-current---adjustment---target)
4. [Proposed POS Navigation Tree](#proposed-pos-navigation-tree)
5. [Relationship to Existing Modules](#relationship-to-existing-modules)
6. [Subscription Packaging](#subscription-packaging)
7. [Data and Module Integration](#data-and-module-integration)
8. [Product vs Ingredient Model](#product-vs-ingredient-model)
9. [End-to-End Transaction Flow](#end-to-end-transaction-flow)
10. [Implementation Phases](#implementation-phases)
11. [Risks and Mitigation](#risks-and-mitigation)

---

## Context

Current platform is strong in ERP + CRM for distributor workflows. F&B POS requires additional operational layers, but it must remain modular so existing ERP and CRM behavior is not changed.

- Multi outlet operations with rule: `company = outlet`
- Table and floor plan operations with a 2D gamified layout
- Real-time kitchen, payment, and reservation orchestration
- Ingredient-level stock depletion using recipe/BOM
- Customer master data for feedback and loyalty lives under `Master Data -> Customer`, not inside the POS tree

### Non-Negotiable Scope Rule

- Existing ERP and CRM modules must remain unchanged.
- POS is built as a separate parent module/package that consumes data from existing modules via API or read model.
- No forced refactor on distributor workflows.

---

## Strategic Recommendation

Short answer: **Yes, POS F&B should connect to Stock/Inventory and Finance**, but only through a dedicated POS boundary so ERP/CRM code is not touched.

Recommended approach:

- Keep existing ERP/CRM as source systems only.
- Build POS as an independent module tree with its own routes, usecases, and UI pages.
- Use mapping adapters between POS and ERP/CRM so cross-module contracts stay stable.
- Apply tenant model: one company record is treated as one outlet in POS context.
- Introduce recipe/BOM so each sold menu item consumes ingredient inventory automatically.
- Keep customer identity, feedback, and loyalty under Master Data Customer, with optional sync back to CRM through integration endpoints.

---

## Menu Mapping (Current -> Adjustment -> Target)

Interpretation note for this revision:

- `Perlu diubah` means added mapping/adapter behavior in the POS parent module.
- It does not mean changing existing ERP/CRM internals.

| Current Menu/Module (Read-Only Source) | Perlu Diubah di POS Parent | Target POS F&B Menu |
|---|---|---|
| Master Data Company | Mapping tenant POS: `company = outlet`, tambah shift dan cashier station di POS | POS Setup -> Outlet Profile & Stations |
| Master Data Product (Distributor SKU) | POS catalog layer untuk klasifikasi `FNB_MENU`, `INGREDIENT`, `PACKAGING` | POS Catalog -> Menu & Ingredients |
| Stock Inventory (Warehouse-centric) | POS stock adapter (reservation, deduction by recipe, per company/outlet) | POS Inventory -> Ingredient Ledger |
| Sales Invoice (B2B flow) | POS invoice lifecycle sendiri (open, settle, void, refund) | POS -> Invoice |
| Sales Order | POS order lifecycle sendiri (table, takeaway, waiting list) | POS -> Order Board |
| Payment/Finance | POS payment orchestration (split tender, e-wallet, cash rounding) + posting bridge | POS -> Payments -> Finance Bridge |
| Master Data Customer | Add feedback and loyalty children under customer master data | Master Data -> Customer |
| Organization/Floor (belum ada POS layout) | Floor designer drag-drop (meja, kursi, area, lantai, kasir) | POS Table Management |
| Queue management (belum ada) | Waiting list + SLA warning + seating estimation | POS Waiting List |
| Master Data Payment & Courier | Do not expose in POS-only package | Hidden for POS-only package |

### Requested Example Mapping Format

- menu1 (perlu diubah) -> menu2
- Master Data Company (perlu diubah via adapter company=outlet) -> POS Outlet
- Master Data Product (perlu diubah via POS catalog classification) -> POS Menu & Ingredient Catalog
- Sales Invoice B2B (perlu diubah via POS invoice lifecycle) -> POS Invoice
- Stock Inventory umum (perlu diubah via POS stock adapter + recipe deduction) -> POS Ingredient Inventory
- CRM Feedback umum (perlu diubah via public QR app per outlet) -> POS Outlet Feedback

---

## Proposed POS Navigation Tree

The POS module should appear as a new parent menu in the navigation tree. Existing ERP and CRM menus stay intact and unchanged.

```text
POS
├── Overview
├── Table Operations
│   ├── Floor & Layout Designer
│   ├── Live Table Map
│   ├── Order Panel
│   ├── Reservation
│   └── Waiting List
├── Inventory
│   ├── Ingredient Inventory
│   ├── Recipe / BOM
│   └── Stock Reservation
├── Reports
│   ├── Sales Summary
│   ├── Table Utilization
│   └── Ingredient COGS
└── Settings
    ├── Outlet Profile
    ├── Stations / Cashier
    ├── Tax / Service / Rounding
    └── Integration Bridge
```

### UI Recommendation

- `Table Operations` should be one 2D gamified page, not two separate top-level screens.
- Left canvas: floor plan, meja, kursi, ruangan, lantai, kasir.
- Clicking a table or seat in the live map should open the POS action to register food to that table.
- `Order Panel` owns the working logic for the flow; `Sales Order` is only an audit trail and settlement view.
- Right side panel: active orders, invoice drawer, reservation queue, warning timer, and payment actions.
- `Reservation` and `Waiting List` should live in the same operational surface so kasir tidak bolak-balik halaman.

### Menu Purpose by Section

| Menu | Purpose | Depends On |
|---|---|---|
| Overview | Ringkasan outlet, sales hari ini, status meja, order berjalan | POS order, POS invoice, reservation |
| Table Operations | Satu UI 2D untuk layout, live table map, order panel, reservation, waiting list | Outlet profile, live table state, order state |
| Inventory | Mengelola ingredient stock dan recipe/BOM | Product master projection, stock adapter |
| Reports | Laporan operasional POS per outlet | Invoice, order, ingredient, payment |
| Settings | Setup outlet, station, pajak, service, rounding, dan bridge | Master data company, finance settings |

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
│   └── Sales order / invoice (not changed; POS has its own order and invoice lifecycle)
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
| Master Data Payment & Courier | Not part of POS-only package | Hidden unless another package requires it |
| Stock | POS reads and deducts ingredient stock through adapter | No direct rewrite of stock module needed |
| Sales | POS creates its own order/invoice flow | Separate lifecycle for dine-in and quick service |
| Finance | POS posts payment and settlement data through bridge | Finance remains the accounting source of truth |
| CRM | POS can optionally sync customer events only | CRM module stays untouched |

### Placement Recommendation for Customer Features

- Move `Customer`, `Feedback`, and `Loyalty Program` into `Master Data -> Customer`.
- Keep POS tree focused on service flow only.
- Put only POS configuration primitives under `POS -> Settings` (template, rules, QR layout).

#### Master Data Navigation Tree (Customer)

The `Customer` master data should expose loyalty and feedback as a clear navigation subtree so admin users can manage members and view outlet-specific feedback without opening POS menus:

```text
Master Data
└── Customer
    ├── Customer List
    ├── Loyalty Program
    └── Feedback
```

Notes:
- Loyalty earns/redeems are recorded per outlet (company=outlet) but managed here.
- Feedback entries should reference `outlet_id`, `table_id` and `invoice_id` where applicable.

### Master Data Scope for POS Package

| Master Data Path | Essential | Growth | Enterprise | Notes |
|---|---|---|---|---|
| Organization -> Company | Yes | Yes | Yes | Outlet tenant source |
| Product | Yes | Yes | Yes | Menu catalog source |
| Customer | Yes | Yes | Yes | Includes customer submenus for loyalty/feedback |
| Warehouses | No | Yes | Yes | Only when ingredient inventory is enabled |
| Payment & Courier | No | No | No | Not included in POS-only package |
| Geographic | No | Optional | Optional | Only if outlet setup needs it |

---

## Subscription Packaging

The POS package should be sold as three tiers. Global platform menus like Dashboard, Master Data, Stock, Finance, CRM, Purchase, Sales, HRD, and Reports remain unchanged; the package only controls what appears under the `POS` parent menu.

### Global Modules That Stay Visible

| Module | Status | Why |
|---|---|---|
| Dashboard | Always visible | Platform entry point |
| Master Data | Always visible | Shared source data for ERP/CRM/POS |
| Sales, Purchase, Stock, Finance, HRD, Reports, CRM | Existing core modules | Not part of POS subscription gating |

### Package Menu Matrix

| POS Tier | Visible POS Menus | Included Capabilities |
|---|---|---|
| Essential | Overview, Table Operations, Settings | Basic floor map, live table map, order entry, invoice drawer, outlet profile, cashier setup, tax/service/rounding |
| Growth | Essential + Inventory, Reports | Ingredient stock, recipe/BOM, reservation, waiting list, table utilization, ingredient COGS |
| Enterprise | Growth + Advanced Settings + Integration Bridge | Multi-outlet admin, custom QR theme, advanced permissions, API/webhook bridge, finance sync, central reporting |

### Package Visibility by Menu

| Menu | Essential | Growth | Enterprise |
|---|---|---|---|
| Overview | Yes | Yes | Yes |
| Table Operations | Yes | Yes | Yes |
| Inventory | No | Yes | Yes |
| Reports | No | Yes | Yes |
| Reservation | Yes | Yes | Yes |
| Waiting List | Yes | Yes | Yes |
| Integration Bridge | No | No | Yes |
| Advanced Permissions | No | No | Yes |

### Packaging Guidance

- `Dashboard` and `Master Data` stay global; they are not sold as POS package features.
- `Customer`, `Feedback`, and `Loyalty Program` are shared master data, not POS tree items.
- For POS-only package, `Payment & Courier` is hidden from Master Data and `Inventory` is only visible from Growth upward.
- If you want simpler admin, only the configuration layer can be mirrored into `POS -> Settings`.

---

## Data and Module Integration

### Core Integrations

| Source Module | POS Module | Integration Rule |
|---|---|---|
| Master Data (Company/Org) | Outlet, Floor, Table, Station | In POS context: 1 company = 1 outlet; floor/table/station managed by POS |
| Product Master | Menu Catalog | Produk bertipe `FNB_MENU` dipakai untuk penjualan POS |
| Inventory/Stock | Ingredient Ledger | Penjualan menu memicu pemotongan ingredient berdasarkan recipe BOM |
| Sales | POS Invoice | POS order selesai menghasilkan invoice POS |
| Payment | POS Payment | Multi-method payment; bisa split tender |
| Finance | Journal/AR/Cash Bank | Payment posted ke finance; status invoice ter-update |
| CRM | Loyalty & Feedback | Customer points dari transaksi, feedback dari QR outlet/table/invoice |

### Integration Boundary Rules

- ERP/CRM endpoints are consumed by POS, not modified by POS.
- POS writes only to POS-owned tables for operational flow.
- Cross-module updates to Finance/CRM happen via bridge API/event contract.
- If packaging is enabled per company, activation is done by feature flags at company level.

### POS Domain Additions (New)

- FloorPlan
- Table
- TableSession
- Reservation
- WaitingList
- WaitingSLAWarning
- PosOrder
- PosOrderItem
- KitchenTicket
- PosInvoice
- PosPayment
- PosPaymentSplit
- Recipe (BOM)
- RecipeItem

---

## Product vs Ingredient Model

Recommended product model extension:

| Item Type | Purpose | Stock Behavior |
|---|---|---|
| `RESALE` | Existing distributor sale item | Deduct normal stock on sale |
| `FNB_MENU` | Sellable menu in POS | No direct stock deduction; triggers recipe explosion |
| `INGREDIENT` | Raw material for menu | Deduct based on recipe quantity |
| `PACKAGING` | Cup/box/etc | Optional deduct from recipe or fixed rule |

### Product Ownership Rule

- Existing master product remains intact as global product source.
- POS keeps a catalog projection for channel-specific behavior (menu display, recipe linkage, kitchen tags, serving rules).
- This projection avoids changing distributor product behavior.

### Key Rule

For F&B POS, **do not deduct stock from menu item directly**. Deduct from ingredient lines in recipe/BOM.

Formula:

- Ingredient deduction per sale = Menu qty sold x Recipe qty per menu

---

## End-to-End Transaction Flow

1. Company (as outlet tenant) opens active shift at cashier station.
2. Guest arrives via reservation, walk-in, or waitlist.
3. Reservation is confirmed or assigned to a table.
4. Waiter/cashier uses the Table Operations 2D screen.
5. Order is created on the same screen and sent to kitchen ticket.
6. On bill finalization, POS invoice is generated.
7. Payment captured (cash/card/e-wallet/split).
8. Invoice status updated to paid/partial.
9. Ingredient stock deducted from outlet inventory by recipe BOM.
10. Journal posted to finance (sales, tax, service, payment account).
11. Loyalty points credited (if member).
12. QR/barcode feedback shared (invoice/table/outlet specific).

---

## Implementation Phases

### Phase 1 (MVP POS)

- POS parent module skeleton (isolated routes, entities, usecases)
- Company-to-outlet tenant mapping
- Outlet + station setup
- Unified Table Operations 2D screen
- Basic order -> invoice -> payment flow
- Simple ingredient inventory deduction (recipe/BOM)
- Finance bridge posting basic

### Phase 2 (Operational Depth)

- Drag-drop floor designer (table/chair/room/level)
- Reservation + waiting list + ETA
- Waiting time warning dashboard
- Kitchen ticket workflow and bump screen
- Split payment, partial payment, void/refund controls

### Phase 3 (Customer Loop)

- Loyalty points earn/redeem
- Voucher and promo engine
- QR/barcode feedback with public page template customization per outlet
- Analytics for repeat customer, top menu, feedback score

---

## Risks and Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| POS accidentally couples with ERP/CRM internals | High upgrade risk | Enforce integration boundary, adapter layer, and no direct cross-domain writes |
| Product model conflict between distributor and F&B | Data ambiguity | Enforce product type enum + separate validation per channel |
| Stock inconsistency during rush hour | Financial and COGS mismatch | Use atomic transaction + row-level locking on stock deduction |
| Multi-outlet configuration complexity | Slow onboarding | Provide outlet setup wizard and default templates |
| Loyalty abuse/fraud | Margin loss | Use rules engine, audit trail, and max redeem constraints |
| Feedback spam from public QR | Dirty data | Rate limiting + captcha + one-submit per invoice rule |

---

## Final Recommendation

- Build POS as a parent module/package that is fully modular and isolated from ERP/CRM internals.
- Treat company as outlet in POS tenant context (`company = outlet`).
- Keep ERP/CRM untouched and integrate through API/event adapters only.
- Use one Table Operations 2D UI to combine floor, orders, invoice, reservation, and waiting list.
- Put customer, feedback, and loyalty into `Master Data -> Customer` so POS navigation stays focused on service flow.
- Prioritize BOM-driven ingredient deduction and finance bridge posting from day one.
