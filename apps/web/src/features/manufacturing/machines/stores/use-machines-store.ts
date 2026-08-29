import { create } from "zustand";

export type MachineViewMode = "grid" | "table";

interface MachinesUIState {
  selectedLineId: string;
  statusFilter: string; // "all" | MachineStatus
  searchQuery: string;
  viewMode: MachineViewMode;
  incidentModalOpen: boolean;
  incidentTargetMachineId: string | null;

  // Actions
  setSelectedLineId: (lineId: string) => void;
  setStatusFilter: (status: string) => void;
  setSearchQuery: (query: string) => void;
  setViewMode: (mode: MachineViewMode) => void;
  openIncidentModal: (machineId?: string) => void;
  closeIncidentModal: () => void;
  resetFilters: () => void;
}

export const useMachinesStore = create<MachinesUIState>((set) => ({
  selectedLineId: "all",
  statusFilter: "all",
  searchQuery: "",
  viewMode: "table",
  incidentModalOpen: false,
  incidentTargetMachineId: null,

  setSelectedLineId: (selectedLineId) => set({ selectedLineId }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setViewMode: (viewMode) => set({ viewMode }),
  openIncidentModal: (machineId) =>
    set({ incidentModalOpen: true, incidentTargetMachineId: machineId ?? null }),
  closeIncidentModal: () =>
    set({ incidentModalOpen: false, incidentTargetMachineId: null }),
  resetFilters: () =>
    set({ selectedLineId: "all", statusFilter: "all", searchQuery: "" }),
}));
