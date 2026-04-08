# Critical Flows — GIMS ERP

> Generated from codebase scan on 2026-04-05.  
> Tags: `[FROM_CODE]` = discovered directly in code, confident. `[INFERRED]` = inferred from structure/relationships, needs confirmation.

---

## 1. Module CRUD Operations

### 1.1 CRM

| Entity | Create | Read | Update | Delete | Special Actions |
|--------|--------|------|--------|--------|-----------------|
| Lead | `[INFERRED]` | list, detail `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | Convert `[FROM_CODE]` |
| Deal | `[INFERRED]` | list, detail `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | Convert to Quotation `[FROM_CODE]` |
| Contact | `[INFERRED]` | list, detail `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | — |
| Activity | `[INFERRED]` | list, detail `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | — |
| Task | `[INFERRED]` | list, detail `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | — |
| Schedule | `[INFERRED]` | list, detail `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | — |
| Visit Report | `[FROM_CODE]` | list, detail `[FROM_CODE]` | `[FROM_CODE]` | `[FROM_CODE]` | Submit, Approve, Reject `[FROM_CODE]` |
| Pipeline Stage (setting) | `[INFERRED]` | list `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | — |
| Lead Source (setting) | `[INFERRED]` | list `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | — |
| Lead Status (setting) | `[INFERRED]` | list `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | — |
| Contact Role (setting) | `[INFERRED]` | list `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | — |
| Activity Type (setting) | `[INFERRED]` | list `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | — |

### 1.2 Sales

| Entity | Create | Read | Update | Delete | Special Actions |
|--------|--------|------|--------|--------|-----------------|
| Sales Quotation | `[FROM_CODE]` | list, detail, items, print `[FROM_CODE]` | `[FROM_CODE]` | `[FROM_CODE]` | Update Status `[FROM_CODE]` |
| Sales Order | `[FROM_CODE]` | list, detail, items, print, export `[FROM_CODE]` | `[FROM_CODE]` | `[FROM_CODE]` | Update Status, Approve, Convert from Quotation `[FROM_CODE]` |
| Delivery Order | `[FROM_CODE]` | list, detail, items `[FROM_CODE]` | `[FROM_CODE]` | `[FROM_CODE]` | Update Status, Approve, Ship, Deliver, Select Batches `[FROM_CODE]` |
| Customer Invoice | `[FROM_CODE]` | list, detail, items, print, export `[FROM_CODE]` | `[FROM_CODE]` | `[FROM_CODE]` | Update Status, Approve `[FROM_CODE]` |
| Customer Invoice DP | `[FROM_CODE]` | list, detail, print, export `[FROM_CODE]` | `[FROM_CODE]` | `[FROM_CODE]` | Pending, Approve `[FROM_CODE]` |
| Sales Payment | `[FROM_CODE]` | list, detail, print, export `[FROM_CODE]` | — | `[FROM_CODE]` | Confirm `[FROM_CODE]` |
| Sales Return | `[FROM_CODE]` | list, detail `[FROM_CODE]` | — | `[FROM_CODE]` | Update Status `[FROM_CODE]` |
| Sales Visit | `[FROM_CODE]` | list, detail, details, history, calendar `[FROM_CODE]` | `[FROM_CODE]` | `[FROM_CODE]` | Update Status, Check-in, Check-out `[FROM_CODE]` |
| Yearly Target | `[FROM_CODE]` | list, detail `[FROM_CODE]` | `[FROM_CODE]` | `[FROM_CODE]` | — |

### 1.3 Purchase

| Entity | Create | Read | Update | Delete | Special Actions |
|--------|--------|------|--------|--------|-----------------|
| Purchase Requisition | `[INFERRED]` | list, detail `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | Submit, Approve `[INFERRED]` |
| Purchase Order | `[FROM_CODE]` | list, detail, export `[FROM_CODE]` | `[FROM_CODE]` | `[FROM_CODE]` | Submit, Approve, Confirm, Close, Reject `[FROM_CODE]` |
| Goods Receipt | `[FROM_CODE]` | list, detail, export, print, audit-trail `[FROM_CODE]` | `[FROM_CODE]` | `[FROM_CODE]` | Confirm, Submit, Approve, Reject, Close, Convert to Supplier Invoice `[FROM_CODE]` |
| Supplier Invoice | `[FROM_CODE]` | list, detail, export, print, audit-trail `[FROM_CODE]` | `[FROM_CODE]` | `[FROM_CODE]` | Submit, Approve, Reject, Cancel, Pending, Reverse `[FROM_CODE]` |
| Supplier Invoice DP | `[FROM_CODE]` | list, detail, export, print, audit-trail `[FROM_CODE]` | `[FROM_CODE]` | `[FROM_CODE]` | Pending, Submit, Approve, Reject, Cancel `[FROM_CODE]` |
| Purchase Payment | `[FROM_CODE]` | list, detail, export, print, audit-trail `[FROM_CODE]` | — | `[FROM_CODE]` | Confirm `[FROM_CODE]` |
| Purchase Return | `[FROM_CODE]` | list, detail, audit-trail `[FROM_CODE]` | — | `[FROM_CODE]` | Update Status `[FROM_CODE]` |
| Payable Recap | — | list, summary, export `[FROM_CODE]` | — | — | — |

### 1.4 Inventory / Stock

| Entity | Create | Read | Update | Delete | Special Actions |
|--------|--------|------|--------|--------|-----------------|
| Stock Movement | `[INFERRED]` | list `[INFERRED]` | — `[INFERRED]` | — `[INFERRED]` | — |
| Stock Opname | `[FROM_CODE]` | list, detail `[FROM_CODE]` | `[FROM_CODE]` | `[FROM_CODE]` | List Items, Save Items, Update Status `[FROM_CODE]` |
| Inventory Batch | `[INFERRED]` | list, detail `[INFERRED]` | — `[INFERRED]` | — `[INFERRED]` | Select for DO `[FROM_CODE]` |

