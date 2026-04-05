# Manual QA Report — Sales Module

**Date:** 2026-04-05  
**Tester:** Claude Code (Playwright E2E + code inspection)  
**Branch:** `fixing-bug`  
**Scope:** `apps/web/src/features/sales` + `apps/api/internal/sales/presentation/router`

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

- **Total Bugs Found:** 3
- **High Priority:** 2
- **Medium Priority:** 1
- **Backend Issues:** 0
- **Frontend Issues:** 3
- **Fixed:** 3

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

## Verified Working Features

| Feature / Action | Result |
|-----------------|--------|
| All 8 Sales list pages load (200 OK) | Pass |
| Sales Order — Create Delivery Order from list | Pass |
| Sales Order — Print from list | Pass |
| Returns — Process action | Pass |
| Customer Invoices DP — List & pagination | Pass |
| Payments — List & pagination | Pass |
| Receivables Recap — List & summary cards | Pass |

---

## Open Items / Not Tested

- **Reject Return** — Could not test because the only seeded return is already in `Processed` status. A new return would need to be created first.
- **End-to-end workflow** (Quotation → Order → DO → Invoice → Payment) — Verified individual actions only; full chain not exercised in this pass.

---

## GitHub Issues Created

- Issue #79 — Raw Zod validation errors in Sales forms
- Issue #80 — "Add Invoice" wizard allows proceeding without validating Basic Information fields
- Issue #81 — Missing error-toast feedback on failed Sales mutations
