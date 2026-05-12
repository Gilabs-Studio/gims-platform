# Journal Posting Architecture - Complete Documentation

**Last Updated:** May 11, 2026  
**Status:** Current & Validated  
**Scope:** Sales, Purchase, POS, Inventory, Finance modules

---

## Table of Contents

1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [Data Models](#data-models)
   - [Finance Core Models](#finance-core-models)
   - [Sales Models](#sales-models)
   - [Purchase Models](#purchase-models)
   - [POS Models](#pos-models)
   - [Inventory Models](#inventory-models)
4. [Processing Flows](#processing-flows)
5. [Posting Profiles](#posting-profiles)
6. [End-to-End Journeys](#end-to-end-journeys)
7. [Key Design Patterns](#key-design-patterns)
8. [Validation Checklist](#validation-checklist)

---

## Overview

The GIMS Platform uses a **Posting Profile + Accounting Engine** pattern to generate journal entries from business transactions. The flow is:

```
Transaction (Payment, Invoice, Receipt) 
  → Posting Profile (defines debit/credit rules)
    → Accounting Engine (resolves COAs)
      → Journal Entry Usecase (creates & posts)
        → Journal Entry + Journal Lines (in GL)
```

### Key Principles

- **Mapping-based COA Resolution**: Uses `SystemAccountMapping` to link logical keys (e.g., `finance.cash_default`) to chart of accounts dynamically.
- **Cash vs Bank Split**: When `method == CASH`, resolves `finance.cash_default` → COA 11101 (Kas). When `method == BANK`, resolves actual bank account COA or `finance.bank_default` → COA 11111.
- **Idempotent Journal Creation**: Journals are stored by `(reference_type, reference_id)` to prevent duplicates on re-approval.
- **Audit Trail Snapshots**: Journal lines store COA code, name, and type at posting time for historical accuracy.
- **System-Generated Auto-Post**: Journals created by backend logic (IsSystemGenerated=true) are posted immediately.

---

## Core Concepts

### System Account Mapping

Maps logical accounting keys to COA codes. Examples:
- `finance.cash_default` → `11101` (Kas)
- `finance.bank_default` → `11111` (Bank)
- `coa.sales_receivable` → `11210` (A/R)
- `coa.sales_revenue` → `41100` (Sales Revenue)

**Why?** Allows dynamic COA configuration without code changes. Different companies can map keys to different COAs.

### Posting Profile

Defines how a business transaction generates journal lines. Example for Sales Payment:

```
ProfileSalesPayment:
  Rule 1: 
    - COASettingKey: "coa.sales_receivable"
    - Side: "credit"
    - Amount: payment.amount
  Rule 2:
    - UseTransactionCOA: true  (debit with cash/bank COA from TransactionData)
    - Side: "debit"
    - Amount: payment.amount
```

### Transaction COA ID

Passed in `TransactionData` during journal generation. For payments:
- If `method == CASH`: Resolved from `finance.cash_default` mapping
- If `method == BANK`: Resolved from bank account's linked COA or `finance.bank_default`

---

## Data Models

### Finance Core Models

#### SystemAccountMapping

Maps logical finance keys to COA codes at the tenant/company level.

```go
type SystemAccountMapping struct {
    ID        string    `gorm:"type:uuid;primaryKey" json:"id"`
    TenantID  string    `gorm:"type:uuid;index" json:"tenant_id"`
    CompanyID *string   `gorm:"type:uuid;index" json:"company_id,omitempty"` // nil = tenant-wide
    
    // Mapping
    Key       string    `gorm:"type:varchar(255);index" json:"key"`         // "finance.cash_default", "coa.sales_receivable"
    COACode   string    `gorm:"type:varchar(50);index" json:"coa_code"`     // "11101", "11210"
    Label     string    `json:"label"`                                       // "Finance Cash Default"
    
    // Audit
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}
```

**Purpose:** Enable dynamic COA resolution without hardcoding. Seeded with:
- `finance.cash_default` → `11101`
- `finance.bank_default` → `11111`
- `coa.sales_receivable` → `11210`
- `coa.sales_revenue` → `41100`
- (and many more per domain)

**Usage:** Accounting engine queries this table to resolve COA codes for posting profile rules.

---

#### ChartOfAccount

Master list of all accounting accounts.

```go
type ChartOfAccount struct {
    ID          string    `gorm:"type:uuid;primaryKey" json:"id"`
    TenantID    string    `gorm:"type:uuid;index" json:"tenant_id"`
    
    // Account Definition
    Code        string    `gorm:"type:varchar(50);unique;index" json:"code"` // "11101", "11210", "41100"
    Name        string    `gorm:"type:varchar(255);index" json:"name"`       // "Kas", "Sales Receivable", "Sales Revenue"
    Type        AccountType `gorm:"type:varchar(50);index" json:"type"`      // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE, CONTRA
    Description string    `gorm:"type:text" json:"description,omitempty"`
    
    // Hierarchy & Control
    ParentID    *string   `gorm:"type:uuid" json:"parent_id,omitempty"`     // Parent COA for rollup
    IsActive    bool      `gorm:"default:true;index" json:"is_active"`
    IsPostable  bool      `gorm:"default:true" json:"is_postable"`           // Must be true to allow journal posting
    
    // Audit
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
    
    // Relationships
    BankAccounts []BankAccount `gorm:"foreignKey:ChartOfAccountID" json:"bank_accounts,omitempty"`
    JournalLines []JournalLine `gorm:"foreignKey:ChartOfAccountID" json:"journal_lines,omitempty"`
}
```

**Key COAs:**
- `11101` = Kas (Cash, Asset)
- `11111` = Bank (Bank Account, Asset)
- `11210` = A/R (Sales Receivable, Asset)
- `21210` = A/P (Purchase Payable, Liability)
- `31100` = Owner Capital (Equity)
- `41100` = Sales Revenue (Revenue)
- `51100` = Purchase Expense (Expense)
- `91100` = GR/IR (Goods Received/Invoice Received, Liability or Asset per context)

**Validation:** Before posting a journal, all referenced COAs must have `IsPostable = true`.

---

#### JournalEntry

Header record for a balanced journal entry.

```go
type JournalEntry struct {
    ID                    string        `gorm:"type:uuid;primaryKey" json:"id"`
    CompanyID             string        `gorm:"type:uuid;index" json:"company_id"`
    FiscalYearID          *string       `gorm:"type:uuid;index" json:"fiscal_year_id,omitempty"`
    
    // Identification
    JournalNumber         string        `gorm:"type:varchar(50);unique;index" json:"journal_number"` // GJ/2024/001, PJ/2024/001, SJ/2024/001
    EntryDate             time.Time     `gorm:"index" json:"entry_date"`
    Reference             string        `gorm:"type:varchar(255)" json:"reference,omitempty"`
    Description           string        `gorm:"type:text" json:"description"`
    
    // Linking to Source Document
    ReferenceType         *string       `gorm:"type:varchar(100);index" json:"reference_type,omitempty"` 
                                         // "SALES_PAYMENT", "PURCHASE_PAYMENT", "SALES_INVOICE", "SUPPLIER_INVOICE", 
                                         // "DELIVERY_ORDER", "GOODS_RECEIPT", "STOCK_MOVEMENT", "STOCK_OPNAME"
    ReferenceID           *string       `gorm:"type:uuid;index" json:"reference_id,omitempty"` // PK of source document
    
    // Type & Status
    JournalType           JournalType   `gorm:"type:varchar(50);default:'GENERAL'" json:"journal_type"` 
                                         // GENERAL, SALES, PURCHASE, ADJUSTMENT, OPENING_BALANCE, CLOSING
    Status                JournalStatus `gorm:"type:varchar(50);index;default:'DRAFT'" json:"status"` 
                                         // DRAFT, POSTED, CANCELLED, REVERSED
    
    // Balancing Totals
    DebitTotal            float64       `json:"debit_total"`
    CreditTotal           float64       `json:"credit_total"`
    
    // Currency
    CurrencyCode          string        `gorm:"type:varchar(10);default:'IDR'" json:"currency_code"`
    ExchangeRate          float64       `gorm:"default:1.0" json:"exchange_rate"`
    
    // Posting Control
    IsSystemGenerated     bool          `gorm:"default:false" json:"is_system_generated"` // true = auto-posted by BE
    SourceDocumentURL     *string       `json:"source_document_url,omitempty"`
    
    // Audit
    CreatedBy             *string       `json:"created_by"`
    CreatedAt             time.Time     `json:"created_at"`
    UpdatedAt             time.Time     `json:"updated_at"`
    DeletedAt             *time.Time    `gorm:"index" json:"-"`
    
    // Relationships
    JournalLines []JournalLine `gorm:"foreignKey:JournalEntryID;constraint:OnDelete:CASCADE" json:"journal_lines,omitempty"`
}
```

**Key Fields:**
- `ReferenceType + ReferenceID` = Unique composite key for idempotency (prevents duplicate journals on re-approval)
- `Status`: DRAFT (editable), POSTED (committed to GL), CANCELLED (voided), REVERSED (reversal entry created)
- `IsSystemGenerated`: true = created by backend logic and auto-posted; false = manual or awaiting approval
- `JournalNumber`: Auto-generated per fiscal year (GJ = General Journal, PJ = Purchase Journal, SJ = Sales Journal, etc.)

**Invariant:** `DebitTotal == CreditTotal` must always hold for status = POSTED.

---

#### JournalLine

Detail line for each debit/credit posting to a COA.

```go
type JournalLine struct {
    ID                              string    `gorm:"type:uuid;primaryKey" json:"id"`
    JournalEntryID                  string    `gorm:"type:uuid;index;constraint:OnDelete:CASCADE" json:"journal_entry_id"`
    
    // COA Reference
    ChartOfAccountID                string    `gorm:"type:uuid;index" json:"chart_of_account_id"` // FK to chart_of_accounts
    
    // Audit Trail Snapshots (immutable at posting time)
    ChartOfAccountCodeSnapshot      string    `gorm:"type:varchar(50)" json:"chart_of_account_code_snapshot"` // e.g., "11101"
    ChartOfAccountNameSnapshot      string    `gorm:"type:varchar(255)" json:"chart_of_account_name_snapshot"` // e.g., "Kas"
    ChartOfAccountTypeSnapshot      string    `gorm:"type:varchar(50)" json:"chart_of_account_type_snapshot"`  // e.g., "ASSET"
    
    // Amounts
    Debit                           float64   `json:"debit"`  // > 0 if debit side; else 0
    Credit                          float64   `json:"credit"` // > 0 if credit side; else 0
    
    // Description
    Memo                            string    `gorm:"type:text" json:"memo"`
    
    // Audit
    CreatedAt                       time.Time `json:"created_at"`
    UpdatedAt                       time.Time `json:"updated_at"`
    
    // Relationships
    JournalEntry *JournalEntry `gorm:"foreignKey:JournalEntryID" json:"journal_entry,omitempty"`
    ChartOfAccount *ChartOfAccount `gorm:"foreignKey:ChartOfAccountID" json:"chart_of_account,omitempty"`
}
```

**Key Fields:**
- `Debit` and `Credit`: Only one is > 0 per line. Debit side = debit amount, credit side = 0.
- Snapshots: Preserve COA state at posting time (code, name, type) to support historical GL reports even if COA is deleted/renamed.
- `Memo`: Extracted from posting profile template (e.g., "Payment received for Invoice #SO-2024-001").

**Invariant:** For each line, `(Debit > 0 AND Credit == 0) OR (Debit == 0 AND Credit > 0)`.

---

### Core Models (General Use)

#### BankAccount

Operational bank account record. Links to a COA for journal posting.

```go
type BankAccount struct {
    ID                    string    `gorm:"type:uuid;primaryKey" json:"id"`
    TenantID              string    `gorm:"type:uuid;index" json:"tenant_id"`
    CompanyID             *string   `gorm:"type:uuid;index" json:"company_id,omitempty"` // nil = tenant-level account
    
    // Bank Details
    BankName              string    `json:"bank_name"`                                           // "BCA", "Mandiri"
    AccountNumber         string    `gorm:"type:varchar(100);unique:idx_tenant_accountnumber" json:"account_number"`
    AccountHolderName     string    `json:"account_holder_name"`
    
    // Accounting Link
    ChartOfAccountID      *string   `gorm:"type:uuid;index" json:"chart_of_account_id"` // FK to chart_of_accounts (11101 for Kas, 11111 for Bank)
    
    // Currency
    CurrencyCode          string    `gorm:"type:varchar(10);default:'IDR'" json:"currency_code"`
    
    // Status & Balance
    IsActive              bool      `gorm:"default:true;index" json:"is_active"`
    OpeningBalance        float64   `json:"opening_balance"`
    CurrentBalance        float64   `json:"current_balance"`
    
    // Audit
    CreatedAt             time.Time `json:"created_at"`
    UpdatedAt             time.Time `json:"updated_at"`
    
    // Relationships
    ChartOfAccount *ChartOfAccount `gorm:"foreignKey:ChartOfAccountID" json:"chart_of_account,omitempty"`
}
```

**Purpose:** Operational tracking of bank/cash accounts. Links to a COA for journal posting.

**Example:**
- Bank Account "BCA 1234567" → ChartOfAccountID = "11111" (Bank COA)
- Cash Drawer "Kas Kecil" → ChartOfAccountID = "11101" (Cash COA)

**Note:** When creating a payment with `method = CASH`, the usecase resolves a bank account linked to the `finance.cash_default` COA (11101).

---

### Sales Models

#### SalesPayment

Payment record linking a customer invoice to a payment method (cash or bank).

```go
type SalesPayment struct {
    ID                    string              `gorm:"type:uuid;primaryKey" json:"id"`
    CompanyID             string              `gorm:"type:uuid;index" json:"company_id"`
    
    // Links
    CustomerInvoiceID     string              `gorm:"type:uuid;index" json:"customer_invoice_id"` // FK to customer_invoices
    BankAccountID         *string             `gorm:"type:uuid;index" json:"bank_account_id,omitempty"` 
                                               // null if method=CASH (COA resolved from mapping)
                                               // filled if method=BANK or for operational tracking
    
    // Payment Details
    PaymentDate           string              `gorm:"type:varchar(20);index" json:"payment_date"` // ISO format YYYY-MM-DD
    ReferenceNumber       *string             `json:"reference_number,omitempty"`
    Amount                float64             `json:"amount"`
    Method                SalesPaymentMethod  `gorm:"type:varchar(20);index" json:"method"` // CASH, BANK, CHEQUE, etc.
    
    // Status & Posting
    Status                SalesPaymentStatus  `gorm:"type:varchar(20);default:'PENDING'" json:"status"` 
                                               // PENDING (created), CONFIRMED (approved + journaled), REVERSED
    JournalEntryID        *string             `gorm:"type:uuid;index" json:"journal_entry_id,omitempty"` 
                                               // Populated after journal creation
    
    // Linking to Cash-Bank Transaction (optional)
    CashBankTransactionID *string             `gorm:"type:uuid" json:"cash_bank_transaction_id,omitempty"`
    
    // Description
    Notes                 string              `gorm:"type:text" json:"notes,omitempty"`
    
    // Audit
    CreatedBy             string              `json:"created_by"`
    CreatedAt             time.Time           `json:"created_at"`
    UpdatedAt             time.Time           `json:"updated_at"`
    
    // Relationships
    CustomerInvoice *CustomerInvoice `gorm:"foreignKey:CustomerInvoiceID" json:"customer_invoice,omitempty"`
    BankAccount     *BankAccount     `gorm:"foreignKey:BankAccountID" json:"bank_account,omitempty"`
    JournalEntry    *JournalEntry    `gorm:"foreignKey:JournalEntryID" json:"journal_entry,omitempty"`
}
```

**Key Fields:**
- `Method`: CASH → COA from `finance.cash_default`; BANK → COA from bank account or `finance.bank_default`
- `BankAccountID`: For CASH, typically null (resolved at journal time); for BANK, links to actual bank account
- `JournalEntryID`: Populated after `Confirm()` triggers journal creation
- `Status`: PENDING → CONFIRMED (idempotent via reference_type + reference_id)

**Flow:**
1. Create: User selects method and (optionally) bank account
2. Confirm: System resolves COA, generates journal, updates status to CONFIRMED
3. Reverse: Creates reversal journal entry, updates status to REVERSED

---

#### CustomerInvoice

Sales invoice record.

```go
type CustomerInvoice struct {
    ID                    string                `gorm:"type:uuid;primaryKey" json:"id"`
    CompanyID             string                `gorm:"type:uuid;index" json:"company_id"`
    
    // Links to Source Documents
    SalesOrderID          *string               `gorm:"type:uuid;index" json:"sales_order_id,omitempty"`
    DeliveryOrderID       *string               `gorm:"type:uuid;index" json:"delivery_order_id,omitempty"`
    
    // Invoice Identification
    Code                  string                `gorm:"type:varchar(100);index" json:"code"` // Internal identifier
    InvoiceNumber         *string               `gorm:"type:varchar(100);unique" json:"invoice_number,omitempty"` // Customer-facing number
    
    // Type & Dates
    Type                  CustomerInvoiceType   `gorm:"type:varchar(50);default:'REGULAR'" json:"type"` 
                                                 // REGULAR (full invoice), DOWN_PAYMENT (DP invoice)
    InvoiceDate           time.Time             `json:"invoice_date"`
    DueDate               *time.Time            `json:"due_date,omitempty"`
    
    // Amounts
    Amount                float64               `json:"amount"`           // Total after tax
    Subtotal              float64               `json:"subtotal"`         // Before tax
    TaxAmount             float64               `json:"tax_amount"`
    DownPaymentAmount     float64               `json:"down_payment_amount,omitempty"`
    RemainingAmount       float64               `gorm:"default:0" json:"remaining_amount"` // Outstanding after payments
    
    // Status & Posting
    Status                CustomerInvoiceStatus `gorm:"type:varchar(50);default:'DRAFT'" json:"status"`
                                                 // DRAFT, APPROVED, PAID, CANCELLED, REJECTED
    JournalEntryID        *string               `gorm:"type:uuid;index" json:"journal_entry_id,omitempty"`
    IsPosted              bool                  `gorm:"default:false" json:"is_posted"` // true = journal entry created
    
    // Audit
    CreatedAt             time.Time             `json:"created_at"`
    UpdatedAt             time.Time             `json:"updated_at"`
    
    // Relationships
    Items        []CustomerInvoiceItem `gorm:"foreignKey:CustomerInvoiceID;constraint:OnDelete:CASCADE" json:"items,omitempty"`
    Payments     []SalesPayment        `gorm:"foreignKey:CustomerInvoiceID" json:"payments,omitempty"`
    JournalEntry *JournalEntry         `gorm:"foreignKey:JournalEntryID" json:"journal_entry,omitempty"`
}
```

**Posting Trigger:** On approval (status → APPROVED), triggers journal via `ProfileSalesInvoice`:
- Debit: A/R (11210) = invoice amount
- Credit: Sales Revenue (41100) = subtotal
- Credit: Sales VAT Out (41200) = tax amount

---

#### DeliveryOrder

Delivery order for shipment.

```go
type DeliveryOrder struct {
    ID             string              `gorm:"type:uuid;primaryKey" json:"id"`
    CompanyID      string              `gorm:"type:uuid;index" json:"company_id"`
    
    // Links
    SalesOrderID   string              `gorm:"type:uuid;index" json:"sales_order_id"` // FK to sales_orders
    
    // Identification
    Code           string              `gorm:"type:varchar(100);index" json:"code"`
    DeliveryDate   time.Time           `json:"delivery_date"`
    
    // Status & Posting
    Status         DeliveryOrderStatus `gorm:"type:varchar(50);default:'DRAFT'" json:"status"`
                                        // DRAFT, SHIPPED, DELIVERED, CANCELLED
    IsPosted       bool                `gorm:"default:false;index" json:"is_posted"`
    JournalEntryID *string             `gorm:"type:uuid;index" json:"journal_entry_id"`
    
    // Audit
    CreatedAt      time.Time           `json:"created_at"`
    UpdatedAt      time.Time           `json:"updated_at"`
    
    // Relationships
    Items        []DeliveryOrderItem `gorm:"foreignKey:DeliveryOrderID;constraint:OnDelete:CASCADE" json:"items,omitempty"`
    JournalEntry *JournalEntry       `gorm:"foreignKey:JournalEntryID" json:"journal_entry,omitempty"`
}
```

**Posting Trigger:** On ship (status → SHIPPED), inventory module triggers COGS journal via `ProfileSalesJournal`:
- Debit: COGS (51100) = cost of goods
- Credit: Inventory (12100) = cost of goods

---

### Purchase Models

#### PurchasePayment

Payment record for supplier invoice.

```go
type PurchasePayment struct {
    ID                    string                  `gorm:"type:uuid;primaryKey" json:"id"`
    CompanyID             *string                 `gorm:"type:uuid;index" json:"company_id,omitempty"`
    
    // Links
    SupplierInvoiceID     string                  `gorm:"type:uuid;index" json:"supplier_invoice_id"` // FK to supplier_invoices
    
    // Payment Details
    BankAccountID         string                  `gorm:"type:uuid;index" json:"bank_account_id"` 
                                                   // Always stored operationally; COA resolved per method
    PaymentDate           string                  `gorm:"type:varchar(20);index" json:"payment_date"`
    ReferenceNumber       *string                 `json:"reference_number,omitempty"`
    Amount                float64                 `json:"amount"`
    Method                PurchasePaymentMethod   `gorm:"type:varchar(20);index" json:"method"` // BANK, CASH, CHEQUE
    
    // Status & Posting
    Status                PurchasePaymentStatus   `gorm:"type:varchar(20);default:'PENDING';index" json:"status"`
                                                   // PENDING, CONFIRMED, REVERSED
    FiscalYearID          *string                 `gorm:"type:uuid" json:"fiscal_year_id,omitempty"`
    JournalEntryID        *string                 `gorm:"type:uuid;index" json:"journal_entry_id,omitempty"`
    
    // Linking to Cash-Bank Transaction (optional)
    CashBankTransactionID *string                 `gorm:"type:uuid" json:"cash_bank_transaction_id,omitempty"`
    
    // Description
    Notes                 string                  `gorm:"type:text" json:"notes,omitempty"`
    
    // Audit
    CreatedBy             string                  `json:"created_by"`
    CreatedAt             time.Time               `json:"created_at"`
    UpdatedAt             time.Time               `json:"updated_at"`
    
    // Relationships
    SupplierInvoice *SupplierInvoice `gorm:"foreignKey:SupplierInvoiceID" json:"supplier_invoice,omitempty"`
    BankAccount     *BankAccount     `gorm:"foreignKey:BankAccountID" json:"bank_account,omitempty"`
    JournalEntry    *JournalEntry    `gorm:"foreignKey:JournalEntryID" json:"journal_entry,omitempty"`
}
```

**Differences from SalesPayment:**
- Always stores `BankAccountID` (operationally required)
- When `method == CASH`, COA resolved from `finance.cash_default` at journal time, not from bank account

---

#### SupplierInvoice

Purchase invoice from supplier.

```go
type SupplierInvoice struct {
    ID                string                `gorm:"type:uuid;primaryKey" json:"id"`
    CompanyID         string                `gorm:"type:uuid;index" json:"company_id"`
    
    // Links to Source Documents
    PurchaseOrderID   *string               `gorm:"type:uuid;index" json:"purchase_order_id,omitempty"`
    GoodsReceiptID    *string               `gorm:"type:uuid;index" json:"goods_receipt_id,omitempty"`
    
    // Invoice Identification
    Code              string                `gorm:"type:varchar(100);index" json:"code"`
    InvoiceNumber     string                `gorm:"type:varchar(100);unique" json:"invoice_number"` // Supplier invoice number
    
    // Type & Dates
    Type              SupplierInvoiceType   `gorm:"type:varchar(50);default:'NORMAL'" json:"type"`
                                             // NORMAL, DOWN_PAYMENT
    InvoiceDate       string                `gorm:"type:varchar(20);index" json:"invoice_date"` // ISO YYYY-MM-DD
    DueDate           *string               `gorm:"type:varchar(20)" json:"due_date,omitempty"`
    
    // Amounts
    SubTotal          float64               `json:"sub_total"`
    TaxAmount         float64               `json:"tax_amount"`
    DeliveryCost      float64               `json:"delivery_cost"`
    OtherCost         float64               `json:"other_cost"`
    Amount            float64               `json:"amount"` // Subtotal + Tax + Delivery + Other
    DownPaymentAmount float64               `json:"down_payment_amount"`
    RemainingAmount   float64               `gorm:"default:0" json:"remaining_amount"` // Outstanding
    
    // Status & Posting
    Status            SupplierInvoiceStatus `gorm:"type:varchar(50);default:'DRAFT'" json:"status"`
                                             // DRAFT, SUBMITTED, APPROVED, PAID, CANCELLED, REJECTED
    JournalEntryID    *string               `gorm:"type:uuid;index" json:"journal_entry_id,omitempty"`
    IsPosted          bool                  `gorm:"default:false" json:"is_posted"`
    
    // Audit
    CreatedAt         time.Time             `json:"created_at"`
    UpdatedAt         time.Time             `json:"updated_at"`
    
    // Relationships
    Items        []SupplierInvoiceItem `gorm:"foreignKey:SupplierInvoiceID;constraint:OnDelete:CASCADE" json:"items,omitempty"`
    Payments     []PurchasePayment     `gorm:"foreignKey:SupplierInvoiceID" json:"payments,omitempty"`
    JournalEntry *JournalEntry         `gorm:"foreignKey:JournalEntryID" json:"journal_entry,omitempty"`
}
```

**Posting Trigger:** On approval (status → APPROVED), triggers journal via `ProfileSupplierInvoice`:
- Debit: GR/IR (91100) = subtotal + delivery
- Debit: Purchase VAT In (21200) = tax
- Debit: Purchase Expense (51200) = other cost
- Credit: A/P (21210) = total amount
- (Optional) Debit: Advance/Prepayment (21220) if DP applied

---

#### GoodsReceipt

Goods receipt confirmation.

```go
type GoodsReceipt struct {
    ID                 string              `gorm:"type:uuid;primaryKey" json:"id"`
    CompanyID          string              `gorm:"type:uuid;index" json:"company_id"`
    
    // Links
    PurchaseOrderID    string              `gorm:"type:uuid;index" json:"purchase_order_id"` // FK
    WarehouseID        *string             `gorm:"type:uuid;index" json:"warehouse_id,omitempty"`
    
    // Identification
    Code               string              `gorm:"type:varchar(100);index" json:"code"`
    ReceiptDate        time.Time           `json:"receipt_date"`
    
    // Status & Posting
    Status             GoodsReceiptStatus  `gorm:"type:varchar(50);default:'DRAFT'" json:"status"`
                                            // DRAFT, CONFIRMED, CANCELLED
    JournalEntryID     *string             `gorm:"type:uuid;index" json:"journal_entry_id,omitempty"`
    
    // Audit
    CreatedAt          time.Time           `json:"created_at"`
    UpdatedAt          time.Time           `json:"updated_at"`
    
    // Relationships
    Items        []GoodsReceiptItem `gorm:"foreignKey:GoodsReceiptID;constraint:OnDelete:CASCADE" json:"items,omitempty"`
    JournalEntry *JournalEntry      `gorm:"foreignKey:JournalEntryID" json:"journal_entry,omitempty"`
}
```

**Posting Trigger:** On confirm (status → CONFIRMED), inventory module creates stock movements and consolidates journal via `ProfileGoodsReceipt`:
- Debit: Inventory (12100) = quantity × cost
- Credit: GR/IR (91100) = quantity × cost

---

### POS Models

#### POSPayment

Payment at POS terminal.

```go
type POSPayment struct {
    ID              string         `gorm:"type:uuid;primaryKey" json:"id"`
    OrderID         string         `gorm:"type:uuid;index" json:"order_id"` // FK to pos_orders
    
    // Payment Details
    Method          POSPaymentMethod `gorm:"type:varchar(20);index" json:"method"` 
                                       // CASH, CARD, QRIS, TRANSFER, DIGITAL
    Status          POSPaymentStatus `gorm:"type:varchar(20);default:'PENDING'" json:"status"`
                                       // PENDING, PAID
    Amount          float64        `json:"amount"` // Amount due
    
    // Cash-Specific Fields
    TenderAmount    float64        `json:"tender_amount"` // Amount tendered (for CASH method)
    ChangeAmount    float64        `json:"change_amount"` // Change given back
    
    // Digital-Specific Fields
    ReferenceNumber *string        `json:"reference_number,omitempty"` // Transaction ID from payment provider
    
    // Description
    Notes           string         `gorm:"type:text" json:"notes,omitempty"`
    
    // Timestamps
    PaidAt          *time.Time     `json:"paid_at,omitempty"`
    
    // Audit
    CreatedBy       string         `json:"created_by"`
    CreatedAt       time.Time      `json:"created_at"`
    UpdatedAt       time.Time      `json:"updated_at"`
    
    // Relationships
    PosOrder *PosOrder `gorm:"foreignKey:OrderID" json:"pos_order,omitempty"`
}
```

**Note:** POSPayment does NOT store `JournalEntryID` directly. Journal entry is created via the linked SalesPayment after order finalization.

---

#### PosOrder

POS order record.

```go
type PosOrder struct {
    ID           string     `gorm:"type:uuid;primaryKey" json:"id"`
    OutletID     string     `gorm:"type:uuid;index" json:"outlet_id"` // FK
    
    // Order Identification
    OrderNumber  string     `gorm:"type:varchar(100);index" json:"order_number"`
    
    // Order Status
    Status       PosOrderStatus `gorm:"type:varchar(50);default:'OPEN'" json:"status"`
                                 // OPEN, PAID, COMPLETED, VOIDED
    
    // Order Details
    OrderType    OrderType  `gorm:"type:varchar(50)" json:"order_type"` // DINE_IN, TAKE_AWAY, DELIVERY
    GuestCount   int        `gorm:"default:1" json:"guest_count"`
    TotalAmount  float64    `json:"total_amount"`
    
    // Description
    Notes        string     `gorm:"type:text" json:"notes,omitempty"`
    
    // Audit
    CreatedAt    time.Time  `json:"created_at"`
    UpdatedAt    time.Time  `json:"updated_at"`
    
    // Relationships
    Items    []PosOrderItem `gorm:"foreignKey:OrderID;constraint:OnDelete:CASCADE" json:"items,omitempty"`
    Payments []POSPayment   `gorm:"foreignKey:OrderID;constraint:OnDelete:CASCADE" json:"payments,omitempty"`
}
```

**Posting Flow:**
1. User completes POS order and makes payment (POSPayment created)
2. On finalization: Backend creates SalesOrder, CustomerInvoice, SalesPayment
3. SalesPayment.Confirm() triggers journal via `ProfileSalesPayment`

---

### Inventory Models

#### StockMovement

Individual stock transaction.

```go
type StockMovement struct {
    ID              string    `gorm:"type:uuid;primaryKey" json:"id"`
    CompanyID       string    `gorm:"type:uuid;index" json:"company_id"`
    
    // Location & Product
    WarehouseID     string    `gorm:"type:uuid;index" json:"warehouse_id"` // FK
    ProductID       string    `gorm:"type:uuid;index" json:"product_id"`   // FK
    
    // Reference to Source Document
    RefType         string    `gorm:"type:varchar(100);index" json:"ref_type"` 
                               // GOODS_RECEIPT, DELIVERY_ORDER, PURCHASE_RETURN, SALES_RETURN, STOCK_OPNAME
    RefNumber       string    `gorm:"type:varchar(255);index" json:"ref_number"` // Document code
    Source          string    `gorm:"type:text" json:"source"` // Human-readable description
    
    // Quantities & Cost
    QtyIn           float64   `json:"qty_in"`  // Quantity received
    QtyOut          float64   `json:"qty_out"` // Quantity issued
    Cost            float64   `json:"cost"`    // Unit cost
    
    // Timestamp
    Date            time.Time `gorm:"index" json:"date"`
    
    // Posting
    JournalEntryID  *string   `gorm:"type:uuid;index" json:"journal_entry_id,omitempty"` 
                               // Links to COGS/Inventory journal
    
    // Audit
    CreatedAt       time.Time `json:"created_at"`
    UpdatedAt       time.Time `json:"updated_at"`
    
    // Relationships
    JournalEntry *JournalEntry `gorm:"foreignKey:JournalEntryID" json:"journal_entry,omitempty"`
    Product      *Product      `gorm:"foreignKey:ProductID" json:"product,omitempty"`
}
```

**Posting Triggers:**
- **GOODS_RECEIPT**: Debit Inventory, Credit GR/IR
- **DELIVERY_ORDER**: Debit COGS, Credit Inventory
- **PURCHASE_RETURN**: Debit GR/IR, Credit Inventory
- **SALES_RETURN**: Debit Inventory, Credit COGS
- **STOCK_OPNAME**: Debit/Credit Inventory, Credit/Debit Inventory Adjustment per variance

---

## Processing Flows

### Journal Generation Flow

```
1. Document Approval (Invoice, Payment, Receipt, etc.)
   ↓
2. Usecase triggers JournalService or directly calls accounting_engine.GenerateJournal()
   ├─ Input: PostingProfile (defines rules)
   ├─ Input: TransactionData (payment amount, COA ID, items, etc.)
   ├─ Input: optional transaction COA ID (for cash/bank)
   ↓
3. AccountingEngine.GenerateJournal()
   ├─ Validates all COA settings in profile exist (pre-check)
   ├─ For each posting rule:
   │  ├─ Resolve COA based on rule source:
   │  │  ├─ If COASettingKey: lookup system_account_mappings[key] → COA code
   │  │  ├─ If UseTransactionCOA: use TransactionCOAID from data
   │  │  ├─ If COASource="bank_account": use data.BankAccountCOAID
   │  │  └─ If COASource="line_item": use line's COA
   │  ├─ Calculate amount based on AmountSource (total, subtotal, tax, cogs, line_amount)
   │  ├─ Create JournalLineRequest { coa_id, debit, credit, memo }
   ├─ Assemble CreateJournalEntryRequest { lines[], reference_type, reference_id, ... }
   ↓
4. JournalEntryUsecase.PostOrUpdateJournal()
   ├─ Check if journal exists by (reference_type, reference_id)
   ├─ If not exists:
   │  ├─ Validate lines balance (debit_total == credit_total)
   │  ├─ Create JournalEntry { status: POSTED, is_system_generated: true }
   │  ├─ Create JournalLine records with snapshots
   ├─ If exists & idempotent: Return existing journal
   ↓
5. Journal Posted to GL
   └─ GL reports now include these lines
```

---

## Posting Profiles

### Sales Module Profiles

#### ProfileSalesInvoice

Debit A/R, Credit Revenue + VAT.

```
Rules:
  1. COASettingKey: "coa.sales_receivable"
     Side: "debit"
     AmountSource: "total"
     → Debit A/R by invoice total
     
  2. COASettingKey: "coa.sales_revenue"
     Side: "credit"
     AmountSource: "sub_total"
     → Credit Sales Revenue by subtotal
     
  3. COASettingKey: "coa.sales_vat_out"
     Side: "credit"
     AmountSource: "tax_total"
     → Credit Sales VAT Out by tax amount
```

**Journal Entry:**
```
  Debit  A/R (11210)              = 1,100
  Credit Sales Revenue (41100)    =   1,000
  Credit Sales VAT Out (41200)    =     100
  ─────────────────────────────────────────
         Balance                  = 1,100 = 1,100 ✓
```

---

#### ProfileSalesPayment

Debit Cash/Bank (via TransactionCOA), Credit A/R.

```
Rules:
  1. UseTransactionCOA: true
     Side: "debit"
     AmountSource: "total"
     → Debit Kas/Bank by payment amount (COA resolved from mapping if CASH)
     
  2. COASettingKey: "coa.sales_receivable"
     Side: "credit"
     AmountSource: "total"
     → Credit A/R by payment amount
```

**Journal Entry (CASH):**
```
  Debit  Kas (11101)              =   1,100  (from finance.cash_default mapping)
  Credit A/R (11210)              =   1,100
  ─────────────────────────────────────────
         Balance                  = 1,100 = 1,100 ✓
```

**Journal Entry (BANK):**
```
  Debit  BCA Bank (11111)         =   1,100  (from bank account COA)
  Credit A/R (11210)              =   1,100
  ─────────────────────────────────────────
         Balance                  = 1,100 = 1,100 ✓
```

---

#### ProfileSalesPaymentDP

Down payment allocation.

```
Rules:
  1. UseTransactionCOA: true
     Side: "debit"
     AmountSource: "total"
     → Debit Kas/Bank
     
  2. COASettingKey: "coa.sales_receivable_dp"
     Side: "credit"
     AmountSource: "total"
     → Credit Advance Customer
```

---

### Purchase Module Profiles

#### ProfileSupplierInvoice

Debit GR/IR + VAT + Expense, Credit A/P.

```
Rules:
  1. COASettingKey: "coa.gr_ir"
     Side: "debit"
     AmountSource: "sub_total"  (with delivery cost)
     → Debit GR/IR by subtotal + delivery
     
  2. COASettingKey: "coa.purchase_vat_in"
     Side: "debit"
     AmountSource: "tax_total"
     → Debit Purchase VAT In by tax amount
     
  3. COASettingKey: "coa.purchase_expense"
     Side: "debit"
     AmountSource: "other_cost"
     → Debit Purchase Expense by other costs
     
  4. COASettingKey: "coa.purchase_payable"
     Side: "credit"
     AmountSource: "total"
     → Credit A/P by total invoice amount
```

**Journal Entry:**
```
  Debit  GR/IR (91100)            =   1,000  (subtotal + delivery)
  Debit  Purchase VAT In (21200)  =     100
  Debit  Purchase Expense (51200) =      50  (other cost)
  Credit A/P (21210)              =   1,150
  ─────────────────────────────────────────
         Balance                  = 1,150 = 1,150 ✓
```

---

#### ProfilePurchasePayment

Debit A/P, Credit Cash/Bank.

```
Rules:
  1. COASettingKey: "coa.purchase_payable"
     Side: "debit"
     AmountSource: "total"
     → Debit A/P
     
  2. UseTransactionCOA: true
     Side: "credit"
     AmountSource: "total"
     → Credit Kas/Bank (COA resolved from mapping if CASH)
```

**Journal Entry (CASH):**
```
  Debit  A/P (21210)              =   1,150
  Credit Kas (11101)              =   1,150  (from finance.cash_default mapping)
  ─────────────────────────────────────────
         Balance                  = 1,150 = 1,150 ✓
```

---

### Inventory Module Profiles

#### ProfileGoodsReceipt

Debit Inventory, Credit GR/IR.

```
Rules:
  1. COASettingKey: "coa.inventory"
     Side: "debit"
     AmountSource: "line_amount"  (qty × cost per line)
     → Debit Inventory
     
  2. COASettingKey: "coa.gr_ir"
     Side: "credit"
     AmountSource: "total"
     → Credit GR/IR
```

**Journal Entry:**
```
  Debit  Inventory (12100)        =   1,000  (qty × cost)
  Credit GR/IR (91100)            =   1,000
  ─────────────────────────────────────────
         Balance                  = 1,000 = 1,000 ✓
```

---

#### ProfileSalesDelivery (COGS)

Debit COGS, Credit Inventory.

```
Rules:
  1. COASettingKey: "coa.cogs"
     Side: "debit"
     AmountSource: "line_amount"  (qty × cost per line)
     → Debit COGS
     
  2. COASettingKey: "coa.inventory"
     Side: "credit"
     AmountSource: "total"
     → Credit Inventory
```

**Journal Entry:**
```
  Debit  COGS (51100)             =   1,000  (qty × cost)
  Credit Inventory (12100)        =   1,000
  ─────────────────────────────────────────
         Balance                  = 1,000 = 1,000 ✓
```

---

## End-to-End Journeys

### Journey 1: Sales Payment (CASH)

**Scenario:** Customer pays 1,000 IDR in cash for a 1,100 IDR invoice.

**Step 1: FE - Sales Payment Form**
```
User Input:
  - Invoice: SO-2024-001 (1,100 IDR)
  - Method: CASH
  - Amount: 1,100
  - Bank Account: [cleared, because method = CASH]

Submit POST /sales/payments {
  customer_invoice_id: "inv_uuid",
  amount: 1100,
  method: "CASH",
  bank_account_id: null,  // explicitly null for CASH
  ...
}
```

**Step 2: BE - Create Payment**
```
sales_payment_usecase.Create():
  1. resolveBankAccountForPaymentCreate(..., CASH, ...)
     → Resolves finance.cash_default mapping
     → Finds bank account linked to Kas COA (11101)
     → bank_kas_uuid = "bank_123"
     
  2. Create SalesPayment {
       id: "pay_uuid",
       customer_invoice_id: "inv_uuid",
       amount: 1100,
       method: "CASH",
       bank_account_id: "bank_123",  // operational tracking
       status: "PENDING",
       ...
     }
```

**Step 3: User Approves - BE Triggers Journal**
```
sales_payment_usecase.Confirm("pay_uuid"):
  1. Load payment
  2. triggerJournalEntry(payment):
     a. Resolve bank account again: resolveBankAccountForPaymentCreate(...)
     b. For CASH: resolve finance.cash_default → COA ID "coa_kas_uuid"
     c. Build TransactionData {
          Amount: 1100,
          TransactionCOAID: "coa_kas_uuid",  // Kas COA
          ...
        }
     d. Call accounting_engine.GenerateJournal(ProfileSalesPayment, data):
        - Rule 1: COASettingKey="coa.sales_receivable", debit=false, amount=1100
          → COA lookup: system_account_mappings["coa.sales_receivable"] = "11210"
          → Create line: credit 1100 to 11210
          
        - Rule 2: UseTransactionCOA=true, debit=true, amount=1100
          → Use TransactionCOAID = "coa_kas_uuid" (= 11101)
          → Create line: debit 1100 to 11101
        
        → Result: CreateJournalEntryRequest {
            reference_type: "SALES_PAYMENT",
            reference_id: "pay_uuid",
            lines: [
              { chart_of_account_id: "coa_kas_uuid", debit: 1100, credit: 0, ... },
              { chart_of_account_id: "coa_ar_uuid", debit: 0, credit: 1100, ... }
            ],
            ...
          }
     
     e. Call journal_entry_usecase.PostOrUpdateJournal(req):
        - Check: journal exists by (reference_type="SALES_PAYMENT", reference_id="pay_uuid")?
          → No, first approval
        - Validate: debit (1100) == credit (1100) ✓
        - Create JournalEntry {
            id: "je_uuid",
            reference_type: "SALES_PAYMENT",
            reference_id: "pay_uuid",
            status: "POSTED",
            is_system_generated: true,
            debit_total: 1100,
            credit_total: 1100,
            ...
          }
        - Create 2 JournalLine records with snapshots
        - Return journal
     
     f. Update payment:
        payment.journal_entry_id = "je_uuid"
        payment.status = "CONFIRMED"
        save()
```

**Step 4: GL Report**
```
GL Account Report shows:

Account: 11101 (Kas)
  Debit:   1,100 IDR  (from SALES_PAYMENT entry)
  Credit:  -

Account: 11210 (A/R)
  Debit:   -
  Credit:  1,100 IDR  (from SALES_PAYMENT entry)
```

---

### Journey 2: Purchase Payment (BANK)

**Scenario:** Company pays 1,150 IDR to supplier via BCA bank account for an invoice.

**Step 1: FE - Purchase Payment Form**
```
User Input:
  - Invoice: SI-2024-001 (1,150 IDR)
  - Method: BANK
  - Amount: 1,150
  - Bank Account: BCA-1234567

Submit POST /purchase/payments {
  supplier_invoice_id: "si_uuid",
  amount: 1150,
  method: "BANK",
  bank_account_id: "bank_bca_uuid",
  ...
}
```

**Step 2: BE - Create Payment**
```
purchase_payment_usecase.Create():
  1. resolvePurchasePaymentBankAccountForCreate(..., BANK, bank_bca_uuid, ...)
     → Return bank account linked to BCA COA (11111)
     
  2. Create PurchasePayment {
       id: "pp_uuid",
       supplier_invoice_id: "si_uuid",
       amount: 1150,
       method: "BANK",
       bank_account_id: "bank_bca_uuid",
       status: "PENDING",
       ...
     }
```

**Step 3: User Approves - BE Triggers Journal**
```
purchase_payment_usecase.Confirm("pp_uuid"):
  1. Load payment
  2. triggerJournalEntry(payment):
     a. Resolve bank account: BCA COA = "coa_bank_uuid" (11111)
     b. Build TransactionData {
          Amount: 1150,
          TransactionCOAID: "coa_bank_uuid",
          ...
        }
     c. Call accounting_engine.GenerateJournal(ProfilePurchasePayment, data):
        - Rule 1: COASettingKey="coa.purchase_payable", debit=true, amount=1150
          → COA lookup: system_account_mappings["coa.purchase_payable"] = "21210"
          → Create line: debit 1150 to 21210
          
        - Rule 2: UseTransactionCOA=true, debit=false, amount=1150
          → Use TransactionCOAID = "coa_bank_uuid" (= 11111)
          → Create line: credit 1150 to 11111
        
        → Result: CreateJournalEntryRequest {
            lines: [
              { chart_of_account_id: "coa_ap_uuid", debit: 1150, credit: 0, ... },
              { chart_of_account_id: "coa_bank_uuid", debit: 0, credit: 1150, ... }
            ],
            ...
          }
     
     d. Call journal_entry_usecase.PostOrUpdateJournal(req):
        - Create JournalEntry { status: "POSTED", is_system_generated: true }
        - Create 2 JournalLine records
        - Return journal
     
     e. Update payment:
        payment.journal_entry_id = "je_uuid"
        payment.status = "CONFIRMED"
        save()
```

**Step 4: GL Report**
```
GL Account Report shows:

Account: 21210 (A/P)
  Debit:   1,150 IDR  (from PURCHASE_PAYMENT entry)
  Credit:  -

Account: 11111 (Bank)
  Debit:   -
  Credit:  1,150 IDR  (from PURCHASE_PAYMENT entry)
```

---

### Journey 3: Inventory + COGS Posting

**Scenario:** Goods receipt of 100 units @ 1,000 IDR/unit, then delivery of 50 units.

**Step 1: GR Confirmation**
```
Goods Receipt (GR-2024-001) confirmed:
  → inventory_usecase.TriggerDocumentJournal("GOODS_RECEIPT", "gr_uuid")
  → For each stock movement:
    - QtyIn: 100, Cost: 1000, Total: 100,000
    - Call engine.GenerateJournal(ProfileGoodsReceipt, data):
      Rule 1: coa.inventory debit 100,000
      Rule 2: coa.gr_ir credit 100,000
    - Create JournalEntry { reference_type: "GOODS_RECEIPT", ... }

GL After GR:
  Account: 12100 (Inventory)      Debit:  100,000
  Account: 91100 (GR/IR)          Credit: 100,000
```

**Step 2: Invoice Approval**
```
Supplier Invoice (SI-2024-001) approved:
  → supplier_invoice_usecase.Approve()
  → purchase_journal_service.GeneratePurchaseJournal():
    Rule 1: coa.gr_ir debit 100,000
    Rule 2: coa.purchase_vat_in debit 10,000 (assuming 10% tax)
    Rule 3: coa.purchase_payable credit 110,000
    - Create JournalEntry { reference_type: "SUPPLIER_INVOICE", ... }

GL After Invoice:
  Account: 91100 (GR/IR)          Debit:  100,000 | Credit: 100,000 (from GR)
  (now balances if no pending invoices)
  Account: 21200 (Purchase VAT In) Debit: 10,000
  Account: 21210 (A/P)            Credit: 110,000
```

**Step 3: Delivery Order (Shipment)**
```
Delivery Order (DO-2024-001) shipped:
  → inventory_usecase.TriggerDocumentJournal("DELIVERY_ORDER", "do_uuid")
  → For each stock movement:
    - QtyOut: 50, Cost: 1000, Total: 50,000  (COGS)
    - Call engine.GenerateJournal(ProfileSalesDelivery, data):
      Rule 1: coa.cogs debit 50,000
      Rule 2: coa.inventory credit 50,000
    - Create JournalEntry { reference_type: "DELIVERY_ORDER", ... }

GL After Delivery:
  Account: 51100 (COGS)           Debit:  50,000
  Account: 12100 (Inventory)      Credit: 50,000  (of the 100,000 debit balance)
  (Remaining inventory: 50,000)
```

---

### Journey 4: POS Order → Sales Documents → Journal

**Scenario:** POS order of 1,100 IDR (1,000 + 100 VAT), paid in cash, finalized.

**Step 1: POS Terminal - Cash Payment**
```
POS Screen:
  Total: 1,100
  Tender: 1,500
  Change: 400
  Method: CASH

Submit POST /pos/orders/{order_id}/payments/cash {
  amount: 1100,
  tender_amount: 1500,
  method: "CASH",
  ...
}

BE pos_payment_usecase.ProcessCash():
  1. Create POSPayment {
       id: "pp_uuid",
       order_id: "order_uuid",
       method: "CASH",
       amount: 1100,
       status: "PAID",
       ...
     }
  2. Call finalizeOrder(...):
     a. Create SalesOrder
     b. Create CustomerInvoice (1,100)
     c. Create SalesPayment (1,100) via createSalesPaymentFromPOS()
```

**Step 2: SalesPayment Creation & Auto-Journal**
```
createSalesPaymentFromPOS() calls:
  1. resolveAutoPaymentBankAccount("CASH")
     → Resolves finance.cash_default mapping → bank account linked to Kas
  2. Create SalesPayment {
       customer_invoice_id: "ci_uuid",
       amount: 1100,
       method: "CASH",
       bank_account_id: "bank_kas_uuid",
       ...
     }

sales_payment_usecase.Confirm():
  → triggerJournalEntry()
  → Resolve finance.cash_default → Kas COA
  → Generate journal via ProfileSalesPayment:
    Rule 1: coa.sales_receivable credit 1100
    Rule 2: Kas COA (from TransactionCOA) debit 1100
  → Create JournalEntry { reference_type: "SALES_PAYMENT", status: "POSTED" }
```

**Step 3: GL Posting**
```
GL shows:
  Account: 11101 (Kas)            Debit:  1,100   (from POS payment)
  Account: 11210 (A/R)            Credit: 1,100   (from POS payment)

Note: CustomerInvoice approval would also trigger its own journal:
  Account: 11210 (A/R)            Debit:  1,100
  Account: 41100 (Sales Revenue)  Credit: 1,000
  Account: 41200 (Sales VAT Out)  Credit: 100
  (Combined: A/R debit 1100 = 1100 credit from both payment & invoice)
```

---

## Key Design Patterns

### 1. Posting Profile Abstraction

**Pattern:** Define accounting rules once, reuse across tenants.

```
ProfileSalesPayment = {
  rules: [
    { coa_setting_key: "coa.sales_receivable", side: "credit", ... },
    { use_transaction_coa: true, side: "debit", ... }
  ]
}

Usage:
  - For CASH: TransactionCOAID = finance.cash_default (11101)
  - For BANK: TransactionCOAID = bank account COA (11111 or custom)
  → Same profile, different COAs, no code change
```

**Benefit:** Add new posting profile once; tenants map keys dynamically.

---

### 2. Cash vs Bank COA Split

**Pattern:** Logical key maps to actual COA at runtime.

```
System Account Mapping (seeded):
  finance.cash_default → 11101
  finance.bank_default → 11111

Payment Method Resolution:
  if method == "CASH":
    resolve(finance.cash_default) → 11101 → Journal debit/credit Kas
  else if method == "BANK":
    resolve(bank_account.coa_id) → 11111 (or custom) → Journal debit/credit Bank
```

**Benefit:** Single form, different journal postings; swappable COAs per company.

---

### 3. Transaction COA ID (TransactionData Field)

**Pattern:** Pass resolved COA ID through data layer to avoid re-resolution.

```
Payment Form:
  method: "CASH"
  bank_account_id: null

BE Usecase Create:
  Resolve bank account for operational tracking (save to payment.bank_account_id)

BE Usecase Confirm:
  Resolve COA for journaling (build TransactionData.TransactionCOAID)

Accounting Engine:
  Use TransactionCOAID directly in UseTransactionCOA rules
  (no second lookup needed)
```

**Benefit:** Clean separation: payment record ≠ journal COA.

---

### 4. Idempotent Journal Creation

**Pattern:** Upsert by `(reference_type, reference_id)`.

```
First Approve:
  reference_type = "SALES_PAYMENT"
  reference_id = "pay_123"
  → Check: journal exists? No → Create & POSTED

Re-approve (user clicks Approve again):
  Same reference_type + reference_id
  → Check: journal exists? Yes → Return existing (no duplicate)
```

**Benefit:** Safe re-approval; no double-posting.

---

### 5. Audit Trail Snapshots

**Pattern:** Store COA state at posting time in journal line.

```
On Journal Line Create:
  coa = lookup(chart_of_account_id)
  journalline.chart_of_account_code_snapshot = coa.code       // "11101"
  journalline.chart_of_account_name_snapshot = coa.name       // "Kas"
  journalline.chart_of_account_type_snapshot = coa.type       // "ASSET"

Benefit:
  - GL reports always show account state at posting date
  - Even if COA renamed/deleted later, historical GL accurate
```

---

### 6. System-Generated Auto-Post

**Pattern:** Mark journal as system-generated; post immediately.

```
User Approves Payment:
  → BackendUsecaseConfirm() calls GenerateJournal()
  → CreateJournalEntryRequest { is_system_generated: true }
  → JournalEntryUsecase.PostOrUpdateJournal() sets status = POSTED immediately
  
Manual Journal:
  → User creates via FE
  → is_system_generated = false
  → Status = DRAFT (awaiting approval)
  → User/approval flow approves
  → Status = POSTED
```

---

## Validation Checklist

Use this checklist to validate the entire journal posting system:

### Finance Core
- [ ] All COA codes in `chart_of_accounts` have Type (ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE)
- [ ] IsPostable = true for all posting-enabled accounts
- [ ] System account mappings seeded:
  - [ ] `finance.cash_default` → `11101`
  - [ ] `finance.bank_default` → `11111`
  - [ ] `coa.sales_receivable` → `11210`
  - [ ] `coa.sales_revenue` → `41100`
  - [ ] (and all others per company setup)

### Sales Module
- [ ] SalesPaymentForm clears bank_account_id when method = CASH
- [ ] SalesPayment.Create() resolves bank account for operational tracking
- [ ] SalesPayment.Confirm() resolves COA from mapping for journal
- [ ] Journal generated via ProfileSalesPayment
  - [ ] Rule 1: Credit sales_receivable
  - [ ] Rule 2: Debit TransactionCOA (Kas for CASH, Bank for BANK)
- [ ] Journal idempotent by (reference_type="SALES_PAYMENT", reference_id=payment_id)

### Purchase Module
- [ ] PurchasePaymentForm clears bank_account_id when method = CASH (or handles it)
- [ ] PurchasePayment.Create() resolves bank account for operational tracking
- [ ] PurchasePayment.Confirm() resolves COA from mapping for journal
- [ ] Journal generated via ProfilePurchasePayment
  - [ ] Rule 1: Debit purchase_payable
  - [ ] Rule 2: Credit TransactionCOA (Kas for CASH, Bank for BANK)
- [ ] SupplierInvoice.Approve() also generates journal via ProfileSupplierInvoice
  - [ ] Debit: GR/IR + VAT + Expense
  - [ ] Credit: A/P

### POS Module
- [ ] POSPayment.ProcessCash() resolves `finance.cash_default` bank account
- [ ] finalizeOrder() creates SalesPayment linked to cash bank account
- [ ] SalesPayment journal generated (same as Sales flow)

### Inventory Module
- [ ] GoodsReceipt.Confirm() triggers inventory journal via ProfileGoodsReceipt
  - [ ] Debit Inventory, Credit GR/IR
- [ ] DeliveryOrder.Ship() triggers COGS journal via ProfileSalesDelivery
  - [ ] Debit COGS, Credit Inventory
- [ ] Stock movements linked to journals (stock_movement.journal_entry_id)

### Journal Entry Usecase
- [ ] CreateJournalEntryRequest validated: debit_total == credit_total
- [ ] JournalEntry.status = POSTED immediately for is_system_generated=true
- [ ] JournalEntry upserted by (reference_type, reference_id) for idempotency
- [ ] JournalLine snapshots captured: code, name, type

### Cross-Cutting
- [ ] No hardcoded COA codes in application logic (use mappings)
- [ ] All document approval flows trigger journaling
- [ ] All journals have reference_type + reference_id for traceability
- [ ] GL reports exclude deleted journals (DeletedAt != null)

---

## Implementation Reference

### Backend Files
- `apps/api/internal/finance/domain/accounting/accounting_engine.go` - GenerateJournal logic
- `apps/api/internal/finance/domain/accounting/posting_profile.go` - Profile definitions
- `apps/api/internal/finance/domain/usecase/journal_entry_usecase.go` - Journal creation & posting
- `apps/api/internal/sales/domain/usecase/sales_payment_usecase.go` - Sales payment journaling
- `apps/api/internal/purchase/domain/usecase/purchase_payment_usecase.go` - Purchase payment journaling
- `apps/api/internal/purchase/domain/usecase/supplier_invoice_usecase.go` - Supplier invoice journaling
- `apps/api/internal/pos/domain/usecase/pos_payment_usecase.go` - POS payment resolution
- `apps/api/internal/inventory/domain/usecase/inventory_usecase.go` - Inventory journaling
- `apps/api/seeders/system_account_mapping_seeder.go` - Mapping seeding
- `apps/api/seeders/bank_account_seeder.go` - Bank account seeding

### Frontend Files
- `apps/web/src/features/sales/payments/components/sales-payment-form.tsx` - Sales payment form
- `apps/web/src/features/purchase/payments/components/purchase-payment-form.tsx` - Purchase payment form
- `apps/web/src/features/pos/terminal/services/pos-service.ts` - POS terminal service

---

**Documentation Version:** 1.0  
**Last Reviewed:** May 11, 2026  
**Maintained By:** Platform Finance Team
