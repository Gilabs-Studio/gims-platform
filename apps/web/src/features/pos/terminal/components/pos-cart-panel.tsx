"use client";

import { Minus, Plus, Trash2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
      <div className="flex flex-col h-full items-center justify-center text-muted-foreground gap-2 p-6">
        <ShoppingCart className="h-10 w-10 opacity-25" />
        <p className="text-sm">Cart is empty</p>
        <p className="text-xs">Tap a product to add it</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Item list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {items.map((item) => (
          <div key={item.product_id} className="flex items-start gap-2 py-1.5">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-tight truncate">
                {item.product_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(item.unit_price)} × {item.quantity}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 cursor-pointer"
                onClick={() => onDecrement(item.product_id)}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <Badge variant="outline" className="min-w-[28px] justify-center">
                {item.quantity}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 cursor-pointer"
                onClick={() => onIncrement(item.product_id)}
              >
                <Plus className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive cursor-pointer"
                onClick={() => onRemove(item.product_id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="border-t px-3 py-3 space-y-1.5 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        {taxAmount > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>Tax ({(taxRate * 100).toFixed(0)}%)</span>
            <span>{formatCurrency(taxAmount)}</span>
          </div>
        )}
        {serviceAmount > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>Service ({(serviceRate * 100).toFixed(0)}%)</span>
            <span>{formatCurrency(serviceAmount)}</span>
          </div>
        )}
        <Separator />
        <div className="flex justify-between font-bold text-base">
          <span>Total</span>
          <span className="text-primary">{formatCurrency(total)}</span>
        </div>
      </div>

      {/* Checkout button */}
      <div className="p-3 pt-0">
        <Button
          className="w-full cursor-pointer"
          size="lg"
          onClick={onCheckout}
          disabled={isPending || items.length === 0}
        >
          {isPending ? "Processing..." : `Checkout · ${formatCurrency(total)}`}
        </Button>
      </div>
    </div>
  );
}
