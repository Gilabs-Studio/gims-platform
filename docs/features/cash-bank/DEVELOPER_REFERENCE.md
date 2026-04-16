# 🧠 Developer Quick Reference
## Cash & Bank Module - Implementation Cheat Sheet

---

## 📐 Architecture at a Glance

### Three Layers of Financial System

```
┌─────────────────────────────────────────┐
│ ⬆️  OPERATIONS (Phase 2)                 │
│    Payments · Transfers · Reconciliation │
├─────────────────────────────────────────┤
│ 🔧 JOURNAL ENGINE (Phase 1)              │
│    GL Posting · Validation · Balance     │
├─────────────────────────────────────────┤
│ 📊 OPENING BALANCE (Phase 0)             │
│    Fiscal Year Baseline                  │
└─────────────────────────────────────────┘
```

---

## 🔴 Critical Do's & Don'ts

### DO ✅

```
✅ Use apptime.Now() not time.Now() in business logic
✅ Validate permissions before every operation
✅ Create Journal via Phase 1 for all GL posts
✅ Check FiscalYear.status = OPEN before posting
✅ Validate debit = credit before posting journal
✅ Use `Preload()` to avoid N+1 queries
✅ Add UNIQUE constraints for business uniqueness
✅ Soft-delete for audit trail preservation
✅ Return source_transaction_id in responses
```

### DON'T ❌

```
❌ Post to GL without going through Journal engine
❌ Edit a POSTED journal (reversal only)
❌ Create multiple OB for same Company+FY
❌ Post in LOCKED fiscal period
❌ Allow negative amounts in transfers
❌ Self-transfers (same account)
❌ Use bare `time.Now()` for business logic
❌ Forget to invalidate GL cache after posting
❌ Skip permission validation
```

---

## 📊 Data Models (Copy-Paste Ready)

### OpeningBalance

```go
type OpeningBalance struct {
    ID            string                `gorm:"primaryKey"`
    CompanyID     string                `gorm:"index"`
    FiscalYearID  string                `gorm:"index"`
    Status        string                // DRAFT, POSTED
    TotalDebit    decimal.Decimal
    TotalCredit   decimal.Decimal
    Lines         []OpeningBalanceLine  `gorm:"constraint:OnDelete:CASCADE"`
    PostedAt      *time.Time
    PostedBy      *string
    CreatedBy     string
    CreatedAt     time.Time
    UpdatedAt     time.Time
    
    Constraint: UNIQUE(company_id, fiscal_year_id)
}
```

### Journal + JournalLine

```go
type Journal struct {
    ID                  string          `gorm:"primaryKey"`
    CompanyID           string          `gorm:"index"`
    FiscalYearID        string          `gorm:"index"`
    JournalDate         time.Time       `gorm:"index"`
    JournalType         string          // OPENING_BALANCE, PAYMENT_IN, etc
    Reference           string
    Description         *string
    Status              string          // DRAFT, POSTED, REVERSED, CANCELLED
    SourceTransactionID *string         `gorm:"uniqueIndex"`
    Lines               []JournalLine   `gorm:"constraint:OnDelete:CASCADE"`
    PostedAt            *time.Time
    PostedBy            *string
    CreatedBy           string
    CreatedAt           time.Time
    UpdatedAt           time.Time
}

type JournalLine struct {
    ID            string          `gorm:"primaryKey"`
    JournalID     string          `gorm:"index"`
    AccountID     string          `gorm:"index"`
    DebitAmount   decimal.Decimal
    CreditAmount  decimal.Decimal
    Description   *string
    CreatedAt     time.Time
    UpdatedAt     time.Time
    
    Constraint: CHECK((debit_amount > 0 AND credit_amount = 0) OR 
                      (debit_amount = 0 AND credit_amount > 0))
}
```

### CashBankTransaction

```go
type CashBankTransaction struct {
    ID               string          `gorm:"primaryKey"`
    CompanyID        string          `gorm:"index"`
    BankAccountID    string          `gorm:"index"`
    TransactionDate  time.Time       `gorm:"index"`
    TransactionType  string          // PAYMENT_IN, PAYMENT_OUT
    Amount           decimal.Decimal
    Reference        string
    Description      *string
    Status           string          // DRAFT, POSTED
    LinkedJournalID  *string
    CreatedBy        string
    CreatedAt        time.Time
    UpdatedAt        time.Time
}
```

### BankTransfer

