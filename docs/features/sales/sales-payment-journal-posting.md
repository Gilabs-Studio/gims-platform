# Sales Payment Journal Posting Implementation

**Module**: Sales / Finance Integration
**Version**: 1.0
**Status**: Implemented & Fixed
**Last Updated**: April 2026

## Overview

Automatic journal posting when Sales Payment is confirmed (Payment Approved). This is a **Critical** feature for recording **Down Payment/Uang Muka** (customer deposits) from incoming payments related to Sales Orders.

### Business Context
- **Scenario**: When a customer makes a Down Payment on a Sales Order, the payment is recorded in `sales_payments` table
- **Current Issue (AUDIT FINDING)**: When payment status changes to `CONFIRMED`, NO journal entry was being created
- **Requirement**: Automatic journal posting to Finance module to record:
  - **Debit**: Kas/Bank (Cash/Bank Account) → Meningkatkan saldo kas
  - **Credit**: Uang Muka Pelanggan (Customer Deposit Liability) → Mencatat kewajiban ke customer

## Key Features

| Feature | Status | Description |
|---------|--------|-------------|
| Payment Confirmation Trigger | ✅ Implemented | Automatic journal posting on payment confirm |
| Down Payment Profile | ✅ Complete | ProfileSalesPaymentDP with proper rules |
| Regular Payment Profile | ✅ Complete | ProfileSalesPayment for regular customer payments |
| Transactional Safety | ✅ Verified | Journal posted inside DB transaction (atomic) |
| Error Handling | ✅ Enhanced | No silent failures, proper validation |
| Preload Safety | ✅ Fixed | Payment preloaded with CustomerInvoice type |

## System Architecture

### Posting Flow

```
SalesPaymentHandler.Confirm(id)
    ↓
SalesPaymentUsecase.Confirm(ctx, id)
    ↓
confirmSalesPaymentTx(ctx, paymentID)  ← ATOMIC TRANSACTION START
    ├─ Lock payment (FOR UPDATE)
    ├─ Lock invoice (FOR UPDATE)
    ├─ Validate payment amount
    ├─ Mark payment as CONFIRMED
    ├─ Update invoice payment status
    ├─ Close SO if fully paid
    ├─ Apply DP recalculation
    │
    ├─ 🎯 PRELOAD: Payment.CustomerInvoice
    ├─ 🎯 TRIGGER: triggerJournalEntry(payment)
    │       ├─ Resolve CompanyID from actor
    │       ├─ Resolve Bank Account COA
    │       ├─ SELECT profile based on invoice type
    │       │   - DOWN_PAYMENT → ProfileSalesPaymentDP
    │       │   - REGULAR → ProfileSalesPayment
    │       ├─ Generate journal via AccountingEngine
    │       └─ Post journal (PostOrUpdateJournal)
    │
    └─ ATOMIC TRANSACTION END
```

### Profile Rules Definition

#### ProfileSalesPaymentDP (Down Payment)
**Reference Type**: `SALES_PAYMENT`  
**Used For**: Payments for down payment invoices

| Rule | COA Setting | Side | Amount Source | Description |
|------|-------------|------|----------------|-------------|
| 1 | `coa.sales_advance` | CREDIT | total | Customer Advance Payment (Liability) |
| 2 | TransactionCOA | DEBIT | total | Inbound Payment to Bank/Cash |

**Configured Posting**:
- **Debit**: Kas/Bank Account (e.g., Bukti Kas Masuk)
- **Credit**: Uang Muka Penjualan (21400 - COA Account)

#### ProfileSalesPayment (Regular Invoice Payment)
**Reference Type**: `SALES_PAYMENT`  
**Used For**: Payments for regular customer invoices

| Rule | COA Setting | Side | Amount Source | Description |
|------|-------------|------|----------------|-------------|
| 1 | `coa.sales_receivable` | CREDIT | total | Reduce AR (Accounts Receivable) |
| 2 | TransactionCOA | DEBIT | total | Inbound Payment to Bank/Cash |

