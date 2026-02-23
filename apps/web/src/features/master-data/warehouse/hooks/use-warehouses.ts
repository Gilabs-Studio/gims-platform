"use client";

import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { warehouseService } from "../services/warehouse-service";
import type {
  CreateWarehouseData,
  UpdateWarehouseData,
  WarehouseListParams,
  Warehouse,
  WarehouseListResponse,
} from "../types";

// Query keys
export const warehouseKeys = {
  all: ["warehouses"] as const,
  lists: () => [...warehouseKeys.all, "list"] as const,
  list: (params?: WarehouseListParams) =>
    [...warehouseKeys.lists(), params] as const,
  details: () => [...warehouseKeys.all, "detail"] as const,
  detail: (id: string) => [...warehouseKeys.details(), id] as const,
};

// ============================================
// Main Warehouse Hooks
// ============================================

export function useWarehouses(
  params?: WarehouseListParams,
  options?: Omit<UseQueryOptions<WarehouseListResponse<Warehouse>, Error, WarehouseListResponse<Warehouse>>, "queryKey" | "queryFn">
) {
  return useQuery<WarehouseListResponse<Warehouse>, Error>({
    queryKey: warehouseKeys.list(params),
    queryFn: () => warehouseService.list(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

type WarehouseDetailResult = Awaited<ReturnType<typeof warehouseService.getById>>;

export function useWarehouse(
  id: string,
  options?: Omit<UseQueryOptions<WarehouseDetailResult, Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: warehouseKeys.detail(id),
    queryFn: () => warehouseService.getById(id),
    enabled: !!id,
    staleTime: 0,
    ...options,
  });
}

export function useCreateWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWarehouseData) => warehouseService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() });
    },
  });
}

export function useUpdateWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWarehouseData }) =>
      warehouseService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: warehouseKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() });
    },
  });
}

export function useDeleteWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => warehouseService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() });
    },
  });
}
