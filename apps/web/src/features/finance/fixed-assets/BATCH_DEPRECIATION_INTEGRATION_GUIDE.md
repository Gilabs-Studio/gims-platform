# Batch Depreciation Frontend Integration Guide

## Overview

This document explains how to integrate the batch depreciation preview and run functionality into your application. The implementation consists of:

1. **Hook**: `useBatchDepreciation` — Manages state and API calls
2. **Components**: Preview and Results components for UI
3. **Page Component**: Full workflow example
4. **Service**: Fixed assets service for API communication
5. **Types**: TypeScript definitions for request/response payloads

## Quick Start

### 1. Import the Hook

```typescript
import { useBatchDepreciation } from "@/features/finance/fixed-assets/hooks/use-batch-depreciation";
```

### 2. Use the Hook in Your Component

```typescript
const {
  preview,           // Mutation for preview API call
  run,              // Mutation for run API call
  previewData,      // Preview response data
  runData,          // Run response data
  periodValidationError,  // Validation error object
  isLoadingPreview, // Boolean: preview in progress
  isRunning,        // Boolean: run in progress
  clearErrors,      // Function: reset error state
  clearPreview,     // Function: clear preview data
  clearResults,     // Function: clear run results
} = useBatchDepreciation();
```

### 3. Handle Period Selection

```typescript
const [month, setMonth] = useState(""); // "01"-"12"
const [year, setYear] = useState("");   // "2024" etc.

const handlePreview = async () => {
  if (!month || !year) return;
  await preview.mutateAsync({ 
    month: parseInt(month, 10), 
    year: parseInt(year, 10) 
  });
};

const handleRun = async () => {
  if (!previewData) return; // Only allow run after successful preview
  await run.mutateAsync({ 
    month: parseInt(month, 10), 
    year: parseInt(year, 10) 
  });
};
```

### 4. Display Preview Results

```typescript
{previewData && (
  <Card>
    <CardHeader>
      <CardTitle>Preview Results</CardTitle>
    </CardHeader>
    <CardContent>
      <div>
        {/* Total depreciation amount */}
        <div>{previewData.total_depreciation_amount}</div>
        
        {/* Summary metrics */}
        <div>Ready: {previewData.successful}</div>
        <div>Skipped: {previewData.skipped}</div>
        <div>Failed: {previewData.failed}</div>
        
        {/* Details table */}
        <Table>
          <TableBody>
            {previewData.preview_lines.map((line) => (
              <TableRow key={line.asset_id}>
                <TableCell>{line.asset_name}</TableCell>
                <TableCell>{line.depreciation_amount}</TableCell>
                <TableCell>{line.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </CardContent>
  </Card>
)}
```

### 5. Display Run Results

```typescript
{runData && (
  <BatchDepreciationResults data={runData} />
)}
```

### 6. Handle Errors

The hook automatically detects closed accounting periods:

```typescript
{periodValidationError && (
  <Alert variant="destructive">
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>
      {periodValidationError.type === "closed_period" 
        ? "Accounting period is closed" 
        : "Validation error"}
    </AlertTitle>
    <AlertDescription>{periodValidationError.message}</AlertDescription>
  </Alert>
)}
```

## Data Flow

```
┌─────────────────────────────────────────┐
│ User selects month/year in dropdown     │
└──────────────┬──────────────────────────┘
               │
               v
      ┌────────────────────┐
      │ User clicks Preview│
      └────────┬───────────┘
               │
               v
  ┌──────────────────────────────┐
  │ preview.mutateAsync()        │
  │ → POST /api/v1/...preview    │
  └───────┬──────────────────────┘
          │
          ├─ Success → setPreviewData()
          │            Show preview table
          │            Enable "Run" button
          │
          └─ Error   → setPeriodValidationError()
                       Show error alert
                       "Periode akuntansi sudah ditutup"

       ┌────────────────────┐
       │ User clicks Run    │
       └────────┬───────────┘
                │
                v
 ┌──────────────────────────────┐
 │ run.mutateAsync()            │
 │ → POST /api/v1/...run        │
 └───────┬──────────────────────┘
         │
         ├─ Success → setRunData()
         │            Show results summary
         │            Display journal IDs
         │            Clear preview
         │
         └─ Error   → setPeriodValidationError()
                      Show error alert
```

## API Contracts

### Preview Request
```json
{
  "period": "2024-01",
  "category_id?": "uuid",
  "location_id?": "uuid"
}
```

### Preview Response
```json
{
  "status": "success",
  "data": {
    "period": "2024-01",
    "total_lines": 50,
    "successful": 45,
    "skipped": 3,
    "failed": 2,
    "total_depreciation_amount": 1250000,
    "currency_code": "IDR",
    "preview_lines": [
      {
        "asset_id": "uuid",
        "asset_code": "FX001",
        "asset_name": "Equipment A",
        "depreciation_method": "SL",
        "depreciation_amount": 25000,
        "book_value": 450000,
        "status": "new",
        "currency_code": "IDR"
      }
    ]
  }
}
```

### Run Request
```json
{
  "period": "2024-01"
}
```

### Run Response
```json
{
  "status": "success",
  "data": {
    "period": "2024-01",
    "posted": 45,
    "skipped": 3,
    "failed": 2,
    "total_amount": 1125000,
    "currency_code": "IDR",
    "journal_ids": ["uuid1", "uuid2", ...],
    "items": [
      {
        "asset_id": "uuid",
        "asset_code": "FX001",
        "asset_name": "Equipment A",
        "amount": 25000,
        "status": "posted",
        "journal_id": "uuid1"
      }
    ]
  }
}
```