### 1.5 Finance

| Entity | Create | Read | Update | Delete | Special Actions |
|--------|--------|------|--------|--------|-----------------|
| Chart of Account (COA) | `[INFERRED]` | list, detail `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | — |
| Journal Entry | `[INFERRED]` | list, detail `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | Approve, Reverse `[FROM_CODE]` |
| Bank Account | `[INFERRED]` | list, detail `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | — |
| Budget | `[INFERRED]` | list, detail `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | Approve `[FROM_CODE]` |
| Financial Closing | `[INFERRED]` | list, detail `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | Approve `[FROM_CODE]` |
| Asset | `[INFERRED]` | list, detail `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | Depreciate, Transfer, Dispose, Revalue, Adjust, Sell, Assign, Return `[INFERRED]` |
| Asset Category | `[INFERRED]` | list, detail `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | — |
| Asset Location | `[INFERRED]` | list, detail `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | — |
| Tax Invoice | `[INFERRED]` | list, detail `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | — |
| Non-Trade Payable | `[INFERRED]` | list, detail `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | Submit, Approve `[FROM_CODE]` |
| Payment (General) | `[INFERRED]` | list, detail `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | Approve `[FROM_CODE]` |
| Cash/Bank Journal | `[INFERRED]` | list, detail `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | — |
| Salary Structure | `[INFERRED]` | list, detail `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | Approve `[FROM_CODE]` |
| Valuation Run | `[INFERRED]` | list, detail `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | Approve `[INFERRED]` |
| Accounting Period | `[INFERRED]` | list `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | Lock/Unlock `[INFERRED]` |

### 1.6 HRD

| Entity | Create | Read | Update | Delete | Special Actions |
|--------|--------|------|--------|--------|-----------------|
| Attendance Record | `[INFERRED]` | list, detail `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | Clock-in, Clock-out `[INFERRED]` |
| Leave Request | `[INFERRED]` | list, detail `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | Approve, Reject `[FROM_CODE]` |
| Overtime Request | `[INFERRED]` | list, detail `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | Approve, Reject `[FROM_CODE]` |
| Work Schedule | `[INFERRED]` | list, detail `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | — |
| Holiday | `[INFERRED]` | list, detail `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | Batch import, CSV import `[INFERRED]` |
| Evaluation Group | `[INFERRED]` | list, detail `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | — |
| Evaluation Criteria | `[INFERRED]` | list, detail `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | — |
| Employee Evaluation | `[INFERRED]` | list, detail `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | — |
| Recruitment Request | `[INFERRED]` | list, detail `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | Update Status, Update Filled Count `[INFERRED]` |
| Recruitment Applicant | `[INFERRED]` | list, detail `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | Change Stage `[INFERRED]` |

### 1.7 Master Data

| Entity | Create | Read | Update | Delete | Special Actions |
|--------|--------|------|--------|--------|-----------------|
| User | `[FROM_CODE]` | list, detail, available `[FROM_CODE]` | `[FROM_CODE]` | `[FROM_CODE]` | Get Permissions, Update Profile, Change Password, Upload Avatar `[FROM_CODE]` |
| Role | `[FROM_CODE]` | list, detail `[FROM_CODE]` | `[FROM_CODE]` | `[FROM_CODE]` | Assign Permissions, Validate `[FROM_CODE]` |
| Permission / Menu | `[INFERRED]` | list `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | — |
| Employee | `[INFERRED]` | list, detail `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | — |
| Employee Contract | `[INFERRED]` | list `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | Terminate `[INFERRED]` |
| Company | `[INFERRED]` | list, detail `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | Approve `[FROM_CODE]` |
| Division | `[INFERRED]` | list `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | — |
| Job Position | `[INFERRED]` | list `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | — |
| Business Unit | `[INFERRED]` | list `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | — |
| Business Type | `[INFERRED]` | list `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | — |
| Area | `[INFERRED]` | list `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | — |
| Geographic (Country, Province, City, District, Village) | `[INFERRED]` | list `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | — |
| Customer / Customer Type | `[INFERRED]` | list, detail `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | — |
| Supplier / Supplier Type / Bank | `[FROM_CODE]` | list, detail `[FROM_CODE]` | `[FROM_CODE]` | `[FROM_CODE]` | Submit, Approve (Supplier) `[FROM_CODE]` |
| Supplier Contact | `[INFERRED]` | list `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | — |
| Supplier Bank Account | `[INFERRED]` | list `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | — |
| Product / Category / Brand / Segment / Type / UOM / Packaging / Procurement Type | `[INFERRED]` | list, detail `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | Submit, Approve (Product) `[FROM_CODE]` |
| Warehouse | `[FROM_CODE]` | list, detail `[FROM_CODE]` | `[FROM_CODE]` | `[FROM_CODE]` | — |
| Currency | `[INFERRED]` | list `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | — |
| Payment Terms | `[INFERRED]` | list `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | — |
| Courier Agency | `[INFERRED]` | list `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | — |
| SO Source | `[INFERRED]` | list `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | — |
| Leave Type | `[INFERRED]` | list `[INFERRED]` | `[INFERRED]` | `[INFERRED]` | — |

### 1.8 Report (Read-Only)

All report endpoints are `[FROM_CODE]`.

- **Sales Overview**: performance, monthly-overview, profile-metrics, sales-rep detail, check-in-locations, products, customers
- **Product Analysis**: performance, category-performance, segment-performance, type-performance, packaging-performance, procurement-type-performance, monthly-overview, product-detail, customers, sales-reps, monthly-trend
- **Geo Performance**: form-data, report
- **Customer Research**: KPIs, revenue-by-customer, purchase-frequency, revenue-trend, customers, customer-detail, top-products
- **Supplier Research**: KPIs, purchase-volume, delivery-time, spend-trend, suppliers, supplier-detail

### 1.9 Travel Planner

| Entity | Create | Read | Update | Delete | Special Actions |
|--------|--------|------|--------|--------|-----------------|
| Travel Plan | `[FROM_CODE]` | list, detail `[FROM_CODE]` | `[FROM_CODE]` | `[FROM_CODE]` | Update Participants, Optimize Route, Get Google Maps Links, Export PDF `[FROM_CODE]` |
| Travel Plan Expense | `[FROM_CODE]` | list `[FROM_CODE]` | — | `[FROM_CODE]` | — |
| Travel Plan Visit | `[FROM_CODE]` | list `[FROM_CODE]` | — | `[FROM_CODE]` | Link Visits, Unlink Visit `[FROM_CODE]` |
| Visit Planner | `[FROM_CODE]` | routes `[FROM_CODE]` | — | — | Create Visit Planner Plan `[FROM_CODE]` |
| Travel Locations (WebSocket) | `[FROM_CODE]` | WS feed `[FROM_CODE]` | — | — | Upsert Location `[FROM_CODE]` |

---

## 2. Multi-Step Business Flows

### 2.1 CRM — Lead to Deal to Quotation
- **Entry point**: `POST /api/v1/crm/leads/:id/convert` `[FROM_CODE]`
- **Steps**:
  1. Lead status `open` -> `converted` `[FROM_CODE]`
  2. Creates `Deal` `[FROM_CODE]`
- **Exit state**: `converted`
- **Sub-flow**: Deal `ConvertToQuotation` `[FROM_CODE]`
  1. Auto-creates `Customer` + `Contact` if missing `[FROM_CODE]`
  2. Creates `SalesQuotation` with `source_deal_id` `[FROM_CODE]`
  3. Performs raw SQL stock check against `inventory_batches` `[FROM_CODE]`

### 2.2 CRM — Visit Report Approval
- **State machine**: `DRAFT` -> `SUBMITTED` -> (`APPROVED` / `REJECTED`) `[FROM_CODE]`
- **Submit triggers** `[FROM_CODE]`:
  1. Creates `Activity` record
  2. Syncs product interests back to `Lead`
  3. Ensures `TravelPlan` visit report plan exists
  4. Sends approval notification

### 2.3 Sales — Quotation to Order to Delivery to Invoice to Payment
| Step | State Transition | APIs / Usecases | Tag |
|------|------------------|-----------------|-----|
| 1. Quotation | `DRAFT` -> `SUBMITTED` -> `APPROVED` -> `CONVERTED` | `PATCH /sales-quotations/:id/status`, `POST /sales-orders/convert-from-quotation` | `[FROM_CODE]` |
| 2. Order | `DRAFT` -> `SUBMITTED` -> `APPROVED` -> `CLOSED` / `CANCELLED` | `POST /sales-orders/:id/approve`, `PATCH /sales-orders/:id/status` | `[FROM_CODE]` |
| 3. Delivery Order | `DRAFT` -> `SENT` -> `APPROVED` -> `PREPARED` -> `SHIPPED` -> `DELIVERED` | `POST /delivery-orders/:id/ship`, `POST /delivery-orders/:id/deliver` | `[FROM_CODE]` |
| 4. Customer Invoice | `DRAFT` -> `SUBMITTED` -> `APPROVED` -> `UNPAID` / `PARTIAL` -> `PAID` | `POST /customer-invoices/:id/approve`, `PATCH /customer-invoices/:id/status` | `[FROM_CODE]` |
| 5. Sales Payment | `PENDING` -> `CONFIRMED` | `POST /sales/payments/:id/confirm` | `[FROM_CODE]` |

- **SO Approval side effects** `[FROM_CODE]`:
  - Credit limit check via outstanding `customer_invoices` balance
  - `inventoryUC.ReserveStock` for each line item
- **SO Cancel/Reject side effects** `[FROM_CODE]`:
  - `inventoryUC.ReleaseStock` unwinds reservations
- **DO Ship side effects** `[FROM_CODE]`:
  1. `inventoryUC.ReleaseBatchStock`
  2. `inventoryUC.DeductStock`
  3. `inventoryUC.CreateStockMovement(OUT)`
  4. `inventoryUC.TriggerDocumentJournal` (COGS recognition)
- **DO Deliver side effects** `[FROM_CODE]`:
  - `salesOrderRepo.UpdateItemDeliveredQty`
- **Invoice Create/Approve side effects** `[FROM_CODE]`:
  - Links down-payment invoices and deducts DP amount from totals
  - `triggerSalesInvoiceJournal` -> `journalUC.PostOrUpdateJournal`
  - Updates `sales_order_items.invoiced_quantity`
- **Invoice Cancel/Reverse side effects** `[FROM_CODE]`:
  - `triggerSalesInvoiceJournalReversed` -> `journalUC.Reverse`
- **Payment Confirm side effects** `[FROM_CODE]`:
  - Locks invoice; updates `paid_amount` / `remaining_amount`
  - If fully paid -> `closeRelatedSalesOrderIfPaid` (SO status = `closed`)
  - If DP paid -> `applyDownPaymentRecalculationIfNeeded`
  - `triggerJournalEntry` -> `journalUC.PostOrUpdateJournal` (debit bank / credit AR)

### 2.4 Purchase — Requisition to Order to Receipt to Invoice to Payment
| Step | State Transition | APIs / Usecases | Tag |
|------|------------------|-----------------|-----|
| 1. Purchase Requisition | `DRAFT` -> `SUBMITTED` -> `APPROVED` -> `CONVERTED` | `POST /purchase-requisitions/:id/submit`, `POST /purchase-requisitions/:id/approve` | `[INFERRED]` |
| 2. Purchase Order | `DRAFT` -> `SUBMITTED` -> `APPROVED` -> `CLOSED` | `POST /purchase-orders/:id/submit`, `POST /purchase-orders/:id/approve`, `POST /purchase-orders/:id/confirm` | `[FROM_CODE]` |
| 3. Goods Receipt | Legacy: `DRAFT` -> `CONFIRMED`; New: `DRAFT` -> `SUBMITTED` -> `APPROVED` -> `CLOSED` | `POST /goods-receipts/:id/submit`, `POST /goods-receipts/:id/approve`, `POST /goods-receipts/:id/convert` | `[FROM_CODE]` |
| 4. Supplier Invoice | `DRAFT` -> `SUBMITTED` -> `APPROVED` -> `PENDING` -> `UNPAID` / `PARTIAL` -> `PAID` | `POST /supplier-invoices/:id/submit`, `POST /supplier-invoices/:id/approve`, `POST /supplier-invoices/:id/pending` | `[FROM_CODE]` |
| 5. Purchase Payment | `PENDING` -> `CONFIRMED` | `POST /purchase/payments/:id/confirm` | `[FROM_CODE]` |

- **PO Create side effects** `[FROM_CODE]`:
  - `CreateFromPurchaseRequisition` locks PR, updates PR status to `CONVERTED` with `converted_to_purchase_order_id`
  - PO can also be created from `SalesOrder` (`sales_order_id` FK)
- **PO Approve side effects** `[FROM_CODE]`:
  - Budget guard check
- **GR Confirm/Approve side effects** `[FROM_CODE]`:
  - `triggerStockUpdate` -> `inventoryUC.ReceiveStockFromGR`
  - `inventoryUC.TriggerDocumentJournal` (inventory accrual)
  - `triggerAssetCreation` -> `financeUsecase.AssetUsecase.CreateFromPurchase` (device-type products)
- **GR Convert to SI** `[FROM_CODE]`:
  - Creates draft `SupplierInvoice` from closed GR; links PO; auto-applies paid DP invoices
- **SI Pending side effects** `[FROM_CODE]`:
  - Three-way matching: compares GR received qty vs invoiced qty
  - Budget guard on expense account
  - Auto-applies down payments
  - `triggerJournalEntry` -> AP recognition journal
- **SI Reverse side effects** `[FROM_CODE]`:
  - `journalUC.ReverseWithReason`
  - `syncGoodsReceiptStatus` updates GR status to `Partial` or `Closed`

### 2.5 Inventory — Stock Opname to Adjustment
- **State machine**: `DRAFT` -> `SUBMITTED` -> `APPROVED` `[FROM_CODE]`
- **Entry**: `POST /api/v1/stock-opnames` -> save items -> update status `[FROM_CODE]`
- **Approve side effects** `[FROM_CODE]`:
  1. `inventoryUC.AdjustStockFromOpname`
  2. Creates `ADJUST` stock movements
  3. Updates batch and product quantities
  4. `triggerInventoryJournal` -> gain/loss journal via `journalUC.PostOrUpdateJournal`

### 2.6 Finance — Asset Lifecycle
- **State machine** `[FROM_CODE]` / `[INFERRED]`:
  - `Acquisition` / `Active` -> (`Depreciate` -> `Pending` -> `Approved`) -> (`Transfer` / `Revalue` / `Adjust` / `Dispose`) -> `SOLD` / `DISPOSED`
- **Side effects on ApproveDepreciation / ApproveTransaction** `[FROM_CODE]`:
  - Creates `JournalEntry` + `JournalLine` directly for:
    - Depreciation expense + accumulated depreciation
    - Disposal / revaluation / adjustment / transfer
  - `ensureNotClosed` blocks posting in a closed accounting period `[FROM_CODE]`

### 2.7 Finance — Journal Reversal
- **Flow**: Any posted journal can be reversed `[FROM_CODE]`
- **API**: `POST /api/v1/finance/journal-entries/:id/reverse` `[FROM_CODE]`
- **Effect**: Creates mirror-entry (debit/credit swapped) and marks original as `Reversed` `[FROM_CODE]`

### 2.8 Master Data — Submission & Approval Workflows
| Entity | Submit | Approve | Tag |
|--------|--------|---------|-----|
| Supplier | `POST /api/v1/supplier/suppliers/:id/submit` | `POST /api/v1/supplier/suppliers/:id/approve` | `[FROM_CODE]` |
| Product | `POST /api/v1/master-data/products/:id/submit` `[INFERRED]` | `POST /api/v1/master-data/products/:id/approve` `[INFERRED]` | `[FROM_CODE]` / `[INFERRED]` |
| Company | — | `POST /api/v1/organization/companies/:id/approve` `[INFERRED]` | `[FROM_CODE]` |

### 2.9 AI Orchestration Flow
- **Entry**: `POST /api/v1/ai/chat/send-message` or `confirm-action` `[FROM_CODE]`
- **Steps** `[FROM_CODE]`:
  1. Intent classification
  2. Parameter extraction & entity resolution
  3. Permission validation
  4. `ActionExecutor.Execute` dispatch
- **Exit**: Direct usecase call across HRD, Sales, Purchase, Inventory, Finance, Master Data `[FROM_CODE]`

---

## 3. Cross-Module Integrations

### 3.1 Direct Usecase Calls (Synchronous Transactions)

| Source Module | Target Module | Mechanism | Trigger Condition | Tag |
|---------------|---------------|-----------|-------------------|-----|
| CRM — LeadUsecase.Convert | CRM / Organization / Core | Reads Employee, BusinessType, Area, PaymentTerms; creates Deal | Lead conversion | `[FROM_CODE]` |
| CRM — DealUsecase.ConvertToQuotation | Customer / Sales | Auto-creates Customer + Contact; creates SalesQuotation | Deal conversion | `[FROM_CODE]` |
| CRM — VisitReportUsecase.Submit | CRM / TravelPlanner | Creates Activity, syncs Lead, ensures TravelPlan | Visit report submit | `[FROM_CODE]` |
| Sales — SalesOrderUsecase.ConvertFromQuotation | Sales | Maps approved Quotation to Order; updates quotation status | Quotation approved | `[FROM_CODE]` |
| Sales — SalesOrderUsecase.Approve | Inventory / Finance | `ReserveStock` + credit limit check | SO approval | `[FROM_CODE]` |
| Sales — DeliveryOrderUsecase.Ship | Inventory | `ReleaseBatchStock`, `DeductStock`, `CreateStockMovement(OUT)`, `TriggerDocumentJournal` | DO ship | `[FROM_CODE]` |
| Sales — CustomerInvoiceUsecase | Finance | `triggerSalesInvoiceJournal` -> `journalUC.PostOrUpdateJournal` | Invoice create/approve | `[FROM_CODE]` |
| Sales — SalesPaymentUsecase.Confirm | Finance / Sales | `triggerJournalEntry`, updates invoice, closes SO if paid | Payment confirm | `[FROM_CODE]` |
| Purchase — PurchaseOrderUsecase.CreateFromPR | Purchase | Locks PR -> creates PO -> updates PR to CONVERTED | PO from PR | `[FROM_CODE]` |
| Purchase — GoodsReceiptUsecase.Confirm/Approve | Inventory / Finance | `ReceiveStockFromGR`, `TriggerDocumentJournal`, `AssetUsecase.CreateFromPurchase` | GR confirm/approve | `[FROM_CODE]` |
| Purchase — GoodsReceiptUsecase.ConvertToSI | Purchase | Creates draft SupplierInvoice from closed GR | GR closed | `[FROM_CODE]` |
| Purchase — SupplierInvoiceUsecase.Pending | Finance / Purchase | 3-way match, budget guard, DP auto-apply, AP journal | SI pending | `[FROM_CODE]` |
| Inventory — InventoryUsecase.ReceiveStockFromGR | Inventory / Finance | Updates HPP, creates batches, stock movement IN, triggers journal | GR approval | `[FROM_CODE]` |
| Inventory — InventoryUsecase.AdjustStockFromOpname | Inventory / Finance | Creates ADJUST movements, updates qty, triggers gain/loss journal | Stock opname approve | `[FROM_CODE]` |
| Finance — AssetUsecase.ApproveDepreciation | Finance | Creates JournalEntry + JournalLine for depreciation | Depreciation approve | `[FROM_CODE]` |
| Finance — AssetUsecase.ApproveTransaction | Finance | Creates asset journals for transfer/dispose/revalue/adjust | Asset transaction approve | `[FROM_CODE]` |
| Finance — JournalEntryUsecase.PostOrUpdateJournal | Finance | Idempotent hub used by Sales, Purchase, Inventory, HRD, Finance internal | Any document posting | `[FROM_CODE]` |
| AI — ActionExecutor | HRD / Sales / Purchase / Inventory / Finance / Master Data | Dispatches to ~17 usecase interfaces | Confirmed AI intent | `[FROM_CODE]` |

### 3.2 Foreign Key Relationships (Data Integrity Bridges)

| Source Table | FK Target Table | Target Module | Tag |
|--------------|-----------------|---------------|-----|
| `employees` | `users`, `divisions`, `job_positions`, `companies` | Auth / Organization | `[FROM_CODE]` |
| `sales_quotations` | `customers`, `employees`, `business_units`, `business_types`, `payment_terms` | Customer / Organization / Core | `[FROM_CODE]` |
| `sales_orders` | `sales_quotations`, `areas`, `customers`, `employees` | Sales / Organization / Customer | `[FROM_CODE]` |
| `delivery_orders` | `sales_orders`, `warehouses`, `employees`, `courier_agencies` | Sales / Inventory / Core | `[FROM_CODE]` |
| `customer_invoices` | `sales_orders`, `delivery_orders`, `payment_terms`, `tax_invoices` | Sales / Finance | `[FROM_CODE]` |
| `purchase_requisitions` | `suppliers`, `payment_terms`, `business_units`, `employees` | Purchase / Supplier / Core / Organization | `[FROM_CODE]` |
| `purchase_orders` | `purchase_requisitions`, `sales_orders`, `suppliers` | Purchase / Sales | `[FROM_CODE]` |
| `goods_receipts` | `purchase_orders`, `warehouses`, `suppliers`, `journal_entries` | Purchase / Inventory / Finance | `[FROM_CODE]` |
| `supplier_invoices` | `purchase_orders`, `goods_receipts`, `suppliers`, `payment_terms`, `journal_entries` | Purchase / Finance | `[FROM_CODE]` |
| `stock_movements` | `products`, `warehouses`, `inventory_batches`, `journal_entries` | Inventory / Finance | `[FROM_CODE]` |
| `fixed_assets` | `asset_categories`, `asset_locations`, `companies`, `business_units`, `employees`, `suppliers` | Finance / Organization / Supplier | `[FROM_CODE]` |
| `crm_leads` | `customers`, `crm_contacts`, `employees`, `business_types`, `areas`, `payment_terms` | CRM / Customer / Organization / Core | `[FROM_CODE]` |
| `crm_deals` | `customers`, `crm_contacts`, `employees`, `crm_pipeline_stages`, `sales_quotations` | CRM / Customer / Sales | `[FROM_CODE]` |
| `crm_visit_reports` | `customers`, `crm_contacts`, `crm_deals`, `crm_leads`, `employees`, `travel_plans` | CRM / TravelPlanner | `[FROM_CODE]` |

### 3.3 Event Patterns

- **Event Publisher interface** exists (`core/infrastructure/events/publisher.go`) but core business flows rely on synchronous DB transactions rather than async event-driven sagas `[FROM_CODE]`.
- Events are published for **Auth / User / Role lifecycle** (`user.created`, `role.permissions_assigned`, etc.) `[FROM_CODE]`.
- No persistent `EventSubscriber` consumer was found in scanned code; a `NoOpEventPublisher` is available `[FROM_CODE]`.

---

## 4. Field Validations by Module

### 4.1 Auth & Identity
- `email`: valid email format, required `[FROM_CODE]`
- `password`: min 6 chars, required `[FROM_CODE]`
- `new_password` / `confirm_password`: must match `[FROM_CODE]`

### 4.2 CRM
- **Deal** `[FROM_CODE]`:
  - `title`: min 2, max 200
  - `pipeline_stage_id`: required
  - `value`: number, min 0
  - `expected_close_date`: required
  - BANT fields: `budget_confirmed`, `auth_confirmed`, `need_confirmed`, `time_confirmed`
  - `items`: array of `product_id`, `unit_price`, `quantity`, `discount_percent`
- **Target** `[FROM_CODE]`:
  - `area_id`, `year`, `total_target` required
  - `months`: array of exactly 12 entries (`month`, `target_amount`)
- **Visit Report** `[FROM_CODE]`:
  - `visit_date`, `employee_id`, `customer_id` required
  - `details`: `product_id`, `interest_level` 0-5, `quantity`, `price`
  - Check-in/out: `latitude`, `longitude`, `accuracy` required
  - Reject reason: min 5 chars

### 4.3 Sales
- **Quotation** `[FROM_CODE]`:
  - `quotation_date`, `valid_until` required
  - `customer_id`, `payment_terms_id`, `sales_rep_id`, `business_unit_id`, `business_type_id` required
  - `tax_rate`: 0-100, default 11
  - `delivery_cost`, `other_cost`, `discount_amount`: numeric
  - `items`: `product_id`, `quantity`, `price`, `discount`
- **Order** `[FROM_CODE]`:
  - Same core fields as quotation
  - `sales_quotation_id`: optional
  - Status update: `draft`, `submitted`, `approved`, `rejected`, `cancelled`
- **Invoice** `[FROM_CODE]`:
  - `invoice_date`, `due_date` required; `due_date` >= `invoice_date`
  - `type`: `regular` or `proforma`
  - `sales_order_id`, `delivery_order_id`, `tax_rate`
  - `items`: `product_id`, `quantity`, `price`, `discount`, `hpp_amount`
- **Delivery** `[FROM_CODE]`:
  - `delivery_date`, `sales_order_id` required
  - `items`: `product_id`, `inventory_batch_id`, `quantity`; `max_quantity` stock validation
  - Ship: `tracking_number` required
  - Deliver: `receiver_signature` required
  - Batch selection: `FIFO` / `FEFO`
- **Payment** `[FROM_CODE]`:
  - `invoice_id` OR `dp_id` required (exactly one source)
  - `method`: `BANK` or `CASH`
  - `bank_account_id` required if `method = BANK`
  - `payment_date`, `reference_number`
- **Return** `[FROM_CODE]`:
  - `delivery_id`, `warehouse_id`, `reason`, `action` required
  - `items`: `product_id`, `condition`, `qty`, `unit_price`
- **Customer Invoice DP** `[FROM_CODE]`:
  - `sales_order_id`, `invoice_date`, `due_date`, `amount` (positive) required

### 4.4 Purchase
- **Requisition** `[FROM_CODE]`:
  - `supplier_id`, `payment_terms_id`, `business_unit_id`, `employee_id`
  - `request_date`, `tax_rate`, `delivery_cost`, `other_cost`
  - `items`: `product_id`, `quantity`, `purchase_price`, `discount`
- **Order** `[FROM_CODE]`:
  - `source`: enum `manual`, `pr`, `so` with cross-field validation
  - `supplier_id`, `purchase_requisitions_id`, `sales_order_id`
  - `order_date`, `due_date`, `tax_rate`, `delivery_cost`, `notes`
  - `items`: `product_id`, `quantity`, `price`, `discount`
- **Goods Receipt** `[FROM_CODE]`:
  - `purchase_order_id`, `warehouse_id`, `proof_image_url`
  - `items`: `purchase_order_item_id`, `product_id`, `quantity_received`
  - Custom rule: at least one item must have `quantity_received > 0`
- **Supplier Invoice** `[FROM_CODE]`:
  - `goods_receipt_id`, `payment_terms_id`, `invoice_number`, `invoice_date`, `due_date`
  - `tax_rate`, `delivery_cost`, `other_cost`
  - `items`: `product_id`, `quantity`, `price`, `discount`
- **Supplier Invoice DP** `[FROM_CODE]`:
  - `purchase_order_id`, `invoice_date`, `due_date`, `amount` required
- **Payment** `[FROM_CODE]`:
  - `invoice_id` OR `dp_id` required
  - `method`: `BANK` / `CASH`; `bank_account_id` required if `BANK`
  - `payment_date`
- **Return** `[FROM_CODE]`:
  - `goods_receipt_id`, `warehouse_id`, `reason`, `action`
  - `items`: `product_id`, `condition`, `qty`, `unit_cost`

### 4.5 Stock / Inventory
- **Stock Movement** `[FROM_CODE]`:
  - `type`: enum `IN`, `OUT`, `ADJUST`, `TRANSFER`
  - `product_id`, `warehouse_id`, `quantity` required
  - `target_warehouse_id` required and must differ from source when `type = TRANSFER`
- **Stock Opname** `[INFERRED]`:
  - `opname_number`: unique, required
  - `warehouse_id`, `date` required
  - Item-level: `system_qty`, `physical_qty`, `variance_qty`

### 4.6 Finance
- **COA** `[FROM_CODE]`:
  - `code`: trim, min 1, required
  - `name`: required
  - `type`: enum `ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `EXPENSE`, etc.
  - `parent_id`: nullable UUID
