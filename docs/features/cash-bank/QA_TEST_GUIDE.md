# 🧪 QA & Testing Guide
## Cash & Bank Module - Test Execution Playbook

---

## 📊 Test Strategy Overview

### Test Coverage Matrix

| Phase | Unit Tests | Integration | E2E | Manual | Total |
|-------|-----------|-------------|-----|--------|-------|
| **Phase 0** | 4 | 3 | 1 | - | 8 |
| **Phase 1** | 5 | 3 | - | - | 8+ |
| **Phase 2A** | 2 | 2 | - | - | 4 |
| **Phase 2B** | 2 | 2 | - | - | 4 |
| **Phase 2C** | 3 | 3 | - | - | 6 |
| **Total** | 16 | 13 | 1 | - | 30+ |

---

## 🔍 Phase 0: Opening Balance Tests

### TC-OB-001: Happy Path - Create & Post Balanced Opening Balance

**Scenario**: Finance Manager sets up opening balance for PT GILABS FY 2026

**Precondition**:
- User logged in with `opening_balance.write` + `opening_balance.post` permissions
- Company "PT GILABS" is active
- Fiscal Year "2026" exists with status = OPEN

**Test Steps**:

```
1. Navigate to /finance/settings → Opening Balance section
   Expected: Form appears, no posted OB shown

2. Click "Create Opening Balance"
   Expected: Wizard modal opens (Step 1)

3. Select Company = "PT GILABS", FY = "2026"
   Expected: Dropdowns populated & selected

4. Click "Add Line" 3 times, enter:
   Line 1: Account 1010 (Bank), Debit: 150,000,000, Credit: 0
   Line 2: Account 1020 (Cash), Debit: 100,000,000, Credit: 0
   Line 3: Account 3010 (Equity), Debit: 0, Credit: 250,000,000
   
   Expected: 3 lines visible, totals show:
            Debit: 250,000,000 | Credit: 250,000,000 | Difference: 0

5. Click "Next" → Step 2
   Expected: Simulation runs automatically
            isBalanced: true, status: READY_TO_POST

6. Click "Post"
   Expected: Loading indicator appears

7. Wait for success toast
   Expected: "✓ Opening Balance posted successfully" appears
            Toast includes journal ID

8. Verify in backend:
   GET /finance/opening-balance/summary
   Expected: 
   {
     "is_posted": true,
     "posted_at": "2026-01-15T10:30:00+07:00",
     "posted_journal_id": "jnl-xxx",
     "debit_total": 250000000,
     "credit_total": 250000000
   }

9. Verify GL balance:
   GET /finance/gl-balance?account_id=1010&company_id=xxx&as_of_date=2026-01-15
   Expected: 150000000 (opening balance = debit amount)

10. Verify immutability:
    Try to click "Create Opening Balance" again
    Expected: Button disabled or error "Already posted"
```

**Pass Condition**: ✅
- Journal created with status = POSTED
- GL balances calculated correctly
- Both accounts reflect correct balances
- Cannot re-post for same FY

---

### TC-OB-002: Unbalanced Entry - Rejection

**Scenario**: Finance attempts to post unbalanced opening balance

**Precondition**: Same as TC-OB-001

**Test Steps**:

```
1-3. Same as TC-OB-001 (setup)

4. Click "Add Line" 2 times, enter:
   Line 1: Account 1010, Debit: 150,000,000, Credit: 0
   Line 2: Account 1020, Debit: 100,000,000, Credit: 0
   
   Expected: Lines shown with Difference: 250,000,000

5. Click "Next"
   Expected: Modal shows simulation results
            isBalanced: false
            Difference: 250,000,000
            ❌ Post button is DISABLED

6. Try clicking Post (disabled)
   Expected: No action (button unresponsive)

7. Click "Back" → Step 1

8. Add balancing line:
   Line 3: Account 3010, Debit: 0, Credit: 250,000,000
   
   Expected: Difference now = 0, balanced ✓

9. Click "Next"
   Expected: isBalanced: true, Post button ENABLED

10. Click "Post"
    Expected: Success (as per TC-OB-001)
```

**Pass Condition**: ✅
- Unbalanced entry cannot be posted
- Error message clear
- Post button disabled until balanced

---

### TC-OB-003: Fiscal Year Closed - Rejection

**Scenario**: Attempt to post OB to closed fiscal year

**Precondition**: 
- Fiscal Year "2025" exists with status = CLOSED
- User has permissions

**Test Steps**:

