import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qualityAndonService } from "../services/quality-andon.service";
import type {
  AcknowledgeAlarmInput,
  AndonFilterParams,
  EscalateToQAInput,
  LogQualityIncidentInput,
} from "../types/quality-andon.types";

export const qualityAndonKeys = {
  all: ["manufacturing", "quality-andon"] as const,
  dashboard: () => [...qualityAndonKeys.all, "dashboard"] as const,
  lists: () => [...qualityAndonKeys.all, "list"] as const,
  list: (params?: AndonFilterParams) => [...qualityAndonKeys.lists(), params] as const,
  details: () => [...qualityAndonKeys.all, "detail"] as const,
  detail: (id: string) => [...qualityAndonKeys.details(), id] as const,
};

export function useAndonDashboard() {
  return useQuery({
    queryKey: qualityAndonKeys.dashboard(),
    queryFn: () => qualityAndonService.getAndonDashboardData(),
    staleTime: 1000 * 20,
    refetchInterval: 1000 * 15, // Live auto-poll every 15s
  });
}

export function useAndonParameters(params?: AndonFilterParams) {
  return useQuery({
    queryKey: qualityAndonKeys.list(params),
    queryFn: () => qualityAndonService.getAndonParameters(params),
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 20,
    refetchInterval: 1000 * 15,
  });
}

export function useAndonDetail(id: string | null) {
  return useQuery({
    queryKey: id ? qualityAndonKeys.detail(id) : ["manufacturing", "quality-andon", "empty"],
    queryFn: () => (id ? qualityAndonService.getParameterById(id) : null),
    enabled: Boolean(id),
  });
}

export function useAcknowledgeAlarm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AcknowledgeAlarmInput) => qualityAndonService.acknowledgeAlarm(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: qualityAndonKeys.all });
      queryClient.invalidateQueries({ queryKey: qualityAndonKeys.detail(data.id) });
    },
  });
}

export function useEscalateToQA() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: EscalateToQAInput) => qualityAndonService.escalateToQA(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: qualityAndonKeys.all });
      queryClient.invalidateQueries({ queryKey: qualityAndonKeys.detail(data.id) });
    },
  });
}

export function useLogQualityIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LogQualityIncidentInput) => qualityAndonService.logQualityIncident(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: qualityAndonKeys.all });
      queryClient.invalidateQueries({ queryKey: qualityAndonKeys.detail(data.id) });
    },
  });
}
