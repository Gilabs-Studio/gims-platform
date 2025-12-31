"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/utils";
import type { StockValuationTimeline, StockValuationTimelineData } from "../types";

interface TimelineChartCardProps {
  readonly data?: StockValuationTimeline;
  readonly isLoading?: boolean;
  readonly onGroupByChange?: (groupBy: "daily" | "weekly" | "monthly") => void;
  readonly groupBy?: "daily" | "weekly" | "monthly";
}

const chartConfig = {
  total_quantity: {
    label: "Quantity",
    color: "hsl(var(--chart-1))",
  },
  total_value: {
    label: "Value",
    color: "hsl(var(--chart-2))",
  },
  movement_count: {
    label: "Movements",
    color: "hsl(var(--chart-3))",
  },
} satisfies Record<string, { label: string; color: string }>;

export function TimelineChartCard({
  data,
  isLoading,
  onGroupByChange,
  groupBy = "daily",
}: TimelineChartCardProps) {
  const t = useTranslations("stockValuations.chart");
  const [activeMetric, setActiveMetric] = useState<"quantity" | "value">("quantity");

  const chartData = useMemo(() => {
    if (!data?.data) return [];
    return data.data.map((item: StockValuationTimelineData) => ({
      ...item,
      date: new Date(item.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      fullDate: item.date,
    }));
  }, [data]);

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="h-5 w-48 bg-muted rounded" />
          <div className="flex gap-2">
            <div className="h-8 w-16 bg-muted rounded" />
            <div className="h-8 w-16 bg-muted rounded" />
            <div className="h-8 w-16 bg-muted rounded" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
        <CardTitle className="text-lg font-semibold">{t("title")}</CardTitle>
        <div className="flex items-center gap-2">
          {/* Metric Toggle */}
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button
              variant={activeMetric === "quantity" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveMetric("quantity")}
              className="cursor-pointer h-7 px-3 text-xs"
            >
              {t("quantity")}
            </Button>
            <Button
              variant={activeMetric === "value" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveMetric("value")}
              className="cursor-pointer h-7 px-3 text-xs"
            >
              {t("value")}
            </Button>
          </div>

          {/* Group By Toggle */}
          <div className="flex items-center gap-1 border rounded-lg p-1">
            {(["daily", "weekly", "monthly"] as const).map((period) => (
              <Button
                key={period}
                variant={groupBy === period ? "secondary" : "ghost"}
                size="sm"
                onClick={() => onGroupByChange?.(period)}
                className="cursor-pointer h-7 px-3 text-xs"
              >
                {t(period)}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No data available for this period
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorQuantity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  tickFormatter={(value) =>
                    activeMetric === "value"
                      ? `${(value / 1000000).toFixed(0)}M`
                      : value.toLocaleString()
                  }
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => {
                        if (name === "total_value") {
                          return formatCurrency(Number(value));
                        }
                        return Number(value).toLocaleString();
                      }}
                    />
                  }
                />
                {activeMetric === "quantity" ? (
                  <Area
                    type="monotone"
                    dataKey="total_quantity"
                    stroke="hsl(var(--chart-1))"
                    fill="url(#colorQuantity)"
                    strokeWidth={2}
                  />
                ) : (
                  <Area
                    type="monotone"
                    dataKey="total_value"
                    stroke="hsl(var(--chart-2))"
                    fill="url(#colorValue)"
                    strokeWidth={2}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
