"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
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
  const service = Math.round(subtotal * config.service_charge_rate);
  const total = subtotal + service;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] flex flex-col px-0 rounded-t-4xl sm:max-w-md sm:mx-auto sm:rounded-t-4xl">
        <SheetHeader className="px-6 py-4 border-b border-border/40">
          <SheetTitle className="text-lg font-bold tracking-tight">{t("cart.title")}</SheetTitle>
        </SheetHeader>

        {cart.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">{t("cart.empty")}</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              {cart.map((item) => (
                <div key={item.product_id} className="space-y-3">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold truncate leading-tight">
                        {item.product_name}
                      </p>
                      <p className="text-sm text-primary font-bold mt-1">
                        {formatCurrency(item.price * item.quantity, config.currency)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 bg-muted/50 rounded-full p-1 border border-border/50">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full hover:bg-background shadow-sm transition-all"
                        onClick={() => onChangeQuantity(item.product_id, -1)}
                      >
                        {item.quantity === 1 ? (
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        ) : (
                          <Minus className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <span className="text-sm font-semibold w-5 text-center">
                        {item.quantity}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full hover:bg-background shadow-sm transition-all"
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
                    className="h-9 text-xs bg-muted/30 border-transparent hover:bg-muted/50 focus:bg-background focus:border-border rounded-xl transition-colors"
                  />
                </div>
              ))}
            </div>

            <div className="px-6 py-5 space-y-3 border-t border-border/40 bg-background/80 backdrop-blur-md">
              <div className="flex justify-between text-sm font-medium text-muted-foreground">
                <span>{t("cart.subtotal")}</span>
                <span>{formatCurrency(subtotal, config.currency)}</span>
              </div>
              {config.service_charge_rate > 0 && (
                <div className="flex justify-between text-sm font-medium text-muted-foreground">
                  <span>
                    {t("cart.service")} ({(config.service_charge_rate * 100).toFixed(0)}%)
                  </span>
                  <span>{formatCurrency(service, config.currency)}</span>
                </div>
              )}
              <Separator className="my-1 border-border/50" />
              <div className="flex justify-between text-lg font-bold tracking-tight">
                <span>{t("cart.total")}</span>
                <span>{formatCurrency(total, config.currency)}</span>
              </div>
              <Button 
                className="w-full h-12 mt-2 rounded-full text-base font-semibold shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all" 
                onClick={onCheckout}
              >
                {t("cart.proceed")}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
