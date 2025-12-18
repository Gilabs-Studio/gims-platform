"use client";

import { useRef, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import type { BalanceData } from "../types";
import { TrendingUpIcon, TrendingDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface BalanceCardProps {
  readonly data?: BalanceData;
}

const chartConfig = {
  value: {
    label: "Balance",
    color: "hsl(var(--chart-1))",
  },
} satisfies Record<string, { label: string; color: string }>;

export function BalanceCard({ data }: BalanceCardProps) {
  const t = useTranslations("dashboard.balance");
  const chartRef = useRef<HTMLDivElement>(null);
  const [valueColor, setValueColor] = useState<string>("#3b82f6");

  useEffect(() => {
    // Initialize from root CSS variable first
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    const chart1 = computedStyle.getPropertyValue("--chart-1").trim();
    
    if (chart1) {
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        setValueColor(`hsl(${chart1})`);
      }, 0);
    }

    // Then try to get from chart container (which may override with --color-value)
    const updateColor = () => {
      if (chartRef.current) {
        const container = chartRef.current.querySelector('[data-chart]') as HTMLElement;
        if (container) {
          const containerStyle = getComputedStyle(container);
          const value = containerStyle.getPropertyValue("--color-value").trim();
          
          if (value) {
            setTimeout(() => {
              setValueColor(value);
            }, 0);
          }
        }
      }
    };

    // Try after component mounts
    const timeout1 = setTimeout(updateColor, 100);
    const timeout2 = setTimeout(updateColor, 300);
    
    // Also observe for changes
    if (chartRef.current) {
      const observer = new MutationObserver(updateColor);
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

  // Use resolved color
  const finalValueColor = valueColor;

  const balance = data ?? {
    current: 0,
    previous: 0,
    change_percent: 0,
    current_formatted: "0",
    previous_formatted: "0",
    chart_data: [],
  };

  const chartData = balance.chart_data ?? [];
  const changePercent = balance.change_percent ?? 0;
  const isPositive = changePercent >= 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-8 flex items-baseline gap-2">
          <p className="text-3xl font-semibold">
            {balance.current_formatted ?? String(balance.current ?? 0)}
          </p>
          {changePercent !== 0 && (
            <div
              className={cn(
                "flex items-center gap-1 text-sm",
                isPositive ? "text-green-600" : "text-red-600",
              )}
            >
              {isPositive ? (
                <TrendingUpIcon className="h-4 w-4" />
              ) : (
                <TrendingDownIcon className="h-4 w-4" />
              )}
              <span>{Math.abs(changePercent).toFixed(1)}%</span>
            </div>
          )}
        </div>
        <div ref={chartRef} className="w-full">
          <ChartContainer
            config={chartConfig}
            className="h-[200px] w-full aspect-none!"
          >
          <BarChart data={chartData}>
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
                const value = payload[0];
                const formattedValue = value.payload?.formatted as string | undefined;
                
                return (
                  <ChartTooltipContent>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: value.color }}
                      />
                      <span className="text-xs">
                        {chartConfig.value.label}:{" "}
                        {formattedValue ?? value.value?.toLocaleString() ?? "0"}
                      </span>
                    </div>
                  </ChartTooltipContent>
                );
              }}
            />
            <Bar
              dataKey="value"
              fill={finalValueColor}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}

