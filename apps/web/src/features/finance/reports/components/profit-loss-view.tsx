"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronRight, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUserPermission } from "@/hooks/use-user-permission";
import { formatCurrency } from "@/lib/utils";

import { useProfitAndLoss } from "../profit-loss/hooks/use-profit-loss";
import { profitLossService } from "../profit-loss/services/profit-loss-service";
import type { ReportRow as PLReportRow } from "../profit-loss/types";
import { ExportButton } from "@/features/finance/journals/components/export-button";
import { FilterToolbar } from "@/features/finance/journals/components/filter-toolbar";

function toApiDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function ProfitLossView() {
  const t = useTranslations("financeReports");
  const tCommon = useTranslations("common");
  const canExport = useUserPermission("profit_loss_report.export");

  const now = new Date();
  const [pickerRange, setPickerRange] = useState<DateRange | undefined>({
    from: new Date(now.getFullYear(), 0, 1),
    to: now,
  });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const dateRange = useMemo(
    () => ({
      start_date: pickerRange?.from ? toApiDate(pickerRange.from) : toApiDate(new Date(now.getFullYear(), 0, 1)),
      end_date: pickerRange?.to ? toApiDate(pickerRange.to) : toApiDate(now),
    }),
    [pickerRange, now]
  );

  const { data, isLoading, isError } = useProfitAndLoss(dateRange);
  const report = data?.data;

  const toggleExpand = (accountID?: string) => {
    if (!accountID) {
      return;
    }
    setExpanded((previous) => ({
      ...previous,
      [accountID]: !(previous[accountID] ?? true),
    }));
  };

  const openGeneralLedger = (row: PLReportRow) => {
    const accountID = row.account_id;
    if (!accountID) return;
    const params = new URLSearchParams({
      account_id: accountID,
      start_date: dateRange.start_date,
      end_date: dateRange.end_date,
    });
    window.location.href = `/finance/reports/general-ledger?${params.toString()}`;
  };

  const flattenRows = (rows: PLReportRow[], parentVisible = true): Array<{ row: PLReportRow; hasChildren: boolean; visible: boolean }> => {
    const out: Array<{ row: PLReportRow; hasChildren: boolean; visible: boolean }> = [];
    for (const row of rows) {
      const children = row.children ?? [];
      const hasChildren = children.length > 0;
      const rowVisible = parentVisible;
      out.push({ row, hasChildren, visible: rowVisible });
      const isOpen = row.account_id ? expanded[row.account_id] ?? true : true;
      const childVisible = rowVisible && (!hasChildren || isOpen);
      out.push(...flattenRows(children, childVisible));
    }
    return out;
  };

  const revenueRows = useMemo(() => flattenRows(report?.revenues ?? []), [report?.revenues, expanded]);
  const cogsRows = useMemo(() => flattenRows(report?.cogs ?? []), [report?.cogs, expanded]);
  const expenseRows = useMemo(() => flattenRows(report?.expenses ?? []), [report?.expenses, expanded]);

  const netProfit = report?.net_profit ?? 0;

  const prevNetProfit = report?.previous_period?.net_profit;
  const netProfitDelta = prevNetProfit !== undefined ? netProfit - prevNetProfit : undefined;
  const netProfitDeltaPct = prevNetProfit !== undefined && prevNetProfit !== 0 ? (netProfitDelta! / Math.abs(prevNetProfit)) * 100 : undefined;

  const handleExport = async () => {
    try {
      const blob = await profitLossService.exportProfitAndLoss(dateRange);
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

  const metrics = [
    { label: t("total_revenue"), value: formatCurrency(report?.revenue_total ?? 0), Icon: TrendingUp, desc: "Pendapatan kotor usaha", valueClass: "" },
    { label: t("total_expenses"), value: formatCurrency(report?.expense_total ?? 0), Icon: TrendingDown, desc: "Total beban dan pengeluaran", valueClass: "" },
    {
      label: t("net_profit_loss"),
      value: formatCurrency(netProfit),
      Icon: Wallet,
      desc: "Keuntungan bersih atau kerugian",
      valueClass: netProfit >= 0 ? "text-success" : "text-destructive",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("pl_title")}</h1>
          <p className="text-muted-foreground">{t("pl_description")}</p>
        </div>
      </div>

      <FilterToolbar>
        <DateRangePicker dateRange={pickerRange} onDateChange={setPickerRange} />
        {canExport ? <ExportButton label={t("export")} onClick={handleExport} /> : null}
      </FilterToolbar>

      {/* Summary metrics */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        {metrics.map(({ label, value, Icon, desc, valueClass }, i) => (
          <Card key={label} className="flex flex-col justify-between shadow-sm p-5 space-y-4 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full text-primary">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <p className={`text-2xl font-bold tracking-tight ${valueClass ?? ""}`}>{value}</p>
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
          {/* Revenue */}
          <div className="space-y-3">
            <div className="p-3 bg-muted/50 font-semibold rounded-md border">{t("revenue")}</div>
            <div className="rounded-md border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[54px]">{t("tree")}</TableHead>
                    <TableHead>{t("account_code")}</TableHead>
                    <TableHead>{t("account_name")}</TableHead>
                    <TableHead className="text-right">{t("balance")}</TableHead>
                    <TableHead className="text-right">{t("subtotal")}</TableHead>
                    <TableHead className="text-right w-[180px]">{t("action")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenueRows.filter((x) => x.visible).map(({ row, hasChildren }, idx: number) => (
                    <TableRow key={`${row.code}-${idx}`}>
                      <TableCell>
                        {hasChildren ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 cursor-pointer"
                            onClick={() => toggleExpand(row.account_id)}
                          >
                            {row.account_id && (expanded[row.account_id] ?? true) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        ) : null}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{row.code}</TableCell>
                      <TableCell>
                        <span style={{ paddingLeft: `${(row.level ?? 0) * 12}px` }}>{row.name}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{formatCurrency(row.amount ?? 0)}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{formatCurrency(row.subtotal_amount ?? row.amount ?? 0)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="cursor-pointer"
                          onClick={() => openGeneralLedger(row)}
                          disabled={!row.account_id}
                        >
                          {t("open_gl")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted/30">
                    <TableCell colSpan={4}>{t("total_revenue")}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatCurrency(report.revenue_total ?? 0)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          {/* COGS */}
          <div className="space-y-3">
            <div className="p-3 bg-muted/50 font-semibold rounded-md border">{t("cogs")}</div>
            <div className="rounded-md border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[54px]">{t("tree")}</TableHead>
                    <TableHead>{t("account_code")}</TableHead>
                    <TableHead>{t("account_name")}</TableHead>
                    <TableHead className="text-right">{t("balance")}</TableHead>
                    <TableHead className="text-right">{t("subtotal")}</TableHead>
                    <TableHead className="text-right w-[180px]">{t("action")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cogsRows.filter((x) => x.visible).map(({ row, hasChildren }, idx: number) => (
                    <TableRow key={`${row.code}-${idx}`}>
                      <TableCell>
                        {hasChildren ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 cursor-pointer"
                            onClick={() => toggleExpand(row.account_id)}
                          >
                            {row.account_id && (expanded[row.account_id] ?? true) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        ) : null}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{row.code}</TableCell>
                      <TableCell>
                        <span style={{ paddingLeft: `${(row.level ?? 0) * 12}px` }}>{row.name}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{formatCurrency(row.amount ?? 0)}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{formatCurrency(row.subtotal_amount ?? row.amount ?? 0)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="cursor-pointer"
                          onClick={() => openGeneralLedger(row)}
                          disabled={!row.account_id}
                        >
                          {t("open_gl")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted/30">
                    <TableCell colSpan={4}>{t("total_cogs")}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatCurrency(report.cogs_total ?? 0)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Expenses */}
          <div className="space-y-3">
            <div className="p-3 bg-muted/50 font-semibold rounded-md border">{t("expenses")}</div>
            <div className="rounded-md border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[54px]">{t("tree")}</TableHead>
                    <TableHead>{t("account_code")}</TableHead>
                    <TableHead>{t("account_name")}</TableHead>
                    <TableHead className="text-right">{t("balance")}</TableHead>
                    <TableHead className="text-right">{t("subtotal")}</TableHead>
                    <TableHead className="text-right w-[180px]">{t("action")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenseRows.filter((x) => x.visible).map(({ row, hasChildren }, idx: number) => (
                    <TableRow key={`${row.code}-${idx}`}>
                      <TableCell>
                        {hasChildren ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 cursor-pointer"
                            onClick={() => toggleExpand(row.account_id)}
                          >
                            {row.account_id && (expanded[row.account_id] ?? true) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        ) : null}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{row.code}</TableCell>
                      <TableCell>
                        <span style={{ paddingLeft: `${(row.level ?? 0) * 12}px` }}>{row.name}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{formatCurrency(row.amount ?? 0)}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{formatCurrency(row.subtotal_amount ?? row.amount ?? 0)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="cursor-pointer"
                          onClick={() => openGeneralLedger(row)}
                          disabled={!row.account_id}
                        >
                          {t("open_gl")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted/30">
                    <TableCell colSpan={4}>{t("total_expenses")}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatCurrency(report.expense_total ?? 0)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Retained Earnings / Ratios */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("retained_earnings")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">{t("retained_earnings")}</p>
                <p className="font-mono font-semibold tabular-nums">{formatCurrency(report.retained_earnings ?? 0)}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">{t("gross_margin")}</p>
                <p className="font-mono font-semibold tabular-nums">{(report.gross_margin ?? 0).toFixed(2)}%</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">{t("net_margin")}</p>
                <p className="font-mono font-semibold tabular-nums">{(report.net_margin ?? 0).toFixed(2)}%</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">{t("expense_ratio")}</p>
                <p className="font-mono font-semibold tabular-nums">{(report.expense_ratio ?? 0).toFixed(2)}%</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

