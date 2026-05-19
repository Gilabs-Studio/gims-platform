# Workflows

> End-to-end business workflow documentation

[← Scenarios](./SCENARIOS.md) | [Configuration →](./CONFIGURATION.md)

---

## Overview

E2E workflows live in `k6/scenarios/e2e/` and simulate complete business processes. Unlike API scenarios (pure GET), workflows create real data and validate state transitions.

**Execution frequency:** Every 5th VU iteration (`__ITER % 5 === 0`)

---

## Revenue Cycle (`revenue-cycle.js`)

**Flow:** SQ → Approve → SO → Submit → Approve → Invoice → Approve → Payment

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Create SQ │───▶│ Approve  │───▶│Convert SO│───▶│ Submit SO│
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                                                       │
       ┌───────────────────────────────────────────────┘
       ▼
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│Approve SO│───▶│Create Inv│───▶│Approve Inv│───▶│  (DO*)   │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
```

*DO (Delivery Order) is conditional — requires inventory batch data.

**Steps:**
1. `POST /sales/sales-quotations` — Create SQ with items
2. `PATCH /sales/sales-quotations/:id/status` — Approve SQ (status: "approved")
3. `POST /sales/sales-orders/convert-from-quotation` — Convert SQ to SO
4. `PATCH /sales/sales-orders/:id/status` — Submit SO (status: "submitted")
5. `POST /sales/sales-orders/:id/approve` — Approve SO
6. `POST /sales/delivery-orders` — Create DO (conditional: needs batchId)
7. `POST /sales/customer-invoices` — Create Invoice
8. `POST /sales/customer-invoices/:id/approve` — Approve Invoice
9. Payment verification (auto-created on invoice approval)

**Required setup data:** customerId, productId, paymentTermsId, salesRepId, businessUnitId, warehouseId, bankAccountId, batchId (optional)

**Checks:** SQ created, SQ approved, SO created, SO sent, SO approved, DO created, Invoice created, Invoice approved, Payment idempotency

---

## Purchase Cycle (`purchase-cycle.js`)

**Flow:** PO → Submit → Approve → GR → Confirm

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Create PO│───▶│ Submit PO│───▶│Approve PO│───▶│ Create GR│───▶│Confirm GR│
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
```

**Steps:**
1. `POST /purchase/purchase-orders` — Create PO with items
2. `POST /purchase/purchase-orders/:id/submit` — Submit PO
3. `POST /purchase/purchase-orders/:id/approve` — Approve PO
4. `GET /purchase/purchase-orders/:id` — Fetch PO detail (get item IDs)
5. `POST /purchase/goods-receipt` — Create GR with purchase_order_item_id
6. `POST /purchase/goods-receipt/:id/confirm` — Confirm GR

**Required setup data:** supplierId, warehouseId, paymentTermsId, productId

**Checks:** PO created, PO submitted, PO approved, GR created, GR confirmed

---

## Journal Entry (`journal-entry.js`)

**Flow:** Create → Post

```
┌──────────────┐    ┌──────────┐
│Create Journal│───▶│   Post   │
└──────────────┘    └──────────┘
```

**Steps:**
1. `POST /finance/journal-entries` — Create balanced journal (debit = credit)
2. `POST /finance/journal-entries/:id/post` — Post the journal

**Required setup data:** companyId, coaDebitId, coaCreditId (EXPENSE/REVENUE type only — trade control accounts are restricted)

**Checks:** Journal created, Debit = Credit, JE submitted

**Important:** COA entries must be EXPENSE, REVENUE, or EQUITY type. AR/AP/Inventory accounts are restricted for manual journals.

---

## Attendance Check-in (`attendance-checkin.js`)

**Flow:** Manual Entry + Leave Request

```
┌────────────────┐    ┌───────────────┐
│Manual Attendance│    │ Leave Request │
└────────────────┘    └───────────────┘
```

**Steps:**
1. `POST /hrd/attendance/manual` — Create manual attendance entry
   - Uses random past date (30-395 days back) to avoid collisions
   - Requires: employee_id, date, check_in_time, check_out_time, check_in_type: "NORMAL", status: "PRESENT"
2. `POST /hrd/leave-requests/self` — Create leave request (self-service)
   - Uses random future date (30-395 days ahead) to avoid collisions
   - Requires: leave_type_id, start_date, end_date, duration: "FULL_DAY", reason (min 10 chars)

**Required setup data:** employeeId, leaveTypeId

**Checks:** Clock-in succeeded, Leave request created

**Note:** Clock-in uses manual entry (admin endpoint) instead of self-service clock-in because the self-service endpoint requires GPS within office radius.

---

## Dashboard Overview (`dashboard-overview.js`)

**Flow:** Single aggregation call

```
┌──────────────────┐
│ Dashboard Overview│
└──────────────────┘
```

**Steps:**
1. `GET /general/dashboard/overview` — Fetch dashboard aggregation

**Required setup data:** None (uses authenticated user context)

**Checks:** None (profiled for latency only)

---

## Workflow Execution Rules

1. **Frequency:** Workflows run every 5th iteration (`__ITER % 5 === 0`)
2. **Conditional:** Each workflow checks if required IDs are available (not "SETUP_MISSING")
3. **Non-destructive:** Workflows create data but never delete it
4. **Tagged:** All HTTP calls within workflows carry `tier: "workflow"` tag
5. **Fail-safe:** If a step fails, subsequent steps are skipped (early return)

---

## Known Limitations

| Workflow | Issue | Root Cause |
|----------|-------|------------|
| Revenue Cycle | Payment always 409 | Invoice approval auto-creates payment |
| Revenue Cycle | DO skipped | No inventory batch data in DB |
| Attendance | ~0-49% success | Permission-limited + date collisions |
| Leave | ~0-27% success | Permission-limited + date collisions |
| Purchase | ~20-30% success | Only admin role has create permission |

---

## Related Docs

- [Scenarios](./SCENARIOS.md) — API scenario files
- [Methodology](./METHODOLOGY.md) — Tier system and tagging
- [Configuration](./CONFIGURATION.md) — Setup data and credentials
