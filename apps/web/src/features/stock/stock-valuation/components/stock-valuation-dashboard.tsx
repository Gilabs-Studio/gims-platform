"use client";

import { Button } from "@/components/ui/button";
import { RefreshCcw, Package } from "lucide-react";
import { useTranslations } from "next-intl";
import { StatsCards } from "./stats-cards";
import { MovementBreakdownCard } from "./movement-breakdown-card";
import { TimelineChartCard } from "./timeline-chart-card";
import { RecentMovementsCard } from "./recent-movements-card";
import { useStockValuationStats } from "../hooks/use-stock-valuations";
import { useStockValuationList } from "../hooks/use-stock-valuation-list";
import { useHasPermission } from "../hooks/use-has-permission";

export function StockValuationDashboard() {
  const t = useTranslations("stockValuations");
  const hasViewPermission = useHasPermission("VIEW");

  // Fetch stats data
  const { data: statsData, isLoading: isLoadingStats, refetch: refetchStats } = useStockValuationStats();

  // Fetch recent movements
  const { valuations, isLoading: isLoadingValuations } = useStockValuationList();

  const isLoading = isLoadingStats || isLoadingValuations;
  const stats = statsData?.data;

  // Refresh all data
  const handleRefresh = () => {
    refetchStats();
  };

  // Check permissions
  if (!hasViewPermission) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <Package className="h-12 w-12 text-muted-foreground" />
        <div className="text-center">
          <h2 className="text-lg font-semibold">{t("errors.noPermission")}</h2>
          <p className="text-sm text-muted-foreground">{t("errors.noPermissionDescription")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
          className="cursor-pointer"
        >
          <RefreshCcw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          {t("actions.refresh")}
        </Button>
      </div>

      {/* Stats Cards - 4 columns on large screens */}
      <StatsCards stats={stats} isLoading={isLoadingStats} />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Timeline Chart - Takes 2 columns */}
        <div className="lg:col-span-2">
          <TimelineChartCard isLoading={isLoadingStats} />
        </div>

        {/* Movement Breakdown - Takes 1 column */}
        <div className="lg:col-span-1">
          <MovementBreakdownCard stats={stats} isLoading={isLoadingStats} />
        </div>
      </div>

      {/* Recent Movements Table */}
      <RecentMovementsCard
        movements={valuations}
        isLoading={isLoadingValuations}
        onViewAll={() => {
          console.log("View all movements");
        }}
      />
    </div>
  );
}
