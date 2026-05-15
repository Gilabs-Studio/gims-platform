"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { QrCode, Store, WifiOff } from "lucide-react";
import { LoadingSpinner } from "@/components/loading";
import { SelfOrderMenu } from "./self-order-menu";
import { SelfOrderCart } from "./self-order-cart";
import { SelfOrderCheckout } from "./self-order-checkout";
import { SelfOrderStatus } from "./self-order-status";
import { useTableInfo, useCreateOrder, useOrderStatus } from "../hooks/use-self-order";
import { SelfOrderApiError, selfOrderService } from "../services/self-order-service";
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

  const { data: tableInfo, isError, error, isPending } = useTableInfo(token);
  const createOrder = useCreateOrder(token);
  const { data: orderStatus } = useOrderStatus(
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
          product_name: product.product_name,
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
      const payment = await selfOrderService.initiatePayment(token, order.order_id, {
        method: "QRIS",
        amount: order.total_amount,
      });

      const paymentUrl = payment.data.payment_url;
      if (paymentUrl) {
        window.open(paymentUrl, "_blank", "noopener,noreferrer");
      }

      setOrderId(order.order_id);
      setCart([]);
      setStep("status");
    } catch (err) {
      if (err instanceof SelfOrderApiError && err.status === 409) {
        toast.error(t("selfOrder.page.outletClosed"));
        return;
      }
      toast.error(t("selfOrder.page.failedOrder"));
    }
  }

  async function handlePayAtCashier(customerName: string) {
    try {
      const order = await placeOrder(customerName);
      await selfOrderService.markPayAtCashier(token, order.order_id);
      setOrderId(order.order_id);
      setCart([]);
      setStep("status");
    } catch (err) {
      if (err instanceof SelfOrderApiError && err.status === 409) {
        toast.error(t("selfOrder.page.outletClosed"));
        return;
      }
      toast.error(t("selfOrder.page.failedOrder"));
    }
  }

  // ── Loading / error ──────────────────────────────────────────────────────────

  if (isPending) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4">
        <LoadingSpinner className="h-10 w-10 text-primary" strokeWidth={2.5} />
        <p className="mt-4 text-sm font-medium text-muted-foreground animate-pulse">
          {t("selfOrder.page.loadingMenu")}
        </p>
      </div>
    );
  }

  if (isError || !tableInfo) {
    const isInvalidQR =
      error instanceof SelfOrderApiError &&
      (error.status === 404 || error.status === 403 || error.status === 410);
    const isOutletClosed =
      error instanceof SelfOrderApiError && error.status === 409;

    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center bg-background">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted/50 mb-6">
          {isInvalidQR ? (
            <QrCode className="h-10 w-10 text-muted-foreground" />
          ) : isOutletClosed ? (
            <Store className="h-10 w-10 text-muted-foreground" />
          ) : (
            <WifiOff className="h-10 w-10 text-muted-foreground" />
          )}
        </div>

        <h1 className="text-2xl font-bold tracking-tight mb-2">
          {isInvalidQR
            ? t("selfOrder.page.invalidQR")
            : isOutletClosed
              ? t("selfOrder.page.outletClosed")
            : t("selfOrder.page.unableToLoad")}
        </h1>
        <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
          {isInvalidQR
            ? t("selfOrder.page.invalidQRDescription")
            : isOutletClosed
              ? t("selfOrder.page.outletClosedDescription")
            : t("selfOrder.page.networkErrorDescription")}
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
        isPending={createOrder.isPending}
      />
    );
  }

  // ── Step: menu ────────────────────────────────────────────────────────────────

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <div className="px-6 pt-10 pb-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{tableInfo.outlet_name}</p>
        <h1 className="text-3xl font-extrabold tracking-tight">{tableInfo.table_label}</h1>
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
    </div>
  );
}
