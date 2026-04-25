# Phase 0: Opening Balance (One-Time Setup)

> **Module:** Finance / Cash & Bank  
> **Phase:** 0 - Foundation Setup  
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
6. [User Journey](#user-journey)
7. [Frontend Components](#frontend-components)
8. [API Reference](#api-reference)
9. [Database Schema](#database-schema)
10. [Business Rules](#business-rules)
11. [Use Case by Role](#use-case-by-role)
12. [Testing Checklist](#testing-checklist)
13. [Exception Handling](#exception-handling)
14. [Integration Points](#integration-points)

---

## Overview

**Phase 0** is a **one-time setup phase** per company and fiscal year where a Finance Manager establishes the opening balance (initial saldo) for all Chart of Accounts (COA) at the start of a fiscal year.

### Purpose
- Set the baseline saldo awal for all accounts (balance sheet + P&L accounts)
- Create the foundational journal entry (Opening Balance Journal) that becomes the starting point for all subsequent transactions
- Ensure the system has an authoritative opening position before daily operations begin

### Key Principle
**Opening Balance is immutable and posted only once per company-fiscal year combination.** After posting, changes are made through reversal/correction entries, not by re-posting opening balance.

### Key Features

| Feature | Description | Role | Permission |
|---------|-------------|------|------------|
| **Create Opening Balance** | Select company and fiscal year, input account lines with debit/credit | Finance Manager | `opening_balance.write` |
| **Simulate Balance** | Run validation to check if lines are balanced (debit = credit) | Finance Manager | `opening_balance.write` |
| **Post Opening Balance** | Finalize and post opening balance as a locked journal | Finance Manager | `opening_balance.post` |
| **View Opening Balance Summary** | See current opening balance status, posted journal ref, and totals | Finance Manager | `opening_balance.read` |
| **View Posted Journal** | Navigate to posted Opening Balance journal entry in GL | Finance Manager | `journal.read` |
| **Lock Opening Balance Period** | Prevent further modifications after posting | System | (Automatic) |

---

## System Architecture

### Backend Structure (Go/Gin)

```
internal/finance/
├── opening_balance/
│   ├── data/
│   │   ├── models/
│   │   │   ├── opening_balance.go       # Main opening balance record
│   │   │   └── opening_balance_line.go  # Detail lines (account + debit/credit)
│   │   └── repositories/
│   │       ├── opening_balance_repository.go
│   │       └── opening_balance_line_repository.go
│   ├── domain/
│   │   ├── dto/
│   │   │   ├── opening_balance_dto.go
│   │   │   ├── opening_balance_line_dto.go
│   │   │   └── opening_balance_simulation_dto.go
│   │   ├── mapper/
│   │   │   ├── opening_balance_mapper.go
│   │   │   └── opening_balance_line_mapper.go
│   │   └── usecase/
│   │       └── opening_balance_usecase.go  # All business logic
│   └── presentation/
│       ├── handler/
│       │   └── opening_balance_handler.go
│       └── router/
│           └── opening_balance_routers.go
├── journal/                            # Shared GL posting engine
│   └── domain/usecase/journal_usecase.go
└── coa/                                 # Chart of Accounts
```

### Frontend Structure (Next.js + React)

```
src/features/finance/opening-balance/
├── types/
│   └── index.d.ts                      # TypeScript interfaces for OB
├── schemas/
│   └── opening-balance.schema.ts        # Zod validation schemas
├── services/
│   └── opening-balance-service.ts       # API calls
├── hooks/
│   └── use-finance-settings.ts          # TanStack Query hooks
├── components/
│   ├── opening-balance-wizard.tsx       # Main OB wizard (2-step)
│   ├── opening-balance-form.tsx         # Form component (Step 1)
│   └── opening-balance-summary.tsx      # Summary (Step 2)
├── i18n/
│   ├── en.ts
│   └── id.ts
└── constants.ts
```

### User Flow Diagram

```
Finance Manager
     │
     ├─→ Navigate to /finance/settings → Opening Balance
     │
     ├─→ Select Company + Fiscal Year
     │
     ├─→ Click "Create Opening Balance"
     │
     ├─→ [WIZARD STEP 1] Input Lines
     │   ├─ Select Account (from COA tree)
     │   ├─ Enter Debit amount
     │   ├─ Enter Credit amount
     │   ├─ Add Description
     │   └─ Add more lines or Next
     │
     ├─→ [WIZARD STEP 2] Review + Simulate
     │   ├─ System runs simulation
     │   ├─ Show totals: Debit, Credit, Difference
     │   ├─ If balanced: Show "Balanced ✓"
     │   ├─ If not balanced: Show warning "Unbalanced ✗"
     │   └─ User can Go Back or Post
     │
     └─→ Click "Post"
         ├─ Validate: balanced, permission, period open
         ├─ Create Journal Entry (type: OPENING_BALANCE)
         ├─ Create Journal Lines (one per OB line)
         ├─ Mark Journal as Posted
         ├─ Update Opening Balance status → POSTED
         ├─ Store Posted Journal Reference
         └─ Confirm to user: "Posted successfully. Journal #XXXXXX"
```

---

## Data Models

### OpeningBalance Model

```sql
CREATE TABLE opening_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    fiscal_year_id UUID NOT NULL REFERENCES fiscal_years(id),
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',  -- DRAFT, POSTED
    posted_journal_id UUID UNIQUE REFERENCES journals(id),  -- After posting
    total_debit DECIMAL(15, 2) NOT NULL DEFAULT 0,
    total_credit DECIMAL(15, 2) NOT NULL DEFAULT 0,
    is_balanced BOOLEAN NOT NULL DEFAULT false,
    posted_at TIMESTAMPTZ,
    posted_by UUID REFERENCES employees(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(company_id, fiscal_year_id)  -- Only one per company-FY
);

Index: (company_id, fiscal_year_id)
Index: (status, fiscal_year_id)
```

### OpeningBalanceLine Model

```sql
CREATE TABLE opening_balance_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opening_balance_id UUID NOT NULL REFERENCES opening_balances(id),
    account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
    debit_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    credit_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

Index: (opening_balance_id)
Index: (account_id)
```

### Go Model Example

```go
type OpeningBalance struct {
    ID              string    `gorm:"type:uuid;primaryKey"`
    CompanyID       string    `gorm:"type:uuid;not null;index:,type:btree;uniqueIndex:,type:btree"`
    FiscalYearID    string    `gorm:"type:uuid;not null;uniqueIndex:,type:btree"`
    Status          string    `gorm:"type:varchar(20);index:,type:btree"` // DRAFT, POSTED
    PostedJournalID *string   `gorm:"type:uuid;uniqueIndex:idx_posted_journal"`
    TotalDebit      decimal.Decimal `gorm:"type:numeric(15,2)"`
    TotalCredit     decimal.Decimal `gorm:"type:numeric(15,2)"`
    IsBalanced      bool
    PostedAt        *time.Time
    PostedBy        *string    `gorm:"type:uuid"`
    CreatedAt       time.Time  `gorm:"autoCreateTime:milli"`
    UpdatedAt       time.Time  `gorm:"autoUpdateTime:milli"`
    
    // Relationships
    Company         Company
    FiscalYear      FiscalYear
    Lines           []OpeningBalanceLine `gorm:"foreignKey:OpeningBalanceID;constraint:OnDelete:CASCADE"`
}

type OpeningBalanceLine struct {
    ID                 string          `gorm:"type:uuid;primaryKey"`
    OpeningBalanceID   string          `gorm:"type:uuid;not null;index:,type:btree"`
    AccountID          string          `gorm:"type:uuid;not null;index:,type:btree"`
    DebitAmount        decimal.Decimal `gorm:"type:numeric(15,2)"`
    CreditAmount       decimal.Decimal `gorm:"type:numeric(15,2)"`
    Description        *string
    CreatedAt          time.Time       `gorm:"autoCreateTime:milli"`
    UpdatedAt          time.Time       `gorm:"autoUpdateTime:milli"`
    
    // Relationships
    Account            ChartOfAccount
}
```

---

## Business Logic

### 1. Opening Balance Creation Flow

**Input Validation**
```
1. Validate company_id exists and is active
2. Validate fiscal_year_id exists and belongs to company
3. Validate lines array:
   - At least 1 line required
   - Each line must have account_id (from active COA)
   - Debit amount >= 0, Credit amount >= 0
   - Cannot have both debit AND credit > 0 in same line
   - Description is optional (max 500 chars)
4. Validate fiscal year status is OPEN
   - Cannot create OB for CLOSED fiscal year
   - Cannot create OB for period already has POSTED opening balance

Constraint:
  UNIQUE(company_id, fiscal_year_id) ensures only 1 per combination
```

### 2. Simulation Logic

**Purpose**: Validate balance without posting to GL

```go
SimulateOpeningBalance(companyID, fiscalYearID, lines) → SimulationResult {
  
  // Calculate totals
  totalDebit := 0
  totalCredit := 0
  
  for each line {
    Validate account exists and is (active && postable)
    totalDebit += line.debit_amount
    totalCredit += line.credit_amount
  }
  
  // Check balance
  isBalanced := (totalDebit - totalCredit) < 0.005  // tolerance for decimals
  
  // Line-level validation
  lineResults := []
  for each line {
    // Check if account already has balance in this OB
    duplicateCheck := true  // warn if same account appears twice
    
    lineResults.append({
      account_id: line.account_id,
      status: "VALID" | "DUPLICATE_ACCOUNT" | "ACCOUNT_NOT_POSTABLE",
      action: "ACCEPT" | "REVIEW" | "REJECT"
    })
  }
  
  // Simulation result
  return {
    total_debit: totalDebit,
    total_credit: totalCredit,
    difference: totalDebit - totalCredit,
    is_balanced: isBalanced,
    valuation_status: isBalanced ? "BALANCED" : "UNBALANCED",
    lines: lineResults,
    recommendation: isBalanced ? "Ready to post" : "Adjust lines to balance"
  }
}
```

### 3. Post Opening Balance Logic

**Preconditions**
```
1. Simulate passed with isBalanced = true
2. User has opening_balance.post permission
3. Company is active
4. Fiscal year status is OPEN
5. No existing POSTED opening balance for this company+FY
6. User is authenticated
```

**Posting Flow**
```go
PostOpeningBalance(companyID, fiscalYearID, lines, userID) → PostingResult {
  
  // 1. Validate preconditions
  if !Simulate(lines).isBalanced {
    return Error("NOT_BALANCED")
  }
  
  if FiscalYear.status != "OPEN" {
    return Error("PERIOD_CLOSED")
  }
  
  if OpeningBalance.exists(companyID, fiscalYearID, status=POSTED) {
    return Error("ALREADY_POSTED")
  }
  
  // 2. Create Opening Balance record
  ob := CreateOpeningBalance {
    company_id: companyID,
    fiscal_year_id: fiscalYearID,
    status: "DRAFT",  // Will update to POSTED after journal
    total_debit: SUM(lines.debit_amount),
    total_credit: SUM(lines.credit_amount),
    is_balanced: true
  }
  
  // Save OB (status = DRAFT)
  ob.Save()
  
  // 3. Save all lines
  for each line {
    obLine := OpeningBalanceLine {
      opening_balance_id: ob.id,
      account_id: line.account_id,
      debit_amount: line.debit_amount,
      credit_amount: line.credit_amount,
      description: line.description
    }
    obLine.Save()
  }
  
  // 4. Create Journal Entry (type = OPENING_BALANCE)
  journal := Journal {
    company_id: companyID,
    fiscal_year_id: fiscalYearID,
    journal_date: FiscalYear.start_date,  // First day of year
    journal_type: "OPENING_BALANCE",
    description: "Opening Balance - " + FiscalYear.name,
    reference: "OB-" + companyID.substring(0,8) + "-" + FY.year,
    status: "DRAFT",  // Will be POSTED
    created_by: userID
  }
  
  journal.Save()
  
  // 5. Create Journal Lines (one per OB line)
  for each ob.line {
    journalLine := JournalLine {
      journal_id: journal.id,
      account_id: ob.line.account_id,
      debit_amount: ob.line.debit_amount,
      credit_amount: ob.line.credit_amount,
      description: ob.line.description
    }
    journalLine.Save()
  }
  
  // 6. Post the journal
  journal.status = "POSTED"
  journal.posted_at = NOW()
  journal.Save()
  
  // 7. Update OB with journal reference
  ob.posted_journal_id = journal.id
  ob.status = "POSTED"
  ob.posted_at = NOW()
  ob.posted_by = userID
  ob.Save()
  
  // 8. Invalidate GL balance cache (if using Redis)
  cache.Invalidate("gl_balance:" + companyID + ":*")
  
  return {
    success: true,
    opening_balance_id: ob.id,
    posted_journal_id: journal.id,
    message: "Opening balance posted successfully. Journal #" + journal.reference
  }
}
```

### 4. Balance Calculation Formula

**GL Balance at Any Point**
```
For a given COA account_id, company_id, fiscal_year_id, and up_to_date:

balance = 
  (Opening Balance + sum of all POSTED journal lines 
   where account_id matches AND posting_date <= up_to_date)

Specifically:

Debit-type accounts (Assets, Expenses):
  balance = opening_balance_debit - opening_balance_credit +
            sum(journal_lines.debit) - sum(journal_lines.credit)
            where journal.status = POSTED 
            and journal.posting_date <= reference_date

Credit-type accounts (Liabilities, Equity, Income):
  balance = opening_balance_credit - opening_balance_debit +
            sum(journal_lines.credit) - sum(journal_lines.debit)
            where journal.status = POSTED 
            and journal.posting_date <= reference_date
```

**Tolerance for Decimal Rounding**
```
When comparing debit vs credit for balance check:

difference = abs(totalDebit - totalCredit)
isBalanced = difference < 0.005  // 0.5 cents tolerance for rounding

This prevents floating-point errors from rejecting valid entries.
```

---

## User Journey

### Happy Path: Create and Post Opening Balance

**Precondition**: User is logged in, has `opening_balance.write` AND `opening_balance.post` permissions

**Step-by-Step**

```
1. User navigates to /finance/settings
   - See "Opening Balance" section
   - Show 2 company/FY selectors (dropdown)
   - Show "Create Opening Balance" button

2. Select Company and Fiscal Year
   - Click Company dropdown → select "PT GILABS"
   - Click Fiscal Year dropdown → select "2026"
   - Button "Create Opening Balance" becomes enabled
   - Show placeholder summary: "No opening balance posted yet" OR "Already posted on 2024-01-01"

3. Click "Create Opening Balance"
   - Modal opens: "Opening Balance Wizard"
   - Step 1 of 2: "Input Lines"
   - See empty table with columns:
     * Account (select dropdown)
     * Debit (text input, number)
     * Credit (text input, number)
     * Description (text input)
     * Action (Remove button)
   - Button: "Add Line"
   - Bottom: Show running totals "Difference: 0.00"

4. Add First Account Line (e.g., Bank Cash)
   - Click "Add Line" → new row appears
   - Click Account dropdown → opens COA tree filter
   - Search/select "1010 - Bank: PT GILABS Cash"
   - Enter Debit: 50,000,000
   - Enter Credit: 0
   - Leave Description blank
   - Bottom shows: "Difference: 50,000,000.00"

5. Add Second Account Line (e.g., Bank Account)
   - Click "Add Line" → another row
   - Select "1020 - Bank: PT GILABS Current Account"
   - Enter Debit: 100,000,000
   - Enter Credit: 0
   - Description: "Opening from Bank Mandiri"
   - Totals update: "Debit: 150,000,000 | Credit: 0 | Difference: 150,000,000.00"

6. Add Equity Line to Balance
   - Click "Add Line"
   - Select "3010 - Equity: Paid-in Capital"
   - Enter Debit: 0
   - Enter Credit: 150,000,000
   - Description: "Initial investment"
   - Totals update: "Debit: 150,000,000 | Credit: 150,000,000 | Difference: 0.00"
   - UI shows: "✓ Balanced"

7. Review Final Lines
   - See 3 lines in table with all values
   - Validate visually that entries look correct
   - Can edit amounts or click "Remove" if needed

8. Click "Next" to Step 2
   - Modal updates: "Step 2 of 2: Summary & Simulation"
   - See gray box: "Running simulation..." (spinner)
   - After 1-2 seconds, simulation completes
   - Show results:
     * Total Debit: 150,000,000.00
     * Total Credit: 150,000,000.00
     * Difference: 0.00 (Green text: "✓ Balanced")
     * Valuation Status: VALID
     * Recommendation: "Ready to post"
   - See summary table showing all lines again with calculated fields:
     * Account Code | Account Name | Debit | Credit | Status | Action

9. Click "Post"
   - Show loading spinner: "Posting opening balance..."
   - Backend validates, creates journal, posts
   - On success:
     * Modal closes
     * Toast notification: "✓ Opening balance posted successfully. Journal #OB-12345678-2026"
     * Summary card updates: "Already posted on 2026-01-01 | Posted Journal: OB-12345678-2026"
     * "Create Opening Balance" button becomes disabled
     * User can click "View Journal" to navigate to journal detail

**End State**
- Opening Balance: POSTED
- Journal Entry created and POSTED in GL
- All lines in GL ready to use as baseline for Phase 1-2 operations
- User cannot re-post for this company+FY combination

---

### Exception Path 1: Unbalanced Entry

**Scenario**: User tries to post without balancing

```
1. User completes Steps 1-7 with unbalanced lines:
   - Debit: 150,000,000 | Credit: 100,000,000 | Difference: 50,000,000

2. Click "Next"
   - Simulation runs
   - Shows: "Difference: 50,000,000.00" (Red text: "✗ Unbalanced")
   - Valuation Status: UNBALANCED
   - Recommendation: "Adjust lines to balance before posting"

3. User clicks "Post"
   - Button disabled (grayed out) because isBalanced = false
   - Tooltip shows: "Must be balanced to post"
   - OR if somehow POST is clicked, API returns:
     ```json
     {
       "success": false,
       "error": "NOT_BALANCED",
       "message": "Opening balance must be balanced. Debit: 150M, Credit: 100M"
     }
     ```

4. User clicks "Back"
   - Returns to Step 1
   - Can add/edit lines to balance

5. Add missing line or adjust
   - Add line: "3010 - Equity" / Debit: 0 / Credit: 50,000,000
   - Difference now: 0.00 (Balanced ✓)

6. Click "Next" again
   - Simulation passes
   - Post succeeds
```

---

### Exception Path 2: Fiscal Year Already Closed

**Scenario**: User tries to post OB for closed FY

```
1. User selects Fiscal Year "2025" (status = CLOSED)
2. Click "Create Opening Balance"
   - Modal opens, but after clicking "Post" in Step 2:
   
   Backend returns error:
   ```json
   {
     "success": false,
     "error": "PERIOD_CLOSED",
     "message": "Cannot post to closed fiscal year 2025. Open a new fiscal year first."
   }
   ```

3. Toast notification: "✗ Cannot post. Fiscal year is closed."
4. User must select a different FY (must be OPEN status)
```

---

### Exception Path 3: Opening Balance Already Posted

**Scenario**: User tries to create/post again for same company+FY

```
1. User has already posted OB for PT GILABS / 2026
2. Summary shows: "Posted on 2026-01-01 | Journal: OB-xxx"
3. Click "Create Opening Balance"
   - Button may be disabled OR
   - If clicked, API returns:
   ```json
   {
     "success": false,
     "error": "ALREADY_POSTED",
     "message": "Opening balance for PT GILABS (2026) already posted. Cannot create duplicate."
   }
   ```

4. To modify: User must use reversal/correction entry (not in Phase 0 scope)
```

---

## Frontend Components

### Component Tree

```
/finance/settings/
├── SettingsPage (main layout)
│   └── Card: "Finance Settings"
│       ├── Tabs: [Opening Balance, Fiscal Year, COA, ...]
│       └── Tab Content: Opening Balance
│           └── OpeningBalanceWizard (modal component)
│               ├── OpeningBalanceForm (Step 1)
│               │   ├── CompanySelect
│               │   ├── FiscalYearSelect
│               │   ├── OpeningBalanceTable
│               │   │   ├── AccountSelectCell
│               │   │   ├── NumberInputCell (Debit)
│               │   │   ├── NumberInputCell (Credit)
│               │   │   ├── TextInputCell (Description)
│               │   │   └── RemoveButtonCell
│               │   ├── Button: "Add Line"
│               │   └── Button: "Next"
│               └── OpeningBalanceSummary (Step 2)
│                   ├── SimulationResult (display)
│                   ├── SummaryTable
│                   ├── Button: "Back"
│                   └── Button: "Post" (conditional)
```

### Component Details

#### 1. OpeningBalanceWizard.tsx

**Props**: None (modal-based, uses hooks)

**State Management** (Zustand + TanStack Query)
- `step`: 1 | 2
- `companyId`: string
- `fiscalYearId`: string
- `lines`: OpeningBalanceLineInput[]
- `isDraftDirty`: boolean

**Features**
- Auto-save draft to localStorage every 1.5s
- Restore draft on page load
- Two-step wizard modal
- Simulate before post
- Permission-based rendering

#### 2. OpeningBalanceForm.tsx (Step 1)

**Props**
```typescript
interface Props {
  companyId: string;
  fiscalYearId: string;
  lines: OpeningBalanceLineInput[];
  accounts: ChartOfAccount[];
  onNext: () => void;
  onBack: () => void;
  onAddLine: () => void;
  onRemoveLine: (index: number) => void;
  onUpdateLine: (index: number, patch: Partial<OpeningBalanceLineInput>) => void;
  totals: { debit: number; credit: number; difference: number; balanced: boolean };
}
```

**Rendered Elements**
- Company selector (disabled, showing selected)
- Fiscal Year selector (disabled, showing selected)
- Editable table (3 columns + action)
- Account dropdown with COA tree search
- Number inputs (Debit/Credit)
- Text input (Description)
- Running totals footer
- Action buttons: Add Line, Next

#### 3. OpeningBalanceSummary.tsx (Step 2)

**Props**
```typescript
interface Props {
  companyId: string;
  fiscalYearId: string;
  simulation: SimulationResult | null;
  lines: OpeningBalanceLineInput[];
  isLoading: boolean;
  totals: { debit: number; credit: number; difference: number; balanced: boolean };
  onPost: () => void;
  onBack: () => void;
  isPosting: boolean;
}
```

**Rendered Elements**
- Simulation result box (spinner while loading)
- Summary metrics (Debit, Credit, Difference, Status)
- Summary table (read-only, showing all lines)
- Action buttons: Back, Post (conditional disable)
- Toast notifications (success/error)

---

## API Reference

### 1. Get Form Data

```http
GET /api/v1/finance/settings/opening-balance/form-data
```

**Permission**: `opening_balance.read`

**Response**
```json
{
  "success": true,
  "data": {
    "companies": [
      { "id": "uuid", "name": "PT GILABS", "code": "GIL" }
    ],
    "fiscal_years": [
      { "id": "uuid", "name": "2026", "year": 2026, "status": "OPEN", "start_date": "2026-01-01" }
    ]
  }
}
```

---

### 2. Get Opening Balance Record

```http
GET /api/v1/finance/opening-balance/:id
```

**Permission**: `opening_balance.read`

**Response**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "company_id": "uuid",
    "fiscal_year_id": "uuid",
    "status": "POSTED",
    "posted_journal_id": "uuid",
    "total_debit": 150000000.00,
    "total_credit": 150000000.00,
    "is_balanced": true,
    "posted_at": "2026-01-01T00:00:00+07:00",
    "posted_by": "uuid",
    "lines": [
      {
        "id": "uuid",
        "account_id": "uuid",
        "account_code": "1010",
        "account_name": "Bank Cash",
        "debit_amount": 50000000.00,
        "credit_amount": 0.00,
        "description": null
      }
    ]
  }
}
```

---

### 3. Get Opening Balance Summary

```http
GET /api/v1/finance/opening-balance/summary?company_id=uuid&fiscal_year_id=uuid
```

**Permission**: `opening_balance.read`

**Response**
```json
{
  "success": true,
  "data": {
    "company_id": "uuid",
    "fiscal_year_id": "uuid",
    "has_opening_balance": true,
    "status": "POSTED",
    "posted_journal_id": "uuid",
    "posted_date": "2026-01-01",
    "is_posted": true,
    "total_debit": 150000000.00,
    "total_credit": 150000000.00
  }
}
```

---

### 4. Simulate Opening Balance

```http
POST /api/v1/finance/opening-balance/simulate
Content-Type: application/json

{
  "company_id": "uuid",
  "fiscal_year_id": "uuid",
  "lines": [
    {
      "account_id": "uuid",
      "debit_amount": 50000000.00,
      "credit_amount": 0.00,
      "description": null
    }
  ]
}
```

**Permission**: `opening_balance.write`

**Response**
```json
{
  "success": true,
  "data": {
    "total_debit": 150000000.00,
    "total_credit": 150000000.00,
    "difference": 0.00,
    "is_balanced": true,
    "valuation_status": "VALID",
    "recommendation": "Ready to post",
    "lines": [
      {
        "account_id": "uuid",
        "account_code": "1010",
        "account_name": "Bank Cash",
        "debit_amount": 50000000.00,
        "credit_amount": 0.00,
        "status": "VALID",
        "action": "ACCEPT"
      }
    ]
  }
}
```

---

### 5. Upsert (Save Draft) Opening Balance

```http
POST /api/v1/finance/opening-balance/draft
Content-Type: application/json

{
  "company_id": "uuid",
  "fiscal_year_id": "uuid",
  "lines": [
    {
      "account_id": "uuid",
      "debit_amount": 50000000.00,
      "credit_amount": 0.00,
      "description": "Opening balance"
    }
  ]
}
```

**Permission**: `opening_balance.write`

**Response**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "DRAFT",
    "saved_at": "2026-01-15T10:30:45+07:00"
  }
}
```

---

### 6. Post Opening Balance

```http
POST /api/v1/finance/opening-balance/post
Content-Type: application/json

{
  "company_id": "uuid",
  "fiscal_year_id": "uuid"
}
```

**Permission**: `opening_balance.post`

**Preconditions**
- Simulate must pass (isBalanced = true)
- Company must be active
- Fiscal year must have status = OPEN
- No existing POSTED opening balance for company+FY

**Response (Success)**
```json
{
  "success": true,
  "data": {
    "opening_balance_id": "uuid",
    "posted_journal_id": "uuid",
    "posted_at": "2026-01-01T00:00:00+07:00",
    "message": "Opening balance posted successfully. Journal #OB-12345678-2026"
  }
}
```

**Response (Error - Not Balanced)**
```json
{
  "success": false,
  "error": "NOT_BALANCED",
  "message": "Opening balance must be balanced. Debit: 150M, Credit: 100M. Difference: 50M"
}
```

**Response (Error - Period Closed)**
```json
{
  "success": false,
  "error": "PERIOD_CLOSED",
  "message": "Cannot post to closed fiscal year. Update fiscal year status to OPEN first."
}
```

**Response (Error - Already Posted)**
```json
{
  "success": false,
  "error": "ALREADY_POSTED",
  "message": "Opening balance already posted for PT GILABS (2026) on 2026-01-01."
}
```

---

## Database Schema

### Key Queries

**Find latest opening balance for company+FY**
```sql
SELECT * FROM opening_balances
WHERE company_id = $1 AND fiscal_year_id = $2
ORDER BY created_at DESC
LIMIT 1;
```

**Check if opening balance posted for company+FY**
```sql
SELECT EXISTS(
  SELECT 1 FROM opening_balances
  WHERE company_id = $1 AND fiscal_year_id = $2 AND status = 'POSTED'
);
```

**Get opening balance lines with account info**
```sql
SELECT 
  obl.*,
  coa.code as account_code,
  coa.name as account_name
FROM opening_balance_lines obl
JOIN chart_of_accounts coa ON obl.account_id = coa.id
WHERE obl.opening_balance_id = $1
ORDER BY coa.code;
```

---

## Business Rules

### Core Rules (Non-Negotiable)

| Rule | Rationale | Enforcement |
|------|-----------|------------|
| **One OB per Company+FY** | Ensures single source of truth for opening position; prevents confusion from multiple baselines | DB UNIQUE constraint + API validation |
| **Must be Balanced** | Accounting fundamental: debit = credit always; prevents invalid baseline | Simulation validation before posting |
| **Posted is Immutable** | Maintains audit trail; changes made via reversal entry, not OB edit | No UPDATE after posted; only soft-delete allowed with reason |
| **Only in Open Period** | Prevents accidental re-posting for closed year; requires deliberate reopen | FiscalYear.status check before post |
| **All lines must be postable accounts** | Ensures GL impact is meaningful (e.g., cannot post to header/summary accounts) | Account COA.is_postable = true validation |
| **No account duplication in same OB** | Prevents confusion; user should combine into one line | Check during simulation |
| **Non-negative amounts** | Prevents double-entry logic errors (cannot have negative debit/credit in same line) | Input validation: debit >= 0, credit >= 0 |

---

## Use Case by Role

### Finance Manager
| Action | Permission | Frequency | Context |
|--------|------------|-----------|---------|
| **View OB Summary** | `opening_balance.read` | Daily | Monitor if OB posted for active FYs |
| **Create OB Wizard** | `opening_balance.write` | Once per FY per company | Set up opening position at FY start |
| **Simulate OB** | `opening_balance.write` | Multiple times | Test entries before posting |
| **Post OB** | `opening_balance.post` | Once per FY per company | Finalize opening position |
| **View Posted Journal** | `journal.read` | As needed | Audit trail to journal detail |
| **Export OB Report** | `opening_balance.read` | Monthly | Compliance/archive |

---

## Testing Checklist

### Functional Testing

#### TC-OB-001: Create OB with Single Line
```
Precondition: User logged in, company active, FY open
1. Navigate to Opening Balance wizard
2. Select Company: PT GILABS, FY: 2026
3. Add 1 line: Account 1010, Debit: 100M, Credit: 0, Description: "Test"
4. Click Next
5. Simulate runs successfully
6. Click Post
Expected: OB posted, journal created, success message shown
```

#### TC-OB-002: Create OB with Multiple Lines (Balanced)
```
Precondition: Same as TC-OB-001
1. Add 3 lines:
   - 1010: Debit 50M, Credit 0
   - 1020: Debit 75M, Credit 0
   - 3010: Debit 0, Credit 125M
2. Verify diff = 0
3. Post
Expected: Success
```

#### TC-OB-003: Create OB Unbalanced (Rejected)
```
Precondition: Same
1. Add 2 lines:
   - 1010: Debit 100M, Credit 0
   - 3010: Debit 0, Credit 75M
2. Click Next → Simulate shows diff 25M, unbalanced
3. Try to Post
Expected: Post button disabled or API rejects with NOT_BALANCED
```

#### TC-OB-004: Duplicate OB Attempt (Rejected)
```
Precondition: OB already posted for PT GILABS/2026
1. Select same Company/FY
2. Try Create Opening Balance
Expected: Error "ALREADY_POSTED" or button disabled
```

#### TC-OB-005: Closed FY Attempt (Rejected)
```
Precondition: FY status = CLOSED
1. Select closed FY
2. Try Post
Expected: Error "PERIOD_CLOSED"
```

#### TC-OB-006: Missing Permissions (Rejected)
```
Precondition: User has `opening_balance.read` but NOT `opening_balance.write`
1. Try Create → button should be hidden or disabled
Expected: No access to create
```

#### TC-OB-007: Draft Auto-Save
```
Precondition: User on Step 1 form
1. Enter values and wait > 1.5s (auto-save timer)
2. Refresh page
Expected: Values restored from localStorage or draft API
```

#### TC-OB-008: View Summary After Post
```
Precondition: OB posted
1. Select Company/FY
2. View summary card
Expected: Show "Posted on [date]" and journal reference
```

---

### UI/UX Testing

#### TC-OB-UI-001: Modal Behavior
```
1. Open wizard → Step 1 displays
2. Click Next → Step 2 displays
3. Click Back → Step 1 displays
4. Click Cancel → Modal closes
5. Re-open → Should show draft (if unsaved)
Expected: All transitions smooth, draft persists
```

#### TC-OB-UI-002: Form Validation Feedback
```
1. Try Post with unbalanced → Red difference displayed
2. Try Add with no account selected → Error message
3. Try Add with negative amount → Blocked
Expected: Clear validation messages
```

#### TC-OB-UI-003: Loading States
```
1. Click Post → Spinner shown, button disabled
2. Simulate taking > 2s → Show "Running simulation..."
Expected: UX clear about pending operations
```

---

### API Testing

#### TC-OB-API-001: Simulate Endpoint
```
POST /api/v1/finance/opening-balance/simulate
Payload: 
{
  "company_id": "valid-uuid",
  "fiscal_year_id": "valid-uuid",
  "lines": [
    { "account_id": "valid-uuid", "debit_amount": 100, "credit_amount": 0 }
  ]
}
Expected: 200 OK, isBalanced varies based on totals
```

#### TC-OB-API-002: Post Endpoint - Happy Path
```
POST /api/v1/finance/opening-balance/post
Precondition: Simulate passed, no prior OB
Expected: 200 OK, posted_journal_id returned
```

#### TC-OB-API-003: Post Endpoint - Already Posted
```
POST /api/v1/finance/opening-balance/post
Precondition: OB already posted
Expected: 409 CONFLICT or 400 BAD_REQUEST, error: ALREADY_POSTED
```

---

### Integration Testing

#### TC-OB-INT-001: Journal GL Integration
```
1. Post OB with lines
2. Query GL balance for posted journal
3. Query GL balance via journal detail page
Expected: Balances match OB totals, journal appears in GL module
```

#### TC-OB-INT-002: COA Tree Integration
```
1. Create OB using COA account selection
2. Verify selected accounts are active and postable
Expected: Only valid accounts available for selection
```

#### TC-OB-INT-003: Fiscal Year Integration
```
1. Try OB for FY with status != OPEN
Expected: Rejected appropriately
```

---

## Exception Handling

### API Error Codes

| Error Code | HTTP Status | Message | Recovery |
|------------|------------|---------|----------|
| `NOT_BALANCED` | 400 | Opening balance not balanced | Adjust amounts in Step 1 |
| `PERIOD_CLOSED` | 400 | Fiscal year is closed | Request fiscal year reopen or use different year |
| `ALREADY_POSTED` | 409 | Opening balance already posted | View existing or contact admin for reversal |
| `PERMISSION_DENIED` | 403 | User lacks opening_balance.post permission | Request permission grant from admin |
| `ACCOUNT_NOT_POSTABLE` | 400 | Selected account cannot accept postings | Choose different account from COA |
| `ACCOUNT_NOT_FOUND` | 404 | Account ID invalid or inactive | Refresh account list |
| `COMPANY_NOT_FOUND` | 404 | Company ID invalid or inactive | Select active company |
| `FISCAL_YEAR_NOT_FOUND` | 404 | Fiscal year not found | Create fiscal year first |
| `SIMULATION_FAILED` | 500 | Unexpected error during simulation | Retry; contact support |
| `POSTING_FAILED` | 500 | Unexpected error during posting | Retry; check system logs |

---

## Integration Points

### Upstream Dependencies
- **Chart of Accounts (COA)**: Account selection, validation of postable status
- **Fiscal Year Module**: FY selection, period status validation
- **Company Module**: Company selection, active status check
- **User/Permission Module**: Permission check (`opening_balance.read/write/post`)

### Downstream Dependencies
- **General Ledger (GL) Module**: Posting journal, balance calculation
- **Journal Module**: Journal creation, posting status
- **Reporting Module**: OB values in trial balance, P&L, balance sheet

---

## Summary

**Phase 0** establishes the baseline accounting position through a structured, one-time opening balance setup per company and fiscal year. The wizard guides users through input validation, simulation, and posting, ensuring data integrity while maintaining an immutable audit trail. All subsequent operational transactions (Phase 1-2) build upon this foundation.

**Key Deliverables**:
- ✅ Balanced opening position in GL
- ✅ Posted journal entry (searchable, auditable)
- ✅ Database record tracking status and journal reference
- ✅ Prevention of duplicate or out-of-period postings
- ✅ Foundation for Phase 1-2 accounting workflows
