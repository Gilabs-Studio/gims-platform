# Cash Payment COA Resolution Debug Guide

**Issue:** CASH payment posting journal to bank account COA instead of Cash (Kas) COA

## Expected Flow

```
Payment Create (CASH) 
→ resolveBankAccountForPaymentCreate()
  ├─ Resolve finance.cash_default → 11101 (Cash COA)
  ├─ Find bank account linked to Cash COA
  └─ Set payment.BankAccountID = cash_bank_account_id

Payment Confirm
→ triggerJournalEntry()
  ├─ resolveTransactionCOAForJournal(pay, resolvedBankAccount)
  │  ├─ Check pay.Method == CASH
  │  ├─ Resolve finance.cash_default → 11101 COA code
  │  └─ Return: Cash COA ID (not bank account COA ID!)
  ├─ Create TransactionData { TransactionCOAID: cashCOAID }
  ├─ GenerateJournal(ProfileSalesPayment, data)
  │  ├─ Line 1 (credit): "coa.sales_receivable" → AR account
  │  └─ Line 2 (debit): UseTransactionCOA=true → USE TransactionCOAID (Cash COA!)
  └─ PostOrUpdateJournal()
```

**Expected Journal Entry:**
- Debit: Cash (Kas 11101) — from TransactionCOAID
- Credit: Sales Receivable (AR) — from "coa.sales_receivable"

## Possible Root Causes

### 1. finance.cash_default Not Mapped

**Check:**
```sql
SELECT * FROM system_account_mappings 
WHERE key = 'finance.cash_default';
```

**Expected Result:**
- key: finance.cash_default
- coa_code: 11101
- label: Finance Cash Default

**If Missing:** Run seeder
```bash
cd apps/api
go run cmd/api/main.go seed:system-account-mapping
```

### 2. Cash COA (11101) Not Configured

**Check:**
```sql
SELECT id, code, name, type, is_postable, is_active 
FROM chart_of_accounts 
WHERE code = '11101';
```

**Expected Result:**
- code: 11101
- name: Kas / Cash (or similar)
- type: Asset
- is_postable: true
- is_active: true

### 3. Cash Bank Account Not Linked to Cash COA

**Check:**
```sql
SELECT id, name, chart_of_account_id, is_active 
FROM bank_accounts 
WHERE chart_of_account_id = (SELECT id FROM chart_of_accounts WHERE code = '11101') 
  AND is_active = true;
```

**Expected Result:**
- At least one active bank account linked to Cash COA (11101)

**If Missing:** Create a "Petty Cash" bank account with Cash COA linked

### 4. UseTransactionCOA Flag Not Honored

**Check:** Verify `resolveRuleCOA()` in accounting_engine.go handles UseTransactionCOA:
```go
if rule.UseTransactionCOA {
    if data.TransactionCOAID == "" {
        return "", fmt.Errorf("transaction COA ID is required by profile but not provided")
    }
    return data.TransactionCOAID, nil
}
```

**If Issue:** Check ProfileSalesPayment rule 2 has `UseTransactionCOA: true`

### 5. GetCOAByKey Not Working Correctly

**Debug:** Add temporary logging in `resolveTransactionCOAForJournal()`:
```go
defaultCode, err := uc.settingsUC.GetCOAByKey(ctx, "finance.cash_default")
log.Printf("DEBUG: GetCOAByKey(finance.cash_default) returned code=%s, err=%v", defaultCode, err)

def, err := uc.coaUC.GetByCode(ctx, defaultCode)
log.Printf("DEBUG: GetByCode(%s) returned COA ID=%s, err=%v", defaultCode, def.ID, err)
```

## Diagnostic Steps

### Step 1: Verify Payment Created Correctly
```sql
SELECT id, method, bank_account_id, status 
FROM sales_payments 
WHERE method = 'CASH' 
ORDER BY created_at DESC 
LIMIT 5;
```

### Step 2: Verify Journal Entry Generated
```sql
SELECT je.id, je.reference_type, je.reference_id, je.description, 
       jl.chart_of_account_id, coa.code, coa.name, 
       jl.debit, jl.credit 
FROM journal_entries je
JOIN journal_lines jl ON jl.journal_entry_id = je.id
LEFT JOIN chart_of_accounts coa ON coa.id = jl.chart_of_account_id
WHERE je.reference_type = 'SalesPayment'
ORDER BY je.created_at DESC
LIMIT 20;
```

**Problematic Output:**
```
| JE ID | Ref Type | Ref ID | Line | COA Code | COA Name | Debit | Credit |
|-------|----------|--------|------|----------|----------|-------|--------|
| XX    | SalesPayment | YY | 1  | 11100    | Bank Acct | 100   | -      |   ← WRONG (should be 11101 Cash)
| XX    | SalesPayment | YY | 2  | 12100    | AR        | -     | 100    |   ← OK (AR is correct)
```

**Expected Output:**
```
| JE ID | Ref Type | Ref ID | Line | COA Code | COA Name | Debit | Credit |
|-------|----------|--------|------|----------|----------|-------|--------|
| XX    | SalesPayment | YY | 1  | 11101    | Kas      | 100   | -      |   ← CORRECT (Cash COA)
| XX    | SalesPayment | YY | 2  | 12100    | AR       | -     | 100    |   ← OK (AR is correct)
```

### Step 3: Trace resolveTransactionCOAForJournal Call
Add this temporary logging to `sales_payment_usecase.go` line ~1083:

```go
// TEMPORARY DEBUG
transactionCOAID, err := uc.resolveTransactionCOAForJournal(ctx, pay, resolvedBankAccount)
log.Printf("DEBUG_SALES_PAYMENT_COA: method=%s, resolved_coa_id=%s, resolved_bank_account=%s, err=%v",
    pay.Method, transactionCOAID, resolvedBankAccount.Name, err)
// END TEMPORARY DEBUG
```

Then create a CASH payment and check logs:
```bash
# Look for DEBUG_SALES_PAYMENT_COA in application logs
grep "DEBUG_SALES_PAYMENT_COA" /var/log/gims/api.log
```

## Resolution Path

**Most Likely:** Cash bank account not properly linked to Cash COA (11101)

**Fix:**
1. Verify Cash COA exists (11101, Kas)
2. Create/update bank account "Petty Cash" or similar  
3. Link it to Cash COA (11101)
4. Ensure it's marked is_active=true
5. Re-seed system account mappings:
   ```bash
   go run cmd/api/main.go seed:system-account-mapping
   ```
6. Test CASH payment again

## Questions for User

Please provide:
1. What COA code/name is being debited in the journal? (Actual)
2. What should it be? (Expected) 
3. Are there any cash bank accounts set up? If so, what COA are they linked to?
4. Are system_account_mappings seeded? (Check with: `SELECT COUNT(*) FROM system_account_mappings WHERE key LIKE 'finance.%';`)
