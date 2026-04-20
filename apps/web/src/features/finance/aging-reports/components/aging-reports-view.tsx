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
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import type { APAgingInvoiceRow, ARAgingInvoiceRow } from "../types";

function resolveARHref(row: ARAgingInvoiceRow): string {
  const source = row.source_type?.toUpperCase() ?? "";
  if (source === "CUSTOMER_INVOICE") {
    return "/finance/ar/customer-invoices";
  }
  return "/finance/ar/aging-reports";
}

function resolveAPHref(row: APAgingInvoiceRow): string {
  const source = row.source_type?.toUpperCase() ?? "";
  if (source === "SUPPLIER_INVOICE") {
    return "/finance/ap/supplier-invoices";
  }
  if (source === "NON_TRADE_PAYABLE") {
    return "/finance/ap/non-trade-payables";
  }
  return "/finance/ap/aging-reports";
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
  const arCurrent = arSummary?.total_current ?? arTotals?.buckets.current ?? 0;
  const arOverdue1To30 = arSummary?.buckets.days_1_30 ?? arTotals?.buckets.days_1_30 ?? 0;
  const arOver90 = arSummary?.buckets.over_90 ?? arTotals?.buckets.over_90 ?? 0;

  const apTotalOutstanding = apSummary?.total_outstanding ?? apTotals?.remaining ?? 0;
  const apCurrent = apSummary?.total_current ?? apTotals?.buckets.current ?? 0;
  const apOverdue1To30 = apSummary?.buckets.days_1_30 ?? apTotals?.buckets.days_1_30 ?? 0;
  const apOverdue61To90 = apSummary?.buckets.days_61_90 ?? apTotals?.buckets.days_61_90 ?? 0;

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
                <div className="text-2xl font-bold">{formatCurrency(arCurrent)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("summary.overdue1_30")}</CardTitle>
                <AlertOctagon className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(arOverdue1To30)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("summary.overdue90Plus")}</CardTitle>
                <TrendingDown className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{formatCurrency(arOver90)}</div>
              </CardContent>
            </Card>
          </div>

          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("fields.customer")}</TableHead>
                  <TableHead>{t("fields.code")}</TableHead>
                  <TableHead>{t("fields.invoiceNumber")}</TableHead>
                  <TableHead>{t("fields.dueDate")}</TableHead>
                  <TableHead className="text-right">{t("fields.remaining")}</TableHead>
                  <TableHead className="text-right">{t("fields.current")}</TableHead>
                  <TableHead className="text-right">{t("fields.days1To30")}</TableHead>
                  <TableHead className="text-right">{t("fields.days31To60")}</TableHead>
                  <TableHead className="text-right">{t("fields.days61To90")}</TableHead>
                  <TableHead className="text-right text-destructive font-semibold">{t("fields.over90")}</TableHead>
                  <TableHead className="text-center">{t("summary.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {arQuery.isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={11}>
                        <Skeleton className="h-10 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : arPagedRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      {tCommon("noData")}
                    </TableCell>
                  </TableRow>
                ) : (
                  arPagedRows.map((row) => {
                    const isOverdue = row.days_past_due > 0;
                    return (
                      <TableRow key={row.invoice_id}>
                        <TableCell className="font-medium">{row.customer_name ?? "-"}</TableCell>
                        <TableCell className="font-medium">{row.code}</TableCell>
                        <TableCell>{row.invoice_number ?? "-"}</TableCell>
                        <TableCell>
                          <span className={cn(isOverdue && "text-destructive font-medium")}>
                            {formatDate(row.due_date) || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(row.remaining_amount ?? 0)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatCurrency(row.buckets?.current ?? 0)}</TableCell>
                        <TableCell className="text-right text-warning/80 font-medium">{formatCurrency(row.buckets?.days_1_30 ?? 0)}</TableCell>
                        <TableCell className="text-right text-warning/90 font-medium">{formatCurrency(row.buckets?.days_31_60 ?? 0)}</TableCell>
                        <TableCell className="text-right text-destructive font-medium">{formatCurrency(row.buckets?.days_61_90 ?? 0)}</TableCell>
                        <TableCell className="text-right text-destructive font-bold">{formatCurrency(row.buckets?.over_90 ?? 0)}</TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="icon" asChild title={t("summary.viewDetails")}>
                            <Link href={resolveARHref(row)}>
                              <FileText className="w-4 h-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

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
                <div className="text-2xl font-bold">{formatCurrency(apCurrent)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("summary.overdue1_30")}</CardTitle>
                <AlertOctagon className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(apOverdue1To30)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("summary.overdue61_90")}</CardTitle>
                <TrendingDown className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{formatCurrency(apOverdue61To90)}</div>
              </CardContent>
            </Card>
          </div>

          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("fields.supplier")}</TableHead>
                  <TableHead>{t("fields.source")}</TableHead>
                  <TableHead>{t("fields.code")}</TableHead>
                  <TableHead>{t("fields.invoiceNumber")}</TableHead>
                  <TableHead>{t("fields.dueDate")}</TableHead>
                  <TableHead className="text-right">{t("fields.remaining")}</TableHead>
                  <TableHead className="text-right">{t("fields.current")}</TableHead>
                  <TableHead className="text-right">{t("fields.days1To30")}</TableHead>
                  <TableHead className="text-right">{t("fields.days31To60")}</TableHead>
                  <TableHead className="text-right">{t("fields.days61To90")}</TableHead>
                  <TableHead className="text-right text-destructive font-semibold">{t("fields.over90")}</TableHead>
                  <TableHead className="text-center">{t("summary.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apQuery.isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={12}>
                        <Skeleton className="h-10 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : apPagedRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                      {tCommon("noData")}
                    </TableCell>
                  </TableRow>
                ) : (
                  apPagedRows.map((row) => {
                    const isOverdue = row.days_past_due > 0;
                    return (
                      <TableRow key={row.invoice_id}>
                        <TableCell className="font-medium">{row.supplier_name || "-"}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Building2 className="h-3.5 w-3.5" />
                            {normalizeSourceLabel(row.source_type)}
                          </span>
                        </TableCell>
                        <TableCell>{row.code}</TableCell>
                        <TableCell>{row.invoice_number || "-"}</TableCell>
                        <TableCell>
                          <span className={cn(isOverdue && "text-destructive font-medium")}>
                            {formatDate(row.due_date) || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(row.remaining_amount ?? 0)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatCurrency(row.buckets?.current ?? 0)}</TableCell>
                        <TableCell className="text-right text-warning/80 font-medium">{formatCurrency(row.buckets?.days_1_30 ?? 0)}</TableCell>
                        <TableCell className="text-right text-warning/90 font-medium">{formatCurrency(row.buckets?.days_31_60 ?? 0)}</TableCell>
                        <TableCell className="text-right text-destructive font-medium">{formatCurrency(row.buckets?.days_61_90 ?? 0)}</TableCell>
                        <TableCell className="text-right text-destructive font-bold">{formatCurrency(row.buckets?.over_90 ?? 0)}</TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="icon" asChild title={t("summary.viewDetails")}>
                            <Link href={resolveAPHref(row)}>
                              <FileText className="w-4 h-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

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
