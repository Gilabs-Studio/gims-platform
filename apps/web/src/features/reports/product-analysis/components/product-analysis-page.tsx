"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import {
  Package,
  FolderTree,
  Percent,
  Tag,
  Box,
  ShoppingCart,
  Search as SearchIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useMonthlyProductSales } from "../hooks/use-monthly-product-sales";
import { useProductPerformanceList } from "../hooks/use-product-performance-list";
import { useCategoryPerformanceList } from "../hooks/use-category-performance-list";
import { useSegmentPerformanceList } from "../hooks/use-segment-performance-list";
import { useTypePerformanceList } from "../hooks/use-type-performance-list";
import { usePackagingPerformanceList } from "../hooks/use-packaging-performance-list";
import { useProcurementTypePerformanceList } from "../hooks/use-procurement-type-performance-list";
import { ProductAnalysisChart } from "./product-analysis-chart";
import { ProductPerformanceList } from "./product-performance-list";
import { CategoryPerformanceList } from "./category-performance-list";
import { DimensionPerformanceList } from "./dimension-performance-list";
import type { NormalizedDimensionItem } from "./dimension-performance-list";
import { PageMotion } from "@/components/motion";
import { format, startOfYear, subYears } from "date-fns";
import type { DateRange } from "react-day-picker";
import type {
  SegmentPerformance,
  TypePerformance,
  PackagingPerformance,
  ProcurementTypePerformance,
} from "../types";

type AnalysisTab =
  | "product"
  | "category"
  | "segment"
  | "type"
  | "packaging"
  | "procurement-type";

const TAB_CONFIG = [
  { key: "product" as const, icon: Package, i18nKey: "toggle.byProduct" },
  { key: "category" as const, icon: FolderTree, i18nKey: "toggle.byCategory" },
  { key: "segment" as const, icon: Percent, i18nKey: "toggle.bySegment" },
  { key: "type" as const, icon: Tag, i18nKey: "toggle.byType" },
  { key: "packaging" as const, icon: Box, i18nKey: "toggle.byPackaging" },
  {
    key: "procurement-type" as const,
    icon: ShoppingCart,
    i18nKey: "toggle.byProcurementType",
  },
] as const;

// Normalise helpers — convert each dimension's typed data to a shared shape
const normalizeSegment = (s: SegmentPerformance): NormalizedDimensionItem => ({
  id: s.segment_id,
  name: s.segment_name,
  product_count: s.product_count,
  total_qty: s.total_qty,
  total_revenue: s.total_revenue,
  total_revenue_formatted: s.total_revenue_formatted,
  total_orders: s.total_orders,
  avg_price: s.avg_price,
  avg_price_formatted: s.avg_price_formatted,
});

const normalizeType = (item: TypePerformance): NormalizedDimensionItem => ({
  id: item.type_id,
  name: item.type_name,
  product_count: item.product_count,
  total_qty: item.total_qty,
  total_revenue: item.total_revenue,
  total_revenue_formatted: item.total_revenue_formatted,
  total_orders: item.total_orders,
  avg_price: item.avg_price,
  avg_price_formatted: item.avg_price_formatted,
});

const normalizePackaging = (
  p: PackagingPerformance
): NormalizedDimensionItem => ({
  id: p.packaging_id,
  name: p.packaging_name,
  product_count: p.product_count,
  total_qty: p.total_qty,
  total_revenue: p.total_revenue,
  total_revenue_formatted: p.total_revenue_formatted,
  total_orders: p.total_orders,
  avg_price: p.avg_price,
  avg_price_formatted: p.avg_price_formatted,
});

const normalizeProcurementType = (
  p: ProcurementTypePerformance
): NormalizedDimensionItem => ({
  id: p.procurement_type_id,
  name: p.procurement_type_name,
  product_count: p.product_count,
  total_qty: p.total_qty,
  total_revenue: p.total_revenue,
  total_revenue_formatted: p.total_revenue_formatted,
  total_orders: p.total_orders,
  avg_price: p.avg_price,
  avg_price_formatted: p.avg_price_formatted,
});

