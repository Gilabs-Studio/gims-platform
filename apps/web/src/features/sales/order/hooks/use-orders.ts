"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { orderService } from "../services/order-service";
import { getSalesErrorMessage } from "../../utils/error-utils";
import type {
  ListSalesOrdersParams,
  ListSalesOrderItemsParams,
  CreateSalesOrderData,
  UpdateSalesOrderData,
  UpdateSalesOrderStatusData,
  ConvertQuotationToOrderData,
  SalesOrder,
  SalesOrderListResponse,
} from "../types";

// Query keys
export const orderKeys = {
  all: ["sales-orders"] as const,
  lists: () => [...orderKeys.all, "list"] as const,
  list: (params?: ListSalesOrdersParams) =>
    [...orderKeys.lists(), params] as const,
  details: () => [...orderKeys.all, "detail"] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
  items: (id: string, params?: ListSalesOrderItemsParams) =>
    [...orderKeys.detail(id), "items", params] as const,
  auditTrail: (id: string, params?: { page?: number; per_page?: number }) =>
    [...orderKeys.detail(id), "audit-trail", params] as const,
};

// List orders hook with filters
export function useOrders(params?: ListSalesOrdersParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: orderKeys.list(params),
    queryFn: () => orderService.list(params),
    enabled: options?.enabled,
  });
}

// Get order by ID hook
export function useOrder(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => orderService.getById(id),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}

export function useOrderItems(
  id: string,
  params?: ListSalesOrderItemsParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: orderKeys.items(id, params),
    queryFn: () => orderService.getItems(id, params),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
    placeholderData: (previousData) => previousData,
  });
}

export function useOrderAuditTrail(
  id: string,
  params?: { page?: number; per_page?: number },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: orderKeys.auditTrail(id, params),
    queryFn: () => orderService.auditTrail(id, params),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
    placeholderData: (previousData) => previousData,
  });
}


// Create order mutation
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSalesOrderData) => orderService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
    onError: (error) => {
      toast.error(getSalesErrorMessage(error, "Failed to create sales order"));
    },
  });
}

// Update order mutation
export function useUpdateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSalesOrderData }) =>
      orderService.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: orderKeys.lists() });

      queryClient.setQueriesData(
        { queryKey: orderKeys.lists() },
        (old: SalesOrderListResponse | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((order: SalesOrder) =>
              order.id === id ? { ...order, ...data } : order
            ),
          };
        }
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: orderKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      toast.error(getSalesErrorMessage(error, "Failed to update sales order"));
    },
  });
}

// Delete order mutation
export function useDeleteOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => orderService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
    onError: (error) => {
      toast.error(getSalesErrorMessage(error, "Failed to delete sales order"));
    },
  });
}

// Update order status mutation
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation<unknown, unknown, { id: string; data: UpdateSalesOrderStatusData }, { previous?: SalesOrderListResponse }>(
    {
      mutationFn: ({ id, data }: { id: string; data: UpdateSalesOrderStatusData }) =>
        orderService.updateStatus(id, data),
      onMutate: async (variables) => {
        const { id, data } = variables;
        await queryClient.cancelQueries({ queryKey: orderKeys.lists() });

        const previous = queryClient.getQueryData(orderKeys.lists()) as SalesOrderListResponse | undefined;

        queryClient.setQueriesData<SalesOrderListResponse | undefined>({ queryKey: orderKeys.lists() }, (old) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((order: SalesOrder) => (order.id === id ? { ...order, status: data.status } : order)),
          };
        });

        return { previous };
      },
      onError: (_err, _variables, context) => {
        const ctx = context as { previous?: SalesOrderListResponse } | undefined;
        if (ctx?.previous) {
          queryClient.setQueryData(orderKeys.lists(), ctx.previous);
        }
      },
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({ queryKey: orderKeys.detail(variables.id) });
        queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      },
    }
  );
}

// Approve order mutation (requires sales_order.approve permission)
export function useApproveOrder() {
  const queryClient = useQueryClient();
  return useMutation<unknown, unknown, string, { previous?: SalesOrderListResponse }>(
    {
      mutationFn: (id: string) => orderService.approve(id),
      onMutate: async (id: string) => {
        await queryClient.cancelQueries({ queryKey: orderKeys.lists() });
        const previous = queryClient.getQueryData(orderKeys.lists()) as SalesOrderListResponse | undefined;
        queryClient.setQueriesData<SalesOrderListResponse | undefined>({ queryKey: orderKeys.lists() }, (old) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((order: SalesOrder) => (order.id === id ? { ...order, status: "approved" } : order)),
          };
        });
        return { previous };
      },
      onError: (_err, _id, context) => {
        const ctx = context as { previous?: SalesOrderListResponse } | undefined;
        if (ctx?.previous) {
          queryClient.setQueryData(orderKeys.lists(), ctx.previous);
        }
      },
      onSuccess: (_data, id) => {
        queryClient.invalidateQueries({ queryKey: orderKeys.detail(id) });
        queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      },
    }
  );
}

// Convert quotation to order mutation
export function useConvertQuotationToOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ConvertQuotationToOrderData) =>
      orderService.convertQuotationToOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      // Also invalidate quotations since one was converted
      queryClient.invalidateQueries({ queryKey: ["sales-quotations"] });
    },
    onError: (error) => {
      toast.error(getSalesErrorMessage(error, "Failed to convert quotation to order"));
    },
  });
}
