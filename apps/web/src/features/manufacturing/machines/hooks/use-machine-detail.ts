"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchMachineById, updateMachineStatus } from "../services/machine.service";
import { machineKeys } from "./use-machine-list";
import type { MachineStatus } from "../types/machine.types";
import { toast } from "sonner";

export function useMachineDetail(machineId: string) {
  const queryClient = useQueryClient();

  const {
    data: machine,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: machineKeys.detail(machineId),
    queryFn: () => fetchMachineById(machineId),
    enabled: Boolean(machineId),
    refetchInterval: 10000,
  });

  const statusMutation = useMutation({
    mutationFn: ({ status, reason }: { status: MachineStatus; reason?: string }) =>
      updateMachineStatus({ machineId, status, reason }),
    onSuccess: (updated) => {
      if (updated) {
        queryClient.invalidateQueries({ queryKey: machineKeys.detail(machineId) });
        queryClient.invalidateQueries({ queryKey: machineKeys.all });
        toast.success(`Machine status updated to ${updated.status.toUpperCase()}`);
      }
    },
    onError: () => {
      toast.error("Failed to update machine status");
    },
  });

  return {
    machine: machine ?? null,
    isLoading,
    isError,
    isFetching,
    refetch,
    updateStatus: (status: MachineStatus, reason?: string) =>
      statusMutation.mutate({ status, reason }),
    isUpdatingStatus: statusMutation.isPending,
  };
}
