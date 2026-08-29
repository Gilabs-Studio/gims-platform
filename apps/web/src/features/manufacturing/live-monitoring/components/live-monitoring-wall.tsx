"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { PageMotion } from "@/components/motion";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useLiveMonitoring } from "../hooks/use-live-monitoring";
import { LiveMonitoringHeader } from "./live-monitoring-header";
import { LiveMonitoringKPIBar } from "./live-monitoring-kpi-bar";
import { LiveMonitoringLineStatus } from "./live-monitoring-line-status";
import { LiveMonitoringOEEChart } from "./live-monitoring-oee-chart";
import { LiveMonitoringOEEBreakdown } from "./live-monitoring-oee-breakdown";
import { LiveMonitoringAlerts } from "./live-monitoring-alerts";
import { LiveMonitoringProductionTarget } from "./live-monitoring-production-target";

export function LiveMonitoringWall() {
  const t = useTranslations("manufacturingLiveMonitoring");

  const {
    data,
    isLoading,
    isError,
    isFetching,
    refetch,
    selectedLineId,
    setSelectedLineId,
    timeWindow,
    setTimeWindow,
    isFullscreen,
    toggleFullscreen,
    autoRefreshEnabled,
    toggleAutoRefresh,
    lastRefreshedTime,
    refreshNow,
  } = useLiveMonitoring();

  if (isLoading) {
    return (
      <div className="space-y-6 pb-12">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>

        {/* Top 4 KPI Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-start justify-between p-5">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-7 w-36" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-10 w-10 rounded-full" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Sub 3 KPI Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-start justify-between p-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-7 w-28" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-10 w-10 rounded-full" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Middle Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 w-full rounded-lg" />
          <Skeleton className="h-80 w-full rounded-lg" />
        </div>

        {/* 4 Factor Breakdown Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-6 pb-12">
        <LiveMonitoringHeader
          lastUpdated={lastRefreshedTime}
          selectedLineId={selectedLineId}
          onLineChange={setSelectedLineId}
          timeWindow={timeWindow}
          onTimeWindowChange={setTimeWindow}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          autoRefreshEnabled={autoRefreshEnabled}
          onToggleAutoRefresh={toggleAutoRefresh}
          isFetching={isFetching}
          onRefreshNow={refreshNow}
        />
        <Card className="border-destructive/20 bg-destructive/5 text-center my-8">
          <CardContent className="space-y-3 py-8">
            <h3 className="text-base font-bold text-destructive">{t("errorTitle")}</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">{t("errorMessage")}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="cursor-pointer text-xs">
              {t("retry")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PageMotion className="space-y-6 pb-12">
      {/* 1. Header with Page Title, Live Indicator & Action Controls */}
      <LiveMonitoringHeader
        lastUpdated={lastRefreshedTime}
        selectedLineId={selectedLineId}
        onLineChange={setSelectedLineId}
        timeWindow={timeWindow}
        onTimeWindowChange={setTimeWindow}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        autoRefreshEnabled={autoRefreshEnabled}
        onToggleAutoRefresh={toggleAutoRefresh}
        isFetching={isFetching}
        onRefreshNow={refreshNow}
      />

      {/* 2. Top Plant & Machinery KPI Summary Grid */}
      <LiveMonitoringKPIBar summary={data.kpiSummary} />

      {/* 3. Middle Grid: Line Status Table & OEE Real-time Trend Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <div className="lg:col-span-1">
          <LiveMonitoringLineStatus lines={data.lineStatuses} />
        </div>
        <div className="lg:col-span-1">
          <LiveMonitoringOEEChart
            data={data.oeeTrends}
            timeWindow={timeWindow}
            onTimeWindowChange={setTimeWindow}
          />
        </div>
      </div>

      {/* 4. OEE Factor Breakdown: Availability, Performance, Quality, & Top Downtime */}
      <LiveMonitoringOEEBreakdown
        availability={data.availability}
        performance={data.performance}
        quality={data.quality}
        topDowntime={data.topDowntime}
      />

      {/* 5. Bottom Section: Alert Ticker & Production vs Target Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8">
          <LiveMonitoringAlerts alerts={data.alerts} />
        </div>
        <div className="lg:col-span-4">
          <LiveMonitoringProductionTarget metrics={data.productionVsTarget} />
        </div>
      </div>
    </PageMotion>
  );
}

