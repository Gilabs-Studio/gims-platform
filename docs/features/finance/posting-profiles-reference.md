# Posting Profiles Reference

**Purpose:** Complete reference for all posting profiles and their rules.

---

## Overview

A **Posting Profile** is a template that defines which COAs should be debited/credited for a specific transaction type. The accounting engine uses these profiles to generate journal entries automatically.

### Profile Structure

```go
type PostingProfile struct {
    Name  string          // e.g., "ProfileSalesPayment"
    Rules []PostingRule
}

type PostingRule struct {
    COASettingKey      string   // Key to lookup in system_account_mappings
    COASource          string   // If no key, where to get COA: "transaction", "bank_account", "line_item"
    UseTransactionCOA  bool     // If true, use TransactionCOAID from TransactionData
    Side               string   // "debit", "credit", "dynamic"
    AmountSource       string   // "total", "sub_total", "tax_total", "cogs_total", "line_amount"
    MemoTemplate       string   // Template for memo text
}
```

---

## Sales Module Profiles

### ProfileSalesInvoice

**Trigger:** When CustomerInvoice status → APPROVED  
**Purpose:** Record revenue and accounts receivable

#### Rules

| Rule | COA Setting Key | Side | Amount Source | Description |
|------|-----------------|------|---------------|-------------|
| 1 | coa.sales_receivable | Debit | total | Debit A/R for invoice amount |
| 2 | coa.sales_revenue | Credit | sub_total | Credit Revenue for subtotal |
| 3 | coa.sales_vat_out | Credit | tax_total | Credit Output VAT for tax amount |

#### Journal Entry Example

```
Invoice: SI-2024-001
  Subtotal: 1,000
  Tax (10%): 100
  Total: 1,100

Generated Journal:
  Debit  A/R (11210)          = 1,100
  Credit Sales Revenue (41100) = 1,000
  Credit Sales VAT Out (41200) = 100
  ────────────────────────────
  Balance: 1,100 = 1,100 ✓
```

#### Accounting Impact

- A/R account increases (customer owes money)
- Revenue account increases (income recognized)
- VAT liability increases (tax owed to government)

---

### ProfileSalesPayment

**Trigger:** When SalesPayment status → CONFIRMED (via Confirm())  
**Purpose:** Record payment received and reduce A/R

#### Rules

| Rule | COA Source | Side | Amount Source | Description |
|------|-----------|------|---------------|-------------|
| 1 | UseTransactionCOA = true | Debit | total | Debit Kas/Bank based on payment method |
| 2 | coa.sales_receivable | Credit | total | Credit A/R for payment amount |

#### Journal Entry Examples

**Case 1: CASH Payment**

```
Payment: 1,100 IDR (CASH method)

COA Resolution:
  TransactionCOAID = resolve(finance.cash_default) = 11101 (Kas)

Generated Journal:
  Debit  Kas (11101)          = 1,100
  Credit A/R (11210)          = 1,100
  ────────────────────────────
  Balance: 1,100 = 1,100 ✓
```

**Case 2: BANK Payment**

```
Payment: 1,100 IDR (BANK method, BCA account)

COA Resolution:
  Bank Account BCA → ChartOfAccountID = 11111 (Bank)

Generated Journal:
  Debit  Bank (11111)         = 1,100
  Credit A/R (11210)          = 1,100
  ────────────────────────────
  Balance: 1,100 = 1,100 ✓
```

#### Accounting Impact

- Kas/Bank account increases (asset in)
- A/R account decreases (customer debt reduced)

---

### ProfileSalesPaymentDP

**Trigger:** When down payment is applied to sales  
**Purpose:** Record down payment received as advance

#### Rules

| Rule | COA Source | Side | Amount Source | Description |
|------|-----------|------|---------------|-------------|
| 1 | UseTransactionCOA = true | Debit | total | Debit Kas/Bank |
| 2 | coa.sales_receivable_dp | Credit | total | Credit Customer Advance |

#### Journal Entry Example

```
DP Payment: 500 IDR (CASH method)

Generated Journal:
  Debit  Kas (11101)                = 500
  Credit Customer Advance (21220)   = 500
  ────────────────────────────────
  Balance: 500 = 500 ✓
```

#### Later: DP Application

When DP is applied to full invoice:
- Reverse the DP journal
- Create new payment journal for total

---

### ProfileSalesJournal (COGS)

**Trigger:** When DeliveryOrder status → SHIPPED  
**Purpose:** Record cost of goods sold and reduce inventory

#### Rules

| Rule | COA Setting Key | Side | Amount Source | Description |
|------|-----------------|------|---------------|-------------|
| 1 | coa.cogs | Debit | line_amount | Debit COGS per line (Qty × Cost) |
| 2 | coa.inventory | Credit | total | Credit Inventory for total |

