"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { X, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  useCreateOrder,
  usePOSOrder,
  useAddOrderItem,
  useRemoveOrderItem,
  usePOSConfig,
} from "../hooks/use-pos";
import { POSCatalogGrid } from "./pos-catalog-grid";
import { POSCartPanel } from "./pos-cart-panel";
import { POSPaymentModal } from "./pos-payment-modal";
import { VoidOrderDialog } from "./void-order-dialog";
import type { CartItem, POSCatalogItem, PosOrderStatus } from "../types";

interface POSTerminalContainerProps {
  outletId: string;
  initialTableId?: string;
  initialTableLabel?: string;
}

export function POSTerminalContainer({
  outletId,
  initialTableId,
  initialTableLabel,
}: POSTerminalContainerProps) {
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
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
  }, []);

  // Keep table context synchronized with the active order.
  useEffect(() => {
    if (!activeOrder?.table_label) return;
    setLinkedTable((prev) => ({
      id: activeOrder.table_id ?? prev?.id,
      label: activeOrder.table_label ?? prev?.label,
    }));
  }, [activeOrder?.table_id, activeOrder?.table_label]);

  // Order is intentionally NOT auto-created when a table is selected.
  // Creation is deferred until the cashier adds the first item (ensureOrder in handleAddItem).
  // This prevents ghost Rp 0 orders from appearing on the Live Table view when a table is merely opened.

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

  async function handleAddItem(item: POSCatalogItem) {
    if (addItem.isPending) return;
    const orderId = await ensureOrder();
    if (!orderId) return;

    // Optimistic cart update
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

    // Sync to backend
    await addItem.mutateAsync({
      orderId,
      data: { product_id: item.product_id, quantity: 1 },
    });
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
    // Find the order item id and remove 1 via update (handled via real order on next checkout)
  }

  function handleRemove(productId: string) {
    setCart((prev) => prev.filter((c) => c.product_id !== productId));
    if (!activeOrderId || !activeOrder) return;
    const orderItem = activeOrder.items.find((i) => i.product_id === productId);
    if (orderItem) {
      removeItem.mutate({ orderId: activeOrderId, itemId: orderItem.id });
    }
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Main panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Catalog — 2/3 */}
        <div className="flex-2 overflow-hidden border-r">
          <POSCatalogGrid
            outletId={outletId}
            onAddItem={handleAddItem}
          />
        </div>

        {/* Cart — 1/3 */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-[280px] max-w-[380px]">
          {/* Order header */}
          <div className="flex items-center justify-between px-3 py-2 border-b shrink-0 bg-muted/30">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <ReceiptText className="h-4 w-4" />
              {activeOrder ? `#${activeOrder.order_number}` : "New Order"}
            </div>
            {currentTableLabel && (
              <Badge variant="outline" className="text-[10px]">
                Table {currentTableLabel}
              </Badge>
            )}
            {activeOrderId && !isTerminalStatus && (
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-muted-foreground cursor-pointer"
                title="Void order"
                onClick={() => setVoidOpen(true)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            <POSCartPanel
              items={cart}
              config={config}
              onIncrement={handleIncrement}
              onDecrement={handleDecrement}
              onRemove={handleRemove}
              onCheckout={() => setPaymentOpen(true)}
              isPending={createOrder.isPending || addItem.isPending}
            />
          </div>
        </div>
      </div>

      {activeOrder && !isTerminalStatus && (
        <>
          <POSPaymentModal
            open={paymentOpen}
            onOpenChange={setPaymentOpen}
            order={activeOrder}
            config={config}
            onSuccess={handleOrderCompleted}
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