export function ProductAnalysisPage() {
  const t = useTranslations("productAnalysisReport");
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<AnalysisTab>("product");
  const [filterMode, setFilterMode] = useState<"year" | "range">("year");
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );
  const [selectedMetric, setSelectedMetric] = useState<
    "revenue" | "qty" | "orders"
  >("revenue");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return {
      from: startOfYear(subYears(now, 1)),
      to: now,
    };
  });

  const { chartStartDate, chartEndDate } = useMemo(() => {
    if (filterMode === "year") {
      return {
        chartStartDate: format(new Date(selectedYear, 0, 1), "yyyy-MM-dd"),
        chartEndDate: format(new Date(selectedYear, 11, 31), "yyyy-MM-dd"),
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

  const dateFilters = useMemo(
    () => ({ startDate: chartStartDate, endDate: chartEndDate }),
    [chartStartDate, chartEndDate]
  );

  const { monthlyData, isLoading: isChartLoading } = useMonthlyProductSales(
    chartStartDate,
    chartEndDate
  );

  // Each list hook is enabled only for the active tab — true lazy loading
  const listProps = useProductPerformanceList(undefined, dateFilters);

  const categoryListProps = useCategoryPerformanceList(
    undefined,
    dateFilters,
    activeTab === "category"
  );

  const segmentListProps = useSegmentPerformanceList(
    activeTab === "segment",
    undefined,
    dateFilters
  );

  const typeListProps = useTypePerformanceList(
    activeTab === "type",
    undefined,
    dateFilters
  );

  const packagingListProps = usePackagingPerformanceList(
    activeTab === "packaging",
    undefined,
    dateFilters
  );

  const procurementTypeListProps = useProcurementTypePerformanceList(
    activeTab === "procurement-type",
    undefined,
    dateFilters
  );

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

      {/* Analysis Tab Section */}
      <div className="space-y-4">
        {/* Tab Navigation + Search in single row */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center bg-muted p-1 rounded-lg gap-y-1 flex-wrap">
            {TAB_CONFIG.map(({ key, icon: Icon, i18nKey }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t(i18nKey)}
              </button>
            ))}
          </div>

          <div className="ml-auto">
            <div className="relative w-[300px]">
              <SearchIcon
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                className="pl-10 h-9"
                placeholder={
                  activeTab === "category"
                    ? t("categoryTable.searchPlaceholder")
                    : activeTab === "product"
                    ? t("table.searchPlaceholder")
                    : t("dimensionTable.searchPlaceholder")
                }
                value={
                  activeTab === "product"
                    ? listProps.search
                    : activeTab === "category"
                    ? categoryListProps.search
                    : activeTab === "segment"
                    ? segmentListProps.search
                    : activeTab === "type"
                    ? typeListProps.search
                    : activeTab === "packaging"
                    ? packagingListProps.search
                    : procurementTypeListProps.search
                }
                onChange={(e) => {
                  const v = e.target.value;
                  switch (activeTab) {
                    case "product":
                      listProps.setSearch(v);
                      listProps.setPage(1);
                      break;
                    case "category":
                      categoryListProps.setSearch(v);
                      categoryListProps.setPage(1);
                      break;
                    case "segment":
                      segmentListProps.setSearch(v);
                      segmentListProps.setPage(1);
                      break;
                    case "type":
                      typeListProps.setSearch(v);
                      typeListProps.setPage(1);
                      break;
                    case "packaging":
                      packagingListProps.setSearch(v);
                      packagingListProps.setPage(1);
                      break;
                    case "procurement-type":
                      procurementTypeListProps.setSearch(v);
                      procurementTypeListProps.setPage(1);
                      break;
                    default:
                      break;
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "product" && (
          <ProductPerformanceList
            {...listProps}
            onViewDetail={handleViewDetail}
          />
        )}

        {activeTab === "category" && (
          <CategoryPerformanceList {...categoryListProps} />
        )}

        {activeTab === "segment" && (
          <DimensionPerformanceList
            {...segmentListProps}
            items={segmentListProps.segmentList.map(normalizeSegment)}
            dimensionLabel={t("dimensionTable.segment")}
            searchPlaceholder={t("dimensionTable.searchPlaceholder")}
            noDataMessage={t("dimensionTable.noData")}
          />
        )}

        {activeTab === "type" && (
          <DimensionPerformanceList
            {...typeListProps}
            items={typeListProps.typeList.map(normalizeType)}
            dimensionLabel={t("dimensionTable.type")}
            searchPlaceholder={t("dimensionTable.searchPlaceholder")}
            noDataMessage={t("dimensionTable.noData")}
          />
        )}

        {activeTab === "packaging" && (
          <DimensionPerformanceList
            {...packagingListProps}
            items={packagingListProps.packagingList.map(normalizePackaging)}
            dimensionLabel={t("dimensionTable.packaging")}
            searchPlaceholder={t("dimensionTable.searchPlaceholder")}
            noDataMessage={t("dimensionTable.noData")}
          />
        )}

        {activeTab === "procurement-type" && (
          <DimensionPerformanceList
            {...procurementTypeListProps}
            items={procurementTypeListProps.procurementTypeList.map(
              normalizeProcurementType
            )}
            dimensionLabel={t("dimensionTable.procurementType")}
            searchPlaceholder={t("dimensionTable.searchPlaceholder")}
            noDataMessage={t("dimensionTable.noData")}
          />
        )}
      </div>
    </PageMotion>
  );
}
