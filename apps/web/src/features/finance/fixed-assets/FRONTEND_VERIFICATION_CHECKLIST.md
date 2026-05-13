# Frontend Integration Verification Checklist

**Version**: 1.0  
**Last Updated**: 2024  
**Status**: Ready for Implementation

---

## Phase 1: Setup & Prerequisites

### Environment Verification
- [ ] Node.js v18+ installed (`node -v`)
- [ ] pnpm installed (`pnpm -v`)
- [ ] Backend running on localhost:8080
- [ ] Database (PostgreSQL) accessible
- [ ] Redis running (for rate limiting)

### Dependencies Installed
- [ ] `@tanstack/react-query` installed in web app
- [ ] `next-intl` configured for i18n
- [ ] `axios` configured with JWT interceptor
- [ ] shadcn/ui components available (Button, Card, Alert, etc.)

### Configuration
- [ ] `next.config.ts` configured with API proxy (if needed)
- [ ] `.env.local` has correct `NEXT_PUBLIC_API_URL`
- [ ] JWT authentication working (can call protected endpoints)
- [ ] `useUserPermission` hook returns correct permissions from context

---

## Phase 2: Component Integration

### Page Component Setup
- [ ] Created `apps/web/src/features/finance/fixed-assets/pages/batch-depreciation.page.tsx` (or equivalent route)
- [ ] Page imports `useBatchDepreciation` hook
- [ ] Page imports `BatchDepreciationPreview` component
- [ ] Page imports `BatchDepreciationResults` component
- [ ] Page handles month/year state management
- [ ] Page has tab navigation (preview → results)

### Hook Integration
- [ ] Hook is correctly imported: `import { useBatchDepreciation } from "..."`
- [ ] All return values destructured:
  ```typescript
  const {
    preview, run, previewData, runData,
    periodValidationError, isLoadingPreview, isRunning,
    clearErrors, clearPreview, clearResults
  } = useBatchDepreciation();
  ```
- [ ] Preview mutation called with `{ month: number, year: number }`
- [ ] Run mutation called with `{ month: number, year: number }`
- [ ] Error states properly initialized

### Component Props
- [ ] `BatchDepreciationPreview` receives all required props:
  - `month`, `year` (from page state)
  - `onMonthChange`, `onYearChange` (state setters)
  - `onPreview`, `onRun` (mutation handlers)
  - `previewData`, `isLoadingPreview`, `isRunning`
  - `periodValidationError` (from hook)

- [ ] `BatchDepreciationResults` receives:
  - `data={runData}` from hook state

---

## Phase 3: UI/UX Verification

### Preview Component Rendering
- [ ] Month dropdown renders with 12 options (Jan-Dec)
- [ ] Year dropdown renders with 10 options (current year and 9 back)
- [ ] "Preview" button is visible and clickable
- [ ] "Run" button is visible and disabled before preview
- [ ] Both buttons show loading spinner during mutation

### Error Handling Display
- [ ] When period is closed, error alert displays:
  - Title: "Accounting period is closed"
  - Message: "Periode akuntansi sudah ditutup" (or translated text)
  - Icon: AlertTriangle or similar
  - Color: Red/destructive

- [ ] When other validation error, different alert displays:
  - Title: "Validation error"
  - Message: Error details from backend

### Preview Results Display
- [ ] After successful preview, results card renders
- [ ] Results card shows:
  - [ ] Total depreciation amount formatted as currency (IDR, etc.)
  - [ ] "Ready" badge with count
  - [ ] "Skipped" badge with count
  - [ ] "Failed" badge with count (if any)
  - [ ] Total assets count

- [ ] Preview table renders with columns:
  - [ ] Asset Code & Name
  - [ ] Depreciation Method (SL, DB, etc.)
  - [ ] Depreciation Amount (formatted currency)
  - [ ] Book Value (formatted currency)
  - [ ] Status badge (new, skipped, failed)

- [ ] Table shows first 10 rows with "... X more" message

### Results Component Rendering
- [ ] After successful run, results card displays
- [ ] Results card shows:
  - [ ] "Posted" count (green badge)
  - [ ] "Skipped" count
  - [ ] "Failed" count (if any)
  - [ ] "Total Amount" formatted as currency
  - [ ] Period that was processed

- [ ] Results detail list shows:
  - [ ] Asset Code & Name
  - [ ] Amount posted
  - [ ] Journal ID(s) created
  - [ ] Status (posted/skipped/failed)

- [ ] Journal IDs are clickable (or at least copyable)

### Internationalization
- [ ] English text displays correctly (verify on `/en` route)
  - [ ] "Accounting period is closed"
  - [ ] "Total Assets"
  - [ ] "Skipped"
  - [ ] All buttons and labels

- [ ] Indonesian text displays correctly (verify on `/id` route)
  - [ ] "Periode akuntansi sudah ditutup"
  - [ ] All equivalent Indonesian labels

