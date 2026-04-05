# POS Live Operations Product Requirements Document

> **Module:** POS -> Live Operations
> **Sprint:** Draft Planning
> **Version:** 0.1.0
> **Status:** Draft
> **Last Updated:** April 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Product Goals](#product-goals)
3. [Scope](#scope)
4. [Information Architecture](#information-architecture)
5. [Shared UX Principles](#shared-ux-principles)
6. [Page Specifications](#page-specifications)
7. [ASCII Layouts](#ascii-layouts)
8. [Data Ownership and Integration](#data-ownership-and-integration)
9. [Business Rules](#business-rules)
10. [Permissions](#permissions)
11. [API Reference](#api-reference)
12. [Frontend Components](#frontend-components)
13. [User Flow](#user-flow)
14. [Testing Strategy](#testing-strategy)
15. [Technical Decisions](#technical-decisions)
16. [Risks and Open Questions](#risks-and-open-questions)

---

## Overview

This PRD defines the POS live operations experience for F&B outlets. The experience is centered on a small number of highly consistent pages that share the same visual language as the floor layout designer: dot-grid surfaces, drag-and-drop interactions, strong spatial cues, and a game-like operational feel.

The module is intentionally focused on live outlet work, not full ERP administration.

### Primary Pages

| Page | Purpose |
|---|---|
| Overview | Outlet snapshot for managers and supervisors. |
| Live Table Map | Gamified 2D operational surface for table handling, order entry, and handoff to sales. |
| Reservation | Workspace for guest planning and queue control. |
| Reservation List | Structured list of reservations with status and assignment actions. |
| Waiting List | Walk-in queue management with SLA warnings and table assignment. |

### Product Intent

- Keep POS fast for cashiers, hosts, and outlet managers.
- Make the live table surface feel like a physical room that can be understood at a glance.
- Reuse the same spatial language from the floor layout designer so users do not learn two different metaphors.
- Support multi-company as multi-outlet, with outlet-scoped RBAC where outlet context is resolved from permission scope.

### Non-Goals

- No ERP master data redesign.
- No deep finance screen inside POS.
- No separate stock management screen inside POS.
- No customer master rework inside POS.
- No CRM campaign management inside POS.

## Product Goals

| Goal | Description |
|---|---|
| Outlet-first operations | Every screen should work in the context of one outlet/company. |
| Spatial clarity | Staff can see table status, queue pressure, and available space immediately. |
| Gamified layout consistency | Live screens should feel like an extension of floor planning, not a separate app. |
| Fast handoff to sales | Table orders move to invoice and payment with minimal friction. |
| Queue control | Waiting list and reservations reduce chaos during peak hours. |
| Franchise RBAC | Outlet/company scope prevents cross-branch access leakage. |

## Scope

### In Scope

- Multi-company / multi-outlet access based on master data company records.
- Outlet-scoped permissions for franchise operations, with outlet selection visible only for users with `ALL` scope.
- Overview page with operational KPIs and alerts.
- Live Table Map with dot-grid room visualization, drag-and-drop table editing, and live table state.
- Reservation workspace with list and queue views.
- Waiting time warnings for tables and queued guests.
- Table-level order lifecycle entry and invoice handoff.
- Wait-time based recommendation list in order drawer for items that should be served first.
- Integration with payments and finance through the sales boundary.
- POS order item input sourced from Master Data Product catalog.
- Integration with ingredient inventory for automatic stock deduction after sales.
- Barcode or QR-based customer feedback entry.
- Loyalty points and redemption visibility at the customer layer.

### Out of Scope

- Full sales billing module design.
- Finance ledger UI.
- Inventory purchasing UI.
- Customer master maintenance UI.
- Report authoring UI.

## Information Architecture

### POS Navigation Tree

```text
POS
├── Overview
├── Live Table Map
├── Reservation
│   ├── Reservation List
│   └── Waiting List
```

### Navigation Rules

- `Live Table Map` is the primary working surface for cashiers and hosts.
- `Overview` is the manager surface for performance and outlet health.
- `Reservation` is a parent section with two operational views: reservations and waiting list.
- The order drawer stays inside `Live Table Map`; it is not a separate top-level page.
- The visual language must stay consistent with the floor layout designer.
- Outlet context is derived from RBAC scope: users with `OWN` are auto-bound to one outlet, users with `ALL` may switch outlet.

## Shared UX Principles

1. Use a dark, high-contrast spatial canvas with a dotted or grid-based background.
2. Keep a fixed POS shell across pages so users always know the outlet context.
3. Use room, table, chair, cashier, and queue metaphors instead of generic cards.
4. Prioritize quick actions over forms.
5. Show warnings in-place: waiting time, table occupancy, and queue overflow.
6. Use draggable and clickable objects where the task is spatial.
7. Keep tables visually distinct from chairs, cashier stations, and empty zones.
8. Preserve a consistent header, action bar, and side panels across all pages.

## Page Specifications

### 1. Overview

The Overview page is the outlet command center. It gives managers a quick read on how the outlet is performing without opening detailed operational screens.

#### Primary Responsibilities

- Show outlet status, shift health, and high-level sales signals.
- Surface live alerts for table congestion, reservation delay, and queue pressure.
- Display quick entry points to Live Table Map, Reservation List, and Waiting List.
- Present outlet-scoped context only; no cross-outlet mixing.

#### Key Widgets

- Today sales summary.
- Active table count.
- Occupancy percentage.
- Waiting list count.
- Reservation count.
- Warning feed for overdue tables.
- Shortcut cards for cashier, host, and manager actions.

#### Empty States

- No active shift.
- No live tables.
- No reservations for today.
- No waiting list entries.

### 2. Live Table Map

Live Table Map is the heart of POS. It should feel like a controlled game board: the user can read the room, drag objects, select tables, and open the order drawer without leaving the workspace.

#### Primary Responsibilities

- Render floor, room, wall, cashier, and table objects on a dot-grid canvas.
- Support drag-and-drop table and chair placement in view mode where allowed.
- Show live state of each table: open, occupied, reserved, waiting, billed, or blocked.
- Show how long a table has been occupied or waiting.
- Open the invoice/order drawer when a table is selected.
- Show recommendation list in drawer for items that need immediate serving based on waiting time.
- Load order items from Master Data Product and allow direct input into POS order flow.
- Allow handoff from POS order state to Sales invoice flow.

#### Key Interactions

- Click a table to open table detail and order drawer.
- Drag a table or object only when edit mode is enabled.
- Hover a table to preview guest count, elapsed time, and active items.
- Use room tabs or floor selectors for multi-floor outlets.
- Use warning badges for tables that exceed the configured waiting threshold.
- Prioritize drawer recommendations by waiting duration and service urgency rules.

#### Visual Rules

- Dot-grid background.
- Rooms outlined by line geometry.
- Tables rendered as dots, rounded blocks, or framed shapes depending on density.
- Chairs appear as smaller companion objects.
- Cashier station remains visually anchored and never mixes with customer seating.

### 3. Reservation

Reservation is the parent workspace for guest planning. It should be split into two operational views: Reservation List and Waiting List.

#### Primary Responsibilities

- Manage booked reservations.
- Manage walk-in waiting guests.
- Show table availability before assigning a guest.
- Capture arrival, confirm, reschedule, cancel, and assign actions.
- Keep reservation and waiting state synchronized with Live Table Map.

#### Shared Behaviors

- Reservation and waiting entries must be outlet-scoped.
- The same outlet context must persist when switching between list and queue.
- Staff should be able to assign a table without navigating away from the reservation workspace.

### 4. Reservation List

Reservation List is the structured planning view for upcoming guests.

#### Primary Responsibilities

- Show reservations by time, guest name, party size, and status.
- Allow quick confirmation, rescheduling, cancellation, and table assignment.
- Mark late arrivals and no-shows.
- Display table readiness and seating suggestions.

#### Important States

- Confirmed.
- Pending.
- Arrived.
- Seated.
- Rescheduled.
- Cancelled.
- No-show.

### 5. Waiting List

Waiting List is the live queue view for walk-in guests and overflow situations.

#### Primary Responsibilities

- Show queued guests in arrival order.
- Display estimated wait time and warning states.
- Allow manual prioritization where policy permits.
- Suggest a table when one becomes available.
- Sync guest assignment back to Live Table Map.

#### Important States

- Waiting.
- Notified.
- Seated.
- Expired.
- Escalated.

## ASCII Layouts

### Overview

```text
+----------------------------------------------------------------------------------+
| POS | Outlet A | Overview | Shift: 12:00 - 22:00 | [Outlet] [Search] [Profile]  |
+----------------------+-----------------------------------------------------------+
| Navigation           | Overview Dashboard                                        |
|----------------------|-----------------------------------------------------------|
| Overview             | +-----------+ +-----------+ +-----------+               |
| Live Table Map       | | Sales     | | Tables    | | Waiting   |               |
| Reservation          | | Today     | | Occupied  | | Queue     |               |
|  - Reservation List  | +-----------+ +-----------+ +-----------+               |
|  - Waiting List      |                                                           |
|                      | +-------------------------------------------------------+ |
| Quick Actions        | | Live Alerts                                           | |
| - Open Tables        | | - Table 12 waiting too long                          | |
| - New Reservation    | | - Reservation at 19:00 needs confirmation           | |
| - View Queue         | | - Bar zone near capacity                             | |
| - Go to Map          | +-------------------------------------------------------+ |
|                      | +-------------------------------------------------------+ |
| Outlet Summary       | | Mini room status / occupancy / sales trend           | |
| - Occupancy 82%      | +-------------------------------------------------------+ |
| - Active Shift       |                                                           |
+----------------------+-----------------------------------------------------------+
```

### Live Table Map

```text
+----------------------------------------------------------------------------------+
| POS | Outlet A | Live Table Map | Floor 1 | Edit: Off | [Order] [Reserve] [Pay] |
+----------------------+-----------------------------------------------------------+
| Floor / Room Tabs    | Gamified Table Canvas                                      |
|----------------------|-----------------------------------------------------------|
| Floor 1              | . . . . . . . . . . . . . . . . . . . . . . . . . .      |
| Floor 2              | .  +------------------------ Room A -------------------+  |
| Floor 3              | .  |  [T01]   [T02]   [T03]     chairs as small dots    |  |
|                      | .  |                                                  |  |
| Table Legend         | .  |  [T04]   [T05]   [T06]     waiter lane / aisle   |  |
| - Available          | .  |                                                  |  |
| - Occupied           | .  |  [Cashier]   [Bar]   [Service]   [T07] [T08]      |  |
| - Reserved           | .  +--------------------------------------------------+  |
| - Waiting            |                                                           |
| - Billed             | +--------------------+  +-----------------------------+ |
|                      | | Selected Table     |  | Order Drawer / Invoice      | |
| Object Tools         | | Table 05           |  | Guest: 4 pax                | |
| - Select             | | Waiting: 18 min    |  | Items from Product Master   | |
| - Drag               | | Status: Occupied   |  | Serve Now: soup, appetizer  | |
| - Rotate             | | Actions: open/pay  |  +-----------------------------+ |
| - Snap Grid          |                                                           |
+----------------------+-----------------------------------------------------------+
```

### Reservation

```text
+----------------------------------------------------------------------------------+
| POS | Outlet A | Reservation | [Reservation List] [Waiting List] [New Booking]  |
+----------------------+-----------------------------------------------------------+
| Reservation Shell    | Reservation Workspace                                     |
|----------------------|-----------------------------------------------------------|
| Summary              | +-------------------+ +-------------------+               |
| - Booked Today       | | Upcoming          | | Queue Pressure    |               |
| - Confirmed          | | Reservations      | | Warning           |               |
| - Waiting            | +-------------------+ +-------------------+               |
| - Late Arrivals      |                                                           |
| Quick Filters        | +-------------------------------------------------------+ |
| - Today             | | Context help / outlet rule / seating suggestions       | |
| - Tomorrow          | | Reservation actions depend on table availability       | |
| - Pending           | +-------------------------------------------------------+ |
| - Arrived            |                                                           |
| Actions              | +-------------------------------------------------------+ |
| - Confirm            | | Selected entry details and quick actions               | |
| - Assign Table       | | Confirm | Reschedule | Cancel | Seat | Notify          | |
| - Notify Guest       | +-------------------------------------------------------+ |
+----------------------+-----------------------------------------------------------+
```

### Reservation List

```text
+----------------------------------------------------------------------------------+
| POS | Outlet A | Reservation List | Sort: Time | Filter: Today | [Create]       |
+----------------------+-----------------------------------------------------------+
| Filters              | Reservation Table                                         |
|----------------------|-----------------------------------------------------------|
| Status               | Time   | Guest        | Pax | Status     | Table | Action |
| - All                |----------------------------------------------------------|
| - Pending            | 18:00  | Lina         | 4   | Confirmed  | T05   | View   |
| - Confirmed          | 18:30  | Bima         | 2   | Pending    | -     | Assign |
| - Arrived            | 19:00  | Rina         | 6   | Late       | T08   | Notify |
| - Cancelled          | 19:30  | Bayu         | 3   | No-show    | -     | Close  |
| Date                 | 20:00  | Sari         | 5   | Confirmed  | T11   | View   |
| - Today              |----------------------------------------------------------|
| - Tomorrow           | Selected reservation detail and timeline preview         |
|                      | Actions: confirm, reschedule, cancel, assign table     |
+----------------------+-----------------------------------------------------------+
```

### Waiting List

```text
+----------------------------------------------------------------------------------+
| POS | Outlet A | Waiting List | SLA Warning: ON | [Call Next] [Seat Guest]      |
+----------------------+-----------------------------------------------------------+
| Queue Controls       | Waiting Queue                                             |
|----------------------|-----------------------------------------------------------|
| Priority Mode        | Pos | Guest | Pax | Wait Time | Status     | Suggestion  |
| - FIFO               |----------------------------------------------------------|
| - Priority           | 01  | Dika  | 2   | 08 min    | Waiting    | T03         |
| - VIP                | 02  | Nia   | 4   | 19 min    | Warning    | T07         |
| SLA Threshold        | 03  | Arif  | 3   | 27 min    | Escalated  | T09         |
| - 15 min             | 04  | Maya  | 6   | 04 min    | Notified   | T12         |
| - 20 min             |                                                           |
| Quick Actions        | +-------------------------------------------------------+ |
| - Notify Next Guest  | | Selected queue entry details                            | |
| - Mark Arrived       | | Wait time, party size, preference, note, alert level    | |
| - Assign Table       | | Actions: notify | seat | skip | remove                  | |
| - Remove             | +-------------------------------------------------------+ |
+----------------------+-----------------------------------------------------------+
```

## Data Ownership and Integration

### Ownership Model

| Domain | Ownership | Notes |
|---|---|---|
| Company / outlet | Master Data | POS reads company as outlet tenant. |
| Product catalog | Master Data -> Product | POS reads products as orderable menu items. |
| Table / room / floor / cashier station | POS | Live layout and seating state are POS-owned. |
| Reservation | POS | Reservation lifecycle is managed inside POS. |
| Waiting list | POS | Queue state and SLA warnings are POS-owned. |
| Sales invoice | Sales | POS hands off table orders to sales for billing. |
| Payment | Sales / Finance bridge | POS does not own the accounting ledger. |
| Ingredient stock | Stock | POS consumes stock via integration after sales. |
| Customer loyalty and feedback | Master Data -> Customer | POS can trigger the experience but not own the master data. |

### Integration Boundary

- POS reads company identity from master data and treats each company as one outlet.
- POS reads orderable items from Master Data Product for product input in order drawer.
- POS uses outlet-scoped RBAC to prevent cross-branch access.
- Table orders move to Sales for invoice generation and payment capture.
- Sales posts settlement to Finance.
- Stock is reduced by ingredient consumption after the sale is finalized.
- Customer feedback is captured through a public barcode or QR flow tied to outlet ID.
- Loyalty points are earned and redeemed in the customer layer, not inside POS core screens.

### Adjacent Features Referenced by This PRD

- Multi-company outlet scoping.
- Table management with warning thresholds.
- Invoice handoff from table view to sales.
- Waiting list and reservation synchronization.
- Ingredient inventory linked to menu consumption.
- Public feedback barcode per outlet.
- Loyalty program with point accrual and redemption.

## Business Rules

- One company record equals one outlet in POS context.
- Users can only see outlets allowed by their RBAC scope.
- Users with `OWN` scope cannot switch outlet manually.
- Users with `ALL` scope can switch outlet using the outlet switcher.
- A table can only have one active live order session at a time.
- Waiting time warnings must appear before a guest exceeds the configured SLA threshold.
- Order drawer must show serving-priority recommendations based on waiting duration.
- Product selection in POS orders must come from Master Data Product.
- A reservation cannot be seated if the target table is already occupied or blocked.
- Live Table Map must remain the single source of truth for table placement and live status.
- The order drawer must stay in the same surface as the table map.
- Invoice and payment settlement are handed off to Sales.
- Ingredient deduction happens after the sale is committed.
- Feedback QR or barcode must be outlet-specific so franchise branches do not mix data.

## Permissions

POS requires outlet-scoped RBAC in addition to module permissions.

| Permission | Scope | Description |
|---|---|---|
| pos.overview.view | OWN / ALL | View outlet summary and alerts. |
| pos.table.view | OWN / ALL | View live table map and table state. |
| pos.table.manage | OWN / ALL | Change table state and manage live orders. |
| pos.reservation.view | OWN / ALL | View reservation data. |
| pos.reservation.manage | OWN / ALL | Create, update, confirm, cancel, and assign reservations. |
| pos.waiting-list.manage | OWN / ALL | Manage waiting queue and SLA actions. |
| pos.outlet.scope | OWN / ALL | Define outlet/company access scope; `OWN` auto-binds outlet, `ALL` can switch outlet. |

## API Reference

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | /pos/outlets | pos.outlet.scope | List outlets visible to the current user. |
| GET | /pos/outlets/{outletId}/overview | pos.overview.view | Get summary data for the Overview page. |
| GET | /pos/outlets/{outletId}/live-table-map | pos.table.view | Get live table map data, room layout, and table states. |
| GET | /pos/outlets/{outletId}/product-catalog | pos.table.manage | Get orderable product list from Master Data Product projection. |
| GET | /pos/outlets/{outletId}/reservations | pos.reservation.view | List reservations for the outlet. |
| POST | /pos/outlets/{outletId}/reservations | pos.reservation.manage | Create a reservation. |
| PUT | /pos/outlets/{outletId}/reservations/{id} | pos.reservation.manage | Update reservation details. |
| POST | /pos/outlets/{outletId}/reservations/{id}/confirm | pos.reservation.manage | Confirm reservation arrival. |
| POST | /pos/outlets/{outletId}/reservations/{id}/seat | pos.reservation.manage | Assign reservation to a table. |
| GET | /pos/outlets/{outletId}/waiting-list | pos.waiting-list.manage | List waiting queue entries. |
| POST | /pos/outlets/{outletId}/waiting-list | pos.waiting-list.manage | Add a walk-in guest to the queue. |
| POST | /pos/outlets/{outletId}/waiting-list/{id}/seat | pos.waiting-list.manage | Seat a waiting guest at a table. |
| POST | /pos/outlets/{outletId}/tables/{tableId}/invoice | pos.table.manage | Hand off the table order to Sales invoice flow. |
| POST | /pos/outlets/{outletId}/feedback/{barcodeId} | public | Submit outlet feedback from a public barcode or QR page. |

## Frontend Components

| Component | Purpose |
|---|---|
| PosShell | Shared outlet-scoped app shell for all POS pages. |
| OverviewDashboard | Outlet health and KPI surface. |
| LiveTableMap | Gamified table canvas with room, table, chair, and cashier objects. |
| TableObject | Table node with state, wait time, and quick actions. |
| OrderDrawer | Inline order and invoice handoff drawer on the table map. |
| ServePriorityPanel | Drawer section that recommends which items should be served first by wait time. |
| ProductOrderPicker | Product search and picker sourced from Master Data Product. |
| ReservationWorkspace | Parent shell for reservation list and waiting list. |
| ReservationList | Reservation table and detail panel. |
| WaitingListPanel | Queue table and SLA warning actions. |
| OutletScopeSwitcher | Outlet selector shown only for users with `ALL` scope. |
| FeedbackBarcodePage | Public feedback page for a specific outlet. |

## User Flow

```text
Login
  |
  v
Resolve Outlet Scope From Permission
  |
  +--> OWN scope: auto-bind to user outlet
  |
  +--> ALL scope: choose outlet
  |
  v
Open POS
  |
  +--> Overview (manager)
  |
  +--> Live Table Map (cashier / host)
  |        |
  |        +--> Select table
  |        +--> Open order drawer
  |        +--> Send invoice to Sales
  |
  +--> Reservation
           |
           +--> Reservation List
           |
           +--> Waiting List
                    |
                    +--> Seat guest
                    +--> Sync with Live Table Map
```

## Testing Strategy

### Manual Testing

1. Login as a user with multiple outlet access.
2. Verify only authorized outlets appear.
3. Open Overview and confirm KPI cards reflect the selected outlet.
4. Open Live Table Map and verify the gamified layout, table states, and order drawer behavior.
5. Drag or inspect layout objects where editing is enabled.
6. Create a reservation and confirm it appears in Reservation List.
7. Add a guest to Waiting List and verify SLA warnings.
8. Assign a table from Waiting List and confirm the table updates on Live Table Map.
9. Hand off a table order to Sales and verify invoice creation.
10. Confirm stock deduction and finance handoff happen after payment settlement.
11. Scan the outlet feedback barcode and submit feedback from the public page.

### Automated Testing

- POS outlet scope tests.
- Table state transition tests.
- Reservation lifecycle tests.
- Waiting list SLA tests.
- Invoice handoff integration tests.
- Feedback barcode routing tests.

## Technical Decisions

### Single Outlet Context Per Company

- **Decision**: Treat each company record as one outlet inside POS.
- **Reason**: It keeps the franchise model simple and consistent with the requested multi-company scope.
- **Trade-off**: Cross-company reports must be handled outside the POS surface.

### Gamified Live Table Surface

- **Decision**: Use the floor-layout visual language for Live Table Map.
- **Reason**: Staff already learn one spatial model for layout creation and can reuse that mental model during live operations.
- **Trade-off**: The canvas layer is more complex than a flat list UI.

### Sales as Billing Boundary

- **Decision**: Keep invoice and payment inside Sales, not POS.
- **Reason**: It preserves ownership boundaries and reduces duplicate transaction logic.
- **Trade-off**: POS must integrate cleanly with Sales handoff states.

### Public Feedback via Barcode

- **Decision**: Expose feedback through a public outlet-specific barcode or QR page.
- **Reason**: It is simple for guests and supports franchise separation.
- **Trade-off**: The public page needs careful validation and branding support.

## Risks and Open Questions

| Risk | Impact | Mitigation |
|---|---|---|
| Table map becomes too dense | Usability drops | Add zoom, room filters, and state layers. |
| Outlet scope leaks across franchises | High security risk | Enforce outlet-scoped RBAC everywhere. |
| Inventory handoff fails after payment | Stock mismatch | Make the sales-to-stock event idempotent. |
| Waiting list grows too large | Operational delays | Add SLA warnings and queue prioritization. |
| Feedback barcode is abused | Low quality data | Tie barcode to outlet and validate source constraints. |

### Open Questions

- Should Live Table Map support edit mode inside the same page, or only read-only live operations?
- Should waiting list prioritization support VIP or manual override policies per outlet?
- Should feedback branding be configurable per outlet or per franchise group?
