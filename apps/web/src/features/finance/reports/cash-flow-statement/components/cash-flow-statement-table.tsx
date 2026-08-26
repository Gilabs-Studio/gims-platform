"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronRight, Info, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { formatCurrency } from "@/lib/utils";
import { useCashFlowStatementTable } from "../hooks/use-cash-flow-statement";
import type { CashFlowQueryParams } from "../services/cash-flow-statement-service";
import type { MultiPeriodRow, MultiPeriodSection } from "../types";

interface CashFlowStatementTableProps {
  params: CashFlowQueryParams;
}

function formatAccountingCurrency(val: number): string {
  if (val === 0) return "Rp 0";
  if (val < 0) {
    return `(${formatCurrency(Math.abs(val))})`;
  }
  return formatCurrency(val);
}

export function CashFlowStatementTable({ params }: CashFlowStatementTableProps) {
  const t = useTranslations("financeReports");
  const { data, isLoading, isError, refetch } = useCashFlowStatementTable(params);
  const tableData = data?.data;

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    operating: true,
    investing: true,
    financing: true,
  });

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (isError || !tableData) {
    return (
      <Card className="border-destructive/20 bg-destructive/5 text-center">
        <CardContent className="space-y-2 py-6">
          <p className="text-sm text-destructive font-medium">{t("statement_table_error")}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="cursor-pointer text-xs">
            {t("retry")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const periods = tableData.periods || [];

  const renderSection = (
    sectionKey: string,
    section: MultiPeriodSection,
    netLabel: string,
  ) => {
    const isExpanded = expandedSections[sectionKey] ?? true;

    return (
      <>
        {/* Section Header Row */}
        <TableRow
          className="bg-muted/40 hover:bg-muted/60 cursor-pointer font-bold select-none text-primary"
          onClick={() => toggleSection(sectionKey)}
        >
          <TableCell colSpan={periods.length + 1} className="py-3">
            <div className="flex items-center gap-2">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-primary" />
              ) : (
                <ChevronRight className="w-4 h-4 text-primary" />
              )}
              <span>{section.name}</span>
            </div>
          </TableCell>
        </TableRow>

        {/* Section Item Rows */}
        {isExpanded &&
          (section.items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={periods.length + 1} className="text-muted-foreground text-xs italic pl-8 py-3">
                {t("no_transactions")}
              </TableCell>
            </TableRow>
          ) : (
            section.items.map((item: MultiPeriodRow) => (
              <TableRow key={item.code || item.name} className="hover:bg-muted/20">
                <TableCell className="pl-8 py-2.5 font-medium text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <span>{item.name}</span>
                    {item.drilldown?.general_ledger_url && (
                      <Button variant="ghost" size="icon" asChild title={t("open_gl")} className="w-5 h-5 cursor-pointer text-muted-foreground hover:text-primary">
                        <Link href={item.drilldown.general_ledger_url}>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </TableCell>
                {periods.map((p) => {
                  const val = item.amounts[p.key] ?? 0;
                  const isNegative = val < 0;
                  return (
                    <TableCell
                      key={p.key}
                      className={`text-right py-2.5 font-mono text-xs sm:text-sm tabular-nums ${
                        isNegative ? "text-destructive" : "text-foreground"
                      }`}
                    >
                      {formatAccountingCurrency(val)}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          ))}

        {/* Net Section Total Row */}
        <TableRow className="border-t font-bold bg-background">
          <TableCell className="pl-6 py-3 text-xs sm:text-sm">{netLabel}</TableCell>
          {periods.map((p) => {
            const tot = section.totals[p.key] ?? 0;
            const isNegative = tot < 0;
            return (
              <TableCell
                key={p.key}
                className={`text-right py-3 font-mono text-xs sm:text-sm tabular-nums font-bold ${
                  isNegative ? "text-destructive" : "text-success"
                }`}
              >
                {formatAccountingCurrency(tot)}
              </TableCell>
            );
          })}
        </TableRow>
      </>
    );
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-base font-semibold">{t("cf_title")}</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground/70 cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent>Rincian lengkap arus kas aktivitas operasi, investasi, dan pendanaan</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="min-w-[280px] text-xs font-semibold text-foreground">
                  {t("activities_and_accounts")}
                </TableHead>
                {periods.map((p) => (
                  <TableHead key={p.key} className="text-right min-w-[150px] text-xs font-semibold text-foreground">
                    <div>{p.label}</div>
                    <div className="text-[10px] text-muted-foreground font-normal">{p.sub_label}</div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {renderSection(
                "operating",
                tableData.operating,
                t("net_operating_activities"),
              )}
              {renderSection(
                "investing",
                tableData.investing,
                t("net_investing_activities"),
              )}
              {renderSection(
                "financing",
                tableData.financing,
                t("net_financing_activities"),
              )}

              {/* NET INCREASE (DECREASE) IN CASH */}
              <TableRow className="border-t-2 font-bold bg-muted/20">
                <TableCell className="py-3.5 text-xs sm:text-sm font-extrabold text-foreground">
                  {t("net_increase_decrease_cash")}
                </TableCell>
                {periods.map((p) => {
                  const val = tableData.net_increase_cash[p.key] ?? 0;
                  const isNegative = val < 0;
                  return (
                    <TableCell
                      key={p.key}
                      className={`text-right py-3.5 font-mono text-xs sm:text-sm tabular-nums font-extrabold ${
                        isNegative ? "text-destructive" : "text-success"
                      }`}
                    >
                      {formatAccountingCurrency(val)}
                    </TableCell>
                  );
                })}
              </TableRow>

              {/* Opening Cash Balance */}
              <TableRow className="hover:bg-transparent">
                <TableCell className="py-3 text-xs sm:text-sm text-muted-foreground font-medium">
                  {t("opening_cash_balance")}
                </TableCell>
                {periods.map((p) => (
                  <TableCell key={p.key} className="text-right py-3 font-mono text-xs sm:text-sm tabular-nums text-foreground font-medium">
                    {formatAccountingCurrency(tableData.opening_cash_balance[p.key] ?? 0)}
                  </TableCell>
                ))}
              </TableRow>

              {/* ENDING CASH BALANCE (Highlighted Row) */}
              <TableRow className="border-t bg-primary/10 font-extrabold">
                <TableCell className="py-4 text-xs sm:text-sm font-extrabold text-foreground">
                  {t("ending_cash_balance")}
                </TableCell>
                {periods.map((p) => (
                  <TableCell
                    key={p.key}
                    className="text-right py-4 font-mono text-xs sm:text-sm tabular-nums font-extrabold text-primary"
                  >
                    {formatAccountingCurrency(tableData.ending_cash_balance[p.key] ?? 0)}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