- **Journal** `[FROM_CODE]`:
  - `entry_date`, `description`
  - `lines`: array of `chart_of_account_id`, `debit` OR `credit` (exactly one), `memo`
  - Custom rule: total debits must equal total credits
- **Bank Account** `[FROM_CODE]`:
  - `name`, `account_number`, `account_holder`
  - `currency_id` (UUID), `chart_of_account_id`, `village_id`
- **Budget** `[FROM_CODE]`:
  - `name`, `description`, `department`, `fiscal_year`
  - `start_date`, `end_date`
  - `items`: `chart_of_account_id`, `amount`, `memo`
- **Closing** `[FROM_CODE]`:
  - `period_end_date`, `notes`
- **Asset** `[FROM_CODE]`:
  - `code`, `name`, `category_id`, `location_id`
  - `acquisition_date`, `acquisition_cost`, `salvage_value`
  - Plus action schemas: depreciate, transfer, dispose, revalue, adjust, sell, assign, return
- **Asset Category** `[FROM_CODE]`:
  - `name`, `type`: `FIXED`, `CURRENT`, `INTANGIBLE`, `OTHER`
  - `is_depreciable`, `depreciation_method`: `SL`, `DB`, `NONE`
  - `useful_life_months`, `depreciation_rate`
  - `asset_account_id`, `accumulated_depreciation_account_id`, `depreciation_expense_account_id`
