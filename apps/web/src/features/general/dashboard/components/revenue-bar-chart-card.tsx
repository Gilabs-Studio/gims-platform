"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatCurrency } from "@/lib/utils";
import type { PeriodChartData } from "../types";

interface RevenueBarChartCardProps {
  readonly revenueData?: PeriodChartData;
  readonly costsData?: PeriodChartData;
  readonly isLoading?: boolean;
}

export function RevenueBarChartCard({
  revenueData,
  costsData,
  isLoading,
}: RevenueBarChartCardProps) {
  const t = useTranslations("dashboard");
  const [activeKey, setActiveKey] = useState<"revenue" | "costs">("revenue");

  const activeSeries = activeKey === "revenue" ? revenueData : costsData;
  const periods = activeSeries?.period ?? [];
  const seriesLine = activeSeries?.series?.[0];

  const chartData = periods.map((p, i) => ({
    period: p,
    value: seriesLine?.data?.[i] ?? 0,
  }));

  const maxValue =
    chartData.length > 0 ? Math.max(...chartData.map((d) => d.value)) : 0;

  const revenueTotal =
    revenueData?.series?.[0]?.data?.reduce((a, b) => a + b, 0) ?? 0;
  const costsTotal =
    costsData?.series?.[0]?.data?.reduce((a, b) => a + b, 0) ?? 0;

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="flex h-72 items-center justify-center px-6">
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4">
        <div>
          <CardTitle className="text-base font-semibold leading-normal">{t("revenueChart.title")}</CardTitle>
          <CardDescription className="mt-1.5 text-xs text-muted-foreground leading-normal">
            {t("revenueChart.subtitle")}
          </CardDescription>
        </div>
        <div className="inline-flex rounded-lg border border-border/80 bg-muted/40 p-1 text-xs">
          <button
            type="button"
            data-active={activeKey === "revenue"}
            className={cn(
              "flex cursor-pointer flex-col gap-0.5 rounded-md px-3 py-1.5 text-left transition-colors",
              activeKey === "revenue"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveKey("revenue")}
          >
            <span className="text-[11px] font-medium text-muted-foreground">
              {t("revenueChart.revenue")}
            </span>
            <span className="text-sm font-bold text-foreground">
              {formatCurrency(revenueTotal)}
            </span>
          </button>
          <button
            type="button"
            data-active={activeKey === "costs"}
            className={cn(
              "flex cursor-pointer flex-col gap-0.5 rounded-md px-3 py-1.5 text-left transition-colors",
              activeKey === "costs"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveKey("costs")}
          >
            <span className="text-[11px] font-medium text-muted-foreground">
              {t("revenueChart.costs")}
            </span>
            <span className="text-sm font-bold text-foreground">
              {formatCurrency(costsTotal)}
            </span>
          </button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 items-center px-6">
        <div className="w-full">
          <ResponsiveContainer width="100%" height={186}>
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid
                vertical={false}
                strokeDasharray=""
                className="stroke-border/50"
              />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis hide />
              <Tooltip
                cursor={{
                  fill: "hsl(var(--border))",
                  fillOpacity: 0.3,
                }}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--popover))",
                  color: "hsl(var(--popover-foreground))",
                  fontSize: 12,
                }}
                formatter={(v: number) => [formatCurrency(v)]}
                labelFormatter={(label) => String(label)}
              />
              <Bar
                dataKey="value"
                radius={[5, 5, 0, 0]}
                maxBarSize={20}
              >
                {chartData.map((entry, index) => {
                  const isHighest = maxValue > 0 && entry.value === maxValue;
                  return (
                    <Cell
                      key={`bar-cell-${entry.period}-${index}`}
                      fill={
                        isHighest
                          ? "hsl(var(--chart-2))"
                          : "hsl(var(--chart-1))"
                      }
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
