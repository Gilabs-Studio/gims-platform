# GIMS Cash-Bank Module: Master Documentation (Phase 0-5)

> **Module:** Finance / Cash & Bank  
> **Scope:** End-to-End Journey from Phase 0 to Phase 5  
> **Version:** 1.0  
> **Status:** Complete  
> **Last Updated:** April 2026

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Phase Overview](#phase-overview)
3. [End-to-End User Journey](#end-to-end-user-journey)
4. [Accounting Formulas & Rules](#accounting-formulas--rules)
5. [Role-Based Use Cases](#role-based-use-cases)
6. [Integration Architecture](#integration-architecture)
7. [Frontend Menu Structure](#frontend-menu-structure)
8. [Testing Strategy](#testing-strategy)
9. [Database Relationships](#database-relationships)
10. [Deployment & Setup](#deployment--setup)

---

## Executive Summary

The **Cash-Bank Module** is a six-stage system for managing enterprise-level cash and bank operations:

| Phase | Name | Purpose | When |
|-------|------|---------|------|
| **0** | Opening Balance | Establish baseline balances at fiscal year start | Once per company-FY, one-time setup |
| **1** | Journal Engine | Core accounting infrastructure for all GL posting | Underlying all operations (not end-user feature) |
| **2** | Daily Operations | Cash-bank transactions, transfers, reconciliation | Every business day during fiscal year |
| **3** | Adjustment & Closing | Approval governance and period-end closing controls | Month-end and year-end governance window |
| **4** | Closing Hard Lock | Final enforcement for locked periods and year-end hardening | After closing approval, before next cycle |
| **5** | Stabilization & Reporting | Monitoring, report consistency, and audit snapshots | Ongoing post-launch / month-end review |

**Key Principle**: All financial transactions are represented in the General Ledger via the Journal Engine. No balance is calculated from module data; all balances derive from GL posting.

---

## Phase Overview

### Phase 0: Opening Balance
**File**: [phase-0-opening-balance.md](phase-0-opening-balance.md)

```
Purpose: Set up baseline account balances at fiscal year start

Who: Finance Manager
When: Once per company per fiscal year (at year start)
Duration: ~15-30 min
Output: Posted Opening Balance Journal in GL

Key Features:
- Wizard UI: Select company/FY → Input lines → Simulate → Post
- Auto-validation: Debit = credit check
- Immutable once posted
- Database UNIQUE constraint: (company_id, fiscal_year_id)

Business Logic:
1. User inputs account lines with debit/credit amounts
2. System validates: balanced, period open, accounts postable
3. User simulates (preview without posting)
4. User posts: system creates journal entry in GL
5. Opening balance locked; future changes via reversal entries

GL Impact:
- Creates one OPENING_BALANCE journal entry
- All account balances start from this baseline
- Becomes foundation for Phase 1-2 operations

Testing:
- TC-OB-001: Create and post balanced OB
- TC-OB-002: Reject unbalanced entry
- TC-OB-003: Reject closed period
- TC-OB-004: Prevent duplicate posting
- (See phase-0 doc for full test suite)

Related Pages:
- /finance/settings (settings dashboard)
- Opening Balance section (embedded in settings)
```

### Phase 1: Journal Engine
**File**: [phase-1-journal-engine.md](phase-1-journal-engine.md)

```
Purpose: Centralized GL posting infrastructure for all transactions

Who: Accountant (manual entries), System (auto-posting)
When: Every time a transaction posts
Duration: Automatic/immediate
Output: Posted Journal Entries in GL

Key Features:
- Journal creation with validation (balanced, period, accounts)
- Manual journal entry (for adjustments)
- Automatic journal creation from Phase 2 operations
- GL balance calculation from posted journals
- Reversal entry for corrections
- Period lock control

Business Logic:
1. Source transaction (Phase 2) creates journal lines
2. System validates: balanced, period open, accounts postable
3. System posts journal (or waits for user decision)
4. Journal marked POSTED, locked from edit
5. GL balance cache invalidated/recalculated
6. Reversal entries for corrections (not editing posted entries)

GL Impact:
- Every Phase 2 transaction posts via Phase 1 engine
- Maintains double-entry integrity (debit = credit)
- Balance = opening balance + sum(posted journal lines)

NOT End-User Feature:
- No dedicated UI for Phase 1 (hidden layer)
- Phase 2 will reference posted journals
- Accountants view journals for audit/analysis

Testing:
- TC-J1-001: Create balanced journal
- TC-J1-002: Reject unbalanced entry
- TC-J1-003: Reject closed period
- TC-J1-004: GL balance calculation
- TC-J1-005: Journal reversal
- (See phase-1 doc for full test suite)

Related Pages:
- /finance/journals (list/view journals, read-only)
- /finance/journals/[id] (journal detail + lines)
```

### Phase 2: Daily Operations
**File**: [phase-2-operations.md](phase-2-operations.md)

```
Purpose: Daily cash-bank operational workflows

Who: Cashier (transactions), Finance (transfers), Finance Manager (reconciliation)
When: Every business day during fiscal year
Duration: 5-15 min per transaction
Output: Cash-bank records + posted GL journals

Key Features:

A) Cash-Bank Transactions (Payment In/Out)
   - PAYMENT_IN: Cash receipt from customer, bank transfer in
   - PAYMENT_OUT: Cheque payment to supplier, cash disbursement
   - Auto-posts when created
   - Status: DRAFT → POSTED
   - Edit allowed in DRAFT only

B) Bank Transfers
   - Move funds between bank accounts
   - Two-step: PENDING → COMPLETED
   - Posts only when COMPLETED
   - No self-transfer, positive amounts only
   - Can cancel PENDING (no GL impact)

C) Bank Reconciliation
   - Match bank statement to GL
   - Auto-match + manual match
   - Exclude known differences (bank fees, pending items)
   - Confirm reconciliation even if unbalanced (with explanation)
   - Locked after confirmation (no re-import)

Business Logic:
1. Cashier/Finance records transaction (CBT, BT, or statement)
2. System validates (accounts, amounts, period)
3. For CBT: Auto-post → journal created + posted
4. For BT: Status PENDING → user complete → journal posts
5. For BR: Auto-match + manual match/exclude → confirm → locked
6. All GL impact tracked to source transaction

Testing:
- TC-CBT-001-004: Cash-bank transactions
- TC-BT-001-004: Bank transfers
- TC-BR-001-006: Bank reconciliation
- (See phase-2 doc for full test suite)

Related Pages:
- /finance/bank-accounts (list/manage bank accounts)
- /finance/journals/cash-bank (cash-bank transactions list)
- /finance/bank-transfer (transfer list + create)
- /finance/bank-reconciliation (reconciliation list + import)
```

### Phase 3: Adjustment & Closing
**File**: [phase-3-adjustment-closing.md](phase-3-adjustment-closing.md)

```
Purpose: Governance layer for adjustment journals and financial period closing

Who: Finance Staff, Approver, Finance Manager
When: End-of-period and whenever manual adjustments require approval
Duration: 5-20 min per closing cycle
Output: Approved/rejected adjustment trails + approved financial closing

Key Features:
- Adjustment workflow: submit approval, approve/reject, history timeline
- Journal template usage for recurring adjustment entries
- Financial closing analysis per account (opening vs closing, difference)
- 4-step Closing Wizard: pre-check, review, execute, complete
- Optional year-end close trigger after closing approval

Business Logic:
1. Finance creates adjustment draft and submits for approval
2. Approver approves/rejects, action stored in history
3. Approved adjustment can be posted; posted errors handled via reversal
4. Finance Manager creates closing draft and runs closing wizard
5. Wizard enforces review-before-approve using analysis data
6. Optional year-end close can run immediately after closing success

Related Pages:
- /finance/journals/adjustment
- /finance/closing
- /finance/accounting/closing
```

### Phase 4: Closing Hard Lock
**File**: [phase-4-closing-hard-lock.md](phase-4-closing-hard-lock.md)

```
Purpose: Final enforcement for closed periods and year-end hardening

Who: Finance Manager, Accountant, Auditor
When: After closing approval and during year-end hardening
Duration: 10-30 min per validation cycle
Output: Locked periods, controlled reopen flow, audit-safe close results

Key Features:
- Period lock enforcement across all posting flows
- Backdated posting and reversal rejection for closed periods
- Year-end close dry run and idempotency guard
- Reopen only for latest approved closing

Business Logic:
1. System checks fiscal period state before every posting action
2. Locked periods reject create/update/post/reverse as appropriate
3. Year-end close runs dry run first, then final execute
4. Reopen is allowed only for the latest approved closing
5. All lock decisions are audit logged

Related Pages:
- /finance/closing
- /finance/journals
- /finance/bank-reconciliation
```

### Phase 5: Stabilization & Reporting
**File**: [phase-5-stabilization-reporting.md](phase-5-stabilization-reporting.md)

```
Purpose: Monitor report health, mismatch queues, and closing stability after hard lock

Who: Finance Manager, Accountant, Auditor
When: Ongoing after go-live and month-end close
Duration: Continuous monitoring with daily review windows
Output: Health dashboard, mismatch queue, closing snapshots, reconciliation summaries

Key Features:
- Period health dashboard with lock and backlog indicators
- Posting mismatch monitoring and drilldown
- Report consistency validation across GL, TB, BS, PL, and cash flow
- Closing audit snapshots and reconciliation summary

Business Logic:
1. Phase 5 reads data from phase 0-4 only
2. Reports stay posted-only and must not mutate source state
3. Any mismatch is pushed into an exception queue
4. Closing snapshots are immutable once generated
5. Health score reflects open issues before next cycle starts

Related Pages:
- /finance/reports/general-ledger
- /finance/reports/balance-sheet
- /finance/reports/profit-loss
- /finance/reports/trial-balance
```

---

## End-to-End User Journey

### Complete Fiscal Year Cycle

```
┌─────────────────────────────────────────────────────────────────┐
│ FISCAL YEAR START (e.g., 2026-01-01)                            │
└─────────────────────────────────────────────────────────────────┘

[PHASE 0: OPENING BALANCE]
Finance Manager:
  1. Navigate /finance/settings → Opening Balance
  2. Select Company: PT GILABS, FY: 2026
  3. Input opening balances per account (e.g., Bank 150M, Equity 150M)
  4. Simulate → Verify balanced
  5. Post → Journal created, GL baseline set

Result:
  - GL Account "1010 Bank": +150M
  - GL Account "3010 Equity": +150M
  - Opening Balance Journal: POSTED in GL
  - All subsequent operations build from this baseline

┌─────────────────────────────────────────────────────────────────┐
│ DAILY OPERATIONS (Throughout 2026-01)                           │
└─────────────────────────────────────────────────────────────────┘

[PHASE 2: CASH-BANK TRANSACTIONS]

Day 1: Cashier receives payment from customer
  → /finance/journals/cash-bank → New Transaction
  → Type: PAYMENT_IN, Amount: 50M, A/R Account
  → Post
  → GL: Bank +50M, A/R -50M
  → Journal created + posted

Day 5: Finance records supplier payment via cheque
  → /finance/journals/cash-bank → New Transaction
  → Type: PAYMENT_OUT, Amount: 30M, A/P Account
  → Post
  → GL: Bank -30M, A/P +30M
  → Journal created + posted

Running Balance:
  - GL Bank: 150M (opening) + 50M (A/R in) - 30M (A/P out) = 170M

[PHASE 2: BANK TRANSFERS]

Day 10: Finance transfers 100M from Cash to Current account
  → /finance/bank-transfer → New Transfer
  → From: Cash (1010), To: Current (1020), Amount: 100M
  → Status: PENDING
  → Finance Manager: Complete Transfer
  → GL: Cash -100M, Current +100M
  → Journal created + posted

Intermediate Balance:
  - GL Cash: 150M + 50M - 30M - 100M = 70M
  - GL Current: 100M

[PHASE 2: BANK RECONCILIATION]

End of Month (Jan 31): Import bank statement
  → /finance/bank-reconciliation → Import Statement
  → Upload Jan 31 statement from bank
  → Statement shows: Opening 150M, Closing 180M
  → System auto-matches transactions
  → Review unmatched (e.g., bank fee 5K)
  → Exclude bank fee
  → Confirm reconciliation
  → Status: CONFIRMED

Reconciliation:
  - GL Balance (Jan 31): Let's say 170M (after daily ops)
  - Bank Statement (Jan 31): 180M
  - Difference: 10M (unmatched deposit, expected next week)
  - Documented + locked

┌─────────────────────────────────────────────────────────────────┐
│ MONTH END (e.g., 2026-01-31)                                     │
└─────────────────────────────────────────────────────────────────┘

Finance Manager:
  1. Review all reconciliations
  2. Verify GL balances match bank statements (with documented differences)
  3. Lock fiscal period
  4. Period status: OPEN → LOCKED
  5. No new postings allowed for January

Accountant:
  1. Pull trial balance report
  2. Review all GL accounts
  3. Check cash-bank balances against reconciliation report
  4. Archive for audit

┌─────────────────────────────────────────────────────────────────┐
│ ONGOING (Throughout Period)                                      │
└─────────────────────────────────────────────────────────────────┘

If error found (e.g., payment posted twice):
  1. Accountant views journal that double-posted
  2. Realizes it was error
  3. Posts reversal entry (new journal, same amount, opposite side)
  4. GL impact: original 50M + reversal -50M = net 0M
  5. Original journal stays (not edited), reversal documented
  6. System shows "Reversed by journal #XYZ" on original
```

---

## Accounting Formulas & Rules

### 1. GL Account Balance (Master Formula)

**Current Balance of Account X**:
```
Balance = Opening Balance + Σ(Posted Journal Lines for Account X)

Where:
- Opening Balance = amount from Phase 0 for this account
- Posted Journal Lines = all lines in POSTED journals 
                         with account_id = X, 
                         ordered by journal_date

Example (Bank Account):
- Opening Balance (Jan 1): 150,000,000
- Jan 5: Payment In (POSTED): +50,000,000
- Jan 10: Payment Out (POSTED): -30,000,000
- Jan 15: Transfer Out (POSTED): -100,000,000
- Current Balance (Jan 15): 150M + 50M - 30M - 100M = 70,000,000
```

### 2. Double-Entry Accounting Invariant (MUST be maintained)

**For any Posted Journal**:
```
Σ(Debit Lines) = Σ(Credit Lines)

Enforcement:
- Phase 0: Validation before post
- Phase 1: Validation before any post
- Phase 2: Validation inherited from Phase 1 (auto-journal validated)

Violation Consequence: API rejects with error NOT_BALANCED
```

### 3. Cash-Bank Physics

**PAYMENT_IN** (e.g., customer pays):
```
Debit: Bank Account (Asset ↑)
Credit: Contra Account (typically A/R ↓)

Accounting: Bank receives cash; AR is reduced
GL Impact: Cash +50M, A/R -50M (balanced)
```

**PAYMENT_OUT** (e.g., payment to supplier):
```
Debit: Contra Account (typically A/P ↑)
Credit: Bank Account (Asset ↓)

Accounting: AP recorded; bank decreases
GL Impact: A/P +75M, Bank -75M (balanced)
```

**TRANSFER** (e.g., Cash → Current):
```
Debit: To Account (Asset type)
Credit: From Account (Asset type)

Accounting: Asset swapped between accounts
GL Impact: Current +200M, Cash -200M (balanced)
Note: Both are bank accounts; transfer logic ensures same company
```

### 4. Bank Reconciliation Formula

**Reconciliation Equation**:
```
GL Balance + Outstanding Items = Bank Statement Balance

Outstanding Items = Unmatched Items (deposits not yet cleared, 
                                      pending transactions)

Example:
- GL Balance Jan 31: 170,000,000
- Outstanding Deposit: +10,000,000 (customer deposit, not yet in GL)
- Bank Statement Balance: 180,000,000
- Diff: 0 (reconciled)

Alternative (unbalanced):
- GL Balance: 170M
- Statement Balance: 180M
- Difference: 10M (can be documented as "expected next week")
```

### 5. Period Lock Rule

**Once Period is LOCKED**:
```
✗ Cannot post new journals to this period
✗ Cannot modify GL entries for this period
✓ Can view/report on this period
✓ Can reversal entries (creates new journal in same/next period)

Purpose: Ensures historical periods are immutable for audit/compliance
```

### 6. Status Transitions (State Machine)

**Opening Balance**:
```
DRAFT → POSTED (one-way, immutable)
        ↓ (no backward transition)
    LOCKED (via period lock, not editable)
```

**Cash-Bank Transaction**:
```
DRAFT → POSTED (one-way)
        ↓
    Can create REVERSAL journal (doesn't change original status)
```

**Bank Transfer**:
```
PENDING → COMPLETED (two-step: not posted until complete)
       or ↓
      CANCELLED (no GL impact if before complete)
          ↓
      COMPLETED (posts GL)
```

**Bank Reconciliation**:
```
DRAFT → RECONCILING (user matching in progress)
     or ↓
       RECONCILED (balanced, waiting confirm)
            or
        UNBALANCED (diff documented)
            ↓
       CONFIRMED (locked, no re-import)
```

---

## Role-Based Use Cases

### Finance Manager

| Task | Phase | Frequency | Tools | Permission |
|------|-------|-----------|-------|------------|
| **Set up Opening Balance** | 0 | Once/FY at start | Wizard | `opening_balance.post` |
| **Monitor GL Balances** | 1+2 | Daily | GL Balance Report | `gl.read` |
| **Approve/ Complete Transfers** | 2 | As needed | Transfer UI | `bank_transfer.complete` |
| **Confirm Bank Reconciliation** | 2 | Month-end | Reconciliation UI | `bank_reconciliation.post` |
| **Lock Period** | 1 | Month-end | Period Admin | `period.lock` |
| **Reverse Erroneous Entry** | 1 | As needed | Journal Reversal | `journal.reverse` |
| **Export Reports** | All | Week/month-end | Report Module | `report.read` |

### Accountant

| Task | Phase | Frequency | Tools | Permission |
|------|-------|-----------|-------|------------|
| **View GL Journals** | 1 | Daily/weekly | Journal List/Detail | `journal.read` |
| **Create Manual Journal** | 1 | As needed | New Journal UI | `journal.create` |
| **Post Manual Journal** | 1 | As needed | Journal UI | `journal.post` |
| **Monitor GL Balances** | 1+2 | Daily | GL Balance Report | `gl.read` |
| **Reverse Entries** | 1 | As needed | Journal Reversal | `journal.reverse` |
| **Audit Trail Review** | All | Weekly | Audit Report | `audit.read` |
| **Period-End Close** | 1 | Month-end | Close Procedures | `period.lock` |

### Cashier

| Task | Phase | Frequency | Tools | Permission |
|------|-------|-----------|-------|------------|
| **Record Payment In** | 2 | Daily | New CBT UI | `cash_bank_transaction.create` |
| **Record Payment Out** | 2 | Daily | New CBT UI | `cash_bank_transaction.create` |
| **View Transactions** | 2 | Daily | CBT List | `cash_bank_transaction.read` |
| **Edit Draft Transaction** | 2 | As needed | CBT Edit | `cash_bank_transaction.update` |
| **Daily Cash Report** | 2 | Daily | Transaction Report | `cash_bank_transaction.read` |

### Finance Officer (Bank Operations)

| Task | Phase | Frequency | Tools | Permission |
|------|-------|-----------|-------|------------|
| **Initiate Transfers** | 2 | As needed | New Transfer | `bank_transfer.create` |
| **Import Bank Statement** | 2 | Daily/weekly | Import UI | `bank_reconciliation.create` |
| **Manual Match Transactions** | 2 | Daily/weekly | Match UI | `bank_reconciliation.update` |
| **Exclude Reconciliation Lines** | 2 | Daily/weekly | Exclude UI | `bank_reconciliation.update` |
| **View Reconciliation Status** | 2 | Daily/weekly | Status UI | `bank_reconciliation.read` |

---

## Integration Architecture

### 1. Database Integration Map

```
┌─────────────────────┐
│ Chart of Accounts   │ (COA master data)
│ (coa)               │ └─→ Postable accounts validation
└─────────────────────┘

┌─────────────────────┐
│ Bank Accounts       │ (Sub-ledger for banks)
│ (bank_accounts)     │ └─→ Transaction recording, reconciliation
└─────────────────────┘

┌─────────────────────┐
│ Companies           │ (Multi-company config)
│ (companies)         │ └─→ Company validation, filtering
└─────────────────────┘

┌─────────────────────┐
│ Fiscal Years        │ (Period management)
│ (fiscal_years)      │ └─→ Period lock, FY validation
└─────────────────────┘
         │
         ├─→ PHASE 0: OPENING BALANCE
         │   ├─ opening_balances (one-time setup)
         │   └─ opening_balance_lines
         │
         ├─→ PHASE 1: JOURNAL ENGINE
         │   ├─ journals (all GL postings)
         │   ├─ journal_lines (debit/credit)
         │   └─ gl_balance_cache (computed)
         │
         └─→ PHASE 2: DAILY OPERATIONS
             ├─ cash_bank_transactions (payments)
             ├─ bank_transfers (inter-account moves)
             ├─ bank_statements (import)
             └─ bank_statement_lines (import detail)
                    │
                    └─→ All link to journals via source_transaction_id
```

### 2. API Flow (Request → Processing → GL)

```
Client Request (e.g., Payment In 50M)
     │
     ├─→ Validate (Accounts, Period, Amount)
     │
     ├─→ Create Cash-Bank Transaction (status=DRAFT) 
     │   └─→ Store CBT record
     │
     ├─→ Auto-Generate Journal Entry
     │   ├─ Line 1: Debit Bank 50M
     │   ├─ Line 2: Credit A/R 50M
     │   └─ Link to CBT via source_transaction_id
     │
     ├─→ Post Journal (Phase 1 validation)
     │   ├─ Verify balanced (50M debit = 50M credit)
     │   ├─ Verify period OPEN
     │   ├─ Verify accounts postable
     │   └─ Update journal status = POSTED
     │
     ├─→ Invalidate GL Balance Cache
     │   └─ cache.delete("gl_balance:*:bank_account_id")
     │
     └─→ Response to Client
         ├─ Success: CBT ID, Journal ID, Posted timestamp
         └─ Failure: Error code + message

Later: Query GL Balance
     │
     └─→ Calculate: Opening Balance + Σ(Posted Journal Lines for Account)
         └─→ Return current balance 50M higher (cash received)
```

### 3. Error Propagation

```
Frontend (next.js)
     │
     ├─→ Validate input (TypeScript, Zod schemas)
     │
     ├─→ Call API (/finance/journals/cash-bank POST)
     │
     Backend (Go/Gin)
     │
     ├─→ Validate again (accounts, period, amounts)
     │   ├─ Return 400 if invalid
     │   └─ Example: PERIOD_CLOSED, ACCOUNT_NOT_POSTABLE
     │
     ├─→ Create journal
     │
     ├─→ Post journal (Phase 1)
     │   ├─ Simulate validation
     │   ├─ Return 400 if not balanced (NOT_BALANCED)
     │   └─ Return 409 if already posted (ALREADY_POSTED)
     │
     └─→ Return 200 OK with details
         │
         └─→ Frontend displays:
             ├─ Success toast
             ├─ Updated UI (new CBT in list)
             └─ GL impact visualization
```

### 4. Audit Trail

```
Every action creates audit record:

Opening Balance Post:
  - WHO: Finance Manager ID
  - WHEN: Timestamp
  - WHAT: Opened Balance record + Journal record
  - WHY: "User posted opening balance"
  - WHERE: opening_balances.created_by, journals.created_by

Transaction Posted:
  - WHO: Cashier ID (or system if auto-post)
  - WHEN: Timestamp
  - WHAT: Cash-Bank Transaction + Journal Entry
  - WHY: "PAYMENT_IN of 50M from customer"
  - SOURCE: cash_bank_transaction.source_transaction_id → journal

Transfer Completed:
  - WHO: Finance Manager ID
  - WHEN: Timestamp
  - WHAT: Bank Transfer completed + Journal Entry
  - WHY: "Completed transfer of 200M"
  - PROOF: bank_transfer.linked_journal_id

Reconciliation Confirmed:
  - WHO: Finance Officer ID
  - WHEN: Timestamp
  - WHAT: Bank Reconciliation locked
  - WHY: "Confirmed reconciliation, diff 10M documented"
  - DETAIL: bank_statement.locked_by, bank_statement.locked_at
```

---

## Frontend Menu Structure

### Navigation Config (TypeScript)

**File**: `/apps/web/src/lib/navigation-config.ts`

```typescript
// Cash & Bank menu in Finance module
export const FINANCE_MENU = {
  // ... other menu items ...
  
  {
    label: "Cash & Bank",
    icon: "DolarSign",
    children: [
      {
        label: "Bank Accounts",
        icon: "Building2",
        url: "/finance/bank-accounts",
        permission: "bank_account.read",
      },
      {
        label: "Cash-Bank Transactions",
        icon: "ArrowRightLeft",
        url: "/finance/journals/cash-bank",
        permission: "cash_bank_transaction.read",
      },
      {
        label: "Bank Transfers",
        icon: "Send",
        url: "/finance/bank-transfer",
        permission: "bank_transfer.read",
      },
      {
        label: "Bank Reconciliation",
        icon: "CheckCircle2",
        url: "/finance/bank-reconciliation",
        permission: "bank_reconciliation.read",
      },
    ],
  },
}
```

### Page Structure (App Router)

```
app/[locale]/(dashboard)/
├── finance/
│   ├── bank-accounts/
│   │   ├── page.tsx               # List view
│   │   ├── [id]/
│   │   │   └── page.tsx           # Detail view
│   │   └── loading.tsx
│   │
│   ├── journals/
│   │   └── cash-bank/
│   │       ├── page.tsx            # Cash-Bank Transactions list
│   │       └── loading.tsx
│   │
│   ├── bank-transfer/
│   │   ├── page.tsx               # Transfer list + create
│   │   └── loading.tsx
│   │
│   └── bank-reconciliation/
│       ├── page.tsx               # Reconciliation list + import
│       └── loading.tsx
```

### Component Hierarchy

```
Finance Module
│
├─ BankAccountsList
│  ├─ BankAccountCard (each row)
│  └─ BankAccountDetailModal
│
├─ CashBankTransactionsList
│  ├─ TransactionRow
│  ├─ TransactionFilterBar
│  └─ CashBankTransactionWizard (modal)
│     ├─ Step 1: Form
│     └─ Step 2: Summary (linked journal preview)
│
├─ BankTransferList
│  ├─ TransferRow (status badge: PENDING, COMPLETED)
│  ├─ TransferFilterBar
│  └─ BankTransferModal (create/complete)
│
└─ BankReconciliationList
   ├─ StatementRow
   ├─ ReconciliationImportModal
   ├─ ReconciliationMatchingUI
   │  ├─ StatementLineTable
   │  │  └─ MatchButton, ExcludeButton per line
   │  └─ UnmatchedLinesSidebar
   └─ ReconciliationConfirmModal
```

### Permission Guards (Rendered Conditionally)

```typescript
// In components, use PermissionGuard
<PermissionGuard permission="cash_bank_transaction.create">
  <Button onClick={openCreateModal}>New Transaction</Button>
</PermissionGuard>

// Or in hooks
const canCreateCBT = useHasPermission("cash_bank_transaction.create");
if (!canCreateCBT) return <p>No permission</p>;

// For UI visibility
{canCreateCBT && <ActionButton>Create</ActionButton>}
{canPostCBT && <ActionButton>Post</ActionButton>}
{canViewHistory && <ActionButton>History</ActionButton>}
```

### i18n Keys

**File**: `src/features/finance/cash-bank/i18n/{en.ts, id.ts}`

```typescript
// English
export const cashBank = {
  title: "Cash & Bank",
  bankAccounts: "Bank Accounts",
  transactions: "Cash-Bank Transactions",
  transfers: "Bank Transfers",
  reconciliation: "Bank Reconciliation",
  
  transaction: {
    paymentIn: "Payment In",
    paymentOut: "Payment Out",
    created: "Transaction created",
    posted: "Transaction posted",
  },
  
  transfer: {
    pending: "Pending",
    completed: "Completed",
    cancelled: "Cancelled",
  },
  
  reconciliation: {
    importing: "Importing statement...",
    autoMatching: "Auto-matching...",
    confirmed: "Reconciliation confirmed",
    balanced: "Balanced",
    unbalanced: "Unbalanced (difference documented)",
  },
  
  errors: {
    periodClosed: "Cannot post to closed period",
    accountNotPostable: "Account not available for posting",
    notBalanced: "Transaction not balanced",
  },
};

// Indonesian
export const cashBankId = {
  title: "Kas & Bank",
  // ... (same structure, translated)
};
```

---

## Testing Strategy

### Test Organization

```
tests/
├── unit/
│   ├── opening-balance/
│   │   └── usecase_test.go
│   ├── journal-engine/
│   │   └── usecase_test.go
│   └── cash-bank/
│       ├── transaction_usecase_test.go
│       ├── transfer_usecase_test.go
│       └── reconciliation_usecase_test.go
│
├── integration/
│   ├── opening-balance_integration_test.go
│   ├── journal-gl_integration_test.go
│   └── cash-bank-e2e_integration_test.go
│
└── e2e/
    └── cash-bank.spec.ts (Playwright)
```

### Phase 0 Testing Summary

| Test Case | Scope | Pass Condition |
|-----------|-------|---|
| TC-OB-001 | Create & post balanced OB | Status = POSTED, journal created |
| TC-OB-002 | Reject unbalanced entry | Error NOT_BALANCED |
| TC-OB-003 | Reject closed period | Error PERIOD_CLOSED |
| TC-OB-004 | Prevent duplicate | Error ALREADY_POSTED |
| TC-OB-005 | Simulate before post | Diff = 0, balanced flag shown |
| TC-OB-006 | Permission denied | Button disabled/hidden |
| TC-OB-007 | Draft auto-save | Values restored on page reload |
| TC-OB-008 | View summary | Shows posted date, journal ref |

### Phase 1 Testing Summary

| Test Case | Scope | Pass Condition |
|-----------|-------|---|
| TC-J1-001 | Create balanced journal | Journal status = DRAFT |
| TC-J1-002 | Post balanced journal | Journal status = POSTED |
| TC-J1-003 | Reject unbalanced | Error NOT_BALANCED |
| TC-J1-004 | GL balance calculation | Balance = opening + posted lines |
| TC-J1-005 | Reverse journal | Original + reversal net to zero |
| TC-J1-006 | Period lock enforcement | Error PERIOD_CLOSED |
| TC-J1-007 | Posted immutable | API rejects UPDATE on posted |
| TC-J1-008 | Audit trail | created_by, created_at recorded |

### Phase 2 Testing Summary

| Test Case | Scope | Pass Condition |
|-----------|-------|---|
| **Cash-Bank Transactions** | | |
| TC-CBT-001 | Payment In + Post | GL: Bank +, A/R - |
| TC-CBT-002 | Payment Out + Post | GL: Bank -, A/P + |
| TC-CBT-003 | Closed period rejection | Error PERIOD_CLOSED |
| TC-CBT-004 | Reference auto-gen | Format CBT-YYYYMMDD-NNN |
| **Bank Transfers** | | |
| TC-BT-001 | Create PENDING transfer | Status = PENDING, no GL impact |
| TC-BT-002 | Complete transfer | Status = COMPLETED, GL posted |
| TC-BT-003 | Self-transfer rejection | Error SAME_ACCOUNT |
| TC-BT-004 | Cancel PENDING | Status = CANCELLED, no GL |
| **Bank Reconciliation** | | |
| TC-BR-001 | Import statement | Lines parsed, status = DRAFT |
| TC-BR-002 | Auto-match | X lines matched, Y unmatched |
| TC-BR-003 | Manual match | Line status = MATCHED |
| TC-BR-004 | Exclude line | Line status = EXCLUDED, reason stored |
| TC-BR-005 | Confirm balanced | Status = CONFIRMED, locked |
| TC-BR-006 | Confirm unbalanced | Status = CONFIRMED, diff documented |

### Happy Path End-to-End Story

```gherkin
Scenario: Complete monthly cash-bank cycle

Given a company PT GILABS, fiscal year 2026
And opening balance set: Bank 150M, Equity 150M

When January starts:
  And Cashier records payment in 50M from customer
  Then GL: Bank = 150M + 50M = 200M
  And GL: A/R = 0M - 50M = -50M
  And Journal auto-posted

When Finance transfers 100M cash to current:
  And Transfer created (status=PENDING)
  And Finance Manager completes transfer
  Then GL: Cash = 50M - 100M = -50M (negative ok, means overdraft/loan)
  And GL: Current = 100M
  And Journal auto-posted

When end of month:
  And Finance Officer imports bank statement
  And Statement shows closing balance 150M
  And System auto-matches 45 transactions
  And Finance Officer manually matches 2 remaining
  And Excludes 1 bank fee
  Then Reconciliation balanced
  And Status = CONFIRMED
  And Period locked

Then Accountant:
  And Issues trial balance report
  And Compares GL balances to bank reconciliation
  And Verifies all cash-bank accounts reconciled
  And Archives for audit
```

---

## Database Relationships

### Entity Relationship Map

```
┌──────────────────┐
│ Companies        │
└────────┬─────────┘
         │
         ├─→ ┌──────────────────────────┐
         │   │ Fiscal Years             │
         │   │ (period: 1/1 - 12/31)    │
         │   └────────┬─────────────────┘
         │            │
         │            ├─→ ┌─────────────────────────┐
         │            │   │ Opening Balances (P0)   │
         │            │   │ (company-fy: unique)    │
         │            │   └────────┬────────────────┘
         │            │            │
         │            │            └─→ Opening Balance Lines
         │            │                (account + debit/credit)
         │            │
         │            └─→ ┌─────────────────────────┐
         │                │ Journals (P1)           │
         │                │ (GL posting engine)     │
         │                └────────┬────────────────┘
         │                         │
         │                         ├─→ Journal Lines
         │                         │   (account + debit/credit)
         │                         │
         │                         └─→ Link via source_transaction_id
         │
         └─→ ┌──────────────────────────┐
             │ Bank Accounts (sub-ledger)│
             └────────┬─────────────────┘
                      │
                      ├─→ ┌──────────────────────────┐
                      │   │ CBT (Payment In/Out, P2) │
                      │   └────────┬─────────────────┘
                      │            │
                      │            └─→ links to Journal
                      │
                      ├─→ ┌──────────────────────────┐
                      │   │ Bank Transfer (P2)       │
                      │   └────────┬─────────────────┘
                      │            │
                      │            └─→ links to Journal
                      │
                      └─→ ┌──────────────────────────┐
                          │ Bank Statement (P2)      │
                          └────────┬─────────────────┘
                                   │
                                   └─→ Bank Statement Lines
                                       (match to CBT)
```

### Key Constraints & Indexes

```sql
-- Phase 0
UNIQUE (opening_balances: company_id, fiscal_year_id)
INDEX (opening_balances: company_id, fiscal_year_id)

-- Phase 1
UNIQUE (journals: source_transaction_id)  -- Prevent duplicate posts
INDEX (journals: company_id, fiscal_year_id, status)
INDEX (journals: fiscal_year_id, status)
INDEX (journal_lines: journal_id)
INDEX (journal_lines: account_id)

-- Phase 2
INDEX (cash_bank_transactions: company_id, transaction_date)
INDEX (cash_bank_transactions: bank_account_id)
INDEX (bank_transfers: company_id, transfer_date)
CHECK (bank_transfers: from_bank_account_id != to_bank_account_id)
CHECK (bank_transfers: amount > 0)
UNIQUE (bank_statements: bank_account_id, statement_period_end)
INDEX (bank_statements: status)
INDEX (bank_statement_lines: bank_statement_id)
INDEX (bank_statement_lines: status)
```

---

## Deployment & Setup

### Prerequisites

- [ ] PostgreSQL 14+ database
- [ ] Go 1.25+
- [ ] Node.js 18+
- [ ] pnpm 9+
- [ ] Redis (for GL balance cache, optional but recommended)

### Backend Setup

```bash
# 1. Clone repo
cd apps/api

# 2. Initialize Go modules
go mod tidy

# 3. Create .env (copy from .env.example)
# DATABASE_URL=postgres://user:pass@localhost:5432/gims_dev
# REDIS_URL=redis://localhost:6379

# 4. Run migrations (auto on server start)
go run ./cmd/api/main.go
# Stops if migration fails; check logs

# 5. Seeders run automatically
# - Creates default companies, fiscalYears, COA, bankAccounts
# - Creates default roles and permissions
# - Creates default users

# 6. Manual seeding (if needed)
go run ./cmd/seed/main.go
```

### Frontend Setup

```bash
# 1. Go to frontend
cd apps/web

# 2. Install dependencies
pnpm install

# 3. Copy .env
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1

# 4. Build
pnpm build

# 5. Run dev server
pnpm dev
# Opens http://localhost:3000
```

### Verification Checklist

```
[ ] Backend
  [ ] Server starts without errors
  [ ] Database migrations complete
  [ ] Redis connected (if using)
  [ ] Seeders populate default data
  
[ ] Frontend
  [ ] Next.js dev server running
  [ ] Can navigate to /finance/settings
  [ ] Opening Balance wizard visible
  [ ] Menu shows Cash & Bank items
  
[ ] Integration
  [ ] Can login
  [ ] Opening Balance: Create → Simulate → Post → Success
  [ ] CBT: Create PAYMENT_IN → Post → GL balance updates
  [ ] BT: Create PENDING → Complete → GL posts
  [ ] BR: Import statement → Auto-match → Confirm
  
[ ] Test Coverage
  [ ] TC-OB-001 to TC-OB-008 passing
  [ ] TC-J1-001 to TC-J1-008 passing
  [ ] TC-CBT-001 to TC-CBT-004 passing
  [ ] TC-BT-001 to TC-BT-004 passing
  [ ] TC-BR-001 to TC-BR-006 passing
```

### Feature Rollout Strategy

```
Week 1: Phase 0 (Opening Balance)
  - Deploy seeder with opening_balances table
  - Enable /finance/settings opening-balance section
  - UAT: Create + post OB for test company-FY
  - Permission: opening_balance.* assigned to Finance Manager role

Week 2: Phase 1 (Journal Engine - backend only)
  - Deploy journals + journal_lines tables
  - Deploy journal posting logic
  - UAT: Verify GL balance calculation (via API tests)
  - No UI changes yet (Phase 1 is infrastructure)

Week 3: Phase 2A (Cash-Bank Transactions)
  - Deploy cash_bank_transactions table
  - Deploy CBT handlers + routers
  - Enable /finance/journals/cash-bank UI
  - UAT: Record payment in/out, verify GL updates
  - Permission: cash_bank_transaction.* assigned to Cashier role

Week 4: Phase 2B (Bank Transfers)
  - Deploy bank_transfers table
  - Deploy transfer handlers + routers
  - Enable /finance/bank-transfer UI
  - UAT: Create PENDING → Complete → GL posts
  - Permission: bank_transfer.* assigned to Finance role

Week 5: Phase 2C (Bank Reconciliation)
  - Deploy bank_statements + bank_statement_lines tables
  - Deploy reconciliation handlers + routers
  - Deploy MT940/CSV parsers
  - Enable /finance/bank-reconciliation UI
  - UAT: Import statement → Match → Confirm

Week 6: Go Live + Training
  - All features deployed
  - Finance team training on workflows
  - Go live: Finance Manager opens FY 2026, creates opening balance
  - Daily operations begin

Post-Launch: Monitoring
  - Monitor API response times (GL queries may be slow on large ledgers)
  - Check Redis cache hit/miss ratios
  - Alert on posting failures (auto-journal errors)
  - Weekly reconciliation audit report
```

---

## Summary

**Cash-Bank Module** is a complete, integrated system for enterprise cash and bank operations, spanning:

- **Phase 0**: Foundation (opening balance setup)
- **Phase 1**: Infrastructure (journal engine & GL integrity)
- **Phase 2**: Operations (daily transactions, transfers, reconciliation)

**Key Features**:
- ✅ Complete GL integration (all operations post to journal)
- ✅ Strict accounting discipline (balanced, immutable, audited)
- ✅ Period control (no posting to closed periods)
- ✅ Multi-level validation (input → business logic → GL posting)
- ✅ Audit trail (who, when, what, why, linked to GL)
- ✅ Bank reconciliation (auto-match + manual override)
- ✅ Role-based access (Finance Manager → Cashier → Accountant)

**Testing Scope**:
- 8+ test cases per phase (24+ total)
- Integration tests (GL balance, period lock, source linking)
- E2E tests (complete workflows: opening balance → daily ops → reconciliation)
- Happy path + exception paths

**Expected Outcomes**:
- Finance team can confidently manage cash and bank accounts
- GL balances always accurate and auditable
- Bank reconciliation monthly, with documented differences
- Period lock enforces historical immutability
- Audit trail supports compliance and investigation

---

## Reference Documents

| Document | Scope | Details |
|----------|-------|---------|
| [Phase 0: Opening Balance](phase-0-opening-balance.md) | One-time FY setup | Wizard, simulation, posting, testing |
| [Phase 1: Journal Engine](phase-1-journal-engine.md) | GL infrastructure | Validation, posting, GL balance, period control |
| [Phase 2: Operations](phase-2-operations.md) | Daily workflows | Transactions, transfers, reconciliation, APIs |
| **THIS FILE** | Master overview | End-to-end journey, architecture, deployment |

---

**Version**: 1.0  
**Last Updated**: April 2026  
**Status**: Ready for UAT and deployment
