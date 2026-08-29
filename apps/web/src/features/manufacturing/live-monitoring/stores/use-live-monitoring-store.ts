import { create } from "zustand";
import type { TimeWindowOption } from "../types/live-monitoring.types";

interface LiveMonitoringUIState {
  selectedLineId: string;
  timeWindow: TimeWindowOption;
  isFullscreen: boolean;
  autoRefreshEnabled: boolean;
  lastRefreshedTime: string;

  setSelectedLineId: (lineId: string) => void;
  setTimeWindow: (timeWindow: TimeWindowOption) => void;
  setIsFullscreen: (isFullscreen: boolean) => void;
  toggleFullscreen: () => void;
  setAutoRefreshEnabled: (enabled: boolean) => void;
  toggleAutoRefresh: () => void;
  setLastRefreshedTime: (time: string) => void;
}

export const useLiveMonitoringStore = create<LiveMonitoringUIState>((set) => ({
  selectedLineId: "all",
  timeWindow: "30m",
  isFullscreen: false,
  autoRefreshEnabled: true,
  lastRefreshedTime: new Date().toLocaleTimeString(),

  setSelectedLineId: (selectedLineId) => set({ selectedLineId }),
  setTimeWindow: (timeWindow) => set({ timeWindow }),
  setIsFullscreen: (isFullscreen) => set({ isFullscreen }),
  toggleFullscreen: () =>
    set((state) => {
      const nextState = !state.isFullscreen;
      if (typeof window !== "undefined" && typeof document !== "undefined") {
        if (nextState && !document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else if (!nextState && document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      }
      return { isFullscreen: nextState };
    }),
  setAutoRefreshEnabled: (autoRefreshEnabled) => set({ autoRefreshEnabled }),
  toggleAutoRefresh: () => set((state) => ({ autoRefreshEnabled: !state.autoRefreshEnabled })),
  setLastRefreshedTime: (lastRefreshedTime) => set({ lastRefreshedTime }),
}));