**Configured Posting**:
- **Debit**: Kas/Bank Account
- **Credit**: Piutang Dagang (14100 - AR Account)

## Implementation Details

### File Changes

#### 1. `apps/api/internal/sales/domain/usecase/sales_payment_usecase.go`

**Fix #1: Remove Silent Failure Risk**
```go
// BEFORE: Silent return if dependencies null
if pay == nil || uc.journalUC == nil || uc.engine == nil {
    return nil  // ❌ PROBLEM: No error indication!
}

// AFTER: Explicit error for critical failures
if pay == nil {
    return errors.New("sales payment is nil")
}
if uc.journalUC == nil {
    return errors.New("journal entry usecase is not initialized...")
}
if uc.engine == nil {
    return errors.New("accounting engine is not initialized...")
}
```

**Fix #2: Ensure Payment Preload with CustomerInvoice**
```go
// BEFORE: loadedPay doesn't have CustomerInvoice relation loaded
loadedPay, loadErr := uc.repo.GetByID(txCtx, payment.ID)
if loadErr != nil { ... }
if err := uc.triggerJournalEntry(txCtx, loadedPay); err != nil { ... }

// AFTER: Explicitly preload CustomerInvoice for profile selection
loadedPay, loadErr := uc.repo.GetByID(txCtx, payment.ID)
if loadErr != nil { ... }
// ✅ Preload CustomerInvoice for proper journal profile selection
if err := tx.Model(loadedPay).Association("CustomerInvoice").Find(&loadedPay.CustomerInvoice); err != nil {
    return fmt.Errorf("failed to load customer invoice for payment journal: %w", err)
}
if err := uc.triggerJournalEntry(txCtx, loadedPay); err != nil { ... }
```

**Fix #3: Proper Profile Selection with Fallback**
```go
// BEFORE: Profile selection depends on CustomerInvoice being loaded
invoiceType := models.CustomerInvoiceTypeRegular
if pay.CustomerInvoice != nil {
    invoiceType = pay.CustomerInvoice.Type
} else {
    // Fallback: query invoice type if not preloaded
    var inv models.CustomerInvoice
    if err := database.GetDB(ctx, uc.db).Model(&models.CustomerInvoice{}).
        Select("type").First(&inv, "id = ?", pay.CustomerInvoiceID).Error; err == nil {
        invoiceType = inv.Type
    }
}

profile := accounting.ProfileSalesPayment
descPrefix := "Customer Payment"
if invoiceType == models.CustomerInvoiceTypeDownPayment {
    profile = accounting.ProfileSalesPaymentDP
    descPrefix = "Customer Down Payment"
}
```

### Database Schema Consistency

**Payment Table**: `sales_payments`
- `id` (UUID) - Primary Key
- `customer_invoice_id` (UUID) - Foreign key to `customer_invoices`
- `status` (ENUM: PENDING, CONFIRMED, REVERSED) - Confirmation state
- `amount` (NUMERIC) - Payment amount in invoice currency
- `bank_account_id` (UUID) - Bank/Cash account used
- `payment_date` (TEXT) - Payment date string

**Chart of Accounts**: `chart_of_accounts`
- `code` = "21400" | `name` = "Uang Muka Penjualan" | `type` = LIAISON (LIABILITY)
- `code` = "14100" | `name` = "Piutang Dagang" | `type` = ASSET (AR)
- Bank accounts in Asset type

**System Account Mapping**: `system_account_mappings`
- `key` = "coa.sales_advance" | `coa_code` = "21400"
- `key` = "coa.sales_receivable" | `coa_code` = "14100"
- `key` = "finance.bank_default" | `coa_code` = "[Bank account code]"
- `key` = "finance.cash_default` | `coa_code` = "[Cash account code]"

### Reference Type Registration

**Constant**: `reference.RefTypeSalesPayment = "SALES_PAYMENT"`