#### Journal Entry Example

```
Delivery Order: DO-2024-001
  Item 1: 50 units × 100 per unit = 5,000
  Item 2: 30 units × 80 per unit  = 2,400
  Total: 7,400

Generated Journal:
  Debit  COGS (51100)         = 7,400
  Credit Inventory (12100)    = 7,400
  ────────────────────────────
  Balance: 7,400 = 7,400 ✓
```

#### Accounting Impact

- COGS (expense) increases
- Inventory (asset) decreases
- Cost moved from balance sheet to income statement

---

## Purchase Module Profiles

### ProfileSupplierInvoice

**Trigger:** When SupplierInvoice status → APPROVED  
**Purpose:** Record purchase invoice and accounts payable

#### Rules

| Rule | COA Setting Key | Side | Amount Source | Description |
|------|-----------------|------|---------------|-------------|
| 1 | coa.gr_ir | Debit | sub_total + delivery | Debit GR/IR for goods cost |
| 2 | coa.purchase_vat_in | Debit | tax_total | Debit Input VAT for tax |
| 3 | coa.purchase_expense | Debit | other_cost | Debit Expense for misc costs |
| 4 | coa.purchase_payable | Credit | total | Credit A/P for total invoice |

#### Journal Entry Example

```
Supplier Invoice: SI-2024-001
  Subtotal: 1,000
  Delivery: 100
  Tax (10%): 110
  Other Cost: 50
  Total: 1,260

Generated Journal:
  Debit  GR/IR (91100)            = 1,100  (subtotal + delivery)
  Debit  Purchase VAT In (21200)  = 110
  Debit  Purchase Expense (51200) = 50
  Credit A/P (21210)              = 1,260
  ──────────────────────────────────────
  Balance: 1,260 = 1,260 ✓
```

#### Notes

- GR/IR is a temporary account used to match Goods Receipt with Invoice
- Input VAT is recoverable and tracked separately
- Other costs (shipping, brokerage) go to expense

#### Accounting Impact

- GR/IR account increases (pending invoice matching)
- VAT account increases (input tax to claim)
- A/P account increases (supplier debt)

---

### ProfilePurchasePayment

**Trigger:** When PurchasePayment status → CONFIRMED (via Confirm())  
**Purpose:** Record payment to supplier and reduce A/P

#### Rules

| Rule | COA Setting Key | Side | Amount Source | Description |
|------|-----------------|------|---------------|-------------|
| 1 | coa.purchase_payable | Debit | total | Debit A/P for payment amount |
| 2 | UseTransactionCOA = true | Credit | total | Credit Kas/Bank based on method |

#### Journal Entry Examples

**Case 1: CASH Payment**

```
Payment: 1,260 IDR (CASH method)

COA Resolution:
  TransactionCOAID = resolve(finance.cash_default) = 11101 (Kas)

Generated Journal:
  Debit  A/P (21210)          = 1,260
  Credit Kas (11101)          = 1,260
  ────────────────────────────
  Balance: 1,260 = 1,260 ✓
```

**Case 2: BANK Payment**

```
Payment: 1,260 IDR (BANK method)

Generated Journal:
  Debit  A/P (21210)          = 1,260
  Credit Bank (11111)         = 1,260
  ────────────────────────────
  Balance: 1,260 = 1,260 ✓
```

#### Accounting Impact

- A/P account decreases (supplier debt paid)
- Kas/Bank account decreases (cash out)

---

### ProfilePurchasePaymentDP

**Trigger:** When down payment is made to supplier  
**Purpose:** Record down payment as prepayment

#### Rules

| Rule | COA Setting Key | Side | Amount Source | Description |
|------|-----------------|------|---------------|-------------|
| 1 | coa.purchase_payable_dp | Debit | total | Debit Supplier Advance |
| 2 | UseTransactionCOA = true | Credit | total | Credit Kas/Bank |

#### Journal Entry Example

```
DP Payment: 600 IDR (CASH method)

Generated Journal:
  Debit  Supplier Advance (21220)  = 600
  Credit Kas (11101)              = 600
  ────────────────────────────────
  Balance: 600 = 600 ✓
```

---

### ProfileGoodsReceipt

**Trigger:** When GoodsReceipt status → CONFIRMED  
**Purpose:** Record receipt of goods and create GR/IR balance

#### Rules

| Rule | COA Setting Key | Side | Amount Source | Description |
|------|-----------------|------|---------------|-------------|
| 1 | coa.inventory | Debit | line_amount | Debit Inventory per line (Qty × Cost) |
| 2 | coa.gr_ir | Credit | total | Credit GR/IR for total |

#### Journal Entry Example

