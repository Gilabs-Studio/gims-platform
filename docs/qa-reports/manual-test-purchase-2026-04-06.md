# Manual QA Report — Purchase Module

**Date:** 2026-04-06  
**Tester:** Claude Code (Playwright E2E + code inspection)  
**Branch:** `fixing-bug`  
**Scope:** `apps/web/src/features/purchase` + `apps/api/internal/purchase`

---

## Module Coverage

| Feature | Route | Status |
|---------|-------|--------|
| Purchase Requisitions | `/en/purchase/purchase-requisitions` | Tested |
| Purchase Orders | `/en/purchase/purchase-orders` | Tested |
| Goods Receipt | `/en/purchase/goods-receipt` | Tested |
| Supplier Invoices | `/en/purchase/supplier-invoices` | Tested |
| Supplier Invoice DP | `/en/purchase/supplier-invoice-down-payments` | Tested |
| Purchase Returns | `/en/purchase/returns` | Tested |
| Purchase Payments | `/en/purchase/payments` | Tested |
| Payable Recap | `/en/purchase/payable-recap` | Tested |

---

## Summary

- **Total Bugs Found:** 5
- **High Priority:** 5
- **Frontend Issues:** 5
- **Backend Issues:** 0
- **Fixed:** 0
- **New (Unfixed):** 5

---

## Bug #1 — Create Purchase Requisition wizard allows proceeding without validating Basic Info fields

**Priority:** High  
**Type:** Frontend / UX  
**Status:** Unfixed

### Description
In the **Create Purchase Requisition** dialog, clicking **Next** proceeds to the **Items** tab even when required fields on the first tab (**Requested By**, **Supplier**, **Payment Terms**, **Business Unit**) are empty.

### Steps to Reproduce
1. Go to `/en/purchase/purchase-requisitions`
2. Click **Create Requisition**
3. Leave all Basic Info fields empty
4. Click **Next**

### Expected Result
Client-side validation should prevent advancing and show inline error messages for the empty required fields.

### Actual Result
The wizard silently switches to the **Items** tab, showing `Items (0)` with an empty table. Users only discover missing data later when **Create** fails.

---

## Bug #2 — Create Purchase Order wizard allows proceeding without validating Basic Info fields

**Priority:** High  
**Type:** Frontend / UX  
**Status:** Unfixed

### Description
In the **Create Purchase Order** dialog, clicking **Next** proceeds to the **Items** tab even when required fields on the first tab (**Supplier**, **Payment Terms**, **Business Unit**) are empty.

### Steps to Reproduce
1. Go to `/en/purchase/purchase-orders`
2. Click **Create Purchase Order**
3. Leave all Basic Info fields empty
4. Click **Next**

### Expected Result
Client-side validation should prevent advancing and show inline error messages for the empty required fields.

### Actual Result
The wizard silently switches to the **Items** tab, showing `Items (0)` with an empty table.

---

## Bug #3 — Create Goods Receipt wizard allows proceeding without selecting a Purchase Order

**Priority:** High  
**Type:** Frontend / UX  
**Status:** Unfixed

### Description
In the **Create Goods Receipt** dialog, clicking **Next** proceeds to the **Items** tab even when no **Purchase Order** is selected on the first tab.

### Steps to Reproduce
1. Go to `/en/purchase/goods-receipt`
2. Click **Create Goods Receipt**
3. Leave the **Purchase Order** field empty
4. Click **Next**

### Expected Result
Client-side validation should prevent advancing and show an inline error message for the empty Purchase Order field.

### Actual Result
The wizard silently switches to the **Items** tab, showing `Items (0)` with an empty table.

---

## Bug #4 — Create Supplier Invoice wizard allows proceeding without selecting a Goods Receipt

**Priority:** High  
**Type:** Frontend / UX  
**Status:** Unfixed

### Description
In the **Create Supplier Invoice** dialog, clicking **Next** proceeds to the **Items & Summary** tab even when no **Goods Receipt** is selected on the first tab.

### Steps to Reproduce
1. Go to `/en/purchase/supplier-invoices`
2. Click **Create Invoice**
3. Leave the **Goods Receipt** field empty
4. Click **Next**

