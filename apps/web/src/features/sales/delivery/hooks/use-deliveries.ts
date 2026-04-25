"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { deliveryService } from "../services/delivery-service";
import { orderKeys } from "../../order/hooks/use-orders";
import { getSalesErrorMessage } from "../../utils/error-utils";
import type { DeliveryOrderSummary, SalesOrderListResponse } from "../../order/types";
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

function upsertDeliverySummaryAtFront(
  deliveries: DeliveryOrderSummary[],
  next: DeliveryOrderSummary,
): DeliveryOrderSummary[] {
  const withoutCurrent = deliveries.filter((entry) => entry.id !== next.id);
  return [next, ...withoutCurrent];
}

function applyDeliveryToSalesOrderLists(
  queryClient: ReturnType<typeof useQueryClient>,
  delivery: DeliveryOrder | undefined,
) {
  const salesOrderId = delivery?.sales_order_id ?? delivery?.sales_order?.id;
  if (!delivery || !salesOrderId) return;

  const queries = queryClient.getQueriesData({ queryKey: orderKeys.lists() });
  queries.forEach(([key, old]) => {
    if (!old || typeof old !== "object" || !("data" in (old as Record<string, unknown>))) return;
    queryClient.setQueryData(key as readonly unknown[], (prev: unknown) => {
      if (!prev || typeof prev !== "object" || !("data" in (prev as Record<string, unknown>))) return prev;
      const list = prev as SalesOrderListResponse;
      return {
        ...list,
        data: list.data.map((order) => {
          if (order.id !== salesOrderId) return order;
          const existing = Array.isArray(order.delivery_orders) ? order.delivery_orders : [];
          const found = existing.find((entry) => entry.id === delivery.id);
          const nextEntry: DeliveryOrderSummary = {
            id: delivery.id,
            code: delivery.code ?? found?.code ?? "",
            status: delivery.status ?? found?.status ?? "draft",
            delivery_date: delivery.delivery_date ?? found?.delivery_date ?? "",
            is_partial_delivery: delivery.is_partial_delivery ?? found?.is_partial_delivery ?? false,
          };

          return {
            ...order,
            delivery_orders: upsertDeliverySummaryAtFront(existing, nextEntry),
          };
        }),
      } as SalesOrderListResponse;
    });
  });
}

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
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      applyDeliveryToSalesOrderLists(queryClient, res?.data);
    },
    onError: (error) => {
      toast.error(getSalesErrorMessage(error, "Failed to create delivery order"));
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
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.lists() });
      toast.error(getSalesErrorMessage(error, "Failed to update delivery order"));
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
    onError: (error) => {
      toast.error(getSalesErrorMessage(error, "Failed to delete delivery order"));
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
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({
        queryKey: deliveryKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.lists() });
      applyDeliveryToSalesOrderLists(queryClient, res?.data);
    },
    onError: (error) => {
      toast.error(getSalesErrorMessage(error, "Failed to update delivery order status"));
    },
  });
}

// Approve delivery order mutation (requires delivery_order.approve permission)
export function useApproveDeliveryOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deliveryService.approve(id),
    onSuccess: (res, id) => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.lists() });
      applyDeliveryToSalesOrderLists(queryClient, res?.data);
    },
    onError: (error) => {
      toast.error(getSalesErrorMessage(error, "Failed to approve delivery order"));
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
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({
        queryKey: deliveryKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      applyDeliveryToSalesOrderLists(queryClient, res?.data);
    },
    onError: (error) => {
      toast.error(getSalesErrorMessage(error, "Failed to ship delivery order"));
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
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({
        queryKey: deliveryKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      applyDeliveryToSalesOrderLists(queryClient, res?.data);
    },
    onError: (error) => {
      toast.error(getSalesErrorMessage(error, "Failed to deliver delivery order"));
    },
  });
}

// Select batches mutation
export function useSelectBatches() {
  return useMutation({
    mutationFn: (data: BatchSelectionRequest) =>
      deliveryService.selectBatches(data),
    onError: (error) => {
      toast.error(getSalesErrorMessage(error, "Failed to select batches"));
    },
  });
}
