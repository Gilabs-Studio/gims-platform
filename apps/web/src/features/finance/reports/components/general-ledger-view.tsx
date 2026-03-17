"use client";

import { Fragment, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { BarChart3, Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { useUserPermission } from "@/hooks/use-user-permission";
import { useGeneralLedger } from "../hooks/use-finance-reports";
import { financeReportsService } from "../services/finance-reports-service";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import type { GLReportRow, GLTransactionRow } from "../types";
import { ExportButton } from "@/features/finance/journals/components/export-button";
import { FilterToolbar } from "@/features/finance/journals/components/filter-toolbar";

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function toApiDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function GeneralLedgerView() {
  const t = useTranslations("financeReports");
  const tCommon = useTranslations("common");
  const canExport = useUserPermission("general_ledger_report.export");

  const now = new Date();
  const [pickerRange, setPickerRange] = useState<DateRange | undefined>({
    from: new Date(now.getFullYear(), 0, 1),
    to: now,
  });

  const dateRange = useMemo(
    () => ({
      start_date: pickerRange?.from ? toApiDate(pickerRange.from) : toApiDate(new Date(now.getFullYear(), 0, 1)),
      end_date: pickerRange?.to ? toApiDate(pickerRange.to) : toApiDate(now),
    }),
    [pickerRange, now],
  );

  const { data, isLoading, isError } = useGeneralLedger(dateRange);
  const accounts = useMemo(() => data?.data?.accounts ?? [], [data?.data?.accounts]);

  const summary = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;

    for (const account of accounts) {
      for (const tr of account.transactions) {
        totalDebit += tr.debit ?? 0;
        totalCredit += tr.credit ?? 0;
      }
    }

    return { totalDebit, totalCredit, netBalance: totalDebit - totalCredit };
  }, [accounts]);

  const handleExport = async () => {
    try {
      const blob = await financeReportsService.exportGeneralLedger(dateRange);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `General_Ledger_${dateRange.start_date}_to_${dateRange.end_date}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error(tCommon("exportFailed"));
    }
  };

  const metrics = [
    { label: t("total_debit"), value: formatCurrency(summary.totalDebit), Icon: TrendingUp },
    { label: t("total_credit"), value: formatCurrency(summary.totalCredit), Icon: TrendingDown },
    {
      label: t("net_balance"),
      value: formatCurrency(summary.netBalance),
      Icon: Minus,
      valueClass: summary.netBalance >= 0 ? "text-success" : "text-destructive",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("gl_title")}</h1>
          <p className="text-muted-foreground">{t("gl_description")}</p>
        </div>
      </div>

      <FilterToolbar>
        <DateRangePicker dateRange={pickerRange} onDateChange={setPickerRange} />
        {canExport ? <ExportButton label={t("export")} onClick={handleExport} /> : null}
      </FilterToolbar>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-80 w-full" />
        </div>
      ) : isError ? (
        <div className="text-center py-8 text-destructive">{tCommon("error")}</div>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            {metrics.map(({ label, value, Icon, valueClass }) => (
              <Card key={label}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{label}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-medium font-mono tabular-nums ${valueClass ?? ""}`}>{value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {accounts.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">{t("no_data")}</p>
            </div>
          ) : (
            <div className="rounded-md border bg-card">
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
                  {accounts.map((account: GLReportRow, idx: number) => (
                    <Fragment key={`account-${account.account_id}-${idx}`}>
                      <TableRow className="bg-muted/50 hover:bg-muted/60 border-t">
                        <TableCell colSpan={3} className="py-2">
                          <span className="font-mono font-semibold text-primary text-xs">{account.account_code}</span>
                          <span className="mx-2 text-muted-foreground">-</span>
                          <span className="font-semibold text-sm">{account.account_name}</span>
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground py-2" colSpan={2}>
                          {t("beginning")}: <span className="font-mono font-medium text-foreground">{formatCurrency(account.beginning_balance ?? 0)}</span>
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground py-2">
                          {t("ending")}: <span className="font-mono font-bold text-foreground">{formatCurrency(account.ending_balance ?? 0)}</span>
                        </TableCell>
                      </TableRow>

                      {account.transactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-3 text-muted-foreground italic text-xs">
                            {t("no_transactions")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        account.transactions.map((tr: GLTransactionRow, tIdx: number) => (
                          <TableRow key={`${tr.reference_no}-${tIdx}`}>
                            <TableCell className="text-xs">{formatDate(tr.date)}</TableCell>
                            <TableCell className="text-xs font-mono">{tr.reference_no}</TableCell>
                            <TableCell className="text-sm">{tr.description}</TableCell>
                            <TableCell className="text-right font-mono tabular-nums text-xs">
                              {(tr.debit ?? 0) > 0 ? formatCurrency(tr.debit) : <span className="text-muted-foreground">-</span>}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums text-xs">
                              {(tr.credit ?? 0) > 0 ? formatCurrency(tr.credit) : <span className="text-muted-foreground">-</span>}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums text-xs font-medium">
                              {formatCurrency(tr.balance ?? 0)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