```go
type BankTransfer struct {
    ID               string          `gorm:"primaryKey"`
    CompanyID        string          `gorm:"index"`
    FromAccountID    string
    ToAccountID      string
    TransferDate     time.Time
    Amount           decimal.Decimal
    Status           string          // PENDING, COMPLETED, CANCELLED
    LinkedJournalID  *string
    CompletedAt      *time.Time
    CompletedBy      *string
    CreatedBy        string
    CreatedAt        time.Time
    UpdatedAt        time.Time
    
    Constraint: CHECK(amount > 0)
    Constraint: CHECK(from_account_id != to_account_id)
}
```

### BankStatement + BankStatementLine

```go
type BankStatement struct {
    ID                 string                  `gorm:"primaryKey"`
    CompanyID          string
    BankAccountID      string                  `gorm:"index"`
    StatementPeriodEnd time.Time
    OpeningBalance     decimal.Decimal
    ClosingBalance     decimal.Decimal
    Status             string                  // DRAFT, CONFIRMED
    Lines              []BankStatementLine     `gorm:"constraint:OnDelete:CASCADE"`
    ConfirmedAt        *time.Time
    ConfirmedBy        *string
    CreatedAt          time.Time
    UpdatedAt          time.Time
    
    Constraint: UNIQUE(bank_account_id, statement_period_end)
}

type BankStatementLine struct {
    ID                    string          `gorm:"primaryKey"`
    BankStatementID       string          `gorm:"index"`
    StatementDate         time.Time
    Description           string
    Amount                decimal.Decimal
    MatchedTransactionID  *string
    Status                string          // UNMATCHED, MATCHED, EXCLUDED
    ExcludeReason         *string
    CreatedAt             time.Time
}
```

---

## 🔄 Business Logic Flows (Pseudocode)

### Opening Balance Posting

```go
PostOpeningBalance(companyID, fiscalYearID) error {
  // Step 1: Validation
  IF FiscalYear.status != OPEN {
    return ERR_PERIOD_CLOSED
  }
  
  IF EXISTS(Journal where source=OB_{companyID}_{fyID} and status=POSTED) {
    return ERR_ALREADY_POSTED
  }
  
  // Step 2: Calculate totals
  lines := GetOpeningBalanceLines(companyID, fiscalYearID)
  totalDebit := Sum(lines.debit_amount)
  totalCredit := Sum(lines.credit_amount)
  
  IF ABS(totalDebit - totalCredit) > 0.005 {
    return ERR_NOT_BALANCED
  }
  
  // Step 3: Create Journal
  journal := Journal{
    source_transaction_id: "OB_{companyID}_{fyID}",
    journal_type: OPENING_BALANCE,
    status: DRAFT,
  }
  
  FOR EACH line IN lines {
    journal.lines.append({
      account_id: line.account_id,
      debit: line.debit_amount,
      credit: line.credit_amount,
    })
  }
  
  // Step 4: Post Journal
  journal.status = POSTED
  journal.posted_at = NOW
  journal.posted_by = currentUser
  Save(journal)
  
  // Step 5: Invalidate cache
  InvalidateGLCache(companyID, fiscalYearID)
  
  return nil
}
```

### Cash-Bank Transaction Auto-Posting

```go
PostCashBankTransaction(cbtID) error {
  cbt := GetCashBankTransaction(cbtID)
  
  // Determine GL accounts based on transaction type
  IF cbt.type == PAYMENT_IN {
    debitAccount = cbt.bank_account_id
    creditAccount = AR_OVERRIDE_ACCOUNT  // From config
  } ELSE IF cbt.type == PAYMENT_OUT {
    debitAccount = AP_OVERRIDE_ACCOUNT  // From config
    creditAccount = cbt.bank_account_id
  }
  
  // Create Journal
  journal := Journal{
    source_transaction_id: cbt.id,
    journal_type: cbt.type,
    lines: [
      { account: debitAccount, debit: cbt.amount, credit: 0 },
      { account: creditAccount, debit: 0, credit: cbt.amount },
    ]
  }
  
  // Post immediately
  PostJournal(journal)
  
  // Link transaction
  cbt.linked_journal_id = journal.id
  cbt.status = POSTED
  Save(cbt)
  
  return nil
}
```

### GL Balance Calculation

```go
GetGLBalance(accountID, companyID, asOfDate) decimal.Decimal {
  // Get opening balance
  ob := GetOpeningBalanceForDate(accountID, companyID, asOfDate)
  openingBal := 0
  IF ob != nil {
    IF account.type IN [ASSET, EXPENSE] {
      openingBal = ob.debit - ob.credit
    } ELSE {
      openingBal = ob.credit - ob.debit
    }
  }
  
  // Get posted journal lines up to date
  lines := GetPostedJournalLines(accountID, companyID, asOfDate)
  postedSum := 0
  FOR EACH line IN lines {
    IF account.type IN [ASSET, EXPENSE] {
      postedSum += (line.debit - line.credit)
    } ELSE {
      postedSum += (line.credit - line.debit)
    }
  }
  
  return openingBal + postedSum
}
```

