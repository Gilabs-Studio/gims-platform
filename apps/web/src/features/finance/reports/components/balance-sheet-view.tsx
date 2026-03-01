"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Building2, Download, Scale, TrendingUp } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { formatCurrency } from "@/lib/utils";

import { useBalanceSheet } from "../hooks/use-finance-reports";
import { financeReportsService } from "../services/finance-reports-service";
import type { BSReportRow } from "../types";

function toApiDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function BalanceSheetView() {
  const t = useTranslations("financeReports");
  const tCommon = useTranslations("common");

  const now = new Date();
  const [pickerRange, setPickerRange] = useState<DateRange | undefined>({
    from: new Date(now.getFullYear(), 0, 1),
    to: now,
  });

  const dateRange = useMemo(() => ({
    start_date: pickerRange?.from ? toApiDate(pickerRange.from) : toApiDate(new Date(now.getFullYear(), 0, 1)),
    end_date: pickerRange?.to ? toApiDate(pickerRange.to) : toApiDate(now),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [pickerRange]);

  const { data, isLoading, isError } = useBalanceSheet(dateRange);
  const report = data?.data;

  const handleExport = async () => {
    try {
      const blob = await financeReportsService.exportBalanceSheet(dateRange);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `balance_sheet_${dateRange.start_date}_${dateRange.end_date}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error(tCommon("exportFailed"));
    }
  };

  const metrics = [
    { label: t("total_assets"), value: formatCurrency(report?.asset_total ?? 0), Icon: TrendingUp },
    { label: t("total_liabilities"), value: formatCurrency(report?.liability_total ?? 0), Icon: Building2 },
    { label: t("total_equity"), value: formatCurrency(report?.equity_total ?? 0), Icon: Scale },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("bs_title")}</h1>
          <p className="text-muted-foreground">{t("bs_description")}</p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker dateRange={pickerRange} onDateChange={setPickerRange} />
          <Button onClick={handleExport} variant="outline" size="sm" className="cursor-pointer">
            <Download className="h-4 w-4 mr-2" />
            {t("export")}
          </Button>
        </div>
      </div>

      {/* Summary metrics */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        {metrics.map(({ label, value, Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-medium font-mono tabular-nums">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {isError && <div className="text-center py-8 text-destructive">{tCommon("error")}</div>}

      {report && (
        <div className="space-y-6">
          {/* Assets */}
          <div className="rounded-md border">
            <div className="p-3 bg-muted/50 font-semibold">{t("assets")}</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("account_code")}</TableHead>
                  <TableHead>{t("account_name")}</TableHead>
                  <TableHead className="text-right">{t("balance")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.assets?.map((a: BSReportRow, idx: number) => (
                  <TableRow key={`${a.code}-${idx}`}>
                    <TableCell className="font-mono text-xs">{a.code}</TableCell>
                    <TableCell>{a.name}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatCurrency(a.amount ?? 0)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/30">
                  <TableCell colSpan={2}>{t("total_assets")}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{formatCurrency(report.asset_total ?? 0)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Liabilities */}
          <div className="rounded-md border">
            <div className="p-3 bg-muted/50 font-semibold">{t("liabilities")}</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("account_code")}</TableHead>
                  <TableHead>{t("account_name")}</TableHead>
                  <TableHead className="text-right">{t("balance")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.liabilities?.map((l: BSReportRow, idx: number) => (
                  <TableRow key={`${l.code}-${idx}`}>
                    <TableCell className="font-mono text-xs">{l.code}</TableCell>
                    <TableCell>{l.name}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatCurrency(l.amount ?? 0)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/30">
                  <TableCell colSpan={2}>{t("total_liabilities")}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{formatCurrency(report.liability_total ?? 0)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Equity */}
          <div className="rounded-md border">
            <div className="p-3 bg-muted/50 font-semibold">{t("equity")}</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("account_code")}</TableHead>
                  <TableHead>{t("account_name")}</TableHead>
                  <TableHead className="text-right">{t("balance")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.equities?.map((e: BSReportRow, idx: number) => (
                  <TableRow key={`${e.code}-${idx}`}>
                    <TableCell className="font-mono text-xs">{e.code}</TableCell>
                    <TableCell>{e.name}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatCurrency(e.amount ?? 0)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/30">
                  <TableCell colSpan={2}>{t("total_equity")}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{formatCurrency(report.equity_total ?? 0)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

