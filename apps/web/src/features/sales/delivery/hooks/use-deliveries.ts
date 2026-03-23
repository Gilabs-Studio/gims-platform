"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { deliveryService } from "../services/delivery-service";
import type {
  ListDeliveryOrdersParams,
  CreateDeliveryOrderData,
  UpdateDeliveryOrderData,
  UpdateDeliveryOrderStatusData,
  ShipDeliveryOrderData,
  DeliverDeliveryOrderData,
  BatchSelectionRequest,
  DeliveryOrder,
  DeliveryOrderListResponse,
} from "../types";

// Query keys
export const deliveryKeys = {
  all: ["delivery-orders"] as const,
  lists: () => [...deliveryKeys.all, "list"] as const,
  list: (params?: ListDeliveryOrdersParams) =>
    [...deliveryKeys.lists(), params] as const,
  details: () => [...deliveryKeys.all, "detail"] as const,
  detail: (id: string) => [...deliveryKeys.details(), id] as const,
  auditTrail: (id: string, params?: { page?: number; per_page?: number }) =>
    [...deliveryKeys.detail(id), "audit-trail", params] as const,
};

// List delivery orders hook with filters
export function useDeliveryOrders(params?: ListDeliveryOrdersParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: deliveryKeys.list(params),
    queryFn: () => deliveryService.list(params),
    enabled: options?.enabled ?? true,
  });
}

// Get delivery order by ID hook
export function useDeliveryOrder(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: deliveryKeys.detail(id),
    queryFn: () => deliveryService.getById(id),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}

export function useDeliveryOrderAuditTrail(
  id: string,
  params?: { page?: number; per_page?: number },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: deliveryKeys.auditTrail(id, params),
    queryFn: () => deliveryService.auditTrail(id, params),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
    placeholderData: (previousData) => previousData,
  });
}

// Create delivery order mutation
export function useCreateDeliveryOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDeliveryOrderData) =>
      deliveryService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
    },
  });
}

// Update delivery order mutation
export function useUpdateDeliveryOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateDeliveryOrderData;
    }) => deliveryService.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: deliveryKeys.lists() });

      queryClient.setQueriesData(
        { queryKey: deliveryKeys.lists() },
        (old: DeliveryOrderListResponse | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((order: DeliveryOrder) =>
              order.id === id ? { ...order, ...data } : order
            ),
          };
        }
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: deliveryKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.lists() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.lists() });
    },
  });
}

// Delete delivery order mutation
export function useDeleteDeliveryOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deliveryService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.lists() });
    },
  });
}

// Update delivery order status mutation
export function useUpdateDeliveryOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateDeliveryOrderStatusData;
    }) => deliveryService.updateStatus(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: deliveryKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.lists() });
    },
  });
}

// Approve delivery order mutation (requires delivery_order.approve permission)
export function useApproveDeliveryOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deliveryService.approve(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.lists() });
    },
  });
}

// Ship delivery order mutation
export function useShipDeliveryOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: ShipDeliveryOrderData;
    }) => deliveryService.ship(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: deliveryKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
    },
  });
}

// Deliver delivery order mutation
export function useDeliverDeliveryOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: DeliverDeliveryOrderData;
    }) => deliveryService.deliver(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: deliveryKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
    },
  });
}

// Select batches mutation
export function useSelectBatches() {
  return useMutation({
    mutationFn: (data: BatchSelectionRequest) =>
      deliveryService.selectBatches(data),
  });
}
