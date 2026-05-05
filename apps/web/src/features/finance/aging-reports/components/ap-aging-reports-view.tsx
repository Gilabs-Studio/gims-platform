"use client";

import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";
import { AlertOctagon, Building2, CalendarIcon, FileText, Search, ShieldCheck, Target, TrendingDown } from "lucide-react";

import { Input } from "@/components/ui/input";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useDebounce } from "@/hooks/use-debounce";
import { Link } from "@/i18n/routing";
import { cn, formatCurrency, formatDate, toLocalDateString } from "@/lib/utils";

import { useFinanceAPAging } from "../hooks/use-finance-aging-reports";
import { AgingTable, defaultAgingBucketConfig } from "./aging-table";
import { AgingBucketConfigCard } from "./aging-bucket-config-card";
import type { AgingBucketDefinition, AgingBuckets, APAgingInvoiceRow } from "../types";

function resolveAPHref(row: APAgingInvoiceRow): string {
  const source = row.source_type?.toUpperCase() ?? "";
  if (source === "SUPPLIER_INVOICE") {
    return "/purchase/supplier-invoices";
  }
  if (source === "NON_TRADE_PAYABLE") {
    return "/finance/ap/non-trade-payables";
  }
  return "/finance/ap/aging-reports";
}

function normalizeSourceLabel(sourceType?: string): string {
  const normalized = sourceType?.trim();
  if (!normalized) return "-";

  return normalized
    .toLowerCase()
    .split("_")
    .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(" ");
}

function resolveBucketAmount(buckets: AgingBuckets | undefined, key: string): number {
  if (!buckets) return 0;

  switch (key) {
    case "current":
      return buckets.current ?? 0;
    case "days_1_30":
      return buckets.days_1_30 ?? 0;
    case "days_31_60":
      return buckets.days_31_60 ?? 0;
    case "days_61_90":
      return buckets.days_61_90 ?? 0;
    case "over_90":
      return buckets.over_90 ?? 0;
    default:
      return buckets.dynamic?.[key] ?? 0;
  }
}

function computeSummaryBucketStats(
  buckets: AgingBuckets | undefined,
  bucketConfig: AgingBucketDefinition[] | undefined,
) {
  const config = bucketConfig && bucketConfig.length > 0 ? bucketConfig : defaultAgingBucketConfig;
  const overdueBuckets = config.filter((bucket) => (bucket.min_days ?? 0) > 0);

  const firstOverdue = overdueBuckets[0] ?? config.find((bucket) => bucket.key === "days_1_30");
  const severeOverdue = overdueBuckets[overdueBuckets.length - 1] ?? config.find((bucket) => bucket.key === "over_90");

  return {
    current: resolveBucketAmount(buckets, "current"),
    firstOverdueLabel: firstOverdue?.label ?? "1-30",
    firstOverdueValue: firstOverdue ? resolveBucketAmount(buckets, firstOverdue.key) : resolveBucketAmount(buckets, "days_1_30"),
    severeOverdueLabel: severeOverdue?.label ?? ">90",
    severeOverdueValue: severeOverdue ? resolveBucketAmount(buckets, severeOverdue.key) : resolveBucketAmount(buckets, "over_90"),
  };
}

export function APAgingReportsView() {
  const t = useTranslations("financeAgingReports");
  const tCommon = useTranslations("common");
  const [activeTab, setActiveTab] = useState("report");

  const [date, setDate] = useState<Date>(new Date());
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const asOfDate = useMemo(() => toLocalDateString(date), [date]);
  const debouncedSearch = useDebounce(search, 300);

  const query = useFinanceAPAging({
    as_of_date: asOfDate,
    search: debouncedSearch || undefined,
    include_current: true,
  });

  const rows = useMemo(() => query.data?.data?.rows ?? [], [query.data?.data?.rows]);
  const summary = query.data?.data?.summary;
  const totals = query.data?.data?.totals;
  const bucketConfig = query.data?.data?.bucket_config;

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  if (query.isError) {
    return <div className="text-center py-8 text-destructive">{tCommon("error")}</div>;
  }

  const totalOutstanding = summary?.total_outstanding ?? totals?.remaining ?? 0;
  const summaryBuckets = computeSummaryBucketStats(summary?.buckets ?? totals?.buckets, bucketConfig);

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v)}>
      <TabsList>
        <TabsTrigger value="report" className="cursor-pointer">Laporan Aging</TabsTrigger>
        <TabsTrigger value="config" className="cursor-pointer">Konfigurasi Aging</TabsTrigger>
      </TabsList>

      <TabsContent value="report" className="space-y-6 mt-4">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">{t("sections.ap")}</h1>
            <p className="text-sm text-muted-foreground">{t("description")}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
            <div className="relative w-full sm:w-[250px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("searchPlaceholder")}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full sm:w-60 justify-start text-left font-normal", !date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? formatDate(date) : <span>{t("fields.asOfDate")}</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(selectedDate: Date | undefined) => {
                    if (!selectedDate) return;
                    setDate(selectedDate);
                    setPage(1);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("summary.totalAP")}</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalOutstanding)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("summary.notYetDue")}</CardTitle>
            <ShieldCheck className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summaryBuckets.current)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{summaryBuckets.firstOverdueLabel}</CardTitle>
            <AlertOctagon className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summaryBuckets.firstOverdueValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{summaryBuckets.severeOverdueLabel}</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(summaryBuckets.severeOverdueValue)}</div>
          </CardContent>
        </Card>
      </div>

      <AgingTable
        rows={pagedRows}
        isLoading={query.isLoading}
        noDataText={tCommon("noData")}
        rowKey={(row) => row.invoice_id}
        leadColumns={[
          {
            header: t("fields.supplier"),
            className: "font-medium",
            render: (row) => row.supplier_name || "-",
          },
          {
            header: t("fields.source"),
            render: (row) => (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                {normalizeSourceLabel(row.source_type)}
              </span>
            ),
          },
          {
            header: t("fields.code"),
            render: (row) => row.code,
          },
          {
            header: t("fields.invoiceNumber"),
            render: (row) => row.invoice_number || "-",
          },
          {
            header: t("fields.dueDate"),
            render: (row) => (
              <span className={cn(row.days_past_due > 0 && "text-destructive font-medium")}>
                {formatDate(row.due_date) || "-"}
              </span>
            ),
          },
        ]}
        getBuckets={(row) => row.buckets}
        getRemaining={(row) => row.remaining_amount ?? 0}
        remainingHeader={t("fields.remaining")}
        bucketConfig={bucketConfig}
        actionHeader={t("summary.actions")}
        renderAction={(row) => (
          <Button variant="ghost" size="icon" asChild title={t("summary.viewDetails")} className="cursor-pointer">
            <Link href={resolveAPHref(row)}>
              <FileText className="w-4 h-4" />
            </Link>
          </Button>
        )}
      />

      <DataTablePagination
        pageIndex={page}
        pageSize={pageSize}
        rowCount={rows.length}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
      </TabsContent>

      <TabsContent value="config" className="mt-4">
        <AgingBucketConfigCard reportType="ap" />
      </TabsContent>
    </Tabs>
  );
}
