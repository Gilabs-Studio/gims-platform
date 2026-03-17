"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { format, startOfYear, subYears } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { PageMotion } from "@/components/motion";
import { useSupplierResearchKpis } from "../hooks/use-supplier-research-kpis";
import { useSupplierSpendTrend } from "../hooks/use-supplier-spend-trend";
import { usePurchaseVolumeList } from "../hooks/use-purchase-volume-list";
import { useDeliveryTimeList } from "../hooks/use-delivery-time-list";
import { useSupplierTableList } from "../hooks/use-supplier-table-list";
import { SupplierResearchKpiCards } from "./supplier-research-kpi-cards";
import { SupplierResearchCharts } from "./supplier-research-charts";
import { SupplierResearchTable } from "./supplier-research-table";

export function SupplierResearchPage() {
  const t = useTranslations("supplierResearchReport");
  const router = useRouter();

  const [filterMode, setFilterMode] = useState<"year" | "range">("year");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return {
      from: startOfYear(subYears(now, 1)),
      to: now,
    };
  });
  const [categoryInput, setCategoryInput] = useState("");
  const [minPurchase, setMinPurchase] = useState("");
  const [maxPurchase, setMaxPurchase] = useState("");
  const [tab, setTab] = useState<"top_spenders" | "slow_delivery" | "reliability">("top_spenders");

  const { startDate, endDate } = useMemo(() => {
    if (filterMode === "year") {
      return {
        startDate: format(new Date(selectedYear, 0, 1), "yyyy-MM-dd"),
        endDate: format(new Date(selectedYear, 11, 31), "yyyy-MM-dd"),
      };
    }

    if (!dateRange?.from) {
      return {
        startDate: undefined,
        endDate: undefined,
      };
    }

    return {
      startDate: format(dateRange.from, "yyyy-MM-dd"),
      endDate: dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
    };
  }, [dateRange, filterMode, selectedYear]);

  const filters = useMemo(
    () => ({
      start_date: startDate,
      end_date: endDate,
      category_ids: categoryInput
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
      min_purchase_value: minPurchase ? Number(minPurchase) : undefined,
      max_purchase_value: maxPurchase ? Number(maxPurchase) : undefined,
    }),
    [categoryInput, endDate, maxPurchase, minPurchase, startDate]
  );

  const { kpis, isLoading: isKpisLoading } = useSupplierResearchKpis(filters);

  const { trend, isLoading: isTrendLoading } = useSupplierSpendTrend(
    filters,
    "monthly"
  );

  const purchaseVolumeList = usePurchaseVolumeList(filters, 10);
  const deliveryTimeList = useDeliveryTimeList(filters, 10);
  const supplierTableList = useSupplierTableList(tab, filters);

  const handleViewDetail = (supplierId: string) => {
    router.push(`/reports/supplier-research/${supplierId}`);
  };

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 12 }, (_, index) => currentYear - index);
  }, []);

  return (
    <PageMotion className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-6">
        <div className="xl:col-span-2 flex gap-1 rounded-lg bg-muted p-1">
          <button
            type="button"
            onClick={() => setFilterMode("year")}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all cursor-pointer ${
              filterMode === "year"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("filters.year")}
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("range")}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all cursor-pointer ${
              filterMode === "range"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("filters.customRange")}
          </button>
        </div>

        <div className="xl:col-span-2">
          {filterMode === "year" ? (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor="supplier-year-filter">
                {t("filters.year")}
              </label>
              <select
                id="supplier-year-filter"
                className="h-10 w-full cursor-pointer rounded-md border bg-background px-3 text-sm"
                value={selectedYear}
                onChange={(event) => setSelectedYear(Number(event.target.value))}
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <DateRangePicker dateRange={dateRange} onDateChange={setDateRange} />
          )}
        </div>

        <div className="space-y-1 xl:col-span-2">
          <label className="text-xs text-muted-foreground" htmlFor="supplier-category-filter">
            {t("filters.category")}
          </label>
          <Input
            id="supplier-category-filter"
            value={categoryInput}
            onChange={(event) => setCategoryInput(event.target.value)}
            placeholder={t("filters.category")}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground" htmlFor="supplier-min-purchase-filter">
            {t("filters.minPurchase")}
          </label>
          <Input
            id="supplier-min-purchase-filter"
            type="number"
            value={minPurchase}
            onChange={(event) => setMinPurchase(event.target.value)}
            placeholder={t("filters.minPurchase")}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground" htmlFor="supplier-max-purchase-filter">
            {t("filters.maxPurchase")}
          </label>
          <Input
            id="supplier-max-purchase-filter"
            type="number"
            value={maxPurchase}
            onChange={(event) => setMaxPurchase(event.target.value)}
            placeholder={t("filters.maxPurchase")}
          />
        </div>
      </div>

      <SupplierResearchKpiCards kpis={kpis} isLoading={isKpisLoading} />

      <SupplierResearchCharts
        purchaseVolume={purchaseVolumeList.rows}
        isPurchaseVolumeLoading={purchaseVolumeList.isLoading}
        deliveryTime={deliveryTimeList.rows}
        isDeliveryTimeLoading={deliveryTimeList.isLoading}
        spendTrend={trend?.timeline ?? []}
        isSpendTrendLoading={isTrendLoading}
      />

      <SupplierResearchTable
        tab={tab}
        onTabChange={setTab}
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
