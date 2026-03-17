"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { format, subDays } from "date-fns";
import type { DateRange } from "react-day-picker";
import { PageMotion } from "@/components/motion";
import { useCustomerResearchKpis } from "../hooks/use-customer-research-kpis";
import { useRevenueTrend } from "../hooks/use-revenue-trend";
import { useCustomerResearchList } from "../hooks/use-customer-list";
import { useRevenueByCustomer } from "../hooks/use-revenue-by-customer";
import { usePurchaseFrequency } from "../hooks/use-purchase-frequency";
import type { CustomerResearchTab } from "../types";
import { CustomerKpiCards } from "./customer-kpi-cards";
import { CustomerRevenueTrendChart } from "./customer-revenue-trend-chart";
import { CustomerRankingCharts } from "./customer-ranking-charts";
import { CustomerListTable } from "./customer-list-table";
import { CustomerDetailSheet } from "./customer-detail-sheet";

export function CustomerResearchPage() {
  const t = useTranslations("customerResearchReport");

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return {
      from: subDays(now, 30),
      to: now,
    };
  });

  const [interval, setInterval] = useState<"daily" | "weekly" | "monthly">(
    "daily"
  );
  const [activeTab, setActiveTab] = useState<CustomerResearchTab>("top");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>();
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const startDate = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined;
  const endDate = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined;

  const queryFilters = useMemo(
    () => ({ start_date: startDate, end_date: endDate }),
    [startDate, endDate]
  );

  const { kpis, isLoading: isKpiLoading } = useCustomerResearchKpis(
    queryFilters.start_date,
    queryFilters.end_date
  );

  const { data: trendData, isLoading: isTrendLoading } = useRevenueTrend(
    queryFilters.start_date,
    queryFilters.end_date,
    interval
  );

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
      tab: activeTab,
      search,
      page,
      per_page: perPage,
      sort_by: "revenue",
      order: "desc",
    });

  const handleTabChange = (tab: CustomerResearchTab) => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleViewDetail = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setIsDetailOpen(true);
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
        tab={activeTab}
        onTabChange={handleTabChange}
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

      <CustomerDetailSheet
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        customerId={selectedCustomerId}
        startDate={queryFilters.start_date}
        endDate={queryFilters.end_date}
      />
    </PageMotion>
  );
}
