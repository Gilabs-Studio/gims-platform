import { create } from "zustand";
import type { DowntimeCategoryType, TimeWindowFilter } from "../types/downtime.types";

export type DowntimeViewTab = "overview" | "pareto" | "categories" | "shift-trends" | "logs";

interface DowntimeStoreState {
  selectedLineId: string;
  timeWindow: TimeWindowFilter;
  categoryTypeFilter: "all" | DowntimeCategoryType;
  categoryFilter: string;
  severityFilter: string;
  searchQuery: string;
  paretoMetric: "duration" | "frequency";
  activeTab: DowntimeViewTab;
  logModalOpen: boolean;
  selectedIncidentId: string | null;

  // Actions
  setSelectedLineId: (lineId: string) => void;
  setTimeWindow: (timeWindow: TimeWindowFilter) => void;
  setCategoryTypeFilter: (categoryType: "all" | DowntimeCategoryType) => void;
  setCategoryFilter: (category: string) => void;
  setSeverityFilter: (severity: string) => void;
  setSearchQuery: (query: string) => void;
  setParetoMetric: (metric: "duration" | "frequency") => void;
  setActiveTab: (tab: DowntimeViewTab) => void;
  setLogModalOpen: (open: boolean) => void;
  setSelectedIncidentId: (id: string | null) => void;
  resetFilters: () => void;
}

export const useDowntimeStore = create<DowntimeStoreState>((set) => ({
  selectedLineId: "all",
  timeWindow: "week",
  categoryTypeFilter: "all",
  categoryFilter: "all",
  severityFilter: "all",
  searchQuery: "",
  paretoMetric: "duration",
  activeTab: "overview",
  logModalOpen: false,
  selectedIncidentId: null,

  setSelectedLineId: (selectedLineId) => set({ selectedLineId }),
  setTimeWindow: (timeWindow) => set({ timeWindow }),
  setCategoryTypeFilter: (categoryTypeFilter) => set({ categoryTypeFilter }),
  setCategoryFilter: (categoryFilter) => set({ categoryFilter }),
  setSeverityFilter: (severityFilter) => set({ severityFilter }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setParetoMetric: (paretoMetric) => set({ paretoMetric }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setLogModalOpen: (logModalOpen) => set({ logModalOpen }),
  setSelectedIncidentId: (selectedIncidentId) => set({ selectedIncidentId }),
  resetFilters: () =>
    set({
      selectedLineId: "all",
      timeWindow: "week",
      categoryTypeFilter: "all",
      categoryFilter: "all",
      severityFilter: "all",
      searchQuery: "",
    }),
}));
