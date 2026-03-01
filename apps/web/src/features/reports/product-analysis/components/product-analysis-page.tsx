"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { useMonthlyProductSales } from "../hooks/use-monthly-product-sales";
import { useProductPerformanceList } from "../hooks/use-product-performance-list";
import { useCategoryPerformanceList } from "../hooks/use-category-performance-list";
import { ProductAnalysisChart } from "./product-analysis-chart";
import { ProductPerformanceList } from "./product-performance-list";
import { CategoryPerformanceList } from "./category-performance-list";
import { PageMotion } from "@/components/motion";
import { format, startOfYear, subYears } from "date-fns";
import type { DateRange } from "react-day-picker";
import { LayoutList, Layers } from "lucide-react";

export function ProductAnalysisPage() {
  const t = useTranslations("productAnalysisReport");
  const router = useRouter();

  const [analysisMode, setAnalysisMode] = useState<"product" | "category">(
    "product"
  );
  const [filterMode, setFilterMode] = useState<"year" | "range">("year");
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );
  const [selectedMetric, setSelectedMetric] = useState<
    "revenue" | "qty" | "orders"
  >("revenue");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    const lastYear = subYears(now, 1);
    return {
      from: startOfYear(lastYear),
      to: now,
    };
  });

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
      return { chartStartDate: undefined, chartEndDate: undefined };

    return {
      chartStartDate: format(dateRange.from, "yyyy-MM-dd"),
      chartEndDate: dateRange.to
        ? format(dateRange.to, "yyyy-MM-dd")
        : undefined,
    };
  }, [filterMode, selectedYear, dateRange]);

  const { monthlyData, isLoading: isChartLoading } = useMonthlyProductSales(
    chartStartDate,
    chartEndDate
  );

  const listProps = useProductPerformanceList();
  const categoryListProps = useCategoryPerformanceList();

  // Sync chart date filter to both lists
  useMemo(() => {
    if (chartStartDate) {
      listProps.setStartDate(chartStartDate);
      categoryListProps.setStartDate(chartStartDate);
    }
    if (chartEndDate) {
      listProps.setEndDate(chartEndDate);
      categoryListProps.setEndDate(chartEndDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartStartDate, chartEndDate]);

  const handleViewDetail = (productId: string) => {
    router.push(`/reports/product-analysis/${productId}`);
  };

  return (
    <PageMotion className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      {/* Chart Section */}
      <ProductAnalysisChart
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
        totalRevenue={monthlyData?.total_revenue ?? 0}
        totalQty={monthlyData?.total_qty ?? 0}
        totalOrders={monthlyData?.total_orders ?? 0}
      />

      <div className="space-y-4">
        {analysisMode === "product" ? (
          <ProductPerformanceList
            {...listProps}
            onViewDetail={handleViewDetail}
            analysisMode={analysisMode}
            setAnalysisMode={setAnalysisMode}
          />
        ) : (
          <CategoryPerformanceList
            {...categoryListProps}
            analysisMode={analysisMode}
            setAnalysisMode={setAnalysisMode}
          />
        )}
      </div>
    </PageMotion>
  );
}
