"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLiveMonitoringStore } from "../stores/use-live-monitoring-store";
import { fetchLiveMonitoringData } from "../services/live-monitoring.service";

export const liveMonitoringKeys = {
  all: ["manufacturing-live-monitoring"] as const,
  detail: (lineId: string, timeWindow: string) => [...liveMonitoringKeys.all, lineId, timeWindow] as const,
};

export function useLiveMonitoring() {
  const {
    selectedLineId,
    setSelectedLineId,
    timeWindow,
    setTimeWindow,
    isFullscreen,
    toggleFullscreen,
    autoRefreshEnabled,
    toggleAutoRefresh,
    lastRefreshedTime,
    setLastRefreshedTime,
  } = useLiveMonitoringStore();

  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: liveMonitoringKeys.detail(selectedLineId, timeWindow),
    queryFn: async () => {
      const result = await fetchLiveMonitoringData(selectedLineId);
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      setLastRefreshedTime(`${hours}:${minutes}:${seconds}`);
      return result;
    },
    refetchInterval: autoRefreshEnabled ? 15000 : false,
    refetchIntervalInBackground: false,
  });

  // Fullscreen event listener with proper cleanup
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isDocFullscreen = Boolean(document.fullscreenElement);
      useLiveMonitoringStore.setState({ isFullscreen: isDocFullscreen });
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  return {
    data: data ?? null,
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
    refreshNow: () => refetch(),
  };
}

