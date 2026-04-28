"use client";

import { useEffect, useMemo, useState } from "react";
import type { WidgetType, POSOutletItem, POSSummaryData } from "../types";
import { useDashboardWidgetOverview } from "./use-dashboard";

export function usePosOutletOverview(widgetType: WidgetType, enabled: boolean) {
  const [selectedOutletId, setSelectedOutletId] = useState<string>("all");

  const overviewQuery = useDashboardWidgetOverview(widgetType, {
    enabled,
  });

  const selectedOutletQuery = useDashboardWidgetOverview(widgetType, {
    enabled: enabled && selectedOutletId !== "all",
    outletId: selectedOutletId === "all" ? undefined : selectedOutletId,
  });

  const overviewSummary = overviewQuery.data?.pos_summary;
  const selectedSummary = selectedOutletQuery.data?.pos_summary;

  const visibleOutlets = useMemo<POSOutletItem[]>(() => overviewSummary?.outlets ?? [], [overviewSummary?.outlets]);

  useEffect(() => {
    if (selectedOutletId === "all") {
      return;
    }

    const hasSelectedOutlet = visibleOutlets.some((outlet) => outlet.outlet_id === selectedOutletId);
    if (!hasSelectedOutlet) {
      setSelectedOutletId("all");
    }
  }, [selectedOutletId, visibleOutlets]);

  const filteredOutlets = useMemo(() => {
    if (selectedOutletId === "all") {
      return visibleOutlets;
    }

    return visibleOutlets.filter((outlet) => outlet.outlet_id === selectedOutletId);
  }, [visibleOutlets, selectedOutletId]);

  const posSummary: POSSummaryData | undefined =
    selectedOutletId === "all" ? overviewSummary : selectedSummary ?? overviewSummary;

  const isLoading = overviewQuery.isLoading || (enabled && selectedOutletId !== "all" && selectedOutletQuery.isLoading);
  const isError = overviewQuery.isError || selectedOutletQuery.isError;

  const refetch = async () => {
    await overviewQuery.refetch();
    if (selectedOutletId !== "all") {
      await selectedOutletQuery.refetch();
    }
  };

  return {
    posSummary,
    visibleOutlets,
    filteredOutlets,
    selectedOutletId,
    setSelectedOutletId,
    hasOutletFilter: visibleOutlets.length > 1,
    isLoading,
    isError,
    refetch,
  };
}