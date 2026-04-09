import type { LayoutObject } from "@/features/pos/fb/floor-layout/types";
import type { POSOrder } from "@/features/pos/terminal/types";

// Operational status of a single table in the live session
export type LiveTableStatus =
  | "AVAILABLE"    // No active order
  | "SEATED"       // Order placed, kitchen preparing
  | "FOOD_READY"   // All items ready to serve
  | "WARN_LONG"    // Occupied > 30 min, may need attention
  | "SERVED";      // Order SERVED status

export interface LiveTableInfo {
  tableObj: LayoutObject;
  status: LiveTableStatus;
  order: POSOrder | null;
  // Duration in seconds since the order was created
  durationSec: number;
  // True when table has been occupied > warning threshold
  isOverThreshold: boolean;
}
