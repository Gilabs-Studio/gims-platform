"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Clock, Download, Search, TrendingDown, Users, DollarSign, ExternalLink } from "lucide-react";
import { useHasPermission } from "@/features/master-data/user-management/hooks/use-has-permission";
import { CustomerDetailModal } from "@/features/master-data/customer/components/customer/customer-detail-modal";
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
import { useExportProgress } from "@/lib/use-export-progress";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useReceivablesRecap, useReceivablesSummary } from "../hooks/use-receivables-recap";

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

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const params = {
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    sort_by: "outstanding_amount",
    sort_dir: "desc",
  };

  const { data, isLoading } = useReceivablesRecap(params);
  const { data: summaryData, isLoading: summaryLoading } = useReceivablesSummary();
  const hasCustomerPermission = useHasPermission("customer.read");
  const exportProgress = useExportProgress();

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const summary = summaryData?.data;

  const handleExport = async () => {
    try {
      await exportProgress.runWithProgress({
        endpoint: "/sales/receivables-recap/export",
        params,
      });
      toast.success(t("exportSuccess"));
    } catch {
      toast.error(t("exportError"));
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
          color="bg-primary/10 text-primary"
        />
        <StatCard
          icon={DollarSign}
          label={t("summary.totalReceivable")}
          value={summaryLoading ? null : formatCurrency(summary?.total_receivable ?? 0)}
          color="bg-success/10 text-success"
        />
        <StatCard
          icon={TrendingDown}
          label={t("summary.totalOutstanding")}
          value={summaryLoading ? null : formatCurrency(summary?.total_outstanding ?? 0)}
          color="bg-warning/10 text-warning"
        />
        <StatCard
          icon={AlertTriangle}
          label={t("aging.badDebt")}
          value={summaryLoading ? null : (summary?.bad_debt_count ?? 0).toLocaleString("id-ID")}
          color="bg-destructive/10 text-destructive"
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
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exportProgress.isExporting} id="receivables-recap-export" className="cursor-pointer">
          <Download className="mr-2 h-4 w-4" />
          {exportProgress.label(t("export"))}
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.customerName")}</TableHead>
              <TableHead className="text-right">{t("columns.totalReceivable")}</TableHead>
              <TableHead className="text-right">{t("columns.downPayment", { defaultValue: "Pembayaran Dimuka" })}</TableHead>
              <TableHead className="text-right">{t("columns.paidAmount")}</TableHead>
              <TableHead className="text-right">{t("columns.outstandingAmount")}</TableHead>
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
                  <TableCell className="font-medium">
                    {hasCustomerPermission ? (
                      <span 
                        onClick={() => {
                          setSelectedCustomerId(row.customer_id);
                          setIsModalOpen(true);
                        }} 
                        className="text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        {row.customer_name}
                        <ExternalLink className="h-3 w-3" />
                      </span>
                    ) : (
                      <span className="text-foreground">{row.customer_name}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(row.total_receivable)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatCurrency(row.down_payment)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-success dark:text-success">
                    {formatCurrency(row.paid_amount)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {formatCurrency(row.outstanding_amount)}
                  </TableCell>
                  <TableCell className="text-center">
                    <AgingBadge category={row.aging_category} />
                    <div className="text-xs text-muted-foreground mt-1">{row.aging_days} {t("aging.current").includes("Hari") || t("aging.overdue1_30").includes("Hari") ? "Hari" : "Days"}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(row.last_transaction)}
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

      {/* Customer Detail Modal */}
      {selectedCustomerId && (
        <CustomerDetailModal
          open={isModalOpen}
          onOpenChange={(open) => {
            setIsModalOpen(open);
            if (!open) setTimeout(() => setSelectedCustomerId(null), 300);
          }}
          customerId={selectedCustomerId}
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
