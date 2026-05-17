"use client";

import { useEffect, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { attendanceKeys } from "./use-attendance-records";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";

type AttendanceTodayWsEvent = {
  type?: string;
  event?: string;
  data?: {
    employee_id?: string;
    trigger?: string;
    date?: string;
  };
  payload?: {
    employee_id?: string;
    trigger?: string;
    date?: string;
  };
};

const ATTENDANCE_EVENT_TODAY_UPDATED = "hrd.attendance.today_updated";

function getWsUrl(): string {
  const apiOrigin = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8087";
  const wsOrigin = apiOrigin.replace(/^http/, "ws");
  return `${wsOrigin}/api/v1/hrd/attendance/ws/today`;
}

function nextDelay(attempt: number): number {
  return Math.min(1000 * 2 ** attempt, 30_000);
}

export function useAttendanceTodayWebSocket() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const unmountedRef = useRef(false);
  const lastInvalidateRef = useRef(0);

  const wsUrl = useMemo(() => getWsUrl(), []);

  useEffect(() => {
    if (!isAuthenticated) {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      wsRef.current?.close();
      wsRef.current = null;
      return;
    }

    unmountedRef.current = false;

    function connect() {
      if (unmountedRef.current) return;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttemptRef.current = 0;
      };

      ws.onmessage = (ev) => {
        let msg: AttendanceTodayWsEvent;
        try {
          msg = JSON.parse(ev.data as string) as AttendanceTodayWsEvent;
        } catch {
          return;
        }

        const eventType = msg.event ?? msg.type;
        if (eventType !== ATTENDANCE_EVENT_TODAY_UPDATED) return;

        const now = Date.now();
        if (now - lastInvalidateRef.current < 300) {
          return;
        }
        lastInvalidateRef.current = now;

        queryClient.invalidateQueries({ queryKey: attendanceKeys.today() });
      };

      ws.onerror = () => {
        ws.close();
      };

      ws.onclose = () => {
        if (unmountedRef.current) return;
        const delay = nextDelay(reconnectAttemptRef.current);
        reconnectAttemptRef.current += 1;
        reconnectTimerRef.current = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      unmountedRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [isAuthenticated, queryClient, wsUrl]);
}
