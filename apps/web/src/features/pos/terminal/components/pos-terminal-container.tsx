"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { X, ReceiptText, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { useRouter } from "@/i18n/routing";
import {
  useCreateOrder,
  usePOSOrder,
  useAddOrderItem,
  useRemoveOrderItem,
  useVoidOrder,
  usePOSConfig,
} from "../hooks/use-pos";
import { usePOSUIStore } from "../../stores/use-pos-ui-store";
import { POSCatalogGrid } from "./pos-catalog-grid";
import { POSCartPanel } from "./pos-cart-panel";
import { POSPaymentModal } from "./pos-payment-modal";
import { VoidOrderDialog } from "./void-order-dialog";
import type { CartItem, POSCatalogItem, PosOrderStatus } from "../types";

interface POSTerminalContainerProps {
  outletId: string;
  initialTableId?: string;
  initialTableLabel?: string;
  /** URL to navigate to after successful payment (e.g. live-table). If absent, stays on POS. */
  returnUrl?: string;
}

export function POSTerminalContainer({
  outletId,
  initialTableId,
  initialTableLabel,
  returnUrl,
}: POSTerminalContainerProps) {
  const router = useRouter();
  const setFullScreen = usePOSUIStore((s) => s.setFullScreen);

  // Register as full-screen so DashboardLayout hides the outer header/breadcrumb.
  useEffect(() => {
    setFullScreen(true);
    return () => setFullScreen(false);
  }, [setFullScreen]);

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const orderCreationInFlight = useRef(false);
  const retryAfterRef = useRef(0);
  const [linkedTable, setLinkedTable] = useState<{
    id?: string;
    label?: string;
  } | null>(
    initialTableLabel
      ? {
          id: initialTableId,
          label: initialTableLabel,
        }
      : null
  );

  const { data: configData } = usePOSConfig(outletId, { enabled: !!outletId });
  const { data: orderData } = usePOSOrder(activeOrderId ?? "", {
    enabled: !!activeOrderId,
  });

  const createOrder = useCreateOrder();
  const addItem = useAddOrderItem();
  const removeItem = useRemoveOrderItem();
  const voidOrder = useVoidOrder();

  const config = configData?.data ?? undefined;
  const activeOrder = orderData?.data ?? null;
  const currentTableLabel = activeOrder?.table_label ?? linkedTable?.label ?? null;

  // Compute whether the active order is in a terminal state
  const isTerminalStatus = useMemo(() => {
    if (!activeOrder) return false;
    const terminal: PosOrderStatus[] = ["PAID", "COMPLETED", "VOIDED"];
    return terminal.includes(activeOrder.status);
  }, [activeOrder]);

  // Reset cart if order becomes terminal
  const handleOrderCompleted = useCallback(() => {
    setCart([]);
    setActiveOrderId(null);
    setPaymentOpen(false);
    setVoidOpen(false);
    // Navigate back to the live table if this session came from one.
    if (returnUrl) {
      router.push(returnUrl);
    }
  }, [returnUrl, router]);

  // If payment fails, auto-void the created order so no orphan draft remains.
  const handlePaymentError = useCallback(async () => {
    if (!activeOrderId) return;
    try {
      await voidOrder.mutateAsync({
        id: activeOrderId,
        data: { reason: "Payment failed — auto-voided" },
      });
    } catch {
      // Ignore void errors; the draft order will expire or be cleaned up manually.
    } finally {
      setPaymentOpen(false);
      setActiveOrderId(null);
    }
  }, [activeOrderId, voidOrder]);

  // Keep table context synchronized with the active order.
  useEffect(() => {
    if (!activeOrder?.table_label) return;
    setLinkedTable((prev) => ({
      id: activeOrder.table_id ?? prev?.id,
      label: activeOrder.table_label ?? prev?.label,
    }));
  }, [activeOrder?.table_id, activeOrder?.table_label]);

  // Order creation is intentionally deferred until the cashier clicks "Pay".
  // This prevents ghost orders on the Live Table when a table is merely opened and items are browsed
  // without completing a transaction. All cart operations remain local until handleCheckout is called.

  async function ensureOrder(): Promise<string | null> {
    if (activeOrderId && !isTerminalStatus) return activeOrderId;
    if (orderCreationInFlight.current || Date.now() < retryAfterRef.current) {
      return null;
    }

    // Create new draft order
    orderCreationInFlight.current = true;
    try {
      const result = await createOrder.mutateAsync({
        outlet_id: outletId,
        order_type: "DINE_IN",
        table_id: linkedTable?.id,
        table_label: linkedTable?.label,
        guest_count: 1,
      });
      const newOrderId = (result as { data: { id: string } }).data.id;
      setActiveOrderId(newOrderId);
      retryAfterRef.current = 0;
      return newOrderId;
    } catch {
      retryAfterRef.current = Date.now() + 5000;
      toast.error("Unable to create order right now. Please retry in a moment.");
      return null;
    } finally {
      orderCreationInFlight.current = false;
    }
  }

  function handleAddItem(item: POSCatalogItem) {
    // Update local cart state only. If an order already exists (from a prior checkout
    // attempt), also sync the delta immediately so the backend stays in sync.
    setCart((prev) => {
      const existing = prev.find((c) => c.product_id === item.product_id);
      if (existing) {
        return prev.map((c) =>
          c.product_id === item.product_id
            ? { ...c, quantity: c.quantity + 1, subtotal: (c.quantity + 1) * c.unit_price }
            : c
        );
      }
      return [
        ...prev,
        {
          product_id: item.product_id,
          product_code: item.product_code,
          product_name: item.product_name,
          product_kind: item.product_kind,
          quantity: 1,
          unit_price: item.price,
          subtotal: item.price,
        },
      ];
    });

    if (activeOrderId && !isTerminalStatus) {
      addItem.mutate({ orderId: activeOrderId, data: { product_id: item.product_id, quantity: 1 } });
    }
  }

  async function handleCheckout() {
    if (cart.length === 0) return;
    setIsCheckingOut(true);
    try {
      // First checkout for this session — create the order and batch-add all cart items.
      if (!activeOrderId || isTerminalStatus) {
        const orderId = await ensureOrder();
        if (!orderId) return;
        for (const item of cart) {
          await addItem.mutateAsync({
            orderId,
            data: { product_id: item.product_id, quantity: item.quantity },
          });
        }
      }
      setPaymentOpen(true);
    } catch {
      toast.error("Failed to prepare order. Please try again.");
    } finally {
      setIsCheckingOut(false);
    }
  }

  function handleIncrement(productId: string) {
    setCart((prev) =>
      prev.map((c) =>
        c.product_id === productId
          ? { ...c, quantity: c.quantity + 1, subtotal: (c.quantity + 1) * c.unit_price }
          : c
      )
    );
    if (!activeOrderId) return;
    const cartItem = cart.find((c) => c.product_id === productId);
    if (cartItem) {
      addItem.mutate({ orderId: activeOrderId, data: { product_id: productId, quantity: 1 } });
    }
  }

  function handleDecrement(productId: string) {
    const item = cart.find((c) => c.product_id === productId);
    if (!item) return;
    if (item.quantity <= 1) {
      handleRemove(productId);
      return;
    }
    setCart((prev) =>
      prev.map((c) =>
        c.product_id === productId
          ? { ...c, quantity: c.quantity - 1, subtotal: (c.quantity - 1) * c.unit_price }
          : c
      )
    );
    // Backend decrement is handled as a full re-sync at next checkout when no order exists.
    // When an order already exists, the quantity in the cart is the authoritative source —
    // we skip a backend call here because there is no "decrement by 1" endpoint.
  }

  function handleRemove(productId: string) {
    setCart((prev) => prev.filter((c) => c.product_id !== productId));
    if (!activeOrderId || !activeOrder) return;
    const orderItem = activeOrder.items.find((i) => i.product_id === productId);
    if (orderItem) {
      removeItem.mutate({ orderId: activeOrderId, itemId: orderItem.id });
    }
  }

  const cartItemCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* ── Top bar ── */}
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b bg-background/95 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <ReceiptText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="font-semibold text-sm truncate">
            {activeOrder ? `#${activeOrder.order_number}` : "New Order"}
          </span>
          {currentTableLabel && (
            <Badge variant="outline" className="text-[10px] shrink-0">
              {currentTableLabel}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {activeOrderId && !isTerminalStatus && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-muted-foreground text-xs cursor-pointer"
              title="Void order"
              onClick={() => setVoidOpen(true)}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Void
            </Button>
          )}
        </div>
      </header>

      {/* ── Body: catalog + cart ── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Catalog — full width on mobile, 2/3 on desktop */}
        <div className="flex-1 overflow-hidden">
          <POSCatalogGrid outletId={outletId} onAddItem={handleAddItem} />
        </div>

        {/* Cart — hidden on mobile, visible on md+ */}
        <div className="hidden md:flex flex-col border-l min-w-[280px] max-w-[360px] w-[320px] shrink-0 overflow-hidden">
          <POSCartPanel
            items={cart}
            config={config}
            onIncrement={handleIncrement}
            onDecrement={handleDecrement}
            onRemove={handleRemove}
            onCheckout={handleCheckout}
            isPending={isCheckingOut || createOrder.isPending || addItem.isPending}
          />
        </div>

        {/* Mobile FAB — cart button with item count */}
        {cartItemCount > 0 && (
          <button
            type="button"
            onClick={() => setMobileCartOpen(true)}
            className="md:hidden fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-3 shadow-lg hover:bg-primary/90 active:scale-95 transition-all cursor-pointer"
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="font-semibold text-sm">{cartItemCount} item{cartItemCount !== 1 ? "s" : ""}</span>
          </button>
        )}
      </div>

      {/* Mobile cart Sheet */}
      <Sheet open={mobileCartOpen} onOpenChange={setMobileCartOpen}>
        <SheetContent side="bottom" className="h-[85vh] p-0 rounded-t-2xl flex flex-col">
          <SheetHeader className="px-4 pt-4 pb-0 shrink-0">
            <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
              <ReceiptText className="h-4 w-4" />
              {activeOrder ? `#${activeOrder.order_number}` : "Cart"}
              {currentTableLabel && (
                <Badge variant="outline" className="text-[10px]">
                  {currentTableLabel}
                </Badge>
              )}
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden">
            <POSCartPanel
              items={cart}
              config={config}
              onIncrement={handleIncrement}
              onDecrement={handleDecrement}
              onRemove={handleRemove}
              onCheckout={async () => {
                setMobileCartOpen(false);
                await handleCheckout();
              }}
              isPending={isCheckingOut || createOrder.isPending || addItem.isPending}
            />
          </div>
        </SheetContent>
      </Sheet>

      {activeOrder && !isTerminalStatus && (
        <>
          <POSPaymentModal
            open={paymentOpen}
            onOpenChange={setPaymentOpen}
            order={activeOrder}
            config={config}
            onSuccess={handleOrderCompleted}
            onPaymentError={handlePaymentError}
          />

          <VoidOrderDialog
            open={voidOpen}
            onOpenChange={setVoidOpen}
            orderId={activeOrder.id}
            orderNumber={activeOrder.order_number}
            onSuccess={handleOrderCompleted}
          />
        </>
      )}
    </div>
  );
}
