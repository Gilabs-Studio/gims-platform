"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { posKeys } from "@/features/pos/terminal/hooks/use-pos";
import type { POSOrder, POSPayment } from "@/features/pos/terminal/types";
import {
  buildRealtimeNotificationId,
  useNotificationStore,
} from "@/features/notifications/stores/use-notification-store";
import type { Notification } from "@/features/notifications/types";

export type PosWsEvent = {
  type?: string;
  event?: string;
  data?: PosWsPayload;
  payload?: PosWsPayload;
};

export type PosWsPayload = {
  order_id?: string;
  order_number?: string;
  table_label?: string;
  status?: string;
  order?: POSOrder;
  payment?: POSPayment;
};

interface UsePosWsOptions {
  onEvent?: (eventType: string, payload: PosWsPayload | undefined) => void;
  suppressToastEvents?: string[];
}

function buildPosRealtimeNotification(
  eventType: string,
  payload: PosWsEvent["payload"] | undefined,
  outletId: string,
): Notification | null {
  const tableLabel = payload?.table_label ?? "Meja";
  const orderId = payload?.order_id ?? "";
  const createdAt = new Date().toISOString();

  if (eventType === "pos.new_customer_order") {
    return {
      id: buildRealtimeNotificationId(
        `${eventType}:${orderId || tableLabel}:${Date.now()}`,
      ),
      user_id: "realtime",
      title: "Pesanan self-order baru",
      message: `${tableLabel} membuat pesanan baru${payload?.order_number ? ` (#${payload.order_number})` : ""}.`,
      type: "info",
      entity_type: "pos_order",
      entity_id: orderId,
      entity_link: `/pos/fb/live-table?outlet_id=${encodeURIComponent(outletId)}`,
      is_read: false,
      read_at: null,
      created_at: createdAt,
    };
  }

  return null;
}

type POSOrderListCache = { data?: POSOrder[] };
type POSOrderDetailCache = { data?: POSOrder };
type POSPaymentListCache = { data?: POSPayment[] };

function orderFromPayload(payload: PosWsPayload | undefined): POSOrder | null {
  if (!payload?.order) return null;
  return payload.order;
}

function isClearedOrderStatus(status: POSOrder["status"]): boolean {
  return status === "COMPLETED" || status === "VOIDED";
}

function isTerminalPayloadStatus(status: string | undefined): boolean {
  const normalized = status?.trim().toUpperCase();
  return (
    normalized === "COMPLETED" ||
    normalized === "VOIDED" ||
    normalized === "PAID"
  );
}

function removeOrderFromCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  orderId: string,
) {
  queryClient.setQueriesData<POSOrderListCache>(
    { queryKey: [...posKeys.orders(), "list"] },
    (current) => {
      if (!current?.data) return current;
      return {
        ...current,
        data: current.data.filter((item) => item.id !== orderId),
      };
    },
  );
  queryClient.removeQueries({ queryKey: posKeys.order(orderId) });
}

function applyRealtimeOrder(
  queryClient: ReturnType<typeof useQueryClient>,
  eventType: string,
  payload: PosWsPayload | undefined,
) {
  const order = orderFromPayload(payload);
  const payment = payload?.payment;
  const orderId = order?.id ?? payment?.order_id ?? payload?.order_id;
  if (!order && !payment) {
    if (
      orderId &&
      (eventType === "pos.order_deleted" ||
        (eventType === "pos.order_status_changed" &&
          isTerminalPayloadStatus(payload?.status)))
    ) {
      removeOrderFromCaches(queryClient, orderId);
    }
    return;
  }

  if (payment && orderId) {
    queryClient.setQueryData<POSPaymentListCache>(
      posKeys.payments(orderId),
      (current) => {
        const existing = current?.data ?? [];
        const exists = existing.some((item) => item.id === payment.id);
        const data = exists
          ? existing.map((item) => (item.id === payment.id ? payment : item))
          : [payment, ...existing];
        return { ...(current ?? {}), data };
      },
    );
  }

  if (!order) return;

  queryClient.setQueriesData<POSOrderListCache>(
    { queryKey: [...posKeys.orders(), "list"] },
    (current) => {
      if (!current?.data) return current;
      const exists = current.data.some((item) => item.id === order.id);
      const data = isClearedOrderStatus(order.status)
        ? current.data.filter((item) => item.id !== order.id)
        : exists
          ? current.data.map((item) => (item.id === order.id ? order : item))
          : [order, ...current.data];
      return { ...current, data };
    },
  );

  queryClient.setQueryData<POSOrderDetailCache>(
    posKeys.order(order.id),
    (current) => {
      if (isClearedOrderStatus(order.status)) return current;
      return { ...(current ?? {}), data: order };
    },
  );
}

