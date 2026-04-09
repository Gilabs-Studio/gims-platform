"use client";

import { useMemo } from "react";
import { useFloorLayouts, useFloorLayout } from "@/features/pos/fb/floor-layout/hooks/use-floor-layouts";
import { usePOSOrderList } from "@/features/pos/terminal/hooks/use-pos";
import type { LayoutObject } from "@/features/pos/fb/floor-layout/types";
import type { LiveTableInfo, LiveTableStatus } from "../types";

const WARN_THRESHOLD_SEC = 30 * 60; // 30 minutes

function deriveStatus(order: { status: string } | null, durationSec: number): LiveTableStatus {
  if (!order) return "AVAILABLE";
  if (order.status === "SERVED" || order.status === "COMPLETED") return "SERVED";
  if (order.status === "READY") return "FOOD_READY";
  if (durationSec > WARN_THRESHOLD_SEC) return "WARN_LONG";
  return "SEATED";
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

  // Load all open orders for this outlet (poll every 15s for real-time status).
  const {
    data: ordersData,
    isLoading: ordersLoading,
  } = usePOSOrderList(
    { outlet_id: outletId, per_page: 100 },
    { refetchInterval: 15_000 }
  );

  const orders = useMemo(() => ordersData?.data ?? [], [ordersData?.data]);

  // Build a map from table_label → most recent active order
  const tableOrderMap = useMemo(() => {
    const map = new Map<string, (typeof orders)[number]>();
    for (const order of orders) {
      if (!order.table_label) continue;
      if (["VOIDED", "PAID", "COMPLETED"].includes(order.status)) continue;
      const existing = map.get(order.table_label);
      if (!existing || order.created_at > existing.created_at) {
        map.set(order.table_label, order);
      }
    }
    return map;
  }, [orders]);

  // Build the live table info array — recomputes whenever ticker fires (nowProp changes)
  const liveTableInfos = useMemo<LiveTableInfo[]>(() => {
    return tableObjects.map((obj) => {
      const tableLabel = obj.label ?? obj.tableNumber?.toString() ?? obj.id;
      const order = tableOrderMap.get(tableLabel) ?? null;
      const durationSec =
        order && typeof nowProp === "number"
          ? Math.floor((nowProp - new Date(order.created_at).getTime()) / 1000)
          : 0;
      return {
        tableObj: obj,
        status: deriveStatus(order, durationSec),
        order,
        durationSec,
        isOverThreshold: durationSec > WARN_THRESHOLD_SEC,
      };
    });
  }, [tableObjects, tableOrderMap, nowProp]);

  const isLoading = plansLoading || planDetailLoading || ordersLoading;

  return {
    plan: planDetail?.data ?? plan,
    liveTableInfos,
    layoutObjects,
    tableObjects,
    isLoading,
  };
}
