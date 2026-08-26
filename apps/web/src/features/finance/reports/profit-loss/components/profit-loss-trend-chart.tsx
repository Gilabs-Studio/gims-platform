"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Info } from "lucide-react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { useProfitLossTrend } from "../hooks/use-profit-loss";
import type { ProfitLossQueryParams } from "../types";

interface ProfitLossTrendChartProps {
  params: ProfitLossQueryParams;
}

function formatShortCurrency(value: number): string {
  const absVal = Math.abs(value);
  if (absVal >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(value % 1_000_000_000 === 0 ? 0 : 1)}B`;
  }
  if (absVal >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
  }
  if (absVal >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`;
  }
  return value.toString();
}

export function ProfitLossTrendChart({ params }: ProfitLossTrendChartProps) {
  const t = useTranslations("financeReports");
  const [months, setMonths] = useState<number>(6);
  const { data, isLoading, isError, refetch } = useProfitLossTrend({ ...params, months });

  const chartPoints = data?.data?.months ?? [];

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-base font-semibold">{t("profit_trend")}</CardTitle>
          <TooltipProvider>
            <UiTooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground/70 cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent>{t("tooltip_profit_trend")}</TooltipContent>
            </UiTooltip>
          </TooltipProvider>
        </div>
        <Select value={months.toString()} onValueChange={(val) => setMonths(Number(val))}>
          <SelectTrigger className="w-[140px] h-8 text-xs cursor-pointer">
            <SelectValue placeholder={t("select_period_placeholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="6" className="cursor-pointer">{t("last_6_months")}</SelectItem>
            <SelectItem value="12" className="cursor-pointer">{t("last_12_months")}</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent className="flex-1">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <Skeleton className="h-48 w-full" />
          </div>
        ) : isError ? (
          <div className="h-64 flex flex-col items-center justify-center space-y-2 text-center">
            <p className="text-sm text-destructive font-medium">{t("pl_trend_chart_error")}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="cursor-pointer text-xs">
              {t("retry")}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Custom Legend Header */}
            <div className="flex items-center justify-start gap-6 text-xs font-medium pl-2">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#2563eb] inline-block" />
                <span className="text-muted-foreground">{t("revenue")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#10b981] inline-block" />
                <span className="text-muted-foreground">{t("gross_profit")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full border-2 border-[#8b5cf6] bg-[#8b5cf6] inline-block" />
                <span className="text-muted-foreground">{t("net_profit")}</span>
              </div>
            </div>

            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartPoints} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tickFormatter={formatShortCurrency}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--popover))",
                      color: "hsl(var(--popover-foreground))",
                      fontSize: 12,
                    }}
                    formatter={(val: number, name: string) => [
                      formatCurrency(val),
                      name === "revenue"
                        ? t("revenue")
                        : name === "gross_profit"
                        ? t("gross_profit")
                        : t("net_profit"),
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#2563eb", stroke: "#ffffff", strokeWidth: 1.5 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="gross_profit"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#10b981", stroke: "#ffffff", strokeWidth: 1.5 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="net_profit"
                    stroke="#8b5cf6"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#8b5cf6", stroke: "#ffffff", strokeWidth: 1.5 }}
                    activeDot={{ r: 6 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