function getWsUrl(outletId?: string): string {
  const apiOrigin = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8087";
  // Convert http(s) -> ws(s)
  const wsOrigin = apiOrigin.replace(/^http/, "ws");
  const id = outletId ?? "";
  return `${wsOrigin}/api/v1/pos/ws?outlet_id=${encodeURIComponent(id)}`;
}

/** Exponential back-off: 1s, 2s, 4s, … capped at 30s */
function nextDelay(attempt: number): number {
  return Math.min(1000 * 2 ** attempt, 30_000);
}

/**
 * Connects to the POS staff WebSocket for an outlet.
 * Realtime events update POS order cache directly and show operator notifications.
 */
export function usePosWs(
  outletId: string | undefined,
  options?: UsePosWsOptions,
) {
  const queryClient = useQueryClient();
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const addRealtimeNotification = useNotificationStore(
    (state) => state.addRealtimeNotification,
  );
  const wsRef = useRef<WebSocket | null>(null);
  const attemptRef = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);
  const lastToastAtRef = useRef<Record<string, number>>({});

  const shouldShowToast = (key: string) => {
    const now = Date.now();
    const last = lastToastAtRef.current[key] ?? 0;
    if (now - last < 2500) {
      return false;
    }
    lastToastAtRef.current[key] = now;
    return true;
  };

  useEffect(() => {
    if (!outletId) return;
    unmountedRef.current = false;

    const id = outletId as string;

    function connect() {
      if (unmountedRef.current) return;
      const url = getWsUrl(id);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        attemptRef.current = 0;
      };

      ws.onmessage = (ev) => {
        let msg: PosWsEvent;
        try {
          msg = JSON.parse(ev.data as string) as PosWsEvent;
        } catch {
          return;
        }

        const eventType = msg.event ?? msg.type;
        if (!eventType) return;
        const payload = msg.data ?? msg.payload;
        optionsRef.current?.onEvent?.(eventType, payload);

        const realtimeNotification = buildPosRealtimeNotification(
          eventType,
          payload,
          id,
        );
        if (realtimeNotification) {
          addRealtimeNotification(realtimeNotification);
        }

        applyRealtimeOrder(queryClient, eventType, payload);

        if (eventType === "pos.new_customer_order") {
          const tableLabel = payload?.table_label ?? "Meja";
          const toastKey = `${eventType}:${payload?.order_id ?? tableLabel}`;
          const suppressed = optionsRef.current?.suppressToastEvents ?? [];
          if (
            !suppressed.includes(eventType) &&
            shouldShowToast(toastKey)
          ) {
            toast.info(`Pesanan baru dari ${tableLabel}!`, {
              duration: 5000,
            });
          }
          return;
        }
      };

      ws.onclose = () => {
        if (unmountedRef.current) return;
        const delay = nextDelay(attemptRef.current);
        attemptRef.current += 1;
        reconnectTimer.current = setTimeout(() => connect(), delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      unmountedRef.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [addRealtimeNotification, outletId, queryClient]);
}