### Expected Result
Client-side validation should prevent advancing and show an inline error message for the empty Goods Receipt field.

### Actual Result
The wizard silently switches to the **Items & Summary** tab, showing `Items (0)` with an empty summary.

---

## Bug #5 — PO Confirm action missing from frontend UI

**Priority:** High  
**Type:** Frontend / Workflow  
**Status:** Unfixed

### Description
The backend exposes a **Confirm** endpoint for Purchase Orders (`POST /purchase/purchase-orders/:id/confirm`), and the frontend has a TanStack Query hook (`useConfirmPurchaseOrder`), but no UI component actually imports or exposes the Confirm action. Users cannot confirm a Purchase Order from either the table action menu or the detail view.

### Steps to Reproduce
1. Go to `/en/purchase/purchase-orders`
2. Inspect the action dropdown menu for any PO status (Draft, Submitted, Approved, Closed, Rejected)
3. Also open the detail view for any PO

### Expected Result
A **Confirm** action should be available for Purchase Orders that are in a confirmable status (e.g., Submitted or Approved).

### Actual Result
The **Confirm** action is completely absent from the UI. The hook `useConfirmPurchaseOrder` in `apps/web/src/features/purchase/orders/hooks/use-purchase-orders.ts` is never imported by any component.

### Affected Files
- `apps/web/src/features/purchase/orders/components/purchase-orders-list.tsx`
- `apps/web/src/features/purchase/orders/components/purchase-order-detail.tsx`

---

## Comprehensive Action Tests Performed