- **Asset Location** `[FROM_CODE]`:
  - `name`, `description`, `address`, `latitude`, `longitude`
- **Salary** `[FROM_CODE]`:
  - `employee_id`, `basic_salary` (> 0), `effective_date` (YYYY-MM-DD), `notes`
- **Tax Invoice** `[FROM_CODE]`:
  - `tax_invoice_number`, `tax_invoice_date`, `supplier_invoice_id`
  - `dpp_amount`, `vat_amount`, `total_amount`, `notes`
- **Non-Trade Payable** `[FROM_CODE]`:
  - `transaction_date`, `chart_of_account_id`, `amount` (positive)
  - `vendor_name`, `due_date`, `reference_no`, `description`
- **Payment (General)** `[FROM_CODE]`:
  - `payment_date`, `description`, `bank_account_id`, `total_amount`
  - `allocations`: `chart_of_account_id`, `amount`, `reference_type`, `reference_id`

### 4.7 HRD
- **Attendance** `[FROM_CODE]`:
  - `check_in_type`: `NORMAL`, `WFH`, `FIELD_WORK`
  - Clock-in: `latitude`, `longitude`, `address`, `note`
  - Clock-out: `latitude`, `longitude`, `address`, `note`
  - Manual entry: `employee_id`, `date`, `check_in_time`, `check_out_time`, `status`, `notes`
