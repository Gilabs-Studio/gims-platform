"use client";

import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Play, ShieldCheck, Eye, Download, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { formatCurrency, formatDate } from "@/lib/utils";

import { FinanceListErrorState } from "@/features/finance/shared/components/finance-list-error-state";
import {
  useApproveFinanceValuationRun,
  useFinanceValuationJournals,
  usePreviewFinanceValuationJournal,
  useRunFinanceValuationJournal,
  useValuationRunDetail,
  useValuationRuns,
} from "../hooks/use-finance-journals";
import { FilterToolbar } from "./filter-toolbar";
import { JournalTable, mapJournalToUnifiedRow } from "./journal-table";
import type {
  RunValuationInput,
  ValuationRun,
  ValuationRunStatus,
  ValuationType,
} from "../types";

function statusVariant(status: ValuationRunStatus): "success" | "secondary" | "destructive" | "outline" {
  if (status === "posted") {
    return "success";
  }
  if (status === "pending_approval" || status === "approved") {
    return "secondary";
  }
  if (status === "failed") {
    return "destructive";
  }
  return "outline";
}

function statusLabel(status: ValuationRunStatus): string {
  if (status === "pending_approval") return "Pending Approval";
  if (status === "no_difference") return "No Difference";
  if (status === "posted") return "Completed";
  return status.replace(/_/g, " ");
}

