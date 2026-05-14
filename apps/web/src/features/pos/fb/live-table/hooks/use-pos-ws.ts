"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { posKeys } from "@/features/pos/terminal/hooks/use-pos";

export type PosWsEvent = {
  event: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
};

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
 * On `pos.new_customer_order` → invalidates live-table queries + shows a toast.
 */
export function usePosWs(outletId: string | undefined) {
  const queryClient = useQueryClient();
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
        if (msg.event === "pos.new_customer_order") {
          const tableLabel: string =
            (msg.payload as { table_label?: string })?.table_label ?? "Meja";
          toast.info(`Pesanan baru dari ${tableLabel}!`, {
            duration: 8000,
            position: "top-center",
          });
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
  }, [outletId, queryClient]);
}
