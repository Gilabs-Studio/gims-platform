import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as targetsService from "../services/targets-service";
import type { ListParams } from "../types";

export function useYearlyTargets(params?: ListParams & { year?: number; area_id?: string; status?: string }) {
  return useQuery({
    queryKey: ["yearly-targets", params],
    queryFn: () => targetsService.getYearlyTargets(params),
  });
}

export function useYearlyTarget(id: string) {
  return useQuery({
    queryKey: ["yearly-target", id],
    queryFn: () => targetsService.getYearlyTarget(id),
    enabled: !!id,
  });
}

export function useCreateYearlyTarget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: targetsService.createYearlyTarget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["yearly-targets"] });
    },
  });
}

export function useUpdateYearlyTarget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: targetsService.updateYearlyTarget,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["yearly-targets"] });
      queryClient.invalidateQueries({ queryKey: ["yearly-target", data.data.id] });
    },
  });
}

export function useDeleteYearlyTarget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: targetsService.deleteYearlyTarget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["yearly-targets"] });
    },
  });
}

export function useUpdateTargetStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: targetsService.updateTargetStatus,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["yearly-targets"] });
      queryClient.invalidateQueries({ queryKey: ["yearly-target", data.data.id] });
    },
  });
}