```
Goods Receipt: GR-2024-001
  Item 1: 100 units × 10 per unit = 1,000
  Item 2: 50 units × 20 per unit  = 1,000
  Total: 2,000

Generated Journal:
  Debit  Inventory (12100)    = 2,000
  Credit GR/IR (91100)        = 2,000
  ────────────────────────────
  Balance: 2,000 = 2,000 ✓
```

#### Accounting Impact

- Inventory (asset) increases (goods in)
- GR/IR (liability/asset) balance grows pending invoice

#### Matching Process

```
Timeline:
  1. Goods arrive → GR posted
     Inventory ↑, GR/IR ↑

  2. Invoice arrives → SI posted
     Expense ↑, VAT ↑, A/P ↑, GR/IR ↓ (by SI amount)

  Result: GR/IR clears when GR = SI
```

---

## Inventory Module Profiles

### ProfileGoodsReceiptMovement

**Trigger:** Per StockMovement when GoodsReceipt confirmed  
**Purpose:** Record inventory receipt (alternative to ProfileGoodsReceipt)

#### Rules

Same as ProfileGoodsReceipt (see above)

---

### ProfileDeliveryMovement (COGS)

**Trigger:** Per StockMovement when DeliveryOrder shipped  
**Purpose:** Record COGS and reduce inventory

#### Rules

| Rule | COA Setting Key | Side | Amount Source | Description |
|------|-----------------|------|---------------|-------------|
| 1 | coa.cogs | Debit | line_amount | Debit COGS per movement |
| 2 | coa.inventory | Credit | total | Credit Inventory for total |

#### Journal Entry Example

Same as ProfileSalesJournal (see Sales section)

---

### ProfilePurchaseReturnMovement

**Trigger:** Per StockMovement when PurchaseReturn approved  
**Purpose:** Record inventory return to supplier

#### Rules

| Rule | COA Setting Key | Side | Amount Source | Description |
|------|-----------------|------|---------------|-------------|
| 1 | coa.gr_ir | Debit | line_amount | Debit GR/IR (reverse receipt) |
| 2 | coa.inventory | Credit | total | Credit Inventory (goods out) |

#### Journal Entry Example

```
Purchase Return: PR-2024-001
  Item returned: 20 units × 10 = 200

Generated Journal:
  Debit  GR/IR (91100)        = 200  (reversal)
  Credit Inventory (12100)    = 200
  ────────────────────────────
  Balance: 200 = 200 ✓
```

---

### ProfileSalesReturnMovement

**Trigger:** Per StockMovement when SalesReturn approved  
**Purpose:** Record inventory return from customer and reverse COGS

#### Rules

| Rule | COA Setting Key | Side | Amount Source | Description |
|------|-----------------|------|---------------|-------------|
| 1 | coa.inventory | Debit | line_amount | Debit Inventory (goods back) |
| 2 | coa.cogs | Credit | total | Credit COGS (reversal) |

#### Journal Entry Example

```
Sales Return: SR-2024-001
  Item returned: 10 units × 10 = 100

Generated Journal:
  Debit  Inventory (12100)    = 100
  Credit COGS (51100)         = 100  (reversal)
  ────────────────────────────
  Balance: 100 = 100 ✓
```

---

### ProfileStockOpname

**Trigger:** Per StockMovement when StockOpname approved  
**Purpose:** Record inventory variance (gain/loss)

#### Rules

| Rule | Side | Condition | Description |
|------|------|-----------|-------------|
| 1 | Debit Inventory | If QtyIn > 0 | Inventory gained |
| 1 | Credit Inventory | If QtyOut > 0 | Inventory lost |
| 2 | Credit Inventory Gain | If QtyIn > 0 | Gain account (income) |
| 2 | Debit Inventory Loss | If QtyOut > 0 | Loss account (expense) |

#### Journal Entry Examples

**Gain Case:**
```
Stock Opname: SO-2024-001
  Counted: 100 units
  System: 95 units
  Variance: +5 units × 20 = 100 (gain)

Generated Journal:
  Debit  Inventory (12100)      = 100
  Credit Inventory Gain (41900) = 100
  ────────────────────────────
  Balance: 100 = 100 ✓
```

**Loss Case:**
```
Stock Opname: SO-2024-002
  Counted: 90 units
  System: 100 units
  Variance: -10 units × 20 = 200 (loss)

Generated Journal:
  Debit  Inventory Loss (51900) = 200
  Credit Inventory (12100)      = 200
  ────────────────────────────
  Balance: 200 = 200 ✓
```

---

## Finance Module Profiles

### ProfileManualJournal

**Trigger:** User creates journal manually via GL  
**Purpose:** Manual accounting entries

#### Characteristics

- User specifies COAs and amounts directly
- No posting profile rules applied
- Status = DRAFT (awaiting approval)
- User/approver must ensure balance
- Posted manually via Post() action

#### Journal Entry Example