---

## 🛠 API Endpoints Quick Map

### Phase 0 (Opening Balance)

| Method | Path | Purpose | Permission |
|--------|------|---------|------------|
| GET | `/finance/settings/opening-balance/form-data` | Dropdown data | `opening_balance.read` |
| POST | `/finance/opening-balance/simulate` | Validate balance | `opening_balance.write` |
| POST | `/finance/opening-balance/draft` | Auto-save | `opening_balance.write` |
| POST | `/finance/opening-balance/post` | Finalize | `opening_balance.post` |

### Phase 1 (Journals)

| Method | Path | Purpose | Permission |
|--------|------|---------|------------|
| POST | `/finance/journals` | Create draft | `journal.create` |
| POST | `/finance/journals/simulate` | Validate | `journal.read` |
| POST | `/finance/journals/{id}/post` | Post to GL | `journal.post` |
| POST | `/finance/journals/{id}/reverse` | Create reversal | `journal.reverse` |
| GET | `/finance/gl-balance` | Query balance | `gl.read` |

### Phase 2A (Payments)

| Method | Path | Purpose | Permission |
|--------|------|---------|------------|
| POST | `/finance/journals/cash-bank` | Create payment | `cash_bank_transaction.create` |
| POST | `/finance/journals/cash-bank/{id}/post` | Post | `cash_bank_transaction.post` |
| GET | `/finance/journals/cash-bank` | List | `cash_bank_transaction.read` |

### Phase 2B (Transfers)

| Method | Path | Purpose | Permission |
|--------|------|---------|------------|
| POST | `/finance/bank-transfer` | Create PENDING | `bank_transfer.create` |
| POST | `/finance/bank-transfer/{id}/complete` | Complete → post | `bank_transfer.complete` |
| GET | `/finance/bank-transfer` | List | `bank_transfer.read` |

### Phase 2C (Reconciliation)

| Method | Path | Purpose | Permission |
|--------|------|---------|------------|
| POST | `/finance/bank-reconciliation/import` | Import statement | `bank_reconciliation.create` |
| POST | `/finance/bank-reconciliation/{id}/auto-match` | Auto-match | (auto) |
| POST | `/finance/bank-reconciliation/line/{id}/match` | Manual match | `bank_reconciliation.update` |
| POST | `/finance/bank-reconciliation/line/{id}/exclude` | Exclude & reason | `bank_reconciliation.update` |
| POST | `/finance/bank-reconciliation/{id}/confirm` | Lock & confirm | `bank_reconciliation.post` |

---

## 🧪 Test Checklist (Copy This)

### Phase 0 Tests

- [ ] TC-OB-001: Create balanced OB → POSTED + Journal created
- [ ] TC-OB-002: Unbalanced OB → 400 NOT_BALANCED
- [ ] TC-OB-003: Closed FY → 400 PERIOD_CLOSED
- [ ] TC-OB-004: Duplicate → 409 ALREADY_EXISTS
- [ ] TC-OB-005: Simulate → no posting, just validation
- [ ] TC-OB-006: Permission → 403 for non-Finance
- [ ] TC-OB-007: Auto-save → localStorage every 1.5s
- [ ] TC-OB-008: Summary → show posted journal ref

### Phase 1 Tests

- [ ] TC-J1-001: Balanced journal → DRAFT
- [ ] TC-J1-002: Post balanced → POSTED + immutable
- [ ] TC-J1-003: Unbalanced post → 400 NOT_BALANCED
- [ ] TC-J1-004: GL calc → correct sum
- [ ] TC-J1-005: Reverse → new entry, original stays
- [ ] TC-J1-006: Period lock → 400 PERIOD_CLOSED
- [ ] TC-J1-007: Posted immutable → 400 on update
- [ ] TC-J1-008: Audit trail → who, when, what recorded

### Phase 2A Tests

- [ ] TC-CBT-001: PAYMENT_IN → Bank +X, A/R -X (auto-posted)
- [ ] TC-CBT-002: PAYMENT_OUT → A/P +X, Bank -X (auto-posted)
- [ ] TC-CBT-003: Closed period → 400 PERIOD_CLOSED
- [ ] TC-CBT-004: Reference → CBT-YYYYMMDD-NNN format

### Phase 2B Tests

- [ ] TC-BT-001: Create PENDING → no GL yet
- [ ] TC-BT-002: Complete → To +X, From -X posted
- [ ] TC-BT-003: Self-transfer → 400 SAME_ACCOUNT
- [ ] TC-BT-004: Cancel PENDING → no GL created

### Phase 2C Tests