export function ValuationJournalsList() {
  const t = useTranslations("financeJournals");
  const now = new Date();

  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(now.getFullYear(), 0, 1),
    to: now,
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedRunID, setSelectedRunID] = useState<string>("");

  const [runForm, setRunForm] = useState<RunValuationInput>({
    valuation_type: "inventory",
    period_start: "",
    period_end: "",
    reference_id: "",
  });

  const debouncedSearch = useDebounce(search, 300);
  const startDate = dateRange?.from ? dateRange.from.toISOString().slice(0, 10) : undefined;
  const endDate = dateRange?.to ? dateRange.to.toISOString().slice(0, 10) : undefined;

  const handleStartDateChange = (value: string) => {
    setDateRange((prev) => ({
      from: value ? new Date(`${value}T00:00:00`) : undefined,
      to: prev?.to,
    }));
    setPage(1);
  };

  const handleEndDateChange = (value: string) => {
    setDateRange((prev) => ({
      from: prev?.from,
      to: value ? new Date(`${value}T00:00:00`) : undefined,
    }));
    setPage(1);
  };

  const canRun = useUserPermission("journal_valuation.run");
  const canApprove = useUserPermission("journal_valuation.approve");
  const canExport = useUserPermission("journal_valuation.export");
  const canOpenJournal = useUserPermission("journal.read");

  const previewMutation = usePreviewFinanceValuationJournal();
  const runMutation = useRunFinanceValuationJournal();
  const approveMutation = useApproveFinanceValuationRun();

  const { data, isLoading, isError } = useFinanceValuationJournals({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
    sort_by: "entry_date",
    sort_dir: "desc",
  });

  const { data: runsData } = useValuationRuns({
    page: 1,
    per_page: 20,
    sort_by: "created_at",
    sort_dir: "desc",
  });

  const selectedRun = useValuationRunDetail(selectedRunID);

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const runs = runsData?.data ?? [];

  const kpi = runsData?.meta?.additional?.kpi;
  const totals = useMemo(() => {
    const totalDebit = items.reduce((sum, row) => sum + (row.debit_total ?? 0), 0);
    const totalCredit = items.reduce((sum, row) => sum + (row.credit_total ?? 0), 0);
    return { totalDebit, totalCredit };
  }, [items]);

  const handlePreview = async () => {
    if (!runForm.period_start || !runForm.period_end) {
      toast.error("Period start and end are required");
      return;
    }
    try {
      await previewMutation.mutateAsync(runForm);
      setIsPreviewOpen(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("toast.failed");
      toast.error(message);
    }
  };

  const handleRun = async () => {
    try {
      const response = await runMutation.mutateAsync(runForm);
      toast.success(t("toast.saved"));
      setIsPreviewOpen(false);
      setIsRunModalOpen(false);
      setSelectedRunID(response.data.id);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("toast.failed");
      toast.error(message);
    }
  };

  const handleApprove = async (run: ValuationRun) => {
    try {
      await approveMutation.mutateAsync({
        id: run.id,
        data: { notes: "Approved from valuation workspace" },
      });
      toast.success("Valuation approved and posted");
      setSelectedRunID(run.id);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Approval failed";
      toast.error(message);
    }
  };

  const handleRetry = async (run: ValuationRun) => {
    try {
      const response = await runMutation.mutateAsync({
        valuation_type: run.valuation_type,
        period_start: run.period_start,
        period_end: run.period_end,
      });
      toast.success("Retry valuation run submitted");
      setSelectedRunID(response.data.id);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Retry failed";
      toast.error(message);
    }
  };

  if (isError) {
    return <FinanceListErrorState message={t("toast.failed")} />;
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-background via-card to-background p-5">
        <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-primary/10 blur-2xl" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">{t("valuationTitle")}</h1>
            <p className="text-sm text-muted-foreground">{t("valuationDescription")}</p>
          </div>
          <div className="flex gap-2">
            {canExport ? (
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                {t("actions.export")}
              </Button>
            ) : null}
            {canRun ? (
              <Button onClick={() => setIsRunModalOpen(true)}>
                <Play className="mr-2 h-4 w-4" />
                {t("runValuation")}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <div className="rounded-xl border bg-background/80 p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Total Entries</p>
          <p className="text-2xl font-bold">{pagination?.total ?? items.length}</p>
        </div>
        <div className="rounded-xl border bg-background/80 p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Total Debit</p>
          <p className="text-2xl font-bold text-success">{formatCurrency(totals.totalDebit)}</p>
        </div>
        <div className="rounded-xl border bg-background/80 p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Total Credit</p>
          <p className="text-2xl font-bold text-destructive">{formatCurrency(totals.totalCredit)}</p>
        </div>
        <div className="rounded-xl border bg-background/80 p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Posted Runs</p>
          <p className="text-2xl font-bold">{kpi?.completed_runs ?? 0}</p>
        </div>
      </div>

      <div className="rounded-xl border bg-background p-4">
        <div className="mb-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Run History</h3>
        </div>
        {runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No valuation run history yet.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference ID</TableHead>
                  <TableHead>Valuation Type</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Total Debit</TableHead>
                  <TableHead className="text-right">Total Credit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell>
                      <button
                        type="button"
                        className="cursor-pointer text-left text-sm font-medium text-primary hover:underline"
                        onClick={() => setSelectedRunID(run.id)}
                      >
                        {run.reference_id}
                      </button>
                    </TableCell>
                    <TableCell className="uppercase">{run.valuation_type}</TableCell>
                    <TableCell>{formatDate(run.period_start)} - {formatDate(run.period_end)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(run.total_debit ?? 0)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(run.total_credit ?? 0)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(run.status)}>{statusLabel(run.status)}</Badge>
                    </TableCell>
                    <TableCell>{run.created_by ?? "system"}</TableCell>
                    <TableCell>{formatDate(run.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="cursor-pointer">...
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="cursor-pointer" onClick={() => setSelectedRunID(run.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Detail
                          </DropdownMenuItem>
                          {run.journal_entry_id && canOpenJournal ? (
                            <DropdownMenuItem asChild>
                              <Link className="cursor-pointer" href={`/finance/journals?open_journal=${run.journal_entry_id}`}>
                                View Journal
                              </Link>
                            </DropdownMenuItem>
                          ) : null}
                          {canApprove && (run.status === "pending_approval" || run.status === "approved") ? (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              disabled={approveMutation.isPending}
                              onClick={() => handleApprove(run)}
                            >
                              <ShieldCheck className="mr-2 h-4 w-4" />
                              Approve
                            </DropdownMenuItem>
                          ) : null}
                          {canRun && run.status === "failed" ? (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              disabled={runMutation.isPending}
                              onClick={() => handleRetry(run)}
                            >
                              <Play className="mr-2 h-4 w-4" />
                              Retry
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {selectedRunID ? (
        <div className="rounded-xl border bg-background p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Run Detail</h3>
            <Button variant="ghost" size="sm" className="cursor-pointer" onClick={() => setSelectedRunID("")}>
              Close
            </Button>
          </div>
          {selectedRun.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading detail...</p>
          ) : selectedRun.data?.data ? (
            <div className="space-y-3">
              <div className="grid gap-2 md:grid-cols-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Reference</p>
                  <p className="font-medium">{selectedRun.data.data.reference_id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium">{selectedRun.data.data.status}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Delta</p>
                  <p className="font-medium">{formatCurrency(selectedRun.data.data.total_delta ?? 0)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Items</p>
                  <p className="font-medium">{selectedRun.data.data.items?.length ?? 0}</p>
                </div>
              </div>

              <div className="overflow-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="px-3 py-2">Reference</th>
                      <th className="px-3 py-2">Qty</th>
                      <th className="px-3 py-2">Book</th>
                      <th className="px-3 py-2">Actual</th>
                      <th className="px-3 py-2">Delta</th>
                      <th className="px-3 py-2">Direction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedRun.data.data.items ?? []).map((item) => (
                      <tr key={`${item.reference_id}-${item.product_id ?? "none"}`} className="border-t">
                        <td className="px-3 py-2">{item.reference_id}</td>
                        <td className="px-3 py-2 tabular-nums">{item.qty}</td>
                        <td className="px-3 py-2 tabular-nums">{formatCurrency(item.book_value)}</td>
                        <td className="px-3 py-2 tabular-nums">{formatCurrency(item.actual_value)}</td>
                        <td className="px-3 py-2 tabular-nums">{formatCurrency(item.delta)}</td>
                        <td className="px-3 py-2">
                          <Badge variant={item.direction === "gain" ? "success" : "destructive"}>{item.direction}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Run detail not found.</p>
          )}
        </div>
      ) : null}

      <FilterToolbar
        search={search}
        startDate={startDate ?? ""}
        endDate={endDate ?? ""}
        searchPlaceholder={t("search")}
        startDateLabel={t("fields.startDate")}
        endDateLabel={t("fields.endDate")}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        onStartDateChange={handleStartDateChange}
        onEndDateChange={handleEndDateChange}
      />

      <JournalTable
        isLoading={isLoading}
        data={items.map(mapJournalToUnifiedRow)}
        rowStartNumber={((pagination?.page ?? page) - 1) * (pagination?.per_page ?? pageSize) + 1}
      />

      <DataTablePagination
        pageIndex={pagination?.page ?? page}
        pageSize={pagination?.per_page ?? pageSize}
        rowCount={pagination?.total ?? items.length}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />

      <Dialog open={isRunModalOpen} onOpenChange={setIsRunModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("runValuation")}</DialogTitle>
            <DialogDescription>Setup valuation period and type, then preview before posting.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="valuation-type">Valuation Type</Label>
              <Select value={runForm.valuation_type} onValueChange={(v) => setRunForm((prev) => ({ ...prev, valuation_type: v as ValuationType }))}>
                <SelectTrigger id="valuation-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inventory">Inventory</SelectItem>
                  <SelectItem value="fx">FX Valuation</SelectItem>
                  <SelectItem value="depreciation">Depreciation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="period-start">Period Start</Label>
                <Input id="period-start" type="date" value={runForm.period_start} onChange={(e) => setRunForm((prev) => ({ ...prev, period_start: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="period-end">Period End</Label>
                <Input id="period-end" type="date" value={runForm.period_end} onChange={(e) => setRunForm((prev) => ({ ...prev, period_end: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference-id">Reference ID (optional)</Label>
              <Input id="reference-id" value={runForm.reference_id ?? ""} onChange={(e) => setRunForm((prev) => ({ ...prev, reference_id: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="cursor-pointer" onClick={() => setIsRunModalOpen(false)}>Cancel</Button>
            <Button className="cursor-pointer" onClick={handlePreview} disabled={previewMutation.isPending}>
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Valuation Preview</DialogTitle>
            <DialogDescription>Review itemized valuation and generated journal before submitting for approval.</DialogDescription>
          </DialogHeader>
          {previewMutation.data?.data ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3 text-sm">
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">Total Gain</p>
                  <p className="font-semibold text-success">{formatCurrency(previewMutation.data.data.total_gain)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">Total Loss</p>
                  <p className="font-semibold text-destructive">{formatCurrency(previewMutation.data.data.total_loss)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">Total Delta</p>
                  <p className="font-semibold">{formatCurrency(previewMutation.data.data.total_delta)}</p>
                </div>
              </div>

              <div className="overflow-auto rounded-lg border max-h-56">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="px-2 py-2">Ref</th>
                      <th className="px-2 py-2">Direction</th>
                      <th className="px-2 py-2">Book</th>
                      <th className="px-2 py-2">Actual</th>
                      <th className="px-2 py-2">Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewMutation.data.data.items.map((item) => (
                      <tr key={`${item.reference_id}-${item.product_id ?? "none"}`} className="border-t">
                        <td className="px-2 py-2">{item.reference_id}</td>
                        <td className="px-2 py-2 uppercase">{item.direction}</td>
                        <td className="px-2 py-2">{formatCurrency(item.book_value)}</td>
                        <td className="px-2 py-2">{formatCurrency(item.actual_value)}</td>
                        <td className="px-2 py-2">{formatCurrency(item.delta)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="overflow-auto rounded-lg border max-h-40">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="px-2 py-2">COA ID</th>
                      <th className="px-2 py-2">Debit</th>
                      <th className="px-2 py-2">Credit</th>
                      <th className="px-2 py-2">Memo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewMutation.data.data.journal_lines.map((line, idx) => (
                      <tr key={`${line.chart_of_account_id}-${idx}`} className="border-t">
                        <td className="px-2 py-2">{line.chart_of_account_id}</td>
                        <td className="px-2 py-2">{formatCurrency(line.debit)}</td>
                        <td className="px-2 py-2">{formatCurrency(line.credit)}</td>
                        <td className="px-2 py-2">{line.memo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Preview data not available.</p>
          )}
          <DialogFooter>
            <Button variant="outline" className="cursor-pointer" onClick={() => setIsPreviewOpen(false)}>Back</Button>
            <Button className="cursor-pointer" onClick={handleRun} disabled={runMutation.isPending}>
              <Play className="mr-2 h-4 w-4" />
              Submit Run
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
