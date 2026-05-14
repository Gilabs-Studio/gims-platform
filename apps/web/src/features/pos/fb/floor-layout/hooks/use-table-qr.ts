"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tableQRService } from "../services/table-qr-service";
import type { GenerateTableTokenData } from "../types/table-qr";

export const tableQRKeys = {
  all: ["table-qr-tokens"] as const,
  byFloorPlan: (floorPlanId: string) =>
    [...tableQRKeys.all, "floor-plan", floorPlanId] as const,
};

export function useTableQRTokens(
  floorPlanId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: tableQRKeys.byFloorPlan(floorPlanId),
    queryFn: () => tableQRService.listTokens(floorPlanId),
    enabled: !!floorPlanId && options?.enabled !== false,
    select: (res) => res.data,
  });
}

export function useGenerateTableQR(floorPlanId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      objectId,
      data,
    }: {
      objectId: string;
      data: GenerateTableTokenData;
    }) => tableQRService.generateToken(floorPlanId, objectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tableQRKeys.byFloorPlan(floorPlanId),
      });
    },
  });
}

export function useRevokeTableQR(floorPlanId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (objectId: string) =>
      tableQRService.revokeToken(floorPlanId, objectId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tableQRKeys.byFloorPlan(floorPlanId),
      });
    },
  });
}