- [ ] TC-BR-001: Import → parse lines correctly
- [ ] TC-BR-002: Auto-match → high score = matched
- [ ] TC-BR-003: Manual match → user-selected link
- [ ] TC-BR-004: Exclude → reason stored
- [ ] TC-BR-005: Confirm balanced → success locked
- [ ] TC-BR-006: Confirm unbalanced → documented, locked

---

## 🔐 Permissions Reference

### Core Permissions

```
# Opening Balance
opening_balance.read     // View OB, summary
opening_balance.write    // Create, edit draft
opening_balance.post     // Post to GL

# Journal
journal.read            // View journals
journal.create          // Create draft
journal.post            // Post to GL
journal.reverse         // Create reversal

# GL
gl.read                 // Query balances

# Cash-Bank Transactions
cash_bank_transaction.read
cash_bank_transaction.create
cash_bank_transaction.post
cash_bank_transaction.reverse

# Bank Transfer
bank_transfer.read
bank_transfer.create
bank_transfer.complete

# Bank Reconciliation
bank_reconciliation.read
bank_reconciliation.create
bank_reconciliation.update
bank_reconciliation.post
```

### Role Mapping

| Role | Permissions |
|------|-------------|
| **Finance Manager** | All `.post`, all `.complete` |
| **Accountant** | All `.read`, all `.create`, all `.reverse` |
| **Cashier** | `cash_bank_transaction.*` |
| **Bank Officer** | `bank_reconciliation.*` |

---

## 🚨 Common Pitfalls

### 1. Forgetting to Invalidate GL Cache

```go
// ❌ WRONG - Cache stale after posting
PostJournal(journal)
// → GL balance query returns old data!

// ✅ CORRECT
PostJournal(journal)
InvalidateGLCache(companyID, fiscalYearID)
```

### 2. Creating Journal Outside Phase 1

```go
// ❌ WRONG - Bypasses validation
journalLine := JournalLine{ debit: 100, credit: 0 }
Save(journalLine)

// ✅ CORRECT - Via Phase 1
PostCashBankTransaction(cbtID)
// → Phase 1 creates + validates journal
```

### 3. Allowing Edits to Posted Journal

```go
// ❌ WRONG
IF journal.status == POSTED {
  // Still allow update
  Save(journal)
}

// ✅ CORRECT
IF journal.status == POSTED {
  return ERR_IMMUTABLE
}
```

### 4. Forgetting to Check Permissions

```go
// ❌ WRONG - No permission check
IF userID != "" {
  PostOpeningBalance(...)
}

// ✅ CORRECT
IF !userHasPermission(userID, "opening_balance.post") {
  return ERR_PERMISSION_DENIED
}
PostOpeningBalance(...)
```

### 5. Using time.Now() Instead of apptime

```go
// ❌ WRONG - Wrong timezone
now := time.Now()

// ✅ CORRECT - Per-company timezone
now := apptime.NowForCompany(companyID)
```

---

## 📋 Implementation Sequence

### Week 1: Phase 0

```
Day 1-2: Models + Migrations
├── Create opening_balances table
├── Create opening_balance_lines table
└── Register in migrate.go

Day 3-4: Repositories
├── OpeningBalanceRepository
├── OpeningBalanceLineRepository
└── Query methods (find by FY, check posted)

Day 5: DTO + Mapper
├── CreateOpeningBalanceDTO
├── OpeningBalanceResponseDTO
└── Mapping logic

Day 6: Usecase
├── CreateOpeningBalance validation
├── SimulateOpeningBalance
├── PostOpeningBalance
└── GetOpeningBalance

Day 7: Handler + Router
├── HTTP handlers (POST, GET, simulate)
├── Error handling
└── Register routes
```

### Week 2: Phase 1

```
Day 1-2: Models + Migrations
├── journals table
├── journal_lines table
└── Register

Day 3-4: Usecase (Core)
├── CreateJournal (validation)
├── PostJournal
├── GetGLBalance
├── ReverseJournal

Day 5-6: Handler + Router
├── Endpoints
├── Validation
└── Register

Day 7: Testing
├── Unit tests for GL calc
├── Integration tests
```

### Weeks 3-5: Phase 2

Repeat same structure for CashBankTransaction, BankTransfer, BankReconciliation

---

## 🎯 Success Criteria

- [ ] All 24+ test cases passing
- [ ] GL balance matches manual calculation
- [ ] All permissions enforced (403 on violation)
- [ ] All transactions create journal entries
- [ ] Period lock prevents posting
- [ ] Draft auto-save works
- [ ] i18n complete (EN + ID)
- [ ] Postman collection updated
- [ ] Code formatted & passing linter

---

**Last Updated**: April 2026 | **Version**: 1.0 | **Confidence**: High
