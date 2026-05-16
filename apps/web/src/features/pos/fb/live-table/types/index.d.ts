import type { LayoutObject } from "@/features/pos/fb/floor-layout/types";
import type { POSOrder } from "@/features/pos/terminal/types";

// Operational status of a single table in the live session
export type LiveTableStatus =
  | "AVAILABLE"      // No paid/active order — table is free to seat
  | "WAITING_PAYMENT" // Customer self-order placed, waiting payment at cashier
  | "SEATED"         // Order paid; customer waiting for food (labelled "Occupied" in UI)
  | "WARN_LONG"      // Occupied > 30 min, may need attention
  | "PARTIAL_SERVED" // Some items served, others still pending
  | "SERVED";        // All food delivered; customer still at table

export interface LiveTableInfo {
  tableObj: LayoutObject;
  seatCount: number;
  status: LiveTableStatus;
  orders: POSOrder[];
  unpaidOrder: POSOrder | null;
  unpaidOrders: POSOrder[];
  serviceOrder: POSOrder | null;
  serviceOrders: POSOrder[];
  servedOrders: POSOrder[];
  needsPaymentCount: number;
  needsServeCount: number;
  doneCount: number;
  order: POSOrder | null;
  // Duration in seconds since the order was created
  durationSec: number;
  // True when table has been occupied > warning threshold
  isOverThreshold: boolean;
}
