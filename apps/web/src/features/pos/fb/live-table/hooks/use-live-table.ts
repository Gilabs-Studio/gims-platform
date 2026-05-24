"use client";

import { useMemo } from "react";
import { useFloorLayouts, useFloorLayout } from "@/features/pos/fb/floor-layout/hooks/use-floor-layouts";
import { usePOSOrderList } from "@/features/pos/terminal/hooks/use-pos";
import type { LayoutObject } from "@/features/pos/fb/floor-layout/types";
import type { POSOrder } from "@/features/pos/terminal/types";
import type { LiveTableInfo, LiveTableStatus } from "../types";

const WARN_THRESHOLD_SEC = 30 * 60; // 30 minutes

const WAITING_PAYMENT_STATUSES = ["IN_PROGRESS", "READY", "WAITING_PAYMENT"] as const;
const SERVICE_FLOW_STATUSES = ["PAID", "PARTIAL_SERVED", "SERVED"] as const;

function isPendingServeItem(status: POSOrder["items"][number]["status"]): boolean {
  return status !== "SERVED" && status !== "CANCELLED";
}

function getOrderPendingServeCount(order: POSOrder): number {
  if (!order.items?.length) return 0;
  return order.items.reduce((total, item) => {
    if (!isPendingServeItem(item.status)) return total;
    return total + Math.max(item.quantity, 0);
  }, 0);
}

function getOrderPaymentCount(order: POSOrder): number {
  if (!order.items?.length) return 1;
  return order.items.reduce((total, item) => total + Math.max(item.quantity, 0), 0);
}

function deriveStatus(
  unpaidOrder: POSOrder | null,
  serviceOrder: POSOrder | null,
  servedOrders: POSOrder[],
  durationSec: number,
  draftOrder: POSOrder | null
): LiveTableStatus {
  if (unpaidOrder || draftOrder) {
    return "WAITING_PAYMENT";
  }
  const order = serviceOrder;
  if (!order) {
    return servedOrders.length > 0 ? "SERVED" : "AVAILABLE";
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

function normalizeLabel(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
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

  const activeOrders = useMemo(() => {
    return orders.filter((order) => {
      const isWaitingCustomerPayment =
        WAITING_PAYMENT_STATUSES.includes(order.status as (typeof WAITING_PAYMENT_STATUSES)[number]) ||
        order.status === "DRAFT";
      const isPostPaymentOccupied =
        SERVICE_FLOW_STATUSES.includes(order.status as (typeof SERVICE_FLOW_STATUSES)[number]);
      return isWaitingCustomerPayment || isPostPaymentOccupied;
    });
  }, [orders]);

  // Build the live table info array — recomputes whenever ticker fires (nowProp changes)
  const liveTableInfos = useMemo<LiveTableInfo[]>(() => {
    return tableObjects.map((obj) => {
      const tableLabel = obj.label ?? obj.tableNumber?.toString() ?? obj.id;
      const normalizedTableLabel = normalizeLabel(tableLabel);
      const matchedMap = new Map<string, POSOrder>();

      for (const order of activeOrders) {
        const sameTableID = !!order.table_id && order.table_id === obj.id;
        const sameTableLabel = normalizeLabel(order.table_label) === normalizedTableLabel;
        if (!sameTableID && !sameTableLabel) continue;
        matchedMap.set(order.id, order);
      }

      const matchedOrders = Array.from(matchedMap.values()).sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      const unpaidOrders = matchedOrders.filter((order) =>
        WAITING_PAYMENT_STATUSES.includes(order.status as (typeof WAITING_PAYMENT_STATUSES)[number])
      );

      const serviceFlowOrders = [...matchedOrders]
        .filter((order) => SERVICE_FLOW_STATUSES.includes(order.status as (typeof SERVICE_FLOW_STATUSES)[number]))
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      const serviceOrders = serviceFlowOrders.filter((order) =>
        order.status === "PAID" || order.status === "PARTIAL_SERVED"
      );

      const servedOrders = serviceFlowOrders.filter((order) => order.status === "SERVED");

      const unpaidOrder = unpaidOrders[0] ?? null;
      const serviceOrder = serviceOrders[0] ?? null;
      const draftOrder = matchedOrders.find((order) => order.status === "DRAFT") ?? null;

      const needsPaymentCount = unpaidOrders.reduce((total, order) => total + getOrderPaymentCount(order), 0);
      const needsServeCount = serviceOrders.reduce((total, order) => {
        const count = getOrderPendingServeCount(order);
        if (count > 0) return total + count;
        return total + 1;
      }, 0);
      const doneCount = servedOrders.length;

      const displayOrder = unpaidOrder ?? serviceOrder ?? draftOrder ?? servedOrders[0] ?? matchedOrders[0] ?? null;
      const seatCount = tableSeatCountMap.get(obj.id) ?? 0;
      const durationSec =
        displayOrder && typeof nowProp === "number"
          ? Math.floor((nowProp - new Date(displayOrder.created_at).getTime()) / 1000)
          : 0;
      return {
        tableObj: obj,
        seatCount,
        status: deriveStatus(unpaidOrder, serviceOrder, servedOrders, durationSec, draftOrder),
        orders: matchedOrders,
        unpaidOrder,
        unpaidOrders,
        serviceOrder,
        serviceOrders,
        servedOrders,
        needsPaymentCount,
        needsServeCount,
        doneCount,
        order: displayOrder,
        durationSec,
        isOverThreshold: durationSec > WARN_THRESHOLD_SEC,
      };
    });
  }, [tableObjects, activeOrders, tableSeatCountMap, nowProp]);

  const isLoading = plansLoading || planDetailLoading || ordersLoading;

  return {
    plan: planDetail?.data ?? plan,
    liveTableInfos,
    layoutObjects,
    tableObjects,
    isLoading,
  };
}
