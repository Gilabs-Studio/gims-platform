# Phase 1: Journal Engine & Posting Discipline (Core Accounting Behavior)

> **Module:** Finance / Journal Engine  
> **Phase:** 1 - Core Accounting Infrastructure  
> **Version:** 1.0  
> **Status:** Complete  
> **Last Updated:** April 2026

---

## Table of Contents
1. [Overview](#overview)
2. [Features](#features)
3. [System Architecture](#system-architecture)
4. [Data Models](#data-models)
5. [Business Logic](#business-logic)
6. [User Flow](#user-flow)
7. [Journal Entry Lifecycle](#journal-entry-lifecycle)
8. [API Reference](#api-reference)
9. [Business Rules](#business-rules)
10. [Use Case by Role](#use-case-by-role)
11. [Period Management](#period-management)
12. [Testing Checklist](#testing-checklist)
13. [Error Handling](#error-handling)

---

## Overview

**Phase 1** is the **core accounting infrastructure layer** that handles the creation, validation, posting, and management of journal entries. While Phase 0 creates the opening balance, Phase 1 is the **engine that processes all subsequent financial transactions**.

### Purpose
- Provide a centralized journal entry system that all modules use
- Ensure double-entry accounting is maintained (debit = credit)
- Enforce period-based posting control (prevent posting to closed periods)
- Maintain audit trail (who, when, what)
- Calculate GL account balances from posted journal entries

### Key Principle
**All financial transactions are represented as journal entries in the General Ledger.** No balance is calculated directly from sub-ledger modules; all balances derive from journal postings.

### Scope
- **IN SCOPE**: Journal management, period control, GL posting, balance calculation
- **OUT OF SCOPE**: Business logic for specific transaction types (that's Phase 2); UI for end users

---

## Features

| Feature | Description | Where Used | Permission |
|---------|-------------|-----------|------------|
| **Create Journal Entry** | Manual entry: date, lines (account+debit/credit), description, reference | GL module, Accountant | `journal.create` |
| **Validate Journal** | Auto-check: balanced (debit=credit), period open, accounts active, amounts positive | During creation, before post | (Auto) |
| **Simulate Journal** | Run validation without posting (preview state) | Before user clicks Post | `journal.read` |
| **Post Journal** | Finalize journal entry, lock from edit, mark in GL | On-demand by user | `journal.post` |
| **Save Draft Journal** | Store unposted journal, editable until posted | Auto-save on form changes | `journal.create` |
| **List Journals** | View all journals with filters (date, status, type, account) | GL module, Reports | `journal.read` |
| **View Journal Detail** | See all lines, source transaction, posting date, status | GL module, Audit | `journal.read` |
| **Reverse Journal Entry** | Create reversing entry to undo posted journal | Correction flow (Phase 2) | `journal.reverse` |
| **Calculate GL Balance** | Sum all posted journal lines for account up to date | Balance inquiry, Reports | `journal.read` |
| **Lock Period** | No new postings allowed for closed period | Month/year end | `period.lock` |

---

## System Architecture

### Backend Structure (Go/Gin)

```
internal/finance/
├── journal/
│   ├── data/
│   │   ├── models/
│   │   │   ├── journal.go           # Main journal entry
│   │   │   ├── journal_line.go      # Detail lines
│   │   │   └── journal_posting.go   # Posting history (audit)
│   │   └── repositories/
│   │       ├── journal_repository.go
│   │       ├── journal_line_repository.go
│   │       └── period_repository.go
│   ├── domain/
│   │   ├── dto/
│   │   │   ├── journal_dto.go
│   │   │   ├── journal_line_dto.go
│   │   │   └── journal_simulation_dto.go
│   │   ├── mapper/
│   │   │   └── journal_mapper.go
│   │   └── usecase/
│   │       └── journal_usecase.go  # All posting logic
│   └── presentation/
│       ├── handler/
│       │   └── journal_handler.go
│       └── router/
│           └── journal_routers.go
├── period/                         # Period lock management
│   ├── data/models/period.go
│   └── domain/usecase/period_usecase.go
└── gl_balance/                     # GL account balance cache
    └── core/infrastructure/cache/gl_balance.go
```

### Frontend (Minimal in Phase 1)
- **List View**: `/finance/journals` (Accountant view, read-only by role)
- **Detail View**: `/finance/journals/[id]` (View journal + lines, source link)
- **Manual Entry**: Embedded in Finance module (if needed)

### Posting Flow Diagram

```
Transaction Source (Phase 2: Payment, Transfer, etc.)
         │
         ├─→ [1] Create Journal Entry (DRAFT)
         │   ├─ journal_type = PAYMENT_IN | PAYMENT_OUT | TRANSFER | ...
         │   ├─ journal_date = transaction date
         │   ├─ reference = source ref (e.g., cheque#, inv#)
         │   ├─ status = DRAFT
         │
         ├─→ [2] Create Journal Lines
         │   ├─ account_id, debit_amount, credit_amount
         │   ├─ For each source transaction detail
         │
         ├─→ [3] Validate (Simulate)
         │   ├─ Check: debit sum = credit sum
         │   ├─ Check: period status = OPEN
         │   ├─ Check: all accounts active & postable
         │   ├─ Check: no negative amounts
         │
         ├─→ [4A] If validation FAILS
         │   ├─ Return error, do NOT post
         │   ├─ Inform user/module of error
         │
         ├─→ [4B] If validation PASSES
         │   ├─ Auto-post (or wait for user decision)
         │   │
         │   ├─→ [5A] Auto-Post Journey
         │   │   ├─ Mark journal status = POSTED
         │   │   ├─ Record posted_at timestamp
         │   │   ├─ Invalidate GL balance cache
         │   │   └─ Return success, journal_id, source_ref
         │   │
         │   ├─→ [5B] Manual-Post Journey
         │   │   ├─ Show user "Post?" button
         │   │   ├─ User clicks Post
         │   │   ├─ Mark journal status = POSTED
         │   │   ├─ Return success
         │
         └─→ [6] End-to-End Result
             ├─ Transaction recorded in GL
             ├─ Balances updated
             ├─ Audit trail created
             └─ Source module notified (success/failure)
```

---

## Data Models

### Journal Model

```sql
CREATE TABLE journals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    fiscal_year_id UUID NOT NULL REFERENCES fiscal_years(id),
    journal_date DATE NOT NULL,
    journal_type VARCHAR(50) NOT NULL,
        -- OPENING_BALANCE, PAYMENT_IN, PAYMENT_OUT, TRANSFER, 
        -- ADJUSTMENT, REVERSAL, ACCRUAL, etc.
    reference VARCHAR(255) NOT NULL,  -- Source reference (cheque#, inv#, auto-gen)
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',  -- DRAFT, POSTED, REVERSED, CANCELLED
    source_transaction_id UUID,  -- Link to source (payment, transfer, etc.)
    source_transaction_type VARCHAR(50),  -- PAYMENT, TRANSFER, etc.
    reversal_of_id UUID REFERENCES journals(id),  -- For reversal entries
    posted_at TIMESTAMPTZ,
    posted_by UUID REFERENCES employees(id),
    reversed_at TIMESTAMPTZ,
    reversed_by UUID REFERENCES employees(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES employees(id),
    updated_by UUID REFERENCES employees(id),
    
    INDEX (company_id, fiscal_year_id, journal_date),
    INDEX (status, fiscal_year_id),
    INDEX (source_transaction_id),
    UNIQUE (source_transaction_id)  -- Prevent duplicate posting from same source
);
```

### JournalLine Model

```sql
CREATE TABLE journal_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_id UUID NOT NULL REFERENCES journals(id),
    account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
    debit_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    credit_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    INDEX (journal_id),
    INDEX (account_id)
);
```

### Go Model Example

```go
type Journal struct {
    ID                     string    `gorm:"type:uuid;primaryKey"`
    CompanyID              string    `gorm:"type:uuid;not null;index:idx_journal_company_fy"`
    FiscalYearID           string    `gorm:"type:uuid;not null;index:idx_journal_company_fy"`
    JournalDate            time.Time `gorm:"type:date;not null;index:idx_journal_date"`
    JournalType            string    `gorm:"type:varchar(50);not null"`  // OPENING_BALANCE, PAYMENT_IN, etc
    Reference              string    `gorm:"type:varchar(255);not null"`
    Description            *string   `gorm:"type:text"`
    Status                 string    `gorm:"type:varchar(20);index:idx_journal_status"`  // DRAFT, POSTED, etc
    SourceTransactionID    *string   `gorm:"type:uuid;uniqueIndex:idx_source_transaction"`
    SourceTransactionType  *string   `gorm:"type:varchar(50)"`
    ReversalOfID           *string   `gorm:"type:uuid"`
    PostedAt               *time.Time `gorm:"type:timestamptz"`
    PostedBy               *string   `gorm:"type:uuid"`
    ReversedAt             *time.Time `gorm:"type:timestamptz"`
    ReversedBy             *string   `gorm:"type:uuid"`
    CreatedAt              time.Time `gorm:"autoCreateTime:milli"`
    UpdatedAt              time.Time `gorm:"autoUpdateTime:milli"`
    CreatedBy              *string   `gorm:"type:uuid"`
    UpdatedBy              *string   `gorm:"type:uuid"`
    
    // Relationships
    Lines                  []JournalLine `gorm:"foreignKey:JournalID;constraint:OnDelete:CASCADE"`
    Company                Company
    FiscalYear             FiscalYear
}

type JournalLine struct {
    ID           string          `gorm:"type:uuid;primaryKey"`
    JournalID    string          `gorm:"type:uuid;not null;index:idx_journal_line_journal"`
    AccountID    string          `gorm:"type:uuid;not null;index:idx_journal_line_account"`
    DebitAmount  decimal.Decimal `gorm:"type:numeric(15,2)"`
    CreditAmount decimal.Decimal `gorm:"type:numeric(15,2)"`
    Description  *string         `gorm:"type:text"`
    CreatedAt    time.Time       `gorm:"autoCreateTime:milli"`
    UpdatedAt    time.Time       `gorm:"autoUpdateTime:milli"`
    
    // Relationships
    Account      ChartOfAccount
}
```

---

## Business Logic

### 1. Journal Creation & Validation

```go
CreateJournal(companyID, journalDate, journalType, lines, reference, sourceTransactionID) 
  → Journal {
  
  // 1. Validate input
  if !company.exists(companyID) {
    return Error("COMPANY_NOT_FOUND")
  }
  
  if len(lines) == 0 {
    return Error("NO_LINES")
  }
  
  // Get fiscal year for journal date
  fy, err := FiscalYearForDate(companyID, journalDate)
  if err != nil {
    return Error("FISCAL_YEAR_NOT_FOUND")
  }
  
  // 2. Check period status
  if fy.Status != "OPEN" {
    return Error("PERIOD_CLOSED", fmt.Sprintf(
      "Cannot post to %s period. Status: %s", 
      fy.Name, fy.Status))
  }
  
  // 3. Validate lines
  totalDebit := 0
  totalCredit := 0
  
  for each line {
    // Check account exists and is postable
    account, err := coa.GetAccount(line.AccountID)
    if err || !account.IsPostable {
      return Error("ACCOUNT_NOT_POSTABLE")
    }
    
    // Check amounts
    if line.DebitAmount < 0 || line.CreditAmount < 0 {
      return Error("NEGATIVE_AMOUNT")
    }
    
    if line.DebitAmount > 0 && line.CreditAmount > 0 {
      return Error("BOTH_DEBIT_CREDIT")
    }
    
    totalDebit += line.DebitAmount
    totalCredit += line.CreditAmount
  }
  
  // 4. Check balance
  if !IsBalanced(totalDebit, totalCredit) {
    return Error("NOT_BALANCED", fmt.Sprintf(
      "Debit: %v, Credit: %v, Diff: %v",
      totalDebit, totalCredit, totalDebit-totalCredit))
  }
  
  // 5. Check for duplicate source
  if sourceTransactionID != "" {
    exists, _ := Journal.ExistsBySource(sourceTransactionID)
    if exists {
      return Error("DUPLICATE_SOURCE")
    }
  }
  
  // 6. Create journal (status = DRAFT)
  journal := Journal{
    ID:                   UUID(),
    CompanyID:            companyID,
    FiscalYearID:         fy.ID,
    JournalDate:          journalDate,
    JournalType:          journalType,
    Reference:            reference,
    Status:               "DRAFT",
    SourceTransactionID:  sourceTransactionID,
    CreatedBy:            GetCurrentUser(),
  }
  
  journal.Save()
  
  // 7. Create journal lines
  for each line {
    jl := JournalLine{
      ID:           UUID(),
      JournalID:    journal.ID,
      AccountID:    line.AccountID,
      DebitAmount:  line.DebitAmount,
      CreditAmount: line.CreditAmount,
      Description:  line.Description,
    }
    jl.Save()
  }
  
  return journal
}
```

### 2. Journal Posting (Auto or Manual)

```go
PostJournal(journalID, postedByUserID) → PostingResult {
  
  journal := GetJournal(journalID)
  
  // 1. Validate can post
  if journal.Status != "DRAFT" {
    return Error("ALREADY_POSTED")
  }
  
  // 2. Re-validate before post (fail-safe)
  if !SimulateJournal(journal).IsValid {
    return Error("VALIDATION_FAILED")
  }
  
  // 3. Post
  journal.Status = "POSTED"
  journal.PostedAt = NOW()
  journal.PostedBy = postedByUserID
  journal.UpdatedBy = postedByUserID
  journal.Save()
  
  // 4. Invalidate GL balance cache
  for each line in journal.Lines {
    cache.Invalidate("gl_balance:" + journal.CompanyID + ":" + line.AccountID)
  }
  
  return {
    success: true,
    journal_id: journal.ID,
    posted_at: journal.PostedAt,
    message: "Journal posted successfully"
  }
}
```

### 3. GL Balance Calculation

```go
GetGLBalance(companyID, accountID, asOfDate) → GLBalance {
  
  // Build from:
  // 1. Opening balance for fiscal year
  // 2. Sum all posted journal lines from start of FY to asOfDate
  
  fy := FiscalYearForDate(companyID, asOfDate)
  
  // Get opening balance journal
  obJournal := Journal.FindByType(
    companyID, fy.ID, "OPENING_BALANCE", status="POSTED")
  
  balance := 0
  
  if obJournal != nil {
    obLine := obJournal.Lines[AccountID == accountID]
    if obLine != nil {
      balance += (obLine.DebitAmount - obLine.CreditAmount)
    }
  }
  
  // Sum posted journal lines up to date
  lines := JournalLine.FindByAccount(
    accountID,
    where: {
      company_id: companyID,
      fiscal_year_id: fy.ID,
      journal.status: "POSTED",
      journal.journal_date <= asOfDate
    }
  )
  
  for each line {
    balance += (line.DebitAmount - line.CreditAmount)
  }
  
  // Account-type adjustment
  account := COA.GetAccount(accountID)
  if account.Type == "CREDIT"  // Liabilities, Equity, Income
    balance = -balance
  
  return GLBalance {
    account_id: accountID,
    as_of_date: asOfDate,
    balance: balance,
    calculated_from: "Opening Balance + Posted Journal Lines"
  }
}
```

---

## User Flow

### User Flow: Journal Posting (Manual Journal Entry)

**Persona**: Accountant or Finance Manager

**Happy Path**:
```
1. User navigates to /finance/journals
   - See list of journals (DRAFT, POSTED)
   - Can filter by date range, status, type, account
   - Have permission checks (can only see own or all per role)

2. Click "New Journal Entry"
   - Modal opens: "Create Journal"
   - Fields:
     * Journal Date (date picker, defaults to today)
     * Journal Type (dropdown: General, Payment, Transfer, etc.)
     * Reference (text input, auto-generate if type-specific)
     * Description (textarea)
     * Lines section (editable table)

3. Add Journal Lines
   - Click "Add Line"
   - Select Account (COA dropdown/search)
   - Enter Debit amount (if debit-side account)
   - Enter Credit amount (if credit-side account)
   - Add description (optional)
   - Repeat for all lines

4. Validate Before Post
   - System shows running totals: "Debit: X | Credit: Y | Diff: Z"
   - If balanced: "(✓ Balanced)"
   - If not: "(✗ Unbalanced, diff: Z)"
   - Manual journal doesn't auto-post; user clicks "Save & Post"

5. Click "Save & Post"
   - System validates again (re-check period, balance, accounts)
   - If valid:
     * Journal marked as POSTED
     * Timestamp recorded
     * GL balance cache invalidated
     * Success notification: "Journal posted"
   - If invalid:
     * Show error message
     * Return to step 3

6. View Posted Journal
   - Can now view as read-only
   - See all lines, posting date, posted by user
   - Can view GL impact (which accounts affected, how)
   - Ready for reporting
```

---

## Journal Entry Lifecycle

### State Diagram

```
┌─────────────┐
│   DRAFT     │ ← Created manually or from source transaction
└──────┬──────┘
       │ [Save] (editable)
       │ [Simulate] (validate without post)
       │
       └─→ ┌─────────────────┐
           │ POSTED          │ ← Locked, immutable
           └────────┬────────┘
                    │ [View] (read-only in GL)
                    │ [Create Reversal]
                    │
                    └─→ ┌─────────────────┐
                        │ REVERSED        │ ← Original stays, reversal created
                        └─────────────────┘

Alternative Path:
┌─────────────┐
│   DRAFT     │
└──────┬──────┘
       │ [Cancel]
       │
       └─→ ┌──────────────┐
           │ CANCELLED    │ ← Discarded, not posted
           └──────────────┘
```

### Status Explanation

| Status | Meaning | Editable | Post Locked | Example |
|--------|---------|----------|------------|---------|
| **DRAFT** | Entry created but not finalized | Yes | No | User entering journal lines |
| **POSTED** | Entry locked, in GL, affects balance | No | Yes | Published journal in GL |
| **REVERSED** | Original posted, then reversed by new entry | No | N/A | Correction of erroneous post |
| **CANCELLED** | Discarded without posting | No | N/A | User clicked Cancel on draft |

---

## API Reference

### 1. Create Journal (Draft)

```http
POST /api/v1/finance/journals
Content-Type: application/json

{
  "company_id": "uuid",
  "fiscal_year_id": "uuid",
  "journal_date": "2026-01-15",
  "journal_type": "GENERAL",
  "reference": "JNL-001",
  "description": "Monthly adjustment",
  "lines": [
    {
      "account_id": "uuid",
      "debit_amount": 500000.00,
      "credit_amount": 0.00,
      "description": "Accrual entry"
    },
    {
      "account_id": "uuid",
      "debit_amount": 0.00,
      "credit_amount": 500000.00,
      "description": "Offset"
    }
  ]
}
```

**Permission**: `journal.create`

**Response (201 Created)**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "DRAFT",
    "reference": "JNL-001",
    "lines_count": 2
  }
}
```

---

### 2. Simulate Journal Validation

```http
POST /api/v1/finance/journals/simulate
Content-Type: application/json

{
  "company_id": "uuid",
  "fiscal_year_id": "uuid",
  "journal_date": "2026-01-15",
  "lines": [
    {
      "account_id": "uuid",
      "debit_amount": 500000.00,
      "credit_amount": 0.00
    }
  ]
}
```

**Permission**: `journal.read`

**Response (200 OK)**
```json
{
  "success": true,
  "data": {
    "is_valid": true,
    "total_debit": 500000.00,
    "total_credit": 500000.00,
    "difference": 0.00,
    "is_balanced": true,
    "validation_messages": [],
    "period_status": "OPEN",
    "can_post": true
  }
}
```

---

### 3. Post Journal

```http
POST /api/v1/finance/journals/{id}/post
```

**Permission**: `journal.post`

**Response (200 OK)**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "POSTED",
    "posted_at": "2026-01-15T10:30:45+07:00",
    "posted_by": "uuid"
  }
}
```

---

### 4. Get GL Balance

```http
GET /api/v1/finance/gl-balance
  ?company_id=uuid
  &account_id=uuid
  &as_of_date=2026-01-31
```

**Permission**: `journal.read` (or `gl.read`)

**Response (200 OK)**
```json
{
  "success": true,
  "data": {
    "account_id": "uuid",
    "account_code": "1010",
    "account_name": "Bank Cash",
    "as_of_date": "2026-01-31",
    "balance": 150000000.00,
    "calculated_from": "Opening Balance + Posted Journal Lines"
  }
}
```

---

### 5. Reverse Journal

```http
POST /api/v1/finance/journals/{id}/reverse
Content-Type: application/json

{
  "reason": "Erroneous entry, correct amount should be X",
  "description": "Reversal of incorrect posting"
}
```

**Permission**: `journal.reverse`

**Response**
```json
{
  "success": true,
  "data": {
    "original_journal_id": "uuid",
    "reversal_journal_id": "uuid-new",
    "reversal_date": "2026-01-16",
    "message": "Journal reversed successfully"
  }
}
```

---

## Business Rules

### Core Rules

| Rule | Impact | Enforcement |
|------|--------|------------|
| **No unbalanced journal** | Ensures debit=credit always | Validation before post |
| **No post in closed period** | Locks historical data; prevents accidents | Period status check |
| **Posted is immutable** | Maintains audit trail | API rejects updates on posted journal |
| **All accounts must be postable** | Prevents invalid COA usage | Account.is_postable check |
| **Source transaction uniqueness** | Prevents duplicate posting from same source | UNIQUE(source_transaction_id) |
| **Debit/Credit exclusivity** | Line cannot have both debit AND credit | Input validation |
| **Non-negative amounts** | Prevents logical errors | Amount >= 0 validation |
| **All lines must be in same FY** | Enforces fiscal year boundaries | journal_date → fiscal_year mapping |

---

## Use Case by Role

### Accountant
| Action | Permission | Frequency | Context |
|--------|------------|-----------|---------|
| **View all journals** | `journal.read` | Daily | Monitor GL entries |
| **Create manual journal** | `journal.create` | As needed | Adjustments, corrections |
| **Post journal** | `journal.post` | As needed | Finalize entries |
| **View GL balance** | `gl.read` | Daily | Check account balances |
| **Export journal report** | `journal.read` | Monthly | Audit trail documentation |

### Finance Manager
| Action | Permission | Frequency | Context |
|--------|------------|-----------|---------|
| **Approve journal** | `journal.post` | As needed | Control over GL changes |
| **Reverse journal** | `journal.reverse` | As needed | Correct errors |
| **Monitor GL** | `gl.read` | Daily | Budget vs actual |
| **Lock period** | `period.lock` | Month-end | Control closure |

---

## Period Management

### Period Status Types

| Status | Meaning | Can Post? | Can Reverse? |
|--------|---------|----------|------------|
| **OPEN** | Normal operations | ✓ Yes | ✓ Yes |
| **LOCKED** | Month/year closed, no new posts | ✗ No | ✗ No |
| **PREVIEW** | Not yet started | ✓ (if configured) | N/A |

### Period Lock Logic

```go
LockPeriod(fiscalYearID, userID) → LockResult {
  
  fy := FiscalYear.Get(fiscalYearID)
  
  if fy.Status != "OPEN" {
    return Error("PERIOD_ALREADY_LOCKED")
  }
  
  // Lock
  fy.Status = "LOCKED"
  fy.LockedAt = NOW()
  fy.LockedBy = userID
  fy.Save()
  
  // Invalidate GL balance cache for this FY
  cache.Invalidate("gl_balance:*:" + fy.CompanyID + ":" + fy.ID)
  
  return { success: true, message: "Period locked" }
}
```

---

## Testing Checklist

### Functional Tests

#### TC-J1-001: Create Balanced Journal
```
1. Create journal with 2 lines:
   - Debit: 500K
   - Credit: 500K
2. Simulate → isBalanced = true
3. Post
Expected: Success, journal status = POSTED
```

#### TC-J1-002: Create Unbalanced Journal (Rejected)
```
1. Create journal:
   - Debit: 500K
   - Credit: 300K
2. Try Post
Expected: Error NOT_BALANCED or Post disabled
```

#### TC-J1-003: Post to Closed Period (Rejected)
```
1. Select closed FY
2. Try Post
Expected: Error PERIOD_CLOSED
```

#### TC-J1-004: GL Balance Calculation
```
1. Post journal: Debit 1010 = 100K, Credit 3010 = 100K
2. Query GL balance for account 1010
Expected: Balance = 100K (or -100K if credit account type)
```

#### TC-J1-005: Reverse Journal
```
1. Post journal: Debit 1010 = 100K, Credit 3010 = 100K
2. Reverse journal
3. Query GL balance
Expected: 
   - Original journal still exists (status = POSTED)
   - New reversal journal created (status = POSTED)
   - Net balance offset by reversal
```

#### TC-J1-006: Draft Journal Edit
```
1. Create draft journal (status = DRAFT)
2. Edit lines (add/remove/modify)
3. Save
Expected: Successfully updated
```

#### TC-J1-007: Posted Journal Immutable (Rejected)
```
1. Post journal
2. Try to edit lines
Expected: Error or API rejects (read-only)
```

---

### Integration Tests

#### TC-J1-INT-001: Source Transaction Linking
```
1. Create journal with source_transaction_id = payment_12345
2. Try to create another journal with same source_id
Expected: Error DUPLICATE_SOURCE
```

#### TC-J1-INT-002: GL Balance Cache Invalidation
```
1. Query GL balance for account → value X
2. Post new journal affecting account
3. Query again
Expected: GL balance recalculated (cache busted)
```

#### TC-J1-INT-003: Period Integration
```
1. Post journal for FY that's then locked
2. Try to post new journal to locked FY
Expected: Error PERIOD_CLOSED
```

---

## Error Handling

### API Error Codes

| Code | Status | Message | Recovery |
|------|--------|---------|----------|
| `NOT_BALANCED` | 400 | Debit not equal to credit | Adjust line amounts |
| `PERIOD_CLOSED` | 400 | Fiscal year is locked | Use different FY or reopen |
| `ALREADY_POSTED` | 409 | Journal status is not DRAFT | Create new journal |
| `NO_LINES` | 400 | Journal has no lines | Add at least 1 line |
| `ACCOUNT_NOT_POSTABLE` | 400 | Selected account cannot accept posting | Select postable account |
| `DUPLICATE_SOURCE` | 409 | Source transaction already posted | Check existing journal |
| `PERIOD_NOT_FOUND` | 404 | Fiscal year not found for date | Select valid date/FY |
| `PERMISSION_DENIED` | 403 | User lacks permission | Request permission |

---

## Summary

**Phase 1** provides the foundational accounting engine that all operational modules (Phase 2) depend on. It enforces double-entry discipline, period control, and GL integrity, ensuring that the financial backbone remains solid and auditable. All subsequent transaction types (payments, transfers, etc.) use Phase 1 to safely record their GL impact.

**Key Deliverables**:
- ✅ Centralized journal entry management
- ✅ Double-entry validation (debit = credit)
- ✅ Period-based posting control
- ✅ GL balance calculation from posted entries
- ✅ Audit trail (who, when, what, why)
- ✅ Immutable posted entries (reversals for corrections)
- ✅ Foundation for Phase 2 operations
