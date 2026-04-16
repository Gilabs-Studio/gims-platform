# Technical Logic Reference

> **Module:** Finance, Inventory, Purchase, Sales, Stock Opname
> **Sprint:** 10-12 (hardening continuation)
> **Version:** 1.0.0
> **Status:** Complete
> **Last Updated:** April 2026

## Overview

This reference explains core technical logic introduced or hardened in the refactor:
- mapping-first account resolution
- journal posting safety (validation and lock behavior)
- moving-average inventory valuation and ledger persistence
- opening balance account and journal lifecycle behavior
- retry strategy for transient failures

## References

- Error code catalog: [docs/api-standart/api-error-codes.md](../../api-standart/api-error-codes.md)
- Rule catalog: [docs/features/finance/business-rules-catalog.md](./business-rules-catalog.md)
- Use case specs: [docs/features/finance/use-case-specifications.md](./use-case-specifications.md)
- Accounting engine logic: [apps/api/internal/finance/domain/accounting/accounting_engine.go](../../../apps/api/internal/finance/domain/accounting/accounting_engine.go)
- Journal usecase logic: [apps/api/internal/finance/domain/usecase/journal_entry_usecase.go](../../../apps/api/internal/finance/domain/usecase/journal_entry_usecase.go)
- Inventory moving average logic: [apps/api/internal/inventory/domain/usecase/inventory_usecase.go](../../../apps/api/internal/inventory/domain/usecase/inventory_usecase.go)

## 1. Formula Reference

### 1.1 Weighted Moving Average Cost

For incoming stock transaction:

- `new_avg_cost = ((current_qty * current_avg_cost) + (incoming_qty * incoming_unit_cost)) / (current_qty + incoming_qty)`

With variables:
- `current_qty`: stock before incoming transaction
- `current_avg_cost`: average cost before incoming transaction
- `incoming_qty`: incoming quantity
- `incoming_unit_cost`: unit cost of incoming transaction

### 1.2 Running Stock Value

- `stock_value = running_qty * average_cost`

### 1.3 Pagination Total Pages

- `total_pages = ceil(total_rows / per_page)`

## 2. Mapping Resolution Logic

### 2.1 Resolution Priority

1. Attempt system mapping key from `system_account_mappings`.
2. Attempt legacy key alias translation when provided by accounting engine.
3. Fallback to legacy finance settings key where backward compatibility is retained.

### 2.2 Pseudocode

```text
function resolveCOACode(settingKey):
  candidates = []

  mappedKey = mapLegacySettingKeyToSystemMapping(settingKey)
  if mappedKey not empty:
    candidates.append(mappedKey)

  candidates.append(settingKey)

  for key in unique(candidates):
    code = settingsService.GetCOAByKey(key)
    if code exists and code not empty:
      return trim(code)

  return settingsService.GetCOACode(settingKey)
```

## 3. Journal Posting Logic

### 3.1 Safety Controls

- Line-level validation (minimum lines, debit-credit structure)
- Balanced total validation
- Closed-period validation
- Account-state validation (`is_postable`, `is_active`)
- Advisory lock for idempotent reference posting paths

### 3.2 Pseudocode: Post Draft Journal

```text
function postJournal(journalID, actorID):
  journal = findJournal(journalID)
  assert journal.status == DRAFT

  validateBalanced(journal.lines)
  ensurePeriodOpen(journal.entry_date)

  if journal.reference_type and journal.reference_id:
    acquireAdvisoryXactLock("journal:<type>:<id>")

  for line in journal.lines:
    account = loadCOA(line.chart_of_account_id)
    assert account.is_postable == true
    assert account.is_active == true

  update journal status = POSTED, posted_at = now, posted_by = actorID
  return journal
```

### 3.3 Pseudocode: PostOrUpdateJournal (Idempotent)

```text
function postOrUpdateJournal(reference_type, reference_id, payload):
  begin transaction
  acquireAdvisoryXactLock("journal:<type>:<id>")

  existing = findByReference(reference_type, reference_id)
  if existing not found:
    create draft journal with payload
  else:
    assert existing.status == DRAFT
    update draft journal and replace lines

  validate lines and accounts
  post draft journal
  commit
```

