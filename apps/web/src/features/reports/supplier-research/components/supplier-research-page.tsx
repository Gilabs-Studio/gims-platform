"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { format, startOfYear, subYears } from "date-fns";
import type { DateRange } from "react-day-picker";
import { PageMotion } from "@/components/motion";
import { useSupplierResearchKpis } from "../hooks/use-supplier-research-kpis";
import { useSupplierSpendTrend } from "../hooks/use-supplier-spend-trend";
import { usePurchaseVolumeList } from "../hooks/use-purchase-volume-list";
import { useDeliveryTimeList } from "../hooks/use-delivery-time-list";
import { useSupplierTableList } from "../hooks/use-supplier-table-list";
import { SupplierResearchKpiCards } from "./supplier-research-kpi-cards";
import { SupplierResearchCharts } from "./supplier-research-charts";
import { SupplierSpendTrendChart } from "./supplier-spend-trend-chart";
import { SupplierResearchTable } from "./supplier-research-table";

export function SupplierResearchPage() {
  const t = useTranslations("supplierResearchReport");
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
    "monthly"
  );

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

  const filters = useMemo(
    () => ({
      start_date: startDate,
      end_date: endDate,
      date_mode: filterMode,
      year: filterMode === "year" ? selectedYear : undefined,
    }),
    [endDate, startDate, filterMode, selectedYear]
  );

  const { kpis, isLoading: isKpisLoading } = useSupplierResearchKpis(filters);

  const { trend, isLoading: isTrendLoading } = useSupplierSpendTrend(
    filters,
    interval
  );

  const purchaseVolumeList = usePurchaseVolumeList(filters, 10);
  const deliveryTimeList = useDeliveryTimeList(filters, 10);
  const supplierTableList = useSupplierTableList(filters);

  const handleViewDetail = (supplierId: string) => {
    router.push(`/reports/supplier-research/${supplierId}`);
  };

  return (
    <PageMotion className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <SupplierResearchKpiCards kpis={kpis} isLoading={isKpisLoading} />

      <SupplierSpendTrendChart
        data={trend?.timeline ?? []}
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

      <SupplierResearchCharts
        purchaseVolume={purchaseVolumeList.rows}
        isPurchaseVolumeLoading={purchaseVolumeList.isLoading}
        deliveryTime={deliveryTimeList.rows}
        isDeliveryTimeLoading={deliveryTimeList.isLoading}
      />

      <SupplierResearchTable
        rows={supplierTableList.rows}
        isLoading={supplierTableList.isLoading}
        search={supplierTableList.search}
        setSearch={supplierTableList.setSearch}
        setPage={supplierTableList.setPage}
        setPerPage={supplierTableList.setPerPage}
        pagination={supplierTableList.pagination}
        onViewDetail={handleViewDetail}
      />
    </PageMotion>
  );
}