## Component Props Reference

### BatchDepreciationPreview Props

```typescript
interface BatchDepreciationPreviewProps {
  month: string;                                    // "01" to "12"
  year: string;                                     // "2024" etc
  onMonthChange: (value: string) => void;          // Update month state
  onYearChange: (value: string) => void;           // Update year state
  onPreview: () => Promise<void>;                  // Call preview mutation
  onRun: () => Promise<void>;                      // Call run mutation
  previewData: BatchDepreciationPreviewResponse | null;
  isLoadingPreview: boolean;
  isRunning: boolean;
  periodValidationError?: PeriodValidationError | null;
}
```

### BatchDepreciationResults Props

```typescript
interface BatchDepreciationResultsProps {
  data: BatchDepreciationRunResponse;
}
```

## Error Handling Guide

### Closed Accounting Period

**Error**: `"Periode akuntansi sudah ditutup"`

**Handling**:
```typescript
if (error.response?.data?.error?.includes("ditutup")) {
  // Show: "Accounting period is closed"
  // Action: User cannot run depreciation
  // Solution: User must close different period or admin opens period
}
```

### Idempotency Violation

**Error**: `"Depreciation already run for this period"`

**Handling**:
```typescript
if (error.response?.data?.error?.includes("already")) {
  // Show: "Depreciation already posted for this period"
  // Action: Warn user about duplicate posting
  // Solution: User must select different period
}
```

### Validation Errors

**Error**: General validation (missing params, etc)

**Handling**:
```typescript
setPeriodValidationError({
  type: "unknown",
  message: error.message
});
```

## Permission Requirements

The components check for `asset.depreciate` permission:

```typescript
const canDepreciate = useUserPermission("asset.depreciate");

// Disable buttons if user lacks permission
<Button disabled={!canDepreciate}>Run Depreciation</Button>
```

## Internationalization (i18n)

All strings use `next-intl`:

```typescript
const t = useTranslations("financeFixedAssets.batchDepreciation");

// Available keys:
t("period")                    // "Period"
t("month")                     // "Month"
t("year")                      // "Year"
t("preview")                   // "Preview"
t("run")                       // "Run"
t("previewResults")            // "Preview Results"
t("ready")                     // "Ready"
t("skipped")                   // "Skipped"
t("failed")                    // "Failed"
t("totalAmount")               // "Total Amount"
t("periodClosed")              // "Accounting period is closed"
t("validationError")           // "Validation error"
t("accountingPeriodClosed")    // "Accounting period is closed"
t("periodValidationFailed")    // "Period validation failed"
```

### Indonesian (Indonesian)
```typescript
t("periodeTertutup")           // "Periode akuntansi sudah ditutup"
t("tidakBisaMenulisDanDepresiasi")
                               // "Tidak dapat menjalankan depresiasi..."
```

## Advanced: Custom Integration

### Workflow with Tabs

```typescript
const [activeTab, setActiveTab] = useState("preview");

<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsContent value="preview">
    <BatchDepreciationPreview {...props} />
  </TabsContent>
  <TabsContent value="results" disabled={!runData}>
    {runData && <BatchDepreciationResults data={runData} />}
  </TabsContent>
</Tabs>

// Auto-switch to results after run
const handleRun = async () => {
  await run.mutateAsync({...});
  setActiveTab("results");
};
```

### Workflow with Modal

```typescript
const [isOpen, setIsOpen] = useState(false);

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    {!runData ? (
      <BatchDepreciationPreview
        onRun={async () => {
          await run.mutateAsync({...});
          // Modal stays open, shows results
        }}
      />
    ) : (
      <BatchDepreciationResults data={runData} />
    )}
  </DialogContent>
</Dialog>
```

### Multi-Tenant Support

The hook automatically includes tenant_id from JWT context (handled by axios interceptor):

```typescript
// No manual tenant_id needed; included by backend
await preview.mutateAsync({ month: 1, year: 2024 });
// Backend receives: { period: "2024-01", tenant_id: "from-jwt" }
```

## Testing Checklist

- [ ] Preview shows correct assets for period
- [ ] Preview calculates correct depreciation amounts
- [ ] Skipped assets (fully depreciated) not in results
- [ ] Run button disabled before preview
- [ ] Run creates journal entries in ledger
- [ ] Accounting period closed error displays
- [ ] Already-run error prevents duplicate posting
- [ ] Results show posted count = preview successful count
- [ ] i18n displays correct language (EN/ID)
- [ ] Permission check works (disabled without asset.depreciate)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Preview shows 0 results | Verify assets exist and have depreciation config |
| "Period closed" error | Check accounting_periods.status for selected month |
| Results page blank | Ensure runData is set before rendering component |
| i18n keys missing | Verify translation keys in i18n/[lang].ts files |
| Type errors in TypeScript | Check types/index.d.ts for correct response shape |

## Related Documentation

- Backend API: [apps/api/AGENTS.md](../../api/AGENTS.md)
- Finance Domain: [apps/api/internal/finance/AGENTS.md](../../api/internal/finance/AGENTS.md)
- Fixed Assets: [apps/web/src/features/finance/fixed-assets/AGENTS.md](./AGENTS.md)
