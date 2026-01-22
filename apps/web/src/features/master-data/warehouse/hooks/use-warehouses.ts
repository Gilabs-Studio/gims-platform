"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

export function useWarehouses(params?: WarehouseListParams) {
  return useQuery({
    queryKey: warehouseKeys.list(params),
    queryFn: () => warehouseService.list(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useWarehouse(id: string) {
  return useQuery({
    queryKey: warehouseKeys.detail(id),
    queryFn: () => warehouseService.getById(id),
    enabled: !!id,
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
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: warehouseKeys.lists() });
      queryClient.setQueriesData({ queryKey: warehouseKeys.lists() }, (old: WarehouseListResponse<Warehouse> | undefined) => {
        if (!old?.data) return old;
        return { ...old, data: old.data.map((item: Warehouse) => item.id === id ? { ...item, ...data } : item) };
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: warehouseKeys.detail(variables.id),
      });
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
