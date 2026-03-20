"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { format, startOfYear, subYears } from "date-fns";
import type { DateRange } from "react-day-picker";
import { PageMotion } from "@/components/motion";
import { useCustomerResearchKpis } from "../hooks/use-customer-research-kpis";
import { useRevenueTrend } from "../hooks/use-revenue-trend";
import { useCustomerResearchList } from "../hooks/use-customer-list";
import { useRevenueByCustomer } from "../hooks/use-revenue-by-customer";
import { usePurchaseFrequency } from "../hooks/use-purchase-frequency";
import { CustomerKpiCards } from "./customer-kpi-cards";
import { CustomerRevenueTrendChart } from "./customer-revenue-trend-chart";
import { CustomerRankingCharts } from "./customer-ranking-charts";
import { CustomerListTable } from "./customer-list-table";

export function CustomerResearchPage() {
  const t = useTranslations("customerResearchReport");
  const router = useRouter();

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return {
      from: startOfYear(subYears(now, 1)),
      to: now,
    };
  });

  const [filterMode, setFilterMode] = useState<"year" | "range">("year");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const [interval, setInterval] = useState<"daily" | "weekly" | "monthly">(
    "daily"
  );
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const { startDate, endDate } = useMemo(() => {
    if (filterMode === "year") {
      return {
        startDate: format(new Date(selectedYear, 0, 1), "yyyy-MM-dd"),
        endDate: format(new Date(selectedYear, 11, 31), "yyyy-MM-dd"),
      };
    }

    return {
      startDate: dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
      endDate: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
    };
  }, [filterMode, selectedYear, dateRange]);

  const queryFilters = useMemo(
    () => ({
      start_date: startDate,
      end_date: endDate,
      date_mode: filterMode,
      year: filterMode === "year" ? selectedYear : undefined,
    }),
    [startDate, endDate, filterMode, selectedYear]
  );

  const { kpis, isLoading: isKpiLoading } = useCustomerResearchKpis(queryFilters);

  const { data: trendData, isLoading: isTrendLoading } = useRevenueTrend({
    ...queryFilters,
    interval,
  });

  const { data: revenueByCustomer, isLoading: isRevenueByCustomerLoading } =
    useRevenueByCustomer({
      ...queryFilters,
      page: 1,
      per_page: 10,
      order: "desc",
    });

  const { data: purchaseFrequency, isLoading: isPurchaseFrequencyLoading } =
    usePurchaseFrequency({
      ...queryFilters,
      page: 1,
      per_page: 10,
      order: "desc",
    });

  const { customers, pagination, isLoading: isCustomerLoading } =
    useCustomerResearchList({
      ...queryFilters,
      search,
      page,
      per_page: perPage,
      sort_by: "revenue",
      order: "desc",
    });

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleViewDetail = (customerId: string) => {
    router.push(`/reports/customer-research/${customerId}`);
  };

  return (
    <PageMotion className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <CustomerKpiCards data={kpis} isLoading={isKpiLoading} />

      <CustomerRevenueTrendChart
        data={trendData ?? []}
        isLoading={isTrendLoading}
        filterMode={filterMode}
        onFilterModeChange={setFilterMode}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        interval={interval}
        onIntervalChange={setInterval}
      />

      <CustomerRankingCharts
        revenueData={revenueByCustomer}
        isRevenueLoading={isRevenueByCustomerLoading}
        frequencyData={purchaseFrequency}
        isFrequencyLoading={isPurchaseFrequencyLoading}
      />

      <CustomerListTable
        search={search}
        onSearchChange={handleSearchChange}
        items={customers ?? []}
        isLoading={isCustomerLoading}
        page={page}
        setPage={setPage}
        perPage={perPage}
        setPerPage={setPerPage}
        pagination={pagination}
        onViewDetail={handleViewDetail}
      />
    </PageMotion>
  );
}
