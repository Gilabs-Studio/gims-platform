"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { FileDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGeneralLedger } from "../hooks/use-finance-reports";
import { financeReportsService } from "../services/finance-reports-service";
import { toast } from "sonner";
import type { GLReportRow, GLTransactionRow } from "../types";

export function GeneralLedgerView() {
  const t = useTranslations("financeReports");
  const tCommon = useTranslations("common");

  const [dateRange, setDateRange] = useState({
    start_date: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10),
    end_date: new Date().toISOString().slice(0, 10),
  });

  const { data, isLoading, isError } = useGeneralLedger(dateRange);
  const accounts = useMemo(() => data?.data?.accounts ?? [], [data?.data?.accounts]);

  const handleExport = async () => {
    try {
      const blob = await financeReportsService.exportGeneralLedger(dateRange);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `General_Ledger_${dateRange.start_date}_to_${dateRange.end_date}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      toast.error(tCommon("exportFailed"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("gl_title")}</h1>
          <p className="text-sm text-muted-foreground">{t("gl_description")}</p>
        </div>

        <Button onClick={handleExport} className="cursor-pointer" variant="outline">
          <FileDown className="h-4 w-4 mr-2" />
          {t("export")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t("filters")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="space-y-2">
            <label className="text-xs font-medium">{t("start_date")}</label>
            <Input
              type="date"
              value={dateRange.start_date}
              onChange={(e) => setDateRange(prev => ({ ...prev, start_date: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium">{t("end_date")}</label>
            <Input
              type="date"
              value={dateRange.end_date}
              onChange={(e) => setDateRange(prev => ({ ...prev, end_date: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      ) : isError ? (
        <div className="text-center py-8 text-destructive">{tCommon("error")}</div>
      ) : (
        <div className="space-y-8">
          {accounts.map((account: GLReportRow, idx: number) => (
            <Card key={`${account.account_id}-${idx}`}>
              <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">
                    {account.account_code} - {account.account_name}
                  </CardTitle>
                  <div className="text-sm space-x-4">
                    <span>
                      {t("beginning")}: <span className="font-mono">{(account.beginning_balance ?? 0).toLocaleString()}</span>
                    </span>
                    <span>
                      {t("ending")}: <span className="font-mono font-bold">{(account.ending_balance ?? 0).toLocaleString()}</span>
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">{t("date")}</TableHead>
                      <TableHead className="w-[150px]">{t("reference")}</TableHead>
                      <TableHead>{t("description")}</TableHead>
                      <TableHead className="text-right w-[150px]">{t("debit")}</TableHead>
                      <TableHead className="text-right w-[150px]">{t("credit")}</TableHead>
                      <TableHead className="text-right w-[150px]">{t("balance")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {account.transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4 text-muted-foreground italic">
                          {t("no_transactions")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      account.transactions.map((tr: GLTransactionRow, idx: number) => (
                        <TableRow key={`${tr.reference_no}-${idx}`}>
                          <TableCell className="text-xs">{new Date(tr.date).toLocaleDateString()}</TableCell>
                          <TableCell className="text-xs font-mono">{tr.reference_no}</TableCell>
                          <TableCell className="text-sm">{tr.description}</TableCell>
                          <TableCell className="text-right font-mono">{tr.debit > 0 ? tr.debit.toLocaleString() : "-"}</TableCell>
                          <TableCell className="text-right font-mono">{tr.credit > 0 ? tr.credit.toLocaleString() : "-"}</TableCell>
                          <TableCell className="text-right font-mono font-medium">{(tr.balance ?? 0).toLocaleString()}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
