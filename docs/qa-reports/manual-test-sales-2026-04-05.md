# Manual QA Report — Sales Module

**Date:** 2026-04-05  
**Tester:** Claude Code (Playwright E2E + code inspection)  
**Branch:** `fixing-bug`  
**Scope:** `apps/web/src/features/sales` + `apps/api/internal/sales`

---

## Module Coverage

| Feature | Route | Status |
|---------|-------|--------|
| Quotations | `/en/sales/quotations` | Tested |
| Sales Orders | `/en/sales/orders` | Tested |
| Delivery Orders | `/en/sales/delivery-orders` | Tested |
| Customer Invoices | `/en/sales/invoices` | Tested |
| Customer Invoice DP | `/en/sales/customer-invoice-down-payments` | Tested |
| Payments | `/en/sales/payments` | Tested |
| Returns | `/en/sales/returns` | Tested |
| Receivables Recap | `/en/sales/receivables-recap` | Tested |

---

## Summary

- **Total Bugs Found:** 16
- **High Priority:** 9
- **Medium Priority:** 7
- **Backend Issues:** 3
- **Frontend Issues:** 13
- **Fixed:** 5
- **New (Unfixed):** 11

---

## Bug #1 — Raw Zod validation errors in Sales quotation form (and other sales schemas)

**Priority:** High  
**Type:** Frontend / UX  
**Status:** Fixed

### Description
When validating required dropdown fields in the **Add Quotation** dialog (and likely other sales forms), the user sees the raw Zod error message:

> `Invalid input: expected string, received undefined`

instead of a friendly message such as "Customer is required".

### Browser Evidence
1. Navigate to `/en/sales/quotations`
2. Click **Add Quotation**
3. Click **Next** without filling any fields
4. Observe inline alerts under Customer, Payment Terms, Sales Representative, and Business Unit:
   - `"Invalid input: expected string, received undefined"`

### Code Inspection
The affected schemas use `.uuid()` directly without a preceding `.min(1)` check:

- `apps/web/src/features/sales/quotation/schemas/quotation.schema.ts`
- `apps/web/src/features/sales/order/schemas/order.schema.ts`
- `apps/web/src/features/sales/invoice/schemas/invoice.schema.ts`
- `apps/web/src/features/sales/delivery/schemas/delivery.schema.ts`
- `apps/web/src/features/sales/returns/schemas/returns.schema.ts`

When the field value is `undefined`, Zod's `.uuid()` bypasses the custom error message and emits the raw default.

### Fix Applied
- Added `.min(1, getMsg(...))` **before** `.uuid(...)` on required UUID fields in:
  - `invoice.schema.ts` (`product_id`, `sales_order_id`, `payment_terms_id`, `due_date`)
  - `customer-invoice-dp.schema.ts` (`sales_order_id`)
  - `sales-return.schema.ts` (`product_id`, `delivery_id`, `warehouse_id`)
- Added missing `defaultValues` for required string fields in `use-quotation-form.ts` so empty values are `""` instead of `undefined`, ensuring `.min(1)` runs and shows friendly messages.
- Added translation support (`getMsg`) to `customer-invoice-dp.schema.ts` and `sales-return.schema.ts`.

---

## Bug #2 — "Add Invoice" wizard allows proceeding without validating Basic Information fields

**Priority:** High  
**Type:** Frontend / UX  
**Status:** Fixed

### Description
In the **Add Invoice** dialog, clicking **Next** proceeds to the "Items & Summary" tab even when required fields on the first tab (e.g. **SO**, **Due Date**) are empty.

### Steps to Reproduce
1. Go to `/en/sales/invoices`
2. Click **Add Invoice**
3. Leave the **SO** and **Due Date** fields empty
4. Click **Next**

### Expected Result
Client-side validation should prevent advancing and show inline error messages for the empty required fields.

### Actual Result
The wizard silently switches to the "Items & Summary" tab. Users only discover missing data later when Create fails.

### Fix Applied
- Made `sales_order_id`, `due_date`, and `payment_terms_id` required in `getInvoiceSchema` (with `.min(1)` + `.uuid()`).
- Updated `use-invoice-form.ts` create-mode `defaultValues` to initialize `sales_order_id: ""` and `due_date: ""` so Zod validation fires correctly on the Basic Information tab before allowing the tab switch.

---

## Bug #3 — Missing error-toast feedback on failed Sales mutations

**Priority:** Medium  
**Type:** Frontend / UX  
**Status:** Fixed

