# Data Models Quick Reference

**Purpose:** Quick lookup of all model structures used in journal posting architecture.

---

## Finance Module Models

### SystemAccountMapping
Maps logical keys to COA codes.
```
ID           uuid
TenantID     uuid (required)
CompanyID    uuid (optional, nil = tenant-wide)
Key          string (e.g., "finance.cash_default", "coa.sales_receivable")
COACode      string (e.g., "11101", "11210")
Label        string (description)
CreatedAt    timestamp
UpdatedAt    timestamp
```

### ChartOfAccount
Master list of all accounting accounts.
```
ID           uuid
TenantID     uuid (required)
Code         string (e.g., "11101", "41100") - unique per tenant
Name         string (e.g., "Kas", "Sales Revenue")
Type         enum: ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE, CONTRA
Description  string (optional)
ParentID     uuid (optional, for hierarchy)
IsActive     bool (default: true)
IsPostable   bool (default: true) - must be true to allow posting
CreatedAt    timestamp
UpdatedAt    timestamp

Relationships:
  - BankAccounts (many)
  - JournalLines (many)
```

### JournalEntry
Header record for balanced journal entry.
```
ID                    uuid
CompanyID             uuid (required)
FiscalYearID          uuid (optional)
JournalNumber         string (unique, auto-generated) - e.g., "GJ/2024/001"
EntryDate             date (when entry recorded)
Reference             string (optional, custom reference)
Description           string (required)
ReferenceType         string (optional) - e.g., "SALES_PAYMENT", "PURCHASE_PAYMENT", "SUPPLIER_INVOICE"
ReferenceID           uuid (optional) - PK of source document
JournalType           enum: GENERAL, SALES, PURCHASE, ADJUSTMENT, OPENING_BALANCE, CLOSING
Status                enum: DRAFT, POSTED, CANCELLED, REVERSED (default: DRAFT)
DebitTotal            decimal
CreditTotal           decimal
CurrencyCode          string (default: "IDR")
ExchangeRate          decimal (default: 1.0)
IsSystemGenerated     bool (default: false) - true = auto-posted by backend
SourceDocumentURL     string (optional)
CreatedBy             string (optional)
CreatedAt             timestamp
UpdatedAt             timestamp
DeletedAt             timestamp (soft delete)

Constraints:
  - DebitTotal MUST equal CreditTotal for POSTED status
  - (ReferenceType, ReferenceID) must be unique for idempotency

Relationships:
  - JournalLines (many, cascade delete)
```

### JournalLine
Detail record for each debit/credit posting.
```
ID                              uuid
JournalEntryID                  uuid (required, FK to journal_entries)
ChartOfAccountID                uuid (required, FK to chart_of_accounts)
ChartOfAccountCodeSnapshot      string (e.g., "11101") - snapshot at posting time
ChartOfAccountNameSnapshot      string (e.g., "Kas") - snapshot at posting time
ChartOfAccountTypeSnapshot      string (e.g., "ASSET") - snapshot at posting time
Debit                           decimal (> 0 if debit side; else 0)
Credit                          decimal (> 0 if credit side; else 0)
Memo                            string (description of posting)
CreatedAt                       timestamp
UpdatedAt                       timestamp

Constraints:
  - Either Debit > 0 OR Credit > 0 (not both, not neither)
  - Each JournalEntry has Debit lines and Credit lines that balance

Relationships:
  - JournalEntry (one)
  - ChartOfAccount (one)
```

### BankAccount
Operational bank/cash account.
```
ID                    uuid
TenantID              uuid (required)
CompanyID             uuid (optional, nil = tenant-level)
BankName              string (e.g., "BCA", "Mandiri")
AccountNumber         string (e.g., "1234567890") - unique per tenant
AccountHolderName     string
ChartOfAccountID      uuid (optional, FK to chart_of_accounts)
                      Examples: 11101 for Kas, 11111 for Bank
CurrencyCode          string (default: "IDR")
IsActive              bool (default: true)
OpeningBalance        decimal
CurrentBalance        decimal
CreatedAt             timestamp
UpdatedAt             timestamp

Relationships:
  - ChartOfAccount (one, optional)
```

---

## Sales Module Models

