"use client";

import { AlertTriangle, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useInventory } from "@/features/stock/inventory/hooks/use-inventory";

interface StockWarningInlineProps {
  /** The product UUID to check stock for */
  productId: string;
  /** Required quantity — triggers "insufficient" warning when available < this */
  requiredQuantity?: number;
}

/**
 * Displays an inline stock availability indicator for a given product.
 * Queries the inventory API aggregated across all warehouses.
 * Shows: In Stock / Low Stock / Insufficient / Out of Stock.
 */
export function StockWarningInline({ productId, requiredQuantity = 0 }: StockWarningInlineProps) {
  const { data, isLoading } = useInventory({
    product_id: productId,
    page: 1,
    per_page: 50,
    enabled: !!productId,
  });

  if (!productId) return null;

  if (isLoading) {
    return (
      <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Checking stock...</span>
      </div>
    );
  }

  const items = data?.data?.data ?? [];
  const totalAvailable = items.reduce((sum, item) => sum + (item.available ?? 0), 0);
  const activeWarehouses = items.filter((item) => (item.available ?? 0) > 0);
  const warehouseCount = activeWarehouses.length;
  const isOutOfStock = items.length === 0 || totalAvailable <= 0;
  const isInsufficient = !isOutOfStock && requiredQuantity > 0 && totalAvailable < requiredQuantity;
  const isLowStock = !isOutOfStock && !isInsufficient && items.some((item) => item.status === "low_stock");

  // Format number: integer if whole, up to 2 decimals otherwise
  const fmt = (n: number) => (n % 1 === 0 ? n.toString() : n.toFixed(2));

  const whLabel = (count: number) => `${count} warehouse${count !== 1 ? "s" : ""}`;

  if (isOutOfStock) {
    return (
      <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1 rounded bg-destructive/10 border border-destructive/20 text-destructive text-xs">
        <XCircle className="h-3.5 w-3.5 shrink-0" />
        <span className="font-medium">Out of Stock</span>
        <span className="opacity-75">— no available inventory in any warehouse</span>
      </div>
    );
  }

  if (isInsufficient) {
    return (
      <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1 rounded bg-destructive/10 border border-destructive/20 text-destructive text-xs">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span className="font-medium">Insufficient Stock</span>
        <span className="opacity-75">
          — available: {fmt(totalAvailable)} across {whLabel(warehouseCount)} (need {fmt(requiredQuantity)})
        </span>
      </div>
    );
  }

  if (isLowStock) {
    return (
      <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1 rounded bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs dark:bg-yellow-950/20 dark:border-yellow-800 dark:text-yellow-400">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span className="font-medium">Low Stock</span>
        <span className="opacity-75">— available: {fmt(totalAvailable)} across {whLabel(warehouseCount)}</span>
      </div>
    );
  }

  // In Stock
  return (
    <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1 rounded bg-green-50 border border-green-200 text-green-700 text-xs dark:bg-green-950/20 dark:border-green-800 dark:text-green-400">
      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
      <span className="font-medium">In Stock</span>
      <span className="opacity-75">— available: {fmt(totalAvailable)} across {whLabel(warehouseCount)}</span>
    </div>
  );
}
