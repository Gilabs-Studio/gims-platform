"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { purchaseOrdersService } from "../services/purchase-orders-service";
import type {
  CreatePurchaseOrderInput,
  PurchaseOrderListParams,
  UpdatePurchaseOrderInput,
} from "../types";

export const purchaseOrderKeys = {
  all: ["purchase-orders"] as const,
  lists: () => [...purchaseOrderKeys.all, "list"] as const,
  list: (params?: PurchaseOrderListParams) => [...purchaseOrderKeys.lists(), params] as const,
  details: () => [...purchaseOrderKeys.all, "detail"] as const,
  detail: (id: string) => [...purchaseOrderKeys.details(), id] as const,
  auditTrail: (id: string, params?: { page?: number; per_page?: number }) =>
    [...purchaseOrderKeys.all, "audit-trail", id, params] as const,
};

export function usePurchaseOrders(
  params?: PurchaseOrderListParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: purchaseOrderKeys.list(params),
    queryFn: () => purchaseOrdersService.list(params),
    enabled: options?.enabled ?? true,
  });
}

export function usePurchaseOrder(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: purchaseOrderKeys.detail(id),
    queryFn: () => purchaseOrdersService.getById(id),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePurchaseOrderInput) => purchaseOrdersService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.lists() });
    },
  });
}

export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePurchaseOrderInput }) =>
      purchaseOrdersService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.auditTrail(variables.id) });
    },
  });
}

export function useDeletePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => purchaseOrdersService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.lists() });
    },
  });
}

export function useSubmitPurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => purchaseOrdersService.submit(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.auditTrail(id) });
    },
  });
}

export function useApprovePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => purchaseOrdersService.approve(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.auditTrail(id) });
      queryClient.invalidateQueries({ queryKey: ["supplier-invoice-dp", "add"] });
    },
  });
}

export function useRejectPurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation<unknown, unknown, string, { previous?: Array<[readonly unknown[], unknown]> }>({
    mutationFn: (id: string) => purchaseOrdersService.reject(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: purchaseOrderKeys.lists() });

      const previous = queryClient.getQueriesData({ queryKey: purchaseOrderKeys.lists() });
      queryClient.setQueriesData({ queryKey: purchaseOrderKeys.lists() }, (old: { data?: Array<{ id: string; status: string }> } | undefined) => {
        if (!old?.data) return old;

        return {
          ...old,
          data: old.data.map((purchaseOrder) =>
            purchaseOrder.id === id ? { ...purchaseOrder, status: "REJECTED" } : purchaseOrder,
          ),
        };
      });

      return { previous };
    },
    onError: (_error, _id, context) => {
      context?.previous?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.auditTrail(id) });
    },
  });
}

export function usePurchaseOrderAuditTrail(
  id: string,
  params?: { page?: number; per_page?: number },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: purchaseOrderKeys.auditTrail(id, params),
    queryFn: () => purchaseOrdersService.auditTrail(id, params),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}
