"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Clock, Download, Search, TrendingDown, Users, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { useDebounce } from "@/hooks/use-debounce";
import { formatCurrency } from "@/lib/utils";
import { useReceivablesRecap, useReceivablesSummary } from "../hooks/use-receivables-recap";
import { receivablesRecapService } from "../services/receivables-recap-service";

function AgingBadge({ category }: { category: string }) {
  switch (category) {
    case "Paid":
      return (
        <Badge variant="success" className="text-xs font-medium">
          <CheckCircle2 className="h-3 w-3" />
          {category}
        </Badge>
      );
    case "Current":
      return (
        <Badge variant="info" className="text-xs font-medium">
          {category}
        </Badge>
      );
    case "Overdue 1-30":
    case "Overdue 31-60":
      return (
        <Badge variant="warning" className="text-xs font-medium">
          <Clock className="h-3 w-3" />
          {category}
        </Badge>
      );
    case "Overdue 61-90":
    case "Bad Debt (>90)":
      return (
        <Badge variant="destructive" className="text-xs font-medium">
          <AlertTriangle className="h-3 w-3" />
          {category}
        </Badge>
      );
    default:
      return <Badge variant="secondary" className="text-xs font-medium">{category}</Badge>;
  }
}

export function ReceivablesRecapList() {
  const t = useTranslations("receivablesRecap");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);

  const params = {
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    sort_by: "outstanding_amount",
    sort_dir: "desc",
  };

  const { data, isLoading } = useReceivablesRecap(params);
  const { data: summaryData, isLoading: summaryLoading } = useReceivablesSummary();

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const summary = summaryData?.data;

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
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label={t("summary.totalCustomers")}
          value={summaryLoading ? null : (summary?.total_customers ?? 0).toLocaleString("id-ID")}
          color="bg-blue-500/10 text-blue-600"
        />
        <StatCard
          icon={DollarSign}
          label={t("summary.totalReceivable")}
          value={summaryLoading ? null : formatCurrency(summary?.total_receivable ?? 0)}
          color="bg-green-500/10 text-green-600"
        />
        <StatCard
          icon={TrendingDown}
          label={t("summary.totalOutstanding")}
          value={summaryLoading ? null : formatCurrency(summary?.total_outstanding ?? 0)}
          color="bg-amber-500/10 text-amber-600"
        />
        <StatCard
          icon={AlertTriangle}
          label={t("summary.badDebt")}
          value={summaryLoading ? null : (summary?.bad_debt_count ?? 0).toLocaleString("id-ID")}
          color="bg-red-500/10 text-red-600"
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
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} id="receivables-recap-export" className="cursor-pointer">
          <Download className="mr-2 h-4 w-4" />
          {t("actions.export")}
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
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
                    <AgingBadge category={row.aging_category} />
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

      {/* Pagination */}
      {pagination && (
        <DataTablePagination
          pageIndex={page}
          pageSize={pageSize}
          rowCount={pagination.total ?? 0}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null;
  color: string;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {value === null ? (
        <Skeleton className="mt-2 h-7 w-24" />
      ) : (
        <p className="text-2xl font-bold mt-1 tabular-nums truncate">{value}</p>
      )}
    </div>
  );
}