### Description
Multiple TanStack Query mutation hooks across the Sales module do not define an `onError` handler. When a backend request fails (network error, 500, validation error, etc.), the user sees **no toast or feedback** — the UI simply stays idle.

### Affected Files (code inspection)
- `apps/web/src/features/sales/quotation/hooks/use-quotations.ts`
- `apps/web/src/features/sales/order/hooks/use-orders.ts`
- `apps/web/src/features/sales/invoice/hooks/use-invoices.ts`
- `apps/web/src/features/sales/delivery/hooks/use-deliveries.ts`
- `apps/web/src/features/sales/payments/hooks/use-sales-payments.ts`
- `apps/web/src/features/sales/customer-invoice-down-payments/hooks/use-customer-invoice-dp.ts`
- `apps/web/src/features/sales/returns/hooks/use-sales-returns.ts`

### Fix Applied
- Added `onError` toast handlers using `getSalesErrorMessage(...)` to all TanStack Query mutations across the Sales module:
  - `use-quotations.ts` — create, update, delete, update status
  - `use-orders.ts` — create, update, delete, convert quotation
  - `use-invoices.ts` — create, update, delete, update status, approve
  - `use-deliveries.ts` — create, update, delete, update status, approve, ship, deliver, select batches
  - `use-sales-payments.ts` — create, delete, confirm
  - `use-customer-invoice-dp.ts` — create, update, delete, pending, approve
  - `use-sales-returns.ts` — create, update status, delete
- Existing `onError` handlers that only rolled back cache were updated to also show a toast.

---

## Bug #4 — Approved customer invoices lose action menu items

**Priority:** High  
**Type:** Frontend / Workflow  
**Status:** Fixed

### Description
After approving a customer invoice, the action dropdown menu (and detail-modal header buttons) only show **View** and **Print**. The expected actions — **Create Payment**, **Cancel Invoice**, and **Delete** — disappear, even though the invoice is functionally unpaid.

### Steps to Reproduce
1. Go to `/en/sales/invoices`
2. Create a new invoice and submit it
3. Approve the invoice (backend updates status to `APPROVED`)
4. Open the action menu (⋮) for the approved invoice

### Expected Result
- View
- Create Payment
- Cancel Invoice
- Print
- Delete

### Actual Result
Only View and Print are visible.

### Root Cause
The backend sets post-approve status to `APPROVED`. The frontend action checks in `invoice-list.tsx` and `invoice-detail-modal.tsx` looked for raw `"unpaid"`. `InvoiceStatusBadge` correctly normalizes `"approved"` → `"unpaid"` for display, but the action logic was never updated.

### Fix Applied
- `apps/web/src/features/sales/invoice/components/invoice-list.tsx`
- `apps/web/src/features/sales/invoice/components/invoice-detail-modal.tsx`
- Added `const normalizedStatus = status === "approved" ? "unpaid" : status;` and used `normalizedStatus` for all action visibility checks.

### Verification
- Playwright test on invoice `INV-20260405-0007` after approval confirmed all 5 actions now appear.
- Subsequently created and confirmed a payment for this invoice successfully.

---

## Bug #5 — Payment confirmation fails with 409 Conflict when invoice remaining_amount > amount

**Priority:** High  
**Type:** Backend / API  
**Status:** Fixed

### Description
Confirming a sales payment can return a `409 Conflict` even when the payment amount is valid. This happens when an invoice's `remaining_amount` is larger than its `amount` field (data inconsistency edge case), causing created payments to be permanently un-confirmable.

### Root Cause
In `apps/api/internal/sales/domain/usecase/sales_payment_usecase.go`:
- **Create** validates against `inv.RemainingAmount`
- **Confirm** validates against `invoice.Amount`

When these two values diverge, a payment can pass creation but fail confirmation.

### Fix Applied
Changed `ensurePaymentWithinInvoiceLimit` to compare `paymentAmount` against `invoice.RemainingAmount` instead of `invoice.Amount`, aligning confirm validation with create validation.

```go
// Before
func ensurePaymentWithinInvoiceLimit(confirmedTotal, paymentAmount, invoiceAmount float64) error

// After
func ensurePaymentWithinInvoiceLimit(paymentAmount, remainingAmount float64) error
```

---

## Bug #6 — Missing Reverse/Delete actions on Confirmed payments

**Priority:** High  
**Type:** Frontend / Workflow  
**Status:** Unfixed

### Description
All payments in the Sales → Payments list are in `Confirmed` status, yet their action dropdown menus only show **View** and **Print**. There is no way to **Reverse** or **Delete** a confirmed payment from the UI.

