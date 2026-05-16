"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { selfOrderService, SelfOrderApiError } from "../services/self-order-service";
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
    // Never retry on 404/403 — the token is definitively invalid or rolled.
    retry: (failureCount, error) => {
      if (error instanceof SelfOrderApiError && error.status >= 400 && error.status < 500) {
        return false;
      }
      return failureCount < 1;
    },
  });
}

export function useOrderStatus(token: string, orderId: string) {
  return useQuery({
    queryKey: selfOrderKeys.orderStatus(token, orderId),
    queryFn: () => selfOrderService.getOrderStatus(token, orderId),
    select: (r) => r.data,
    enabled: !!token && !!orderId,
    retry: false,
    refetchInterval: (query) => {
      const status = (query.state.data as { status?: string } | undefined)?.status;
      if (status === "PAID" || status === "COMPLETED" || status === "CANCELLED" || status === "VOIDED") {
        return false;
      }
      return 5_000;
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

export function useCancelOrder(token: string, orderId: string) {
  return useMutation({
    mutationFn: () => selfOrderService.cancelOrder(token, orderId),
  });
}
