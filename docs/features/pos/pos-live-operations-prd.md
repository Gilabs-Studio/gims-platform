# POS Live Operations PRD

> **Module:** POS -> Live Operations
> **Sprint:** Draft Planning
> **Version:** 0.2.0
> **Status:** Draft
> **Last Updated:** April 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Goals](#goals)
3. [Live Operations Scope](#live-operations-scope)
4. [POS Session Management](#pos-session-management)
5. [Order Lifecycle](#order-lifecycle)
6. [Order Types](#order-types)
7. [Payment Processing](#payment-processing)
8. [Kitchen Display System](#kitchen-display-system)
9. [Table Management](#table-management)
10. [Receipt and Printing](#receipt-and-printing)
11. [Stock Deduction Flow](#stock-deduction-flow)
12. [Discount and Promotion](#discount-and-promotion)
13. [Void and Return](#void-and-return)
14. [User Roles in POS Operations](#user-roles-in-pos-operations)
15. [Real-Time Requirements](#real-time-requirements)
16. [API Reference](#api-reference)
17. [Frontend Components](#frontend-components)
18. [Business Rules](#business-rules)
19. [Technical Decisions](#technical-decisions)
20. [Notes and Improvements](#notes-and-improvements)

---

## Overview

Live Operations covers everything that happens during an active POS session: opening a shift, creating and managing orders, processing payments, kitchen coordination, and closing the session with reconciliation. This document applies to both Goods (Mode A) and F&B (Mode B) operation modes.

## Goals

- Fast, intuitive order entry for cashiers and wait staff.
- Real-time order status tracking across devices.
- Accurate stock deduction (direct for STOCK, recipe explosion for RECIPE).
- Reliable payment processing with multi-payment support.
- End-of-shift reconciliation with cash drawer tracking.
- Kitchen-to-table coordination for F&B mode.

## Live Operations Scope

### In Scope

- POS session open/close with cash drawer.
- Order CRUD (create, modify, cancel, complete).
- Payment processing (cash, card, QRIS, multi-payment).
- Kitchen display and order routing.
- Table status management (F&B mode).
- Receipt generation and printing.
- Stock deduction on order completion.
- Basic discounts (item-level, order-level, percentage, fixed).
- Void and return with stock reversal.

### Out of Scope

- Loyalty point complex rules (see customer-loyalty-feedback.md).
- Multi-pricing / price lists (future sprint).
- Offline mode and sync (future sprint).
- Delivery / takeaway integration (future sprint).
- Reservation management (future sprint).

## POS Session Management

### Session Lifecycle

```
Open Session
    → Set opening cash balance
    → Assign cashier employee
    → Assign outlet (warehouse)
    → Session active
    
During Session
    → Create/manage orders
    → Process payments
    → Cash in/out events
    
Close Session
    → Count closing cash
    → System calculates expected cash
    → Variance = counted - expected
    → Generate shift report
    → Session closed
```

### Session Fields

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Session identifier |
| `outlet_id` | UUID | Warehouse (outlet) for this session |
| `employee_id` | UUID | Cashier/operator |
| `opened_at` | timestamptz | Session start |
| `closed_at` | timestamptz | Session end (nullable) |
| `opening_cash` | decimal | Starting cash amount |
| `closing_cash` | decimal | Counted cash at close |
| `expected_cash` | decimal | System-calculated expected |
| `cash_variance` | decimal | Difference |
| `status` | enum | OPEN, CLOSED |

## Order Lifecycle

### Goods Mode (Mode A)

```
DRAFT → CONFIRMED → PAID → COMPLETED
                 ↘ VOIDED
```

1. **DRAFT**: Items added to cart. No stock impact.
2. **CONFIRMED**: Order confirmed. Stock check performed.
3. **PAID**: Payment processed. Stock deducted.
4. **COMPLETED**: Receipt generated. Final state.
5. **VOIDED**: Cancelled. Stock reversed if already deducted.

### F&B Mode (Mode B)

```
DRAFT → SENT_TO_KITCHEN → IN_PROGRESS → READY → SERVED → PAID → COMPLETED
                                                       ↘ VOIDED
```

1. **DRAFT**: Staff building order at table.
2. **SENT_TO_KITCHEN**: Order items routed to kitchen stations.
3. **IN_PROGRESS**: Kitchen preparing items.
4. **READY**: Items ready for pickup/serving.
5. **SERVED**: Items delivered to table.
6. **PAID**: Payment processed. Stock deducted.
7. **COMPLETED**: Table released. Final state.
8. **VOIDED**: Cancelled with manager approval.

### Order Fields

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Order identifier |
| `order_number` | string | Human-readable order number (auto-generated) |
| `session_id` | UUID | POS session reference |
| `outlet_id` | UUID | Outlet (warehouse) |
| `table_id` | UUID (nullable) | Table reference (F&B only) |
| `customer_id` | UUID (nullable) | Customer reference (optional) |
| `status` | enum | Order status |
| `subtotal` | decimal | Sum of line items |
| `discount_amount` | decimal | Total discount |
| `tax_amount` | decimal | Calculated tax |
| `service_charge` | decimal | Service charge (F&B) |
| `total` | decimal | Final amount |
| `notes` | text | Order-level notes |

### Order Line Item Fields

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Line item identifier |
| `order_id` | UUID | Parent order |
| `product_id` | UUID | Product reference |
| `product_kind` | string | Snapshot: STOCK, RECIPE, SERVICE |
| `quantity` | decimal | Ordered quantity |
| `unit_price` | decimal | Price at time of order |
| `discount_amount` | decimal | Item-level discount |
| `subtotal` | decimal | qty * unit_price - discount |
| `notes` | text | Item notes (e.g., "no ice") |
| `kitchen_status` | enum | PENDING, PREPARING, READY, SERVED |

## Order Types

| Type | Mode | Description |
|---|---|---|
| Dine-in | A, B | Standard in-store order |
| Takeaway | A, B | Customer takes items away |
| Counter | A | Quick sale without table |

## Payment Processing

### Supported Methods

| Method | Type | Notes |
|---|---|---|
| Cash | Offline | Change calculation |
| Debit/Credit Card | Online | Terminal integration (future) |
| QRIS | Online | QR code generation |
| Multi-payment | Mixed | Split across methods |

### Payment Flow

```
1. Calculate total (subtotal - discount + tax + service)
2. Select payment method(s)
3. For cash: Enter tendered amount, calculate change
4. For card/QRIS: Process via terminal/QR
5. For multi: Allocate amounts across methods
6. Verify total covered
7. Record payment, trigger stock deduction
8. Generate receipt
```

### Payment Fields

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Payment identifier |
| `order_id` | UUID | Order reference |
| `method` | enum | CASH, CARD, QRIS |
| `amount` | decimal | Amount for this method |
| `tendered` | decimal | Amount given (cash) |
| `change` | decimal | Change returned (cash) |
| `reference` | string | External reference (card/QRIS) |
| `status` | enum | PENDING, COMPLETED, FAILED |

## Kitchen Display System

### Kitchen Stations

| Station | Receives |
|---|---|
| Main Kitchen | Hot food items |
| Drink Bar | Beverages |
| Dessert | Desserts and pastries |
| Default | Unassigned items |

Station routing is based on product category mapping (configurable per outlet).

### Kitchen Ticket

```
┌────────────────────────┐
│ Order #POS-2026-0042   │
│ Table: A-3             │
│ Time: 14:23            │
│ ────────────────────── │
│ 2x Nasi Goreng Special │
│    > Extra spicy       │
│ 1x Es Teh Manis       │
│    > Less sugar        │
│ ────────────────────── │
│ Status: PREPARING      │
└────────────────────────┘
```

### KDS Flow

```
Order placed → Tickets created per station
  → Kitchen taps "Start" → IN_PROGRESS
  → Kitchen taps "Done" → READY
  → Staff taps "Served" → SERVED
```

## Table Management

### Table Status States

| Status | Color | Description |
|---|---|---|
| AVAILABLE | Green | Empty, ready for seating |
| OCCUPIED | Red | Guests seated, order in progress |
| RESERVED | Blue | Reserved for upcoming guest |
| CLEANING | Yellow | Being cleaned after guests left |

### Table Actions

| Action | From Status | To Status |
|---|---|---|
| Seat guests | AVAILABLE | OCCUPIED |
| Create order | OCCUPIED | OCCUPIED |
| Close order | OCCUPIED | CLEANING |
| Clean complete | CLEANING | AVAILABLE |
| Reserve | AVAILABLE | RESERVED |
| Cancel reservation | RESERVED | AVAILABLE |
| Walk-in on reserved | RESERVED | OCCUPIED |

## Receipt and Printing

### Receipt Template

```
┌──────────────────────────────┐
│       OUTLET NAME            │
│     Address Line 1           │
│     Phone: 021-xxx           │
│ ──────────────────────────── │
│ Receipt #: POS-2026-0042    │
│ Date: 2026-04-15 14:30      │
│ Cashier: John Doe            │
│ Table: A-3 (F&B only)       │
│ ──────────────────────────── │
│ 2x Nasi Goreng    Rp 70,000 │
│ 1x Es Teh          Rp 8,000 │
│ 1x Service Charge Rp 10,000 │
│ ──────────────────────────── │
│ Subtotal          Rp 88,000  │
│ Discount (10%)   -Rp  8,800  │
│ Tax (11%)         Rp  8,712  │
│ ──────────────────────────── │
│ TOTAL             Rp 87,912  │
│ ──────────────────────────── │
│ Cash             Rp 100,000  │
│ Change            Rp 12,088  │
│ ──────────────────────────── │
│    Thank you for visiting!   │
│      www.outlet.com          │
└──────────────────────────────┘
```

### Print Routing

| Receipt Type | Printer | Trigger |
|---|---|---|
| Customer receipt | Receipt printer | Payment completed |
| Kitchen ticket | Kitchen printer | Order sent to kitchen |
| Bar ticket | Bar printer | Drink items ordered |
| Shift report | Receipt printer | Session closed |

## Stock Deduction Flow

### On Order Confirmation (or Payment)

```
For each order line item:

  IF product_kind = STOCK:
    → StockMovement(OUT, product_id, outlet_warehouse_id, qty)
    → Reduce InventoryBatch (FIFO, FOR UPDATE lock)
    → Fail if insufficient stock

  IF product_kind = RECIPE:
    → Load recipe items from product_recipe_items
    → For each recipe_item:
        consumed_qty = recipe_item.quantity * order_qty
        → StockMovement(OUT, ingredient_product_id, outlet_warehouse_id, consumed_qty)
        → Reduce InventoryBatch per ingredient (FIFO, FOR UPDATE lock)
    → Fail if ANY ingredient insufficient → rollback all

  IF product_kind = SERVICE:
    → Skip stock deduction
```

### Stock Deduction Timing

- **Goods mode**: Deduct on payment confirmation.
- **F&B mode**: Deduct on payment confirmation (not on kitchen send).
- **Rationale**: Prevents double-deduction if order is modified between kitchen and payment.

## Discount and Promotion

### Discount Types

| Type | Level | Example |
|---|---|---|
| Percentage | Item | 10% off specific item |
| Fixed amount | Item | Rp 5,000 off item |
| Percentage | Order | 15% off total |
| Fixed amount | Order | Rp 50,000 off total |

### Discount Rules

- Item-level discounts applied before order-level.
- Tax calculated after all discounts.
- Maximum discount configurable per outlet.
- Manager override for exceeding maximum discount.

## Void and Return

### Void (Before Payment)

- Cancel order or remove items.
- No stock impact (stock not yet deducted).
- Requires reason.

### Void (After Payment)

- Requires manager approval.
- Stock reversal: StockMovement(IN) per deducted item.
- For RECIPE: Reverse ingredient-level movements.
- Payment reversal recorded.
- Original receipt marked as voided.

### Return

- Post-sale return within configurable window.
- Creates StockMovement(IN) with reference to original sale.
- Refund recorded.

## User Roles in POS Operations

| Role | Capabilities |
|---|---|
| Cashier | Open session, create orders, process payments, close session |
| Waiter/Staff | Create orders, modify orders, mark served |
| Kitchen Staff | View kitchen tickets, update preparation status |
| Shift Manager | Override discounts, approve voids, view reports |
| POS Admin | Configure outlet, manage floor layout, view all reports |

## Real-Time Requirements

| Feature | Technology | Priority |
|---|---|---|
| Kitchen order sync | WebSocket / SSE | High |
| Table status updates | WebSocket / SSE | High |
| Live order tracking | WebSocket / SSE | Medium |
| Multi-device sync | WebSocket | Medium |

### Fallback

- HTTP polling at 5-second intervals if WebSocket unavailable.
- Optimistic UI updates with server reconciliation.

## API Reference

### Session Endpoints

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| POST | `/pos/sessions/open` | pos.order.create | Open new POS session |
| POST | `/pos/sessions/:id/close` | pos.order.create | Close session with reconciliation |
| GET | `/pos/sessions/:id` | pos.order.read | Get session details |
| GET | `/pos/sessions/:id/report` | pos.order.read | Shift report |

### Order Endpoints

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| POST | `/pos/orders` | pos.order.create | Create order |
| GET | `/pos/orders/:id` | pos.order.read | Get order detail |
| PUT | `/pos/orders/:id` | pos.order.create | Update order (add/remove items) |
| POST | `/pos/orders/:id/confirm` | pos.order.create | Confirm order |
| POST | `/pos/orders/:id/void` | pos.order.create | Void order |
| GET | `/pos/orders?session_id=X` | pos.order.read | List orders for session |

### Payment Endpoints

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| POST | `/pos/orders/:id/pay` | pos.order.create | Process payment |
| GET | `/pos/orders/:id/receipt` | pos.order.read | Get receipt data |

### Kitchen Endpoints

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/pos/kitchen/tickets` | pos.order.read | Get kitchen tickets for station |
| PUT | `/pos/kitchen/tickets/:id/status` | pos.order.create | Update ticket status |

### Catalog Endpoints

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/pos/outlets/:id/product-catalog` | pos.order.read | Get outlet product catalog |
| GET | `/pos/outlets/:id/tables` | pos.floor.read | Get outlet tables with status |

## Frontend Components

### POS Main Screen

| Component | Purpose |
|---|---|
| POSLayout | Main POS screen layout (sidebar + main area) |
| OutletSelector | Select active outlet at session start |
| SessionPanel | Open/close shift, cash management |

### Order Components

| Component | Purpose |
|---|---|
| ProductCatalogGrid | Grid/list of available products with search |
| OrderCart | Current order with line items |
| OrderLineItem | Single item with qty, price, discount, notes |
| OrderSummary | Subtotal, discount, tax, total |
| OrderNotes | Order-level notes input |

### Payment Components

| Component | Purpose |
|---|---|
| PaymentDialog | Payment method selection and processing |
| CashPayment | Cash tendered + change calculator |
| CardPayment | Card terminal integration |
| QRISPayment | QR code display |
| MultiPayment | Split payment across methods |

### F&B Components

| Component | Purpose |
|---|---|
| FloorLayoutView | Visual table map (read-only for ordering) |
| TableStatusBadge | Color-coded table status |
| KitchenDisplay | Kitchen ticket board per station |
| KitchenTicket | Individual ticket with items and timer |

### Report Components

| Component | Purpose |
|---|---|
| ShiftReport | End-of-shift summary |
| SalesReport | Sales breakdown by product, category, payment |

## Business Rules

- Session must be open before creating orders.
- One active session per cashier per outlet at a time.
- Orders cannot be modified after payment.
- Void after payment requires manager approval.
- Stock check on confirmation, deduction on payment.
- Receipt auto-generated on payment completion.
- Cash variance tracked per session.
- Maximum discount threshold per outlet (configurable).
- Order number format: `POS-{YYYY}-{NNNN}` (per outlet, daily reset).

## Technical Decisions

- **Stock deduction on payment, not kitchen send**: Prevents phantom deductions when orders are modified.
- **Order number daily reset per outlet**: Keeps numbers short and readable.
- **Kitchen routing by category**: Simple and configurable. Avoids complex station-product mapping.
- **WebSocket for real-time**: Lower latency than polling. SSE as fallback.
- **Session-based cash tracking**: Industry standard for POS reconciliation.
- **Floor layout scope is outlet-based**: `pos_floor_plans` now uses `outlet_id` as source-of-truth to avoid layout collisions between outlets in the same company. Legacy `company_id` is kept only for backward compatibility and marked deprecated.
- **Active-session 404 treated as empty state**: Frontend normalizes `GET /pos/sessions/active` 404 into a no-session state so catalog and outlet selection remain usable.
- **POS catalog approval rules are strict**: catalog includes only active products with `status=approved`, `is_approved=true`, and `is_pos_available=true`; availability is evaluated by product kind (`STOCK` by warehouse stock, `RECIPE/SERVICE` available by design).

## Notes and Improvements

### Planned

- Offline mode with IndexedDB queue and background sync.
- Multi-printer support with ESC/POS protocol.
- Table merge/split for F&B.
- Order hold/recall for complex F&B scenarios.
- Delivery/takeaway order type with address management.
- Happy hour / time-based pricing.
- Barcode scanner integration for Goods mode.

### Known Limitations

- No offline support yet (requires internet connection).
- Single printer only (receipt printer).
- No reservation management.
- No delivery integration.
- Legacy clients that still submit floor plan payload by `company_id` rely on temporary fallback mapping to the first active outlet in that company.