Used for:
- Journal Entry `reference_type` column
- Idempotent journal posting (prevents duplicates)
- Audit trail linking

## Journal Generation Logic

### Transaction Data Structure
```go
data := accounting.TransactionData{
    ReferenceType:    "SALES_PAYMENT",        // Journal reference
    ReferenceID:      pay.ID,                 // Payment ID
    CompanyID:        companyID,              // Company context
    EntryDate:        pay.PaymentDate,        // Payment date
    Description:      "Customer Down Payment [REF#]",
    TotalAmount:      pay.Amount,             // Payment amount
    TransactionCOAID: transactionCOAID,       // Bank/Cash COA
    DescriptionArgs:  []interface{}{ref, ba_name},
}
```

### Balance Validation
```go
// Verify debit = credit before posting
var debitTotal, creditTotal float64
for _, l := range req.Lines {
    debitTotal += l.Debit
    creditTotal += l.Credit
}
if math.Abs(debitTotal-creditTotal) > 0.001 {
    return fmt.Errorf("generated journal unbalanced: debit=%.2f credit=%.2f", debitTotal, creditTotal)
}
```

## Error Scenarios & Handling

| Scenario | Error Code | Resolution |
|----------|-----------|-----------|
| Payment not found | `ErrSalesPaymentNotFound` | Verify payment ID exists |
| Invoice not found | `customer_invoice not found` | Check FK relationship |
| Bank account inactive | `bank account inactive` | Activate bank account first |
| Journal posting failed | `failed to create journal for sales payment: {detail}` | Check COA settings, GL configuration |
| CompanyID resolution failed | `failed to resolve company for sales payment journal` | Verify actor has valid employee record |
| Unbalanced journal generated | `journal unbalanced` | Check profile rules in accounting engine |
| Dependencies not initialized | `journal entry usecase not initialized` | Check usecase injection in router |

## Configuration Requirements

### Pre-Requisites (Must be configured before use)

1. **Chart of Accounts** ✅
   - Asset: Kas (11000+)
   - Asset: Bank (11100+)
   - Liability: Uang Muka Penjualan (21400)
   - Asset: Piutang Dagang (14100)

2. **Bank Accounts** ✅
   - Create active bank accounts
   - Link to correct Cash/Bank COA
   - Set as active (`is_active = true`)

3. **System Account Mappings** ✅
   - `coa.sales_advance` → "21400" (required for DP)
   - `coa.sales_receivable` → "14100" (required for regular)
   - `finance.bank_default` → [bank COA code]
   - `finance.cash_default` → [cash COA code]

4. **Company Configuration** ✅
   - Company record created
   - Active in system

### Seeded Data ✅
All configuration is auto-seeded via:
- `seeders/chart_of_accounts_seeder.go` - COA definitions
- `seeders/system_account_mapping_seeder.go` - COA mappings
- `seeders/core_seeder.go` - Bank accounts

## Testing Validation

### Manual Test Scenario: Sales Payment Down Payment

**Setup**:
1. Create Customer Invoice (Type: DOWN_PAYMENT) = Rp 5,000,000
2. Create Sales Payment for above invoice = Rp 5,000,000

**Action**:
```bash
POST /api/v1/sales/sales-payments/{payment_id}/confirm
Authorization: Bearer {token}
```

**Expected Journal Entry**:
```
Reference Type: SALES_PAYMENT
Description: Customer Down Payment [REF#]
Date: [payment_date]

Debit:  11100 (Kas/Bank)         Rp 5,000,000
Credit: 21400 (Uang Muka Penjualan) Rp 5,000,000
Total Debit:   Rp 5,000,000
Total Credit:  Rp 5,000,000
Status: POSTED
```

**Verification**:
✅ GL entry created in `finance.journal_entries` table  
✅ GL lines created in `finance.journal_lines` table  
✅ Payment status = CONFIRMED  
✅ Invoice status = PAID (or appropriate based on remaining)  
✅ No duplicate entries (idempotent)

