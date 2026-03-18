"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { BarChart3 } from "lucide-react";
import type { DateRange } from "react-day-picker";
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
import type { SupplierSpendTrendPoint } from "../types";

interface SupplierSpendTrendChartProps {
  readonly data: SupplierSpendTrendPoint[];
  readonly isLoading?: boolean;
  readonly filterMode: "year" | "range";
  readonly onFilterModeChange: (mode: "year" | "range") => void;
  readonly selectedYear: number;
  readonly onYearChange: (year: number) => void;
  readonly dateRange: DateRange | undefined;
  readonly onDateRangeChange: (range: DateRange | undefined) => void;
  readonly interval: "daily" | "weekly" | "monthly";
  readonly onIntervalChange: (value: "daily" | "weekly" | "monthly") => void;
}

const generateYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let year = currentYear + 1; year >= 2000; year--) {
    years.push(year);
  }
  return years;
};

const chartConfig = {
  total_purchase_value: {
    label: "Purchase Value",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export function SupplierSpendTrendChart({
  data,
  isLoading,
  filterMode,
  onFilterModeChange,
  selectedYear,
  onYearChange,
  dateRange,
  onDateRangeChange,
  interval,
  onIntervalChange,
}: SupplierSpendTrendChartProps) {
  const t = useTranslations("supplierResearchReport.chart");
  const years = useMemo(() => generateYearOptions(), []);

  const chartData = useMemo(
    () =>
      (data ?? []).map((item) => ({
        period: item.period,
        total_purchase_value: item.total_purchase_value,
      })),
    [data]
  );

  const totalPurchaseValue = useMemo(
    () =>
      (data ?? []).reduce(
        (sum, current) => sum + (current.total_purchase_value ?? 0),
        0
      ),
    [data]
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-56" />
          <Skeleton className="mt-2 h-4 w-72" />
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
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              {t("title")}
            </CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-muted p-1 rounded-lg">
              <button
                type="button"
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
                type="button"
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

            <Select
              value={interval}
              onValueChange={(value) =>
                onIntervalChange(value as "daily" | "weekly" | "monthly")
              }
            >
              <SelectTrigger className="h-9 w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">{t("interval.daily")}</SelectItem>
                <SelectItem value="weekly">{t("interval.weekly")}</SelectItem>
                <SelectItem value="monthly">{t("interval.monthly")}</SelectItem>
              </SelectContent>
            </Select>

            {filterMode === "year" ? (
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => onYearChange(Number(value))}
              >
                <SelectTrigger className="h-9 w-[110px]">
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
            ) : (
              <DateRangePicker
                dateRange={dateRange}
                onDateChange={onDateRangeChange}
              />
            )}
          </div>
        </div>
        <div className="pt-3">
          <p className="text-xs text-muted-foreground">{t("total_purchase_value")}</p>
          <p className="text-xl font-semibold">{formatCurrency(totalPurchaseValue)}</p>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex h-[340px] items-center justify-center text-sm text-muted-foreground">
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
                dataKey="total_purchase_value"
                fill="var(--color-total_purchase_value)"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
