"use client";

import { useTranslations } from "next-intl";
import { Info } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { useProfitLossRevenueVsExpense } from "../hooks/use-profit-loss";
import type { ProfitLossQueryParams } from "../types";

interface RevenueVsExpenseChartProps {
  params: ProfitLossQueryParams;
}

function formatShortCurrency(value: number): string {
  const absVal = Math.abs(value);
  if (absVal >= 1_000_000_000) {
    return `Rp ${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (absVal >= 1_000_000) {
    return `Rp ${(value / 1_000_000).toFixed(1)}M`;
  }
  return formatCurrency(value);
}

export function RevenueVsExpenseChart({ params }: RevenueVsExpenseChartProps) {
  const t = useTranslations("financeReports");
  const { data, isLoading, isError, refetch } = useProfitLossRevenueVsExpense(params);
  const rve = data?.data;

  const chartData = rve
    ? [
        { name: t("revenue"), value: rve.total_revenue, color: "#2563eb", percent: 100 },
        { name: t("cogs"), value: rve.cogs, color: "#10b981", percent: rve.cogs_percent },
        { name: t("operating_expenses"), value: rve.operating_expenses, color: "#f59e0b", percent: rve.operating_expenses_percent },
        { name: t("other_income"), value: rve.other_income, color: "#06b6d4", percent: rve.other_income_percent },
        { name: t("other_expenses"), value: rve.other_expenses, color: "#ef4444", percent: rve.other_expenses_percent },
      ]
    : [];

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-base font-semibold">{t("revenue_vs_expense")}</CardTitle>
          <TooltipProvider>
            <UiTooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground/70 cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent>{t("tooltip_revenue_vs_expense")}</TooltipContent>
            </UiTooltip>
          </TooltipProvider>
        </div>
        <Select defaultValue="summary">
          <SelectTrigger className="w-[130px] h-8 text-xs cursor-pointer">
            <SelectValue placeholder={t("summary_view")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="summary" className="cursor-pointer">{t("summary_view")}</SelectItem>
            <SelectItem value="detail" className="cursor-pointer">{t("detail_account_view")}</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-center">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <Skeleton className="h-48 w-48 rounded-full" />
          </div>
        ) : isError || !rve ? (
          <div className="h-64 flex flex-col items-center justify-center space-y-2 text-center">
            <p className="text-sm text-destructive font-medium">{t("pl_revenue_vs_expense_error")}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="cursor-pointer text-xs">
              {t("retry")}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-center">
            {/* Donut Chart with Center Text */}
            <div className="sm:col-span-2 relative h-56 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number) => formatCurrency(val)}
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--popover))",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-sm font-extrabold text-foreground font-mono">
                  {formatShortCurrency(rve.total_revenue)}
                </span>
                <span className="text-[11px] text-muted-foreground font-medium">{t("revenue")}</span>
              </div>
            </div>

            {/* Right Legend & Amount List */}
            <div className="sm:col-span-3 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#2563eb] shrink-0" />
                  <span className="font-medium text-foreground">{t("revenue")}</span>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <span className="font-semibold text-foreground">{formatCurrency(rve.total_revenue)}</span>
                  <span className="text-muted-foreground w-12 text-right">100%</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#10b981] shrink-0" />
                  <span className="font-medium text-foreground">{t("cogs")}</span>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-destructive font-semibold">({formatCurrency(rve.cogs)})</span>
                  <span className="text-muted-foreground w-12 text-right">({rve.cogs_percent}%)</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#f59e0b] shrink-0" />
                  <span className="font-medium text-foreground">{t("operating_expenses")}</span>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-destructive font-semibold">({formatCurrency(rve.operating_expenses)})</span>
                  <span className="text-muted-foreground w-12 text-right">({rve.operating_expenses_percent}%)</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#06b6d4] shrink-0" />
                  <span className="font-medium text-foreground">{t("other_income")}</span>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <span className="font-semibold text-foreground">{formatCurrency(rve.other_income)}</span>
                  <span className="text-muted-foreground w-12 text-right">{rve.other_income_percent}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#ef4444] shrink-0" />
                  <span className="font-medium text-foreground">{t("other_expenses")}</span>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-destructive font-semibold">({formatCurrency(rve.other_expenses)})</span>
                  <span className="text-muted-foreground w-12 text-right">({rve.other_expenses_percent}%)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