## 4. Inventory Ledger Write Logic

### 4.1 Write Policy

- ledger row is append-only
- each stock-changing event writes one or more immutable rows
- event types used in this scope: `GR`, `GI`, `OPNAME`

### 4.2 Pseudocode: Append Stock Ledger

```text
function appendStockLedger(productID, transactionID, type, qty, unitCost, avgCost, runningQty):
  stockValue = runningQty * avgCost

  insert into stock_ledgers {
    product_id: productID,
    transaction_id: transactionID,
    transaction_type: type,
    qty: qty,
    unit_cost: unitCost,
    average_cost: avgCost,
    stock_value: stockValue,
    running_qty: runningQty,
    created_at: now
  }
```

## 5. Opening Balance Logic

### 5.1 Core Rules

- opening balance allowed only for postable accounts
- opening balance equity account (`3-9999`) must exist and be protected
- when opening balance changes:
  - reverse previous opening balance journal
  - create new opening balance journal

### 5.2 Journal Type

- opening-balance journal uses `journal_type = OPENING_BALANCE`

## 6. Worked Examples

### Example A: GR -> GI -> OPNAME

Initial state:
- quantity: `100`
- average cost: `10`
- stock value: `1000`

Step 1 (GR): receive `50` at `12`
- new average cost = `((100 * 10) + (50 * 12)) / 150 = 10.6667`
- running quantity = `150`
- stock value = `150 * 10.6667 = 1600.005`

Step 2 (GI): issue `40`
- issue uses current average `10.6667`
- running quantity = `110`
- average cost remains `10.6667`
- stock value = `110 * 10.6667 = 1173.337`

Step 3 (OPNAME): variance `-5`
- running quantity = `105`
- average cost remains `10.6667`
- stock value = `105 * 10.6667 = 1120.0035`
- accounting journal uses loss mapping key account for negative variance

### Example B: Opening Balance Update

Initial opening balance for account A:
- amount: `1000`
- date: `2026-01-01`

User updates opening balance to `1500`:
1. reverse existing opening-balance journal
2. mark original with reversal metadata
3. create new opening-balance journal with amount `1500`

Result:
- exactly one active opening-balance reference for account A

## 7. Edge Cases

1. Mapping key exists but points to inactive account.
   - Result: reject with `ACCOUNT_INACTIVE`.
2. Mapping key missing for runtime posting fallback.
   - Result: reject with `MAPPING_NOT_CONFIGURED`.
3. Journal draft has balanced totals but includes parent account.
   - Result: reject with `ACCOUNT_NOT_POSTABLE`.
4. Posting attempted after financial period close.
   - Result: reject with `PERIOD_CLOSED`.
5. Concurrent post on same document reference.
   - Result: lock-assisted serialization; collision may return `CONCURRENT_LOCK_CONFLICT`.
6. Stock ledger date filter range inverted (`date_from > date_to`).
   - Result: `VALIDATION_ERROR`.

## 8. Retry Guidance

### 8.1 Retryable Conditions

Retry is allowed for transient concurrency failures:
- `CONCURRENT_LOCK_CONFLICT`
- database serialization/deadlock signatures mapped to concurrency code

Recommended strategy:
1. exponential backoff (`200ms`, `500ms`, `1000ms`)
2. max 3 attempts
3. idempotency key/reference must stay identical across attempts

### 8.2 Non-Retryable Conditions

Do not retry automatically for deterministic validation/config errors:
- `MAPPING_NOT_CONFIGURED`
- `ACCOUNT_NOT_POSTABLE`
- `ACCOUNT_INACTIVE`
- `PERIOD_CLOSED`
- `VALIDATION_ERROR`

Action:
- show user corrective guidance and direct navigation to mapping/setup screens where relevant.

## 9. Operational Checklist

Before enabling posting in a new environment:
1. Run seed and validation sequence, including mapping keys.
2. Verify required mapping keys are configured in UI.
3. Verify opening balance equity (`3-9999`) exists and protected.
4. Smoke-test one payment confirm, one manual journal post, and one stock opname post.
5. Verify stock ledger endpoint returns rows for known product transactions.