```
User Input:
  Description: "Depreciation posting for Q1 2024"
  Lines:
    - Debit Depreciation Expense (61100) = 5,000
    - Credit Accumulated Depreciation (12110) = 5,000

Created Journal:
  Status: DRAFT
  Is_system_generated: false
```

---

### ProfileAdjustmentJournal

**Trigger:** System/user creates adjustment entry  
**Purpose:** Period-end adjustments (depreciation, accruals, etc.)

#### Characteristics

Same as ProfileManualJournal, but:
- Often auto-generated by batch processes
- May be marked is_system_generated = true
- Auto-posts if system-generated

---

### ProfileOpeningBalance

**Trigger:** Period transition or migration  
**Purpose:** Establish opening balances

#### Characteristics

- Special journal type: OPENING_BALANCE
- Created once per fiscal year
- Reverses at period transition
- Debits increase assets, credits increase liabilities/equity

#### Journal Entry Example

```
Opening Balance: 2024-01-01

Generated Journal:
  Debit  Kas (11101)              = 10,000,000
  Debit  Bank (11111)             = 50,000,000
  Debit  Inventory (12100)        = 20,000,000
  Credit A/P (21210)              = 5,000,000
  Credit Owner Capital (31100)    = 75,000,000
  ────────────────────────────────────────────
  Balance: 80,000,000 = 80,000,000 ✓
```

---

### ProfileClosingEntry

**Trigger:** Period close (monthly/quarterly/annually)  
**Purpose:** Close revenue/expense to retained earnings

#### Characteristics

- Special journal type: CLOSING
- Created after all period transactions posted
- Transfers net income to retained earnings

#### Journal Entry Example

```
Period Closing: 2024-03-31

Generated Journal:
  Debit  Sales Revenue (41100)    = 100,000
  Debit  Sales VAT Out (41200)    = 10,000
  Credit COGS (51100)             = 40,000
  Credit Operating Expense (52100) = 20,000
  Credit Retained Earnings (31200) = 50,000  (net income)
  ────────────────────────────────────────────
  Balance: 110,000 = 110,000 ✓
```

---

## COA Resolution Algorithm

### How Accounting Engine Resolves COAs

```
For each posting rule in profile:

1. If COASettingKey is provided:
   a. Lookup system_account_mappings[COASettingKey]
   b. Get mapped COA code (e.g., "11101")
   c. Return COA ID from chart_of_accounts where code = mapped code

2. Else if UseTransactionCOA = true:
   a. Use TransactionCOAID from TransactionData
   b. This is pre-resolved by usecase:
      - For CASH: resolve(finance.cash_default) = 11101
      - For BANK: resolve(bank_account.coa_id) = 11111 (or custom)

3. Else if COASource = "bank_account":
   a. Use data.BankAccountCOAID from TransactionData

4. Else if COASource = "line_item":
   a. For each line item in data.Items:
     i. Use item.ChartOfAccountID
     ii. Create separate journal line per item

5. Else:
   a. Error: cannot resolve COA

Return COA ID
```

### Example Resolution

**ProfileSalesPayment with CASH**

```
TransactionData {
  PaymentAmount: 1,100
  Method: "CASH"
  TransactionCOAID: "coa_11101_uuid"  // Pre-resolved from finance.cash_default
}

Rule 1: UseTransactionCOA = true, Side = "debit"
  → Resolve: use TransactionCOAID = "coa_11101_uuid"
  → Create line: debit 1,100 to 11101 (Kas)

Rule 2: COASettingKey = "coa.sales_receivable", Side = "credit"
  → Resolve: lookup mappings["coa.sales_receivable"] = "11210"
  → Create line: credit 1,100 to 11210 (A/R)

Result:
  [ { debit: 1100, coa: 11101 },
    { credit: 1100, coa: 11210 } ]
```

---

## Amount Source Types

| AmountSource | Value | Usage |
|--------------|-------|-------|
| total | Full transaction amount | Most payments, full invoice |
| sub_total | Before tax | Goods cost, excluding VAT |
| tax_total | Tax amount only | VAT posting |
| cogs_total | Sum of COGS for items | Inventory cost |
| line_amount | Per-line amount | When processing each line separately |
| other_cost | Miscellaneous costs | Shipping, brokerage, etc. |

---

## Best Practices for Posting Profiles

1. **One profile per transaction type**: Don't mix rules for different documents
2. **Use setting keys**: Don't hardcode COA IDs; use mappings for flexibility
3. **Snapshots for audit**: Always capture COA state in journal lines
4. **Balance validation**: Ensure debit_total == credit_total before posting
5. **Idempotent upserts**: Use (reference_type, reference_id) for deduplication
6. **Memo clarity**: Include transaction reference in journal memo
7. **Test with real COAs**: Verify all mapped COAs exist and are postable

---

**Last Updated:** May 11, 2026  
**Version:** 1.0
