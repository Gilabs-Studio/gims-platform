"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchMachines, fetchMachinesSummary } from "../services/machine.service";
import { useMachinesStore } from "../stores/use-machines-store";

export const machineKeys = {
  all: ["manufacturing", "machines"] as const,
  list: (filters: { lineId: string; status: string; search: string }) =>
    [...machineKeys.all, "list", filters] as const,
  summary: () => [...machineKeys.all, "summary"] as const,
  detail: (id: string) => [...machineKeys.all, "detail", id] as const,
};

export function useMachineList() {
  const {
    selectedLineId,
    statusFilter,
    searchQuery,
    viewMode,
    setSelectedLineId,
    setStatusFilter,
    setSearchQuery,
    setViewMode,
    openIncidentModal,
    resetFilters,
  } = useMachinesStore();

  const filters = {
    lineId: selectedLineId,
    status: statusFilter,
    search: searchQuery,
  };

  const {
    data: machines = [],
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: machineKeys.list(filters),
    queryFn: () => fetchMachines(filters),
    refetchInterval: 15000,
  });

  const { data: summary } = useQuery({
    queryKey: machineKeys.summary(),
    queryFn: () => fetchMachinesSummary(),
    refetchInterval: 15000,
  });

  return {
    machines,
    summary: summary ?? {
      totalMachines: machines.length,
      runningCount: machines.filter((m) => m.status === "running").length,
      idleCount: machines.filter((m) => m.status === "idle").length,
      downtimeCount: machines.filter((m) => m.status === "downtime").length,
      maintenanceCount: machines.filter((m) => m.status === "maintenance").length,
      averageHealthIndex: 85,
      averageOeeScore: 82.5,
    },
    isLoading,
    isError,
    isFetching,
    refetch,
    selectedLineId,
    statusFilter,
    searchQuery,
    viewMode,
    setSelectedLineId,
    setStatusFilter,
    setSearchQuery,
    setViewMode,
    openIncidentModal,
    resetFilters,
  };
}