- **Leave Request** `[FROM_CODE]`:
  - `employee_id`, `leave_type_id`, `start_date`, `end_date`
  - `duration`: `FULL_DAY`, `HALF_DAY`, `MULTI_DAY`
  - `reason`: 10-500 chars
  - Custom rules: `end_date >= start_date`; duration/date range consistency
- **Overtime** `[FROM_CODE]`:
  - `date`, `start_time`, `end_time` (HH:MM), `reason` (10-500 chars)
  - `type`: `AUTO_DETECTED`, `MANUAL_CLAIM`, `PRE_APPROVED`
  - Approve: `approved_minutes` (1-720)
  - Reject: `rejection_reason`
- **Holiday** `[FROM_CODE]`:
  - `date`, `name`, `description`, `type`: `NATIONAL`, `COLLECTIVE`, `COMPANY`
  - `is_collective_leave`, `cuts_annual_leave`
  - Batch and import CSV schemas
- **Work Schedule** `[FROM_CODE]`:
  - `name`, `description`, `start_time`, `end_time`
  - `is_flexible`, `flexible_start_time`, `flexible_end_time`
  - `breaks` array, `working_days` (1-127 bitmask), tolerance minutes
  - `require_gps`, `gps_radius_meter`, office coordinates
- **Recruitment** `[FROM_CODE]`:
  - `division_id`, `position_id`, `required_count` (positive int)
  - `employment_type`, `expected_start_date`
  - `salary_range_min`, `salary_range_max`
  - `job_description`, `qualifications`, `priority`, `notes`
  - Status update: `PENDING`, `APPROVED`, `REJECTED`, `OPEN`, `CLOSED`, `CANCELLED`
  - `filled_count` update schema