```
1. Select Company = "PT GILABS", FY = "2025" (CLOSED)

2. Attempt to add lines & click "Post"
   Expected: Error message appears:
            "Cannot post to closed fiscal year. 
             Update fiscal year status to OPEN first."

3. Verify error code: 400 PERIOD_CLOSED
```

**Pass Condition**: ✅
- Error prevents posting to closed FY
- Clear error message provided

---

### TC-OB-004: Duplicate Opening Balance - Rejection

**Scenario**: Attempt to post OB when one already exists

**Precondition**: 
- Opening Balance already POSTED for PT GILABS / 2026
- User attempts to create another

**Test Steps**:

```
1. Select PT GILABS / 2026
   Expected: Summary shows "Posted on 2026-01-01"

2. Click "Create Opening Balance"
   Expected: Button disabled OR error message
            "Opening balance already posted. 
             Modify via reversal entry only."
```

**Pass Condition**: ✅
- Cannot create duplicate OB

---

### TC-OB-005: Simulate Without Posting

**Scenario**: Preview balance validation without posting

**Precondition**: Same as TC-OB-001

**Test Steps**:

```
1-4. Enter 3 balanced lines

5. Click "Next" → Wizard Step 2

6. System shows simulation results

7. Click "Back" → Step 1 (do NOT post)

8. Close modal

9. Verify backend:
    Opening balance status = DRAFT (not POSTED)
    No journal created
    GL balances unchanged
```

**Pass Condition**: ✅
- Simulation validates without posting
- Draft still editable
- No GL impact

---

### TC-OB-006: Permission Denied

**Scenario**: Non-Finance user attempts to post

**Precondition**: 
- User logged in with `opening_balance.read` only (no write/post)

**Test Steps**:

```
1. Navigate to Opening Balance
   Expected: Create button visible but DISABLED

2. Try clicking "Create Opening Balance"
   Expected: No action or 403 error:
            "Insufficient permissions. 
             Contact administrator."

3. Verify API call fails:
   POST /finance/opening-balance/post
   Expected: 403 PERMISSION_DENIED
```

**Pass Condition**: ✅
- Non-Finance users cannot post

---

### TC-OB-007: Draft Auto-Save

**Scenario**: Verify draft persists via localStorage/backend

**Precondition**: Same as TC-OB-001

**Test Steps**:

```
1. Click "Create Opening Balance" → Step 1

2. Add Line 1: Account 1010, Debit: 100,000,000
   Expected: Line appears in table

3. Wait 2 seconds (auto-save triggers every 1.5s)

4. Open browser DevTools → Application → LocalStorage
   Expected: Key "finance_opening_balance_draft_v1" contains:
            {
              "companyId": "xxx",
              "fiscalYearId": "xxx",
              "lines": [{"account_id": "1010", "debit_amount": 100000000, ...}],
              "updatedAt": "2026-01-15T10:35:00Z"
            }

5. Add Line 2, wait 2s

6. Close modal without posting

7. Click "Create Opening Balance" again
   Expected: Step 1 shows both lines (restored from draft)

8. OR: Refresh page
   Expected: Draft restored on reload
```

**Pass Condition**: ✅
- Draft auto-saved every 1.5s
- Draft restored on re-open
- No data loss

---

### TC-OB-008: Summary View

**Scenario**: View opening balance summary after posting

**Precondition**: OB already posted (from TC-OB-001)

**Test Steps**:

```
1. Navigate to /finance/settings → Opening Balance

2. Select PT GILABS / 2026

3. Card shows summary:
   Expected: 
   - "Posted on 2026-01-15"
   - "Journal Reference: OB-JNL-001"
   - "Total Debit: 250,000,000"
   - "Total Credit: 250,000,000"
   - Create button: DISABLED

4. Click "View Posted Journal"
   Expected: Navigate to journal detail
            Show all lines as read-only
            Status: POSTED
            Highlight GL impact
```

**Pass Condition**: ✅
- Summary displays correctly
- Posted journal viewable & immutable

---

## 🔄 Phase 1: Journal Engine Tests

### TC-J1-001: Create Balanced Journal

**Scenario**: Accountant creates & posts basic GL journal

**Test Steps**:

