"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { SelfOrderMenu } from "./self-order-menu";
import { SelfOrderCart } from "./self-order-cart";
import { SelfOrderCheckout } from "./self-order-checkout";
import { SelfOrderStatus } from "./self-order-status";
import { useTableInfo, useCreateOrder, useOrderStatus, useMarkPayAtCashier } from "../hooks/use-self-order";
import type { POSCatalogItem, CartItem } from "../types";

type Step = "menu" | "checkout" | "status";

interface SelfOrderPageClientProps {
  token: string;
}

export function SelfOrderPageClient({ token }: SelfOrderPageClientProps) {
  const t = useTranslations();
  const [step, setStep] = useState<Step>("menu");
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderId, setOrderId] = useState<string | null>(null);

  const { data: tableInfo, isError, isPending } = useTableInfo(token);
  const createOrder = useCreateOrder(token);
  const markCashier = useMarkPayAtCashier(token, orderId ?? "");
  const { data: orderStatus, isRefetching } = useOrderStatus(
    token,
    orderId ?? ""
  );

  // ── Cart helpers ─────────────────────────────────────────────────────────────

  const handleAdd = useCallback((product: POSCatalogItem) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product_id === product.product_id);
      if (idx >= 0) {
        return prev.map((i, n) =>
          n === idx ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          product_id: product.product_id,
          product_name: product.name,
          price: product.price,
          quantity: 1,
          notes: "",
        },
      ];
    });
  }, []);

  const handleChangeQuantity = useCallback(
    (productId: string, delta: number) => {
      setCart((prev) =>
        prev
          .map((i) =>
            i.product_id === productId
              ? { ...i, quantity: i.quantity + delta }
              : i
          )
          .filter((i) => i.quantity > 0)
      );
    },
    []
  );

  const handleChangeNotes = useCallback((productId: string, notes: string) => {
    setCart((prev) =>
      prev.map((i) =>
        i.product_id === productId ? { ...i, notes } : i
      )
    );
  }, []);

  // ── Order placement ──────────────────────────────────────────────────────────

  async function placeOrder(customerName: string) {
    const res = await createOrder.mutateAsync({
      customer_name: customerName,
      items: cart.map((i) => ({
        product_id: i.product_id,
        quantity: i.quantity,
        notes: i.notes || undefined,
      })),
    });
    return res.data;
  }

  async function handleOrderAndPay(customerName: string) {
    try {
      const order = await placeOrder(customerName);
      setOrderId(order.order_id);
      setCart([]);
      setStep("status");
    } catch {
      toast.error(t("selfOrder.page.failedOrder"));
    }
  }

  async function handlePayAtCashier(customerName: string) {
    try {
      const order = await placeOrder(customerName);
      setOrderId(order.order_id);
      await selfOrderService_markCashier(token, order.order_id);
      setCart([]);
      setStep("status");
    } catch {
      toast.error(t("selfOrder.page.failedOrder"));
    }
  }

  // ── Loading / error ──────────────────────────────────────────────────────────

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-sm text-muted-foreground animate-pulse">
          {t("selfOrder.page.loadingMenu")}
        </p>
      </div>
    );
  }

  if (isError || !tableInfo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 px-6">
        <p className="text-lg font-semibold">{t("selfOrder.page.invalidQR")}</p>
        <p className="text-sm text-muted-foreground text-center">
          {t("selfOrder.page.invalidQRDescription")}
        </p>
      </div>
    );
  }

  if (!tableInfo.is_open) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 px-6">
        <p className="text-lg font-semibold">{t("selfOrder.page.restaurantClosed")}</p>
        <p className="text-sm text-muted-foreground text-center">
          {t("selfOrder.page.closedDescription")}
        </p>
      </div>
    );
  }

  // ── Step: status ─────────────────────────────────────────────────────────────

  if (step === "status" && orderStatus) {
    return (
      <SelfOrderStatus
        order={orderStatus}
        currency={tableInfo.config.currency}
        onOrderMore={() => {
          setOrderId(null);
          setStep("menu");
        }}
        isRefetching={isRefetching}
      />
    );
  }

  // ── Step: checkout ────────────────────────────────────────────────────────────

  if (step === "checkout") {
    return (
      <SelfOrderCheckout
        token={token}
        cart={cart}
        config={tableInfo.config}
        onBack={() => setStep("menu")}
        onOrderPlaced={setOrderId}
        onCreateOrder={handleOrderAndPay}
        onPayAtCashier={handlePayAtCashier}
        isPending={createOrder.isPending || markCashier.isPending}
      />
    );
  }

  // ── Step: menu ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <p className="text-xs text-muted-foreground">{tableInfo.outlet_name}</p>
        <h1 className="font-bold text-base">{tableInfo.table_label}</h1>
      </div>

      <SelfOrderMenu
        catalog={tableInfo.catalog}
        cart={cart}
        currency={tableInfo.config.currency}
        onAdd={handleAdd}
        onOpenCart={() => setCartOpen(true)}
      />

      <SelfOrderCart
        open={cartOpen}
        onOpenChange={setCartOpen}
        cart={cart}
        config={tableInfo.config}
        onChangeQuantity={handleChangeQuantity}
        onChangeNotes={handleChangeNotes}
        onCheckout={() => {
          setCartOpen(false);
          setStep("checkout");
        }}
      />
    </>
  );
}

// Inline plain-fetch helper to avoid importing the service (avoids circular dep)
async function selfOrderService_markCashier(token: string, orderId: string) {
  const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8087";
  await fetch(
    `${API_ORIGIN}/api/v1/public/pos/tables/${token}/orders/${orderId}/pay/cashier`,
    { method: "POST" }
  );
}
