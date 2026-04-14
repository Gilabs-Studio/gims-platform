# Finance Phase 2: Cash-Bank Transactions & Reconciliation

**Status**: Phase A (Scope & Contract Lock)  
**Sprint**: Q2 2026  
**Version**: 1.0.0  
**Date**: April 15, 2026

---

## 📋 TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Architecture Decisions](#architecture-decisions)
3. [API Endpoint Contracts](#api-endpoint-contracts)
4. [Data Models](#data-models)
5. [Permission Matrix](#permission-matrix)
6. [Business Rules & Validations](#business-rules--validations)
7. [Journal Posting Logic](#journal-posting-logic)
8. [Error Codes](#error-codes)
9. [Verification Checklist](#verification-checklist)

---

## EXECUTIVE SUMMARY

Phase 2 builds cash-bank transaction management and automated bank reconciliation on top of Phase 0/1 foundation:
- **Phase 0**: Opening balance posted as phase journal
- **Phase 1**: Journal posting engine + accounting mapping + GL balance computation
- **Phase 2**: Operational cash-bank transactions + transfers + reconciliation

### Key Principles
- **Balance Integrity**: `current_balance` = sum of posted GL movements (debit - credit) for bank COA account, INCLUDING opening journal
- **Automation**: Cash-bank transactions auto-generate and immediately post journals; transfers post only on completion
- **Immutability**: Posted transactions locked; reversal path only via reverse endpoint
- **Reconciliation**: Multi-format import (CSV, MT940, OFX) → normalized statement lines → auto-match → manual review → reconciliation lock

### Scope (Phase 2a: MVP)
- Bank account enhancement (computed balance, warning context)
- Cash-bank transactions (payment in/out with auto-post)
- Bank transfers (pending → completed workflow with auto-post)
- Bank reconciliation (import + auto-match + manual match + lock)

### Out of Scope (Phase 2b+)
- Advanced matching rules (fuzzy matching, partial amount, etc.)
- Multi-currency revaluation
- Automated bank feed integration (SWIFT, Banking APIs)
- Deposit slips, check registers
- Bank fees/interest auto-posting

---

## ARCHITECTURE DECISIONS

| Decision | Choice | Trade-off | Rationale |
|----------|--------|-----------|-----------|
| Bank Account Source | **Reuse existing** `core/data/models/bank_account.go` | Extends core; no separate finance table | Minimizes duplication, single source of truth for operational accounts |
| Transaction Model | **New** `internal/finance/data/models/cash_bank_transaction.go` | Separate from read-only `CashBankJournal` | Tight integration with journal posting, transaction-specific rules |
| Posting Timing (Transfer) | **On completion** (pending → completed → posted) | Delayed GL impact | Supports approval workflows; GL only reflects actual transfers |
| Import Format | **CSV + MT940 + OFX** (awal) | Scope limited to common formats | Covers 95% of bank exports; future extensibility via adapter pattern |
| Opening Balance Field | **Documentation-only** | Field exists but not used in calc | Maintains audit trail of manual setup; actual saldo via Phase 0 journal |
| Sequence Strategy | **Centralized lock table** `document_sequences` | Slightly more complex setup | High-concurrency safety; prevents duplicate sequence numbers |
| Reconciliation Lock | **Reversible with audit** | Admin can undo if needed | Operational recovery; full audit trail maintained |

---

## API ENDPOINT CONTRACTS

### 1. BANK ACCOUNTS (Enhanced)

#### 1.1 List Bank Accounts
```
GET /api/v1/finance/bank-accounts
  ?page=1 &per_page=20
  &company_id={uuid}
  &is_active={true|false}
  &account_type={operational|suspense|transit}
  &currency_id={uuid}
  &search={text}

Permission: bank_account.read

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "company_id": "uuid",
      "code": "BCA-001",
      "name": "BCA Current Account",
      "account_type": "operational",        // ← new field
      "account_number": "123456789",
      "holder_name": "Company Name",
      "coa_account_id": "uuid (1110-BCA)",
      "currency_id": "uuid",
      "country_code": "ID",
      "bank_branch_code": "1234",
      "opening_balance": 50000000.00,       // ← documentation only
      "current_balance": 120500000.00,      // ← computed from GL
      "is_reconcilable": true,              // ← derived from coa account
      "is_active": true,
      "warning": null,  // or object below if triggered
      "created_by": "uuid",
      "created_at": "2024-01-15T10:30:45+07:00",
      "updated_at": "2024-01-15T10:30:45+07:00",
      "metadata": {
        "last_reconciled_at": "2024-01-10T00:00:00+07:00",
        "reconciliation_status": "reconciled",  // "unreconciled" | "in_progress" | "reconciled" | "locked"
        "statement_date": "2024-01-10",
        "book_difference": 0.00
      }
    }
  ],
  "meta": {
    "pagination": {
      "total": 5,
      "per_page": 20,
      "current_page": 1,
      "last_page": 1
    }
  },
  "timestamp": "2024-01-15T10:35:10+07:00",
  "request_id": "req_abc123"
}
```

#### 1.2 Get Bank Account Detail
```
GET /api/v1/finance/bank-accounts/{id}

Permission: bank_account.read

Response:
{
  "success": true,
  "data": {
    ...same as list response...
    "recent_transactions": [
      {
        "id": "uuid",
        "reference_number": "KAS/2024/0001",
        "type": "payment_in",
        "date": "2024-01-15",
        "amount": 10000000.00,
        "journal_entry_id": "uuid",
        "status": "posted"
      }
    ],
    "balance_breakdown": {
      "opening_journal_balance": 50000000.00,
      "transaction_debit_total": 100000000.00,
      "transaction_credit_total": 29500000.00,
      "current_balance": 120500000.00
    }
  },
  "meta": null,
  "timestamp": "2024-01-15T10:35:10+07:00",
  "request_id": "req_abc123"
}
```

#### 1.3 Create Bank Account
```
POST /api/v1/finance/bank-accounts

Permission: bank_account.write

Request:
{
  "company_id": "uuid",
  "code": "BCA-002",
  "name": "BCA Savings",
  "account_type": "operational",  // "operational" | "suspense" | "transit"
  "account_number": "987654321",
  "holder_name": "Company Name",
  "coa_account_id": "uuid (postable account)",
  "currency_id": "uuid",
  "country_code": "ID",
  "bank_branch_code": "1234",
  "opening_balance": 0,  // only for documentation if provided
  "is_active": true
}

Validation Rules:
- company_id must exist and be active
- code must be unique per company
- account_number must be unique per company
- coa_account_id must exist, be active, postable (not header), type must match account_type role
- currency_id must exist and be active
- opening_balance >= 0 if provided
- account_number must have 8-16 numeric characters

Response:
{
  "success": true,
  "data": {
    ...as list response...
    "warning": {
      "type": "ACCOUNT_CREATED_DURING_OPERATIONS",
      "message": "New account registered during active fiscal period; ensure opening journal settled manually if required.",
      "level": "info"
    }
  },
  "meta": null,
  "timestamp": "2024-01-15T10:35:10+07:00",
  "request_id": "req_abc123"
}

Errors:
- 400 VALIDATION_ERROR
- 404 COMPANY_NOT_FOUND | COA_ACCOUNT_NOT_FOUND | CURRENCY_NOT_FOUND
- 409 BANK_ACCOUNT_CODE_ALREADY_EXISTS | ACCOUNT_NUMBER_ALREADY_EXISTS
```

#### 1.4 Update Bank Account
```
PUT /api/v1/finance/bank-accounts/{id}

Permission: bank_account.write

Request (set fields to update):
{
  "name": "new name",
  "account_number": "new number",
  "holder_name": "new holder",
  "coa_account_id": "uuid (optional, if changing GL mapping)",
  "opening_balance": 55000000,  // change documentation value only
  "is_active": true
}

Validation Rules:
- Cannot change account_type if transactions exist (frozen)
- Cannot change coa_account_id if posted journals exist (frozen)
- Cannot change currency_id if transactions exist (frozen)
- account_number must remain unique per company

Response: [as 1.1 single item]

Errors:
- 400 VALIDATION_ERROR | IMMUTABLE_FIELD
- 404 BANK_ACCOUNT_NOT_FOUND
```

#### 1.5 Toggle Bank Account Status
```
POST /api/v1/finance/bank-accounts/{id}/toggle-status

Permission: bank_account.write

Request: (body empty, action in URL)

Validation Rules:
- Must have permission
- Deactivating account with active reconciliations in progress → reject with message

Response:
{
  "success": true,
  "data": {
    ...account object...
    "is_active": false
  },
  "meta": null,
  "timestamp": "2024-01-15T10:35:10+07:00",
  "request_id": "req_abc123"
}

Errors:
- 404 BANK_ACCOUNT_NOT_FOUND
- 422 RECONCILIATION_IN_PROGRESS | TRANSACTIONS_PENDING
```

#### 1.6 Delete Bank Account
```
DELETE /api/v1/finance/bank-accounts/{id}

Permission: bank_account.delete

Validation Rules:
- Soft delete only (sets deleted_at, retains GL audit trail)
- Cannot delete if posted transactions exist → return 422

Response: 204 No Content

Errors:
- 404 BANK_ACCOUNT_NOT_FOUND
- 422 TRANSACTIONS_EXIST
```

---

### 2. CASH-BANK TRANSACTIONS (New Domain)

#### 2.1 Create Cash-Bank Transaction
```
POST /api/v1/finance/cash-bank-transactions

Permission: cash_bank_transaction.write

Request:
{
  "company_id": "uuid",
  "bank_account_id": "uuid",
  "type": "payment_in",              // "payment_in" | "payment_out"
  "date": "2024-01-15",
  "amount": 10000000.00,
  "reference": "INV-2024-001",       // user-visible ref (not unique)
  "description": "Invoice payment received",
  "contra_account_id": "uuid",       // optional; falls back to mapping profile default
  "attachment_url": null,            // optional URL or file ref
  "auto_post": true                  // if false, create as draft (future: phase 2b)
}

Validation Rules:
- company_id, bank_account_id must exist and be active
- bank_account_id.coa_account_id must be postable
- type must match cash_in or cash_out profile config
- date must be ≤ today (cannot post future)
- amount > 0
- amount ≤ max transaction limit (configurable, default 999,999,999.99)
- fiscal period must be open on date
- if contra_account_id provided: must exist, be postable, type must be opposite GL normal_balance
- auto_post=true means journal auto-generates + posts immediately

Auto-Post Behavior (when auto_post=true):
- Resolve accounting profile (cashIn, cashOut, etc.) from posting_profile config
- Determine debit/credit accounts from profile + bank_account_id coa + contra_account_id
- Calculate journal lines (bank debit/out credit, contra credit/in debit)
- Generate journal entry number (auto-sequence)
- Post journal immediately (status='posted')
- Return transaction with journal_entry_id

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "company_id": "uuid",
    "reference_number": "KAS/2024/0001",  // auto-generated: KAS/YYYY/NNNN or BNK/YYYY/NNNN
    "bank_account_id": "uuid",
    "type": "payment_in",
    "date": "2024-01-15",
    "amount": 10000000.00,
    "reference": "INV-2024-001",
    "description": "Invoice payment received",
    "contra_account_id": "uuid",
    "journal_entry_id": "uuid",
    "journal_entry_number": "JE-2024-00001",
    "status": "posted",                   // "posted" | "draft" (future)
    "attachment_url": null,
    "created_by": "uuid",
    "created_at": "2024-01-15T10:30:45+07:00",
    "updated_at": "2024-01-15T10:30:45+07:00"
  },
  "meta": null,
  "timestamp": "2024-01-15T10:35:10+07:00",
  "request_id": "req_abc123"
}

Errors:
- 400 VALIDATION_ERROR
- 404 BANK_ACCOUNT_NOT_FOUND | COMPANY_NOT_FOUND | COA_ACCOUNT_NOT_FOUND
- 422 PERIOD_CLOSED | PERIOD_LOCKED | INSUFFICIENT_ACCOUNT_BALANCE | POSTING_FAILED
```

#### 2.2 List Cash-Bank Transactions
```
GET /api/v1/finance/cash-bank-transactions
  ?page=1 &per_page=20
  &company_id={uuid}
  &bank_account_id={uuid}
  &type={payment_in|payment_out|all}
  &date_from=2024-01-01 &date_to=2024-01-31
  &status={posted|draft}
  &search={text}

Permission: cash_bank_transaction.read

Response:
{
  "success": true,
  "data": [
    {
      ...transaction object as in 2.1...
    }
  ],
  "meta": {
    "pagination": { ...standard... }
  },
  "timestamp": "...",
  "request_id": "..."
}
```

#### 2.3 Get Cash-Bank Transaction Detail
```
GET /api/v1/finance/cash-bank-transactions/{id}

Permission: cash_bank_transaction.read

Response:
{
  "success": true,
  "data": {
    ...transaction object +
    "journal_entry": {
      "id": "uuid",
      "entry_number": "JE-2024-00001",
      "lines": [
        {
          "account_id": "uuid",
          "account_code": "1110-BCA",
          "account_name": "Bank BCA",
          "debit_amount": 10000000.00,
          "credit_amount": 0
        },
        {
          "account_id": "uuid",
          "account_code": "4100",
          "account_name": "Revenue - Services",
          "debit_amount": 0,
          "credit_amount": 10000000.00
        }
      ]
    }
  },
  "meta": null,
  "timestamp": "...",
  "request_id": "..."
}
```

#### 2.4 Reverse Cash-Bank Transaction
```
POST /api/v1/finance/cash-bank-transactions/{id}/reverse

Permission: cash_bank_transaction.reverse

Request:
{
  "reason": "Incorrect amount"  // optional
}

Validation Rules:
- Transaction must be posted (status='posted')
- Transaction must not already be reversed
- Fiscal period must be open on transaction date + today
- User must have cash_bank_transaction.reverse permission

Behavior:
- Create reversing journal entry (negate all amounts)
- Set original transaction.status='reversed'
- Assign new cash_bank_transaction_id for reversal record
- Link with reverse_of_id and reversed_by_id

Response:
{
  "success": true,
  "data": {
    "original_transaction_id": "uuid",
    "original_journal_id": "uuid",
    "reversal_transaction_id": "uuid (new)",
    "reversal_journal_id": "uuid (new)",
    "reversal_number": "KAS/2024/0002",
    "created_at": "2024-01-15T11:00:00+07:00"
  },
  "meta": null,
  "timestamp": "...",
  "request_id": "..."
}

Errors:
- 404 TRANSACTION_NOT_FOUND
- 422 CANNOT_REVERSE_DRAFT | ALREADY_REVERSED | PERIOD_CLOSED
```

#### 2.5 Get Form Data for Cash-Bank Transactions
```
GET /api/v1/finance/cash-bank-transactions/form-data
  ?company_id={uuid}

Permission: cash_bank_transaction.read

Response:
{
  "success": true,
  "data": {
    "bank_accounts": [
      {
        "id": "uuid",
        "code": "BCA-001",
        "name": "BCA Current Account",
        "account_number": "123456789"
      }
    ],
    "transaction_types": [
      { "value": "payment_in", "label": "Payment In (Cash/Transfer In)" },
      { "value": "payment_out", "label": "Payment Out (Withdrawal)" }
    ],
    "contra_accounts": [
      {
        "id": "uuid",
        "code": "4100",
        "name": "Revenue - Services",
        "type": "revenue"
      }
    ]
  },
  "meta": null,
  "timestamp": "...",
  "request_id": "..."
}
```

---

### 3. BANK TRANSFERS (New Domain)

#### 3.1 Create Bank Transfer
```
POST /api/v1/finance/bank-transfers

Permission: bank_transfer.write

Request:
{
  "company_id": "uuid",
  "from_bank_account_id": "uuid",
  "to_bank_account_id": "uuid",
  "amount": 50000000.00,
  "date": "2024-01-15",
  "reference": "INT-TRANSFER",
  "description": "Inter-account transfer",
  "status": "pending"              // always starts as pending
}

Validation Rules:
- company_id, from_bank_account_id, to_bank_account_id must exist and be active
- from_bank_account_id ≠ to_bank_account_id
- both accounts must have coa_account_id
- amount > 0
- date ≤ today
- fiscal period must be open

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "company_id": "uuid",
    "transfer_number": "TRF/2024/0001",  // auto-generated
    "from_bank_account_id": "uuid",
    "to_bank_account_id": "uuid",
    "amount": 50000000.00,
    "date": "2024-01-15",
    "reference": "INT-TRANSFER",
    "description": "Inter-account transfer",
    "status": "pending",                  // pending | completed | cancelled
    "journal_entry_id": null,             // populated only after completion
    "created_by": "uuid",
    "created_at": "2024-01-15T10:35:00+07:00"
  },
  "meta": null,
  "timestamp": "...",
  "request_id": "..."
}

Errors:
- 400 VALIDATION_ERROR | SAME_ACCOUNT
- 404 BANK_ACCOUNT_NOT_FOUND | COMPANY_NOT_FOUND
- 422 PERIOD_CLOSED | ACCOUNTS_DIFFERENT_CURRENCY
```

#### 3.2 List Bank Transfers
```
GET /api/v1/finance/bank-transfers
  ?page=1 &per_page=20
  &company_id={uuid}
  &from_bank_account_id={uuid}
  &to_bank_account_id={uuid}
  &status={pending|completed|cancelled}
  &date_from=2024-01-01 &date_to=2024-01-31

Permission: bank_transfer.read

Response:
{
  "success": true,
  "data": [
    {
      ...transfer object as in 3.1...
    }
  ],
  "meta": { "pagination": {...} },
  "timestamp": "...",
  "request_id": "..."
}
```

#### 3.3 Get Bank Transfer Detail
```
GET /api/v1/finance/bank-transfers/{id}

Permission: bank_transfer.read

Response:
{
  "success": true,
  "data": {
    ...transfer object +
    "from_account_detail": {
      "code": "BCA-001",
      "name": "BCA Current",
      "coa_code": "1110-BCA"
    },
    "to_account_detail": {
      "code": "BNI-001",
      "name": "BNI Savings",
      "coa_code": "1110-BNI"
    },
    "journal_entry": null  // or { id, number, lines[] } if status='completed'
  },
  "meta": null,
  "timestamp": "...",
  "request_id": "..."
}
```

#### 3.4 Complete Bank Transfer
```
POST /api/v1/finance/bank-transfers/{id}/complete

Permission: bank_transfer.write

Request: (empty body)

Validation Rules:
- Transfer must exist and status='pending'
- Fiscal period must be open
- Has permission

Auto-Post Behavior:
- Create journal entry with:
  - Debit: to_bank_account.coa_account_id (increasing destination)
  - Credit: from_bank_account.coa_account_id (decreasing source)
- Post journal immediately
- Update transfer.status='completed', journal_entry_id=new_je_id

Response:
{
  "success": true,
  "data": {
    ...transfer object with status='completed', journal_entry_id populated...
  },
  "meta": null,
  "timestamp": "...",
  "request_id": "..."
}

Errors:
- 404 BANK_TRANSFER_NOT_FOUND
- 422 INVALID_STATUS | PERIOD_CLOSED | POSTING_FAILED
```

#### 3.5 Cancel Bank Transfer
```
POST /api/v1/finance/bank-transfers/{id}/cancel

Permission: bank_transfer.write

Request:
{
  "reason": "No longer needed"  // optional
}

Validation Rules:
- Transfer must be pending (cannot cancel completed/already cancelled)

Response:
{
  "success": true,
  "data": {
    ...transfer object with status='cancelled'...
  },
  "meta": null,
  "timestamp": "...",
  "request_id": "..."
}

Errors:
- 404 BANK_TRANSFER_NOT_FOUND
- 422 CANNOT_CANCEL_COMPLETED_TRANSFER
```

---

### 4. BANK RECONCILIATION (New Domain)

#### 4.1 Import Bank Statement
```
POST /api/v1/finance/bank-reconciliations/import

Permission: bank_reconciliation.write

Request (multipart form-data):
{
  "company_id": "uuid",
  "bank_account_id": "uuid",
  "statement_date": "2024-01-31",
  "statement_balance": 150000000.00,
  "file": <binary file>,             // CSV, MT940, or OFX
  "file_format": "csv"               // "csv" | "mt940" | "ofx"
}

Validation Rules:
- company_id, bank_account_id must exist
- statement_date must be valid date
- statement_balance > 0
- file must be parseable in format specified

Parsing:
- CSV: expected columns [transaction_date, reference, description, debit, credit]
- MT940: parse standard SWIFT format into normalized lines
- OFX: parse OFX v1/v2 into normalized lines

Response:
{
  "success": true,
  "data": {
    "reconciliation_id": "uuid",
    "company_id": "uuid",
    "bank_account_id": "uuid",
    "statement_date": "2024-01-31",
    "statement_balance": 150000000.00,
    "lines_count": 45,
    "bank_statement_lines": [
      {
        "id": "uuid",
        "date": "2024-01-15",
        "reference": "TRN001",
        "description": "Withdrawal",
        "amount": 5000000.00,
        "direction": "debit",                    // "debit" | "credit"
        "status": "unmatched"                    // "unmatched" | "auto_matched" | "manual_matched" | "excluded"
      }
    ],
    "status": "in_progress",                     // "in_progress" | "reconciled" | "locked"
    "book_balance": 120500000.00,                // computed from GL
    "difference": 29500000.00                    // statement_balance - book_balance
  },
  "meta": null,
  "timestamp": "...",
  "request_id": "..."
}

Errors:
- 400 INVALID_FILE_FORMAT | PARSE_ERROR
- 404 BANK_ACCOUNT_NOT_FOUND
- 422 STATEMENT_DATE_IN_FUTURE | DUPLICATE_IMPORT
```

#### 4.2 Auto-Match Bank Statement Lines
```
POST /api/v1/finance/bank-reconciliations/{id}/auto-match

Permission: bank_reconciliation.write

Request: (empty body, runs auto-match algorithm)

Matching Algorithm:
- For each bank statement line:
  - Query cash_bank_transactions for same account, amount exact match, date within ±3 days
  - If 1 match: auto_matched=true, matched_with_transaction_id=id
  - If multiple: candidates=[], status=unmatched (for manual review)
  - If 0: status=unmatched
- Exclude already matched lines

Response:
{
  "success": true,
  "data": {
    "reconciliation_id": "uuid",
    "status": "in_progress",
    "auto_matched_count": 42,
    "manual_match_required_count": 2,
    "unmatched_count": 1,
    "bank_statement_lines": [
      {
        "id": "uuid",
        "date": "2024-01-15",
        "reference": "TRN001",
        "description": "Withdrawal",
        "amount": 5000000.00,
        "direction": "debit",
        "status": "auto_matched",
        "matched_with_transaction_id": "uuid",
        "matched_transaction_reference": "KAS/2024/0001"
      }
    ]
  },
  "meta": null,
  "timestamp": "...",
  "request_id": "..."
}

Errors:
- 404 RECONCILIATION_NOT_FOUND
- 422 RECONCILIATION_LOCKED
```

#### 4.3 Manually Match Statement Line
```
POST /api/v1/finance/bank-reconciliations/{reconciliation_id}/line/{line_id}/match

Permission: bank_reconciliation.write

Request:
{
  "cash_bank_transaction_id": "uuid"  // or null to unmatch
}

Response:
{
  "success": true,
  "data": {
    "line_id": "uuid",
    "status": "manual_matched",
    "matched_with_transaction_id": "uuid"
  },
  "meta": null,
  "timestamp": "...",
  "request_id": "..."
}

Errors:
- 404 RECONCILIATION_NOT_FOUND | LINE_NOT_FOUND
- 422 INVALID_TRANSACTION_ID | RECONCILIATION_LOCKED
```

#### 4.4 Exclude Statement Line
```
POST /api/v1/finance/bank-reconciliations/{reconciliation_id}/line/{line_id}/exclude

Permission: bank_reconciliation.write

Request:
{
  "reason": "Duplicate entry"
}

Response:
{
  "success": true,
  "data": {
    "line_id": "uuid",
    "status": "excluded",
    "reason": "Duplicate entry"
  },
  "meta": null,
  "timestamp": "...",
  "request_id": "..."
}

Errors:
- 404 RECONCILIATION_NOT_FOUND | LINE_NOT_FOUND
- 422 RECONCILIATION_LOCKED
```

#### 4.5 Confirm & Lock Reconciliation
```
POST /api/v1/finance/bank-reconciliations/{id}/confirm

Permission: bank_reconciliation.reconcile

Request: (empty body)

Validation Rules:
- All statement lines must have status (matched, excluded, or address unmatched)
- book_balance must equal statement_balance (or admin override?)
- Fiscal period must be open

Behavior:
- If all lines matched/excluded + balance = 0: set status='reconciled'
- If unreconciled difference remains: require admin approval or allow lock with note

Response:
{
  "success": true,
  "data": {
    "reconciliation_id": "uuid",
    "status": "reconciled",             // or "reconciled_with_variance"
    "book_balance": 120500000.00,
    "statement_balance": 120500000.00,
    "difference": 0.00,
    "reconciled_at": "2024-01-31T15:30:00+07:00",
    "reconciled_by": "uuid"
  },
  "meta": null,
  "timestamp": "...",
  "request_id": "..."
}

Errors:
- 404 RECONCILIATION_NOT_FOUND
- 422 UNMATCHED_LINES_EXIST | BALANCE_NOT_EQUAL
```

#### 4.6 Lock Reconciliation (Irreversible Post-Confirm)
```
POST /api/v1/finance/bank-reconciliations/{id}/lock

Permission: bank_reconciliation.lock

Request: (empty body)

Validation Rules:
- Reconciliation must be status='reconciled'
- Fiscal period must be open

Behavior:
- Set status='locked'
- Clear locks can only be done by super-admin with audit reason

Response:
{
  "success": true,
  "data": {
    "reconciliation_id": "uuid",
    "status": "locked",
    "locked_at": "2024-01-31T16:00:00+07:00",
    "locked_by": "uuid"
  },
  "meta": null,
  "timestamp": "...",
  "request_id": "..."
}

Errors:
- 404 RECONCILIATION_NOT_FOUND
- 422 INVALID_STATUS
```

#### 4.7 Get Form Data for Bank Reconciliation
```
GET /api/v1/finance/bank-reconciliations/form-data
  ?company_id={uuid}

Permission: bank_reconciliation.read

Response:
{
  "success": true,
  "data": {
    "bank_accounts": [
      {
        "id": "uuid",
        "code": "BCA-001",
        "name": "BCA Current",
        "last_reconciliation_date": "2024-01-15"
      }
    ],
    "file_formats": [
      { "value": "csv", "label": "CSV (Comma-Separated)" },
      { "value": "mt940", "label": "MT940 (SWIFT)" },
      { "value": "ofx", "label": "OFX (Open Financial Exchange)" }
    ]
  },
  "meta": null,
  "timestamp": "...",
  "request_id": "..."
}
```

---

## DATA MODELS

### Bank Account (Enhanced)
```go
type BankAccount struct {
  ID                string    `gorm:"primaryKey"`
  CompanyID         string    `gorm:"index"`
  Code              string    `gorm:"uniqueIndex:idx_company_code"`
  Name              string
  AccountType       string    // "operational" | "suspense" | "transit"
  AccountNumber     string    `gorm:"uniqueIndex:idx_company_account"`
  HolderName        string
  COAAccountID      string    `gorm:"foreignKey:ID"`  // FK to chart_of_accounts
  CurrencyID        string
  CountryCode       string
  BankBranchCode    string
  OpeningBalance    decimal.Decimal  // documentation only; never used in calc
  IsActive          bool      `gorm:"index"`
  CreatedBy         string
  UpdatedBy         string
  CreatedAt         time.Time
  UpdatedAt         time.Time
  DeletedAt         *time.Time `gorm:"index"`
  
  // Computed at query time (not persisted):
  // CurrentBalance    decimal.Decimal  // sum(debit-credit) from GL
  // IsReconcilable    bool             // derived from COA postability
  // Metadata          map[string]interface{}  // reconciliation status, etc.
}
```

### CashBankTransaction (New)
```go
type CashBankTransaction struct {
  ID                  string    `gorm:"primaryKey"`
  CompanyID           string    `gorm:"index"`
  BankAccountID       string    `gorm:"foreignKey:ID"`
  ReferenceNumber     string    `gorm:"uniqueIndex:idx_ref_number"`  // KAS/2024/0001, BNK/2024/0001
  Type                string    // "payment_in" | "payment_out"
  Date                time.Time `gorm:"index"`
  Amount              decimal.Decimal
  Reference           string
  Description         string
  ContraAccountID     string
  JournalEntryID      string    // FK to journal_entry after posting
  Status              string    // "posted" | "draft" | "reversed"
  AttachmentURL       string
  ReverseOfID         *string   // FK to original if this is a reversal
  ReversedByID        *string   // FK to reversal transaction
  CreatedBy           string
  UpdatedBy           string
  CreatedAt           time.Time
  UpdatedAt           time.Time
  DeletedAt           *time.Time `gorm:"index"`
}
```

### BankTransfer (New)
```go
type BankTransfer struct {
  ID                  string    `gorm:"primaryKey"`
  CompanyID           string    `gorm:"index"`
  TransferNumber      string    `gorm:"uniqueIndex:idx_transfer_number"`  // TRF/2024/0001
  FromBankAccountID   string    `gorm:"foreignKey:ID"`
  ToBankAccountID     string    `gorm:"foreignKey:ID"`
  Amount              decimal.Decimal
  Date                time.Time `gorm:"index"`
  Reference           string
  Description         string
  Status              string    // "pending" | "completed" | "cancelled"
  JournalEntryID      *string   // populated only after completion
  CreatedBy           string
  UpdatedBy           string
  CreatedAt           time.Time
  UpdatedAt           time.Time
  DeletedAt           *time.Time `gorm:"index"`
}
```

### BankReconciliation (New)
```go
type BankReconciliation struct {
  ID                  string    `gorm:"primaryKey"`
  CompanyID           string    `gorm:"index"`
  BankAccountID       string    `gorm:"foreignKey:ID"`
  StatementDate       time.Time
  StatementBalance    decimal.Decimal
  BookBalance         decimal.Decimal  // computed from GL at lock time
  Difference          decimal.Decimal
  Status              string    // "in_progress" | "reconciled" | "locked"
  FileFormat          string    // "csv" | "mt940" | "ofx"
  FileName            string
  CreatedBy           string
  ReconcileBy         *string
  LockBy              *string
  CreatedAt           time.Time
  ReconcileAt         *time.Time
  LockAt              *time.Time
  DeletedAt           *time.Time `gorm:"index"`
}

type BankStatementLine struct {
  ID                      string    `gorm:"primaryKey"`
  BankReconciliationID    string    `gorm:"foreignKey:ID"`
  Date                    time.Time
  Reference               string
  Description             string
  Amount                  decimal.Decimal
  Direction               string    // "debit" | "credit"
  Status                  string    // "unmatched" | "auto_matched" | "manual_matched" | "excluded"
  MatchedWithTransactionID *string   // FK to CashBankTransaction
  ExcludeReason           string
  CreatedAt               time.Time
  UpdatedAt               time.Time
}
```

---

## PERMISSION MATRIX

### New Permission Codes

| Code | Resource | Action | Description | Typical Roles |
|------|----------|--------|-------------|----------------|
| `bank_account.read` | Bank Account | View | View bank accounts, balance, history | Finance Manager, Cashier, Accountant, Auditor |
| `bank_account.write` | Bank Account | Create/Edit | Create, update, register new accounts | Finance Manager |
| `bank_account.delete` | Bank Account | Delete/Deactivate | Soft-delete bank accounts | Finance Manager |
| `cash_bank_transaction.read` | Cash-Bank Transaction | View | View transaction list, detail | Finance Manager, Cashier, Accountant, Auditor |
| `cash_bank_transaction.write` | Cash-Bank Transaction | Create | Create new transactions (auto-posts) | Cashier, Finance Manager |
| `cash_bank_transaction.reverse` | Cash-Bank Transaction | Reverse | Reverse posted transactions | Finance Manager |
| `cash_bank_transaction.export` | Cash-Bank Transaction | Export | Export transaction report | Finance Manager, Accountant |
| `bank_transfer.read` | Bank Transfer | View | View transfer list, detail | Finance Manager, Accountant, Auditor |
| `bank_transfer.write` | Bank Transfer | Create/Complete | Create new transfers, complete pending | Finance Manager |
| `bank_transfer.cancel` | Bank Transfer | Cancel | Cancel pending transfers | Finance Manager |
| `bank_reconciliation.read` | Bank Reconciliation | View | View reconciliation status, matching | Finance Manager, Accountant, Auditor |
| `bank_reconciliation.write` | Bank Reconciliation | Import/Match | Import statements, manual match/exclude | Finance Manager, Accountant |
| `bank_reconciliation.reconcile` | Bank Reconciliation | Confirm | Confirm & reconcile statements | Finance Manager, Accountant |
| `bank_reconciliation.lock` | Bank Reconciliation | Lock | Lock reconciliation (irreversible) | Finance Manager |

### Role Mapping (Recommended)

| Role | Permissions |
|------|-------------|
| Super Admin | All cash-bank permissions |
| Finance Manager | bank_account.{read,write,delete}, cash_bank_transaction.{read,write,reverse}, bank_transfer.{read,write,cancel}, bank_reconciliation.* |
| Accountant | bank_account.read, cash_bank_transaction.read, bank_transfer.read, bank_reconciliation.{read,write,reconcile} |
| Cashier | bank_account.read, cash_bank_transaction.{read,write}, bank_transfer.read |
| Auditor | bank_account.read, cash_bank_transaction.read, bank_transfer.read, bank_reconciliation.read |
| Report Viewer | bank_account.read |

---

## BUSINESS RULES & VALIDATIONS

### Bank Account Rules

1. **Balance Calculation** (CRITICAL)
   - `current_balance = SUM(posted GL movements for coa_account_id)`
   - Always includes Phase 0 opening journal
   - Never modified by `opening_balance` field
   - Example: Opening Journal Dr Bank 50M, Transaction Dr Bank 10M, Cr Revenue = current_balance = 60M

2. **Account Immutability**
   - Cannot change `account_type`, `coa_account_id`, `currency_id` if transactions exist (frozen)
   - Can change `name`, `holder_name`, `opening_balance` (documentation update)

3. **Warning Context**
   - When creating new account AND transactions exist for this company/period: show warning "Account registered during operations. Ensure opening journal settled manually if required."

4. **Reconciliation Status**
   - Derived from most recent reconciliation for this account
   - Possible values: "unreconciled", "in_progress", "reconciled", "locked"

### Cash-Bank Transaction Rules

1. **Auto-Posting** (Core Behavior)
   - On creation with `auto_post=true`:
     - Resolve accounting profile (cashIn, cashOut, etc.)
     - Generate GL journal lines (debit/credit pair)
     - Auto-sequence reference number (KAS/YYYY/NNNN or BNK/YYYY/NNNN)
     - Post journal immediately to GL
     - Transaction becomes immutable

2. **Immutability**
   - Posted transactions (`status='posted'`) cannot be edited
   - Can only be reversed via reverse endpoint
   - Reversal creates mirror transaction with opposite amounts

3. **Validation**
   - date ≤ today (no future posts)
   - amount > 0 and ≤ 999,999,999.99
   - Fiscal period must be open on transaction date
   - Contra account type must be opposite of bank COA normal balance

4. **Journal Generation Template**
   ```
   Payment In (cash_in):
     DR  Bank COA Account
         CR  Contra Account (revenue, AR, etc.)
   
   Payment Out (cash_out):
     DR  Contra Account (expense, AP, etc.)
         CR  Bank COA Account
   ```

5. **Reference Number Strategy**
   - Format: `{prefix}/YYYY/{seq:04d}`
   - Prefix: "KAS" (cash/revenue) or "BNK" (bank/operational)
   - Sequence: centralized lock table with per-company-per-year tracking
   - Always unique per company

### Bank Transfer Rules

1. **Status Flow**
   ```
   pending → completed (auto-posts journal)
          → cancelled (no journal if pending)
   ```
   - Transfer starts as `pending` on creation
   - Only move to `completed` when confirmed (via complete endpoint)
   - Once completed, cannot edit (immutable) except via reverse
   - Can cancel only if `pending`

2. **Posting Timing**
   - NO journal on creation (`pending` status)
   - Journal created and posted ONLY when `complete` endpoint called
   - Journal template:
     ```
     DR  To Bank COA Account (destination increases)
         CR  From Bank COA Account (source decreases)
     ```

3. **Validation**
   - from_account_id ≠ to_account_id
   - amount > 0
   - both accounts must have coa_account_id mapped
   - date ≤ today
   - Fiscal period must be open

4. **Reference Number Strategy**
   - Format: `TRF/YYYY/NNNN` (centralized sequence)
   - Unique per company

### Bank Reconciliation Rules

1. **Statement Import**
   - File formats: CSV, MT940, OFX
   - CSV columns expected: [trans_date, reference, description, debit_amount, credit_amount]
   - MT940: parse SWIFT standard lines
   - OFX: parse OFX v1/v2 statements

2. **Auto-Matching Algorithm**
   - For each statement line:
     - Find cash_bank_transactions where:
       - bank_account_id matches
       - amount = |statement_amount| (exact match)
       - date within ±3 days of statement date
       - status='posted'
       - not already matched
     - If exactly 1 match: auto-match
     - If multiple matches: flag for manual review
     - If 0 matches: unmatched

3. **Balance Verification**
   - `book_balance` = computed from posted GL for bank COA account on statement_date
   - `statement_balance` = user-provided statement closing balance
   - `difference` = statement_balance - book_balance
   - Reconciliation succeeds when difference = 0 AND all lines matched/excluded

4. **Lock Policy (Reversible with Audit)**
   - After confirm → status='reconciled'
   - Lock endpoint → status='locked'
   - Locked reconciliation cannot be modified
   - Super-admin can force unlock with recorded reason

5. **Multi-Currency Reconciliation**
   - Statement always in bank currency (as stamped)
   - GL balance computed in functional currency
   - Reconciliation must convert or accept difference with explanation

### Journal Generation & Posting

1. **Always Use Accounting Engine**
   - All cash-bank journals route through `internal/finance/domain/accounting/accounting_engine.go`
   - Posting profiles resolve debit/credit accounts automatically
   - GL balances updated atomically with journal post

2. **Immutability on Post**
   - Once journal status='posted', no edits to content
   - Via reverse only

3. **Audit Trail**
   - Journal entry captures source_type='cash_in|cash_out|transfer'
   - source_id links back to transaction/transfer
   - created_by, posted_by, posted_at recorded

---

## JOURNAL POSTING LOGIC

### Posting Profile Configuration (Stored in Code/Config)

```go
PostingProfiles := map[string]PostingProfile{
  "CashIn": {
    DebitAccount:  "bank_coa_account_id",
    CreditAccount: "contra_account_id_or_default",
  },
  "CashOut": {
    DebitAccount:  "contra_account_id_or_default",
    CreditAccount: "bank_coa_account_id",
  },
  "Transfer": {
    DebitAccount:  "to_bank_coa_account_id",
    CreditAccount: "from_bank_coa_account_id",
  },
}
```

### Auto-Posting Sequence (Usecase Layer)

```
1. Validate input (all required fields, amounts > 0, accounts exist)
2. Resolve posting profile by transaction type
3. Determine debit/credit accounts from profile + specific account IDs
4. Calculate journal lines (must balance)
5. Generate journal entry (auto-sequence+ period validation)
6. Apply GL posting (update GL balances)
7. Update transaction.journal_entry_id
8. Return posted transaction + journal details
```

### Error Handling

- If any step fails: ROLLBACK transaction, return 422 with specific error code
- Examples:
  - `PERIOD_CLOSED`: cannot post, period not open
  - `POSTING_FAILED`: journal engine error (unbalanced, account not postable, etc.)
  - `GL_UPDATE_FAILED`: rare; GL balance update failed

---

## ERROR CODES

### Finance Phase 2 Specific

| Code | HTTP | Description |
|------|------|-------------|
| `BANK_ACCOUNT_CODE_ALREADY_EXISTS` | 409 | Bank account code must be unique per company |
| `ACCOUNT_NUMBER_ALREADY_EXISTS` | 409 | Account number must be unique per company |
| `BANK_ACCOUNT_NOT_FOUND` | 404 | Bank account does not exist or is deleted |
| `RECONCILIATION_IN_PROGRESS` | 422 | Cannot deactivate account with active reconciliation |
| `TRANSACTIONS_PENDING` | 422 | Action blocked due to pending transactions |
| `IMMUTABLE_FIELD` | 400 | Field cannot be changed after transactions posted |
| `SAME_ACCOUNT` | 400 | Transfer source and destination must differ |
| `ACCOUNTS_DIFFERENT_CURRENCY` | 422 | Cannot transfer between different currencies (phase 2a) |
| `CANNOT_REVERSE_DRAFT` | 422 | Can only reverse posted transactions |
| `ALREADY_REVERSED` | 422 | Transaction already reversed |
| `CANNOT_CANCEL_COMPLETED_TRANSFER` | 422 | Can only cancel pending transfers |
| `INVALID_FILE_FORMAT` | 400 | File format not recognized or unsupported |
| `PARSE_ERROR` | 400 | Failed to parse statement file |
| `STATEMENT_DATE_IN_FUTURE` | 400 | Statement date cannot be in future |
| `DUPLICATE_IMPORT` | 409 | Reconciliation already exists for this account/date |
| `UNMATCHED_LINES_EXIST` | 422 | Cannot reconcile with unmatched statement lines |
| `BALANCE_NOT_EQUAL` | 422 | Book and statement balances do not match |
| `RECONCILIATION_LOCKED` | 422 | Cannot modify locked reconciliation |

Plus standard codes from `docs/api-standart/api-error-codes.md`:
- `VALIDATION_ERROR`, `REQUIRED`, `INVALID_FORMAT`
- `UNAUTHORIZED`, `FORBIDDEN`
- `PERIOD_CLOSED`, `PERIOD_LOCKED`
- `POSTING_FAILED`, `INSUFFICIENT_ACCOUNT_BALANCE`

---

## VERIFICATION CHECKLIST

### Before First Production Deployment

- [ ] All endpoints return standard `{success, data, meta, timestamp, request_id}` envelope
- [ ] Pagination enforces `per_page ≤ 100`, default 20
- [ ] All permission codes gated correctly (no access without permission)
- [ ] Bank account `current_balance` computed correctly from GL (test includes opening journal)
- [ ] Cash-bank transactions auto-post on creation and generate correct GL lines
- [ ] Transfer journal posts only on `complete` endpoint (pending state has no journal)
- [ ] Reversal creates mirror entries with correct posting
- [ ] Bank reconciliation import handles CSV, MT940, OFX without errors
- [ ] Auto-match algorithm identifies exact amount/date candidates correctly
- [ ] Manual match/unmatch works; exclude removes from balance calc
- [ ] Reconciliation lock is irreversible without admin override
- [ ] All error responses follow standard error schema
- [ ] Multi-company scope enforced (cannot access other company's data)
- [ ] Soft deletes work (deleted_at set, data still in DB for audit)
- [ ] RBAC permission seeding includes all new codes + role assignments

---

**Document Approval**

This specification is ready for team review and sign-off before Phase B implementation begins.

- [ ] Backend / Architecture Lead
- [ ] Finance Domain Expert
- [ ] Frontend Lead
- [ ] QA Lead

---

End of Finance Phase 2 Specification
