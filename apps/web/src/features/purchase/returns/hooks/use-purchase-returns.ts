"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { purchaseReturnsService } from "../services/purchase-returns-service";
import { inventoryService } from "@/features/stock/inventory/services/inventory-service";
import type { CreatePurchaseReturnInput, PurchaseReturnListParams, PurchaseReturnStatus } from "../types";

export const purchaseReturnsKeys = {
  all: ["purchase-returns"] as const,
  lists: () => [...purchaseReturnsKeys.all, "list"] as const,
  list: (params?: PurchaseReturnListParams) => [...purchaseReturnsKeys.lists(), params] as const,
  details: () => [...purchaseReturnsKeys.all, "detail"] as const,
  detail: (id: string) => [...purchaseReturnsKeys.details(), id] as const,
  formData: () => [...purchaseReturnsKeys.all, "form-data"] as const,
  warehouseAvailability: (warehouseId?: string) => [...purchaseReturnsKeys.all, "warehouse-availability", warehouseId] as const,
};

export function usePurchaseReturns(params?: PurchaseReturnListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: purchaseReturnsKeys.list(params),
    queryFn: () => purchaseReturnsService.list(params),
    enabled: options?.enabled ?? true,
  });
}

export function usePurchaseReturnDetail(id: string, enabled = true) {
  return useQuery({
    queryKey: purchaseReturnsKeys.detail(id),
    queryFn: () => purchaseReturnsService.getById(id),
    enabled: enabled && !!id,
  });
}

export function usePurchaseReturnFormData() {
  return useQuery({
    queryKey: purchaseReturnsKeys.formData(),
    queryFn: () => purchaseReturnsService.getFormData(),
  });
}

export function usePurchaseReturnFormDataLazy(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: purchaseReturnsKeys.formData(),
    queryFn: () => purchaseReturnsService.getFormData(),
    enabled: options?.enabled ?? false,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useWarehouseInventoryAvailability(
  warehouseId?: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: purchaseReturnsKeys.warehouseAvailability(warehouseId),
    queryFn: () => inventoryService.getTreeProducts(warehouseId ?? "", { page: 1, per_page: 500 }),
    enabled: (options?.enabled ?? true) && !!warehouseId,
    staleTime: 15000,
    refetchInterval: 15000,
  });
}

export function useCreatePurchaseReturn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePurchaseReturnInput) => purchaseReturnsService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchaseReturnsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function useUpdatePurchaseReturnStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: PurchaseReturnStatus }) =>
      purchaseReturnsService.updateStatus(id, { status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: purchaseReturnsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: purchaseReturnsKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function useDeletePurchaseReturn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => purchaseReturnsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchaseReturnsKeys.lists() });
    },
  });
}
