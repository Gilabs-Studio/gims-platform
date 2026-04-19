# Phase 2: Cash-Bank Operations (Daily Execution)

> **Module:** Finance / Cash & Bank  
> **Phase:** 2 - Daily Operations  
> **Version:** 1.0  
> **Status:** Complete  
> **Last Updated:** April 2026

---

## Table of Contents
1. [Overview](#overview)
2. [Cash-Bank Transactions (Payments)](#cash-bank-transactions-payments)
   - [Feature Overview](#feature-overview-cbt)
   - [User Journey](#user-journey-cbt)
   - [Business Logic](#business-logic-cbt)
   - [API Reference](#api-reference-cbt)
   - [Testing](#testing-cbt)
3. [Bank Transfer Management](#bank-transfer-management)
   - [Feature Overview](#feature-overview-bt)
   - [User Journey](#user-journey-bt)
   - [Business Logic](#business-logic-bt)
   - [API Reference](#api-reference-bt)
   - [Testing](#testing-bt)
4. [Bank Reconciliation](#bank-reconciliation)
   - [Feature Overview](#feature-overview-br)
   - [User Journey](#user-journey-br)
   - [Business Logic](#business-logic-br)
   - [API Reference](#api-reference-br)
   - [Testing](#testing-br)
5. [Common Features](#common-features)
6. [Business Rules](#business-rules)

---

## Overview

**Phase 2** contains the **daily operational workflows** for cash and bank management:
1. **Cash-Bank Transactions** (payment in/out): Daily payment processing
2. **Bank Transfer**: Moving funds between accounts
3. **Bank Reconciliation**: Matching book vs bank statement

All Phase 2 operations use Phase 1 (Journal Engine) to record GL impact and Phase 0 (Opening Balance) as the baseline.

### Key Principle
**Every operation is recorded in GL.** Cash/bank transactions auto-post; transfers post on completion; reconciliation records differences for audit.

---

---

## CASH-BANK TRANSACTIONS (PAYMENTS)

### Feature Overview {#feature-overview-cbt}

**Cash-Bank Transactions** are day-to-day payment operations: money in (bank transfer from customer, cash receipt) or money out (payment to supplier, cash disbursement).

| Feature | Type | Role | Permission |
|---------|------|------|------------|
| **Record Payment In** | Cash Receipt, Bank Transfer In | Cashier | `cash_bank_transaction.create` |
| **Record Payment Out** | Cheque Payment, Cash Out | Cashier | `cash_bank_transaction.create` |
| **Auto-Generate Journal** | Posting | System | (Auto) |
| **List Transactions** | View | Cashier, Accountant | `cash_bank_transaction.read` |
| **Edit Transaction (Draft)** | Update | Cashier | `cash_bank_transaction.update` |
| **Reverse Transaction (Posted)** | Correction | Accountant | `cash_bank_transaction.reverse` |
| **Export Transaction Report** | Export | Accountant | `cash_bank_transaction.read` |

### Data Models {#data-models-cbt}

```sql
CREATE TABLE cash_bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    fiscal_year_id UUID NOT NULL REFERENCES fiscal_years(id),
    transaction_date DATE NOT NULL,
    transaction_type VARCHAR(20) NOT NULL,
        -- PAYMENT_IN (cash/bank in), PAYMENT_OUT (cheque/cash out)
    reference_number VARCHAR(255) NOT NULL,  -- Auto-gen: CBT-YYYYMMDD-NNN
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
    contra_account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',  -- DRAFT, POSTED, REVERSED
    linked_journal_id UUID UNIQUE REFERENCES journals(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES employees(id),
    
    INDEX (company_id, transaction_date),
    INDEX (status, fiscal_year_id),
    INDEX (bank_account_id)
);
```

### Go Model

```go
type CashBankTransaction struct {
    ID               string          `gorm:"type:uuid;primaryKey"`
    CompanyID        string          `gorm:"type:uuid;not null;index:idx_cbt_company_date"`
    FiscalYearID     string          `gorm:"type:uuid;not null"`
    TransactionDate  time.Time       `gorm:"type:date;not null;index:idx_cbt_company_date"`
    TransactionType  string          `gorm:"type:varchar(20);not null"`  // PAYMENT_IN, PAYMENT_OUT
    ReferenceNumber  string          `gorm:"type:varchar(255);not null;index:idx_cbt_reference"`
    BankAccountID    string          `gorm:"type:uuid;not null;index:idx_cbt_bank"`
    ContraAccountID  string          `gorm:"type:uuid;not null"`  // Where money comes from (IN) or goes to (OUT)
    Amount           decimal.Decimal `gorm:"type:numeric(15,2)"`
    Description      *string         `gorm:"type:text"`
    Status           string          `gorm:"type:varchar(20);index:idx_cbt_status"`  // DRAFT, POSTED, REVERSED
    LinkedJournalID  *string         `gorm:"type:uuid;uniqueIndex:idx_cbt_journal"`
    CreatedAt        time.Time       `gorm:"autoCreateTime:milli"`
    UpdatedAt        time.Time       `gorm:"autoUpdateTime:milli"`
    CreatedBy        *string         `gorm:"type:uuid"`
    
    // Relationships
    BankAccount      BankAccount
    ContraAccount    ChartOfAccount
    Journal          *Journal
}
```

### User Journey {#user-journey-cbt}

#### Happy Path: Record Payment In

```
Scenario: Cashier receives cash from customer

1. Navigate to /finance/journals/cash-bank
   - See list of cash-bank transactions
   - Filter by date, bank account, status
   - Button: "New Transaction"

2. Click "New Transaction"
   - Modal/form opens: "Create Cash-Bank Transaction"
   - Fields:
     * Transaction Date (date picker, default today)
     * Transaction Type (dropdown: PAYMENT_IN, PAYMENT_OUT)
     * Bank Account (dropdown, filtered to company)
     * Contra Account (COA dropdown/search)
     * Amount (number input)
     * Description (textarea)
     * Reference Number (auto-generated, editable)

3. Select Transaction Details
   - Transaction Date: 2026-01-15
   - Type: PAYMENT_IN
   - Bank Account: "Bank: PT GILABS Cash"
   - Contra Account: "1200 - Accounts Receivable" (customer paid us)
   - Amount: 50,000,000
   - Description: "Payment from Customer ABC for Invoice INV-001"

4. Review Draft
   - Show preview: "Debit Bank 50M | Credit A/R 50M"
   - No journal yet (status = DRAFT)

5. Click "Post" (or "Save & Post")
   - System auto-generates Journal Entry:
     * Debit: Bank Account (1010) 50,000,000
     * Credit: Contra Account (1200) 50,000,000
   - Journal.Status = POSTED
   - Transaction.Status = POSTED
   - Transaction.LinkedJournalID = Journal.ID

6. Confirmation
   - Toast: "✓ Payment recorded successfully. Journal #JNL-12345"
   - Transaction list updated, shows new transaction
   - Can click "View Journal" to see GL posting

7. Later Query
   - Query GL balance for bank account
   - Shows: +50,000,000
   - Query GL for contra account
   - Shows: -50,000,000

End State:
- Cash-Bank Transaction: POSTED
- Journal Entry: POSTED (in GL)
- Bank account balance: +50,000,000
```

#### Happy Path: Record Payment Out

```
Scenario: Issue cheque to supplier for payment

1. Click "New Transaction"
2. Select:
   - Date: 2026-01-15
   - Type: PAYMENT_OUT
   - Bank Account: "Bank: PT GILABS Current Account"
   - Contra Account: "2100 - Accounts Payable" (supplier invoice)
   - Amount: 75,000,000
   - Description: "Payment to Supplier XYZ for Inv SUP-2001"
   - Cheque #: 001234 (optional, in description)

3. Preview: "Debit A/P 75M | Credit Bank 75M"

4. Post
   - Journal created with reversed amounts
   - Bank balance: -75,000,000
   - A/P balance: +75,000,000

End State:
- Both payments recorded, balances updated
```

### Business Logic {#business-logic-cbt}

#### 1. Create Cash-Bank Transaction

```go
CreateCashBankTransaction(
  companyID, transactionDate, transactionType, 
  bankAccountID, contraAccountID, amount, description) 
  → CashBankTransaction {
  
  // 1. Validate input
  if !isValidType(transactionType) {
    return Error("INVALID_TRANSACTION_TYPE")
  }
  
  // 2. Get fiscal year
  fy := FiscalYearForDate(companyID, transactionDate)
  if fy.Status != "OPEN" {
    return Error("PERIOD_CLOSED")
  }
  
  // 3. Validate accounts
  bankAccount := GetBankAccount(bankAccountID)
  if bankAccount.Status != "ACTIVE" {
    return Error("BANK_ACCOUNT_INACTIVE")
  }
  
  contraAccount := GetCOAAccount(contraAccountID)
  if !contraAccount.IsPostable {
    return Error("ACCOUNT_NOT_POSTABLE")
  }
  
  // 4. Create transaction (status = DRAFT)
  cbt := CashBankTransaction{
    ID:               UUID(),
    CompanyID:        companyID,
    FiscalYearID:     fy.ID,
    TransactionDate:  transactionDate,
    TransactionType:  transactionType,
    BankAccountID:    bankAccountID,
    ContraAccountID:  contraAccountID,
    Amount:           amount,
    ReferenceNumber:  GenerateReference(transactionType, transactionDate),
    Status:           "DRAFT",
    CreatedBy:        GetCurrentUserID(),
  }
  
  cbt.Save()
  return cbt
}
```

#### 2. Post Cash-Bank Transaction (Auto-Journal)

```go
PostCashBankTransaction(cbtID) → PostingResult {
  
  cbt := GetCashBankTransaction(cbtID)
  
  // 1. Validate can post
  if cbt.Status != "DRAFT" {
    return Error("ALREADY_POSTED")
  }
  
  bankCOA := GetBankAccountCOA(cbt.BankAccountID)
  
  // 2. Determine journal lines based on transaction type
  var lines []JournalLineInput
  
  if cbt.TransactionType == "PAYMENT_IN" {
    // Debit Bank, Credit Contra
    lines = []JournalLineInput{
      {
        AccountID:    bankCOA.ID,
        DebitAmount:  cbt.Amount,
        CreditAmount: 0,
      },
      {
        AccountID:    cbt.ContraAccountID,
        DebitAmount:  0,
        CreditAmount: cbt.Amount,
      },
    }
  } else if cbt.TransactionType == "PAYMENT_OUT" {
    // Debit Contra, Credit Bank
    lines = []JournalLineInput{
      {
        AccountID:    cbt.ContraAccountID,
        DebitAmount:  cbt.Amount,
        CreditAmount: 0,
      },
      {
        AccountID:    bankCOA.ID,
        DebitAmount:  0,
        CreditAmount: cbt.Amount,
      },
    }
  }
  
  // 3. Create and post journal
  journal := CreateJournal(
    companyID:      cbt.CompanyID,
    journalDate:    cbt.TransactionDate,
    journalType:    "CASH_BANK",
    lines:          lines,
    reference:      cbt.ReferenceNumber,
    description:    cbt.Description,
    sourceTransactionID: cbt.ID,  // Link back to CBT
  )
  
  PostJournal(journal.ID)
  
  // 4. Update transaction status
  cbt.Status = "POSTED"
  cbt.LinkedJournalID = journal.ID
  cbt.Save()
  
  return {
    success: true,
    cbt_id: cbt.ID,
    journal_id: journal.ID,
  }
}
```

### API Reference {#api-reference-cbt}

#### 1. Create Cash-Bank Transaction (Draft)

```http
POST /api/v1/finance/journals/cash-bank
Content-Type: application/json

{
  "company_id": "uuid",
  "transaction_date": "2026-01-15",
  "transaction_type": "PAYMENT_IN",
  "bank_account_id": "uuid",
  "contra_account_id": "uuid",
  "amount": 50000000.00,
  "description": "Payment from Customer ABC"
}
```

**Permission**: `cash_bank_transaction.create`

**Response (201)**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "reference_number": "CBT-20260115-001",
    "status": "DRAFT",
    "amount": 50000000.00
  }
}
```

#### 2. Post Cash-Bank Transaction

```http
POST /api/v1/finance/journals/cash-bank/{id}/post
```

**Permission**: `cash_bank_transaction.post` (or auto via create)

**Response (200)**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "POSTED",
    "linked_journal_id": "uuid",
    "posted_at": "2026-01-15T10:30:45+07:00"
  }
}
```

#### 3. List Cash-Bank Transactions

```http
GET /api/v1/finance/journals/cash-bank
  ?company_id=uuid
  &from_date=2026-01-01
  &to_date=2026-01-31
  &status=POSTED
  &bank_account_id=uuid
  &page=1
  &per_page=20
```

**Permission**: `cash_bank_transaction.read`

**Response**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "reference_number": "CBT-20260115-001",
      "transaction_date": "2026-01-15",
      "transaction_type": "PAYMENT_IN",
      "bank_account": { "id": "uuid", "name": "Bank Cash", "code": "1010" },
      "amount": 50000000.00,
      "status": "POSTED",
      "linked_journal_id": "uuid"
    }
  ],
  "meta": { "pagination": { "total": 100, "page": 1, "per_page": 20 } }
}
```

### Testing {#testing-cbt}

#### TC-CBT-001: Create and Post Payment In
```
1. Create PAYMENT_IN: Bank 50M, A/R 50M
2. Post
3. Verify GL: Bank +50M, A/R -50M
Expected: Success, balance updates
```

#### TC-CBT-002: Create and Post Payment Out
```
1. Create PAYMENT_OUT: A/P 75M, Bank 75M
2. Post
3. Verify GL: Bank -75M, A/P +75M
Expected: Success
```

#### TC-CBT-003: Period Closed (Rejected)
```
1. Select closed period
2. Try Post
Expected: Error PERIOD_CLOSED
```

#### TC-CBT-004: Auto-Reference Generation
```
1. Create transaction on 2026-01-15
2. Check reference_number field
Expected: "CBT-20260115-001" format
```

---

---

## BANK TRANSFER MANAGEMENT

### Feature Overview {#feature-overview-bt}

**Bank Transfer** moves funds between two bank accounts in the same company (e.g., cash to current account, local to forex). Transfers have a **two-step process**: pending → complete. Journal posts only on completion.

| Feature | User | Description | Permission |
|---------|------|-------------|------------|
| **Create Transfer (Pending)** | Finance | Setup transfer, not yet executed | `bank_transfer.create` |
| **Complete Transfer** | Finance Manager | Execute transfer, post GL | `bank_transfer.complete` |
| **Cancel Transfer** | Finance | Cancel before completion | `bank_transfer.cancel` |
| **List Transfers** | Finance | View all transfers, filter by status | `bank_transfer.read` |
| **Reverse Transfer** | Accountant | Reverse completed transfer | `bank_transfer.reverse` |

### Data Models {#data-models-bt}

```sql
CREATE TABLE bank_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    fiscal_year_id UUID NOT NULL REFERENCES fiscal_years(id),
    transfer_date DATE NOT NULL,
    from_bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
    to_bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
    amount DECIMAL(15, 2) NOT NULL,
    reference_number VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING, COMPLETED, CANCELLED
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES employees(id),
    linked_journal_id UUID UNIQUE REFERENCES journals(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES employees(id),
    
    INDEX (company_id, transfer_date),
    INDEX (status),
    CONSTRAINT no_self_transfer CHECK (from_bank_account_id != to_bank_account_id),
    CONSTRAINT positive_amount CHECK (amount > 0)
);
```

### Go Model

```go
type BankTransfer struct {
    ID                 string          `gorm:"type:uuid;primaryKey"`
    CompanyID          string          `gorm:"type:uuid;not null;index:idx_bt_company_date"`
    FiscalYearID       string          `gorm:"type:uuid;not null"`
    TransferDate       time.Time       `gorm:"type:date;not null;index:idx_bt_company_date"`
    FromBankAccountID  string          `gorm:"type:uuid;not null"`
    ToBankAccountID    string          `gorm:"type:uuid;not null;check:from_bank_account_id != to_bank_account_id"`
    Amount             decimal.Decimal `gorm:"type:numeric(15,2);check:amount > 0"`
    ReferenceNumber    string          `gorm:"type:varchar(255);not null"`
    Description        *string         `gorm:"type:text"`
    Status             string          `gorm:"type:varchar(20);index:idx_bt_status"`  // PENDING, COMPLETED, CANCELLED
    CompletedAt        *time.Time      `gorm:"type:timestamptz"`
    CompletedBy        *string         `gorm:"type:uuid"`
    LinkedJournalID    *string         `gorm:"type:uuid;uniqueIndex:idx_bt_journal"`
    CreatedAt          time.Time       `gorm:"autoCreateTime:milli"`
    UpdatedAt          time.Time       `gorm:"autoUpdateTime:milli"`
    CreatedBy          *string         `gorm:"type:uuid"`
    
    // Relationships
    FromAccount        BankAccount
    ToAccount          BankAccount
    Journal            *Journal
}
```

### User Journey {#user-journey-bt}

#### Happy Path: Create and Complete Transfer

```
Scenario: Transfer 200M from Cash account to Current account

1. Navigate to /finance/bank-transfer
   - See list of transfers (all statuses)
   - Filter by status: PENDING, COMPLETED
   - Button: "New Transfer"

2. Click "New Transfer"
   - Form: "Create Bank Transfer"
   - Fields:
     * Transfer Date (date picker)
     * From Account (dropdown: bank accounts)
     * To Account (dropdown: bank accounts, different from source)
     * Amount (number)
     * Description (textarea)

3. Fill Details
   - Date: 2026-01-15
   - From: "Bank: PT GILABS Cash"
   - To: "Bank: PT GILABS Current Account"
   - Amount: 200,000,000
   - Description: "Transfer to current for supplier payment"

4. Preview
   - Show: "Will debit [To Account] 200M, credit [From Account] 200M"
   - Status: PENDING (not posted yet)

5. Click "Create"
   - Transfer saved with status = PENDING
   - No journal created yet
   - Reference: BT-YYYYMMDD-NNN (auto-gen)
   - Confirmation: "Transfer created (pending). You must complete to post."

6. Later: Execute Transfer
   - Finance Manager reviews pending transfers
   - Sees transfer: BT-20260115-001, 200M, From Cash to Current
   - Clicks "Complete"

7. Complete Transfer
   - Modal: "Confirm Transfer"
   - Check: From ≠ To (already validated)
   - Check: Amount > 0 (already validated)
   - Show GL double-entry: "Debit [To] 200M | Credit [From] 200M"

8. Click "Confirm Complete"
   - System creates Journal Entry:
     * Debit: To Bank Account (e.g., 1020) 200,000,000
     * Credit: From Bank Account (e.g., 1010) 200,000,000
   - Journal.Status = POSTED
   - Transfer.Status = COMPLETED
   - Transfer.CompletedAt = NOW()
   - Transfer.CompletedBy = Current User

9. Confirmation
   - Toast: "✓ Transfer completed. Journal #JNL-12345"
   - Transfer list updated
   - GL balances updated

End State:
- Bank Transfer: COMPLETED
- Journal: POSTED in GL
- From account balance: -200M
- To account balance: +200M
```

#### Exception Path: Cancel Transfer Before Complete

```
Scenario: User cancels pending transfer

1. Finance sees pending transfer
2. Realizes mistake or order changed
3. Clicks "Cancel"

4. Modal: "Cancel Transfer?"
   - Address: "This transfer has not been completed. Cancelling will discard it."
   - Button: "Cancel Transfer"

5. Status changes to CANCELLED
   - No journal created
   - Can be soft-deleted or archived

End State:
- No GL impact
- Transfer recorded for audit (status = CANCELLED)
```

### Business Logic {#business-logic-bt}

#### 1. Create Transfer (Pending)

```go
CreateBankTransfer(
  companyID, transferDate, fromAccountID, toAccountID, amount, description)
  → BankTransfer {
  
  // 1. Validate input
  if fromAccountID == toAccountID {
    return Error("SAME_ACCOUNT")
  }
  
  if amount <= 0 {
    return Error("INVALID_AMOUNT")
  }
  
  // 2. Validate accounts
  fromAccount := GetBankAccount(fromAccountID)
  toAccount := GetBankAccount(toAccountID)
  
  if fromAccount.CompanyID != toAccount.CompanyID {
    return Error("DIFFERENT_COMPANY")
  }
  
  if fromAccount.Status != "ACTIVE" || toAccount.Status != "ACTIVE" {
    return Error("ACCOUNT_INACTIVE")
  }
  
  // 3. Check period
  fy := FiscalYearForDate(companyID, transferDate)
  if fy.Status != "OPEN" {
    return Error("PERIOD_CLOSED")
  }
  
  // 4. Create transfer (status = PENDING)
  bt := BankTransfer{
    ID:                UUID(),
    CompanyID:         companyID,
    FiscalYearID:      fy.ID,
    TransferDate:      transferDate,
    FromBankAccountID: fromAccountID,
    ToBankAccountID:   toAccountID,
    Amount:            amount,
    ReferenceNumber:   GenerateReference("BT", transferDate),
    Description:       description,
    Status:            "PENDING",
    CreatedBy:         GetCurrentUserID(),
  }
  
  bt.Save()
  return bt
}
```

#### 2. Complete Transfer (Post Journal)

```go
CompleteBankTransfer(btID, completedByUserID) → BankTransferResult {
  
  bt := GetBankTransfer(btID)
  
  // 1. Validate can complete
  if bt.Status != "PENDING" {
    return Error("NOT_PENDING")
  }
  
  // 2. Re-validate accounts (in case they changed to inactive)
  fromAccount := GetBankAccount(bt.FromBankAccountID)
  toAccount := GetBankAccount(bt.ToBankAccountID)
  
  if fromAccount.Status != "ACTIVE" || toAccount.Status != "ACTIVE" {
    return Error("ACCOUNT_INACTIVE")
  }
  
  // 3. Get COAs
  fromCOA := GetBankAccountCOA(bt.FromBankAccountID)
  toCOA := GetBankAccountCOA(bt.ToBankAccountID)
  
  // 4. Create journal
  lines := []JournalLineInput{
    {
      AccountID:    toCOA.ID,
      DebitAmount:  bt.Amount,
      CreditAmount: 0,
      Description:  fmt.Sprintf("Transfer to %s", toAccount.Name),
    },
    {
      AccountID:    fromCOA.ID,
      DebitAmount:  0,
      CreditAmount: bt.Amount,
      Description:  fmt.Sprintf("Transfer from %s", fromAccount.Name),
    },
  }
  
  journal := CreateJournal(
    companyID:            bt.CompanyID,
    journalDate:          bt.TransferDate,
    journalType:          "TRANSFER",
    lines:                lines,
    reference:            bt.ReferenceNumber,
    description:          bt.Description,
    sourceTransactionID:  bt.ID,
  )
  
  PostJournal(journal.ID)
  
  // 5. Update transfer
  bt.Status = "COMPLETED"
  bt.CompletedAt = NOW()
  bt.CompletedBy = completedByUserID
  bt.LinkedJournalID = journal.ID
  bt.Save()
  
  return {
    success: true,
    bt_id: bt.ID,
    journal_id: journal.ID,
  }
}
```

### API Reference {#api-reference-bt}

#### 1. Create Transfer (Pending)

```http
POST /api/v1/finance/bank-transfer
Content-Type: application/json

{
  "company_id": "uuid",
  "transfer_date": "2026-01-15",
  "from_bank_account_id": "uuid",
  "to_bank_account_id": "uuid",
  "amount": 200000000.00,
  "description": "Transfer to current for supplier payment"
}
```

**Permission**: `bank_transfer.create`

**Response (201)**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "reference_number": "BT-20260115-001",
    "status": "PENDING",
    "amount": 200000000.00
  }
}
```

#### 2. Complete Transfer

```http
POST /api/v1/finance/bank-transfer/{id}/complete
```

**Permission**: `bank_transfer.complete`

**Response (200)**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "COMPLETED",
    "completed_at": "2026-01-15T10:30:45+07:00",
    "linked_journal_id": "uuid"
  }
}
```

#### 3. List Transfers

```http
GET /api/v1/finance/bank-transfer
  ?company_id=uuid
  &from_date=2026-01-01
  &to_date=2026-01-31
  &status=PENDING
  &page=1
  &per_page=20
```

**Response**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "reference_number": "BT-20260115-001",
      "from_account": { "id": "uuid", "name": "Cash", "code": "1010" },
      "to_account": { "id": "uuid", "name": "Current", "code": "1020" },
      "amount": 200000000.00,
      "status": "PENDING",
      "transfer_date": "2026-01-15"
    }
  ]
}
```

### Testing {#testing-bt}

#### TC-BT-001: Create and Complete Transfer
```
1. Create PENDING transfer: 200M from Cash to Current
2. Complete transfer
3. Verify GL: Cash -200M, Current +200M
Expected: Success, double-entry posted
```

#### TC-BT-002: Self-Transfer Rejected
```
1. Try create transfer from Cash to Cash
Expected: Error SAME_ACCOUNT
```

#### TC-BT-003: Inactive Account Rejected
```
1. Deactivate target account
2. Try create transfer to inactive
Expected: Error ACCOUNT_INACTIVE
```

#### TC-BT-004: Cancel Transfer
```
1. Create PENDING transfer
2. Cancel
3. Check GL
Expected: No journal created, status = CANCELLED
```

---

---

## BANK RECONCILIATION

### Feature Overview {#feature-overview-br}

**Bank Reconciliation** matches the company's internal cash-bank records (GL) against the bank's statement. Daily/monthly reconciliation ensures accuracy and detects fraud/errors.

| Feature | User | Description | Permission |
|---------|------|-------------|------------|
| **Import Statement** | Finance | Upload bank statement (CSV/MT940/OFX) | `bank_reconciliation.create` |
| **Auto-Match** | System | Match statement lines to posted transactions | (Auto) |
| **Manual Matching** | Finance | Manually match unmatched statement lines | `bank_reconciliation.update` |
| **Exclude Lines** | Finance | Mark lines as excluded (e.g., bank fees) | `bank_reconciliation.update` |
| **Confirm Reconciliation** | Finance Manager | Finalize when balanced | `bank_reconciliation.post` |
| **View Reconciliation** | Finance | See statement, book balance, difference | `bank_reconciliation.read` |
| **Lock Reconciliation** | Finance Manager | Period control (prevent changes) | `bank_reconciliation.lock` |

### Data Models {#data-models-br}

```sql
CREATE TABLE bank_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
    statement_date DATE NOT NULL,
    statement_period_start DATE NOT NULL,
    statement_period_end DATE NOT NULL,
    opening_balance DECIMAL(15, 2),
    closing_balance DECIMAL(15, 2) NOT NULL,
    statement_reference VARCHAR(255),  -- Bank statement number
    import_source VARCHAR(50),  -- CSV, MT940, OFX, MANUAL
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',  -- DRAFT, RECONCILING, RECONCILED, CONFIRMED
    locked_at TIMESTAMPTZ,
    locked_by UUID REFERENCES employees(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    INDEX (company_id, bank_account_id, statement_date),
    UNIQUE (bank_account_id, statement_period_end)
);

CREATE TABLE bank_statement_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_statement_id UUID NOT NULL REFERENCES bank_statements(id),
    statement_line_date DATE NOT NULL,
    statement_line_reference VARCHAR(255),  -- Bank reference, cheque #, etc
    statement_line_description TEXT,
    debit_amount DECIMAL(15, 2) DEFAULT 0,
    credit_amount DECIMAL(15, 2) DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'UNMATCHED',  -- UNMATCHED, MATCHED, EXCLUDED
    matched_transaction_id UUID REFERENCES cash_bank_transactions(id),
    excluded_reason TEXT,  -- Bank fee, pending, etc.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    INDEX (bank_statement_id),
    INDEX (status),
    INDEX (matched_transaction_id)
);
```

### Go Model

```go
type BankStatement struct {
    ID                    string          `gorm:"type:uuid;primaryKey"`
    CompanyID             string          `gorm:"type:uuid;not null;index:idx_br_company"`
    BankAccountID         string          `gorm:"type:uuid;not null;index:idx_br_account_date"`
    StatementDate         time.Time       `gorm:"type:date;not null"`
    StatementPeriodStart  time.Time       `gorm:"type:date;not null;index:idx_br_account_date"`
    StatementPeriodEnd    time.Time       `gorm:"type:date;not null;uniqueIndex:"`
    OpeningBalance        *decimal.Decimal `gorm:"type:numeric(15,2)"`
    ClosingBalance        decimal.Decimal `gorm:"type:numeric(15,2)"`
    StatementReference    *string         `gorm:"type:varchar(255)"`
    ImportSource          string          `gorm:"type:varchar(50)"`  // CSV, MT940, OFX, MANUAL
    Status                string          `gorm:"type:varchar(20);index:idx_br_status"`  // DRAFT, RECONCILING, RECONCILED, CONFIRMED
    LockedAt              *time.Time      `gorm:"type:timestamptz"`
    LockedBy              *string         `gorm:"type:uuid"`
    CreatedAt             time.Time       `gorm:"autoCreateTime:milli"`
    UpdatedAt             time.Time       `gorm:"autoUpdateTime:milli"`
    
    // Relationships
    Lines                 []BankStatementLine `gorm:"foreignKey:BankStatementID;constraint:OnDelete:CASCADE"`
}

type BankStatementLine struct {
    ID                   string          `gorm:"type:uuid;primaryKey"`
    BankStatementID      string          `gorm:"type:uuid;not null;index:idx_bsl_statement"`
    StatementLineDate    time.Time       `gorm:"type:date;not null"`
    StatementLineRef     *string         `gorm:"type:varchar(255)"`
    StatementLineDesc    *string         `gorm:"type:text"`
    DebitAmount          decimal.Decimal `gorm:"type:numeric(15,2)"`
    CreditAmount         decimal.Decimal `gorm:"type:numeric(15,2)"`
    Status               string          `gorm:"type:varchar(20);index:idx_bsl_status"`  // UNMATCHED, MATCHED, EXCLUDED
    MatchedTransactionID *string         `gorm:"type:uuid;index:idx_bsl_matched"`
    ExcludedReason       *string         `gorm:"type:text"`
    CreatedAt            time.Time       `gorm:"autoCreateTime:milli"`
}
```

### User Journey {#user-journey-br}

#### Happy Path: Import and Reconcile

```
Scenario: Weekly bank reconciliation

1. Navigate to /finance/bank-reconciliation
   - See list of bank statements
   - Status: DRAFT, RECONCILING, RECONCILED, CONFIRMED
   - Button: "Import Statement"

2. Click "Import Statement"
   - Form: "Import Bank Statement"
   - Select Bank Account (dropdown)
   - Upload File (CSV, MT940, OFX)
   - OR Manual Entry: Period dates, opening/closing balance

3. Upload CSV
   - File format: Date, Description, Debit, Credit, or Bank-specific
   - System parses and creates BankStatementLines

4. Review Imported Statement
   - Show:
     * Opening Balance: 100,000,000
     * Closing Balance: 250,000,000 (from statement)
     * Statement Period: 2026-01-01 to 2026-01-31
   - See imported lines (transactions from statement)

5. Auto-Match
   - System runs matching algorithm:
     * For each statement line, find matching cash-bank transaction
     * Match criteria: Date (±1 day), Amount, Account
   - Show results:
     * 45 lines matched automatically
     * 3 lines unmatched

6. Review Unmatched
   - Finance sees 3 unmatched lines:
     * Line 1: 01-Jan, "Bank Charge", Credit 50,000
     * Line 2: 15-Jan, "Deposit Refund", Debit 100,000
     * Line 3: 30-Jan, "Unknown", Debit 25,000

7. Manual Matching or Exclusion
   - For "Bank Charge": Click "Exclude", reason = "Bank fee (monthly charge)"
   - For "Deposit Refund": Search for matching transaction, click "Match"
   - For "Unknown": Leave unmatched (different from book, requires investigation)

8. View Reconciliation Result
   - Show:
     * Book Balance (from GL): 240,000,000
     * Statement Balance: 250,000,000
     * Difference: 10,000,000 (Unknown line)
     * Status: "Not Balanced, 1 unmatched line"

9. Investigate Difference
   - Ask user: "Do you want to accept this difference?"
   - Options:
     * Find matching transaction for Unknown
     * Adjust statement (if data entry error)
     * Record difference as "timing difference" (expected to match next period)

10. If OK to Proceed
    - Finance Manager confirms: "Reconciliation appears complete"
    - Click "Confirm"
    - Status changes to CONFIRMED
    - Record locked for period

End State:
- Bank Reconciliation: CONFIRMED
- Difference: 10,000,000 (documented)
- Book vs Statement: Reconciled with known difference
- Period locked (cannot re-import for same period)
- Audit trail: who confirmed, when, difference explanation
```

### Business Logic {#business-logic-br}

#### 1. Import Statement

```go
ImportBankStatement(
  companyID, bankAccountID, statementData, importSource)
  → BankStatement {
  
  // 1. Validate bank account
  ba := GetBankAccount(bankAccountID)
  if ba.CompanyID != companyID {
    return Error("COMPANY_MISMATCH")
  }
  
  // 2. Parse statement data
  stmt := BankStatement{
    ID:                  UUID(),
    CompanyID:           companyID,
    BankAccountID:       bankAccountID,
    StatementDate:       NOW(),
    StatementPeriodStart: parseDate(statementData.StartDate),
    StatementPeriodEnd:   parseDate(statementData.EndDate),
    OpeningBalance:      statementData.OpeningBalance,
    ClosingBalance:      statementData.ClosingBalance,
    ImportSource:        importSource,
    Status:              "DRAFT",
  }
  
  // 3. Check for duplicate
  existing := BankStatement.FindByAccountAndPeriod(
    bankAccountID, statementData.EndDate)
  if existing {
    return Error("STATEMENT_ALREADY_EXISTS")
  }
  
  stmt.Save()
  
  // 4. Create statement lines
  for each line in statementData.Lines {
    bsl := BankStatementLine{
      ID:                UUID(),
      BankStatementID:   stmt.ID,
      StatementLineDate: line.Date,
      StatementLineRef:  line.Reference,
      StatementLineDesc: line.Description,
      DebitAmount:       line.Debit,
      CreditAmount:      line.Credit,
      Status:            "UNMATCHED",
    }
    bsl.Save()
  }
  
  return stmt
}
```

#### 2. Auto-Match

```go
AutoMatchStatementLines(statementID) → MatchingResult {
  
  stmt := GetBankStatement(statementID)
  
  matchedCount := 0
  
  for each line in stmt.Lines {
    if line.Status == "MATCHED" || line.Status == "EXCLUDED" {
      continue  // Already processed
    }
    
    // Find matching transaction
    candidates := CashBankTransaction.FindByFilter(
      company_id:  stmt.CompanyID,
      bank_account_id: stmt.BankAccountID,
      date_min:    line.Date.AddDays(-1),
      date_max:    line.Date.AddDays(1),
      amount:      line.Amount(),
      status:      "POSTED"
    )
    
    if len(candidates) == 1 {
      // Exact match found
      line.Status = "MATCHED"
      line.MatchedTransactionID = candidates[0].ID
      line.Save()
      matchedCount++
    } else if len(candidates) > 1 {
      // Ambiguous, manual intervention needed
      line.Status = "UNMATCHED"  // User will decide
    }
    // No candidate: stays UNMATCHED
  }
  
  return {
    total_lines: len(stmt.Lines),
    matched: matchedCount,
    unmatched: len(stmt.Lines) - matchedCount,
  }
}
```

#### 3. Calculate Reconciliation Balance

```go
CalculateReconciliationBalance(statementID) → ReconciliationBalance {
  
  stmt := GetBankStatement(statementID)
  
  // Get GL balance as of statement period end
  glBalance := GetGLBalance(
    stmt.CompanyID, 
    GetBankAccountCOA(stmt.BankAccountID).ID,
    stmt.StatementPeriodEnd
  )
  
  statementBalance := stmt.ClosingBalance
  
  difference := statementBalance - glBalance
  
  return {
    gl_balance: glBalance,
    statement_balance: statementBalance,
    difference: difference,
    is_balanced: difference == 0,
    unmatched_lines: CountByStatus(stmt.ID, "UNMATCHED"),
    excluded_lines: CountByStatus(stmt.ID, "EXCLUDED"),
  }
}
```

### API Reference {#api-reference-br}

#### 1. Import Bank Statement

```http
POST /api/v1/finance/bank-reconciliation/import
Content-Type: multipart/form-data

company_id=uuid
bank_account_id=uuid  
import_source=CSV
file=<binary CSV data>
```

**Permission**: `bank_reconciliation.create`

**Response**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "DRAFT",
    "lines_imported": 48,
    "opening_balance": 100000000.00,
    "closing_balance": 250000000.00
  }
}
```

#### 2. Auto-Match Statement Lines

```http
POST /api/v1/finance/bank-reconciliation/{id}/auto-match
```

**Response**
```json
{
  "success": true,
  "data": {
    "total_lines": 48,
    "matched": 45,
    "unmatched": 3
  }
}
```

#### 3. Manual Match

```http
POST /api/v1/finance/bank-reconciliation/line/{line_id}/match
Content-Type: application/json

{
  "transaction_id": "uuid"
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "line_id": "uuid",
    "status": "MATCHED",
    "matched_to": { "id": "uuid", "amount": 50000.00, "date": "2026-01-15" }
  }
}
```

#### 4. Exclude Line

```http
POST /api/v1/finance/bank-reconciliation/line/{line_id}/exclude
Content-Type: application/json

{
  "reason": "Bank service charge - monthly fee"
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "line_id": "uuid",
    "status": "EXCLUDED",
    "reason": "Bank service charge"
  }
}
```

#### 5. Get Reconciliation Status

```http
GET /api/v1/finance/bank-reconciliation/{id}/status
```

**Response**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "RECONCILING",
    "gl_balance": 240000000.00,
    "statement_balance": 250000000.00,
    "difference": 10000000.00,
    "is_balanced": false,
    "matched_lines": 45,
    "unmatched_lines": 1,
    "excluded_lines": 2
  }
}
```

#### 6. Confirm Reconciliation

```http
POST /api/v1/finance/bank-reconciliation/{id}/confirm
Content-Type: application/json

{
  "difference_explanation": "Unmatched deposit, expected to clear next week"
}
```

**Permission**: `bank_reconciliation.post`

**Response**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "CONFIRMED",
    "confirmed_at": "2026-01-31T16:00:00+07:00",
    "confirmed_by": "uuid"
  }
}
```

### Testing {#testing-br}

#### TC-BR-001: Import Statement
```
1. Upload CSV with 48 transactions
2. Import
Expected: Statement created, lines parsed
```

#### TC-BR-002: Auto-Match
```
1. Import statement
2. Auto-match
Expected: 45 matched, 3 unmatched
```

#### TC-BR-003: Manual Match
```
1. Auto-match completes
2. User manually matches Line 1 to Transaction 1
Expected: Line status = MATCHED
```

#### TC-BR-004: Exclude Line
```
1. User excludes Line 2 (bank fee)
Expected: Line status = EXCLUDED, reason stored
```

#### TC-BR-005: Balanced Reconciliation
```
1. After matching/excluding all
2. GL Balance = Statement Balance
3. Click Confirm
Expected: Status = CONFIRMED, difference = 0
```

#### TC-BR-006: Unbalanced Reconciliation
```
1. After matching/excluding
2. GL Balance ≠ Statement Balance (10M diff)
3. User can still confirm with explanation
Expected: Status = CONFIRMED, difference documented
```

---

---

## COMMON FEATURES

### 1. Reference Number Generation

All transactions (CBT, BT, Statements) auto-generate reference numbers:

```
CBT: CBT-YYYYMMDD-NNN    (e.g., CBT-20260115-001)
BT:  BT-YYYYMMDD-NNN     (e.g., BT-20260115-001)
BR:  BR-YYYYMMDD-NNN     (e.g., BR-20260115-001)
```

### 2. Draft Auto-Save

Frontend auto-saves drafts to localStorage every 1.5s:
- Cash-Bank Transaction (draft)
- Bank Transfer (pending)
- Bank Reconciliation (before confirm)

### 3. Permission-Guarded UI

Components render based on user permissions:
- **`cash_bank_transaction.read`**: See list
- **`cash_bank_transaction.create`**: New transaction button
- **`cash_bank_transaction.post`**: Post button (auto for create)
- **`bank_transfer.read`**: See transfer list
- **`bank_transfer.create`**: New transfer button
- **`bank_transfer.complete`**: Complete button
- **`bank_reconciliation.read`**: See reconciliation
- **`bank_reconciliation.create`**: Import statement
- **`bank_reconciliation.update`**: Manual match/exclude
- **`bank_reconciliation.post`**: Confirm

---

## BUSINESS RULES

### Cash-Bank Transactions
1. One transaction = one journal entry (auto-generated)
2. Payment In: Debit Bank, Credit Contra
3. Payment Out: Debit Contra, Credit Bank
4. Status POSTED is immutable (reverse for correction)
5. Cannot post to closed period

### Bank Transfers
1. Two-step process: PENDING → COMPLETED
2. Only posts when COMPLETED
3. Cannot transfer to/from same account
4. Amount must be positive
5. Only completes from PENDING status
6. Cannot cancel after completion

### Bank Reconciliation
1. One statement = one period (e.g., monthly)
2. Statement lines: UNMATCHED → MATCHED or EXCLUDED
3. Auto-match tries same-day ±1 day, same amount
4. Manual match: user selects transaction
5. Excluded lines = documented exceptions (bank fee, pending, etc.)
6. Reconciliation can be CONFIRMED even with unbalanced difference (documented)
7. Confirmed reconciliation is locked (no re-import for same period)

---

## Integration Summary

```
Phase 0: Opening Balance
         ↓ (baseline)
Phase 1: Journal Engine (validation, posting, balance calc)
         ↓ (underlying)
Phase 2: Cash-Bank Operations
    ├─ Cash-Bank Transactions (auto-journal)
    ├─ Bank Transfers (2-step journal)
    └─ Bank Reconciliation (matching + audit)
         ↓ (results)
Reports: GL Trial Balance, Bank Reconciliation Report, etc.
```

---

## Summary

**Phase 2** enables daily cash and bank operations: recording payments, executing transfers, and reconciling statements. All operations use the Phase 1 Journal Engine to maintain GL integrity and the Phase 0 Opening Balance as the foundation. The result is a complete, auditable, and integrated cash-bank management system.

**Key Deliverables**:
- ✅ Daily payment processing (in/out) with auto-journaling
- ✅ Inter-account transfer management with two-step posting
- ✅ Bank statement import and reconciliation
- ✅ Auto-matching with manual override capability
- ✅ GL integration (all operations post to GL)
- ✅ Audit trail (who, when, what, why, matched to GL)
- ✅ Complete cash-bank operations lifecycle
