"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { useDebounce } from "@/hooks/use-debounce";
import { formatCurrency } from "@/lib/utils";

import { useUserPermission } from "@/hooks/use-user-permission";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, Download, TrendingUp, TrendingDown, Hash, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";

import {
  useFinanceValuationJournals,
  useRunFinanceValuationJournal,
  useValuationRuns,
} from "../hooks/use-finance-journals";
import { FilterToolbar } from "./filter-toolbar";
import { StandardTable } from "./standard-table";
import type { RunValuationInput, ValuationType } from "../types";

function safeDate(value?: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function StatusBadge({ status }: { readonly status: string }) {
  if (status === "posted") {
    return <Badge variant="success">Posted</Badge>;
  }
  if (status === "draft") {
    return <Badge variant="secondary">Draft</Badge>;
  }
  return <Badge variant="outline">{status}</Badge>;
}

function RunStatusBadge({ status }: { readonly status: string }) {
  const variants: Record<string, "success" | "secondary" | "destructive" | "outline"> = {
    completed: "success",
    processing: "secondary",
    failed: "destructive",
    no_difference: "outline",
    requested: "outline",
  };
  const labels: Record<string, string> = {
    completed: "Completed",
    processing: "Processing...",
    failed: "Failed",
    no_difference: "No Difference",
    requested: "Requested",
  };
  return (
    <Badge variant={variants[status] ?? "outline"}>
      {labels[status] ?? status}
    </Badge>
  );
}

export function ValuationJournalsList() {
  const t = useTranslations("financeJournals");

  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [runForm, setRunForm] = useState<RunValuationInput>({
    valuation_type: "inventory",
    period_start: "",
    period_end: "",
    reference_id: "",
  });
  const debouncedSearch = useDebounce(search, 300);

  const canRun = useUserPermission("journal_valuation.run");
  const canExport = useUserPermission("journal_valuation.export");
  const runValuation = useRunFinanceValuationJournal();

  // Journal entries for the valuation domain
  const { data, isLoading, isError } = useFinanceValuationJournals({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
    sort_by: "entry_date",
    sort_dir: "desc",
  });

  // Valuation runs history
  const { data: runsData } = useValuationRuns({
    page: 1,
    per_page: 5,
    sort_by: "created_at",
    sort_dir: "desc",
  });

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const runs = runsData?.data ?? [];
  const kpi = runsData?.meta?.additional?.kpi;

  // Calculate KPI from journal list
  const totalDebit = items.reduce((s, i) => s + (i.debit_total ?? 0), 0);
  const totalCredit = items.reduce((s, i) => s + (i.credit_total ?? 0), 0);

  const handleRunSubmit = () => {
    if (!runForm.period_start || !runForm.period_end) {
      toast.error("Period start and end are required");
      return;
    }
    setIsRunModalOpen(false);
    setIsConfirmOpen(true);
  };

  const handleConfirmRun = async () => {
    try {
      await runValuation.mutateAsync({
        valuation_type: runForm.valuation_type,
        period_start: runForm.period_start,
        period_end: runForm.period_end,
        reference_id: runForm.reference_id || undefined,
      });
      toast.success(t("toast.saved"));
      setIsConfirmOpen(false);
      setRunForm({
        valuation_type: "inventory",
        period_start: "",
        period_end: "",
        reference_id: "",
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t("toast.failed");
      toast.error(msg);
    }
  };

  if (isError) {
    return (
      <div className="text-center py-8 text-destructive">
        {t("toast.failed")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {t("valuationTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("valuationDescription")}
          </p>
        </div>
        <div className="flex gap-2">
          {canExport && (
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              {t("actions.export")}
            </Button>
          )}
          {canRun && (
            <Button
              onClick={() => setIsRunModalOpen(true)}
              disabled={runValuation.isPending}
            >
              <Play className="mr-2 h-4 w-4" />
              {t("runValuation")}
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Hash className="h-4 w-4" />
              <span>Total Entries</span>
            </div>
            <p className="text-2xl font-bold mt-1">{pagination?.total ?? items.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span>Total Debit</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400 tabular-nums">
              {formatCurrency(totalDebit)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <span>Total Credit</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-red-600 dark:text-red-400 tabular-nums">
              {formatCurrency(totalCredit)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span>Runs</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-2xl font-bold">{kpi?.completed_runs ?? 0}</p>
              <span className="text-xs text-muted-foreground">
                completed
                {(kpi?.processing_runs ?? 0) > 0 &&
                  ` · ${kpi?.processing_runs} processing`}
                {(kpi?.failed_runs ?? 0) > 0 &&
                  ` · ${kpi?.failed_runs} failed`}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Runs */}
      {runs.length > 0 && (
        <div className="rounded-lg border p-4 bg-muted/30">
          <h3 className="text-sm font-semibold mb-3">Recent Valuation Runs</h3>
          <div className="space-y-2">
            {runs.map((run) => (
              <div
                key={run.id}
                className="flex items-center justify-between py-2 px-3 rounded-md bg-background text-sm"
              >
                <div className="flex items-center gap-3">
                  <RunStatusBadge status={run.status} />
                  <span className="font-mono text-xs text-muted-foreground">
                    {run.reference_id}
                  </span>
                  <span className="capitalize">{run.valuation_type}</span>
                </div>
                <div className="flex items-center gap-4 text-muted-foreground text-xs">
                  <span>
                    {run.period_start} → {run.period_end}
                  </span>
                  {run.total_debit > 0 && (
                    <span className="tabular-nums">
                      {formatCurrency(run.total_debit)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Run Valuation Modal (Form) */}
      <Dialog open={isRunModalOpen} onOpenChange={setIsRunModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("runValuation")}</DialogTitle>
            <DialogDescription>
              Configure the valuation parameters below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="valuation-type">Valuation Type</Label>
              <Select
                value={runForm.valuation_type}
                onValueChange={(v) =>
                  setRunForm((f) => ({
                    ...f,
                    valuation_type: v as ValuationType,
                  }))
                }
              >
                <SelectTrigger id="valuation-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inventory">Inventory</SelectItem>
                  <SelectItem value="currency">Currency Revaluation</SelectItem>
                  <SelectItem value="depreciation">Depreciation</SelectItem>
                  <SelectItem value="cost">Cost Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="period-start">Period Start</Label>
                <Input
                  id="period-start"
                  type="date"
                  value={runForm.period_start}
                  onChange={(e) =>
                    setRunForm((f) => ({ ...f, period_start: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="period-end">Period End</Label>
                <Input
                  id="period-end"
                  type="date"
                  value={runForm.period_end}
                  onChange={(e) =>
                    setRunForm((f) => ({ ...f, period_end: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference-id">
                Reference ID{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="reference-id"
                placeholder="VAL-RUN-INVENTORY-20260331-001"
                value={runForm.reference_id ?? ""}
                onChange={(e) =>
                  setRunForm((f) => ({ ...f, reference_id: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                For idempotency. Leave empty to auto-generate.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRunModalOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={handleRunSubmit}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("runValuation")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("runValuationConfirm")}
              <br />
              <br />
              <strong>Type:</strong>{" "}
              <span className="capitalize">{runForm.valuation_type}</span>
              <br />
              <strong>Period:</strong> {runForm.period_start} →{" "}
              {runForm.period_end}
              {runForm.reference_id && (
                <>
                  <br />
                  <strong>Ref:</strong> {runForm.reference_id}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={runValuation.isPending}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={runValuation.isPending}
              onClick={async (e) => {
                e.preventDefault();
                await handleConfirmRun();
              }}
            >
              {runValuation.isPending ? t("common.loading") : t("common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Filters */}
      <FilterToolbar
        search={search}
        startDate={startDate}
        endDate={endDate}
        searchPlaceholder={t("search")}
        startDateLabel={t("fields.startDate")}
        endDateLabel={t("fields.endDate")}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        onStartDateChange={(value) => {
          setStartDate(value);
          setPage(1);
        }}
        onEndDateChange={(value) => {
          setEndDate(value);
          setPage(1);
        }}
      />

      {/* Table */}
      <StandardTable
        isLoading={isLoading}
        columnCount={6}
        header={
          <TableRow>
            <TableHead>{t("fields.entryDate")}</TableHead>
            <TableHead>{t("fields.description")}</TableHead>
            <TableHead>{t("fields.status")}</TableHead>
            <TableHead>{t("fields.referenceType")}</TableHead>
            <TableHead className="text-right">{t("fields.debit")}</TableHead>
            <TableHead className="text-right">{t("fields.credit")}</TableHead>
          </TableRow>
        }
      >
        {items.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={6}
              className="text-center py-8 text-muted-foreground"
            >
              -
            </TableCell>
          </TableRow>
        ) : (
          items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="tabular-nums">
                {safeDate(item.entry_date)}
              </TableCell>
              <TableCell className="max-w-[260px] truncate">
                {item.description ?? "-"}
              </TableCell>
              <TableCell>
                <StatusBadge status={item.status} />
              </TableCell>
              <TableCell>{item.reference_type ?? "-"}</TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatCurrency(item.debit_total)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatCurrency(item.credit_total)}
              </TableCell>
            </TableRow>
          ))
        )}
      </StandardTable>

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
    </div>
  );
}