- **Evaluation** `[FROM_CODE]`:
  - Evaluation group: `name`, `description`, `is_active`
  - Evaluation criteria: `evaluation_group_id`, `name`, `weight`, `max_score`, `sort_order`
  - Criteria score: `evaluation_criteria_id`, `score`, `notes`
  - Employee evaluation: `employee_id`, `evaluation_group_id`, `evaluator_id`, `evaluation_type` (`SELF` / `MANAGER`), `period_start`, `period_end`, `criteria_scores`

### 4.8 Master Data
- **User** `[FROM_CODE]`:
  - `email`: valid email
  - `password`: min 6
  - `name`: min 3
  - `role_id`: UUID
  - `status`: `active` / `inactive`
- **Role** `[FROM_CODE]`:
  - `name`: min 3, `code`: min 3, `description`, `status`
  - `assignPermissionsSchema`: `permission_ids` array min 1
- **Employee** `[FROM_CODE]`:
  - `employee_code`, `name`: min 2, `email`, `phone`
  - `division_id`, `job_position_id`, `company_id`
  - `date_of_birth`, `place_of_birth`, `gender`, `religion`, `address`, `nik`, `npwp`, `bpjs`
  - Contract: `contract_number`, `contract_type` (`PKWTT`, `PKWT`, `Intern`), dates, document
  - `total_leave_quota`, `ptkp_status`, `is_active`
  - User creation fields: `create_user`, `role_id`, `password`
