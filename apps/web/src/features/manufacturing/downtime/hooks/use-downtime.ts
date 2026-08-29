import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { downtimeService } from "../services/downtime.service";
import type {
  CreateDowntimeInput,
  DowntimeFilterParams,
  UpdateDowntimeInput,
} from "../types/downtime.types";

export const downtimeKeys = {
  all: ["manufacturing", "downtime"] as const,
  lines: () => [...downtimeKeys.all, "lines"] as const,
  kpis: (params?: DowntimeFilterParams) => [...downtimeKeys.all, "kpis", params] as const,
  pareto: (params?: DowntimeFilterParams, metric?: string) =>
    [...downtimeKeys.all, "pareto", params, metric] as const,
  categories: (params?: DowntimeFilterParams) =>
    [...downtimeKeys.all, "categories", params] as const,
  shiftTrend: (params?: DowntimeFilterParams) =>
    [...downtimeKeys.all, "shift-trend", params] as const,
  lineImpacts: () => [...downtimeKeys.all, "line-impacts"] as const,
  incidents: (params?: DowntimeFilterParams) =>
    [...downtimeKeys.all, "incidents", params] as const,
  detail: (id: string) => [...downtimeKeys.all, "detail", id] as const,
};

export function useProductionLines() {
  return useQuery({
    queryKey: downtimeKeys.lines(),
    queryFn: () => downtimeService.getProductionLines(),
    staleTime: 1000 * 60 * 10,
  });
}

export function useDowntimeKpis(params?: DowntimeFilterParams) {
  return useQuery({
    queryKey: downtimeKeys.kpis(params),
    queryFn: () => downtimeService.getKpis(params),
    staleTime: 1000 * 30,
  });
}

export function useDowntimePareto(
  params?: DowntimeFilterParams,
  metric: "duration" | "frequency" = "duration"
) {
  return useQuery({
    queryKey: downtimeKeys.pareto(params, metric),
    queryFn: () => downtimeService.getParetoData(params, metric),
    staleTime: 1000 * 30,
  });
}

export function useDowntimeCategories(params?: DowntimeFilterParams) {
  return useQuery({
    queryKey: downtimeKeys.categories(params),
    queryFn: () => downtimeService.getCategoryBreakdown(params),
    staleTime: 1000 * 30,
  });
}

export function useDowntimeShiftTrend(params?: DowntimeFilterParams) {
  return useQuery({
    queryKey: downtimeKeys.shiftTrend(params),
    queryFn: () => downtimeService.getShiftTrends(params),
    staleTime: 1000 * 30,
  });
}

export function useDowntimeLineImpacts() {
  return useQuery({
    queryKey: downtimeKeys.lineImpacts(),
    queryFn: () => downtimeService.getLineImpacts(),
    staleTime: 1000 * 30,
  });
}

export function useDowntimeIncidents(params?: DowntimeFilterParams) {
  return useQuery({
    queryKey: downtimeKeys.incidents(params),
    queryFn: () => downtimeService.getIncidents(params),
    staleTime: 1000 * 30,
  });
}

export function useDowntimeDetail(id: string | null) {
  return useQuery({
    queryKey: id ? downtimeKeys.detail(id) : ["manufacturing", "downtime", "empty"],
    queryFn: () => (id ? downtimeService.getIncidentById(id) : null),
    enabled: Boolean(id),
  });
}

export function useCreateDowntime() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDowntimeInput) => downtimeService.createIncident(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: downtimeKeys.all });
    },
  });
}

export function useUpdateDowntime() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateDowntimeInput) => downtimeService.updateIncident(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: downtimeKeys.all });
      queryClient.invalidateQueries({ queryKey: downtimeKeys.detail(data.id) });
    },
  });
}

export function useDeleteDowntime() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => downtimeService.deleteIncident(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: downtimeKeys.all });
    },
  });
}
