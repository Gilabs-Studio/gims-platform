"use client";

import { useMemo } from "react";
import { useFloorLayouts, useFloorLayout } from "@/features/pos/fb/floor-layout/hooks/use-floor-layouts";
import { usePOSOrderList } from "@/features/pos/terminal/hooks/use-pos";
import type { LayoutObject } from "@/features/pos/fb/floor-layout/types";
import type { LiveTableInfo, LiveTableStatus } from "../types";

const WARN_THRESHOLD_SEC = 30 * 60; // 30 minutes

const WAITING_PAYMENT_STATUSES = ["DRAFT", "IN_PROGRESS", "READY", "WAITING_PAYMENT"] as const;

function deriveStatus(order: { status: string } | null, durationSec: number): LiveTableStatus {
  if (!order) return "AVAILABLE";
  if (WAITING_PAYMENT_STATUSES.includes(order.status as (typeof WAITING_PAYMENT_STATUSES)[number])) {
    return "WAITING_PAYMENT";
  }
  // PAID → table is occupied (customer waiting for food)
  if (order.status === "PAID") {
    return durationSec > WARN_THRESHOLD_SEC ? "WARN_LONG" : "SEATED";
  }
  // PARTIAL_SERVED → some items delivered, others still pending
  if (order.status === "PARTIAL_SERVED") return "PARTIAL_SERVED";
  // SERVED → all food delivered, customer still at table
  if (order.status === "SERVED") return "SERVED";
  // Any other status (DRAFT, IN_PROGRESS, READY, etc.) → still free for walk-ins
  return "AVAILABLE";
}

function buildTableSeatCountMap(objects: LayoutObject[]): Map<string, number> {
  const seatCountMap = new Map<string, number>();

  for (const obj of objects) {
    if (obj.type !== "chair" || !obj.parentId) continue;
    seatCountMap.set(obj.parentId, (seatCountMap.get(obj.parentId) ?? 0) + 1);
  }

  return seatCountMap;
}

interface UseLiveTableOptions {
  outletId?: string;
  floorPlanId?: string;
  outletName?: string;
  /** Current timestamp (ms) — pass from component ticker to keep durations live */
  now?: number;
}

export function useLiveTableData({ outletId, floorPlanId, outletName, now: nowProp }: UseLiveTableOptions) {
  // Load published floor plans for selected outlet
  const {
    data: plansData,
    isLoading: plansLoading,
  } = useFloorLayouts(
    { status: "published", outlet_id: outletId, per_page: 10 },
    { enabled: !!outletId }
  );

  // Pick plan by floorPlanId first; fallback to first published plan for the outlet.
  const plan = useMemo(() => {
    const allPlans = plansData?.data ?? [];
    if (floorPlanId) {
      const byId = allPlans.find((p) => p.id === floorPlanId);
      if (byId) return byId;
    }
    const outletPlans = allPlans.filter((p) => p.outlet_id === outletId);
    if (outletName) {
      const outletNameLower = outletName.toLowerCase();
      const byOutletName = outletPlans.find((p) =>
        p.name.toLowerCase().includes(outletNameLower)
      );
      if (byOutletName) return byOutletName;
    }
    return outletPlans[0] ?? null;
  }, [plansData?.data, outletId, floorPlanId, outletName]);

  // Load plan detail (with layout_data) if we have an id
  const {
    data: planDetail,
    isLoading: planDetailLoading,
  } = useFloorLayout(plan?.id ?? "", { enabled: !!plan?.id });

  // Parse table objects from layout_data JSON
  const layoutObjects = useMemo<LayoutObject[]>(() => {
    const rawData = planDetail?.data?.layout_data;
    if (!rawData) return [];
    try {
      const parsed: LayoutObject[] = typeof rawData === "string"
        ? JSON.parse(rawData)
        : rawData;
      return parsed;
    } catch {
      return [];
    }
  }, [planDetail?.data?.layout_data]);

  const tableObjects = useMemo<LayoutObject[]>(() => {
    return layoutObjects.filter((obj) => obj.type === "table");
  }, [layoutObjects]);

  const tableSeatCountMap = useMemo(() => buildTableSeatCountMap(layoutObjects), [layoutObjects]);

  // Load orders once; real-time updates are pushed via WebSocket invalidation.
  const {
    data: ordersData,
    isLoading: ordersLoading,
  } = usePOSOrderList(
    { outlet_id: outletId, per_page: 100 }
  );

  const orders = useMemo(() => ordersData?.data ?? [], [ordersData?.data]);

  // Build maps from table_id and table_label → most recent active order.
  const tableOrderMaps = useMemo(() => {
    const byTableID = new Map<string, (typeof orders)[number]>();
    const byTableLabel = new Map<string, (typeof orders)[number]>();
    for (const order of orders) {
      // Show occupied tables for payment-waiting and post-payment lifecycle statuses.
      const isWaitingCustomerPayment =
        WAITING_PAYMENT_STATUSES.includes(order.status as (typeof WAITING_PAYMENT_STATUSES)[number]);

      const isPostPaymentOccupied = ["PAID", "PARTIAL_SERVED", "SERVED"].includes(order.status);
      if (!isWaitingCustomerPayment && !isPostPaymentOccupied) continue;

      if (order.table_id) {
        const existingByID = byTableID.get(order.table_id);
        if (!existingByID || order.created_at > existingByID.created_at) {
          byTableID.set(order.table_id, order);
        }
      }

      if (order.table_label) {
        const existingByLabel = byTableLabel.get(order.table_label);
        if (!existingByLabel || order.created_at > existingByLabel.created_at) {
          byTableLabel.set(order.table_label, order);
        }
      }
    }
    return { byTableID, byTableLabel };
  }, [orders]);

  // Build the live table info array — recomputes whenever ticker fires (nowProp changes)
  const liveTableInfos = useMemo<LiveTableInfo[]>(() => {
    return tableObjects.map((obj) => {
      const tableLabel = obj.label ?? obj.tableNumber?.toString() ?? obj.id;
      const order =
        tableOrderMaps.byTableID.get(obj.id) ??
        tableOrderMaps.byTableLabel.get(tableLabel) ??
        null;
      const seatCount = tableSeatCountMap.get(obj.id) ?? 0;
      const durationSec =
        order && typeof nowProp === "number"
          ? Math.floor((nowProp - new Date(order.created_at).getTime()) / 1000)
          : 0;
      return {
        tableObj: obj,
        seatCount,
        status: deriveStatus(order, durationSec),
        order,
        durationSec,
        isOverThreshold: durationSec > WARN_THRESHOLD_SEC,
      };
    });
  }, [tableObjects, tableOrderMaps, tableSeatCountMap, nowProp]);

  const isLoading = plansLoading || planDetailLoading || ordersLoading;

  return {
    plan: planDetail?.data ?? plan,
    liveTableInfos,
    layoutObjects,
    tableObjects,
    isLoading,
  };
}