- [ ] Switching languages updates all UI text immediately

### Permission Checks
- [ ] User WITH `asset.depreciate` permission:
  - [ ] Preview button is enabled
  - [ ] Run button is enabled (after preview)

- [ ] User WITHOUT permission:
  - [ ] Preview button is disabled
  - [ ] Run button is disabled
  - [ ] Buttons show disabled state visually

---

## Phase 4: Functional Testing

### Preview Workflow
1. [ ] Select month = "01" (January), year = "2024"
2. [ ] Click "Preview" button
3. [ ] Observe API call to `POST /api/v1/fixed-assets/depreciation/preview`
4. [ ] Verify preview data received within 3 seconds
5. [ ] Verify preview table renders with eligible assets
6. [ ] Verify depreciation amounts are calculated correctly
7. [ ] Verify skipped assets (fully depreciated) show correct status
8. [ ] Verify failed items show error reason (if any)

### Closed Period Rejection
1. [ ] In database, manually set accounting_periods.status = 'closed' for January 2024
2. [ ] Click "Preview" for month=01, year=2024
3. [ ] Observe API call attempt
4. [ ] Verify error alert displays: "Periode akuntansi sudah ditutup"
5. [ ] Verify "Run" button remains disabled
6. [ ] Verify user can select different month to proceed

### Successful Run
1. [ ] Select open accounting period (not closed)
2. [ ] Click "Preview" and verify results
3. [ ] Click "Run" button
4. [ ] Observe API call to `POST /api/v1/fixed-assets/depreciation/run`
5. [ ] Verify loading spinner shows during run (2-5 seconds)
6. [ ] Verify results card renders after completion
7. [ ] Verify journal IDs created and listed
8. [ ] Verify posted count matches preview successful count

### Idempotency Check
1. [ ] After successful run, leave page open or return to same period
2. [ ] Click "Preview" again for same period
3. [ ] Verify preview shows same assets (no duplicates)
4. [ ] Click "Run" again
5. [ ] Verify error alert: "Depreciation already run for this period" (or similar)
6. [ ] Verify "Run" button re-enables only for different period

### Multi-Period Workflow
1. [ ] Run depreciation for January 2024
2. [ ] Verify results display correctly
3. [ ] Clear results (refresh page or click clear button)
4. [ ] Select February 2024
5. [ ] Verify preview shows different assets/amounts
6. [ ] Click "Run" for February
7. [ ] Verify both January and February depreciation posted independently

---

## Phase 5: Data Integrity Verification (Backend Check)

### Ledger Verification
```sql
-- Verify depreciation ledger created
SELECT * FROM asset_depreciations 
WHERE period = '2024-01' AND tenant_id = '<your-tenant>';
-- Expected: One record per asset processed

-- Verify no duplicates
SELECT tenant_id, asset_id, period, COUNT(*) 
FROM asset_depreciations 
WHERE period = '2024-01'
GROUP BY tenant_id, asset_id, period
HAVING COUNT(*) > 1;
-- Expected: No rows (0 results)
```

### Journal Entry Verification
```sql
-- Verify journals created
SELECT je.id, je.journal_type, COUNT(jl.id) as line_count
FROM journal_entries je
LEFT JOIN journal_lines jl ON je.id = jl.journal_entry_id
WHERE je.description LIKE '%depreciation%' 
  AND je.entry_date::DATE = '2024-01-31'
  AND je.tenant_id = '<your-tenant>'
GROUP BY je.id, je.journal_type;
-- Expected: Multiple journal entries, each with 2 lines (debit + credit)
```

### Schedule Marking Verification
```sql
-- Verify schedules marked as posted
SELECT asset_id, period_start_date, is_posted, posted_at
FROM asset_depreciation_schedules
WHERE is_posted = true
  AND posted_at::DATE >= '<run-date>'
  AND tenant_id = '<your-tenant>';
-- Expected: All processed assets marked posted
```

### Event Log Verification
```sql
-- Verify event logs created (not ledger entries)
SELECT * FROM asset_transactions
WHERE type = 'depreciate'
  AND created_at::DATE >= '<run-date>'
  AND tenant_id = '<your-tenant>';
-- Expected: Event logs with ReferenceID pointing to asset_depreciations
```

### Multi-Tenant Isolation
```sql
-- Verify tenant A cannot see tenant B's depreciation
SELECT * FROM asset_depreciations
WHERE tenant_id = '<tenant-a>'
  AND asset_id IN (
    SELECT id FROM fixed_assets WHERE tenant_id = '<tenant-b>'
  );
-- Expected: No rows (0 results)
```

---

## Phase 6: Error Scenarios

### Scenario 1: Invalid Period Format
- [ ] Manually set month = "13" (invalid)
- [ ] Attempt preview
- [ ] Verify error message displays
- [ ] Verify month dropdown prevents invalid input

