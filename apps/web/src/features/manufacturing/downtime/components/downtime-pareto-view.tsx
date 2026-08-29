"use client";

import React, { useMemo } from "react";
import { useTranslations } from "next-intl";
import { PageMotion } from "@/components/motion/page-motion";
import {
  useDowntimeCategories,
  useDowntimeIncidents,
  useDowntimeKpis,
  useDowntimePareto,
  useDowntimeShiftTrend,
  useProductionLines,
} from "../hooks/use-downtime";
import { useDowntimeStore } from "../stores/use-downtime-store";
import { DowntimeOverviewChart } from "./downtime-overview-chart";
import { DowntimeCategoryGrid } from "./downtime-category-grid";
import { DowntimeShiftTrendChart } from "./downtime-shift-trend-chart";
import { DowntimeHistoryList } from "./downtime-history-list";
import { DowntimeLogModal } from "./downtime-log-modal";
import { DowntimeDetailModal } from "./downtime-detail-modal";

export function DowntimeParetoView() {
  const t = useTranslations("manufacturingDowntime");

  // Zustand UI store state
  const {
    selectedLineId,
    setSelectedLineId,
    categoryTypeFilter,
    setCategoryTypeFilter,
    timeWindow,
    setTimeWindow,
    searchQuery,
    setSearchQuery,
    paretoMetric,
    setParetoMetric,
    logModalOpen,
    setLogModalOpen,
    selectedIncidentId,
    setSelectedIncidentId,
  } = useDowntimeStore();

  const filterParams = useMemo(
    () => ({
      lineId: selectedLineId,
      categoryType: categoryTypeFilter,
      timeWindow,
      search: searchQuery,
    }),
    [selectedLineId, categoryTypeFilter, timeWindow, searchQuery]
  );

  // TanStack Query Data Fetching
  const { data: lines = [] } = useProductionLines();
  const { data: kpiSummary, isLoading: isKpiLoading } = useDowntimeKpis(filterParams);
  const { data: paretoData = [], isLoading: isParetoLoading } = useDowntimePareto(
    filterParams,
    paretoMetric
  );
  const { data: categoriesData = [], isLoading: isCategoriesLoading } =
    useDowntimeCategories(filterParams);
  const { data: shiftTrendData = [], isLoading: isShiftLoading } =
    useDowntimeShiftTrend(filterParams);
  const { data: incidents = [], isLoading: isIncidentsLoading } =
    useDowntimeIncidents(filterParams);

  return (
    <PageMotion className="space-y-8">
      {/* Page Header (Consistent with sales-overview-page) */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Main Analytics & Metric Overview Chart */}
      <DowntimeOverviewChart
        data={paretoData}
        summary={kpiSummary}
        productionLines={lines}
        selectedLineId={selectedLineId}
        onLineChange={setSelectedLineId}
        categoryType={categoryTypeFilter}
        onCategoryTypeChange={setCategoryTypeFilter}
        timeWindow={timeWindow}
        onTimeWindowChange={setTimeWindow}
        metric={paretoMetric}
        onMetricChange={setParetoMetric}
        onOpenLogModal={() => setLogModalOpen(true)}
        isLoading={isParetoLoading || isKpiLoading}
      />

      {/* Visual Analytics Grid: Loss Classification & Shift Trends */}
      <div className="space-y-6">
        <DowntimeCategoryGrid
          data={categoriesData}
          isLoading={isCategoriesLoading}
        />

        <DowntimeShiftTrendChart
          data={shiftTrendData}
          isLoading={isShiftLoading}
        />
      </div>

      {/* Incident History Audit List (Matched with sales-performance-list) */}
      <DowntimeHistoryList
        incidents={incidents}
        search={searchQuery}
        onSearchChange={setSearchQuery}
        onSelectIncident={(id) => setSelectedIncidentId(id)}
        isLoading={isIncidentsLoading}
      />

      {/* Log Downtime Modal Dialog */}
      <DowntimeLogModal
        open={logModalOpen}
        onOpenChange={setLogModalOpen}
        productionLines={lines}
      />

      {/* Incident Root Cause & CAPA Detail Modal */}
      <DowntimeDetailModal
        incidentId={selectedIncidentId}
        onClose={() => setSelectedIncidentId(null)}
      />
    </PageMotion>
  );
}
