"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { selfOrderService } from "../services/self-order-service";
import type {
  CreateCustomerOrderRequest,
  InitiatePaymentRequest,
} from "../types";

export const selfOrderKeys = {
  tableInfo: (token: string) => ["self-order", "table", token] as const,
  orderStatus: (token: string, orderId: string) =>
    ["self-order", "order", token, orderId] as const,
};

export function useTableInfo(token: string) {
  return useQuery({
    queryKey: selfOrderKeys.tableInfo(token),
    queryFn: () => selfOrderService.getTableInfo(token),
    select: (r) => r.data,
    enabled: !!token,
    retry: 1,
  });
}

export function useOrderStatus(token: string, orderId: string) {
  return useQuery({
    queryKey: selfOrderKeys.orderStatus(token, orderId),
    queryFn: () => selfOrderService.getOrderStatus(token, orderId),
    select: (r) => r.data,
    enabled: !!token && !!orderId,
    // Poll every 5 s while order is not terminal
    refetchInterval: (query) => {
      // `select: (r) => r.data` means `query.state.data` is already the
      // `CustomerOrderResponse` (not the wrapped ApiResponse), so read
      // `status` directly.
      const status = (query.state.data as { status?: string } | undefined)?.status;
      if (
        status === "COMPLETED" ||
        status === "CANCELLED" ||
        status === "PAID"
      ) {
        return false;
      }
      return 5000;
    },
  });
}

export function useCreateOrder(token: string) {
  return useMutation({
    mutationFn: (data: CreateCustomerOrderRequest) =>
      selfOrderService.createOrder(token, data),
  });
}

export function useInitiatePayment(token: string, orderId: string) {
  return useMutation({
    mutationFn: (data: InitiatePaymentRequest) =>
      selfOrderService.initiatePayment(token, orderId, data),
  });
}

export function useMarkPayAtCashier(token: string, orderId: string) {
  return useMutation({
    mutationFn: () => selfOrderService.markPayAtCashier(token, orderId),
  });
}
