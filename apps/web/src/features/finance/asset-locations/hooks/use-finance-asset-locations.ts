"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { financeAssetLocationsService } from "../services/finance-asset-locations-service";
import type { AssetLocationInput, ListAssetLocationParams } from "../types";

export const financeAssetLocationKeys = {
  all: ["finance-asset-locations"] as const,
  lists: () => [...financeAssetLocationKeys.all, "list"] as const,
  list: (params?: ListAssetLocationParams) => [...financeAssetLocationKeys.lists(), params] as const,
  details: () => [...financeAssetLocationKeys.all, "detail"] as const,
  detail: (id: string) => [...financeAssetLocationKeys.details(), id] as const,
};

export function useFinanceAssetLocations(params?: ListAssetLocationParams) {
  return useQuery({
    queryKey: financeAssetLocationKeys.list(params),
    queryFn: () => financeAssetLocationsService.list(params),
  });
}

export function useFinanceAssetLocation(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: financeAssetLocationKeys.detail(id),
    queryFn: () => financeAssetLocationsService.getById(id),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}

export function useCreateFinanceAssetLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AssetLocationInput) => financeAssetLocationsService.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeAssetLocationKeys.lists() }),
  });
}

export function useUpdateFinanceAssetLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AssetLocationInput }) =>
      financeAssetLocationsService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: financeAssetLocationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: financeAssetLocationKeys.detail(id) });
    },
  });
}

export function useDeleteFinanceAssetLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeAssetLocationsService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeAssetLocationKeys.lists() }),
  });
}