```
1. POST /api/v1/finance/journals
   Body:
   {
     "company_id": "xxx",
     "fiscal_year_id": "xxx",
     "journal_date": "2026-01-15",
     "journal_type": "ADJUSTMENT",
     "reference": "ADJ-001",
     "description": "Monthly accrual adjustment",
     "lines": [
       { "account_id": "5010", "debit": 500000, "credit": 0 },
       { "account_id": "2010", "debit": 0, "credit": 500000 }
     ]
   }
   
   Expected: 201 Created
   Returns: journal_id, status=DRAFT

2. POST /api/v1/finance/journals/{id}/post
   Expected: 200 OK
            status=POSTED
            posted_at timestamp

3. GET /api/v1/finance/gl-balance?account_id=5010
   Expected: 500000 (posted amount)
```

**Pass Condition**: ✅
- Journal created & posted
- GL balances updated

---

### TC-J1-002: Unbalanced Journal Rejection

**Scenario**: Attempt to post unbalanced journal

**Test Steps**:

```
1. POST /api/v1/finance/journals (with debit 500K, credit 300K)

2. POST /api/v1/finance/journals/{id}/post
   Expected: 400 NOT_BALANCED
   Error: "Debit total 500K does not equal credit total 300K"

3. Verify journal status still = DRAFT
```

**Pass Condition**: ✅
- Unbalanced journals rejected

---

### TC-J1-003: Period Locked - Rejection

**Scenario**: Attempt to post in locked fiscal year

**Test Steps**:

```
1. Lock FY 2025 (via period management)

2. POST /api/v1/finance/journals with fiscal_year_id=2025
   Expected: 400 PERIOD_CLOSED
```

**Pass Condition**: ✅
- Cannot post in locked periods

---

### TC-J1-004: GL Balance Calculation

**Scenario**: Verify GL balance formula

**Precondition**: 
- OB created: Account 1010 (Bank) = 1,000,000 debit

**Test Steps**:

```
1. Query GL: GET /api/v1/finance/gl-balance?account_id=1010
   Expected: 1,000,000

2. Post Journal:
   Debit: 1010 = 500,000
   Credit: 3010 = 500,000

3. Query GL again
   Expected: 1,000,000 + 500,000 = 1,500,000

4. Post another:
   Credit: 1010 = 200,000 (payment out)
   Debit: 5010 (expense) = 200,000

5. Query GL again
   Expected: 1,500,000 - 200,000 = 1,300,000
```

**Pass Condition**: ✅
- GL balance formula correct
- Opening + Posted = Current

---

### TC-J1-005: Reverse Journal Entry

**Scenario**: Create reversal for erroneous post

**Precondition**: Journal already posted

**Test Steps**:

```
1. POST /api/v1/finance/journals/{id}/reverse
   Body: {
     "reason": "Entry posted to wrong account",
     "description": "Reversal: transfer to correct account"
   }
   
   Expected: 200 OK
            New journal created with type=REVERSAL
            Original journal status unchanged (POSTED)

2. Verify new journal:
   Lines are inverse of original
   Debit ↔ Credit swapped
   Status = POSTED

3. Get GL balance:
   Expected: Back to pre-error balance
```

**Pass Condition**: ✅
- Reversal created correctly
- GL balance corrected

---

## 💳 Phase 2A: Cash-Bank Transaction Tests

### TC-CBT-001: Payment In Auto-Post

**Scenario**: Cashier records receipt from customer

**Test Steps**:

```
1. POST /api/v1/finance/journals/cash-bank
   Body:
   {
     "transaction_type": "PAYMENT_IN",
     "bank_account_id": "1010",
     "amount": 50000000,
     "transaction_date": "2026-01-15",
     "description": "Customer INV-001 Payment"
   }
   
   Expected: 201 Created
            Status: POSTED (auto)
            linked_journal_id populated

2. Verify GL:
   Account 1010 (Bank): +50,000,000
   Account 1200 (A/R): -50,000,000
   
   Expected: Both accounts updated
```

**Pass Condition**: ✅
- Payment auto-posted
- GL entries correct

---

### TC-CBT-002: Payment Out Auto-Post

**Scenario**: Cashier records payment to supplier

**Test Steps**:

```
1. POST /api/v1/finance/journals/cash-bank
   Body:
   {
     "transaction_type": "PAYMENT_OUT",
     "bank_account_id": "1010",
     "amount": 75000000,
     "description": "Supplier XYZ Payment"
   }
   
   Expected: 201 Created, POSTED
            linked_journal_id populated

2. Verify GL:
   Account 1010 (Bank): -75,000,000
   Account 2010 (A/P): +75,000,000
```

**Pass Condition**: ✅
- Payment out auto-posted
- GL entries correct (reversed direction)