- **Customer** `[FROM_CODE]`:
  - `name`: min 2, max 200
  - `customer_type_id`, `address`, `email`, `website`, `npwp`, `notes`
  - Location: `village_name`, `province_id`, `city_id`, `district_id`, `latitude`, `longitude`
  - Sales defaults: `default_business_type_id`, `default_sales_rep_id`, `default_payment_terms_id`, `default_tax_rate`
  - Credit control: `credit_limit`, `credit_is_active`
- **Company / Division / Job Position / Business Unit / Business Type** `[INFERRED]`:
  - `name`: min 2
  - `is_active`
- **Area** `[FROM_CODE]`:
  - `name`, `code`, `color`, `manager_id`, `province`, `regency`, `district`, `polygon`
- **Geographic** `[FROM_CODE]`:
  - Country: `name`: min 2, `code`: min 2, max 10
  - Province: `country_id`, `name`, `code`
  - City: `province_id`, `name`, `code`, `type` (`city` / `regency`)
  - District: `city_id`, `name`, `code`
  - Village: `district_id`, `name`, `code`, `postal_code`, `type` (`village` / `kelurahan`)
- **Currency** `[FROM_CODE]`:
  - `code`: min 2, max 10, `name`, `symbol`
  - `decimal_places`: 0-6
- **Product** `[FROM_CODE]`:
  - `name`: min 2, max 200, `code`, `manufacturer_part_number`, `description`, `image_url`
  - Classification: `category_id`, `brand_id`, `segment_id`, `type_id`
  - UoM: `uom_id`, `purchase_uom_id`, `packaging_id`, `purchase_uom_conversion`
  - Procurement: `procurement_type_id`, `supplier_id`, `business_unit_id`, `tax_type`, `is_tax_inclusive`, `lead_time_days`
  - Pricing: `cost_price`, `min_stock`, `max_stock`