### CustomerInvoice
Sales invoice record.
```
ID                    uuid
CompanyID             uuid (required)
SalesOrderID          uuid (optional, FK)
DeliveryOrderID       uuid (optional, FK)
Code                  string (internal ID)
InvoiceNumber         string (optional, customer-facing) - unique
Type                  enum: REGULAR, DOWN_PAYMENT (default: REGULAR)
InvoiceDate           date
DueDate               date (optional)
Amount                decimal (total including tax)
Subtotal              decimal (before tax)
TaxAmount             decimal
DownPaymentAmount     decimal (optional)
RemainingAmount       decimal (default: 0) - outstanding after payments
Status                enum: DRAFT, APPROVED, PAID, CANCELLED, REJECTED (default: DRAFT)
JournalEntryID        uuid (optional, FK to journal_entries)
IsPosted              bool (default: false)
CreatedAt             timestamp
UpdatedAt             timestamp

Posting Rule (ProfileSalesInvoice):
  When Status → APPROVED:
    - Debit A/R = Total
    - Credit Sales Revenue = Subtotal
    - Credit Sales VAT Out = TaxAmount

Relationships:
  - Items (many, CustomerInvoiceItem)
  - Payments (many, SalesPayment)
  - JournalEntry (one, optional)
```

### SalesPayment
Payment record for sales invoice.
```
ID                    uuid
CompanyID             uuid (required)
CustomerInvoiceID     uuid (required, FK to customer_invoices)
BankAccountID         uuid (optional, FK to bank_accounts)
                      null if method = CASH (resolved at journal time)
                      filled if method = BANK or for operational tracking
PaymentDate           string (YYYY-MM-DD)
ReferenceNumber       string (optional)
Amount                decimal
Method                enum: CASH, BANK, CHEQUE, etc.
Status                enum: PENDING, CONFIRMED, REVERSED (default: PENDING)
JournalEntryID        uuid (optional, FK to journal_entries)
CashBankTransactionID uuid (optional)
Notes                 string (optional)
CreatedBy             string
CreatedAt             timestamp
UpdatedAt             timestamp

COA Resolution:
  if Method == CASH:
    resolve(finance.cash_default) → 11101 (Kas)
  else if Method == BANK:
    use BankAccount.ChartOfAccountID or resolve(finance.bank_default) → 11111 (Bank)

Posting Rule (ProfileSalesPayment):
  When Status → CONFIRMED (via Confirm()):
    - Debit Kas/Bank COA = Amount
    - Credit A/R = Amount

Relationships:
  - CustomerInvoice (one)
  - BankAccount (one, optional)
  - JournalEntry (one, optional)
```

### DeliveryOrder
Shipment record.
```
ID             uuid
CompanyID      uuid (required)
SalesOrderID   uuid (required, FK)
Code           string
DeliveryDate   date
Status         enum: DRAFT, SHIPPED, DELIVERED, CANCELLED (default: DRAFT)
IsPosted       bool (default: false)
JournalEntryID uuid (optional, FK to journal_entries)
CreatedAt      timestamp
UpdatedAt      timestamp

Posting Rule (ProfileSalesDelivery / COGS):
  When Status → SHIPPED:
    Inventory module triggers:
    - Debit COGS = Sum(Qty × Cost)
    - Credit Inventory = Sum(Qty × Cost)

Relationships:
  - Items (many, DeliveryOrderItem)
  - JournalEntry (one, optional)
```

---

## Purchase Module Models

### SupplierInvoice
Purchase invoice from supplier.
```
ID                string
CompanyID         uuid (required)
PurchaseOrderID   uuid (optional, FK)
GoodsReceiptID    uuid (optional, FK)
Code              string
InvoiceNumber     string (unique, supplier's invoice number)
Type              enum: NORMAL, DOWN_PAYMENT (default: NORMAL)
InvoiceDate       string (YYYY-MM-DD)
DueDate           string (optional)
SubTotal          decimal
TaxAmount         decimal
DeliveryCost      decimal
OtherCost         decimal
Amount            decimal (SubTotal + Tax + DeliveryCost + OtherCost)
DownPaymentAmount decimal
RemainingAmount   decimal (default: 0)
Status            enum: DRAFT, SUBMITTED, APPROVED, PAID, CANCELLED, REJECTED (default: DRAFT)
JournalEntryID    uuid (optional, FK)
IsPosted          bool (default: false)
CreatedAt         timestamp
UpdatedAt         timestamp

Posting Rule (ProfileSupplierInvoice):
  When Status → APPROVED:
    - Debit GR/IR (91100) = SubTotal + DeliveryCost
    - Debit Purchase VAT In (21200) = TaxAmount
    - Debit Purchase Expense (51200) = OtherCost
    - Credit A/P (21210) = Amount
    (Optional) Debit Advance if DP applied

Relationships:
  - Items (many, SupplierInvoiceItem)
  - Payments (many, PurchasePayment)
  - JournalEntry (one, optional)
```

