# Runbook: Journal Valuation

## Overview
This runbook documents operational procedures for the Journal Valuation engine in the GIMS ERP Finance module.

## Who Can Run

| Role | Permissions |
|------|------------|
| Finance Manager | `journal_valuation.read`, `journal_valuation.run`, `journal_valuation.export` |
| Accountant | `journal_valuation.read` |
| Auditor | `journal_valuation.read`, `journal_valuation.export` |

## How to Run a Valuation

### Via UI (Recommended)
1. Navigate to **Finance → Accounting → Journal Valuation**
2. Click **Run Valuation** button (top-right)
3. Fill in the form:
   - **Valuation Type**: Select one (`inventory`, `currency`, `depreciation`, `cost`)
   - **Period Start/End**: Define the accounting period
   - **Reference ID** (optional): Custom idempotency key
4. Click **Continue** → Review parameters → **Confirm**
5. Monitor result in "Recent Valuation Runs" panel

### Via API
```bash
curl -X POST /api/v1/finance/journal-entries/valuation/run \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "valuation_type": "inventory",
    "period_start": "2026-03-01",
    "period_end": "2026-03-31"
  }'
```

## Idempotency Semantics

Each valuation run generates a unique `reference_id` (e.g. `VAL-RUN-INVENTORY-20260331-1742...`).

- If the **same `reference_id`** is passed again, the system returns the **existing run** without creating duplicates.
- If a run is `completed`, the linked journal entry has `is_posted=true` and cannot be modified.
- If a run `failed`, you can re-run with the **same period** but a **new reference_id**.

## How to Re-Run (Void & Rerun)

1. **Reverse the old journal**: Navigate to the journal entry created by the failed/incorrect run and use the **Reverse** action.
2. **Run again**: Trigger a new valuation run for the same period. The system will create new journal entries.
3. **Note**: Do NOT reuse the old `reference_id`; the system auto-generates a new one.

## Concurrency Control

- Only **one run per valuation_type+period** can be in `processing` status at a time.
- If you get `409 Conflict`, wait for the current run to complete before retrying.

## Lifecycle States

```
requested → processing → completed
                       → no_difference  (no accounting differences found)
                       → failed         (error during calculation; error_message populated)
```

## Troubleshooting

### Run stuck in "processing"
This should not happen under normal conditions. If it does:
1. Check API server logs for errors
2. The run record can be manually updated to `failed` in the database
3. A new run can then be created for the same period

### "Valuation conflict" error
Another run is already processing for the same type+period. Wait for it to complete.

### "Posted journal is immutable" error
The referenced journal already exists and is posted. This means the run was already completed successfully. The existing result is returned.

## FAQ for Auditors

**Q: How can I verify valuation journal accuracy?**
A: Filter Journal Entries by `is_valuation=true` or navigate to the Valuation page. All valuation journals have `source=VALUATION` and link to a `valuation_run_id`.

**Q: Can valuation journals be edited?**
A: No. Valuation journals are system-generated and auto-posted. They are immutable. Corrections must be done via Reverse Journal.

**Q: Where can I see the full audit trail?**
A: Each valuation run record in `valuation_runs` contains: who triggered it (`created_by`), when (`created_at`, `completed_at`), what was generated (`journal_entry_id`, totals), and if it failed (`error_message`).
