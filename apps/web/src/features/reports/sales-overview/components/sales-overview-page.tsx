"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { useMonthlySalesOverview } from "../hooks/use-monthly-sales-overview";
import { useSalesPerformanceList } from "../hooks/use-sales-performance-list";
import { SalesOverviewChart } from "./sales-overview-chart";
import { SalesPerformanceList } from "./sales-performance-list";
import { PageMotion } from "@/components/motion";
import { format, startOfYear, subYears } from "date-fns";
import type { DateRange } from "react-day-picker";

export function SalesOverviewPage() {
  const t = useTranslations("salesOverviewReport");
  const router = useRouter();

  // Default date range: last year
  const [filterMode, setFilterMode] = useState<"year" | "range">(
    "year"
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );
  const [selectedMetric, setSelectedMetric] = useState<
    "revenue" | "cash_in" | "orders" | "visits" | "deliveries"
  >("revenue");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    () => {
      const now = new Date();
      const lastYear = subYears(now, 1);
      return {
        from: startOfYear(lastYear),
        to: now,
      };
    }
  );

  // Compute start/end dates for chart based on filter mode
  const { chartStartDate, chartEndDate } = useMemo(() => {
    if (filterMode === "year") {
      const start = new Date(selectedYear, 0, 1);
      const end = new Date(selectedYear, 11, 31);
      return {
        chartStartDate: format(start, "yyyy-MM-dd"),
        chartEndDate: format(end, "yyyy-MM-dd"),
      };
    }

    if (!dateRange?.from)
      return {
        chartStartDate: undefined,
        chartEndDate: undefined,
      };

    return {
      chartStartDate: format(dateRange.from, "yyyy-MM-dd"),
      chartEndDate: dateRange.to
        ? format(dateRange.to, "yyyy-MM-dd")
        : undefined,
    };
  }, [filterMode, selectedYear, dateRange]);

  // Fetch chart data
  const { monthlyData, isLoading: isChartLoading } =
    useMonthlySalesOverview(chartStartDate, chartEndDate);

  // List data hook (lifted state)
  const listProps = useSalesPerformanceList();

  // Sync chart date filter to list
  useMemo(() => {
    if (chartStartDate) listProps.setStartDate(chartStartDate);
    if (chartEndDate) listProps.setEndDate(chartEndDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartStartDate, chartEndDate]);

  const handleViewDetail = (employeeId: string) => {
    router.push(`/reports/sales-overview/${employeeId}`);
  };

  return (
    <PageMotion className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      {/* Chart Section */}
      <SalesOverviewChart
        data={monthlyData?.monthly_data ?? []}
        isLoading={isChartLoading}
        filterMode={filterMode}
        onFilterModeChange={setFilterMode}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        selectedMetric={selectedMetric}
        onMetricChange={setSelectedMetric}
      />

      {/* Performance List */}
      <div className="space-y-4">
        <SalesPerformanceList
          {...listProps}
          onViewDetail={handleViewDetail}
        />
      </div>
    </PageMotion>
  );
}