### Scenario 2: No Eligible Assets
- [ ] In database, mark all company assets as fully depreciated
- [ ] Attempt preview for any period
- [ ] Verify preview shows 0 ready, all skipped
- [ ] Verify "Run" button disabled when 0 assets ready

### Scenario 3: Mixed Success/Failure
- [ ] Manually corrupt one asset record (e.g., negative cost)
- [ ] Run preview including this asset
- [ ] Verify preview shows 1 failed, rest successful
- [ ] Run depreciation
- [ ] Verify results show 1 failed (not posted), rest successful

### Scenario 4: Permission Denied
- [ ] Log in as user without `asset.depreciate` permission
- [ ] Navigate to batch depreciation page
- [ ] Verify buttons are disabled
- [ ] Verify appropriate message shown (if configured)

### Scenario 5: Network Error
- [ ] Stop backend server (or simulate network latency)
- [ ] Click "Preview"
- [ ] Observe timeout/connection error
- [ ] Verify error alert displays generic message
- [ ] Verify buttons remain usable after error cleared

---

## Phase 7: Performance & UX

### Load Time
- [ ] Page loads within 2 seconds
- [ ] Preview API responds within 3 seconds (normal load)
- [ ] Run API responds within 10 seconds (normal load, < 100 assets)

### Responsiveness
- [ ] All buttons respond immediately to clicks (visual feedback)
- [ ] Spinners show for pending requests
- [ ] Page remains scrollable during loading

### Accessibility
- [ ] All inputs have labels
- [ ] All buttons have descriptive text (not icons-only)
- [ ] Error messages are announced to screen readers
- [ ] Tab navigation works correctly between fields
- [ ] Color not sole indicator of status (use badges/text)

### Mobile Responsiveness
- [ ] Layout adapts to small screens (< 640px)
- [ ] Buttons remain clickable on touch devices
- [ ] Table doesn't overflow (use horizontal scroll if needed)
- [ ] Month/year dropdowns work on mobile

---

## Phase 8: Code Quality

### TypeScript Compliance
- [ ] No `any` types used in component props
- [ ] All hook return values typed correctly
- [ ] No TypeScript compilation errors: `pnpm check-types`
- [ ] IDE shows no red squiggles for imports

### ESLint Compliance
- [ ] No ESLint errors: `pnpm lint apps/web`
- [ ] Component follows naming conventions
- [ ] No unused imports

### Component Organization
- [ ] Component imports in correct order: React → hooks → UI → types
- [ ] Props interface defined above component
- [ ] Hook logic isolated from rendering
- [ ] No side effects in render logic

### i18n Keys
- [ ] All user-facing strings use `t()` function
- [ ] No hardcoded English/Indonesian strings in component
- [ ] All keys documented in i18n/[lang].ts files
- [ ] No missing translation keys

---

## Phase 9: Documentation

- [ ] `BATCH_DEPRECIATION_INTEGRATION_GUIDE.md` created
- [ ] Example page component provided
- [ ] Hook API documented with all return values
- [ ] Component props documented
- [ ] Data flow diagram included
- [ ] Error handling examples provided
- [ ] API contracts documented (request/response examples)

---

## Phase 10: Sign-Off

### Backend Team
- [ ] API endpoints verified working
- [ ] Error messages appropriate and informative
- [ ] Multi-tenant isolation confirmed
- [ ] Database integrity verified
- [ ] Performance acceptable

### Frontend Team
- [ ] Components render correctly
- [ ] Hook state management working
- [ ] Error handling user-friendly
- [ ] i18n translations complete
- [ ] TypeScript strict mode compliant

### QA Team
- [ ] Manual test cases executed
- [ ] Edge cases covered
- [ ] No critical bugs blocking release
- [ ] Performance acceptable for production

### Product Owner
- [ ] Feature meets requirements
- [ ] UX acceptable
- [ ] Error messages appropriate
- [ ] Ready for production release

---

## Completion Criteria

**All items checked**: ✅ **READY FOR PRODUCTION**

**Critical items (Phase 1-5)**: ⚠️ **PARTIALLY READY** — Block on critical failures

**Phase 7-10 failures**: ℹ️ **NICE-TO-HAVE** — Can be addressed in next sprint

---

## Notes & Known Issues

### Known Limitations
- Preview limited to first 10 rows in UI (backend returns all)
- Run operation blocks UI during processing (no background job queue)
- No bulk asset selection in preview (all or none)

### Future Enhancements
- Add filter by asset category/location in preview
- Export depreciation schedule to CSV
- Schedule depreciation runs (automated monthly)
- Bulk skip/unskip assets before running

---

## Contact & Support

| Role | Contact | Responsibilities |
|------|---------|------------------|
| Backend Lead | - | API endpoints, validation logic |
| Frontend Lead | - | Hook/component implementation |
| DBA | - | Database verification scripts |
| QA Lead | - | Test case execution, sign-off |

---

**Last Updated**: 2024  
**Next Review**: After first production release
