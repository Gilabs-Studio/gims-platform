# 💰 GIMS Platform: Cash & Bank Module
## Comprehensive Development & Implementation Guide

---

## 📋 Table of Contents

### **Phase Overview**
- [Phase 0: Opening Balance](#phase-0-opening-balance) - One-time setup per fiscal year
- [Phase 1: Journal Engine](#phase-1-journal-engine) - Core accounting infrastructure
- [Phase 2: Operations](#phase-2-operations) - Daily cash, transfers, reconciliation
- [Phase 3: Adjustment & Closing](#phase-3-adjustment--closing) - Approval governance and period-end closing

### **For Developers**
- [Architecture at a Glance](#architecture-at-a-glance)
- [Data Models Overview](#data-models-overview)
- [API Summary](#api-summary)
- [Key Business Logic](#key-business-logic)

### **For QA/Testing**
- [Test Strategy Matrix](#test-strategy-matrix)
- [User Journey Map](#user-journey-map)

### **Reference Documents**
| Document | Purpose | Audience |
|----------|---------|----------|
| `phase-0-opening-balance.md` | Complete Phase 0 reference | Developers, QA |
| `phase-1-journal-engine.md` | GL posting infrastructure | Developers, Architects |
| `phase-2-operations.md` | Operations workflows | Developers, QA |
| `phase-3-adjustment-closing.md` | Adjustment approval and financial closing workflows | Developers, QA, Finance Manager |
| `CASH_BANK_MASTER.md` | End-to-end architecture | All stakeholders |

---

## 🎯 The Big Picture

### What We're Building

A **comprehensive cash & bank management system** that ensures financial data accuracy through:

```
┌─────────────────────────────────────────────┐
│ Phase 0: OPENING BALANCE                    │
│ └─ Establish baseline (one-time per FY)     │
├─────────────────────────────────────────────┤
│ Phase 1: JOURNAL ENGINE                     │
│ └─ GL posting infrastructure (debit=credit) │
├─────────────────────────────────────────────┤
│ Phase 2: DAILY OPERATIONS                   │
│ ├─ Payments In/Out                          │
│ ├─ Bank Transfers                           │
│ └─ Bank Reconciliation                      │
├─────────────────────────────────────────────┤
│ Phase 3: ADJUSTMENT & CLOSING               │
│ ├─ Adjustment approval workflow             │
│ ├─ Approval history + templates             │
│ └─ Financial closing wizard + year-end      │
└─────────────────────────────────────────────┘
```

---

## Phase 3: Adjustment & Closing

### 🎯 Purpose
Add governance controls for adjustment journals and period-end financial closing.

### ⚡ Quick Facts

| Aspect | Detail |
|--------|--------|
| **Scope** | Adjustment workflow + Financial Closing |
| **Users** | Finance Staff, Approver, Finance Manager |
| **Core Controls** | Submit approval, approve/reject, history timeline, closing analysis |
| **UI Enhancement** | 4-step Closing Wizard (Pre-check → Review → Execute → Complete) |
| **Related Doc** | `phase-3-adjustment-closing.md` |

### 🛠 Key Endpoints

```
PATCH  /api/v1/finance/journals/:id/submit-approval
PATCH  /api/v1/finance/journals/:id/approve
PATCH  /api/v1/finance/journals/:id/reject
GET    /api/v1/finance/journals/:id/approvals
GET    /api/v1/finance/closing/:id/analysis
POST   /api/v1/finance/closing/:id/approve
POST   /api/v1/finance/closing/year-end-close
```

### Key Statistics

| Metric | Value |
|--------|-------|
| **Total API Endpoints** | 18 |
| **Data Models** | 8 core + relationships |
| **Test Cases** | 24+ named scenarios |
| **Business Rules** | 20+ enforced |
| **Permission Gates** | 12+ distinct permissions |

---

## Phase 0: Opening Balance

### 🎯 Purpose
Set up initial account balances at the start of a fiscal year. Posted once, never edited.

### ⚡ Quick Facts

| Aspect | Detail |
|--------|--------|
| **Frequency** | Once per Company + Fiscal Year |
| **Users** | Finance Manager only |
| **Permission** | `opening_balance.write`, `opening_balance.post` |
| **Status** | DRAFT → POSTED (immutable) |
| **Auto-saves** | Yes (localStorage) |
| **GL Impact** | Creates single journal entry per FY |

### 🔄 User Journey (5 steps)

```
1. Select Company & Fiscal Year
   ↓
2. Add Account Lines (Debit/Credit)
   ↓
3. Simulate Validation (must be balanced)
   ↓
4. Review Summary
   ↓
5. Post to GL (locked)
```

### 💾 Data Model

```
OpeningBalance
├── ID (UUID)
├── company_id + fiscal_year_id (UNIQUE)
├── status: DRAFT | POSTED
├── created_by, posted_by
├── lines: OpeningBalanceLine[]
│   ├── account_id
│   ├── debit_amount
│   └── credit_amount
└── timestamps
```

### 📍 Key Business Rules

✅ **One per Company+FY** - Prevent multiple baselines  
✅ **Must Balance** - Debit = Credit (tolerance: ±0.005)  
✅ **Posted is Immutable** - Changes via reversal only  
✅ **Only in Open FY** - Cannot post to closed year  

### 🛠 API Endpoints (6 total)

```
GET    /api/v1/finance/settings/opening-balance/form-data
       → Fetch companies & fiscal years for dropdown

GET    /api/v1/finance/opening-balance/:id
       → Get full OB record with lines

GET    /api/v1/finance/opening-balance/summary
       → Check status & posting date

POST   /api/v1/finance/opening-balance/simulate
       → Validate without posting

POST   /api/v1/finance/opening-balance/draft
       → Save draft (auto-save mechanism)

POST   /api/v1/finance/opening-balance/post
       → Finalize & post to GL
```

---

## Phase 1: Journal Engine

### 🎯 Purpose
Core GL posting infrastructure. All transactions become journal entries.

### ⚡ Quick Facts

| Aspect | Detail |
|--------|--------|
| **Scope** | Backend infrastructure (no visible UI) |
| **Users** | System (auto), Accountants (manual entries) |
| **All Operations use this** | Phase 2 relies entirely on Phase 1 |
| **Status** | DRAFT → POSTED → (REVERSED) |
| **Immutability** | Posted journals are read-only |
| **GL Foundation** | All balances calculated from posted journals |

### 📊 Journal Lifecycle

```
[DRAFT] ←─→ Edit/Save
   │
   └──→ [POSTED] ───→ (immutable)
        │
        └──→ Optional: Create [REVERSED] entry
             (original stays, reversal created)
```

### 💾 Data Models

```
Journal
├── ID (UUID)
├── source_transaction_id (UNIQUE)
├── company_id + fiscal_year_id
├── journal_type: OPENING_BALANCE | PAYMENT_IN | PAYMENT_OUT | TRANSFER | ...
├── journal_date
├── status: DRAFT | POSTED | REVERSED | CANCELLED
├── reference (auto-generated or manual)
├── lines: JournalLine[]
│   ├── account_id
│   ├── debit_amount (exclusive with credit)
│   ├── credit_amount (exclusive with debit)
│   └── timestamps
└── posted_at, posted_by
```

### 🧮 GL Balance Formula

```
GL Balance (account_id, company_id, as_of_date)
= Opening Balance Lines for account
  + Sum of POSTED Journal Lines affecting account
  (filtered to as_of_date)

For Debit-type (Assets, Expenses):
  balance = opening_debit - opening_credit 
          + Σ(posted debit) - Σ(posted credit)

For Credit-type (Liabilities, Equity, Income):
  balance = opening_credit - opening_debit
          + Σ(posted credit) - Σ(posted debit)
```

### 📍 Core Validation Rules

```yaml
No Unbalanced Journal:
  debit_sum = credit_sum (within tolerance ±0.005)

No Post to Closed Period:
  FiscalYear.status must be OPEN

Posted is Immutable:
  status = POSTED → read-only (reversal-only edits)

Source Uniqueness:
  UNIQUE(source_transaction_id) prevents duplicates

All Accounts Postable:
  ChartOfAccount.is_postable = true required
```

### 🛠 API Endpoints (8 total)

```
POST   /api/v1/finance/journals
       → Create draft journal

POST   /api/v1/finance/journals/simulate
       → Validate without posting

GET    /api/v1/finance/gl-balance
       → Query account balance

POST   /api/v1/finance/journals/{id}/post
       → Finalize & lock

POST   /api/v1/finance/journals/{id}/reverse
       → Create reversal entry

GET    /api/v1/finance/journals
       → List with filters
```

---

## Phase 2: Operations

### 🎯 Three Sub-Features

#### 2A: Cash-Bank Transactions (Payments)

**What**: Record daily payments in/out  
**Users**: Cashier (create), System (auto-post)  
**Status**: DRAFT → POSTED (auto)  
**GL Impact**: Auto-posts on creation  

| Type | Debit | Credit |
|------|-------|--------|
| PAYMENT_IN | Bank Account | A/R (customer paid) |
| PAYMENT_OUT | A/P (supply paid) | Bank Account |

**5 API Endpoints**: Create, Post, List versions

---

#### 2B: Bank Transfers

**What**: Move funds between bank accounts  
**Users**: Finance (create), Finance Manager (complete)  
**Status**: DRAFT → PENDING → COMPLETED  
**GL Impact**: Posts only on COMPLETED  

```
PENDING → (no GL impact, waiting for approval)
       ↓
    COMPLETED → GL: Debit [To], Credit [From]
       ↓
    (can CANCEL before complete with no GL)
```

**3 API Endpoints**: Create, Complete, List

---

#### 2C: Bank Reconciliation

**What**: Match book vs bank statement  
**Users**: Finance (import/match), Finance Manager (confirm)  
**Process**: Import → Auto-match → Manual match → Confirm  
**GL Impact**: Records difference for audit  

```
Statement
    ↓
Import
    ↓
Auto-Match (same date ±1 day, same amount)
    ↓
Manual Match (user intervention)
    ↓
Exclude (bank fees, pending items)
    ↓
Confirm (locked for period)
```

**6 API Endpoints**: Import, Auto-match, Manual match, Exclude, Status, Confirm

---

## Architecture at a Glance

### Backend Layering (Go/Gin)

```
┌─────────────────────────────────┐
│  Presentation (Handlers)         │
│  └─ HTTP endpoints               │
├─────────────────────────────────┤
│  Domain (Usecase)                │
│  └─ Business logic + validation   │
├─────────────────────────────────┤
│  Domain (DTO + Mapper)           │
│  └─ Data transformation          │
├─────────────────────────────────┤
│  Data (Repository)               │
│  └─ Database access              │
├─────────────────────────────────┤
│  Data (Models)                   │
│  └─ GORM entities                │
└─────────────────────────────────┘
```

### Data Flow

```
Client Request
    ↓
[Validation] Zod schema in frontend
    ↓
API Call → Handler
    ↓
[Validation] DTO validation
    ↓
Usecase Logic
    ↓
[Validation] Business rules
    ↓
Repository → DB Write
    ↓
Auto-Journal Creation (Phase 1)
    ↓
GL Balance Cache Invalidation
    ↓
Success Response (201/200)
```

---

## Data Models Overview

### Core Models Checklist

| Model | Purpose | Status | Properties |
|-------|---------|--------|------------|
| **OpeningBalance** | FY baseline | DRAFT/POSTED | company_id, fiscal_year_id, lines[], status |
| **Journal** | GL entry | DRAFT/POSTED/REVERSED | journal_type, lines[], reference, source_transaction_id |
| **JournalLine** | GL detail | (same as parent) | account_id, debit/credit amounts |
| **CashBankTransaction** | Payment record | DRAFT/POSTED | transaction_type, bank_account_id, linked_journal_id |
| **BankTransfer** | Fund movement | PENDING/COMPLETED/CANCELLED | from_account, to_account, amount, status |
| **BankStatement** | Statement import | DRAFT/CONFIRMED | bank_account_id, statement_lines[], period |
| **BankStatementLine** | Statement detail | UNMATCHED/MATCHED/EXCLUDED | matched_transaction_id, exclude_reason |

### Relationships

```
ChartOfAccounts
   ↓
BankAccounts (postable accounts only)
   ↓
├─ CashBankTransactions
├─ BankTransfers (from + to)
└─ BankStatements (received)

Journals ← All operations create
├─ OpeningBalance
├─ CashBankTransaction
├─ BankTransfer (on complete)
└─ BankReconciliation (diff record)

FiscalYear ← Period control
   └─ status: OPEN/LOCKED
```

---

## API Summary

### By Transaction Type

| Feature | Endpoints | Key Logic |
|---------|-----------|-----------|
| **Opening Balance** | 6 | Simulate → Post → Immutable |
| **Journal Engine** | 8 | Validate balance → Post → Reverse |
| **Cash-Bank Txn** | 3 | Create → Auto-post |
| **Bank Transfer** | 3 | Create pending → Complete (post) |
| **Bank Reconciliation** | 6 | Import → Match → Confirm |

### Response Format (All Endpoints)

```json
{
  "success": true,
  "data": { /* entity */ },
  "meta": { 
    "pagination": { "total": 100, "page": 1, "per_page": 20 },
    "timestamp": "2026-01-15T10:30:45+07:00"
  },
  "request_id": "req_abc123"
}
```

### Common Error Codes

| Code | Status | Scenario |
|------|--------|----------|
| `NOT_BALANCED` | 400 | Debit ≠ Credit in journal |
| `PERIOD_CLOSED` | 400 | Cannot post to locked FY |
| `ACCOUNT_NOT_POSTABLE` | 400 | Selected account is not postable |
| `ALREADY_POSTED` | 409 | Journal status is not DRAFT |
| `DUPLICATE_SOURCE` | 409 | Source txn already posted |
| `PERMISSION_DENIED` | 403 | User lacks permission |

---

## Key Business Logic

### Opening Balance Posting

```
1. Validate company+FY combination
2. Check fiscal year status = OPEN
3. Verify debit = credit (balance)
4. Create Journal entry
5. Add JournalLines (copy from OB lines)
6. Set Journal.status = POSTED
7. Invalidate GL cache
8. Return success
```

### Payment In/Out Auto-Posting

```
INPUT: CashBankTransaction (PAYMENT_IN or PAYMENT_OUT)

1. Validate bank account is active
2. Create Journal (auto, status=DRAFT)
3. Create JournalLines:
   - If PAYMENT_IN:
     Debit: Bank Account
     Credit: A/R Account
   - If PAYMENT_OUT:
     Debit: A/P Account
     Credit: Bank Account
4. Post Journal (mark POSTED)
5. Link CashBankTransaction.linked_journal_id = Journal.id
6. Return success + journal info
```

### Bank Transfer Completion

```
INPUT: BankTransfer.status = PENDING (awaiting completion)

1. Verify both accounts active
2. Check amount > 0
3. Create Journal
4. Create JournalLines:
   Debit: To-Account
   Credit: From-Account
5. Set BankTransfer.status = COMPLETED
6. Set BankTransfer.completed_at = now
7. Post Journal
8. Return success
```

### Bank Reconciliation Matching

```
Auto-Match Algorithm:

For each (statement_line, book_transaction):
  IF statement.date = book.date OR 
     (statement.date ± 1 day) matches book.date
  AND statement.amount = book.amount
  THEN score = HIGH (auto-match)

For manual match:
  User selects book_transaction for statement_line
  Mark as MATCHED
  
For exclude:
  User marks unmatched line with reason
  (e.g., bank fees, pending, unknown)

Final Balance:
  GL Balance + Outstanding Items = Statement Balance
  (can proceed even if unequal with explanation)
```

---

## Test Strategy Matrix

### Phase 0 Tests (Opening Balance)

| ID | Scenario | Pass Condition |
|----|---------|----|
| TC-OB-001 | Create balanced OB | Debit=Credit, Posted, Journal created |
| TC-OB-002 | Reject unbalanced | Error NOT_BALANCED, status=DRAFT |
| TC-OB-003 | Reject closed FY | Error PERIOD_CLOSED |
| TC-OB-004 | Reject duplicate | Error ALREADY_EXISTS (2nd attempt) |
| TC-OB-005 | Simulate validation | isBalanced=true without posting |
| TC-OB-006 | Permission check | Non-Finance rejected (403) |
| TC-OB-007 | Draft auto-save | localStorage updated every 1.5s |
| TC-OB-008 | Summary view | Show posted journal ref & date |

### Phase 1 Tests (Journal Engine)

| ID | Scenario | Pass Condition |
|----|---------|----|
| TC-J1-001 | Create balanced journal | DRAFT, editable |
| TC-J1-002 | Post balanced journal | POSTED, immutable |
| TC-J1-003 | Unbalanced rejection | 400 NOT_BALANCED |
| TC-J1-004 | GL balance calc | Correct sum of posted lines |
| TC-J1-005 | Reverse journal | New entry created, original intact |
| TC-J1-006 | Period lock | Error PERIOD_CLOSED on post |
| TC-J1-007 | Posted immutable | 400 error on update attempt |
| TC-J1-008 | Audit trail | created_by, created_at, posted_by logged |

### Phase 2A Tests (Payments)

| ID | Scenario | Pass Condition |
|----|---------|----|
| TC-CBT-001 | PAYMENT_IN | Auto-posts, Bank +X / A/R -X |
| TC-CBT-002 | PAYMENT_OUT | Auto-posts, A/P +X / Bank -X |
| TC-CBT-003 | Closed period | Error PERIOD_CLOSED |
| TC-CBT-004 | Reference gen | Format: CBT-YYYYMMDD-NNN correct |

### Phase 2B Tests (Transfers)

| ID | Scenario | Pass Condition |
|----|---------|----|
| TC-BT-001 | Create PENDING | No GL impact yet |
| TC-BT-002 | Complete | GL posts: To +X / From -X |
| TC-BT-003 | Self-transfer | Error SAME_ACCOUNT |
| TC-BT-004 | Cancel PENDING | No GL created |

### Phase 2C Tests (Reconciliation)

| ID | Scenario | Pass Condition |
|----|---------|----|
| TC-BR-001 | Import & parse | Correct lines created |
| TC-BR-002 | Auto-match | 45 matched, 3 unmatched (example) |
| TC-BR-003 | Manual match | User-selected lines marked |
| TC-BR-004 | Exclude | Excluded with reason stored |
| TC-BR-005 | Balanced confirm | No unresolved differences |
| TC-BR-006 | Unbalanced confirm | Difference documented, locked |

---

## User Journey Map

### 🔖 Weekly Bank Reconciliation Flow

```
MONDAY 9:00 AM
└─ Finance Officer logs in
   └─ /finance/bank-reconciliation
      └─ Click "Import Statement"
         └─ Upload CSV from bank

MONDAY 9:15 AM
└─ System auto-matches 45 transactions
   └─ 3 remain unmatched
      └─ User manually matches 2 (customer payments unclear)
         └─ 1 marked as "bank fee" (excluded)

MONDAY 9:45 AM
└─ Reconciliation shows:
   ├─ GL Balance: Rp 170M
   ├─ Statement Balance: Rp 180M
   ├─ Outstanding: Rp 10M (checked transfer still in flight)
   └─ Difference: Reconciled ✓

MONDAY 10:00 AM
└─ Finance Manager reviews
   └─ Clicks "Confirm Reconciliation"
      └─ Period locked (no changes allowed)
         └─ Month-end report ready

RESULT: Audit trail complete, all matched, difference documented
```

### 🔖 Month-End Close Sequence

```
Day 1-30: Operations
└─ Cashiers record PAYMENT_IN/OUT (auto-post)
└─ Finance completes BANK_TRANSFER (post on complete)
└─ GL balances updated daily

Day 31: Close Period
└─ Finance Officer reconciles bank statement
   └─ Confirms reconciliation
      └─ Manager locks fiscal period
         └─ No more posts allowed

Day 1 (Next Month):
└─ Manager opens next fiscal period
   └─ New Phase 2 operations possible

INVARIANT: GL always = Debit sum - Credit sum per account
```

---

## Deployment Timeline

### 🚀 6-Week Rollout

| Week | Focus | Deliverables |
|------|-------|--------------|
| **Week 1** | Phase 0 Backend | Models, repos, usecase, API, tests |
| **Week 2** | Phase 0 Frontend | Wizard component, form, i18n |
| **Week 3** | Phase 1 Backend | Journal engine, GL calc, validation |
| **Week 4** | Phase 2A Backend | Payment transactions, auto-post |
| **Week 5** | Phase 2B/C Backend | Transfers, reconciliation logic |
| **Week 6** | All Frontend + UAT | UI for 2A/2B/C, testing, training |

### ✅ Pre-Launch Checklist

- [ ] All 24+ test cases passing (unit, integration, E2E)
- [ ] GL balance calculation verified against manual calc
- [ ] Permissions assigned to all roles (see roles table)
- [ ] i18n complete (EN + ID)
- [ ] Postman collection updated with all endpoints
- [ ] Database migrations run cleanly
- [ ] FY 2026 seed created
- [ ] UAT sign-off from Finance Manager

---

## Developer Quick Start

### 1. Understand the Stack

**Backend**: Go + Gin + GORM + PostgreSQL  
**Frontend**: Next.js + React + TanStack Query + Zod  
**Async**: No message queues, all sync GL posts  

### 2. Read Phase Docs

1. Start: `phase-0-opening-balance.md` (understand models)
2. Then: `phase-1-journal-engine.md` (understand posting)
3. Then: `phase-2-operations.md` (implement workflows)

### 3. Key Files to Create

```
Backend:
  internal/finance/{cash_bank_transaction,bank_transfer,bank_reconciliation}/
  ├─ data/models/*.go
  ├─ data/repositories/*.go
  ├─ domain/dto/*.go
  ├─ domain/mapper/*.go
  ├─ domain/usecase/*.go
  └─ presentation/{handler,router}/*.go

Frontend:
  src/features/finance/{cash_bank,bank_transfer,bank_reconciliation}/
  ├─ types/index.d.ts
  ├─ schemas/*.schema.ts
  ├─ services/*.service.ts
  ├─ hooks/use-*.ts
  ├─ components/*.tsx
  ├─ i18n/{en,id}.ts
  └─ ...

⚠️ After creating Go files: run `go mod tidy` in apps/api/
```

### 4. Critical Things to Remember

✅ Always use `apptime` not bare `time.Now()` in business logic  
✅ All posts to GL must go through Phase 1 Journal engine  
✅ Foreign keys must reference correct models  
✅ Validate permissions before every operation  
✅ Test with both DRAFT and POSTED states  

---

## 📚 Reference Links

| Document | Purpose |
|----------|---------|
| `phase-0-opening-balance.md` | Complete Phase 0 implementation guide |
| `phase-1-journal-engine.md` | Journal posting architecture |
| `phase-2-operations.md` | Payment, transfer, reconciliation workflows |
| `CASH_BANK_MASTER.md` | End-to-end overview |
| `docs/api-standart/README.md` | API response format standards |
| `docs/MIGRATION_GUIDELINES.md` | New model registration process |

---

**Last Updated**: April 2026  
**Version**: 1.0  
**Status**: Ready for Development  
**Contact**: Finance Module Lead
