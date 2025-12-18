"use client";

import { useRef, useEffect, useState, useId } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useTranslations } from "next-intl";
import type { RevenueCostsData } from "../types";

interface RevenueCostsCardProps {
  readonly data?: RevenueCostsData;
}

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
  costs: {
    label: "Costs",
    color: "hsl(var(--chart-2))",
  },
} satisfies Record<string, { label: string; color: string }>;

export function RevenueCostsCard({ data }: RevenueCostsCardProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartId = useId().replace(/:/g, "-");
  const [revenueColor, setRevenueColor] = useState<string>("#3b82f6");
  const [costsColor, setCostsColor] = useState<string>("#10b981");

  useEffect(() => {
    // Initialize from root CSS variables first
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    const chart1 = computedStyle.getPropertyValue("--chart-1").trim();
    const chart2 = computedStyle.getPropertyValue("--chart-2").trim();
    
    if (chart1) {
      setRevenueColor(`hsl(${chart1})`);
    }
    
    if (chart2) {
      setCostsColor(`hsl(${chart2})`);
    }

    // Then try to get from chart container (which may override with --color-revenue)
    const updateColors = () => {
      if (chartRef.current) {
        const container = chartRef.current.querySelector('[data-chart]') as HTMLElement;
        if (container) {
          const containerStyle = getComputedStyle(container);
          const revenue = containerStyle.getPropertyValue("--color-revenue").trim();
          const costs = containerStyle.getPropertyValue("--color-costs").trim();
          
          if (revenue) setRevenueColor(revenue);
          if (costs) setCostsColor(costs);
        }
      }
    };

    // Try after component mounts
    const timeout1 = setTimeout(updateColors, 100);
    const timeout2 = setTimeout(updateColors, 300);
    
    // Also observe for changes
    if (chartRef.current) {
      const observer = new MutationObserver(updateColors);
      observer.observe(chartRef.current, { childList: true, subtree: true, attributes: true });
      
      return () => {
        clearTimeout(timeout1);
        clearTimeout(timeout2);
        observer.disconnect();
      };
    }
    
    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
    };
  }, []);

  // Use resolved colors
  const finalRevenueColor = revenueColor;
  const finalCostsColor = costsColor;

  const revenueCosts = data ?? {
    revenue: { label: "Revenue", data: [], formatted: [] },
    costs: { label: "Costs", data: [], formatted: [] },
    period: [],
  };

  const periods = revenueCosts.period ?? [];
  const revenueData = revenueCosts.revenue?.data ?? [];
  const costsData = revenueCosts.costs?.data ?? [];
  const revenueFormatted = revenueCosts.revenue?.formatted ?? [];
  const costsFormatted = revenueCosts.costs?.formatted ?? [];

  // Transform data for chart
  const chartData = periods.map((period, index) => ({
    period,
    revenue: revenueData[index] ?? 0,
    costs: costsData[index] ?? 0,
    revenueFormatted: revenueFormatted[index] ?? "0",
    costsFormatted: costsFormatted[index] ?? "0",
  }));

  const t = useTranslations("dashboard.revenueCosts");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
            {t("empty")}
          </div>
        ) : (
          <div ref={chartRef} className="w-full">
            <ChartContainer
              config={chartConfig}
              className="h-[300px] w-full !aspect-none"
            >
            <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`fillRevenue-${chartId}`} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={finalRevenueColor}
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor={finalRevenueColor}
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id={`fillCosts-${chartId}`} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={finalCostsColor}
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor={finalCostsColor}
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="period"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                return (
                  <ChartTooltipContent>
                    {payload.map((entry, index) => {
                      const dataKey = entry.dataKey as string;
                      const formattedKey = `${dataKey}Formatted` as keyof typeof entry.payload;
                      const formattedValue = entry.payload?.[formattedKey] as string | undefined;
                      
                      return (
                        <div key={index} className="flex items-center gap-2">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="text-xs">
                            {entry.name === "revenue"
                              ? chartConfig.revenue.label
                              : chartConfig.costs.label}
                            : {formattedValue ?? entry.value?.toLocaleString() ?? "0"}
                          </span>
                        </div>
                      );
                    })}
                  </ChartTooltipContent>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke={finalRevenueColor}
              fill={`url(#fillRevenue-${chartId})`}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="costs"
              stroke={finalCostsColor}
              fill={`url(#fillCosts-${chartId})`}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
        </div>
        )}
      </CardContent>
    </Card>
  );
}

