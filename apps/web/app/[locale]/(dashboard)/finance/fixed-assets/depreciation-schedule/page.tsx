'use client';

import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle, CalendarDays, CheckCircle2, PlayCircle, RefreshCcw, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PermissionGuard } from '@/features/auth/components/permission-guard';
import { fixedAssetsService } from '@/features/finance/fixed-assets/services/fixed-assets-service';
import type { DepreciationHistoryResponse, DepreciationScheduleResponse, RunDepreciationRequest } from '@/features/finance/fixed-assets/types';

function formatCurrency(value: number, currency = 'IDR') {
  const safeValue = Number.isFinite(value) ? value : 0;
  return safeValue.toLocaleString('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  });
}

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function DepreciationSchedulePage() {
  const [period, setPeriod] = useState(currentPeriod());
  const [assetId, setAssetId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [schedule, setSchedule] = useState<DepreciationScheduleResponse | null>(null);
  const [history, setHistory] = useState<DepreciationHistoryResponse | null>(null);
  const [runResult, setRunResult] = useState<any>(null);

  const requestPayload = useMemo<RunDepreciationRequest>(() => ({
    period,
    asset_id: assetId.trim() || undefined,
    category_id: categoryId.trim() || undefined,
    location_id: locationId.trim() || undefined,
  }), [assetId, categoryId, locationId, period]);

  const previewMutation = useMutation({
    mutationFn: () => fixedAssetsService.getDepreciationSchedule(requestPayload),
    onSuccess: (response) => {
      setSchedule(response.data);
    },
  });

  const historyMutation = useMutation({
    mutationFn: () => fixedAssetsService.getDepreciationHistory(period),
    onSuccess: (response) => {
      setHistory(response.data);
    },
  });

  const runMutation = useMutation({
    mutationFn: () => fixedAssetsService.runDepreciation(requestPayload),
    onSuccess: (response) => {
      setRunResult(response.data);
      setConfirmOpen(false);
      void previewMutation.mutateAsync();
      void historyMutation.mutateAsync();
    },
  });

  const totalItems = schedule?.total_assets ?? 0;
  const postedCount = schedule?.posted ?? 0;
  const pendingCount = schedule?.pending ?? 0;
  const totalAmount = schedule?.total_amount ?? 0;
  const highlightedCount = schedule?.items.filter((item) => item.highlighted).length ?? 0;

  return (
    <PermissionGuard requiredPermission="asset.depreciate">
      <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-8 text-white shadow-2xl">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute left-0 top-0 h-40 w-40 rounded-full bg-cyan-400 blur-3xl" />
          <div className="absolute right-0 bottom-0 h-52 w-52 rounded-full bg-amber-400 blur-3xl" />
        </div>
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <Badge className="bg-white/10 text-white hover:bg-white/10">RUN_DEPRECIATION</Badge>
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">Depreciation Schedule</h1>
            <p className="max-w-2xl text-sm text-slate-300 md:text-base">
              Preview all fixed asset depreciation for a selected period, highlight assets that have not been posted yet, and run the monthly batch with one confirmation step.
            </p>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Assets" value={String(totalItems)} />
            <Stat label="Posted" value={String(postedCount)} />
            <Stat label="Pending" value={String(pendingCount)} />
            <Stat label="Highlighted" value={String(highlightedCount)} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Run Controls</CardTitle>
            <CardDescription>Select period and filters before previewing depreciation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="period">Period</Label>
              <Input id="period" type="month" value={period} onChange={(event) => setPeriod(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="asset-id">Asset</Label>
              <Input id="asset-id" value={assetId} onChange={(event) => setAssetId(event.target.value)} placeholder="Asset ID or code" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-id">Category</Label>
              <Input id="category-id" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} placeholder="Category UUID" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location-id">Location</Label>
              <Input id="location-id" value={locationId} onChange={(event) => setLocationId(event.target.value)} placeholder="Location UUID" />
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={() => previewMutation.mutate()} disabled={previewMutation.isPending} className="gap-2">
                <CalendarDays className="h-4 w-4" />
                Preview
              </Button>
              <Button variant="outline" onClick={() => historyMutation.mutate()} disabled={historyMutation.isPending || !period} className="gap-2">
                <RefreshCcw className="h-4 w-4" />
                History
              </Button>
              <Button
                variant="secondary"
                onClick={() => setConfirmOpen(true)}
                disabled={!schedule || runMutation.isPending}
                className="gap-2"
              >
                <PlayCircle className="h-4 w-4" />
                Run Depreciation
              </Button>
            </div>

            <Alert className="border-amber-200 bg-amber-50 text-amber-900">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Depreciation runs are idempotent per period. If a period has already been posted for this tenant, the run will be rejected.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {schedule && (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle>Preview Schedule</CardTitle>
                <CardDescription>
                  Period {schedule.period} - {schedule.posted} posted, {schedule.pending} pending.
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Acquisition</TableHead>
                      <TableHead className="text-right">Akum. Dep</TableHead>
                      <TableHead className="text-right">NBV</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status posted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedule.items.map((item) => (
                      <TableRow key={item.asset_id} className={item.highlighted ? 'bg-amber-50/70' : ''}>
                        <TableCell className="font-medium">{item.asset_code}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div>{item.asset_name}</div>
                            <div className="text-xs text-muted-foreground">{item.category_name ?? item.category_id}</div>
                          </div>
                        </TableCell>
                        <TableCell>{item.method}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.acquisition_cost)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.accumulated_depreciation)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.net_book_value)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.depreciation_amount)}</TableCell>
                        <TableCell>
                          <Badge variant={item.posted ? 'default' : 'secondary'}>
                            {item.posted ? 'posted' : item.highlighted ? 'not run' : item.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {history && (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle>Depreciation History</CardTitle>
                <CardDescription>
                  {history.total} entries for period {history.period}
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Journal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.items.map((item) => (
                      <TableRow key={item.depreciation_id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{item.asset_code}</div>
                            <div className="text-xs text-muted-foreground">{item.asset_name}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                        <TableCell>
                          <Badge variant={item.posted ? 'default' : 'secondary'}>{item.posted ? 'posted' : 'pending'}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{item.journal_entry_id ?? '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {runResult && (
            <Card className="border-emerald-200 bg-emerald-50 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                  <CardTitle>Run Completed</CardTitle>
                </div>
                <CardDescription>Depreciation batch posted successfully for {period}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm md:grid-cols-4">
                <Stat label="Posted" value={String(runResult.posted ?? 0)} />
                <Stat label="Skipped" value={String(runResult.skipped ?? 0)} />
                <Stat label="Failed" value={String(runResult.failed ?? 0)} />
                <Stat label="Processed" value={String(runResult.processed ?? runResult.items?.length ?? 0)} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Confirm Depreciation Run</DialogTitle>
            <DialogDescription>
              This will post depreciation for period {period}. Posted entries cannot be edited.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3"><div className="text-muted-foreground">Posted</div><div className="font-semibold">{schedule?.posted ?? 0}</div></div>
              <div className="rounded-lg border p-3"><div className="text-muted-foreground">Pending</div><div className="font-semibold">{schedule?.pending ?? 0}</div></div>
              <div className="rounded-lg border p-3"><div className="text-muted-foreground">Total Amount</div><div className="font-semibold flex items-center gap-1"><TrendingUp className="h-4 w-4" />{formatCurrency(schedule?.total_amount ?? 0)}</div></div>
              <div className="rounded-lg border p-3"><div className="text-muted-foreground">Period</div><div className="font-semibold">{period}</div></div>
            </div>
            <Alert className="border-amber-200 bg-amber-50 text-amber-900">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Future changes must be made through reversing journal entries, not by editing depreciation rows.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={() => runMutation.mutate()} disabled={runMutation.isPending}>
              {runMutation.isPending ? 'Running...' : 'Confirm Run'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </PermissionGuard>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
      <div className="text-xs uppercase tracking-wide text-slate-300">{label}</div>
      <div className="mt-1 text-xl font-semibold text-white">{value}</div>
    </div>
  );
}
