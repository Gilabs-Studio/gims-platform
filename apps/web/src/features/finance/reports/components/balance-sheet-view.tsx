"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { useBalanceSheet } from "../hooks/use-finance-reports";
import { financeReportsService } from "../services/finance-reports-service";
import type { BSReportRow } from "../types";

export function BalanceSheetView() {
  const t = useTranslations("financeReports");
  const tCommon = useTranslations("common");

  const now = new Date();
  const firstDayOfYear = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);

  const [dateRange, setDateRange] = useState({ start_date: firstDayOfYear, end_date: today });

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("bs_title")}</h1>
          <p className="text-sm text-muted-foreground">{t("bs_description")}</p>
        </div>
        <Button onClick={handleExport} variant="outline" className="cursor-pointer">
          <Download className="h-4 w-4 mr-2" />
          {t("export")}
        </Button>
      </div>

      <div className="flex gap-4 items-end">
        <div className="space-y-2">
          <Label>{t("start_date")}</Label>
          <Input
            type="date"
            value={dateRange.start_date}
            onChange={(e) => setDateRange((p) => ({ ...p, start_date: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("end_date")}</Label>
          <Input
            type="date"
            value={dateRange.end_date}
            onChange={(e) => setDateRange((p) => ({ ...p, end_date: e.target.value }))}
          />
        </div>
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
                    <TableCell className="text-right font-mono">{(a.amount ?? 0).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/30">
                  <TableCell colSpan={2}>{t("total_assets")}</TableCell>
                  <TableCell className="text-right font-mono">{report.asset_total?.toLocaleString()}</TableCell>
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
                    <TableCell className="text-right font-mono">{(l.amount ?? 0).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/30">
                  <TableCell colSpan={2}>{t("total_liabilities")}</TableCell>
                  <TableCell className="text-right font-mono">{report.liability_total?.toLocaleString()}</TableCell>
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
                    <TableCell className="text-right font-mono">{(e.amount ?? 0).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/30">
                  <TableCell colSpan={2}>{t("total_equity")}</TableCell>
                  <TableCell className="text-right font-mono">{report.equity_total?.toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
