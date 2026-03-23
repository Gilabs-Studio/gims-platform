"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarIcon, Search, FileText, Target, ShieldCheck, AlertOctagon, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";

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
import { formatDate, formatCurrency, toLocalDateString, cn } from "@/lib/utils";
import { Link } from "@/i18n/routing";

import { useFinanceAPAging, useFinanceARAging } from "../hooks/use-finance-aging-reports";

export function AgingReportsView() {
  const t = useTranslations("financeAgingReports");
  const tCommon = useTranslations("common");

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
    }),
    [asOfDate, debouncedSearch]
  );

  const arQuery = useFinanceARAging({ ...baseParams, page: arPage, per_page: arPageSize });
  const apQuery = useFinanceAPAging({ ...baseParams, page: apPage, per_page: apPageSize });

  const arRows = arQuery.data?.data?.rows ?? [];
  const apRows = apQuery.data?.data?.rows ?? [];
  const arPagination = arQuery.data?.meta?.pagination;
  const apPagination = apQuery.data?.meta?.pagination;

  // TODO: Hubungkan dengan response BE untuk mendapatkan totals dari summary sebenarnya 
  // const arTotals = arQuery.data?.data?.totals;
  // const apTotals = apQuery.data?.data?.totals;

  // Mocking Totals for UI Showcase (Owner POV)
  const dummyARTotals = {
    total: 1250000000,
    current: 450000000, // Belum jatuh tempo
    overdue: 800000000,
    buckets: {
      days_1_30: 300000000,
      days_31_60: 250000000,
      days_61_90: 150000000,
      over_90: 100000000,
    }
  };

  const dummyAPTotals = {
    total: 850000000,
    current: 550000000,
    overdue: 300000000,
    buckets: {
      days_1_30: 200000000,
      days_31_60: 80000000,
      days_61_90: 20000000,
      over_90: 0,
    }
  };

  const anyError = arQuery.isError || apQuery.isError;

  if (anyError) {
    return <div className="text-center py-8 text-destructive">{tCommon("error")}</div>;
  }

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
              onChange={(e) => {
                setSearch(e.target.value);
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
                  variant={"outline"}
                  className={cn(
                    "w-full sm:w-60 justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? formatDate(date) : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d: Date | undefined) => {
                    if (d) {
                      setDate(d);
                      setArPage(1);
                      setApPage(1);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      <Tabs defaultValue="ar" className="space-y-6">
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
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("summary.totalAR")}</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(dummyARTotals.total)}</div>
                <p className="text-xs text-destructive mt-1 font-medium">{ /* TODO: Mock Data */ }</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("summary.notYetDue")}</CardTitle>
                <ShieldCheck className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(dummyARTotals.current)}</div>
                <p className="text-xs text-muted-foreground mt-1">Aman, arus kas terkendali</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("summary.overdue1_30")}</CardTitle>
                <AlertOctagon className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(dummyARTotals.buckets.days_1_30)}</div>
                <p className="text-xs text-muted-foreground mt-1">Perlu penagihan segera</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("summary.overdue90Plus")}</CardTitle>
                <TrendingDown className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{formatCurrency(dummyARTotals.buckets.over_90)}</div>
                <p className="text-xs text-destructive mt-1">Risiko tinggi / kredit macet</p>
              </CardContent>
            </Card>
          </div>

          {/* AR Table */}
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
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
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={10}>
                        <Skeleton className="h-10 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : arRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      {tCommon("noData")}
                    </TableCell>
                  </TableRow>
                ) : (
                  arRows.map((r) => {
                    const isOverdue = r.days_past_due > 0;
                    return (
                      <TableRow key={r.invoice_id} className="group">
                        <TableCell className="font-medium">{r.code}</TableCell>
                        <TableCell>{r.invoice_number ?? "-"}</TableCell>
                        <TableCell>
                          <span className={cn(isOverdue && "text-destructive font-medium")}>
                            {formatDate(r.due_date) || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(r.remaining_amount ?? 0)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatCurrency(r.buckets?.current ?? 0)}</TableCell>
                        <TableCell className="text-right text-warning/80 font-medium">{formatCurrency(r.buckets?.days_1_30 ?? 0)}</TableCell>
                        <TableCell className="text-right text-warning/90 font-medium">{formatCurrency(r.buckets?.days_31_60 ?? 0)}</TableCell>
                        <TableCell className="text-right text-destructive font-medium">{formatCurrency(r.buckets?.days_61_90 ?? 0)}</TableCell>
                        <TableCell className="text-right text-destructive font-bold">{formatCurrency(r.buckets?.over_90 ?? 0)}</TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="icon" asChild title={t("summary.viewDetails")}>
                            {/* TODO: Add proper permission check and route path (e.g. /sales/invoices/id) */}
                            <Link href={`/sales/invoices/${r.invoice_id}`}>
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
            pageIndex={arPagination?.page ?? arPage}
            pageSize={arPagination?.per_page ?? arPageSize}
            rowCount={arPagination?.total ?? arRows.length}
            onPageChange={setArPage}
            onPageSizeChange={(s) => {
              setArPageSize(s);
              setArPage(1);
            }}
          />
        </TabsContent>

        <TabsContent value="ap" className="space-y-6">
          {/* Summary Cards for AP */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("summary.totalAP")}</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(dummyAPTotals.total)}</div>
                <p className="text-xs text-destructive mt-1 font-medium">{ /* TODO: Mock Data */ }</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("summary.notYetDue")}</CardTitle>
                <ShieldCheck className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(dummyAPTotals.current)}</div>
                <p className="text-xs text-muted-foreground mt-1">Masih aman dibayarkan</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("summary.overdue1_30")}</CardTitle>
                <AlertOctagon className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(dummyAPTotals.buckets.days_1_30)}</div>
                <p className="text-xs text-muted-foreground mt-1">Hutang terlambat dibayar</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("summary.overdue61_90")}</CardTitle>
                <TrendingDown className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{formatCurrency(dummyAPTotals.buckets.days_61_90)}</div>
                <p className="text-xs text-destructive mt-1">Potensi denda pemasok</p>
              </CardContent>
            </Card>
          </div>

          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("fields.supplier")}</TableHead>
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
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={11}>
                        <Skeleton className="h-10 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : apRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      {tCommon("noData")}
                    </TableCell>
                  </TableRow>
                ) : (
                  apRows.map((r) => {
                    const isOverdue = r.days_past_due > 0;
                    return (
                      <TableRow key={r.invoice_id} className="group">
                        <TableCell className="font-medium">{r.supplier_name}</TableCell>
                        <TableCell>{r.code}</TableCell>
                        <TableCell>{r.invoice_number}</TableCell>
                        <TableCell>
                          <span className={cn(isOverdue && "text-destructive font-medium")}>
                            {formatDate(r.due_date) || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(r.remaining_amount ?? 0)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatCurrency(r.buckets?.current ?? 0)}</TableCell>
                        <TableCell className="text-right text-warning/80 font-medium">{formatCurrency(r.buckets?.days_1_30 ?? 0)}</TableCell>
                        <TableCell className="text-right text-warning/90 font-medium">{formatCurrency(r.buckets?.days_31_60 ?? 0)}</TableCell>
                        <TableCell className="text-right text-destructive font-medium">{formatCurrency(r.buckets?.days_61_90 ?? 0)}</TableCell>
                        <TableCell className="text-right text-destructive font-bold">{formatCurrency(r.buckets?.over_90 ?? 0)}</TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="icon" asChild title={t("summary.viewDetails")}>
                            {/* TODO: Add proper permission check and route path (e.g. /purchase/invoices/id) */}
                            <Link href={`/purchase/invoices/${r.invoice_id}`}>
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
            pageIndex={apPagination?.page ?? apPage}
            pageSize={apPagination?.per_page ?? apPageSize}
            rowCount={apPagination?.total ?? apRows.length}
            onPageChange={setApPage}
            onPageSizeChange={(s) => {
              setApPageSize(s);
              setApPage(1);
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