### PurchasePayment
Payment record for supplier invoice.
```
ID                    uuid
CompanyID             uuid (optional)
SupplierInvoiceID     uuid (required, FK)
BankAccountID         uuid (required, FK) - always stored operationally
PaymentDate           string (YYYY-MM-DD)
ReferenceNumber       string (optional)
Amount                decimal
Method                enum: BANK, CASH, CHEQUE
Status                enum: PENDING, CONFIRMED, REVERSED (default: PENDING)
FiscalYearID          uuid (optional)
JournalEntryID        uuid (optional, FK)
CashBankTransactionID uuid (optional)
Notes                 string (optional)
CreatedBy             string
CreatedAt             timestamp
UpdatedAt             timestamp

COA Resolution:
  if Method == CASH:
    resolve(finance.cash_default) → 11101 (Kas)
  else if Method == BANK:
    use BankAccount.ChartOfAccountID or resolve(finance.bank_default) → 11111 (Bank)

Posting Rule (ProfilePurchasePayment):
  When Status → CONFIRMED (via Confirm()):
    - Debit A/P = Amount
    - Credit Kas/Bank COA = Amount

Relationships:
  - SupplierInvoice (one)
  - BankAccount (one)
  - JournalEntry (one, optional)
```

### GoodsReceipt
Goods receipt confirmation.
```
ID             uuid
CompanyID      uuid (required)
PurchaseOrderID uuid (required, FK)
WarehouseID    uuid (optional, FK)
Code           string
ReceiptDate    date
Status         enum: DRAFT, CONFIRMED, CANCELLED (default: DRAFT)
JournalEntryID uuid (optional, FK)
CreatedAt      timestamp
UpdatedAt      timestamp

Posting Rule (ProfileGoodsReceipt):
  When Status → CONFIRMED:
    Inventory module triggers:
    - Debit Inventory (12100) = Sum(Qty × Cost)
    - Credit GR/IR (91100) = Sum(Qty × Cost)

Relationships:
  - Items (many, GoodsReceiptItem)
  - JournalEntry (one, optional)
```

---

## POS Module Models

### POSPayment
Payment at POS terminal.
```
ID              uuid
OrderID         uuid (required, FK to pos_orders)
Method          enum: CASH, CARD, QRIS, TRANSFER, DIGITAL
Status          enum: PENDING, PAID (default: PENDING)
Amount          decimal (amount due)
TenderAmount    decimal (for CASH: amount tendered)
ChangeAmount    decimal (for CASH: change given)
ReferenceNumber string (optional, for DIGITAL: transaction ID)
Notes           string (optional)
PaidAt          timestamp (optional)
CreatedBy       string
CreatedAt       timestamp
UpdatedAt       timestamp

Note: POSPayment does NOT directly store JournalEntryID.
Journal is created via linked SalesPayment after order finalization.

Relationships:
  - PosOrder (one)
```

### PosOrder
POS order record.
```
ID           uuid
OutletID     uuid (required, FK)
OrderNumber  string (unique per outlet)
Status       enum: OPEN, PAID, COMPLETED, VOIDED (default: OPEN)
OrderType    enum: DINE_IN, TAKE_AWAY, DELIVERY
GuestCount   int (default: 1)
TotalAmount  decimal
Notes        string (optional)
CreatedAt    timestamp
UpdatedAt    timestamp

Posting Flow:
  1. User pays (POSPayment created)
  2. On finalization:
     - Create SalesOrder
     - Create CustomerInvoice
     - Create SalesPayment (method resolved from POSPayment.Method)
  3. SalesPayment.Confirm() triggers journal via ProfileSalesPayment
     - If POSPayment.Method == CASH: uses Kas COA (11101)
     - Else: uses bank account COA

Relationships:
  - Items (many, PosOrderItem)
  - Payments (many, POSPayment)
```

---

## Inventory Module Models