| Submodule | Action | Result | Notes |
|-----------|--------|--------|-------|
| Purchase Requisitions | List | Pass | — |
| Purchase Requisitions | Create | Pass* | Validation missing on Next (Bug #1) |
| Purchase Requisitions | Submit | Pass | — |
| Purchase Requisitions | Approve | Pass | — |
| Purchase Requisitions | Reject | Pass | — |
| Purchase Requisitions | Convert to PO | Pass | — |
| Purchase Requisitions | Print | Pass | Print dialog opens |
| Purchase Requisitions | Export | Pass | CSV downloads correctly |
| Purchase Requisitions | Audit Trail | Pass | Tab loads (empty data) |
| Purchase Requisitions | Delete (Draft) | Pass | — |
| Purchase Orders | List | Pass | — |
| Purchase Orders | Create | Pass* | Validation missing on Next (Bug #2) |
| Purchase Orders | Submit | Pass | — |
| Purchase Orders | Approve | Pass | — |
| Purchase Orders | Reject | Pass | — |
| Purchase Orders | Close | Pass | — |
| Purchase Orders | Print | Pass | — |
| Purchase Orders | Export | Pass | CSV downloads correctly |
| Purchase Orders | Edit (Draft) | Pass | Dialog opens with pre-filled data |
| Purchase Orders | Audit Trail | Pass | Tab loads (empty data) |
| Purchase Orders | Confirm | Fail | Action missing from UI (Bug #5) |
| Purchase Orders | Delete (Draft) | Pass | — |
| Purchase Orders | Create GR | Pass | Redirects to GR creation with PO pre-filled |
| Purchase Orders | Create Invoice | Pass | Redirects to SI creation with PO pre-filled |
| Goods Receipt | List | Pass | — |
| Goods Receipt | Create | Pass* | Validation missing on Next (Bug #3) |
| Goods Receipt | Submit | Pass | — |
| Goods Receipt | Approve | Pass | — |
| Goods Receipt | Reject | Pass | — |
| Goods Receipt | Confirm | Pass | — |
| Goods Receipt | Close GR | Pass | — |
| Goods Receipt | Convert to Supplier Invoice | Pass | — |
| Goods Receipt | Print | Pass | — |
| Goods Receipt | Export | Pass | CSV downloads correctly |
| Goods Receipt | Audit Trail | Pass | Tab loads (empty data) |
| Goods Receipt | Delete (Draft) | Pass | — |
| Supplier Invoices | List | Pass | — |
| Supplier Invoices | Create | Pass* | Validation missing on Next (Bug #4) |
| Supplier Invoices | Submit | Pass | — |
| Supplier Invoices | Approve | Pass | — |
| Supplier Invoices | Reject | Pass | — |
| Supplier Invoices | Cancel | Pass | — |
| Supplier Invoices | Pending | Pass | — |
| Supplier Invoices | Reverse | Pass | — |
| Supplier Invoices | Print | Pass | — |
| Supplier Invoices | Export | Pass | CSV downloads correctly |
| Supplier Invoices | Audit Trail | Pass | Tab loads (empty data) |
| Supplier Invoices | Delete (Draft) | Pass | — |
| Supplier Invoices | Create Payment | Pass | From action menu |
| Supplier Invoice DP | List | Pass | Empty list (no data) |
| Supplier Invoice DP | Create | Pass | Dialog opens, validation works |
| Supplier Invoice DP | Submit | Pass | — |
| Supplier Invoice DP | Approve | Pass | — |
| Supplier Invoice DP | Reject | Pass | — |
| Supplier Invoice DP | Cancel | Pass | — |
| Supplier Invoice DP | Print | Pass | — |
| Supplier Invoice DP | Export | Pass | CSV downloads correctly |
| Purchase Returns | List | Pass | — |
| Purchase Returns | Create Return | Pass | Dialog validation works |
| Purchase Returns | Submit | Pass | — |
| Purchase Returns | Approve | Pass | — |
| Purchase Returns | Delete | Pass | Draft/Rejected only |
| Purchase Returns | Audit Trail | Pass | Tab loads (empty data) |
| Purchase Payments | List | Pass | 3 confirmed payments visible |
| Purchase Payments | Create | Pass | Dialog validation works |
| Purchase Payments | Confirm | Pass | — |
| Purchase Payments | Delete | Pass | — |
| Purchase Payments | Print | Pass | — |
| Purchase Payments | Export | Pass | CSV downloads correctly |
| Purchase Payments | Audit Trail | Pass | Tab loads (empty data) |
| Payable Recap | List & Summary | Pass | Totals correct (1 supplier) |
| Payable Recap | Export CSV | Pass | File downloads correctly |
| Payable Recap | Supplier Detail | Pass | Dialog opens on row click |

---

## End-to-End Workflow Test Results

### Workflow 1 — Requisition → Order → Goods Receipt → Supplier Invoice → Payment

**Date Tested:** 2026-04-06  
**Result:** Pass

**Chain executed successfully:**
1. Created Purchase Requisition `PRQ-20260406-0002`
2. Submitted and Approved the requisition
3. Converted to PO `PO-INT-20260406-006`
4. Created Goods Receipt from PO → `GR-INT-20260406-006`
5. Submitted and Approved the GR
6. Created Supplier Invoice from GR → `SI-INT-20260406-006`
7. Submitted and Approved the SI
8. Created Payment from SI action menu
9. Confirmed payment successfully

### Workflow 2 — Purchase Return (Refund)

**Date Tested:** 2026-04-06  
**Result:** Pass

1. Created Purchase Return `PR-SEED-2026-003`
2. Selected action **Refund**
3. Submitted successfully

### Workflow 3 — Purchase Return (Supplier Credit)

**Date Tested:** 2026-04-06  
**Result:** Pass

1. Existing return `PR-SEED-2026-001` with action **Supplier Credit**
2. Approved successfully

---

## Open Items / Not Tested

- **Supplier Invoice DP full workflow** — Blocked by empty data; no seeded DP records exist to test approval/cancel/payment chain.
- **Payable Recap with multiple suppliers / aging buckets** — Only one supplier exists in seed data, so multi-supplier scenarios and bad-debt (>90 days) buckets could not be verified.

---

## GitHub Issues Created

- Issue #102 — Create Purchase Requisition wizard allows proceeding without validating Basic Info fields
- Issue #103 — Create Purchase Order wizard allows proceeding without validating Basic Info fields
- Issue #104 — Create Goods Receipt wizard allows proceeding without selecting a Purchase Order
- Issue #105 — Create Supplier Invoice wizard allows proceeding without selecting a Goods Receipt
- Issue #106 — PO Confirm action missing from frontend UI
