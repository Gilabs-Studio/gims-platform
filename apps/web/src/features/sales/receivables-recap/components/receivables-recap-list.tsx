"use client";

import { useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Download, Search, TrendingDown, Users, DollarSign, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useReceivablesRecap, useReceivablesSummary } from "../hooks/use-receivables-recap";
import { receivablesRecapService } from "../services/receivables-recap-service";
import type { ReceivablesRecapListParams } from "../types";

// Debounce hook
function useDebounce(fn: (...args: unknown[]) => void, delay: number) {
  const timer = useMemo(() => ({ id: null as ReturnType<typeof setTimeout> | null }), []);
  return useCallback(
    (...args: unknown[]) => {
      if (timer.id) clearTimeout(timer.id);
      timer.id = setTimeout(() => fn(...args), delay);
    },
    [fn, delay, timer],
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function agingBadgeVariant(category: string) {
  switch (category) {
    case "Paid":
      return "default" as const;
    case "Current":
      return "secondary" as const;
    case "Overdue 1-30":
      return "outline" as const;
    case "Overdue 31-60":
      return "outline" as const;
    case "Overdue 61-90":
      return "destructive" as const;
    case "Bad Debt (>90)":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}

function agingBadgeClass(category: string) {
  switch (category) {
    case "Paid":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "Current":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "Overdue 1-30":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
    case "Overdue 31-60":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
    case "Overdue 61-90":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    case "Bad Debt (>90)":
      return "bg-rose-200 text-rose-900 dark:bg-rose-900/30 dark:text-rose-400 font-semibold";
    default:
      return "";
  }
}

export function ReceivablesRecapList() {
  const t = useTranslations("receivablesRecap");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [params, setParams] = useState<ReceivablesRecapListParams>({
    page: 1,
    per_page: 15,
    sort_by: "outstanding_amount",
    sort_dir: "desc",
  });

  const { data, isLoading } = useReceivablesRecap(params);
  const { data: summaryData, isLoading: summaryLoading } = useReceivablesSummary();

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const summary = summaryData?.data;

  const debouncedSearch = useDebounce((...args: unknown[]) => {
    const val = args[0] as string;
    setPage(1);
    setParams((prev) => ({ ...prev, page: 1, search: val }));
  }, 400);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    debouncedSearch(e.target.value);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setParams((prev) => ({ ...prev, page: newPage }));
  };

  const handleExport = async () => {
    try {
      const blob = await receivablesRecapService.exportCsv(params);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "receivables_recap.csv";
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success(t("toast.exported"));
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={<Users className="h-5 w-5 text-blue-500" />}
          label={t("summary.totalCustomers")}
          value={summary?.total_customers ?? 0}
          loading={summaryLoading}
          format="number"
        />
        <SummaryCard
          icon={<DollarSign className="h-5 w-5 text-green-500" />}
          label={t("summary.totalReceivable")}
          value={summary?.total_receivable ?? 0}
          loading={summaryLoading}
          format="currency"
        />
        <SummaryCard
          icon={<TrendingDown className="h-5 w-5 text-amber-500" />}
          label={t("summary.totalOutstanding")}
          value={summary?.total_outstanding ?? 0}
          loading={summaryLoading}
          format="currency"
        />
        <SummaryCard
          icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
          label={t("summary.badDebt")}
          value={summary?.bad_debt_count ?? 0}
          loading={summaryLoading}
          format="number"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="receivables-recap-search"
            placeholder={t("search")}
            value={search}
            onChange={handleSearchChange}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} id="receivables-recap-export">
          <Download className="mr-2 h-4 w-4" />
          {t("actions.export")}
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t("title")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columns.customer")}</TableHead>
                  <TableHead className="text-right">{t("columns.totalReceivable")}</TableHead>
                  <TableHead className="text-right">{t("columns.paid")}</TableHead>
                  <TableHead className="text-right">{t("columns.outstanding")}</TableHead>
                  <TableHead className="text-center">{t("columns.agingDays")}</TableHead>
                  <TableHead className="text-center">{t("columns.agingCategory")}</TableHead>
                  <TableHead>{t("columns.lastTransaction")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      {t("empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((row) => (
                    <TableRow key={row.customer_id}>
                      <TableCell className="font-medium">{row.customer_name}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(row.total_receivable)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(row.paid_amount)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        {formatCurrency(row.outstanding_amount)}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">{row.aging_days}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={agingBadgeVariant(row.aging_category)}
                          className={agingBadgeClass(row.aging_category)}
                        >
                          {row.aging_category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(row.last_transaction).toLocaleDateString("id-ID")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t("pagination.showing", {
              from: (page - 1) * (params.per_page ?? 15) + 1,
              to: Math.min(page * (params.per_page ?? 15), pagination.total),
              total: pagination.total,
            })}
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.has_prev}
              onClick={() => handlePageChange(page - 1)}
            >
              {t("pagination.prev")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.has_next}
              onClick={() => handlePageChange(page + 1)}
            >
              {t("pagination.next")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  loading,
  format,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  loading: boolean;
  format: "currency" | "number";
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted">{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </p>
          {loading ? (
            <Skeleton className="mt-1 h-7 w-24" />
          ) : (
            <p className="text-xl font-bold tabular-nums truncate">
              {format === "currency" ? formatCurrency(value) : value.toLocaleString("id-ID")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