---

### TC-CBT-003: Closed Period - Rejection

**Scenario**: Attempt to record payment in closed period

**Test Steps**:

```
1. Lock FY 2025

2. POST /api/v1/finance/journals/cash-bank for 2025
   Expected: 400 PERIOD_CLOSED
```

**Pass Condition**: ✅
- Period lock prevents new transactions

---

### TC-CBT-004: Reference Number Generation

**Scenario**: Verify reference format

**Test Steps**:

```
1. Create 3 payments on 2026-01-15:
   CBT 1: reference = CBT-20260115-001
   CBT 2: reference = CBT-20260115-002
   CBT 3: reference = CBT-20260115-003

2. Create on 2026-01-16:
   CBT 4: reference = CBT-20260116-001
   
   Expected: Format CBT-YYYYMMDD-NNN
            Counter resets daily
```

**Pass Condition**: ✅
- Reference format correct

---

## 🔀 Phase 2B: Bank Transfer Tests

### TC-BT-001: Create PENDING Transfer

**Scenario**: Finance initiates transfer

**Test Steps**:

```
1. POST /api/v1/finance/bank-transfer
   Body:
   {
     "from_account_id": "1010",
     "to_account_id": "1020",
     "amount": 200000000,
     "transfer_date": "2026-01-15"
   }
   
   Expected: 201 Created
            Status: PENDING
            NO linked_journal_id yet

2. Verify GL unchanged
   Expected: No journal created
```

**Pass Condition**: ✅
- Transfer created as PENDING
- No GL impact yet

---

### TC-BT-002: Complete Transfer

**Scenario**: Manager reviews & completes transfer

**Test Steps**:

```
1. POST /api/v1/finance/bank-transfer/{id}/complete
   
   Expected: 200 OK
            Status: COMPLETED
            linked_journal_id created

2. Verify GL:
   Account 1020 (To): +200,000,000
   Account 1010 (From): -200,000,000
```

**Pass Condition**: ✅
- Transfer completed
- GL posted correctly

---

### TC-BT-003: Self-Transfer Rejected

**Scenario**: Attempt transfer from account to itself

**Test Steps**:

```
1. POST /api/v1/finance/bank-transfer
   { "from_account_id": "1010", "to_account_id": "1010", ... }
   
   Expected: 400 SAME_ACCOUNT
```

**Pass Condition**: ✅
- Self-transfer rejected

---

### TC-BT-004: Cancel PENDING Transfer

**Scenario**: Abort transfer before completion

**Test Steps**:

```
1. Create transfer (PENDING)

2. DELETE /api/v1/finance/bank-transfer/{id}
   OR POST /api/v1/finance/bank-transfer/{id}/cancel
   
   Expected: Status: CANCELLED
            No journal created

3. Verify GL unchanged
```

**Pass Condition**: ✅
- Cancelled transfers have no GL impact

---

## 🔍 Phase 2C: Bank Reconciliation Tests

### TC-BR-001: Import Statement

**Scenario**: Finance imports bank statement CSV

**Test Steps**:

```
1. POST /api/v1/finance/bank-reconciliation/import
   Form Data:
   - bank_account_id: 1010
   - file: statement.csv
   
   CSV Format:
   date,description,amount,type
   2026-01-10,Opening,1000000,opening
   2026-01-11,Customer Payment,500000,debit
   2026-01-12,Cheque 001,200000,credit
   2026-01-15,Closing,1300000,closing
   
   Expected: 201 Created
            Parsed lines: 4
            Status: DRAFT
```

**Pass Condition**: ✅
- Statement imported
- Lines parsed correctly

---

### TC-BR-002: Auto-Match

**Scenario**: System matches statement to posted transactions

**Precondition**: 
- Statement imported with 50 lines
- Posted transactions: 45 matching entries

**Test Steps**:

```
1. POST /api/v1/finance/bank-reconciliation/{id}/auto-match
   
   Expected: 200 OK
   Results:
   {
     "matched": 45,
     "unmatched": 5,
     "matching_algorithm": "date_±1d_and_amount_match"
   }

2. Query statement lines:
   GET /api/v1/finance/bank-reconciliation/{id}/lines
   
   Expected: 45 with status=MATCHED
            5 with status=UNMATCHED
```

**Pass Condition**: ✅
- Auto-match algorithm works
- Correct lines matched

---

### TC-BR-003: Manual Match

**Scenario**: Finance manually matches unmatched line

**Test Steps**:

