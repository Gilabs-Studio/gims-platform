# CASH & BANK MODULE - BUSINESS LOGIC DOCUMENTATION

**Last Updated:** 2026-05-10  
**Module:** Finance - Cash & Bank Management  
**Stack:** Go 1.25+ (Gin/GORM) + Next.js 16 (React 19/Tailwind v4)

---

## Table of Contents
1. [Module Overview](#module-overview)
2. [Bank Accounts](#bank-accounts)
3. [Bank Transfers](#bank-transfers)
4. [Bank Reconciliation](#bank-reconciliation)
5. [Cash Bank Transactions](#cash-bank-transactions)
6. [Cash Bank Journal (Ledger)](#cash-bank-journal-ledger)
7. [Data Flow Diagram](#data-flow-diagram)
8. [Triggers & Events](#triggers--events)

---

## Module Overview

The **Cash & Bank module** manages company bank accounts, cash transactions, inter-bank transfers, and bank statement reconciliation. It integrates with the General Ledger (Journal Entries) to maintain dual-entry bookkeeping.

### Key Responsibilities
- **Account Management**: Create and maintain company bank/cash accounts
- **Transaction Processing**: Record incoming and outgoing payments
- **Fund Transfers**: Move funds between company accounts
- **Reconciliation**: Match bank statements with accounting records
- **Ledger Integration**: Auto-post transactions to GL for real-time financial visibility

### Role-Based Permissions
```
cash_bank.read                   # View all cash/bank data
cash_bank_transaction.read       # View transactions
cash_bank_transaction.write      # Create/Edit transactions
cash_bank_transaction.reverse    # Reverse transactions
bank_transfer.read               # View transfers
bank_transfer.write              # Create/Complete transfers
bank_transfer.cancel             # Cancel transfers
bank_reconciliation.read         # View reconciliation
bank_reconciliation.write        # Import statements, match lines
bank_reconciliation.reconcile    # Confirm reconciliation
bank_reconciliation.lock         # Lock period
```

---

## BANK ACCOUNTS

### 1.1 Business Logic

**Purpose**: Maintain centralized registry of company bank accounts used for payments and transfers.

**Key Features**:
- Store bank account details (number, holder, currency)
- Link account to Chart of Accounts (COA) for GL posting
- Track account status (active/inactive)
- Support multiple currencies per company
- Historical transaction tracking

**Business Rules**:
- Each account must be linked to a COA account for GL posting
- Account code must be unique per company
- Cannot delete account if transactions exist (soft delete only)
- Only active accounts appear in transaction forms
- Account type determines transaction eligibility (operational, suspense, transit)

### 1.2 Data Model

#### Table: `bank_accounts`
**Location**: `apps/api/internal/core/data/models/bank_account.go`

| Column | Type | Nullable | Key | Description |
|--------|------|----------|-----|-------------|
| id | uuid | NO | PK | Unique identifier |
| tenant_id | uuid | YES | INDEX | Tenant isolation |
| company_id | uuid | NO | INDEX | Company owner |
| code | varchar(50) | NO | UNIQUE | Account code (per company) |
| name | varchar(150) | NO | INDEX | Display name |
| account_type | varchar(50) | NO | - | operational, suspense, transit |
| bank_id | uuid | YES | FK | Reference to bank master |
| account_number | varchar(50) | NO | UNIQUE | Bank account number |
| account_holder | varchar(150) | NO | - | Account holder name |
| currency_id | uuid | YES | FK | Currency master |
| currency | varchar(10) | NO | - | ISO code (IDR, USD, etc) |
| chart_of_account_id | uuid | YES | FK | GL account link |
| village_id | uuid | YES | FK | Geographic location |
| bank_address | varchar(255) | YES | - | Bank branch address |
| bank_phone | varchar(20) | YES | - | Bank branch contact |
| opening_balance | decimal(20,4) | NO | - | Documentation only |
| is_active | bool | NO | INDEX | Active/Inactive |
| country_code | varchar(2) | YES | - | ISO country code |
| bank_branch_code | varchar(20) | YES | - | Branch identifier |
| created_by | uuid | NO | - | Creator user |
| updated_by | uuid | NO | - | Last editor |
| created_at | timestamp | NO | - | Creation date |
| updated_at | timestamp | NO | INDEX | Last update |
| deleted_at | timestamp | YES | INDEX | Soft delete |

### 1.3 Data Relations

```
BankAccount
├── company_id → Organization.id
├── currency_id → Currency.id
├── chart_of_account_id → ChartOfAccount.id  [GL Integration]
├── village_id → Village.id  [Geographic]
└── bank_id → Bank.id (master data)

Inverse Relations:
├── BankTransfer.from_bank_account_id
├── BankTransfer.to_bank_account_id
├── BankReconciliation.bank_account_id
├── CashBankTransaction.bank_account_id
└── CashBankJournal.bank_account_id
```

### 1.4 Data Journey

```
[Create Bank Account]
    ↓
[Validate company exists, COA linked]
    ↓
[Insert record in bank_accounts]
    ↓
[Account available in transaction forms]
    ↓
[Snapshot stored on first usage in CashBankJournal]
```

### 1.5 User Journey (Frontend)

**Location**: `apps/web/src/features/finance/bank-accounts/`

#### Create Flow
```
Bank Accounts List
    ↓ (Click "Add Account")
Bank Account Form
    ├─ Input: Code, Name, Account Number, Holder
    ├─ Select: Company, Currency, COA Link, Account Type
    ├─ Optional: Bank Address, Phone, Village
    ↓ (Submit)
[API] POST /api/bank-accounts
    ↓ (Success)
Redirect to Bank Account Detail
    ├─ View account info
    ├─ View transaction history
    └─ Edit/Deactivate options
```

#### List & Filter
```
Bank Accounts List
├─ Table columns:
│  ├─ Code
│  ├─ Name
│  ├─ Account Number
│  ├─ Currency
│  ├─ Status (Active/Inactive)
│  └─ Updated Date
├─ Filters:
│  ├─ Search by name/code
│  ├─ Currency filter
│  ├─ Active/Inactive toggle
│  └─ Sort options
└─ Pagination (default 20/page, max 100)
```

### 1.6 API Endpoints

| Method | Endpoint | Permission | Purpose |
|--------|----------|-----------|---------|
| GET | `/api/bank-accounts` | `cash_bank.read` | List with pagination |
| POST | `/api/bank-accounts` | `cash_bank.write` | Create new account |
| GET | `/api/bank-accounts/:id` | `cash_bank.read` | Get details |
| PUT | `/api/bank-accounts/:id` | `cash_bank.write` | Update account |
| DELETE | `/api/bank-accounts/:id` | `cash_bank.write` | Soft delete |

### 1.7 Triggers

**Create Bank Account Triggers**:
- ✅ Validate company exists
- ✅ Validate COA account exists if provided
- ✅ Validate currency exists
- ✅ Check code uniqueness per company
- ❌ No GL posting (master data only)

**Update Bank Account Triggers**:
- ✅ Prevent code change if transactions exist
- ✅ Allow COA link change if no transactions
- ✅ Update snapshots in active journals

**Deactivate Bank Account Triggers**:
- ✅ Prevent if pending transactions exist
- ✅ Audit log the deactivation
- ❌ No GL impact

---

## BANK TRANSFERS

### 2.1 Business Logic

**Purpose**: Move funds between company bank accounts with automatic GL posting.

**Key Features**:
- Transfer funds from source to destination account
- Auto-generate journal entry (debit destination, credit source)
- Workflow: Pending → Completed → (or Cancelled)
- Support same-currency transfers only
- Reference tracking for audit trail

**Business Rules**:
- Source and destination must belong to same company
- Source and destination must have same currency
- Both accounts must be linked to COA for posting
- Amount must be > 0
- Transaction date cannot be in future
- Transfer can only be cancelled from pending status
- Completion creates GL entry automatically
- Cannot edit completed/cancelled transfer

### 2.2 Data Model

#### Table: `bank_transfers`
**Location**: `apps/api/internal/finance/data/models/bank_transfer.go`

| Column | Type | Nullable | Key | Description |
|--------|------|----------|-----|-------------|
| id | uuid | NO | PK | Unique identifier |
| tenant_id | uuid | YES | INDEX | Tenant isolation |
| company_id | uuid | NO | INDEX | Company context |
| transfer_number | varchar(40) | NO | INDEX | Auto-generated reference |
| from_bank_account_id | uuid | NO | FK | Source account |
| to_bank_account_id | uuid | NO | FK | Destination account |
| amount | numeric(20,4) | NO | - | Transfer amount |
| date | date | NO | INDEX | Transaction date |
| reference | varchar(120) | YES | - | External reference |
| description | text | YES | - | Notes/memo |
| status | varchar(20) | NO | INDEX | pending, completed, cancelled |
| journal_entry_id | uuid | YES | FK | GL posting reference |
| created_by | uuid | YES | - | Creator user |
| updated_by | uuid | YES | - | Last editor |
| created_at | timestamp | NO | - | Creation timestamp |
| updated_at | timestamp | NO | INDEX | Update timestamp |
| deleted_at | timestamp | YES | INDEX | Soft delete |

**Indexes**:
- `idx_company_id` on company_id
- `idx_status` on status
- `idx_date` on date

### 2.3 Data Relations

```
BankTransfer
├── company_id → Organization.id
├── from_bank_account_id → BankAccount.id [Source]
├── to_bank_account_id → BankAccount.id [Destination]
└── journal_entry_id → JournalEntry.id [GL Entry]
    └── JournalEntry.lines[0]: DEBIT destination_coa
    └── JournalEntry.lines[1]: CREDIT source_coa
```

### 2.4 Data Journey

```
[Create Bank Transfer]
    ↓
[Validate accounts, currency match, COA linked]
    ↓
[Generate transfer_number]
    ↓
[Insert with status=pending]
    ↓
[Display in Pending Transfers list]
    ↓
[Click "Complete"]
    ↓
[Create Journal Entry]
    ├─ Line 1: DEBIT destination_coa WITH transfer amount
    └─ Line 2: CREDIT source_coa WITH transfer amount
    ↓
[Update BankTransfer.status=completed, journal_entry_id=created]
    ↓
[GL auto-posts entries]
    ↓
[Display in Completed Transfers, GL reflects movement]
```

### 2.5 User Journey (Frontend)

**Location**: `apps/web/src/features/finance/bank-transfer/`

#### Create Transfer Flow
```
Bank Transfers List
    ↓ (Click "Create Transfer")
Transfer Form
    ├─ Select: From Account, To Account
    ├─ Input: Amount, Date, Reference
    ├─ Optional: Description
    ├─ [Form validates currency match real-time]
    ↓ (Submit)
[API] POST /api/bank-transfers
    ↓ (Success)
Transfer created with status=pending
    ├─ Display confirmation
    ├─ Show "Complete Transfer" button
    └─ Show transfer details card
```

#### Complete Transfer Flow
```
Bank Transfers List (Pending tab)
    ↓ (Select pending transfer)
Transfer Detail Page
    ├─ Account info
    ├─ Amount & date
    ├─ Status badge (Pending)
    ↓ (Click "Complete")
Confirmation Dialog
    ├─ Confirm account match
    ├─ Confirm amount
    ↓ (Confirm)
[API] POST /api/bank-transfers/:id/complete
    ↓ (Journal entry created auto)
Transfer status updates to "completed"
    ├─ Show GL entry reference
    └─ GL now shows movement
```

#### Cancel Transfer Flow
```
Transfer Detail Page (Pending)
    ↓ (Click "Cancel")
Cancel Reason Dialog
    ├─ Input: Reason
    ↓ (Submit)
[API] POST /api/bank-transfers/:id/cancel
    ↓
Transfer status updates to "cancelled"
    ├─ Reason recorded
    └─ Removed from pending list
```

### 2.6 API Endpoints

| Method | Endpoint | Permission | Purpose |
|--------|----------|-----------|---------|
| GET | `/api/bank-transfers` | `bank_transfer.read` | List all (pagination, filters) |
| POST | `/api/bank-transfers` | `bank_transfer.write` | Create transfer |
| GET | `/api/bank-transfers/:id` | `bank_transfer.read` | Get details |
| POST | `/api/bank-transfers/:id/complete` | `bank_transfer.write` | Complete & post GL |
| POST | `/api/bank-transfers/:id/cancel` | `bank_transfer.cancel` | Cancel transfer |

**Query Parameters** (List):
- `page`, `per_page` (pagination)
- `company_id` (filter)
- `from_bank_account_id` (filter)
- `to_bank_account_id` (filter)
- `status` (filter: pending, completed, cancelled)
- `date_from`, `date_to` (date range)
- `search` (reference/description)
- `sort_by`, `sort_dir` (asc/desc)

### 2.7 Triggers

**Create Bank Transfer**:
- ✅ Validate both accounts exist and active
- ✅ Validate same company
- ✅ Validate same currency
- ✅ Validate both linked to COA
- ✅ Validate amount > 0
- ✅ Validate date not in future
- ✅ Generate transfer_number
- ❌ NO GL posting yet (pending)

**Complete Bank Transfer**:
- ✅ Validate status = pending
- ✅ Create GL entry with 2 lines
  - DEBIT: to_account_coa with amount
  - CREDIT: from_account_coa with amount
- ✅ Update status to completed
- ✅ Record journal_entry_id
- ✅ GL auto-posts
- ❌ Cannot be undone (see Cash Bank Transactions for reversal)

**Cancel Bank Transfer**:
- ✅ Validate status = pending
- ✅ Update status to cancelled
- ✅ Record cancellation reason
- ✅ Remove from pending list
- ❌ No GL impact

---

## BANK RECONCILIATION

### 3.1 Business Logic

**Purpose**: Match bank statement lines with accounting transactions to verify cash balances.

**Key Features**:
- Import bank statements (CSV, MT940, OFX formats)
- Auto-match statement lines with cash transactions
- Manual matching for unmatched lines
- Exclude non-operational statement lines
- Calculate difference (statement balance vs book balance)
- Lock period once reconciled

**Business Rules**:
- One reconciliation per bank account per statement date
- Statement date cannot be in future
- Auto-match uses date + amount heuristics
- All lines must be matched/excluded before confirming
- Once locked, period cannot be modified
- Difference must be zero to confirm (or explicitly approved)
- Only active accounts can be reconciled

### 3.2 Data Models

#### Table: `bank_reconciliations`
**Location**: `apps/api/internal/finance/data/models/bank_reconciliation.go`

| Column | Type | Nullable | Key | Description |
|--------|------|----------|-----|-------------|
| id | uuid | NO | PK | Unique identifier |
| tenant_id | uuid | YES | INDEX | Tenant isolation |
| company_id | uuid | NO | INDEX | Company context |
| bank_account_id | uuid | NO | INDEX | Target bank account |
| statement_date | date | NO | INDEX | Bank statement date |
| statement_balance | numeric(20,4) | NO | - | Bank's ending balance |
| book_balance | numeric(20,4) | NO | - | Accounting balance |
| difference | numeric(20,4) | NO | - | statement - book |
| file_format | varchar(10) | NO | - | csv, mt940, ofx |
| file_name | varchar(255) | YES | - | Upload filename |
| status | varchar(20) | NO | INDEX | in_progress, reconciled, locked |
| created_by | uuid | YES | - | Creator |
| reconciled_by | uuid | YES | - | Confirmer |
| locked_by | uuid | YES | - | Locker |
| reconciled_at | timestamp | YES | - | Confirmation time |
| locked_at | timestamp | YES | - | Lock time |
| created_at | timestamp | NO | - | Creation |
| updated_at | timestamp | NO | INDEX | Last update |
| deleted_at | timestamp | YES | INDEX | Soft delete |

**Relations**:
- Has many `BankStatementLine` (lines with status tracking)

#### Table: `bank_statement_lines`
**Location**: `apps/api/internal/finance/data/models/bank_reconciliation.go`

| Column | Type | Nullable | Key | Description |
|--------|------|----------|-----|-------------|
| id | uuid | NO | PK | Unique identifier |
| bank_reconciliation_id | uuid | NO | FK | Parent reconciliation |
| date | date | NO | INDEX | Transaction date |
| reference | varchar(120) | YES | - | Bank reference |
| description | text | YES | - | Transaction description |
| amount | numeric(20,4) | NO | - | Amount |
| direction | varchar(10) | NO | - | debit, credit |
| status | varchar(20) | NO | INDEX | unmatched, auto_matched, manual_matched, excluded |
| matched_with_transaction_id | uuid | YES | FK | CashBankTransaction matched |
| exclude_reason | text | YES | - | Why line excluded |
| created_at | timestamp | NO | - | Creation |
| updated_at | timestamp | NO | INDEX | Update |

### 3.3 Data Relations

```
BankReconciliation
├── company_id → Organization.id
├── bank_account_id → BankAccount.id
└── lines: BankStatementLine[]
    └── matched_with_transaction_id → CashBankTransaction.id

Inverse:
└── BankStatementLine.bank_reconciliation_id
```

### 3.4 Data Journey

```
[Open Bank Reconciliation]
    ↓
[Click "Import Statement"]
    ↓
[Upload bank statement file + select format]
    ↓
[Parse file (CSV/MT940/OFX)]
    ↓
[Create BankReconciliation record with status=in_progress]
    ↓
[Create BankStatementLine records (status=unmatched)]
    ↓
[Calculate book_balance from posted transactions]
    ↓
[Auto-Match Process]
    ├─ Match by date + amount ± tolerance
    ├─ Update matched lines status=auto_matched
    ├─ Link matched_with_transaction_id
    └─ Calculate remaining difference
    ↓
[Manual Matching Interface]
    ├─ User views unmatched lines
    ├─ Selects matching transaction
    ├─ Updates status=manual_matched
    └─ Matches are recorded
    ↓
[Exclusion Interface]
    ├─ User reviews unmatched lines
    ├─ Marks as non-operational
    ├─ Excludes with reason
    └─ Status=excluded
    ↓
[User confirms reconciliation]
    ├─ Validates all lines matched/excluded
    ├─ Verifies difference = 0 or approved
    ├─ Updates status=reconciled
    └─ Records reconciled_by, reconciled_at
    ↓
[Optional: Lock Period]
    ├─ Updates status=locked
    ├─ Records locked_by, locked_at
    └─ Period becomes immutable
```

### 3.5 User Journey (Frontend)

**Location**: `apps/web/src/features/finance/bank-reconciliation/`

#### Import Statement Flow
```
Bank Reconciliation List
    ↓ (Click "Import Statement")
Import Dialog
    ├─ Select bank account
    ├─ Select statement date
    ├─ Select file format (CSV/MT940/OFX)
    ├─ Upload file
    ├─ Optional: Enter statement balance
    ↓ (Submit)
[API] POST /api/bank-reconciliations/import
    ↓
Redirect to Reconciliation Detail
    ├─ Status: in_progress
    ├─ Shows statement lines
    ├─ Displays book balance
    ├─ Shows difference calculation
    └─ Auto-matched count badge
```

#### Auto-Match Flow
```
Reconciliation Detail
    ├─ View uploaded statement lines
    ├─ See auto-matched indicators
    ↓ (Click "Auto-Match")
[API] POST /api/bank-reconciliations/:id/auto-match
    ↓
Statement lines updated
    ├─ Matched lines marked as "auto_matched"
    ├─ Unmatched lines remain
    ├─ Difference recalculated
    └─ User notified of match count
```

#### Manual Match Flow
```
Unmatched Lines Section
    ↓ (Click unmatched line)
Match Dialog
    ├─ Shows statement line details:
    │  ├─ Date, reference, amount
    │  ├─ Description
    │  └─ Direction (debit/credit)
    ├─ Shows available transactions:
    │  ├─ Posted transactions from ~30 days
    │  ├─ Matching amount ± tolerance
    │  └─ Same direction
    ↓ (Select transaction)
[API] POST /api/bank-reconciliations/:id/line/:line_id/match
    ↓
Line status updates to "manual_matched"
    ├─ Matched transaction ID recorded
    └─ Difference recalculated
```

#### Exclude Line Flow
```
Unmatched Lines Section
    ↓ (Click unmatched line)
Exclude Dialog
    ├─ Input: Exclude reason
    │  └─ (Bank fees, adjustment, etc)
    ↓ (Submit)
[API] POST /api/bank-reconciliations/:id/line/:line_id/exclude
    ↓
Line status updates to "excluded"
    ├─ Reason recorded
    └─ Difference recalculated
```

#### Confirm Reconciliation Flow
```
Reconciliation Detail
    ├─ All lines: matched/excluded ✓
    ├─ Difference: $0 ✓
    ↓ (Click "Confirm Reconciliation")
Confirmation Dialog
    ├─ Summary:
    │  ├─ Statement date
    │  ├─ Statement balance
    │  ├─ Book balance
    │  ├─ Matched count
    │  └─ Excluded count
    ↓ (Confirm)
[API] POST /api/bank-reconciliations/:id/confirm
    ↓
Status updates to "reconciled"
    ├─ Reconciled date & user recorded
    ├─ Can proceed to lock period
    └─ Display lock option
```

#### Lock Period Flow
```
Reconciliation Detail (Reconciled)
    ↓ (Click "Lock Period")
Lock Dialog
    ├─ Confirmation message
    ↓ (Confirm)
[API] POST /api/bank-reconciliations/:id/lock
    ↓
Status updates to "locked"
    ├─ Locked date & user recorded
    ├─ Period becomes immutable
    └─ Show locked badge
```

### 3.6 API Endpoints

| Method | Endpoint | Permission | Purpose |
|--------|----------|-----------|---------|
| GET | `/api/bank-reconciliations` | `bank_reconciliation.read` | List with filters |
| GET | `/api/bank-reconciliations/form-data` | `bank_reconciliation.read` | Form options |
| POST | `/api/bank-reconciliations/import` | `bank_reconciliation.write` | Import statement |
| GET | `/api/bank-reconciliations/:id` | `bank_reconciliation.read` | Get details |
| POST | `/api/bank-reconciliations/:id/auto-match` | `bank_reconciliation.write` | Run auto-match |
| POST | `/api/bank-reconciliations/:id/line/:line_id/match` | `bank_reconciliation.write` | Manual match line |
| POST | `/api/bank-reconciliations/:id/line/:line_id/exclude` | `bank_reconciliation.write` | Exclude line |
| POST | `/api/bank-reconciliations/:id/confirm` | `bank_reconciliation.reconcile` | Confirm reconciliation |
| POST | `/api/bank-reconciliations/:id/lock` | `bank_reconciliation.lock` | Lock period |

### 3.7 Triggers

**Import Statement**:
- ✅ Validate bank account exists and active
- ✅ Validate statement date not in future
- ✅ Validate file format supported
- ✅ Parse file and create statement lines
- ✅ Create reconciliation record
- ✅ Fetch book balance from GL
- ❌ No GL posting

**Auto-Match**:
- ✅ Find posted cash transactions for date range
- ✅ Match by date + amount within tolerance
- ✅ Update matched_with_transaction_id
- ✅ Update line status to auto_matched
- ✅ Recalculate difference

**Manual Match**:
- ✅ Validate statement line exists
- ✅ Validate transaction exists and posted
- ✅ Validate amount matches
- ✅ Update matched_with_transaction_id
- ✅ Update line status to manual_matched
- ✅ Recalculate difference

**Exclude Line**:
- ✅ Validate line exists
- ✅ Validate reason provided
- ✅ Update status to excluded
- ✅ Record exclusion reason
- ✅ Recalculate difference

**Confirm Reconciliation**:
- ✅ Validate all lines matched/excluded
- ✅ Validate difference = 0 (or allow override)
- ✅ Update status to reconciled
- ✅ Record reconciled_by, reconciled_at
- ✅ Trigger audit log
- ❌ No GL posting (GL already has transactions)

**Lock Period**:
- ✅ Validate status = reconciled
- ✅ Update status to locked
- ✅ Record locked_by, locked_at
- ✅ Prevent any future edits to reconciliation
- ✅ Prevent transactions on earlier dates (optional policy)

---

## CASH BANK TRANSACTIONS

### 4.1 Business Logic

**Purpose**: Record operational cash/bank inflows and outflows with automatic GL posting.

**Key Features**:
- Record payment inflows (payment_in) and outflows (payment_out)
- Auto-post to GL with contra-account mapping
- Support transaction reversal for corrections
- Track attachment documents
- Workflow: Draft → Posted → (Reversed or Historical)
- Real-time GL balance updates

**Business Rules**:
- Type must be: payment_in or payment_out
- Amount must be > 0
- Date cannot be in future
- Contra account must be specified (debit/credit account)
- Auto-post flag determines immediate GL posting
- Posted transactions can only be reversed (not edited)
- Reversals create offset transaction
- Only active bank accounts eligible
- Account must be linked to COA

### 4.2 Data Model

#### Table: `cash_bank_transactions`
**Location**: `apps/api/internal/finance/data/models/cash_bank_transaction.go`

| Column | Type | Nullable | Key | Description |
|--------|------|----------|-----|-------------|
| id | uuid | NO | PK | Unique identifier |
| tenant_id | uuid | YES | INDEX | Tenant isolation |
| company_id | uuid | NO | INDEX | Company context |
| bank_account_id | uuid | NO | INDEX | Bank account used |
| reference_number | varchar(40) | NO | INDEX | Auto-generated reference |
| type | varchar(20) | NO | INDEX | payment_in, payment_out |
| date | date | NO | INDEX | Transaction date |
| amount | numeric(20,4) | NO | - | Transaction amount |
| reference | varchar(120) | YES | - | External reference |
| description | text | YES | - | Notes/memo |
| contra_account_id | uuid | YES | FK | Debit/credit account |
| journal_entry_id | uuid | YES | FK | GL posting reference |
| status | varchar(20) | NO | INDEX | draft, posted, reversed |
| reverse_of_id | uuid | YES | FK | If reversal, points to original |
| reversed_by_id | uuid | YES | FK | If reversed, points to reversal |
| attachment_url | text | YES | - | Document/receipt URL |
| created_by | uuid | YES | - | Creator |
| updated_by | uuid | YES | - | Last editor |
| created_at | timestamp | NO | - | Creation |
| updated_at | timestamp | NO | INDEX | Last update |
| deleted_at | timestamp | YES | INDEX | Soft delete |

### 4.3 Data Relations

```
CashBankTransaction
├── company_id → Organization.id
├── bank_account_id → BankAccount.id
├── contra_account_id → ChartOfAccount.id
├── journal_entry_id → JournalEntry.id [GL Entry]
│   └── JournalEntry.lines[0]: Bank account debit/credit
│   └── JournalEntry.lines[1]: Contra account debit/credit
├── reverse_of_id → CashBankTransaction.id (if reversal)
└── reversed_by_id → CashBankTransaction.id (if reversed)

[Journal Entry Detail]
JournalEntry
├── lines[0]:
│   ├─ ChartOfAccountID: bank_account.chart_of_account_id
│   ├─ Debit: amount (if payment_in)
│   ├─ Credit: 0
│   └─ ReferenceType: "cash_bank"
├── lines[1]:
│   ├─ ChartOfAccountID: contra_account_id
│   ├─ Debit: 0
│   ├─ Credit: amount (if payment_in)
│   └─ ReferenceType: "cash_bank"
└── ReferenceID: transaction.id
```

### 4.4 Data Journey

```
[Create Cash Bank Transaction]
    ↓
[Input: Type, Amount, Date, Contra Account, Attachment]
    ↓
[Validate bank account active, COA linked]
    ↓
[Validate contra account exists]
    ↓
[Generate reference_number]
    ↓
[Insert with status=draft]
    ↓
[Check auto_post flag]
    ├─ If auto_post=true:
    │  ├─ Create Journal Entry with 2 lines
    │  │  ├─ Line 1: DEBIT bank_coa (if payment_in) or CREDIT bank_coa (if payment_out)
    │  │  └─ Line 2: CREDIT contra_coa (if payment_in) or DEBIT contra_coa (if payment_out)
    │  ├─ Update status=posted
    │  ├─ Record journal_entry_id
    │  └─ GL auto-posts and updates balances
    └─ If auto_post=false:
       └─ Status remains draft (manual posting needed)
    ↓
[Transaction available in list & reconciliation]
```

#### Payment_In Example (Auto-post)
```
Input: payment_in, amount=1,000,000, bank=Bank A, contra=AR

Journal Entry (Auto-created):
  Line 1: DEBIT Bank A COA = 1,000,000
  Line 2: CREDIT AR COA = 1,000,000

GL Impact:
  Bank A: +1,000,000
  AR: -1,000,000
```

#### Payment_Out Example (Auto-post)
```
Input: payment_out, amount=500,000, bank=Bank A, contra=AP

Journal Entry (Auto-created):
  Line 1: DEBIT AP COA = 500,000
  Line 2: CREDIT Bank A COA = 500,000

GL Impact:
  AP: -500,000
  Bank A: -500,000
```

### 4.5 User Journey (Frontend)

**Location**: `apps/web/src/features/finance/cash-bank-transactions/`

#### Create Transaction Flow
```
Cash Bank Transactions List
    ↓ (Click "Record Transaction")
Transaction Form
    ├─ Select: Bank Account
    ├─ Select: Type (Payment In / Payment Out)
    ├─ Input: Amount, Date, Reference
    ├─ Select: Contra Account (AR, AP, COA, etc)
    ├─ Optional: Description, Attachment
    ├─ Checkbox: Auto-post to GL
    ↓ (Submit)
[API] POST /api/cash-bank-transactions
    ↓ (if auto_post)
Journal entry created and GL posted
    ↓
Transaction detail page
    ├─ Status: Posted (if auto_post)
    ├─ GL entry reference
    └─ Reverse option available
```

#### View Form Data
```
[API] GET /api/cash-bank-transactions/form-data
    ↓ (Returns)
{
  bank_accounts: [
    { id, code, name, account_number },
    ...
  ],
  transaction_types: [
    { value: "payment_in", label: "Payment In" },
    { value: "payment_out", label: "Payment Out" }
  ],
  contra_accounts: [
    { id, code, name, type },
    ...
  ]
}
```

#### List & Filter
```
Cash Bank Transactions List
├─ Table columns:
│  ├─ Reference Number
│  ├─ Date
│  ├─ Type (Payment In/Out)
│  ├─ Bank Account
│  ├─ Amount
│  ├─ Status (Draft/Posted/Reversed)
│  └─ Actions (View/Edit/Reverse)
├─ Filters:
│  ├─ Date range
│  ├─ Bank account
│  ├─ Transaction type
│  ├─ Status
│  └─ Search
└─ Pagination
```

#### Reverse Transaction Flow
```
Transaction Detail (Posted)
    ├─ View entry details
    ├─ See GL entry reference
    ↓ (Click "Reverse Transaction")
Reverse Dialog
    ├─ Input: Reason (optional)
    ├─ Show offset amounts
    ↓ (Confirm)
[API] POST /api/cash-bank-transactions/:id/reverse
    ↓
System:
  ├─ Creates reversal journal entry (opposite signs)
  ├─ Creates reversal transaction record
  ├─ Updates original transaction status=reversed
  ├─ Links reverse_of_id and reversed_by_id
  └─ GL entries posted, balances offset
    ↓
Redirect to reversal transaction
    ├─ Show status: Posted (reversal)
    ├─ Show it reversed original transaction
    └─ Cannot reverse reversal
```

### 4.6 API Endpoints

| Method | Endpoint | Permission | Purpose |
|--------|----------|-----------|---------|
| GET | `/api/cash-bank-transactions` | `cash_bank_transaction.read` | List with filters |
| GET | `/api/cash-bank-transactions/form-data` | `cash_bank_transaction.read` | Form options |
| POST | `/api/cash-bank-transactions` | `cash_bank_transaction.write` | Create transaction |
| GET | `/api/cash-bank-transactions/:id` | `cash_bank_transaction.read` | Get details |
| POST | `/api/cash-bank-transactions/:id/reverse` | `cash_bank_transaction.reverse` | Reverse transaction |

**Query Parameters** (List):
- `page`, `per_page` (pagination)
- `company_id` (filter)
- `bank_account_id` (filter)
- `type` (filter: payment_in, payment_out)
- `status` (filter: draft, posted, reversed)
- `date_from`, `date_to` (date range)
- `search` (reference)
- `sort_by`, `sort_dir` (asc/desc)

### 4.7 Triggers

**Create Cash Bank Transaction**:
- ✅ Validate bank account exists, active, linked to COA
- ✅ Validate type: payment_in or payment_out
- ✅ Validate amount > 0
- ✅ Validate date not in future
- ✅ Validate contra account exists
- ✅ Generate reference_number
- ✅ If auto_post=true:
  - Create Journal Entry with 2 lines
  - Line 1: Bank account (debit/credit based on type)
  - Line 2: Contra account (opposite)
  - Update status to posted
  - GL auto-posts
- ✅ If auto_post=false:
  - Status remains draft
  - Manual posting via Journal module later

**Reverse Cash Bank Transaction**:
- ✅ Validate status = posted
- ✅ Validate not already reversed
- ✅ Create reversal journal entry (opposite signs)
- ✅ Create reversal transaction record
  - reverse_of_id → original
  - Type flipped (payment_in → payment_out)
  - Status = posted
- ✅ Update original status = reversed
- ✅ Update original reversed_by_id
- ✅ GL auto-posts reversal entry
- ❌ Original transaction cannot be edited

---

## CASH BANK JOURNAL (LEDGER)

### 5.1 Business Logic

**Purpose**: Read-only sub-ledger of all cash and bank movements, auto-generated from operational modules.

**Key Features**:
- Auto-creates entries from cash/bank transactions and transfers
- Tracks bank account snapshot (name, number, currency) at transaction time
- Detailed GL posting per line with COA snapshots
- Reference tracking to source transactions
- Workflow: Draft → Posted (one-way)
- Comprehensive audit trail

**Business Rules**:
- Direct creation via API is DEPRECATED (hardening)
- All entries must originate from:
  - Bank Transfers → auto-creates journal
  - Cash Bank Transactions → auto-creates journal (if auto_post=true)
  - Sales/Purchase modules → flow through GL
- Cannot edit posted entries
- Snapshots prevent data corruption from subsequent master data changes
- Type: cash_in, cash_out, transfer
- Total amount on journal = sum of all lines

### 5.2 Data Models

#### Table: `cash_bank_journals`
**Location**: `apps/api/internal/finance/data/models/cash_bank_journal.go`

| Column | Type | Nullable | Key | Description |
|--------|------|----------|-----|-------------|
| id | uuid | NO | PK | Unique identifier |
| tenant_id | uuid | YES | INDEX | Tenant isolation |
| transaction_date | date | NO | INDEX | Transaction date |
| type | varchar(20) | NO | INDEX | cash_in, cash_out, transfer |
| description | text | YES | - | Transaction description |
| bank_account_id | uuid | NO | INDEX | Bank account |
| bank_account_name_snapshot | varchar(150) | YES | - | Account name at posting |
| bank_account_number_snapshot | varchar(50) | YES | - | Account number at posting |
| bank_account_holder_snapshot | varchar(150) | YES | - | Holder name at posting |
| bank_account_currency_snapshot | varchar(10) | YES | - | Currency at posting |
| total_amount | numeric(18,2) | NO | - | Sum of lines |
| status | varchar(20) | NO | INDEX | draft, posted |
| journal_entry_id | uuid | YES | FK | GL entry reference |
| posted_at | timestamp | YES | - | Posting time |
| posted_by | uuid | YES | - | Posting user |
| created_by | uuid | YES | - | Creator |
| created_at | timestamp | NO | - | Creation |
| updated_at | timestamp | NO | INDEX | Last update |
| deleted_at | timestamp | YES | INDEX | Soft delete |

**Relations**:
- Has many `CashBankJournalLine` (detail lines)

#### Table: `cash_bank_journal_lines`
**Location**: `apps/api/internal/finance/data/models/cash_bank_journal_line.go`

| Column | Type | Nullable | Key | Description |
|--------|------|----------|-----|-------------|
| id | uuid | NO | PK | Unique identifier |
| tenant_id | uuid | YES | INDEX | Tenant isolation |
| cash_bank_journal_id | uuid | NO | FK | Parent journal |
| chart_of_account_id | uuid | NO | FK | GL account |
| chart_of_account_code_snapshot | varchar(50) | YES | - | COA code at posting |
| chart_of_account_name_snapshot | varchar(200) | YES | - | COA name at posting |
| chart_of_account_type_snapshot | varchar(20) | YES | - | COA type at posting |
| reference_type | varchar(50) | YES | - | e.g., "bank_transfer" |
| reference_id | uuid | YES | - | Source transaction ID |
| amount | numeric(18,2) | NO | - | Debit amount (credit stored negative) |
| memo | text | YES | - | Line note |
| created_at | timestamp | NO | - | Creation |
| updated_at | timestamp | NO | INDEX | Update |
| deleted_at | timestamp | YES | INDEX | Soft delete |

### 5.3 Data Relations

```
CashBankJournal
├── bank_account_id → BankAccount.id
├── journal_entry_id → JournalEntry.id [GL Posting]
└── lines: CashBankJournalLine[]
    └── chart_of_account_id → ChartOfAccount.id

[Journal Entry Detail]
JournalEntry (linked to GL)
├── reference_type: "cash_bank"
├── reference_id: cash_bank_journal.id
├── lines[]: Posted to GL
└── Auto-posted balances

CashBankJournal ←← CashBankTransaction
CashBankJournal ←← BankTransfer
```

### 5.4 Data Journey

```
[Cash Bank Transaction Created with auto_post=true]
    ↓
[System creates Journal Entry]
    ↓
[System creates CashBankJournal header]
    ├─ Snapshots current bank account details
    ├─ Sets type based on transaction type
    ├─ Calculates total_amount
    └─ Status=draft initially
    ↓
[System creates CashBankJournalLine for each GL line]
    ├─ Snapshots COA details (code, name, type)
    ├─ Records amount (positive for debit)
    ├─ Links to source transaction
    └─ Creates reference_type="cash_bank"
    ↓
[Update status=posted]
    ├─ Record posted_at, posted_by
    └─ GL entries auto-post, balances update
    ↓
[Cash Bank Journal becomes read-only]
    ├─ Used for reconciliation matching
    ├─ Audit trail reference
    └─ GL integrity preserved via snapshots
```

#### Example: Payment_In Transaction Journal
```
CashBankTransaction (Created)
  type: payment_in
  amount: 1,000,000
  bank_account: Bank A (COA: 1-1-01)
  contra_account: AR (COA: 1-2-01)

CashBankJournal (Auto-created)
  type: cash_in
  description: "Payment received - Invoice #INV-001"
  bank_account_id: bank_a_id
  total_amount: 1,000,000
  status: posted
  journal_entry_id: je_123

CashBankJournalLine (2 lines auto-created)
  Line 1:
    coa: 1-1-01 (Bank A)
    amount: 1,000,000 (debit)
    reference_type: "cash_bank"
    
  Line 2:
    coa: 1-2-01 (AR)
    amount: -1,000,000 (credit)
    reference_type: "cash_bank"

GL Entry (Posted)
  Line 1: DEBIT 1-1-01 Bank A = 1,000,000
  Line 2: CREDIT 1-2-01 AR = 1,000,000
```

### 5.5 User Journey (Frontend)

**Location**: `apps/web/src/features/finance/`

**Note**: Direct cash bank journal creation via UI is deprecated. Users interact with:
- **Cash Bank Transactions** module (creates journal auto)
- **Bank Transfers** module (creates journal auto)
- **Journals** module (read-only view of cash sub-ledger)

#### View Cash Bank Ledger
```
Finance → Journals → Cash Bank Sub-Ledger Tab
    ↓
Cash Bank Ledger List
├─ Table columns:
│  ├─ Transaction Date
│  ├─ Type (Cash In/Out/Transfer)
│  ├─ Bank Account
│  ├─ Amount
│  ├─ GL Entry Reference
│  ├─ Posted By
│  └─ Actions (View Details)
├─ Filters:
│  ├─ Bank account
│  ├─ Transaction type
│  ├─ Date range
│  └─ Posted by user
└─ Pagination

[Click "View Details"]
    ↓
Cash Bank Journal Detail
    ├─ Header:
    │  ├─ Transaction date
    │  ├─ Type
    │  ├─ Bank account snapshot
    │  ├─ Total amount
    │  └─ Status (Posted)
    ├─ Lines table:
    │  ├─ COA code/name
    │  ├─ Amount (debit/credit)
    │  ├─ Memo
    │  └─ Source reference
    └─ GL Entry Link (click-through to GL entry detail)
```

### 5.6 API Endpoints

| Method | Endpoint | Permission | Purpose |
|--------|----------|-----------|---------|
| GET | `/api/cash-bank` | `cash_bank.read` | List journals |
| GET | `/api/cash-bank/form-data` | `cash_bank.read` | Form options |
| GET | `/api/cash-bank/:id` | `cash_bank.read` | Get journal detail |
| GET | `/api/cash-bank/:id/lines` | `cash_bank.read` | Get journal lines |
| POST | `/api/cash-bank` | DEPRECATED | ❌ Use Banking & Payments |
| PUT | `/api/cash-bank/:id` | DEPRECATED | ❌ Use Banking & Payments |
| DELETE | `/api/cash-bank/:id` | DEPRECATED | ❌ Use Banking & Payments |

**Note**: Write endpoints return HTTP 405 with deprecation notice directing users to operational modules.

### 5.7 Triggers

**Auto-Create from Bank Transfer**:
- ✅ When BankTransfer.status = completed
- ✅ Journal Entry already posted by transfer usecase
- ✅ Create CashBankJournal with type=transfer
- ✅ Snapshot bank accounts on both sides
- ✅ Create 2 lines per journal entry
- ✅ Status = posted
- ❌ Cannot be edited

**Auto-Create from Cash Bank Transaction (auto_post=true)**:
- ✅ When CashBankTransaction created with auto_post=true
- ✅ Journal Entry already posted by transaction usecase
- ✅ Create CashBankJournal with type=cash_in or cash_out
- ✅ Snapshot bank account details
- ✅ Create lines per GL entry
- ✅ Status = posted
- ❌ Cannot be edited

---

## DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CASH & BANK DATA FLOWS                            │
└─────────────────────────────────────────────────────────────────────────┘

1. BANK ACCOUNTS (Master Data)
   ┌──────────────────┐
   │ Bank Accounts    │
   │ (bank_accounts)  │
   └────────┬─────────┘
            │
            ├─→ Used by Bank Transfers
            ├─→ Used by Bank Reconciliation
            ├─→ Used by Cash Bank Transactions
            └─→ Snapshots to Cash Bank Journal

2. BANK TRANSFERS (Inter-account movement)
   ┌──────────────────────────────────────────────────────┐
   │ Create Bank Transfer (Pending)                        │
   │ ├─ From Account: BankAccount.id                       │
   │ └─ To Account: BankAccount.id                         │
   └─────────────────┬──────────────────────────────────────┘
                     │
                ┌────▼────────────────────┐
                │ Complete Bank Transfer  │
                │ (Status: Completed)     │
                │ └─→ Create Journal      │
                │     Entry (2 lines)     │
                └────┬───────────────────┘
                     │
         ┌───────────┴──────────────┐
         │                          │
    ┌────▼─────────────┐    ┌──────▼──────────────┐
    │ General Ledger   │    │ Cash Bank Journal   │
    │ (JournalEntry)   │    │ (cash_bank_journals)│
    │ ├─ DEBIT To      │    │ ├─ Type: Transfer   │
    │ └─ CREDIT From   │    │ ├─ 2 Lines         │
    └──────────────────┘    │ └─ Status: Posted  │
                            └────────────────────┘

3. BANK RECONCILIATION (Statement matching)
   ┌──────────────────────────────────┐
   │ Import Bank Statement            │
   │ (bank_reconciliations)           │
   │ ├─ Statement Date & Balance      │
   │ ├─ File Format (CSV/MT940/OFX)   │
   │ └─ Create statement lines        │
   └─────────────┬────────────────────┘
                 │
                 ├─→ Fetch Book Balance from GL
                 │
        ┌────────▼──────────────┐
        │ Auto-Match Process    │
        │ ├─ Match by Date+Amt  │
        │ ├─ Link to CashBank   │
        │ │  Transactions       │
        │ └─ Update status      │
        └────────┬──────────────┘
                 │
        ┌────────▼──────────────┐
        │ Manual Matching       │
        │ (User selects tx)     │
        │ └─→ Update line status│
        └────────┬──────────────┘
                 │
        ┌────────▼──────────────┐
        │ Confirm Reconciliation│
        │ ├─ Validate all lines │
        │ │  matched/excluded   │
        │ └─ Update status:     │
        │    reconciled/locked  │
        └───────────────────────┘

4. CASH BANK TRANSACTIONS (Operational inflows/outflows)
   ┌────────────────────────────────────┐
   │ Create Cash Bank Transaction       │
   │ (cash_bank_transactions)           │
   │ ├─ Type: payment_in or payment_out │
   │ ├─ Amount, Date, Contra Account    │
   │ └─ auto_post flag                  │
   └─────────────┬──────────────────────┘
                 │
         ┌───────┴──────────────┐
         │ auto_post = true?    │
         └───────┬──────────────┘
                 │
         ┌───────▼────────────────────┐
         │ Create Journal Entry (2L)  │
         │ ├─ Line 1: Bank Account    │
         │ └─ Line 2: Contra Account  │
         └───────┬────────────────────┘
                 │
    ┌────────────┴──────────────┐
    │ Update Status: Posted     │
    └────────┬───────────────────┘
             │
    ┌────────▼──────────────────────────┐
    │ Create Cash Bank Journal Auto     │
    │ (cash_bank_journals)              │
    │ ├─ Type: cash_in or cash_out      │
    │ ├─ Snapshot Bank Account Details  │
    │ ├─ 2 Lines with COA Snapshots     │
    │ └─ Status: Posted                 │
    └────────┬──────────────────────────┘
             │
    ┌────────▼──────────────────────┐
    │ Potential: Reverse             │
    │ ├─ Create Offset Journal       │
    │ ├─ Create Reversal Transaction │
    │ └─ Update: reversed_by, etc    │
    └────────────────────────────────┘

5. INTEGRATION: GL Balance Impact
   ┌──────────────────────────────────┐
   │ Journal Entry Posted to GL       │
   │ ├─ From: Bank Transfer / CashTx  │
   │ ├─ Lines posted to GL            │
   │ └─ Balances updated in real-time │
   └──────────────────────────────────┘

6. CASH BANK JOURNAL (Ledger, read-only)
   ┌────────────────────────────────────┐
   │ Cash Bank Journal Sub-Ledger       │
   │ (cash_bank_journals +             │
   │  cash_bank_journal_lines)         │
   │                                    │
   │ ├─ Auto-created from transfers    │
   │ ├─ Auto-created from transactions │
   │ ├─ Snapshots preserve data        │
   │ ├─ Reference to GL entries        │
   │ └─ Used for reconciliation audit  │
   └────────────────────────────────────┘
```

---

## TRIGGERS & EVENTS

### Global Triggers

#### 1. Bank Account Triggers

**On Create Bank Account**:
```go
// Validate
  - Company exists
  - COA exists (if provided)
  - Currency exists
  - Code unique per company

// Create
  - Insert bank_accounts record
  
// Events
  - AuditLog: BANK_ACCOUNT_CREATED
  - No GL posting
```

**On Update Bank Account**:
```go
// Validate
  - Cannot change code if transactions exist
  - Can update COA if no transactions
  
// Update
  - Update record
  - Don't snapshot existing journals
  
// Events
  - AuditLog: BANK_ACCOUNT_UPDATED
```

**On Deactivate Bank Account**:
```go
// Validate
  - No pending transactions exist
  
// Update
  - is_active = false
  
// Events
  - AuditLog: BANK_ACCOUNT_DEACTIVATED
```

---

#### 2. Bank Transfer Triggers

**On Create Bank Transfer**:
```go
// Validate
  - from_account exists, active, linked to COA
  - to_account exists, active, linked to COA
  - Same company
  - Same currency
  - Amount > 0
  - Date not in future

// Generate
  - transfer_number (auto-sequence per company/date)

// Create
  - Insert bank_transfers record
  - Status = pending

// Events
  - AuditLog: BANK_TRANSFER_CREATED
  - No GL posting yet
```

**On Complete Bank Transfer**:
```go
// Validate
  - Status = pending
  - Both accounts still active
  - Both linked to COA

// Create GL Entry
  - JournalEntry with 2 lines:
    ├─ Line 1: DEBIT to_account_coa = amount
    └─ Line 2: CREDIT from_account_coa = amount
  - reference_type = "bank_transfer"
  - reference_id = transfer.id

// Update Transfer
  - Status = completed
  - journal_entry_id = created_entry.id

// Create Sub-Ledger
  - CashBankJournal (type = transfer)
  - Lines with snapshots
  - Status = posted

// Events
  - AuditLog: BANK_TRANSFER_COMPLETED
  - GL balances updated automatically
```

**On Cancel Bank Transfer**:
```go
// Validate
  - Status = pending (only pending can cancel)

// Update
  - Status = cancelled
  - Record reason

// Events
  - AuditLog: BANK_TRANSFER_CANCELLED
  - No GL impact
```

---

#### 3. Bank Reconciliation Triggers

**On Import Bank Statement**:
```go
// Validate
  - Bank account exists, active
  - Statement date not in future
  - File format supported (CSV/MT940/OFX)

// Parse File
  - Extract statement lines
  - Calculate differences

// Create
  - BankReconciliation record (status = in_progress)
  - BankStatementLine records (status = unmatched)

// Fetch GL
  - book_balance from GL for account/date

// Calculate
  - difference = statement_balance - book_balance

// Events
  - AuditLog: BANK_RECONCILIATION_IMPORTED
  - No GL posting
```

**On Auto-Match**:
```go
// Find Transactions
  - Posted cash bank txns for date range ±30 days
  - Matching amount ± tolerance
  - Same direction (debit/credit)

// Match Logic
  - For each potential match:
    ├─ Date difference < 3 days
    ├─ Amount difference < $1 or 0.1%
    └─ Direction matches

// Update Lines
  - BankStatementLine.status = auto_matched
  - matched_with_transaction_id = txn.id

// Recalculate
  - difference

// Events
  - AuditLog: BANK_RECONCILIATION_AUTO_MATCHED
  - Notification: X lines matched automatically
```

**On Manual Match Line**:
```go
// Validate
  - Statement line exists, unmatched
  - Transaction exists, posted
  - Amounts match (or within tolerance)

// Match
  - Update BankStatementLine:
    ├─ status = manual_matched
    └─ matched_with_transaction_id = txn.id

// Recalculate
  - difference

// Events
  - AuditLog: BANK_STATEMENT_LINE_MATCHED
```

**On Exclude Line**:
```go
// Validate
  - Statement line exists
  - Reason provided

// Exclude
  - Update BankStatementLine:
    ├─ status = excluded
    └─ exclude_reason = provided_reason

// Recalculate
  - difference

// Events
  - AuditLog: BANK_STATEMENT_LINE_EXCLUDED
```

**On Confirm Reconciliation**:
```go
// Validate
  - All lines: matched or excluded
  - Difference = 0 (or override allowed)
  - No conflicting locks

// Update
  - Status = reconciled
  - reconciled_by = user_id
  - reconciled_at = now()

// Events
  - AuditLog: BANK_RECONCILIATION_CONFIRMED
  - Notification: Reconciliation confirmed
  - No GL posting (GL entries already exist)
```

**On Lock Period**:
```go
// Validate
  - Status = reconciled
  - No transactions on earlier dates pending

// Lock
  - Status = locked
  - locked_by = user_id
  - locked_at = now()

// Events
  - AuditLog: BANK_RECONCILIATION_LOCKED
  - Period becomes immutable
  - Prevent future edits to this period
```

---

#### 4. Cash Bank Transaction Triggers

**On Create Cash Bank Transaction**:
```go
// Validate
  - bank_account exists, active, linked to COA
  - type = payment_in or payment_out
  - amount > 0
  - date not in future
  - contra_account exists

// Generate
  - reference_number (auto-sequence per company/type/date)

// Create
  - Insert cash_bank_transactions record
  - Status = draft

// Check auto_post flag
  if auto_post == true:
    // Create GL Entry
    if type == payment_in:
      - Line 1: DEBIT bank_coa = amount
      - Line 2: CREDIT contra_coa = amount
    else if type == payment_out:
      - Line 1: DEBIT contra_coa = amount
      - Line 2: CREDIT bank_coa = amount
    
    // Update Transaction
    - Status = posted
    - journal_entry_id = created_entry.id
    
    // Create Sub-Ledger
    - CashBankJournal (type = cash_in or cash_out)
    - Lines with snapshots
    - Status = posted
    
    // GL Impact
    - Balances updated

// Events
  - AuditLog: CASH_BANK_TRANSACTION_CREATED
  - If posted: GL entries visible immediately
  - Available for reconciliation matching
```

**On Reverse Cash Bank Transaction**:
```go
// Validate
  - Status = posted (only posted can reverse)
  - Not already reversed

// Create GL Entry (Reversal)
  - Opposite signs from original
  - reference_type = "cash_bank"
  - reference_id = original.id

// Create Reversal Transaction
  - Type = flipped (payment_in → payment_out)
  - reverse_of_id = original.id
  - Status = posted
  - journal_entry_id = reversal_entry.id

// Update Original Transaction
  - Status = reversed
  - reversed_by_id = reversal.id

// Create Sub-Ledger Entry
  - CashBankJournal for reversal
  - With reference to original

// GL Impact
  - Reversal entry posted
  - Balances offset back to zero

// Events
  - AuditLog: CASH_BANK_TRANSACTION_REVERSED
  - Notification: Transaction reversed successfully
```

---

#### 5. Cash Bank Journal Triggers

**On Auto-Create from Bank Transfer** (when status = completed):
```go
// Snapshot Bank Accounts
  - bank_account_name_snapshot
  - bank_account_number_snapshot
  - bank_account_holder_snapshot
  - bank_account_currency_snapshot

// Create Journal
  - type = transfer
  - total_amount = transfer.amount

// Create Lines (2)
  - Line 1: from_account_coa (credit snapshot)
  - Line 2: to_account_coa (debit snapshot)

// Update Status
  - posted = true
  - posted_by = system/user

// Events
  - AuditLog: CASH_BANK_JOURNAL_CREATED
  - Sub-ledger entry available for audit
```

**On Auto-Create from Cash Bank Transaction** (when auto_post = true):
```go
// Snapshot Bank Account
  - bank_account_name_snapshot
  - bank_account_number_snapshot
  - bank_account_holder_snapshot
  - bank_account_currency_snapshot

// Create Journal
  - type = cash_in or cash_out
  - total_amount = transaction.amount

// Create Lines (from GL entry)
  - Snapshot each COA:
    ├─ chart_of_account_code_snapshot
    ├─ chart_of_account_name_snapshot
    └─ chart_of_account_type_snapshot
  - Link reference_type = "cash_bank"
  - Link reference_id = transaction.id

// Update Status
  - posted = true
  - posted_by = system/user

// Events
  - AuditLog: CASH_BANK_JOURNAL_CREATED
  - Sub-ledger entry available for reconciliation
```

---

## SUMMARY TABLE: Objects & Actions

| Object | Create | Read | Update | Delete | Post | Reverse | Lock |
|--------|--------|------|--------|--------|------|---------|------|
| **Bank Account** | ✅ | ✅ | ✅ | ✅ Soft | — | — | Deactivate |
| **Bank Transfer** | ✅ Draft | ✅ | ❌ (if posted) | ❌ | ✅ Complete | — | Cancel |
| **Bank Reconciliation** | ✅ | ✅ | ✅ (draft) | ❌ | — | — | ✅ Lock |
| **Statement Line** | Auto | ✅ | ✅ Match | — | — | — | — |
| **Cash Bank Txn** | ✅ | ✅ | ❌ (if posted) | ❌ | ✅ Auto | ✅ Reverse | — |
| **Bank Journal** | Auto | ✅ | ❌ | ❌ | Auto | — | — |
| **Journal Line** | Auto | ✅ | ❌ | ❌ | Auto | — | — |

---

## MODULE ARCHITECTURE

```
apps/api/internal/finance/
├── data/
│   ├── models/
│   │   ├── bank_transfer.go
│   │   ├── bank_reconciliation.go
│   │   ├── cash_bank_transaction.go
│   │   ├── cash_bank_journal.go
│   │   └── cash_bank_journal_line.go
│   └── repositories/
│       ├── bank_transfer_repository.go
│       ├── bank_reconciliation_repository.go
│       ├── cash_bank_transaction_repository.go
│       └── cash_bank_journal_repository.go
│
├── domain/
│   ├── dto/
│   │   ├── bank_transfer_dto.go
│   │   ├── bank_reconciliation_dto.go
│   │   └── cash_bank_transaction_dto.go
│   ├── mapper/
│   │   ├── bank_transfer_mapper.go
│   │   ├── bank_reconciliation_mapper.go
│   │   ├── cash_bank_transaction_mapper.go
│   │   └── cash_bank_journal_mapper.go
│   ├── accounting/
│   │   └── GL posting logic (shared)
│   └── usecase/
│       ├── bank_transfer_usecase.go
│       ├── bank_reconciliation_usecase.go
│       ├── cash_bank_transaction_usecase.go
│       └── cash_bank_journal_usecase.go
│
└── presentation/
    ├── handler/
    │   ├── bank_transfer_handler.go
    │   ├── bank_reconciliation_handler.go
    │   ├── cash_bank_transaction_handler.go
    │   └── cash_bank_journal_handler.go
    └── router/
        ├── bank_transfer_routers.go
        ├── bank_reconciliation_routers.go
        ├── cash_bank_transaction_routers.go
        └── cash_bank_journal_routers.go

apps/web/src/features/finance/
├── bank-accounts/
│   ├── components/
│   ├── hooks/
│   ├── services/
│   ├── types/
│   └── i18n/
├── bank-transfer/
│   ├── components/
│   ├── hooks/
│   ├── services/
│   ├── types/
│   └── i18n/
├── bank-reconciliation/
│   ├── components/
│   ├── hooks/
│   ├── services/
│   ├── types/
│   └── i18n/
└── cash-bank-transactions/
    ├── components/
    ├── hooks/
    ├── services/
    ├── types/
    └── i18n/
```

---

## INTEGRATION POINTS

### With General Ledger (Journal Module)

- **Bank Transfer** → Creates GL Entry (2 lines: debit/credit)
- **Cash Bank Transaction** → Creates GL Entry (if auto_post = true)
- **GL Entry** → Referenced by CashBankJournal for audit
- **Balance Verification** → Bank Reconciliation reads GL balances

### With Organization & Bank Master

- **Company Master** → Every transaction scoped to company
- **Bank Account** → Links bank_accounts table to company
- **Currency** → Validates transfer currency match

### With Core Infrastructure

- **Tenant Isolation** → All records have tenant_id
- **Audit Logging** → All actions logged to audit_log
- **Authorization** → Permission checks on all endpoints
- **Timezone** → Uses apptime.Now() for date operations

---

**End of Document**

Version 1.0 | Generated: 2026-05-10 | GIMS Platform
