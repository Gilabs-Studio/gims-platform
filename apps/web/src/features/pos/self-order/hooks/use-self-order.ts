"use client";

import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { selfOrderService, SelfOrderApiError } from "../services/self-order-service";
import type {
  ApiResponse,
  CustomerOrderResponse,
  CreateCustomerOrderRequest,
  InitiatePaymentRequest,
} from "../types";

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8087";
const WS_ORIGIN = API_ORIGIN.replace(/^http/, "ws");

type SelfOrderWsEvent = {
  event?: string;
  type?: string;
  data?: SelfOrderWsPayload;
  payload?: SelfOrderWsPayload;
};

type SelfOrderWsPayload = {
  order_id?: string;
  id?: string;
  order_number?: string;
  status?: string;
  payment_status?: string;
  cancel_reason?: string;
  table_label?: string;
  order?: {
    id?: string;
    order_id?: string;
    order_number?: string;
    table_label?: string | null;
    status?: string;
    payment_status?: string;
    cancel_reason?: string;
    subtotal?: number;
    tax_amount?: number;
    total_amount?: number;
    items?: CustomerOrderResponse["items"];
    created_at?: string;
  };
};

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
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });
}

export function useSelfOrderRealtime(token: string, orderId: string) {
  const queryClient = useQueryClient();
  const lastRefetchAtRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);

  useEffect(() => {
    if (!token || !orderId) return;

    let closed = false;
    let ws: WebSocket | null = null;

    const refetchTrackedOrder = () => {
      const now = Date.now();
      if (now - lastRefetchAtRef.current < 750) return;
      lastRefetchAtRef.current = now;
      void queryClient.refetchQueries({
        queryKey: selfOrderKeys.orderStatus(token, orderId),
        exact: true,
      });
    };

    const connect = () => {
      if (closed) return;
      ws = new WebSocket(`${WS_ORIGIN}/api/v1/public/pos/tables/${encodeURIComponent(token)}/ws`);

      ws.onopen = () => {
        attemptRef.current = 0;
      };

      ws.onmessage = (event) => {
        let message: SelfOrderWsEvent;
        try {
          message = JSON.parse(event.data as string) as SelfOrderWsEvent;
        } catch {
          return;
        }

        const eventType = message.event ?? message.type;
        if (
          eventType !== "pos.order_status_changed" &&
          eventType !== "pos.payment_confirmed" &&
          eventType !== "pos.new_customer_order"
        ) {
          return;
        }

        const payload = message.data ?? message.payload;
        const payloadOrderId = payload?.order_id ?? payload?.order?.id ?? payload?.id;
        if (payloadOrderId !== orderId) return;

        const cacheKey = selfOrderKeys.orderStatus(token, orderId);
        const payloadOrder = payload?.order;

        if (payloadOrder && (payloadOrder.id === orderId || payloadOrder.order_id === orderId)) {
          queryClient.setQueryData<ApiResponse<CustomerOrderResponse>>(cacheKey, (current) => {
            const currentOrder = current?.data;
            return {
              ...(current ?? { success: true }),
              success: true,
              data: {
                order_id: payloadOrder.order_id ?? payloadOrder.id ?? currentOrder?.order_id ?? orderId,
                order_number: payloadOrder.order_number ?? payload?.order_number ?? currentOrder?.order_number ?? "",
                table_label:
                  payloadOrder.table_label ??
                  payload?.table_label ??
                  currentOrder?.table_label ??
                  "",
                status: payloadOrder.status ?? payload?.status ?? currentOrder?.status ?? "",
                payment_status: payloadOrder.payment_status ?? payload?.payment_status ?? currentOrder?.payment_status,
                cancel_reason: payloadOrder.cancel_reason ?? payload?.cancel_reason ?? currentOrder?.cancel_reason,
                subtotal: payloadOrder.subtotal ?? currentOrder?.subtotal ?? 0,
                tax_amount: payloadOrder.tax_amount ?? currentOrder?.tax_amount ?? 0,
                total_amount: payloadOrder.total_amount ?? currentOrder?.total_amount ?? 0,
                items: payloadOrder.items ?? currentOrder?.items ?? [],
                created_at: payloadOrder.created_at ?? currentOrder?.created_at ?? "",
              },
            };
          });
          return;
        }

        refetchTrackedOrder();
      };

      ws.onclose = () => {
        if (closed) return;
        const delay = Math.min(1000 * 2 ** attemptRef.current, 30_000);
        attemptRef.current += 1;
        reconnectTimerRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      ws?.close();
      ws = null;
    };
  }, [orderId, queryClient, token]);
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
