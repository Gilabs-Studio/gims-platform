"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AlertOctagon,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CalendarIcon,
  FileText,
  Search,
  ShieldCheck,
  Target,
  TrendingDown,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";

import { useDebounce } from "@/hooks/use-debounce";
import { Link } from "@/i18n/routing";
import { cn, formatCurrency, formatDate, toLocalDateString } from "@/lib/utils";

import { useFinanceAPAging, useFinanceARAging } from "../hooks/use-finance-aging-reports";
import { AgingTable, defaultAgingBucketConfig } from "./aging-table";
import type { AgingBucketDefinition, AgingBuckets, APAgingInvoiceRow, ARAgingInvoiceRow } from "../types";

function resolveARHref(row: ARAgingInvoiceRow): string {
  const source = row.source_type?.toUpperCase() ?? "";
  if (source === "CUSTOMER_INVOICE") {
    return "/sales/invoices";
  }
  return "/finance/ar/aging-reports";
}

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

function resolveBucketAmount(buckets: AgingBuckets | undefined, key: string): number {
  if (!buckets) {
    return 0;
  }

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

type AgingSummaryBucketStats = {
  current: number;
  firstOverdueLabel: string;
  firstOverdueValue: number;
  severeOverdueLabel: string;
  severeOverdueValue: number;
};

function computeSummaryBucketStats(
  buckets: AgingBuckets | undefined,
  bucketConfig: AgingBucketDefinition[] | undefined,
): AgingSummaryBucketStats {
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

function normalizeSourceLabel(sourceType?: string): string {
  const normalized = sourceType?.trim();
  if (!normalized) {
    return "-";
  }
  return normalized
    .toLowerCase()
    .split("_")
    .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(" ");
}

export function AgingReportsView() {
  const t = useTranslations("financeAgingReports");
  const tCommon = useTranslations("common");
  const searchParams = useSearchParams();

  const initialTab = searchParams.get("tab") === "ap" ? "ap" : "ar";
  const [activeTab, setActiveTab] = useState<"ar" | "ap">(initialTab);
  const [date, setDate] = useState<Date>(new Date());
  const asOfDate = useMemo(() => toLocalDateString(date), [date]);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const [arPage, setArPage] = useState(1);
  const [arPageSize, setArPageSize] = useState(10);
  const [apPage, setApPage] = useState(1);
  const [apPageSize, setApPageSize] = useState(10);

  const baseParams = useMemo(
    () => ({
      as_of_date: asOfDate,
      search: debouncedSearch || undefined,
      include_current: true,
    }),
    [asOfDate, debouncedSearch],
  );

  const arQuery = useFinanceARAging(baseParams);
  const apQuery = useFinanceAPAging(baseParams);

  const arRows = arQuery.data?.data?.rows ?? [];
  const apRows = apQuery.data?.data?.rows ?? [];

  const arSummary = arQuery.data?.data?.summary;
  const apSummary = apQuery.data?.data?.summary;
  const arTotals = arQuery.data?.data?.totals;
  const apTotals = apQuery.data?.data?.totals;
  const arBucketConfig = arQuery.data?.data?.bucket_config;
  const apBucketConfig = apQuery.data?.data?.bucket_config;

  const arPagedRows = useMemo(() => {
    const start = (arPage - 1) * arPageSize;
    return arRows.slice(start, start + arPageSize);
  }, [arRows, arPage, arPageSize]);

  const apPagedRows = useMemo(() => {
    const start = (apPage - 1) * apPageSize;
    return apRows.slice(start, start + apPageSize);
  }, [apRows, apPage, apPageSize]);

  const anyError = arQuery.isError || apQuery.isError;

  if (anyError) {
    return <div className="text-center py-8 text-destructive">{tCommon("error")}</div>;
  }

  const arTotalOutstanding = arSummary?.total_outstanding ?? arTotals?.remaining ?? 0;
  const arSummaryBuckets = computeSummaryBucketStats(arSummary?.buckets ?? arTotals?.buckets, arBucketConfig);

  const apTotalOutstanding = apSummary?.total_outstanding ?? apTotals?.remaining ?? 0;
  const apSummaryBuckets = computeSummaryBucketStats(apSummary?.buckets ?? apTotals?.buckets, apBucketConfig);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
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
                setArPage(1);
                setApPage(1);
              }}
              className="pl-9"
            />
          </div>
          <div className="w-full sm:w-auto">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full sm:w-60 justify-start text-left font-normal",
                    !date && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? formatDate(date) : <span>{t("fields.asOfDate")}</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(selectedDate: Date | undefined) => {
                    if (!selectedDate) {
                      return;
                    }
                    setDate(selectedDate);
                    setArPage(1);
                    setApPage(1);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value === "ap" ? "ap" : "ar")}
        className="space-y-6"
      >
        <TabsList>
          <TabsTrigger value="ar" className="flex items-center gap-2">
            <ArrowDownRight className="w-4 h-4" />
            {t("sections.ar")}
          </TabsTrigger>
          <TabsTrigger value="ap" className="flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4" />
            {t("sections.ap")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ar" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("summary.totalAR")}</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(arTotalOutstanding)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("summary.notYetDue")}</CardTitle>
                <ShieldCheck className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(arSummaryBuckets.current)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{arSummaryBuckets.firstOverdueLabel}</CardTitle>
                <AlertOctagon className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(arSummaryBuckets.firstOverdueValue)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{arSummaryBuckets.severeOverdueLabel}</CardTitle>
                <TrendingDown className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{formatCurrency(arSummaryBuckets.severeOverdueValue)}</div>
              </CardContent>
            </Card>
          </div>

          <AgingTable
            rows={arPagedRows}
            isLoading={arQuery.isLoading}
            noDataText={tCommon("noData")}
            rowKey={(row) => row.invoice_id}
            leadColumns={[
              {
                header: t("fields.customer"),
                className: "font-medium",
                render: (row) => row.customer_name ?? "-",
              },
              {
                header: t("fields.code"),
                className: "font-medium",
                render: (row) => row.code,
              },
              {
                header: t("fields.invoiceNumber"),
                render: (row) => row.invoice_number ?? "-",
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
            bucketConfig={arBucketConfig}
            actionHeader={t("summary.actions")}
            renderAction={(row) => (
              <Button variant="ghost" size="icon" asChild title={t("summary.viewDetails")} className="cursor-pointer">
                <Link href={resolveARHref(row)}>
                  <FileText className="w-4 h-4" />
                </Link>
              </Button>
            )}
          />

          <DataTablePagination
            pageIndex={arPage}
            pageSize={arPageSize}
            rowCount={arRows.length}
            onPageChange={setArPage}
            onPageSizeChange={(size) => {
              setArPageSize(size);
              setArPage(1);
            }}
          />
        </TabsContent>

        <TabsContent value="ap" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("summary.totalAP")}</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(apTotalOutstanding)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("summary.notYetDue")}</CardTitle>
                <ShieldCheck className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(apSummaryBuckets.current)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{apSummaryBuckets.firstOverdueLabel}</CardTitle>
                <AlertOctagon className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(apSummaryBuckets.firstOverdueValue)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{apSummaryBuckets.severeOverdueLabel}</CardTitle>
                <TrendingDown className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{formatCurrency(apSummaryBuckets.severeOverdueValue)}</div>
              </CardContent>
            </Card>
          </div>

          <AgingTable
            rows={apPagedRows}
            isLoading={apQuery.isLoading}
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
            bucketConfig={apBucketConfig}
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
            pageIndex={apPage}
            pageSize={apPageSize}
            rowCount={apRows.length}
            onPageChange={setApPage}
            onPageSizeChange={(size) => {
              setApPageSize(size);
              setApPage(1);
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