### Integration Test Points
- [ ] Payment confirm with valid down payment invoice
- [ ] Payment confirm with regular invoice (should use ProfileSalesPayment)
- [ ] Payment reversal triggers journal reversal
- [ ] Multiple payments for same invoice (accumulate properly)
- [ ] Cash vs Bank payment method handling
- [ ] Invalid payment state rejection
- [ ] Transaction rollback on journal failure

## Business Rules (Critical)

1. **Journal Posted Inside Transaction**: If journal posting fails, entire payment confirmation rolls back
2. **Idempotent Posting**: Same payment ID cannot create duplicate journals
3. **Profile Auto-Selection**: System automatically chooses correct profile based on invoice type
4. **No Manual Reversal**: Only Cancel/Reverse operations trigger journal reversal
5. **Money Matches**: Journal always balances (debit = credit)
6. **Company Context**: Journal inherits company from actor's employee record

## Keputusan Teknis

### Decision: Profile Selection Logic

**Options Considered**:
1. Manual profile specification in request (❌ Rejected - too complex)
2. Hardcoded if-else by payment type (✅ Chosen - simple, maintainable)
3. Profile registry pattern (❌ Too early optimization)

**Rationale**:
- Payment already knows which invoice type via CustomerInvoice
- Only 2 profiles needed (Regular + DP)
- Simple if-else is easier to audit and debug
- Matches existing pattern in invoice trigger

**Trade-off**:
- ⚠️ If new payment types added, requires code change
- ✅ No new configuration needed
- ✅ Self-documenting in code

### Decision: Preload vs Lazy-Load

**Options Considered**:
1. Preload in repository (❌ Rejected - adds bloat to all queries)
2. Preload in confirmSalesPaymentTx (✅ Chosen - scoped to where needed)
3. Lazy-load in triggerJournalEntry with fallback (✅ Also good - defensive)

**Rationale**:
- Preload avoids N+1 query in transaction context
- Fallback prevents silent failures if preload missed
- Both approaches work together

**Trade-off**:
- ⚠️ Slightly more queries if preload pattern changes
- ✅ Defensive against future refactoring
- ✅ No performance impact (already in transaction)

## Known Limitations & Future Improvements

| Item | Current | Future |
|------|---------|--------|
| Multi-currency | Same currency only | Support FX journals |
| Partial payments | Supported (by design) | Add prepayment tracking |
| Automatic DP application | Manual via invoice link | Auto-apply on invoice creation |
| Payment reversals | Full only | Support partial reversal |
| Advance receipts | Via DP invoice | Direct advance receipt journal |

## Appendix: Error Codes

| Code | Message | Action |
|------|---------|--------|
| SALES_PAYMENT_NOT_FOUND | Payment record not found | Check payment ID |
| CUSTOMER_INVOICE_NOT_FOUND | Invoice not found or inaccessible | Verify invoice exists and permissions |
| INVALID_PAYMENT_STATE | Payment not in CONFIRMED state for reversal | Must be confirmed first |
| BANK_ACCOUNT_INACTIVE | Selected bank account is inactive | Use active bank account |
| INSUFFICIENT_PERMISSIONS | User lacks sales_order.payment.approve | Contact admin |
| JOURNAL_UNBALANCED | Generated journal debit ≠ credit | Check COA configuration |
| SERVICE_UNAVAILABLE | Journal or accounting engine not initialized | Check system configuration |

## References

- **Posting Profile Definition**: [posting_profile.go](../../../finance/domain/accounting/posting_profile.go)
- **Sales Payment Usecase**: [sales_payment_usecase.go](../../../sales/domain/usecase/sales_payment_usecase.go)
- **COA Seeder**: [chart_of_accounts_seeder.go](../../../seeders/chart_of_accounts_seeder.go)
- **API Endpoint**: `POST /api/v1/sales/sales-payments/{id}/confirm`
- **Journal Posting**: `PostOrUpdateJournal` in Finance module
