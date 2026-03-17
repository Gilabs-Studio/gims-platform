"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { DateRange } from "react-day-picker";
import type { CustomerRevenueTrendPoint } from "../types";

interface CustomerRevenueTrendChartProps {
  readonly data: CustomerRevenueTrendPoint[];
  readonly isLoading?: boolean;
  readonly dateRange: DateRange | undefined;
  readonly onDateRangeChange: (range: DateRange | undefined) => void;
  readonly interval: "daily" | "weekly" | "monthly";
  readonly onIntervalChange: (value: "daily" | "weekly" | "monthly") => void;
}

const chartConfig = {
  total_revenue: {
    label: "Revenue",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export function CustomerRevenueTrendChart({
  data,
  isLoading,
  dateRange,
  onDateRangeChange,
  interval,
  onIntervalChange,
}: CustomerRevenueTrendChartProps) {
  const t = useTranslations("customerResearchReport.chart");

  const chartData = useMemo(() => {
    return (data ?? []).map((item) => ({
      period: item.period,
      total_revenue: item.total_revenue,
    }));
  }, [data]);

  const totalRevenue = useMemo(() => {
    return (data ?? []).reduce((sum, current) => sum + (current.total_revenue ?? 0), 0);
  }, [data]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[340px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={interval} onValueChange={(value) => onIntervalChange(value as "daily" | "weekly" | "monthly") }>
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">{t("interval.daily")}</SelectItem>
                <SelectItem value="weekly">{t("interval.weekly")}</SelectItem>
                <SelectItem value="monthly">{t("interval.monthly")}</SelectItem>
              </SelectContent>
            </Select>
            <DateRangePicker dateRange={dateRange} onDateChange={onDateRangeChange} />
          </div>
        </div>
        <div className="pt-3">
          <p className="text-xs text-muted-foreground">{t("total_revenue")}</p>
          <p className="text-xl font-semibold">{formatCurrency(totalRevenue)}</p>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-[340px] flex items-center justify-center text-sm text-muted-foreground">
            {t("no_data")}
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[340px] w-full">
            <BarChart accessibilityLayer data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="period"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) =>
                  formatCurrency(Number(value)).replace("Rp", "").trim()
                }
                width={90}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                }
              />
              <Bar
                dataKey="total_revenue"
                fill="var(--color-total_revenue)"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
