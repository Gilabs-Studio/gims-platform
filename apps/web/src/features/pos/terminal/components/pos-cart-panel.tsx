"use client";

import { Minus, Plus, Trash2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/lib/utils";
import type { CartItem, POSConfig } from "../types";

interface POSCartPanelProps {
  items: CartItem[];
  config?: POSConfig;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  onRemove: (productId: string) => void;
  onCheckout: () => void;
  isPending?: boolean;
}

export function POSCartPanel({
  items,
  config,
  onIncrement,
  onDecrement,
  onRemove,
  onCheckout,
  isPending,
}: POSCartPanelProps) {
  const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
  const taxRate = config?.tax_rate ?? 0.11;
  const serviceRate = config?.service_charge_rate ?? 0;
  const taxAmount = subtotal * taxRate;
  const serviceAmount = subtotal * serviceRate;
  const total = subtotal + taxAmount + serviceAmount;

  if (items.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-muted-foreground gap-3 p-6">
        <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center">
          <ShoppingCart className="h-6 w-6 opacity-40" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">Cart is empty</p>
          <p className="text-xs text-muted-foreground/70 mt-0.5">Tap a product to add it</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Item list */}
      <ScrollArea className="flex-1">
        <div className="px-3 py-2 space-y-0.5">
          {items.map((item) => (
            <div
              key={item.product_id}
              className="flex items-center gap-2 py-2.5 border-b last:border-0"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight truncate">
                  {item.product_name}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                  {formatCurrency(item.unit_price)} × {item.quantity}
                  {" = "}
                  <span className="font-semibold text-foreground">
                    {formatCurrency(item.subtotal)}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full cursor-pointer"
                  onClick={() => onDecrement(item.product_id)}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-6 text-center text-sm font-semibold tabular-nums">
                  {item.quantity}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full cursor-pointer"
                  onClick={() => onIncrement(item.product_id)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full text-destructive cursor-pointer"
                  onClick={() => onRemove(item.product_id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Totals + checkout */}
      <div className="border-t px-4 py-3 space-y-2 text-sm bg-background shrink-0">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatCurrency(subtotal)}</span>
        </div>
        {taxAmount > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>Tax ({(taxRate * 100).toFixed(0)}%)</span>
            <span className="tabular-nums">{formatCurrency(taxAmount)}</span>
          </div>
        )}
        {serviceAmount > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>Service ({(serviceRate * 100).toFixed(0)}%)</span>
            <span className="tabular-nums">{formatCurrency(serviceAmount)}</span>
          </div>
        )}
        <Separator />
        <div className="flex justify-between font-bold text-base">
          <span>Total</span>
          <span className="text-primary tabular-nums">{formatCurrency(total)}</span>
        </div>
        <Button
          className="w-full cursor-pointer mt-1"
          size="lg"
          onClick={onCheckout}
          disabled={isPending || items.length === 0}
        >
          {isPending ? "Processing…" : `Pay ${formatCurrency(total)}`}
        </Button>
      </div>
    </div>
  );
}
