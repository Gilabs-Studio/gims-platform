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
import { useProfitLossStatementTable } from "../hooks/use-profit-loss";
import type { ProfitLossQueryParams, MultiPeriodRow, MultiPeriodSection } from "../types";

interface ProfitLossStatementTableProps {
  params: ProfitLossQueryParams;
}

function formatAccountingCurrency(val: number): string {
  if (val === 0) return "0";
  if (val < 0) {
    return `(${formatCurrency(Math.abs(val))})`;
  }
  return formatCurrency(val);
}

function formatPercent(val: number): string {
  if (val === 0) return "-";
  return `${val.toFixed(1)}%`;
}

export function ProfitLossStatementTable({ params }: ProfitLossStatementTableProps) {
  const t = useTranslations("financeReports");
  const { data, isLoading, isError, refetch } = useProfitLossStatementTable(params);
  const tableData = data?.data;

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    operating_expense: true,
  });

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
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
          <p className="text-sm text-destructive font-medium">{t("pl_statement_table_error")}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="cursor-pointer text-xs">
            {t("retry")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const periods = tableData.periods || [];

  const renderSectionHeader = (codeLetter: string, title: string, isExpandable = false, sectionKey = "") => {
    const isExpanded = expandedSections[sectionKey] ?? true;

    return (
      <TableRow
        className={`bg-muted/40 hover:bg-muted/60 font-bold select-none text-primary ${isExpandable ? "cursor-pointer" : ""}`}
        onClick={() => isExpandable && toggleSection(sectionKey)}
      >
        <TableCell colSpan={periods.length + 1} className="py-3 text-xs sm:text-sm font-bold text-primary">
          <div className="flex items-center gap-2">
            {isExpandable && (
              isExpanded ? <ChevronDown className="w-4 h-4 text-primary" /> : <ChevronRight className="w-4 h-4 text-primary" />
            )}
            <span>{codeLetter}. {title}</span>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  const renderSectionItems = (section: MultiPeriodSection, isNegativeValue = false, sectionKey = "") => {
    const isExpanded = expandedSections[sectionKey] ?? true;
    if (!isExpanded) return null;

    if (!section.items || section.items.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={periods.length + 1} className="text-muted-foreground text-xs italic pl-8 py-2.5">
            {t("no_transactions")}
          </TableCell>
        </TableRow>
      );
    }

    return section.items.map((item: MultiPeriodRow) => (
      <TableRow key={item.code || item.name} className="hover:bg-muted/20">
        <TableCell className="pl-8 py-2.5 font-medium text-xs sm:text-sm text-foreground">
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
          if (p.key === "yoy") {
            const isNegativeYoY = val < 0;
            return (
              <TableCell key={p.key} className={`text-right py-2.5 font-mono text-xs sm:text-sm tabular-nums ${isNegativeYoY ? "text-destructive" : "text-success"}`}>
                {formatPercent(val)}
              </TableCell>
            );
          }
          return (
            <TableCell
              key={p.key}
              className={`text-right py-2.5 font-mono text-xs sm:text-sm tabular-nums ${
                isNegativeValue ? "text-destructive font-medium" : val > 0 ? "text-success font-medium" : "text-foreground"
              }`}
            >
              {formatAccountingCurrency(val)}
            </TableCell>
          );
        })}
      </TableRow>
    ));
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-base font-semibold">{t("pl_title")}</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground/70 cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent>{t("tooltip_profit_loss_statement_table")}</TooltipContent>
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
                  Profit & Loss Statement
                </TableHead>
                {periods.map((p) => (
                  <TableHead key={p.key} className="text-right min-w-[140px] text-xs font-semibold text-foreground">
                    <div>{p.label}</div>
                    <div className="text-[10px] text-muted-foreground font-normal">{p.sub_label}</div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* A. REVENUE */}
              {renderSectionHeader("A", "REVENUE")}
              {renderSectionItems(tableData.revenue, false)}

              {/* B. COST OF GOODS SOLD */}
              {renderSectionHeader("B", "COST OF GOODS SOLD")}
              {renderSectionItems(tableData.cogs, true)}

              {/* GROSS PROFIT (A - B) */}
              <TableRow className="border-t-2 font-bold bg-muted/20">
                <TableCell className="py-3 text-xs sm:text-sm font-extrabold text-foreground">
                  GROSS PROFIT (A - B)
                </TableCell>
                {periods.map((p) => {
                  const val = tableData.gross_profit[p.key] ?? 0;
                  const isNegative = val < 0;
                  if (p.key === "yoy") {
                    return (
                      <TableCell key={p.key} className={`text-right py-3 font-mono text-xs sm:text-sm tabular-nums font-bold ${isNegative ? "text-destructive" : "text-success"}`}>
                        {formatPercent(val)}
                      </TableCell>
                    );
                  }
                  return (
                    <TableCell key={p.key} className={`text-right py-3 font-mono text-xs sm:text-sm tabular-nums font-bold ${isNegative ? "text-destructive" : "text-success"}`}>
                      {formatAccountingCurrency(val)}
                    </TableCell>
                  );
                })}
              </TableRow>
              {/* Gross Profit Margin Subtext Row */}
              <TableRow className="bg-muted/10">
                <TableCell className="py-1.5 pl-8 text-[11px] text-muted-foreground italic">
                  Gross Profit Margin
                </TableCell>
                {periods.map((p) => (
                  <TableCell key={p.key} className="text-right py-1.5 font-mono text-[11px] text-success italic font-semibold">
                    {formatPercent(tableData.gross_margin[p.key] ?? 0)}
                  </TableCell>
                ))}
              </TableRow>

              {/* C. OPERATING EXPENSES */}
              {renderSectionHeader("C", "OPERATING EXPENSES", true, "operating_expense")}
              {renderSectionItems(tableData.operating_expense, true, "operating_expense")}

              {/* OPERATING PROFIT (GROSS PROFIT - C) */}
              <TableRow className="border-t-2 font-bold bg-muted/20">
                <TableCell className="py-3 text-xs sm:text-sm font-extrabold text-foreground">
                  OPERATING PROFIT (GROSS PROFIT - C)
                </TableCell>
                {periods.map((p) => {
                  const val = tableData.operating_profit[p.key] ?? 0;
                  const isNegative = val < 0;
                  if (p.key === "yoy") {
                    return (
                      <TableCell key={p.key} className={`text-right py-3 font-mono text-xs sm:text-sm tabular-nums font-bold ${isNegative ? "text-destructive" : "text-success"}`}>
                        {formatPercent(val)}
                      </TableCell>
                    );
                  }
                  return (
                    <TableCell key={p.key} className={`text-right py-3 font-mono text-xs sm:text-sm tabular-nums font-bold ${isNegative ? "text-destructive" : "text-success"}`}>
                      {formatAccountingCurrency(val)}
                    </TableCell>
                  );
                })}
              </TableRow>
              {/* Operating Profit Margin Subtext Row */}
              <TableRow className="bg-muted/10">
                <TableCell className="py-1.5 pl-8 text-[11px] text-muted-foreground italic">
                  Operating Profit Margin
                </TableCell>
                {periods.map((p) => (
                  <TableCell key={p.key} className="text-right py-1.5 font-mono text-[11px] text-success italic font-semibold">
                    {formatPercent(tableData.operating_margin[p.key] ?? 0)}
                  </TableCell>
                ))}
              </TableRow>

              {/* D. OTHER INCOME */}
              {renderSectionHeader("D", "OTHER INCOME")}
              {renderSectionItems(tableData.other_income, false)}

              {/* E. OTHER EXPENSES */}
              {renderSectionHeader("E", "OTHER EXPENSES")}
              {renderSectionItems(tableData.other_expense, true)}

              {/* NET PROFIT (OPERATING PROFIT + D - E) */}
              <TableRow className="border-t bg-primary/10 font-extrabold">
                <TableCell className="py-4 text-xs sm:text-sm font-extrabold text-foreground">
                  NET PROFIT (OPERATING PROFIT + D - E)
                </TableCell>
                {periods.map((p) => {
                  const val = tableData.net_profit[p.key] ?? 0;
                  if (p.key === "yoy") {
                    const isNegative = val < 0;
                    return (
                      <TableCell key={p.key} className={`text-right py-4 font-mono text-xs sm:text-sm tabular-nums font-extrabold ${isNegative ? "text-destructive" : "text-success"}`}>
                        {formatPercent(val)}
                      </TableCell>
                    );
                  }
                  return (
                    <TableCell key={p.key} className={`text-right py-4 font-mono text-xs sm:text-sm tabular-nums font-extrabold ${val < 0 ? "text-destructive" : val > 0 ? "text-success" : "text-foreground"}`}>
                      {formatAccountingCurrency(val)}
                    </TableCell>
                  );
                })}
              </TableRow>
              {/* Net Profit Margin Subtext Row */}
              <TableRow className="bg-primary/5">
                <TableCell className="py-1.5 pl-8 text-[11px] text-muted-foreground italic">
                  Net Profit Margin
                </TableCell>
                {periods.map((p) => (
                  <TableCell key={p.key} className="text-right py-1.5 font-mono text-[11px] text-success italic font-semibold">
                    {formatPercent(tableData.net_margin[p.key] ?? 0)}
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
