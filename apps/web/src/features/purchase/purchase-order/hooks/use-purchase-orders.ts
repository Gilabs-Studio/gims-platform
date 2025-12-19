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

