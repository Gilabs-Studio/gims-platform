"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { QrCode, Store, WifiOff, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Confetti } from "@/components/ui/confetti";
import type { ConfettiRef } from "@/components/ui/confetti";
import { LoadingSpinner } from "@/components/loading";
import { SelfOrderMenu } from "./self-order-menu";
import { SelfOrderCart } from "./self-order-cart";
import { SelfOrderCheckout } from "./self-order-checkout";
import { SelfOrderStatus } from "./self-order-status";
import { selfOrderKeys, useTableInfo, useCreateOrder, useOrderStatus, useCancelOrder, useSelfOrderRealtime } from "../hooks/use-self-order";
import { SelfOrderApiError, selfOrderService } from "../services/self-order-service";
import type { POSCatalogItem, CartItem } from "../types";

type Step = "menu" | "checkout" | "status";

type PendingCashierPayment = {
  orderId: string;
  orderNumber: string;
  totalAmount: number;
};

interface SelfOrderPageClientProps {
  token: string;
}

export function SelfOrderPageClient({ token }: SelfOrderPageClientProps) {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const confettiRef = useRef<ConfettiRef>(null);
  const confettiFiredRef = useRef(false);
  const redirectConfirmStartedRef = useRef(false);
  const returnedOrderId = searchParams.get("order_id")?.trim() ?? "";
  const returnedPaymentId = searchParams.get("payment_id")?.trim() ?? "";
  const returnedPaymentStatus = searchParams.get("payment_status")?.trim() ?? "";
  const [step, setStep] = useState<Step>(() => (returnedOrderId ? "status" : "menu"));
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderId, setOrderId] = useState<string | null>(() => returnedOrderId || null);
  const [pendingAction, setPendingAction] = useState<"digital" | "cashier" | null>(null);
  const pendingStorageKey = useMemo(() => `self-order:pending-cashier:${token}`, [token]);
  const [pendingCashierPayment, setPendingCashierPayment] = useState<PendingCashierPayment | null>(() => {
    if (typeof window === "undefined") return null;
    if (returnedOrderId) {
      window.localStorage.removeItem(`self-order:pending-cashier:${token}`);
      return null;
    }
    const raw = window.localStorage.getItem(`self-order:pending-cashier:${token}`);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as PendingCashierPayment;
      return parsed?.orderId ? parsed : null;
    } catch {
      window.localStorage.removeItem(`self-order:pending-cashier:${token}`);
      return null;
    }
  });

  const { data: tableInfo, isError, error, isPending } = useTableInfo(token);
  const createOrder = useCreateOrder(token);
  const trackedOrderId = orderId ?? pendingCashierPayment?.orderId ?? "";
  const { data: orderStatus } = useOrderStatus(
    token,
    trackedOrderId
  );
  useSelfOrderRealtime(token, trackedOrderId);
  const cancelOrder = useCancelOrder(token, trackedOrderId);

  const isTrackedPaymentSettled =
    orderStatus?.status === "PAID" ||
    orderStatus?.status === "PARTIAL_SERVED" ||
    orderStatus?.status === "SERVED" ||
    orderStatus?.status === "COMPLETED" ||
    orderStatus?.status === "CANCELLED" ||
    orderStatus?.status === "VOIDED";

  const visiblePendingCashierPayment = isTrackedPaymentSettled ? null : pendingCashierPayment;

  const clearPaymentRedirectParams = useCallback(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    url.searchParams.delete("order_id");
    url.searchParams.delete("payment_id");
    url.searchParams.delete("payment_status");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const closeTrackedOrder = useCallback(() => {
    setPendingCashierPayment(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(pendingStorageKey);
    }
    clearPaymentRedirectParams();
    setOrderId(null);
    setStep("menu");
  }, [clearPaymentRedirectParams, pendingStorageKey]);

  const triggerConfetti = useCallback(() => {
    const fire = confettiRef.current?.fire;
    if (!fire) return;

    fire({
      particleCount: 50,
      spread: 180,
      startVelocity: 42,
      decay: 0.92,
      origin: { x: 0.5, y: 0.5 },
    });

    window.setTimeout(() => {
      fire({
        particleCount: 40,
        spread: 360,
        startVelocity: 52,
        decay: 0.9,
        scalar: 0.95,
        origin: { x: 0.5, y: 0.5 },
      });

      window.setTimeout(() => {
        fire({
          particleCount: 20,
          spread: 360,
          startVelocity: 30,
          decay: 0.94,
          scalar: 1.1,
          origin: { x: 0.5, y: 0.5 },
        });
      }, 130);
    }, 140);
  }, []);

  useEffect(() => {
    if (returnedPaymentStatus !== "success") return;
    if (!returnedOrderId || !returnedPaymentId) return;
    if (redirectConfirmStartedRef.current) return;

    redirectConfirmStartedRef.current = true;
    let cancelled = false;
    let retryTimer: number | undefined;
    const maxAttempts = 8;
    const baseDelayMs = 1200;

    const confirmPayment = async (attempt: number) => {
      try {
        const response = await selfOrderService.confirmPayment(token, returnedOrderId, returnedPaymentId);
        await queryClient.refetchQueries({
          queryKey: selfOrderKeys.orderStatus(token, returnedOrderId),
        });

        if (cancelled) return;
        if (response.data.status === "PAID") return;

        if (attempt < maxAttempts) {
          retryTimer = window.setTimeout(() => {
            void confirmPayment(attempt + 1);
          }, baseDelayMs * attempt);
        }
      } catch {
        if (cancelled) return;
        if (attempt < maxAttempts) {
          retryTimer = window.setTimeout(() => {
            void confirmPayment(attempt + 1);
          }, baseDelayMs * attempt);
          return;
        }
        toast.error(t("selfOrder.page.paymentConfirmFailed"));
      }
    };

    void confirmPayment(1);

    return () => {
      cancelled = true;
      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }
    };
  }, [queryClient, returnedOrderId, returnedPaymentId, returnedPaymentStatus, t, token]);

  useEffect(() => {
    if (orderStatus?.status !== "PAID") return;
    if (confettiFiredRef.current) return;

    confettiFiredRef.current = true;
    const id = window.requestAnimationFrame(() => {
      triggerConfetti();
    });
    return () => window.cancelAnimationFrame(id);
  }, [orderStatus?.status, triggerConfetti]);

  useEffect(() => {
    if (!pendingCashierPayment) return;
    if (!orderStatus) return;
    if (
      orderStatus.status !== "PAID" &&
      orderStatus.status !== "PARTIAL_SERVED" &&
      orderStatus.status !== "SERVED" &&
      orderStatus.status !== "COMPLETED"
    ) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setOrderId(pendingCashierPayment.orderId);
      setStep("status");
      setPendingCashierPayment(null);
      window.localStorage.removeItem(pendingStorageKey);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [orderStatus, pendingCashierPayment, pendingStorageKey]);

  useEffect(() => {
    if (step !== "status") return;
    if (orderStatus?.status !== "COMPLETED") return;

    const timeout = window.setTimeout(() => {
      closeTrackedOrder();
    }, 2_800);

    return () => window.clearTimeout(timeout);
  }, [closeTrackedOrder, orderStatus?.status, step]);

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
    setPendingAction("digital");
    try {
      const order = await placeOrder(customerName);
      setPendingCashierPayment(null);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(pendingStorageKey);
      }
      const selfOrderURL =
        typeof window !== "undefined"
          ? `${window.location.origin}${window.location.pathname}`
          : undefined;
      const payment = await selfOrderService.initiatePayment(token, order.order_id, {
        method: "QRIS",
        amount: order.total_amount,
        success_redirect_url: selfOrderURL,
        failure_redirect_url: selfOrderURL,
      });

      const paymentUrl = payment.data.payment_url;
      if (paymentUrl) {
        setOrderId(order.order_id);
        setCart([]);
        setStep("status");
        window.location.assign(paymentUrl);
        return;
      }

      setOrderId(order.order_id);
      setCart([]);
      setStep("status");
    } catch (err) {
      if (err instanceof SelfOrderApiError && err.status === 409) {
        if (err.code === "POS_ORDER_CANNOT_MODIFY") {
          toast.error(t("selfOrder.page.orderCannotModify"));
          return;
        }
        toast.error(t("selfOrder.page.outletClosed"));
        return;
      }
      toast.error(t("selfOrder.page.failedOrder"));
    } finally {
      setPendingAction(null);
    }
  }

  async function handlePayAtCashier(customerName: string) {
    setPendingAction("cashier");
    try {
      const order = await placeOrder(customerName);
      await selfOrderService.markPayAtCashier(token, order.order_id);

      const pendingInfo: PendingCashierPayment = {
        orderId: order.order_id,
        orderNumber: order.order_number,
        totalAmount: order.total_amount,
      };
      setPendingCashierPayment(pendingInfo);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(pendingStorageKey, JSON.stringify(pendingInfo));
      }

      setOrderId(order.order_id);
      setCart([]);
      setStep("status");
    } catch (err) {
      if (err instanceof SelfOrderApiError && err.status === 409) {
        if (err.code === "POS_ORDER_CANNOT_MODIFY") {
          toast.error(t("selfOrder.page.orderCannotModify"));
          return;
        }
        toast.error(t("selfOrder.page.outletClosed"));
        return;
      }
      toast.error(t("selfOrder.page.failedOrder"));
    } finally {
      setPendingAction(null);
    }
  }

  async function handleCancelOrder() {
    if (!trackedOrderId) return;
    try {
      await cancelOrder.mutateAsync();
      toast.success(t("selfOrder.status.cancelled"));
      setPendingCashierPayment(null);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(pendingStorageKey);
      }
      setOrderId(trackedOrderId);
      setStep("status");
    } catch {
      toast.error(t("selfOrder.status.cancelFailed"));
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
      <>
        <Confetti
          ref={confettiRef}
          manualstart={true}
          options={{
            particleCount: 150,
            spread: 90,
            origin: { y: 0.6 },
          }}
          className="fixed inset-0 z-50 h-full w-full pointer-events-none"
        />
        <SelfOrderStatus
          order={orderStatus}
          currency={tableInfo.config.currency}
          onCancelOrder={handleCancelOrder}
          isCancelling={cancelOrder.isPending}
          onOrderMore={closeTrackedOrder}
        />
      </>
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
        isPending={createOrder.isPending || pendingAction !== null}
        pendingAction={pendingAction}
      />
    );
  }

  // ── Step: menu ────────────────────────────────────────────────────────────────

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <div className="px-6 pt-10 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{tableInfo.outlet_name}</p>
            <h1 className="text-3xl font-extrabold tracking-tight">{tableInfo.table_label}</h1>
          </div>

          {visiblePendingCashierPayment && (
            <Button
              type="button"
              variant="outline"
              className="h-auto px-3 py-2 rounded-xl border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-left"
              onClick={() => {
                setOrderId(visiblePendingCashierPayment.orderId);
                setStep("status");
              }}
            >
              <div className="flex items-start gap-2">
                <Wallet className="h-4 w-4 mt-0.5 text-amber-700" />
                <div className="space-y-0.5">
                  <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
                    {t("selfOrder.page.unpaidPayment")}
                  </p>
                  <p className="text-xs text-foreground font-mono">#{visiblePendingCashierPayment.orderNumber}</p>
                  <p className="text-xs text-foreground">Rp {visiblePendingCashierPayment.totalAmount.toLocaleString("id-ID")}</p>
                </div>
              </div>
            </Button>
          )}
        </div>
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
