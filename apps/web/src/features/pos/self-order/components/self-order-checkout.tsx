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
      <div className="flex items-center gap-3 px-4 py-3 border-b">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-semibold">{t("checkout.confirmOrder")}</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* Name input */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-sm">
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
          />
          {nameError && (
            <p className="text-xs text-destructive">{nameError}</p>
          )}
        </div>

        {/* Order summary */}
        <div>
          <h2 className="text-sm font-semibold mb-3">{t("checkout.orderSummary")}</h2>
          <div className="space-y-2">
            {cart.map((item) => (
              <div
                key={item.product_id}
                className="flex justify-between text-sm"
              >
                <span className="text-muted-foreground">
                  {item.quantity}× {item.product_name}
                </span>
                <span>
                  {formatCurrency(item.price * item.quantity, config.currency)}
                </span>
              </div>
            ))}
          </div>
          <Separator className="my-3" />
          {config.tax_rate > 0 && (
            <div className="flex justify-between text-sm text-muted-foreground mb-1">
              <span>{t("checkout.tax")}</span>
              <span>{formatCurrency(tax, config.currency)}</span>
            </div>
          )}
          {config.service_charge_rate > 0 && (
            <div className="flex justify-between text-sm text-muted-foreground mb-1">
              <span>{t("checkout.service")}</span>
              <span>{formatCurrency(service, config.currency)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold">
            <span>{t("checkout.total")}</span>
            <span>{formatCurrency(total, config.currency)}</span>
          </div>
        </div>
      </div>

      {/* Payment options */}
      <div className="px-4 py-4 border-t space-y-3 bg-background">
        <p className="text-sm font-medium text-center text-muted-foreground">
          {t("checkout.selectPaymentMethod")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-14 flex-col gap-1 text-xs"
            disabled={isPending}
            onClick={() => validate() && onPayAtCashier(name.trim())}
          >
            <Wallet className="h-5 w-5" />
            {t("checkout.payAtCashier")}
          </Button>
          <Button
            className="h-14 flex-col gap-1 text-xs"
            disabled={isPending}
            onClick={() => validate() && onCreateOrder(name.trim())}
          >
            <CreditCard className="h-5 w-5" />
            {t("checkout.payNow")}
          </Button>
        </div>
      </div>
    </div>
  );
}
