"use client";

import { useState } from "react";
import { ArrowLeft, User, CreditCard, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { CartItem, PublicPOSConfig } from "../types";

interface SelfOrderCheckoutProps {
  token: string;
  cart: CartItem[];
  config: PublicPOSConfig;
  onBack: () => void;
  onOrderPlaced: (orderId: string) => void;
  onCreateOrder: (customerName: string) => void;
  onPayAtCashier: (customerName: string) => void;
  isPending: boolean;
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function SelfOrderCheckout({
  cart,
  config,
  onBack,
  onCreateOrder,
  onPayAtCashier,
  isPending,
}: SelfOrderCheckoutProps) {
  const t = useTranslations("selfOrder");
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const tax = Math.round(subtotal * config.tax_rate);
  const service = Math.round(subtotal * config.service_charge_rate);
  const total = subtotal + tax + service;

  function validate() {
    if (!name.trim()) {
      setNameError(t("checkout.pleaseEnterName"));
      return false;
    }
    setNameError("");
    return true;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-6 bg-background">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-10 w-10 rounded-full bg-muted/50 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">{t("checkout.confirmOrder")}</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-2 space-y-8">
        {/* Name input */}
        <div className="space-y-3 bg-card p-5 rounded-3xl border border-border/50 shadow-sm">
          <Label className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <User className="h-4 w-4" />
            {t("checkout.yourName")}
          </Label>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (e.target.value.trim()) setNameError("");
            }}
            placeholder={t("checkout.pleaseEnterName")}
            maxLength={100}
            className="h-12 text-base rounded-xl bg-muted/30 border-transparent hover:bg-muted/50 focus:bg-background focus:border-border transition-colors px-4"
          />
          {nameError && (
            <p className="text-sm font-medium text-destructive px-1">{nameError}</p>
          )}
        </div>

        {/* Order summary */}
        <div className="bg-card p-5 rounded-3xl border border-border/50 shadow-sm">
          <h2 className="text-sm font-semibold text-muted-foreground mb-4">{t("checkout.orderSummary")}</h2>
          <div className="space-y-3">
            {cart.map((item) => (
              <div
                key={item.product_id}
                className="flex justify-between items-start text-sm"
              >
                <span className="font-medium pr-4 leading-tight">
                  <span className="text-muted-foreground mr-2">{item.quantity}×</span>
                  {item.product_name}
                </span>
                <span className="font-semibold shrink-0">
                  {formatCurrency(item.price * item.quantity, config.currency)}
                </span>
              </div>
            ))}
          </div>
          <Separator className="my-4 border-border/50" />
          <div className="space-y-2">
            {config.tax_rate > 0 && (
              <div className="flex justify-between text-sm font-medium text-muted-foreground">
                <span>{t("checkout.tax")}</span>
                <span>{formatCurrency(tax, config.currency)}</span>
              </div>
            )}
            {config.service_charge_rate > 0 && (
              <div className="flex justify-between text-sm font-medium text-muted-foreground">
                <span>{t("checkout.service")}</span>
                <span>{formatCurrency(service, config.currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold tracking-tight pt-2">
              <span>{t("checkout.total")}</span>
              <span>{formatCurrency(total, config.currency)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment options */}
      <div className="px-6 py-6 border-t border-border/40 space-y-4 bg-background/80 backdrop-blur-md">
        <p className="text-xs font-semibold text-center text-muted-foreground uppercase tracking-wider">
          {t("checkout.selectPaymentMethod")}
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            className="h-20 flex-col gap-2 rounded-2xl border-border/50 bg-card hover:bg-muted/50 hover:border-border transition-all"
            disabled={isPending}
            onClick={() => validate() && onPayAtCashier(name.trim())}
          >
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <Wallet className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold">{t("checkout.payAtCashier")}</span>
          </Button>
          <Button
            className="h-20 flex-col gap-2 rounded-2xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
            disabled={isPending}
            onClick={() => validate() && onCreateOrder(name.trim())}
          >
            <div className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <CreditCard className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-xs font-semibold">{t("checkout.payNow")}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
