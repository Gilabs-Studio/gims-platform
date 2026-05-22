# Sales Module — E2E Scenario Design

> Status: 📝 Designed — Ready for team review

[← Back to E2E README](./README.md)

---

## Module Overview

The Sales module handles the full revenue cycle from quotation to payment collection. It integrates with Finance (auto-journal entries), Inventory (stock reservation/deduction), and CRM (customer data).

---

## Status Machines

### Sales Quotation (SQ)

```
draft ──→ sent ──→ approved ──→ converted
  ↑         │         │
  └─────────┴── rejected
```

| From | To | Trigger |
|------|-----|---------|
| draft | sent, approved, rejected | PATCH /status |
| sent | approved, rejected | PATCH /status |
| approved | converted | POST /convert-from-quotation |
| rejected | draft | PATCH /status (revision) |

### Sales Order (SO)

```
draft ──→ submitted ──→ approved ──→ closed
  ↑                        │
  └── rejected ←───────────┘
                           ↓
                       cancelled
```

| From | To | Trigger | Side Effects |
|------|-----|---------|-------------|
| draft | submitted, cancelled | PATCH /status | — |
| submitted | approved, rejected | POST /approve | **Stock reservation + credit limit check** |
| approved | closed, cancelled | PATCH /status | — |
| rejected | draft | PATCH /status | — |

### Delivery Order (DO)

```
draft ──→ sent ──→ approved ──→ prepared ──→ shipped ──→ delivered
  ↑                   │
  └── rejected ←──────┘
```

| From | To | Trigger | Side Effects |
|------|-----|---------|-------------|
| draft | sent, cancelled | PATCH /status | — |
| sent | approved, rejected | PATCH /status | — |
| approved | prepared, cancelled | PATCH /status | **COGS journal + stock deduction** |
| prepared | shipped, cancelled | POST /ship | — |
| shipped | delivered | POST /deliver | — |

### Customer Invoice

```
draft ──→ submitted ──→ approved ──→ unpaid ──→ paid
  ↑                        │          ↓
  └── rejected ←───────────┘     partial ──→ paid
                                     ↓
                                  reversed
```

| From | To | Trigger | Side Effects |
|------|-----|---------|-------------|
| draft | submitted, approved, cancelled | PATCH /status | — |
| submitted | approved, unpaid, rejected | POST /approve | — |
| approved | unpaid, partial, paid, cancelled, reversed | PATCH /status | **AR journal entry created** |
| unpaid | waiting_payment, partial, paid, cancelled, reversed | PATCH /status | — |
| paid | reversed | PATCH /status | — |

### Sales Payment

```
created (pending) ──→ confirmed ──→ reversed
```

| Action | Trigger | Side Effects |
|--------|---------|-------------|
| Create | POST /payments | Validates: invoice status, amount ≤ remaining, bank account active |
| Confirm | POST /payments/:id/confirm | **Payment journal created**, invoice status updated |
| Reverse | POST /payments/:id/reverse | **Journal reversed** |

### Sales Return

```
draft ──→ submitted ──→ processed
  ↑           │
  └── rejected
```

| From | To | Trigger | Side Effects |
|------|-----|---------|-------------|
| draft | submitted, rejected | PATCH /status | — |
| submitted | processed, rejected | PATCH /status | **Stock returned to warehouse** |
| rejected | draft | PATCH /status | — |

---

## Cross-Module Integrations

| Trigger | Target Module | What Happens |
|---------|--------------|--------------|
| SO approved | Inventory | Stock reserved for each item |
| SO approved | Finance | Credit limit check against customer |
| DO approved | Finance | COGS journal (debit COGS, credit Inventory) |
| DO approved | Inventory | Stock deducted from warehouse |
| Invoice approved | Finance | AR journal (debit Receivable, credit Revenue) |
| Payment confirmed | Finance | Payment journal (debit Bank, credit Receivable) |
| Return processed | Inventory | Stock returned to warehouse |

---

## E2E Workflows

### 1. Full Revenue Cycle (Happy Path)

**Goal:** Test the complete sales flow from quotation to payment collection.

```
Step 1:  POST /sales/sales-quotations          → Create SQ with items
Step 2:  PATCH /sales/sales-quotations/:id/status {status: "approved"}
Step 3:  POST /sales/sales-orders/convert-from-quotation {quotation_id}
Step 4:  PATCH /sales/sales-orders/:id/status {status: "submitted"}
Step 5:  POST /sales/sales-orders/:id/approve  → (reserves stock)
Step 6:  POST /sales/delivery-orders           → Create DO from SO
Step 7:  PATCH /sales/delivery-orders/:id/status {status: "sent"}
Step 8:  PATCH /sales/delivery-orders/:id/status {status: "approved"} → (COGS journal)
Step 9:  POST /sales/customer-invoices         → Create invoice from SO
Step 10: POST /sales/customer-invoices/:id/approve → (AR journal)
Step 11: POST /sales/payments                  → Create payment
Step 12: POST /sales/payments/:id/confirm      → (Payment journal)
```

**Checks:**
- [x] SQ created (201)
- [x] SQ approved (200)
- [x] SO created from quotation (201)
- [x] SO submitted (200)
- [x] SO approved (200)
- [x] DO created (201)
- [x] DO approved (200)
- [x] Invoice created (201)
- [x] Invoice approved (200)
- [x] Payment created (201)
- [x] Payment confirmed (200)

