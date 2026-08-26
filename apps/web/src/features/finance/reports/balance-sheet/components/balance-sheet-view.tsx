"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Download,
  Filter,
  Info,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FINANCE_PERMISSIONS } from "@/features/finance/permissions";
import { useUserPermission } from "@/hooks/use-user-permission";
import { useExportProgress } from "@/lib/use-export-progress";
import { formatCurrency } from "@/lib/utils";

import { useBalanceSheet } from "../hooks/use-balance-sheet";
import type { ReportRow } from "../types";

function toApiDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function BalanceSheetView() {
  const t = useTranslations("financeReports");
  const tCommon = useTranslations("common");
  const canExport = useUserPermission(FINANCE_PERMISSIONS.REPORT.BALANCE_SHEET_EXPORT);

  const now = useMemo(() => new Date(), []);
  const [pickerRange, setPickerRange] = useState<DateRange | undefined>({
    from: new Date(now.getFullYear(), 0, 1),
    to: now,
  });
  const [companyID, setCompanyID] = useState<string>("");
  const [fiscalYearID, setFiscalYearID] = useState<string>("");

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    assets: true,
    liabilities: true,
    equity: true,
  });

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const dateRange = useMemo(
    () => ({
      start_date: pickerRange?.from ? toApiDate(pickerRange.from) : toApiDate(new Date(now.getFullYear(), 0, 1)),
      end_date: pickerRange?.to ? toApiDate(pickerRange.to) : toApiDate(now),
      company_id: companyID.trim() || undefined,
      fiscal_year_id: fiscalYearID.trim() || undefined,
    }),
    [pickerRange, now, companyID, fiscalYearID],
  );

  const { data, isLoading, isError, refetch } = useBalanceSheet(dateRange);
  const report = data?.data;
  const exportProgress = useExportProgress();

  const handleExport = async () => {
    try {
      await exportProgress.runWithProgress({
        endpoint: "/finance/reports/export/balance-sheet",
        params: dateRange,
      });
    } catch {
      toast.error(tCommon("exportFailed"));
    }
  };

  const assetTotal = report?.asset_total ?? 0;
  const liabilityTotal = report?.liability_total ?? 0;
  const equityTotal = report?.equity_total ?? 0;
  const liabAndEquityTotal = liabilityTotal + equityTotal;
  const isBalanced = Math.abs(assetTotal - liabAndEquityTotal) < 1;

  return (
    <TooltipProvider>
      <div className="space-y-6 pb-12">
        {/* Top Header Row with Title & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Title & Subtitle */}
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {t("bs_title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("bs_description")}
            </p>
          </div>

          {/* Right Actions: Date Range Picker, Filter Popover, Export */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* Date Range Picker */}
            <DateRangePicker dateRange={pickerRange} onDateChange={setPickerRange} />

            {/* Filter Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="cursor-pointer gap-1.5 text-xs font-semibold h-9">
                  <Filter className="w-3.5 h-3.5" />
                  <span>{t("filters")}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4 space-y-4" align="end">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-1.5 font-semibold text-sm">
                    <SlidersHorizontal className="w-4 h-4 text-primary" />
                    <span>{t("filter_reports")}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">{t("company_id_label")}</label>
                    <Input
                      value={companyID}
                      onChange={(e) => setCompanyID(e.target.value)}
                      placeholder={t("company_id_placeholder")}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">{t("fiscal_year_id_label")}</label>
                    <Input
                      value={fiscalYearID}
                      onChange={(e) => setFiscalYearID(e.target.value)}
                      placeholder={t("fiscal_year_placeholder")}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                {(companyID || fiscalYearID) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCompanyID("");
                      setFiscalYearID("");
                    }}
                    className="w-full text-xs cursor-pointer text-muted-foreground hover:text-foreground"
                  >
                    {t("reset_filter")}
                  </Button>
                )}
              </PopoverContent>
            </Popover>

            {/* Export Button */}
            {canExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={exportProgress.isExporting}
                className="cursor-pointer gap-1.5 text-xs font-semibold h-9"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{exportProgress.label(t("export"))}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Top 4 Summary KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Assets */}
          <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="flex items-start justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                  <span>{t("total_assets")}</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground/70 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>{t("total_assets_desc")}</TooltipContent>
                  </Tooltip>
                </div>
                <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
                  {formatCurrency(assetTotal)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("assets")}
                </div>
              </div>
              <div className="p-3 rounded-full bg-primary/10 text-primary shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Total Liabilities */}
          <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="flex items-start justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                  <span>{t("total_liabilities")}</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground/70 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>{t("total_liabilities_desc")}</TooltipContent>
                  </Tooltip>
                </div>
                <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
                  {formatCurrency(liabilityTotal)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("liabilities")}
                </div>
              </div>
              <div className="p-3 rounded-full bg-destructive/10 text-destructive shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Total Equity */}
          <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="flex items-start justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                  <span>{t("total_equity")}</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground/70 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>{t("total_equity_desc")}</TooltipContent>
                  </Tooltip>
                </div>
                <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
                  {formatCurrency(equityTotal)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("equity")}
                </div>
              </div>
              <div className="p-3 rounded-full bg-purple/10 text-purple shrink-0">
                <Scale className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Total Liabilities & Equity */}
          <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="flex items-start justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                  <span>{t("total_liabilities_equity")}</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground/70 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>Assets = Liabilities + Equity</TooltipContent>
                  </Tooltip>
                </div>
                <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
                  {formatCurrency(liabAndEquityTotal)}
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold">
                  {isBalanced ? (
                    <span className="flex items-center text-success gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {t("bs_balanced_badge")}
                    </span>
                  ) : (
                    <span className="flex items-center text-destructive gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {t("bs_unbalanced_badge")}
                    </span>
                  )}
                </div>
              </div>
              <div className="p-3 rounded-full bg-success/10 text-success shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Loading State */}
        {isLoading && (
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {isError && (
          <Card className="border-destructive/20 bg-destructive/5 text-center">
            <CardContent className="space-y-2 py-6">
              <p className="text-sm text-destructive font-medium">{tCommon("error")}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="cursor-pointer text-xs">
                {t("retry")}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Balance Sheet Table Card */}
        {report && (
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-base font-semibold">{t("bs_title")}</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground/70 cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent>{t("tooltip_balance_sheet_table")}</TooltipContent>
                </Tooltip>
              </div>
              <div>
                {isBalanced ? (
                  <Badge variant="success" className="gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {t("bs_balanced_badge")}
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {t("bs_unbalanced_badge")}
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="w-[140px] text-xs font-semibold text-foreground">
                        {t("account_code")}
                      </TableHead>
                      <TableHead className="min-w-[280px] text-xs font-semibold text-foreground">
                        {t("account_name")}
                      </TableHead>
                      <TableHead className="text-right min-w-[150px] text-xs font-semibold text-foreground">
                        {t("balance")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* SECTION A: ASSETS */}
                    <TableRow
                      className="bg-muted/40 hover:bg-muted/60 cursor-pointer font-bold select-none text-primary"
                      onClick={() => toggleSection("assets")}
                    >
                      <TableCell colSpan={3} className="py-3 text-xs sm:text-sm font-bold text-primary">
                        <div className="flex items-center gap-2">
                          {expandedSections.assets ? (
                            <ChevronDown className="w-4 h-4 text-primary" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-primary" />
                          )}
                          <span>A. {t("assets").toUpperCase()}</span>
                        </div>
                      </TableCell>
                    </TableRow>

                    {expandedSections.assets && (
                      !report.assets || report.assets.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-muted-foreground text-xs italic pl-8 py-2.5">
                            {t("no_transactions")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        report.assets.map((a: ReportRow, idx: number) => (
                          <TableRow key={`${a.code}-${idx}`} className="hover:bg-muted/20">
                            <TableCell className="pl-8 font-mono text-xs text-muted-foreground py-2.5">
                              {a.code}
                            </TableCell>
                            <TableCell className="py-2.5 text-xs sm:text-sm font-medium text-foreground">
                              {a.name}
                            </TableCell>
                            <TableCell className="text-right py-2.5 font-mono text-xs sm:text-sm tabular-nums text-foreground font-medium">
                              {formatCurrency(a.amount ?? 0)}
                            </TableCell>
                          </TableRow>
                        ))
                      )
                    )}

                    {/* Section Total A: Assets */}
                    <TableRow className="border-t font-bold bg-background">
                      <TableCell colSpan={2} className="pl-6 py-3 text-xs sm:text-sm">
                        {t("total_assets")}
                      </TableCell>
                      <TableCell className="text-right py-3 font-mono text-xs sm:text-sm tabular-nums font-bold text-success">
                        {formatCurrency(assetTotal)}
                      </TableCell>
                    </TableRow>

                    {/* SECTION B: LIABILITIES */}
                    <TableRow
                      className="bg-muted/40 hover:bg-muted/60 cursor-pointer font-bold select-none text-primary border-t-2"
                      onClick={() => toggleSection("liabilities")}
                    >
                      <TableCell colSpan={3} className="py-3 text-xs sm:text-sm font-bold text-primary">
                        <div className="flex items-center gap-2">
                          {expandedSections.liabilities ? (
                            <ChevronDown className="w-4 h-4 text-primary" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-primary" />
                          )}
                          <span>B. {t("liabilities").toUpperCase()}</span>
                        </div>
                      </TableCell>
                    </TableRow>

                    {expandedSections.liabilities && (
                      !report.liabilities || report.liabilities.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-muted-foreground text-xs italic pl-8 py-2.5">
                            {t("no_transactions")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        report.liabilities.map((l: ReportRow, idx: number) => (
                          <TableRow key={`${l.code}-${idx}`} className="hover:bg-muted/20">
                            <TableCell className="pl-8 font-mono text-xs text-muted-foreground py-2.5">
                              {l.code}
                            </TableCell>
                            <TableCell className="py-2.5 text-xs sm:text-sm font-medium text-foreground">
                              {l.name}
                            </TableCell>
                            <TableCell className="text-right py-2.5 font-mono text-xs sm:text-sm tabular-nums text-foreground font-medium">
                              {formatCurrency(l.amount ?? 0)}
                            </TableCell>
                          </TableRow>
                        ))
                      )
                    )}

                    {/* Section Total B: Liabilities */}
                    <TableRow className="border-t font-bold bg-background">
                      <TableCell colSpan={2} className="pl-6 py-3 text-xs sm:text-sm">
                        {t("total_liabilities")}
                      </TableCell>
                      <TableCell className="text-right py-3 font-mono text-xs sm:text-sm tabular-nums font-bold text-destructive">
                        {formatCurrency(liabilityTotal)}
                      </TableCell>
                    </TableRow>

                    {/* SECTION C: EQUITY */}
                    <TableRow
                      className="bg-muted/40 hover:bg-muted/60 cursor-pointer font-bold select-none text-primary border-t-2"
                      onClick={() => toggleSection("equity")}
                    >
                      <TableCell colSpan={3} className="py-3 text-xs sm:text-sm font-bold text-primary">
                        <div className="flex items-center gap-2">
                          {expandedSections.equity ? (
                            <ChevronDown className="w-4 h-4 text-primary" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-primary" />
                          )}
                          <span>C. {t("equity").toUpperCase()}</span>
                        </div>
                      </TableCell>
                    </TableRow>

                    {expandedSections.equity && (
                      !report.equities || report.equities.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-muted-foreground text-xs italic pl-8 py-2.5">
                            {t("no_transactions")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        report.equities.map((e: ReportRow, idx: number) => (
                          <TableRow key={`${e.code}-${idx}`} className="hover:bg-muted/20">
                            <TableCell className="pl-8 font-mono text-xs text-muted-foreground py-2.5">
                              {e.code}
                            </TableCell>
                            <TableCell className="py-2.5 text-xs sm:text-sm font-medium text-foreground">
                              {e.name}
                            </TableCell>
                            <TableCell className="text-right py-2.5 font-mono text-xs sm:text-sm tabular-nums text-foreground font-medium">
                              {formatCurrency(e.amount ?? 0)}
                            </TableCell>
                          </TableRow>
                        ))
                      )
                    )}

                    {/* Section Total C: Equity */}
                    <TableRow className="border-t font-bold bg-background">
                      <TableCell colSpan={2} className="pl-6 py-3 text-xs sm:text-sm">
                        {t("total_equity")}
                      </TableCell>
                      <TableCell className="text-right py-3 font-mono text-xs sm:text-sm tabular-nums font-bold text-purple">
                        {formatCurrency(equityTotal)}
                      </TableCell>
                    </TableRow>

                    {/* HIGHLIGHTED SUMMARY ROW: TOTAL LIABILITIES & EQUITY */}
                    <TableRow className="border-t-2 bg-primary/10 font-extrabold">
                      <TableCell colSpan={2} className="py-4 text-xs sm:text-sm font-extrabold text-foreground">
                        {t("total_liabilities_equity")} (B + C)
                      </TableCell>
                      <TableCell className="text-right py-4 font-mono text-xs sm:text-sm tabular-nums font-extrabold text-primary">
                        {formatCurrency(liabAndEquityTotal)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}
