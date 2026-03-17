import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { areaMappingService } from "../services/area-mapping-service";
import type { AreaMappingRequest, ListCapturesParams } from "../types";

export const areaMappingKeys = {
  all: ["area-mapping"] as const,
  captures: (params?: ListCapturesParams) =>
    [...areaMappingKeys.all, "captures", params] as const,
  heatmap: (areaId?: string) =>
    [...areaMappingKeys.all, "heatmap", areaId] as const,
  coverage: () => [...areaMappingKeys.all, "coverage"] as const,
  map: (params?: AreaMappingRequest) => [...areaMappingKeys.all, "map", params] as const,
};

export function useAreaMapping(params?: AreaMappingRequest) {
  return useQuery({
    queryKey: areaMappingKeys.map(params),
    queryFn: () => areaMappingService.getAreaMapping(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAreaCaptures(params?: ListCapturesParams) {
  return useQuery({
    queryKey: areaMappingKeys.captures(params),
    queryFn: () => areaMappingService.listCaptures(params),
  });
}

export function useAreaHeatmap(areaId?: string) {
  return useQuery({
    queryKey: areaMappingKeys.heatmap(areaId),
    queryFn: () => areaMappingService.getHeatmap(areaId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAreaCoverage() {
  return useQuery({
    queryKey: areaMappingKeys.coverage(),
    queryFn: () => areaMappingService.getCoverage(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateCapture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: areaMappingService.capture,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: areaMappingKeys.all });
    },
  });
}
