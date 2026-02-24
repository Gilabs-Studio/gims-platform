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

import { useProfitAndLoss } from "../hooks/use-finance-reports";
import { financeReportsService } from "../services/finance-reports-service";
import type { PLReportRow } from "../types";

export function ProfitLossView() {
  const t = useTranslations("financeReports");
  const tCommon = useTranslations("common");

  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);

  const [dateRange, setDateRange] = useState({ start_date: firstDay, end_date: today });

  const { data, isLoading, isError } = useProfitAndLoss(dateRange);
  const report = data?.data;

  const handleExport = async () => {
    try {
      const blob = await financeReportsService.exportProfitAndLoss(dateRange);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `profit_loss_${dateRange.start_date}_${dateRange.end_date}.xlsx`);
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
          <h1 className="text-3xl font-bold tracking-tight">{t("pl_title")}</h1>
          <p className="text-sm text-muted-foreground">{t("pl_description")}</p>
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
          {/* Revenue */}
          <div className="rounded-md border">
            <div className="p-3 bg-muted/50 font-semibold">{t("revenue")}</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("account_code")}</TableHead>
                  <TableHead>{t("account_name")}</TableHead>
                  <TableHead className="text-right">{t("balance")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.revenue?.map((r: PLReportRow, idx: number) => (
                  <TableRow key={`${r.account_code}-${idx}`}>
                    <TableCell className="font-mono text-xs">{r.account_code}</TableCell>
                    <TableCell>{r.account_name}</TableCell>
                    <TableCell className="text-right font-mono">{(r.amount ?? 0).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/30">
                  <TableCell colSpan={2}>{t("total_revenue")}</TableCell>
                  <TableCell className="text-right font-mono">{report.total_revenue?.toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Expenses */}
          <div className="rounded-md border">
            <div className="p-3 bg-muted/50 font-semibold">{t("expenses")}</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("account_code")}</TableHead>
                  <TableHead>{t("account_name")}</TableHead>
                  <TableHead className="text-right">{t("balance")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.expenses?.map((e: PLReportRow, idx: number) => (
                  <TableRow key={`${e.account_code}-${idx}`}>
                    <TableCell className="font-mono text-xs">{e.account_code}</TableCell>
                    <TableCell>{e.account_name}</TableCell>
                    <TableCell className="text-right font-mono">{(e.amount ?? 0).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/30">
                  <TableCell colSpan={2}>{t("total_expenses")}</TableCell>
                  <TableCell className="text-right font-mono">{report.total_expenses?.toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Net Profit/Loss */}
          <div className="rounded-md border p-4 bg-muted/20">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold">{t("net_profit_loss")}</span>
              <span className={`text-lg font-bold font-mono ${(report.net_income ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                {(report.net_income ?? 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
