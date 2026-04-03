"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Building2, CheckCircle2, ChevronDown, ChevronRight, Scale, TrendingUp } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUserPermission } from "@/hooks/use-user-permission";
import { useExportProgress } from "@/lib/use-export-progress";
import { formatCurrency } from "@/lib/utils";

import { useBalanceSheet } from "../balance-sheet/hooks/use-balance-sheet";
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
  const [companyID, setCompanyID] = useState<string>("");
  const [showZeroBalance, setShowZeroBalance] = useState<boolean>(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const dateRange = useMemo(() => ({
    start_date: pickerRange?.from ? toApiDate(pickerRange.from) : toApiDate(new Date(now.getFullYear(), 0, 1)),
    end_date: pickerRange?.to ? toApiDate(pickerRange.to) : toApiDate(now),
    company_id: companyID.trim() || undefined,
    include_zero: showZeroBalance,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [pickerRange, companyID, showZeroBalance]);

  const { data, isLoading, isError } = useBalanceSheet(dateRange);
  const report = data?.data;
  const exportProgress = useExportProgress();

  const toggleExpand = (accountID: string) => {
    setExpanded((prev) => ({ ...prev, [accountID]: !prev[accountID] }));
  };

  const flattenRows = (rows: BSReportRow[], parentVisible = true): Array<{ row: BSReportRow; hasChildren: boolean; visible: boolean }> => {
    const out: Array<{ row: BSReportRow; hasChildren: boolean; visible: boolean }> = [];
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

  const sectionRows = useMemo(() => ({
    assets: flattenRows(report?.assets ?? []),
    liabilities: flattenRows(report?.liabilities ?? []),
    equities: flattenRows(report?.equities ?? []),
  }), [report?.assets, report?.liabilities, report?.equities, expanded]);

  const isBalanced = report?.is_balanced ?? true;
  const imbalanceAmount = report?.imbalance_amount ?? 0;

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

  const openGeneralLedger = (row: BSReportRow) => {
    const accountID = row.account_id;
    if (!accountID) return;
    const params = new URLSearchParams({
      account_id: accountID,
      start_date: dateRange.start_date,
      end_date: dateRange.end_date,
    });
    if (dateRange.company_id) {
      params.set("company_id", dateRange.company_id);
    }
    window.location.href = `/finance/reports/general-ledger?${params.toString()}`;
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
        <Input
          value={companyID}
          onChange={(event) => setCompanyID(event.target.value)}
          placeholder={t("company_id_placeholder")}
          className="w-full sm:w-[280px]"
        />
        <div className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2">
          <Switch
            checked={showZeroBalance}
            onCheckedChange={setShowZeroBalance}
            aria-label="Toggle zero balance accounts"
          />
          <span className="text-sm">{t("show_zero_balance")}</span>
        </div>
        {canExport ? (
          <ExportButton label={exportProgress.label(t("export"))} onClick={handleExport} disabled={exportProgress.isExporting} />
        ) : null}
      </FilterToolbar>

      {report ? (
        <Alert variant={isBalanced ? "default" : "destructive"}>
          {isBalanced ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <AlertTitle>{isBalanced ? t("bs_balanced_title") : t("bs_unbalanced_title")}</AlertTitle>
          <AlertDescription>
            {isBalanced
              ? `${t("bs_balanced_desc")} ${(report.balance_tolerance ?? 0.01).toFixed(2)}.`
                : `${t("bs_unbalanced_desc")} ${formatCurrency(imbalanceAmount)}.`}
          </AlertDescription>
        </Alert>
      ) : null}

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
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("equity_reconciliation")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">{t("base_equity")}</p>
                <p className="font-mono font-semibold tabular-nums">{formatCurrency(report.equity_total ?? 0)}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">{t("retained_earnings")}</p>
                <p className="font-mono font-semibold tabular-nums">{formatCurrency(report.retained_earnings ?? 0)}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">{t("current_year_profit")}</p>
                <p className="font-mono font-semibold tabular-nums">{formatCurrency(report.current_year_profit ?? 0)}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">{t("final_equity")}</p>
                <p className="font-mono font-semibold tabular-nums">{formatCurrency(report.equity_total_final ?? report.equity_total ?? 0)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Assets */}
          <div className="space-y-3">
            <div className="p-3 bg-muted/50 font-semibold rounded-md border">{t("assets")}</div>
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
                  {sectionRows.assets.filter((x) => x.visible).map(({ row, hasChildren }, idx: number) => (
                    <TableRow key={`${row.code}-${idx}`}>
                      <TableCell>
                        {hasChildren ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 cursor-pointer"
                            onClick={() => row.account_id && toggleExpand(row.account_id)}
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
                    <TableCell colSpan={4}>{t("total_assets")}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatCurrency(report.asset_total ?? 0)}</TableCell>
                    <TableCell />
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
                    <TableHead className="w-[54px]">{t("tree")}</TableHead>
                    <TableHead>{t("account_code")}</TableHead>
                    <TableHead>{t("account_name")}</TableHead>
                    <TableHead className="text-right">{t("balance")}</TableHead>
                    <TableHead className="text-right">{t("subtotal")}</TableHead>
                    <TableHead className="text-right w-[180px]">{t("action")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sectionRows.liabilities.filter((x) => x.visible).map(({ row, hasChildren }, idx: number) => (
                    <TableRow key={`${row.code}-${idx}`}>
                      <TableCell>
                        {hasChildren ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 cursor-pointer"
                            onClick={() => row.account_id && toggleExpand(row.account_id)}
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
                    <TableCell colSpan={4}>{t("total_liabilities")}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatCurrency(report.liability_total ?? 0)}</TableCell>
                    <TableCell />
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
                    <TableHead className="w-[54px]">{t("tree")}</TableHead>
                    <TableHead>{t("account_code")}</TableHead>
                    <TableHead>{t("account_name")}</TableHead>
                    <TableHead className="text-right">{t("balance")}</TableHead>
                    <TableHead className="text-right">{t("subtotal")}</TableHead>
                    <TableHead className="text-right w-[180px]">{t("action")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sectionRows.equities.filter((x) => x.visible).map(({ row, hasChildren }, idx: number) => (
                    <TableRow key={`${row.code}-${idx}`}>
                      <TableCell>
                        {hasChildren ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 cursor-pointer"
                            onClick={() => row.account_id && toggleExpand(row.account_id)}
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
                    <TableCell colSpan={4}>{t("total_equity")}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatCurrency(report.equity_total_final ?? report.equity_total ?? 0)}</TableCell>
                    <TableCell />
                  </TableRow>
                  <TableRow className="font-semibold bg-muted/20">
                    <TableCell colSpan={4}>{t("retained_earnings")}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatCurrency(report.retained_earnings ?? 0)}</TableCell>
                    <TableCell />
                  </TableRow>
                  <TableRow className="font-semibold bg-muted/20">
                    <TableCell colSpan={4}>{t("current_year_profit")}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatCurrency(report.current_year_profit ?? 0)}</TableCell>
                    <TableCell />
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

