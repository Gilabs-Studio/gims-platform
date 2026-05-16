"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { posKeys } from "@/features/pos/terminal/hooks/use-pos";
import { buildRealtimeNotificationId, useNotificationStore } from "@/features/notifications/stores/use-notification-store";
import type { Notification } from "@/features/notifications/types";

export type PosWsEvent = {
  type?: string;
  event?: string;
  payload?: {
    order_id?: string;
    order_number?: string;
    table_label?: string;
    status?: string;
  };
};

interface UsePosWsOptions {
  onEvent?: (eventType: string, payload: PosWsEvent["payload"] | undefined) => void;
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
      id: buildRealtimeNotificationId(`${eventType}:${orderId || tableLabel}:${Date.now()}`),
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

  if (eventType === "pos.payment_confirmed") {
    return {
      id: buildRealtimeNotificationId(`${eventType}:${orderId || tableLabel}:${Date.now()}`),
      user_id: "realtime",
      title: "Pembayaran terkonfirmasi",
      message: `Pembayaran untuk ${tableLabel} telah diterima${payload?.order_number ? ` (#${payload.order_number})` : ""}.`,
      type: "info",
      entity_type: "pos_payment",
      entity_id: orderId,
      entity_link: `/pos/fb/live-table?outlet_id=${encodeURIComponent(outletId)}`,
      is_read: false,
      read_at: null,
      created_at: createdAt,
    };
  }

  if (eventType === "pos.order_status_changed") {
    return {
      id: buildRealtimeNotificationId(`${eventType}:${orderId || tableLabel}:${Date.now()}`),
      user_id: "realtime",
      title: "Status order berubah",
      message: `${tableLabel} berubah ke status ${payload?.status ?? "UNKNOWN"}${payload?.order_number ? ` (#${payload.order_number})` : ""}.`,
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

function getWsUrl(outletId?: string): string {
  const apiOrigin =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8087";
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
 * Realtime events invalidate POS order queries and show operator notifications.
 */
export function usePosWs(outletId: string | undefined, options?: UsePosWsOptions) {
  const queryClient = useQueryClient();
  const onEvent = options?.onEvent;
  const suppressToastEvents = options?.suppressToastEvents ?? [];
  const addRealtimeNotification = useNotificationStore((state) => state.addRealtimeNotification);
  const wsRef = useRef<WebSocket | null>(null);
  const attemptRef = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

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

        const eventType = msg.type ?? msg.event;
        if (!eventType) return;
        onEvent?.(eventType, msg.payload);

        const realtimeNotification = buildPosRealtimeNotification(eventType, msg.payload, id);
        if (realtimeNotification) {
          addRealtimeNotification(realtimeNotification);
        }

        if (eventType === "pos.new_customer_order") {
          const tableLabel = msg.payload?.table_label ?? "Meja";
          if (!suppressToastEvents.includes(eventType)) {
            toast.info(`Pesanan baru dari ${tableLabel}!`, {
              duration: 8000,
              position: "top-center",
            });
          }
          queryClient.invalidateQueries({ queryKey: posKeys.orders() });
          return;
        }

        if (eventType === "pos.payment_confirmed") {
          const tableLabel = msg.payload?.table_label ?? "Meja";
          if (!suppressToastEvents.includes(eventType)) {
            toast.success(`Pembayaran terkonfirmasi untuk ${tableLabel}.`, {
              duration: 8000,
              position: "top-center",
            });
          }
          queryClient.invalidateQueries({ queryKey: posKeys.orders() });
          return;
        }

        if (eventType === "pos.order_status_changed") {
          if ((msg.payload?.status ?? "") === "PAID") {
            const tableLabel = msg.payload?.table_label ?? "Meja";
            if (!suppressToastEvents.includes(eventType)) {
              toast.success(`Status pembayaran ${tableLabel} sudah PAID.`, {
                duration: 6000,
                position: "top-center",
              });
            }
          }
          queryClient.invalidateQueries({ queryKey: posKeys.orders() });
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
  }, [addRealtimeNotification, onEvent, outletId, queryClient, suppressToastEvents]);
}