### Steps to Reproduce
1. Go to `/en/sales/payments`
2. Open the action menu (⋮) for any confirmed payment (e.g., `INV-20260405-0004`)

### Expected Result
- View
- Reverse
- Print
- Delete

### Actual Result
Only **View** and **Print** are visible.

---

## Bug #7 — CIDP missing Approve and Cancel actions in UI

**Priority:** High  
**Type:** Frontend / Workflow  
**Status:** Unfixed

### Description
Customer Invoice DP (CIDP) entries show statuses `Unpaid` and `Paid`, but there is no **Approve** action in the table action menu or detail-view dialog to transition a CIDP from `Submitted` → `Unpaid`. There is also no **Cancel** action for any CIDP entry.

### Steps to Reproduce
1. Go to `/en/sales/customer-invoice-down-payments`
2. Open the action menu (⋮) for `CIDP-20260405-0004` (status: `Unpaid`)
3. Also open the detail view and inspect the header buttons

### Expected Result
- Approve (for submitted/draft items)
- Cancel (for items that haven't been paid)

### Actual Result
Only **View**, **Print**, and **Create Payment** are visible. No Approve or Cancel actions exist anywhere in the CIDP UI.

---

## Bug #8 — Create Delivery Order: Batch field optional but validated as required

**Priority:** Medium  
**Type:** Frontend / UX  
**Status:** Unfixed

### Description
When converting a Sales Order to a Delivery Order, the **Batch** field is not marked with a red asterisk (indicating optional), but the backend returns a validation error if it is left empty.

### Steps to Reproduce
1. Go to `/en/sales/orders`
2. Click **Create DO** on an approved order
3. Leave **Batch** empty and click **Create**

### Expected Result
Either the field should be marked required, or the backend should allow empty values.

### Actual Result
A validation error is returned because Batch is required but not visually indicated as such.

---

## Bug #9 — Create Invoice from SO: Due Date and Payment Terms optional but validated as required

**Priority:** Medium  
**Type:** Frontend / UX  
**Status:** Unfixed

### Description
In the **Add Invoice** dialog (opened via **Create Invoice** from a Sales Order), the **Due Date** and **Payment Terms** fields are not marked with red asterisks, yet the backend validates both as required. This is inconsistent UX.

### Steps to Reproduce
1. Go to `/en/sales/orders`
2. Click **Create Invoice** on an approved order
3. Fill the SO but leave **Due Date** and **Payment Terms** empty
4. Click **Next** or **Create**

### Expected Result
Required fields should be visually marked with an asterisk.

### Actual Result
Validation fails for both fields despite them appearing optional.

---

## Bug #10 — Create Invoice from SO: Items not auto-populated from SO

**Priority:** Medium  
**Type:** Frontend / Workflow  
**Status:** Unfixed

### Description
When creating an invoice directly from a Sales Order, the **Items & Summary** tab shows an empty items table instead of pre-filling the rows from the selected SO.

### Steps to Reproduce
1. Go to `/en/sales/orders`
2. Click **Create Invoice** on an approved order with line items
3. Proceed to the **Items & Summary** tab

### Expected Result
The invoice items should be pre-populated with the products and quantities from the selected SO.

### Actual Result
The items table is completely empty; the user must manually re-add every item.

---

## Bug #11 — Create Invoice from SO: Internal server error (500) on Create

**Priority:** High  
**Type:** Backend / API  
**Status:** Unfixed

### Description
After filling all required fields in the **Add Invoice** dialog (opened from a Sales Order) and clicking **Create**, the server responds with a `500 Internal Server Error`, preventing invoice creation entirely.

### Steps to Reproduce
1. Go to `/en/sales/orders`
2. Click **Create Invoice** on an approved order
3. Fill **SO**, **Due Date**, and **Payment Terms**
4. Click **Create**

### Expected Result
Invoice is created successfully and linked to the SO.

### Actual Result
A `500 Internal Server Error` toast appears; no invoice is created.

---

## Bug #12 — Delete action missing on Cancelled customer invoices

**Priority:** Medium  
**Type:** Frontend / Workflow  
**Status:** Unfixed

### Description
Cancelled customer invoices do not show a **Delete** action in their dropdown menu (or detail-view header). Only **View** and **Print** are available.

### Steps to Reproduce
1. Go to `/en/sales/invoices`
2. Locate a cancelled invoice (status: `Cancelled`)
3. Open the action menu (⋮)

### Expected Result
- View
- Print
- Delete

### Actual Result
Only **View** and **Print** are visible. There is no way to remove a cancelled invoice from the UI.

---

## Bug #13 — Convert Quotation to SO throws 500 server error but partially succeeds

**Priority:** High  
**Type:** Backend / API  
**Status:** Unfixed

### Description
Clicking **Convert to SO** on an approved quotation returns a `500 Internal Server Error` toast. However, the Sales Order is actually created in the database (visible in the Sales Orders list), meaning the mutation is not idempotent and leaves the system in an inconsistent state if the user retries.

### Steps to Reproduce
1. Go to `/en/sales/quotations`
2. Create/submit/approve a quotation (e.g. `SQ-20260405-0002`)
3. Click **Convert to SO**

### Expected Result
Sales Order is created successfully with a `200/201` response.

### Actual Result
A `500 Internal Server Error` appears, yet a new Sales Order (`SO-20260406-XXXX`) is created and linked to the quotation.

---

## Bug #14 — Create Delivery Order from SO: Items not auto-populated

**Priority:** High  
**Type:** Frontend / Workflow  
**Status:** Unfixed

### Description
When opening the **Create Delivery Order** dialog from an approved Sales Order, the **Items** tab shows `Items (0)` and an empty table. The SO line items are not pre-filled, so the user cannot create a valid DO without manually re-adding products.

### Steps to Reproduce
1. Go to `/en/sales/orders`
2. Open an approved order with line items (e.g. `SO-20260406-0004`)
3. Click **Create DO** → proceed to the **Items** tab

### Expected Result
Items from the selected SO should appear in the table with quantities ready for delivery.

### Actual Result
The items table is empty (`Items (0)`), blocking DO creation.

---

## Bug #15 — Missing Edit/Update action on Returns

**Priority:** High  
**Type:** Frontend / Workflow  
**Status:** Unfixed

### Description
There is no **Edit** action available for Returns at any status. Once a return is created, the user cannot update its notes, quantities, or selected Delivery Order.

### Steps to Reproduce
1. Go to `/en/sales/returns`
2. Open the action menu (⋮) for any return (Draft, Submitted, Processed, or Rejected)

### Expected Result
An **Edit** action should be present for Draft/Submitted returns.

### Actual Result
No Edit action exists in the action menu or detail-view header for any return status.

---

## Bug #16 — Delete action missing on Processed returns

**Priority:** Medium  
**Type:** Frontend / Workflow  
**Status:** Unfixed

### Description
Processed returns only show a **View** action. There is no **Delete** option, even though the user may need to remove a mistakenly processed return.

### Steps to Reproduce
1. Go to `/en/sales/returns`
2. Locate a processed return
3. Open the action menu (⋮)

### Expected Result
- View
- Delete

### Actual Result
Only **View** is visible.

---

## Comprehensive Action Tests Performed

| Submodule | Action | Result | Notes |
|-----------|--------|--------|-------|
| Customer Invoices | Create | Pass | Created `INV-20260405-0007` |
| Customer Invoices | Submit | Pass | — |
| Customer Invoices | Approve | Pass | — |
| Customer Invoices | Create Payment | Pass | From action menu after fix |
| Customer Invoices | Cancel | Pass | Successfully cancelled invoice |
| Customer Invoices | Print | Pass | Print dialog opens |
| Customer Invoices | Delete (Cancelled) | Fail | Action missing (Bug #12) |
| Payments | Confirm | Pass | Confirmed payment for `INV-20260405-0007` |
| Payments | Reverse | Fail | Action missing (Bug #6) |
| Payments | Delete (Confirmed) | Fail | Action missing (Bug #6) |
| Customer Invoice DP | Submit | Pass | Submitted `CIDP-20260405-0004` |
| Customer Invoice DP | Create Payment | Pass | Existing DP `CIDP-20260405-0005` has pending payment |
| Customer Invoice DP | Approve | Fail | Action missing (Bug #7) |
| Customer Invoice DP | Cancel | Fail | Action missing (Bug #7) |
| Returns | List | Pass | 4 returns visible |
| Returns | Create Return | Pass | Created new return successfully |
| Returns | Submit | Pass | — |
| Returns | Process | Pass | — |
| Returns | Edit/Update | Fail | Action missing (Bug #15) |
| Returns | Delete (Processed) | Fail | Action missing (Bug #16) |
| Returns | View (Processed) | Pass | Only View available |
| Returns | View (Rejected) | Pass | View + Delete available |
| Receivables Recap | List & Summary | Pass | 3 customers, totals correct |
| Sales Orders | Create DO | Pass* | Works with new SO data; previously empty items on older SOs (Bug #14) |
| Sales Orders | Print | Pass | Verified in earlier pass |
| Sales Orders | Create Invoice | Pass* | Works with new SO data; items not auto-populated (Bug #10); 500 not reproduced on new data |
| Delivery Orders | Create from SO | Pass | With manual batch selection |
| Delivery Orders | Submit | Pass | — |
| Delivery Orders | Approve | Pass | — |
| Delivery Orders | Prepare | Pass | — |
| Delivery Orders | Ship | Pass | — |
| Quotations | Submit | Pass | — |
| Quotations | Approve | Pass | — |
| Quotations | Convert to SO | Fail | 500 error, partial success (Bug #13) |

---

## End-to-End Workflow Test Results

### Workflow 1 — Quotation → SO → DO → Invoice → Payment

**Date Tested:** 2026-04-06  
**Result:** Pass (with known caveat)

**Chain executed successfully:**
1. Created Quotation `SQ-20260406-0005`
2. Submitted and Approved the quotation
3. Converted to SO `SO-20260406-0005` — **No 500 error reproduced** (Bug #13 did not occur with fresh data)
4. Created DO from SO — **Items auto-populated correctly** (`Items (1)` with `PROD-MIN-001`) — Bug #14 did not reproduce
5. Submitted, Approved, Prepared, Shipped, and Delivered the DO
6. Created Invoice from SO → `INV-20260406-0007` — **No 500 error reproduced** (Bug #11 did not occur with fresh data)
7. **Bug #10 confirmed:** Items & Summary tab showed `Select Product` with price `0`; product and price were not auto-populated from the SO
8. Manually filled the invoice item, Submitted and Approved the invoice
9. Created Payment from invoice action menu
10. Confirmed payment successfully

**Conclusion:** The full end-to-end chain is now functional for newly created records. Bug #10 remains the only active blocker for a seamless workflow (manual item entry required). Bugs #11, #13, and #14 appear to be data-dependent or may only affect older records.

### Workflow 2 — CIDP: Draft → Submit → Approve → Pay

**Date Tested:** 2026-04-06  
**Result:** Fail (blocked)

**Blocker:** Bug #7 — The **Approve** action is completely absent from the CIDP UI. After submitting a CIDP, there is no way to approve it, so the workflow cannot proceed past the Submit step without manual backend intervention. The **Cancel** action is also missing.

### Workflow 3 — Payment Reverse / Delete

**Date Tested:** 2026-04-06  
**Result:** Fail (blocked)

**Blocker:** Bug #6 — Confirmed payments only show **View** and **Print** in the action menu. **Reverse** and **Delete** actions are missing from the UI, making it impossible to undo or remove a confirmed payment.

---

## Open Items / Not Tested

- **End-to-end chain** (Quotation → Order → DO → Invoice → Payment) — **Tested 2026-04-06.** Full chain succeeds for new records. Only Bug #10 (invoice items not auto-populated) remains as active friction. Bugs #11, #13, and #14 did not reproduce on fresh data.
- **CIDP full workflow** (Draft → Submit → Approve → Pay) — Blocked at Approve step (Bug #7).
- **Payment Reverse / Delete** — Blocked; actions missing from UI (Bug #6).

---

## GitHub Issues Created

- Issue #79 — Raw Zod validation errors in Sales forms
- Issue #80 — "Add Invoice" wizard allows proceeding without validating Basic Information fields
- Issue #81 — Missing error-toast feedback on failed Sales mutations
- Issue #82 — Approved customer invoices lose action menu items (Create Payment, Cancel, Delete)
- Issue #83 — Payment confirmation fails with 409 Conflict when invoice remaining_amount > amount
- Issue #84 — Missing Reverse/Delete actions on Confirmed payments
- Issue #85 — CIDP missing Approve and Cancel actions in UI
- Issue #86 — Create Delivery Order: Batch field optional but validated as required
- Issue #87 — Create Invoice from SO: Due Date and Payment Terms optional but validated as required
- Issue #88 — Create Invoice from SO: Items not auto-populated from SO
- Issue #89 — Create Invoice from SO: Internal server error (500) on Create
- Issue #90 — Delete action missing on Cancelled customer invoices
- Issue #91 — Convert Quotation to SO throws 500 server error but partially succeeds
- Issue #92 — Create Delivery Order from SO: Items not auto-populated
- Issue #93 — Missing Edit/Update action on Returns
- Issue #94 — Delete action missing on Processed returns
