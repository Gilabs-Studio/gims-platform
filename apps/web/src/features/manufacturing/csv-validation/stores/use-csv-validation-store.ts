import { create } from "zustand";
import type { AuditTrailLogItem } from "../types/csv-validation.types";

interface CsvValidationState {
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  selectedModule: string;
  setSelectedModule: (module: string) => void;

  selectedDataType: string;
  setSelectedDataType: (dataType: string) => void;

  selectedAction: string;
  setSelectedAction: (action: string) => void;

  selectedUser: string;
  setSelectedUser: (user: string) => void;

  dateRangeText: string;
  setDateRangeText: (range: string) => void;

  page: number;
  setPage: (page: number) => void;

  selectedLog: AuditTrailLogItem | null;
  setSelectedLog: (log: AuditTrailLogItem | null) => void;

  resetFilters: () => void;
}

export const useCsvValidationStore = create<CsvValidationState>((set) => ({
  searchQuery: "",
  setSearchQuery: (query) => set({ searchQuery: query, page: 1 }),

  selectedModule: "all",
  setSelectedModule: (module) => set({ selectedModule: module, page: 1 }),

  selectedDataType: "all",
  setSelectedDataType: (dataType) => set({ selectedDataType: dataType, page: 1 }),

  selectedAction: "all",
  setSelectedAction: (action) => set({ selectedAction: action, page: 1 }),

  selectedUser: "all",
  setSelectedUser: (user) => set({ selectedUser: user, page: 1 }),

  dateRangeText: "16 May 2026 - 16 May 2026",
  setDateRangeText: (range) => set({ dateRangeText: range, page: 1 }),

  page: 1,
  setPage: (page) => set({ page }),

  selectedLog: null,
  setSelectedLog: (log) => set({ selectedLog: log }),

  resetFilters: () =>
    set({
      searchQuery: "",
      selectedModule: "all",
      selectedDataType: "all",
      selectedAction: "all",
      selectedUser: "all",
      dateRangeText: "16 May 2026 - 16 May 2026",
      page: 1,
    }),
}));
