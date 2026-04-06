# Sales POS PRD (Goods / Distributor Branch)

> **Module:** POS -> Sales -> Goods Mode
> **Sprint:** Draft Planning
> **Version:** 0.2.0
> **Status:** Draft
> **Last Updated:** April 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Target Users](#target-users)
3. [Workflow](#workflow)
4. [Product Handling](#product-handling)
5. [Cart and Checkout](#cart-and-checkout)
6. [Payment](#payment)
7. [Stock Deduction](#stock-deduction)
8. [Receipt](#receipt)
9. [Returns and Voids](#returns-and-voids)
10. [Reports](#reports)
11. [API Reference](#api-reference)
12. [Frontend Components](#frontend-components)
13. [Business Rules](#business-rules)
14. [Integration Points](#integration-points)
15. [Technical Decisions](#technical-decisions)
16. [Notes and Improvements](#notes-and-improvements)

---

## Overview

Sales POS Goods Mode (Mode A) is the traditional cash-register POS for retail shops, pharmacies, distributors, and small stores selling physical STOCK products. It uses a simple cart-and-pay workflow without floor layout, table management, or kitchen operations.

This mode shares the same backend infrastructure as F&B Mode (Mode B) but provides a streamlined UI optimized for quick scanning and checkout.

## Target Users

| Role | Description |
|---|---|
| Cashier | Primary operator, scans/searches items, processes payments |
| Shift Manager | Opens/closes shifts, approves voids, views reports |
| Store Admin | Configures outlet, manages product visibility |

## Workflow

```
1. Cashier opens shift (POS Session)
   → Set opening cash balance
   → Assign to outlet (warehouse where is_pos_outlet=true)

2. Customer arrives
   → Cashier scans barcode or searches product
   → Products added to cart
   → Quantities adjusted

3. Checkout
   → Apply discounts (item or order level)
   → Calculate total (subtotal - discount + tax)
   → Select payment method

4. Payment
   → Cash: tender amount, calculate change
   → Card/QRIS: process via terminal
   → Multi-payment: split across methods

5. Completion
   → Stock deducted from outlet warehouse
   → Receipt generated and printed
   → Customer loyalty points (optional)

6. End of shift
   → Count cash drawer
   → System calculates expected cash
   → Record variance
   → Generate shift report
```

## Product Handling

### Supported Product Kinds in Goods Mode

| Product Kind | Usage | Stock Behavior |
|---|---|---|
| STOCK | Primary (goods, retail items) | Direct inventory deduction |
| RECIPE | Supported (bundled items) | Recipe ingredient explosion |
| SERVICE | Supported (delivery fees, etc.) | No stock impact |

### Product Search

- **Barcode scan**: Matches product.code (exact).
- **Text search**: Prefix search on product.name and product.code.
- **Category filter**: Filter by product category.
- **Index**: GIN index with pg_trgm for text search performance.

### Catalog Filtering

```
WHERE is_pos_available = true
  AND is_active = true
  AND is_approved = true
  AND status = 'APPROVED'
```

## Cart and Checkout

### Cart Line Item

| Field | Description |
|---|---|
| product_id | Selected product |
| product_name | Display name (snapshot) |
| product_kind | STOCK / RECIPE / SERVICE |
| quantity | Ordered quantity |
| unit_price | Price at time of sale |
| discount_type | PERCENTAGE or FIXED |
| discount_value | Discount amount or percentage |
| subtotal | qty * unit_price - discount |
| notes | Optional item notes |

### Checkout Summary

```
Subtotal:     SUM(line_item.subtotal)
Discount:     Order-level discount (if any)
Tax:          (Subtotal - Discount) * tax_rate
Total:        Subtotal - Discount + Tax
```

## Payment

### Methods

| Method | Notes |
|---|---|
| Cash | Tender and change calculation |
| Debit/Credit Card | Terminal integration (future) |
| QRIS | QR code generation |
| Multi-payment | Split across 2+ methods |

### Cash Payment Flow

```
Total due:    Rp 87,500
Tendered:     Rp 100,000
Change:       Rp  12,500
```

## Stock Deduction

### Deduction on Payment Confirmation

```
For each cart item:

  STOCK kind:
    StockMovement(type=OUT, product_id, warehouse_id, qty)
    InventoryBatch.quantity -= qty (FIFO, FOR UPDATE lock)
    Reject if insufficient balance

  RECIPE kind:
    For each recipe_item:
      consumed = recipe_item.quantity * cart_qty
      StockMovement(type=OUT, ingredient_product_id, warehouse_id, consumed)
      InventoryBatch.quantity -= consumed (FIFO, FOR UPDATE lock)
    Reject if ANY ingredient insufficient

  SERVICE kind:
    No stock movement
```

### Batch Selection (FIFO)

- Select oldest non-zero batches first.
- Row-level lock (`FOR UPDATE`) to prevent race conditions.
- Deduct across multiple batches if single batch insufficient.

## Receipt

### Fields

```
Outlet name, address, phone
Receipt number (POS-{YYYY}-{NNNN})
Date and time
Cashier name
─────────────
Line items (qty x price, discount, subtotal)
─────────────
Subtotal
Discount
Tax
TOTAL
─────────────
Payment method and amount
Change (if cash)
─────────────
Footer message
```

## Returns and Voids

### Void (Before Payment)

- Remove items or cancel order.
- No stock impact.
- No approval needed.

### Void (After Payment)

- Manager approval required.
- Stock reversal: StockMovement(IN) per item.
- Payment reversal recorded.
- Receipt marked void.

### Return

- Within configurable return window.
- StockMovement(IN) with original sale reference.
- Refund to original payment method.

## Reports

### Shift Report

| Metric | Description |
|---|---|
| Total sales | Sum of completed orders |
| Transaction count | Number of orders |
| Payment breakdown | By method (cash, card, QRIS) |
| Opening cash | Starting cash amount |
| Expected cash | Opening + cash sales - cash returns |
| Counted cash | Actual cash count |
| Variance | Counted - Expected |
| Void count | Number of voided orders |

### Daily Sales Report

| Metric | Description |
|---|---|
| Revenue | Total sales amount |
| Cost of goods | Based on cost_price (STOCK) or recipe_cost (RECIPE) |
| Gross margin | Revenue - Cost |
| Top products | By quantity and revenue |
| Category breakdown | Sales per product category |

## API Reference

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| POST | `/pos/sessions/open` | pos.order.create | Open POS session |
| POST | `/pos/sessions/:id/close` | pos.order.create | Close with reconciliation |
| POST | `/pos/orders` | pos.order.create | Create order |
| PUT | `/pos/orders/:id` | pos.order.create | Update order |
| POST | `/pos/orders/:id/pay` | pos.order.create | Process payment |
| POST | `/pos/orders/:id/void` | pos.order.create | Void order |
| GET | `/pos/outlets/:id/product-catalog` | pos.order.read | Outlet catalog |
| GET | `/pos/sessions/:id/report` | pos.order.read | Shift report |

## Frontend Components

| Component | Purpose |
|---|---|
| GoodsPOSLayout | Main goods-mode POS screen |
| BarcodeScanner | Barcode input handler |
| ProductSearchBar | Prefix search with results |
| CartPanel | Right-side cart with line items |
| CartLineItem | Item row with qty +/- and remove |
| CheckoutSummary | Subtotal, discount, tax, total |
| PaymentDialog | Payment method selection |
| CashCalculator | Tender/change calculator |
| ReceiptPreview | Print preview of receipt |
| ShiftPanel | Open/close shift controls |

## Business Rules

- Session must be open to create orders.
- Product must pass catalog filter (active, approved, POS-available).
- Stock checked on order creation and again on payment.
- Maximum discount threshold per outlet.
- Manager approval for discounts exceeding threshold.
- Manager approval for post-payment voids.
- Receipt auto-printed on payment completion.
- Order number resets daily per outlet.

## Integration Points

| Module | Integration |
|---|---|
| Product | Read catalog, prices, product_kind |
| Stock | Write StockMovement, read InventoryBatch |
| Warehouse | Read outlet info |
| Customer | Optional loyalty points |
| Finance | Payment recording, revenue posting |
| Sales | Transaction record |

## Technical Decisions

- **Cart-based, not table-based**: Simpler workflow for retail. No table management overhead.
- **Same order model as F&B**: Shared backend order table with `table_id = null` for goods.
- **Barcode search on code field**: Exact match on product.code for fast scanning.
- **Receipt number daily reset**: `POS-{YYYY}-{NNNN}` is short, readable, and prevents large numbers.

## Notes and Improvements

### Planned

- Barcode scanner hardware integration (USB HID).
- Batch/lot selection for pharmaceutical compliance.
- Customer account / credit sales.
- Multi-outlet stock transfer from POS.
- Express checkout for single-item sales.

### Known Limitations

- No offline mode yet.
- No hardware barcode scanner integration (manual code entry only).
- No batch/lot selection (FIFO auto-applied).