**Required setup data:** customerId, productId, paymentTermsId, salesRepId, businessUnitId, warehouseId, bankAccountId

---

### 2. Sales Return Flow (Happy Path)

**Goal:** Test the return/refund process after delivery.

```
Step 1:  Create a delivered SO + DO (reuse revenue cycle steps 1-8)
Step 2:  POST /sales/returns                   → Create return
Step 3:  PATCH /sales/returns/:id/status {status: "submitted"}
Step 4:  PATCH /sales/returns/:id/status {status: "processed"} → (stock returned)
```

**Checks:**
- [x] Return created (201)
- [x] Return submitted (200)
- [x] Return processed (200)

**Required setup data:** Delivered DO with items, warehouseId

---

### 3. Sales Visit Flow (Happy Path)

**Goal:** Test the field sales visit tracking.

```
Step 1:  POST /sales/sales-visits              → Create visit
Step 2:  POST /sales/sales-visits/:id/check-in → Check in at location
Step 3:  POST /sales/sales-visits/:id/check-out → Check out
```

**Checks:**
- [x] Visit created (201)
- [x] Check-in succeeded (200)
- [x] Check-out succeeded (200)

**Required setup data:** customerId (visit target), employeeId

---

### 4. Error: Invalid State Transition

**Goal:** Verify state machine rejects invalid transitions under load.

```
Step 1:  POST /sales/sales-orders              → Create SO (status: draft)
Step 2:  POST /sales/sales-orders/:id/approve  → Try approve without submitting
         Expected: 400 (INVALID_STATUS_TRANSITION)
```

**Checks:**
- [x] SO created (201)
- [x] Direct approve rejected (400) — "Order must be in sent status to approve"

**Uses:** `responseCallback: http.expectedStatuses({ min: 200, max: 499 })`

---

### 5. Error: Credit Limit Exceeded

**Goal:** Verify credit control prevents over-selling to a customer.

```
Step 1:  Create SO with very high amount (e.g., 999,999,999,999)
Step 2:  PATCH /status {status: "submitted"}
Step 3:  POST /approve
         Expected: 400 (credit limit exceeded)
```

**Checks:**
- [x] SO created (201)
- [x] SO submitted (200)
- [x] Approve rejected due to credit limit (400)

**Note:** Requires a customer with a configured credit limit. If no credit limit is set, this test may pass (approve succeeds). Verify with team.

---

### 6. Error: Payment Exceeds Remaining Amount

**Goal:** Verify payment validation prevents overpayment.

```
Step 1:  Create approved invoice (reuse revenue cycle steps 1-10)
Step 2:  POST /sales/payments {amount: invoice_total * 2}
         Expected: 400/409 (amount exceeds remaining)
```

**Checks:**
- [x] Invoice approved (200)
- [x] Overpayment rejected (400/409)

---

### 7. Verify: Invoice Approve Creates AR Journal

**Goal:** Verify finance integration — AR journal auto-created on invoice approval.

```
Step 1:  Create + approve invoice (reuse revenue cycle steps 1-10)
Step 2:  GET /finance/journal-entries?reference_type=SALES_INVOICE&reference_id={invoiceId}
Step 3:  Verify journal exists with status "posted"
Step 4:  Verify debit total = credit total = invoice amount
```

**Checks:**
- [x] Invoice approved (200)
- [x] Journal entry exists for this invoice
- [x] Journal is balanced (debit = credit)
- [x] Journal status is "posted"

---

### 8. Verify: DO Approve Creates COGS Journal

**Goal:** Verify finance + inventory integration on delivery.

```
Step 1:  Create + approve DO (reuse revenue cycle steps 1-8)
Step 2:  GET /finance/journal-entries?reference_type=DELIVERY_ORDER&reference_id={doId}
Step 3:  Verify COGS journal exists
Step 4:  Verify debit (COGS) = credit (Inventory)
```

**Checks:**
- [x] DO approved (200)
- [x] COGS journal entry exists
- [x] Journal is balanced
- [x] Journal references correct DO

**Note:** Requires products with COGS configured. Verify with team if all products have COGS or only specific types.

---

## Dependencies & Prerequisites

| Data | Source | Required By |
|------|--------|-------------|
| customerId | setup() → GET /customer/customers | All flows |
| productId | setup() → GET /product/products | Revenue cycle, DO, Return |
| paymentTermsId | setup() → GET /master-data/payment-terms | SQ, SO |
| salesRepId | setup() → GET /organization/employees | SQ, SO |
| businessUnitId | setup() → GET /organization/business-units | SQ, SO |
| warehouseId | setup() → GET /warehouse/warehouses | DO, Return |
| bankAccountId | setup() → GET /finance/bank-accounts | Payment |

---

## Open Questions for Team

1. **Credit limit:** Is credit limit configured for seeded customers? If not, error case #5 won't trigger.
2. **COGS configuration:** Do all seeded products have COGS accounts mapped? If not, DO approval may not create a COGS journal.
3. **Stock availability:** Does SO approval fail if product has 0 stock? Or does it reserve negative?
4. **Payment auto-confirm:** Does payment auto-confirm on creation, or is explicit confirm required?
5. **DO batch requirement:** Is `inventory_batch_id` always required for DO items, or only for batch-tracked products?

---

## Related Docs

- [E2E README](./README.md) — Overall design decisions
- [K6 Workflows](../WORKFLOWS.md) — Current (legacy) workflow docs
- [Architecture](../ARCHITECTURE.md) — File structure