### 4.9 Travel Planner
- **Travel Plan** `[INFERRED]`:
  - `title`, `plan_type`, `mode`, `start_date`, `end_date`
  - `budget_amount`, `notes`
- **Travel Plan Stop** `[INFERRED]`:
  - `place_name`, `latitude`, `longitude`, `category`, `order_index`
- **Expense** `[INFERRED]`:
  - `expense_type`, `description`, `amount`, `expense_date`, `receipt_url`

---

## 5. Questions for Confirmation

The following `[INFERRED]` items need confirmation before they are added to automated test suites.

1. **CRM Contacts, Activities, Tasks, Schedules.** Are these exposed under `/api/v1/crm/*` with standard CRUD, or are some managed only through the AI orchestrator or nested under Leads/Deals?
2. **Finance REST surface area.** Do all Finance entities (COA, Journals, Assets, Tax Invoices, Cash/Bank Journals, Valuation Runs) have dedicated router files with standard CRUD endpoints, or are some managed through a generic hub?
3. **Asset action endpoints.** Are asset actions (`depreciate`, `transfer`, `dispose`, `revalue`, `adjust`, `sell`, `assign`, `return`) exposed as `POST /assets/:id/actions/:actionType`, or as discrete endpoints?
4. **Inventory Batch & Stock Movement CRUD.** Are `inventory_batches` and `stock_movements` read-only append-only ledgers, or do they support manual create/update/delete?
5. **Purchase Requisition routes.** The integrations report shows `submit` and `approve` handlers, but the route catalog did not list base CRUD paths. Are `GET/POST/PUT/DELETE /purchase-requisitions` available?
6. **Master Data approval workflows.** Do Products, Suppliers, and Companies consistently use `POST /:id/submit` followed by `POST /:id/approve`, or do some modules skip the submit step?
7. **Travel Planner visit log creation.** Are `/travel/visits` and `/travel/locations` created automatically by mobile GPS tracking, or do they also accept manual API payloads?
8. **Employee Contract termination.** Is contract termination handled via `PATCH /employee-contracts/:id/terminate` or through a status update on the Employee record?
9. **Stock Opname status values.** Does the `UpdateStatus` handler support both `SUBMITTED` and `APPROVED` transitions, or only a single-step `POST /:id/status`?
10. **HRD Recruitment applicant stage changes.** Is applicant stage progression handled via `PATCH /recruitment-applicants/:id/stage` or through a nested resource under `/recruitment-requests/:id/applicants/:applicantId/stage`?
11. **Sales Return action values.** What are the exact allowed values for `sales_return.action`? (Inferred as repair/replace/refund from schema patterns.)
12. **HRD Salary -> Finance Journal.** Is the salary module posted on approval or on actual bank transfer, and what is the exact COA mapping?
13. **Budget date validation.** Is there an explicit rule that `budget.start_date` must be `<= budget.end_date`?
14. **Payment allocation balance.** Is there an explicit validation that `payment.total_amount` must exactly equal the sum of `allocations[].amount`?
15. **Evaluation criteria weight.** Does the system validate that the sum of criteria weights within an evaluation group equals exactly 100%?
16. **Supplier invoice 3-way match tolerance.** Is the three-way matching between GR qty and SI qty exact (zero tolerance), or is there an allowed percentage/quantity variance?
