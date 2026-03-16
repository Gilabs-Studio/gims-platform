"use client";

import * as React from "react";
import { format } from "date-fns";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { formatCurrency } from "@/lib/utils";
import type { SalaryTotalSalaryPoint } from "../types";

interface SalaryTotalSalaryChartProps {
  readonly data: SalaryTotalSalaryPoint[];
  readonly className?: string;
}

const chartConfig = {
  totalSalary: {
    label: "Total Salary",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

function TotalSalaryTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: SalaryTotalSalaryPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-background border border-border rounded-lg p-2 shadow-sm max-w-[200px]">
      <div className="text-xs font-medium mb-1">{data.period}</div>
      <div className="flex justify-between gap-2 text-xs">
        <span className="text-muted-foreground">Total Salary:</span>
        <span className="font-medium">{formatCurrency(data.total_salary)}</span>
      </div>
    </div>
  );
}

export function SalaryTotalSalaryChart({ data, className }: SalaryTotalSalaryChartProps) {
  const sorted = React.useMemo(() => {
    return [...data]
      .map((item) => ({
        ...item,
        period: item.period,
      }))
      .sort((a, b) => new Date(a.period).getTime() - new Date(b.period).getTime());
  }, [data]);

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        <p>No salary trend data available</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <ChartContainer config={chartConfig} className="h-40 w-full">
        <AreaChart data={sorted} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
          <defs>
            <linearGradient id="fillTotalSalary" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-totalSalary)" stopOpacity={0.6} />
              <stop offset="95%" stopColor="var(--color-totalSalary)" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="period"
            className="text-xs fill-muted-foreground"
            tick={{ fontSize: 10 }}
            tickFormatter={(value) => {
              const date = new Date(value);
              if (isNaN(date.getTime())) return value;
              return format(date, "MMM yyyy");
            }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            className="text-xs fill-muted-foreground"
            tick={{ fontSize: 10 }}
            tickFormatter={(value) => formatCurrency(value as number)}
            tickLine={false}
            axisLine={false}
            width={80}
          />
          <ChartTooltip content={<TotalSalaryTooltip />} wrapperStyle={{ outline: "none" }} />
          <Area
            type="natural"
            dataKey="total_salary"
            stroke="var(--color-totalSalary)"
            fill="url(#fillTotalSalary)"
            strokeWidth={2}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
