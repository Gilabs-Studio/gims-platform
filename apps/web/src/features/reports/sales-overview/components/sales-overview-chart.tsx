"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import type { DateRange } from "react-day-picker";
import type { MonthlySalesData } from "../types";

export interface SalesOverviewChartProps {
  readonly data: MonthlySalesData[];
  readonly isLoading?: boolean;
  readonly filterMode: "year" | "range";
  readonly onFilterModeChange: (mode: "year" | "range") => void;
  readonly selectedYear: number;
  readonly onYearChange: (year: number) => void;
  readonly dateRange: DateRange | undefined;
  readonly onDateRangeChange: (range: DateRange | undefined) => void;
  readonly selectedMetric?: "revenue" | "orders" | "visits" | "deliveries";
  readonly onMetricChange?: (
    metric: "revenue" | "orders" | "visits" | "deliveries"
  ) => void;
}

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--primary))",
  },
  orders: {
    label: "Orders",
    color: "hsl(var(--chart-2))",
  },
  visits: {
    label: "Visits",
    color: "hsl(var(--chart-5))",
  },
  deliveries: {
    label: "Deliveries",
    color: "hsl(var(--chart-3))",
  },
  target: {
    label: "Target",
    color: "hsl(var(--muted-foreground))",
  },
} satisfies ChartConfig;

const formatNumber = (value: number): string => {
  return value.toLocaleString("id-ID");
};

const generateYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const startYear = 2000;
  const endYear = currentYear + 1;
  const years: number[] = [];
  for (let i = endYear; i >= startYear; i--) {
    years.push(i);
  }
  return years;
};

export function SalesOverviewChart({
  data,
  isLoading,
  filterMode,
  onFilterModeChange,
  selectedYear,
  onYearChange,
  dateRange,
  onDateRangeChange,
  selectedMetric = "revenue",
  onMetricChange,
}: SalesOverviewChartProps) {
  const t = useTranslations("salesOverviewReport.chart");
  const years = React.useMemo(() => generateYearOptions(), []);

  const metricLabels = {
    revenue: t("metrics.revenue"),
    orders: t("metrics.orders"),
    visits: t("metrics.visits"),
    deliveries: t("metrics.deliveries"),
  };

  const chartData = React.useMemo(() => {
    if (!data) return [];
    return data.map((month) => ({
      month: month.month_name.substring(0, 3),
      revenue: month.total_revenue,
      target: month.target_amount,
      orders: month.total_orders,
      visits: month.total_visits,
      deliveries: month.total_deliveries,
    }));
  }, [data]);

  const totals = React.useMemo(() => {
    if (!data)
      return { revenue: 0, orders: 0, visits: 0, deliveries: 0 };
    return data.reduce(
      (acc, curr) => ({
        revenue: acc.revenue + curr.total_revenue,
        orders: acc.orders + curr.total_orders,
        visits: acc.visits + curr.total_visits,
        deliveries: acc.deliveries + curr.total_deliveries,
      }),
      { revenue: 0, orders: 0, visits: 0, deliveries: 0 }
    );
  }, [data]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasData = data && data.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {t("title")}
            </CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            {/* Filter Mode Toggle */}
            <div className="flex items-center bg-muted p-1 rounded-lg">
              <button
                onClick={() => onFilterModeChange("year")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  filterMode === "year"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("filter.year")}
              </button>
              <button
                onClick={() => onFilterModeChange("range")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  filterMode === "range"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("filter.customRange")}
              </button>
            </div>

            {/* Metric Selector */}
            {onMetricChange && (
              <Select
                value={selectedMetric}
                onValueChange={(value) =>
                  onMetricChange(value as typeof selectedMetric)
                }
              >
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">
                    {metricLabels.revenue}
                  </SelectItem>
                  <SelectItem value="orders">
                    {metricLabels.orders}
                  </SelectItem>
                  <SelectItem value="visits">
                    {metricLabels.visits}
                  </SelectItem>
                  <SelectItem value="deliveries">
                    {metricLabels.deliveries}
                  </SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Year Selector */}
            {filterMode === "year" && (
              <Select
                value={selectedYear.toString()}
                onValueChange={(val) => onYearChange(parseInt(val))}
              >
                <SelectTrigger className="w-[110px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Date Range Picker */}
            {filterMode === "range" && (
              <div>
                <DateRangePicker
                  dateRange={dateRange}
                  onDateChange={onDateRangeChange}
                />
              </div>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              {metricLabels.revenue}
            </p>
            <p className="text-lg font-medium">
              {formatCurrency(totals.revenue)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              {metricLabels.orders}
            </p>
            <p className="text-lg font-medium">
              {formatNumber(totals.orders)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              {metricLabels.visits}
            </p>
            <p className="text-lg font-medium">
              {formatNumber(totals.visits)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              {metricLabels.deliveries}
            </p>
            <p className="text-lg font-medium">
              {formatNumber(totals.deliveries)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="text-center py-12 text-muted-foreground">
            {t("noData")}
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="h-[400px] w-full"
          >
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => {
                  if (selectedMetric === "revenue") {
                    if (value >= 1000000000)
                      return `${(value / 1000000000).toFixed(1)}M`;
                    if (value >= 1000000)
                      return `${(value / 1000000).toFixed(0)}Jt`;
                    return `${(value / 1000).toFixed(0)}k`;
                  }
                  return formatNumber(value);
                }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => {
                      if (
                        name === "revenue" ||
                        name === "target"
                      ) {
                        return (
                          <>
                            <span className="font-medium">
                              {name === "revenue"
                                ? metricLabels.revenue
                                : "Target"}
                            </span>
                            <span className="ml-auto font-mono font-medium tabular-nums text-foreground">
                              {formatCurrency(Number(value))}
                            </span>
                          </>
                        );
                      }
                      return (
                        <>
                          <span className="font-medium">
                            {chartConfig[
                              name as keyof typeof chartConfig
                            ]?.label || name}
                          </span>
                          <span className="ml-auto font-mono font-medium tabular-nums text-foreground">
                            {formatNumber(Number(value))}
                          </span>
                        </>
                      );
                    }}
                  />
                }
              />
              <Bar
                dataKey={selectedMetric}
                name={selectedMetric}
                fill={`var(--color-${selectedMetric})`}
                radius={[4, 4, 0, 0]}
                maxBarSize={50}
              />
              {selectedMetric === "revenue" && (
                <Bar
                  dataKey="target"
                  name="target"
                  fill="var(--color-target)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                />
              )}
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
