# POS Sales POS

> **Module:** POS -> Goods / Distributor Mode -> Sales POS
> **Sprint:** Draft Planning
> **Version:** 0.1.0
> **Status:** Draft
> **Last Updated:** April 2026

---

## Table of Contents

1. [Overview](#overview)
2. [What Needs to Change](#what-needs-to-change)
3. [Scope](#scope)
4. [Data Ownership and Integration](#data-ownership-and-integration)
5. [Business Rules](#business-rules)
6. [API Reference](#api-reference)
7. [Frontend Components](#frontend-components)
8. [Technical Decisions](#technical-decisions)
9. [Notes and Open Questions](#notes-and-open-questions)

---

## Overview

Sales POS is the goods/distributor branch inside the POS shell. It is the non-table menu path used for quick sale, basket, delivery or pickup, and returns or exchange. It is separate from the ERP Sales module, which still owns invoicing, payment capture, and settlement.

## What Needs to Change

- Add a goods-first POS menu tree that does not require table view.
- Support quick sale entry from barcode, search, or direct selection.
- Support a sales basket with pricing, discounts, and checkout preview.
- Support delivery or pickup as a fulfillment choice.
- Support returns or exchange as a post-sale operation.

## Scope

### In Scope

- Quick sale.
- Sales basket.
- Delivery / pickup.
- Returns / exchange.
- Shared product catalog projection.

### Out of Scope

- Table-based live operations.
- Reservation and waiting list.
- Floor layout editing.
- ERP Sales invoice and payment settlement implementation.

## Data Ownership and Integration

| Domain | Ownership | Notes |
|---|---|---|
| Sales POS draft | POS | Holds basket state and fulfillment choice. |
| Product selection | Master Data -> Product | Uses the goods/F&B product projection. |
| Invoice handoff | Sales | Final billing and settlement still belong to Sales. |
| Inventory deduction | Stock | Stock impact follows the selected product or its recipe detail. |

### Integration Boundary

- Sales POS should not own the accounting ledger.
- Sales POS may prepare checkout data, but Sales still completes invoice and payment.
- Goods flows must not require table, reservation, or floor context.
- Product changes should flow through the shared product projection.

## Business Rules

- Cashiers can switch between goods sale and F&B mode only if the outlet package allows it.
- Quick sale must be usable without a table.
- Returns or exchange should reference the original sale where possible.
- Inventory deduction follows the underlying product definition.

## API Reference

This module is a POS shell module and will call the existing Sales, Product, and Stock APIs.

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/pos/outlets/{outletId}/product-catalog` | pos.sales.view | Get the outlet product projection for sales POS. |
| POST | `/pos/outlets/{outletId}/sales-draft` | pos.sales.manage | Create a quick sale draft. |
| PUT | `/pos/outlets/{outletId}/sales-draft/{id}` | pos.sales.manage | Update basket items and fulfillment choice. |
| POST | `/pos/outlets/{outletId}/sales-draft/{id}/submit` | pos.sales.manage | Hand off the draft to Sales for invoicing. |

## Frontend Components

| Component | Purpose |
|---|---|
| QuickSalePanel | Fast entry surface for direct sales. |
| SalesBasketDrawer | Shows selected items, totals, and checkout actions. |
| FulfillmentSwitcher | Toggle between delivery and pickup. |
| ReturnsExchangeDialog | Handles return or exchange flow. |

## Technical Decisions

- **Keep Sales POS separate from ERP Sales**: The POS shell should only prepare the draft, not own the financial lifecycle.
- **Product projection stays shared**: Goods and F&B still use the same product master with type-specific behavior.
- **No table dependency**: Goods sales should work even when no floor or reservation exists.

## Notes and Open Questions

- Should Sales POS include cash drawer or payment instrument UI, or keep that in the ERP Sales module only?
- Should returns be handled from the POS shell or through the Sales module UI?
- Should delivery or pickup be visible in F&B mode too, or only in goods/distributor mode?