### StockMovement
Individual stock transaction (in/out).
```
ID              uuid
CompanyID       uuid (required)
WarehouseID     uuid (required, FK)
ProductID       uuid (required, FK)
RefType         enum: GOODS_RECEIPT, DELIVERY_ORDER, PURCHASE_RETURN, SALES_RETURN, STOCK_OPNAME
RefNumber       string (document code)
Source          string (human-readable description)
QtyIn           decimal (quantity received)
QtyOut          decimal (quantity issued)
Cost            decimal (unit cost)
Date            date
JournalEntryID  uuid (optional, FK to journal_entries)
CreatedAt       timestamp
UpdatedAt       timestamp

Posting Rules:
  - GOODS_RECEIPT: Debit Inventory, Credit GR/IR
  - DELIVERY_ORDER: Debit COGS, Credit Inventory
  - PURCHASE_RETURN: Debit GR/IR, Credit Inventory
  - SALES_RETURN: Debit Inventory, Credit COGS
  - STOCK_OPNAME: Debit/Credit per variance

Relationships:
  - JournalEntry (one, optional)
  - Product (one)
```

---

## Common Enums

### AccountType
```
ASSET
LIABILITY
EQUITY
REVENUE
EXPENSE
CONTRA
```

### JournalStatus
```
DRAFT        - Editable, not posted
POSTED       - Committed to GL, immutable
CANCELLED    - Voided, excluded from GL
REVERSED     - Reversal entry created
```

### JournalType
```
GENERAL           - Manual or system posting
SALES             - Sales-related (invoice, payment, delivery)
PURCHASE          - Purchase-related (invoice, payment, receipt)
ADJUSTMENT        - Manual adjustment
OPENING_BALANCE   - Period opening balance
CLOSING           - Period closing entry
```

### SalesPaymentMethod / PurchasePaymentMethod
```
CASH       - Cash payment (resolves to finance.cash_default → 11101)
BANK       - Bank transfer (resolves to bank account COA or finance.bank_default → 11111)
CHEQUE     - Check payment
(others per company config)
```

### SalesPaymentStatus / PurchasePaymentStatus
```
PENDING     - Created, awaiting approval
CONFIRMED   - Approved, journal posted
REVERSED    - Reversed/cancelled
```

### CustomerInvoiceStatus
```
DRAFT       - Editable
APPROVED    - Approved, journal posted
PAID        - Fully paid (determined by remaining_amount == 0)
CANCELLED   - Voided
REJECTED    - Rejected (e.g., by approver)
```

### SupplierInvoiceStatus
```
DRAFT       - Editable
SUBMITTED   - Submitted for approval
APPROVED    - Approved, journal posted
PAID        - Fully paid
CANCELLED   - Voided
REJECTED    - Rejected
```

---

## COA Master List (Standard)

| Code  | Name | Type | Usage |
|-------|------|------|-------|
| 11101 | Kas | ASSET | Cash account (finance.cash_default) |
| 11111 | Bank | ASSET | Bank account (finance.bank_default) |
| 11210 | Sales Receivable (A/R) | ASSET | Customer invoices outstanding |
| 12100 | Inventory | ASSET | Stock of goods |
| 21210 | Purchase Payable (A/P) | LIABILITY | Supplier invoices outstanding |
| 21200 | Purchase VAT In | LIABILITY | Input VAT |
| 21220 | Advance/Prepayment | LIABILITY | Customer/supplier prepayments |
| 31100 | Owner Capital | EQUITY | Starting equity |
| 41100 | Sales Revenue | REVENUE | Sales income |
| 41200 | Sales VAT Out | REVENUE | Output VAT |
| 51100 | COGS | EXPENSE | Cost of goods sold |
| 51200 | Purchase Expense | EXPENSE | Purchase/import costs |
| 91100 | GR/IR | LIABILITY/ASSET | Goods Received / Invoice Received (reconciliation account) |

---

## Seeded System Account Mappings

| Key | COA Code | Purpose |
|-----|----------|---------|
| finance.cash_default | 11101 | Default cash account for CASH method payments |
| finance.bank_default | 11111 | Default bank account for BANK method payments |
| coa.sales_receivable | 11210 | A/R for customer invoices |
| coa.sales_revenue | 41100 | Sales revenue posting |
| coa.sales_vat_out | 41200 | Output VAT |
| coa.purchase_payable | 21210 | A/P for supplier invoices |
| coa.purchase_expense | 51200 | Purchase expense posting |
| coa.purchase_vat_in | 21200 | Input VAT |
| coa.gr_ir | 91100 | GR/IR reconciliation |
| coa.inventory | 12100 | Inventory asset |
| coa.cogs | 51100 | COGS posting |

---

**Last Updated:** May 11, 2026  
**Version:** 1.0