```
1. POST /api/v1/finance/bank-reconciliation/line/{line_id}/match
   Body: {
     "transaction_id": "cbt_xxx"
   }
   
   Expected: 200 OK
            Line status: MATCHED
            matched_transaction_id: cbt_xxx
```

**Pass Condition**: ✅
- Manual match recorded

---

### TC-BR-004: Exclude Line

**Scenario**: Mark line as excluded with reason

**Test Steps**:

```
1. POST /api/v1/finance/bank-reconciliation/line/{line_id}/exclude
   Body: {
     "reason": "Bank monthly service charge - fee"
   }
   
   Expected: 200 OK
            Status: EXCLUDED
            exclude_reason: "Bank monthly service charge - fee"
```

**Pass Condition**: ✅
- Excluded with documented reason

---

### TC-BR-005: Confirm Balanced Reconciliation

**Scenario**: Finance Manager confirms reconciliation when balanced

**Precondition**:
- All 50 lines matched or excluded
- GL Balance = Statement Balance

**Test Steps**:

```
1. GET /api/v1/finance/bank-reconciliation/{id}/status
   Expected: {
     "gl_balance": 1300000,
     "statement_balance": 1300000,
     "difference": 0,
     "matched": 48,
     "excluded": 2,
     "unmatched": 0,
     "can_confirm": true
   }

2. POST /api/v1/finance/bank-reconciliation/{id}/confirm
   
   Expected: 200 OK
            Status: CONFIRMED
            confirmed_at: timestamp
            confirmed_by: user_id
            No further changes allowed
```

**Pass Condition**: ✅
- Balanced reconciliation confirmed

---

### TC-BR-006: Confirm Unbalanced with Documentation

**Scenario**: Finance confirms with known reconciling difference

**Precondition**:
- GL Balance: 1,290,000
- Statement Balance: 1,300,000
- Difference: 10,000,000 (known outstanding item)

**Test Steps**:

```
1. GET /api/v1/finance/bank-reconciliation/{id}/status
   Expected: {
     "difference": 10000000,
     "can_confirm": false  // Initially false
   }

2. Finance manually marks as reconciled:
   POST /api/v1/finance/bank-reconciliation/{id}/confirm
   Body: {
     "reconciliation_note": "10M outstanding transfer expected tomorrow",
     "reconciliation_date": "2026-01-15"
   }
   
   Expected: 200 OK
            Documented for audit
            Period can now close
```

**Pass Condition**: ✅
- Unbalanced reconciliation accepted with explanation
- Audit trail preserved

---

## 📋 Test Execution Checklist

### Before Testing

- [ ] All backend services running (postgres, redis, api)
- [ ] Frontend dev server running
- [ ] Test data seeded (companies, COA, FY, accounts)
- [ ] Test user created with permissions
- [ ] Postman collection ready for API tests
- [ ] Browser dev tools open

### During Testing

- [ ] Each test case has a pass/fail status
- [ ] Errors logged with screenshots
- [ ] API responses captured (status, response body)
- [ ] GL balances verified via database query
- [ ] Audit trail checked for each operation

### After Testing

- [ ] Test report prepared
- [ ] Failures documented with root cause
- [ ] Coverage gaps identified
- [ ] Regression tests prepared for next sprint

---

## 🖥️ API Testing Tools

### Postman Collection Setup

```
Environment Variables:
- base_url: http://localhost:8080/api/v1
- company_id: xxx
- auth_token: Bearer xxx
- fiscal_year_id: xxx
```

### Sample Requests

**Create Opening Balance (Draft)**
```
POST {{base_url}}/finance/opening-balance/draft
{
  "company_id": "{{company_id}}",
  "fiscal_year_id": "{{fiscal_year_id}}",
  "lines": [
    { "account_id": "1010", "debit_amount": 100000000, "credit_amount": 0 },
    { "account_id": "3010", "debit_amount": 0, "credit_amount": 100000000 }
  ]
}
```

**Post Opening Balance**
```
POST {{base_url}}/finance/opening-balance/post
{
  "company_id": "{{company_id}}",
  "fiscal_year_id": "{{fiscal_year_id}}"
}
```

---

## ✅ Sign-Off Criteria

All tests must be:
- [ ] Executed against current build
- [ ] Passed with documented evidence
- [ ] Verified in both browsers (Chrome, Firefox)
- [ ] Smoke tested on staging environment
- [ ] Ready for production deployment

**Signed Off By**: _______________  
**Date**: _______________
