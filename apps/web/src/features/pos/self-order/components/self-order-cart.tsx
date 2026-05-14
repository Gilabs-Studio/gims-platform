"use client";

import { Minus, Plus, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { CartItem, PublicPOSConfig } from "../types";

interface SelfOrderCartProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cart: CartItem[];
  config: PublicPOSConfig;
  onChangeQuantity: (productId: string, delta: number) => void;
  onChangeNotes: (productId: string, notes: string) => void;
  onCheckout: () => void;
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function SelfOrderCart({
  open,
  onOpenChange,
  cart,
  config,
  onChangeQuantity,
  onChangeNotes,
  onCheckout,
}: SelfOrderCartProps) {
  const t = useTranslations("selfOrder");
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const tax = Math.round(subtotal * config.tax_rate);
  const service = Math.round(subtotal * config.service_charge_rate);
  const total = subtotal + tax + service;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] flex flex-col px-0">
        <SheetHeader className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base">{t("cart.title")}</SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        {cart.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">{t("cart.empty")}</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
              {cart.map((item) => (
                <div key={item.product_id} className="space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {item.product_name}
                      </p>
                      <p className="text-xs text-primary font-semibold">
                        {formatCurrency(item.price * item.quantity, config.currency)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onChangeQuantity(item.product_id, -1)}
                      >
                        {item.quantity === 1 ? (
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        ) : (
                          <Minus className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <span className="text-sm font-medium w-6 text-center">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onChangeQuantity(item.product_id, 1)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <Input
                    value={item.notes}
                    onChange={(e) =>
                      onChangeNotes(item.product_id, e.target.value)
                    }
                    placeholder={t("cart.notes")}
                    className="h-7 text-xs"
                  />
                </div>
              ))}
            </div>

            <div className="px-4 py-3 space-y-2 border-t bg-background">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t("cart.subtotal")}</span>
                <span>{formatCurrency(subtotal, config.currency)}</span>
              </div>
              {config.tax_rate > 0 && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t("cart.tax")} ({(config.tax_rate * 100).toFixed(0)}%)</span>
                  <span>{formatCurrency(tax, config.currency)}</span>
                </div>
              )}
              {config.service_charge_rate > 0 && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {t("cart.service")} ({(config.service_charge_rate * 100).toFixed(0)}%)
                  </span>
                  <span>{formatCurrency(service, config.currency)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-sm font-bold">
                <span>{t("cart.total")}</span>
                <span>{formatCurrency(total, config.currency)}</span>
              </div>
              <Button className="w-full" onClick={onCheckout}>
                {t("cart.proceed")}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
