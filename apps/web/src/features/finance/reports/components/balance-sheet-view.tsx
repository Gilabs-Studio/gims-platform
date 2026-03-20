"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Building2, Scale, TrendingUp } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUserPermission } from "@/hooks/use-user-permission";
import { formatCurrency } from "@/lib/utils";

import { useBalanceSheet } from "../balance-sheet/hooks/use-balance-sheet";
import { balanceSheetService } from "../balance-sheet/services/balance-sheet-service";
import type { ReportRow as BSReportRow } from "../balance-sheet/types";
import { ExportButton } from "@/features/finance/journals/components/export-button";
import { FilterToolbar } from "@/features/finance/journals/components/filter-toolbar";

function toApiDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function BalanceSheetView() {
  const t = useTranslations("financeReports");
  const tCommon = useTranslations("common");
  const canExport = useUserPermission("balance_sheet_report.export");

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
      const blob = await balanceSheetService.exportBalanceSheet(dateRange);
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
    { label: t("total_assets"), value: formatCurrency(report?.asset_total ?? 0), Icon: TrendingUp, desc: "Kekayaan dan harta perusahaan" },
    { label: t("total_liabilities"), value: formatCurrency(report?.liability_total ?? 0), Icon: Building2, desc: "Kewajiban tagihan dan hutang" },
    { label: t("total_equity"), value: formatCurrency(report?.equity_total ?? 0), Icon: Scale, desc: "Modal pemilik / Laba ditahan" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("bs_title")}</h1>
          <p className="text-muted-foreground">{t("bs_description")}</p>
        </div>
      </div>

      <FilterToolbar>
        <DateRangePicker dateRange={pickerRange} onDateChange={setPickerRange} />
        {canExport ? (
          <ExportButton label={t("export")} onClick={handleExport} />
        ) : null}
      </FilterToolbar>

      {/* Summary metrics */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        {metrics.map(({ label, value, Icon, desc }, i) => (
          <Card key={label} className="flex flex-col justify-between shadow-sm p-5 space-y-4 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full text-primary">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold tracking-tight">{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{desc}</p>
              </div>
            </div>
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
          <div className="space-y-3">
            <div className="p-3 bg-muted/50 font-semibold rounded-md border">{t("assets")}</div>
            <div className="rounded-md border bg-card">
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
          </div>

          {/* Liabilities */}
          <div className="space-y-3">
            <div className="p-3 bg-muted/50 font-semibold rounded-md border">{t("liabilities")}</div>
            <div className="rounded-md border bg-card">
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
          </div>

          {/* Equity */}
          <div className="space-y-3">
            <div className="p-3 bg-muted/50 font-semibold rounded-md border">{t("equity")}</div>
            <div className="rounded-md border bg-card">
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
        </div>
      )}
    </div>
  );
}

