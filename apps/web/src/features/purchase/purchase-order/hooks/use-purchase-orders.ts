"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { purchaseOrderService } from "../services/purchase-order-service";
import type {
  CreatePurchaseOrderFormData,
  UpdatePurchaseOrderFormData,
} from "../schemas/purchase-order.schema";

export function usePurchaseOrders(params?: {
  page?: number;
  limit?: number;
  search?: string;
  searchBy?: string;
  status?: "DRAFT" | "APPROVED" | "REVISED" | "CLOSED";
  sort_by?: string;
  sort_order?: "asc" | "desc";
  start_date?: string;
  end_date?: string;
}) {
  return useQuery({
    queryKey: ["purchase-orders", params],
    queryFn: () => purchaseOrderService.list(params),
    retry: (failureCount, error) => {
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 404) {
          return false;
        }
      }
      return failureCount < 1;
    },
  });
}

export function usePurchaseOrder(id: number | null) {
  return useQuery({
    queryKey: ["purchase-orders", id],
    queryFn: () => purchaseOrderService.getById(id!),
    enabled: !!id,
  });
}

export function usePurchaseOrderAddData() {
  return useQuery({
    queryKey: ["purchase-orders", "add-data"],
    queryFn: () => purchaseOrderService.getAddData(),
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePurchaseOrderFormData) =>
      purchaseOrderService.create(data),
    onMutate: async (newOrder) => {
      await queryClient.cancelQueries({ queryKey: ["purchase-orders"] });
      const previousOrders = queryClient.getQueriesData({ queryKey: ["purchase-orders"] });
      queryClient.setQueriesData({ queryKey: ["purchase-orders"] }, (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: {
            ...old.data,
            data: [
              { id: Date.now(), ...newOrder, status: "DRAFT", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
              ...(old.data.data || []),
            ],
            meta: {
              ...old.data.meta,
              pagination: { ...old.data.meta?.pagination, total: (old.data.meta?.pagination?.total || 0) + 1 },
            },
          },
        };
      });
      return { previousOrders };
    },
    onError: (err, newOrder, context) => {
      if (context?.previousOrders) {
        context.previousOrders.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
  });
}

export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: UpdatePurchaseOrderFormData;
    }) => purchaseOrderService.update(id, data),
    onMutate: async ({ id, data: updateData }) => {
      await queryClient.cancelQueries({ queryKey: ["purchase-orders"] });
      await queryClient.cancelQueries({ queryKey: ["purchase-orders", id] });
      const previousOrders = queryClient.getQueriesData({ queryKey: ["purchase-orders"] });
      const previousOrder = queryClient.getQueryData(["purchase-orders", id]);
      queryClient.setQueriesData({ queryKey: ["purchase-orders"] }, (old: any) => {
        if (!old?.data?.data) return old;
        return {
          ...old,
          data: {
            ...old.data,
            data: old.data.data.map((item: any) =>
              item.id === id ? { ...item, ...updateData, updated_at: new Date().toISOString() } : item
            ),
          },
        };
      });
      queryClient.setQueryData(["purchase-orders", id], (old: any) => {
        if (!old?.data) return old;
        return { ...old, data: { ...old.data, ...updateData, updated_at: new Date().toISOString() } };
      });
      return { previousOrders, previousOrder };
    },
    onError: (err, variables, context) => {
      if (context?.previousOrders) {
        context.previousOrders.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousOrder) {
        queryClient.setQueryData(["purchase-orders", variables.id], context.previousOrder);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({
        queryKey: ["purchase-orders", variables.id],
      });
    },
  });
}

export function useDeletePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => purchaseOrderService.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["purchase-orders"] });
      const previousOrders = queryClient.getQueriesData({ queryKey: ["purchase-orders"] });
      queryClient.setQueriesData({ queryKey: ["purchase-orders"] }, (old: any) => {
        if (!old?.data?.data) return old;
        return {
          ...old,
          data: {
            ...old.data,
            data: old.data.data.filter((item: any) => item.id !== id),
            meta: {
              ...old.data.meta,
              pagination: { ...old.data.meta?.pagination, total: Math.max(0, (old.data.meta?.pagination?.total || 0) - 1) },
            },
          },
        };
      });
      return { previousOrders };
    },
    onError: (err, id, context) => {
      if (context?.previousOrders) {
        context.previousOrders.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
  });
}

export function useConfirmPurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => purchaseOrderService.confirm(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({
        queryKey: ["purchase-orders", id],
      });
    },
  });
}

