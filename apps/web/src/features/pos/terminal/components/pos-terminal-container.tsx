"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { useTranslations } from "next-intl";
import {
  useCreateOrder,
  usePOSOrder,
  useVoidOrder,
  usePOSConfig,
  useDeleteOrder,
  usePOSOrderList,
  usePOSCatalog,
  useSyncOrderItems,
  useAssignTable,
  posKeys,
} from "../hooks/use-pos";
import { usePOSUIStore } from "../../stores/use-pos-ui-store";
import { POSCatalogGrid } from "./pos-catalog-grid";
import { POSCartPanel } from "./pos-cart-panel";
import { POSPaymentModal } from "./pos-payment-modal";
import { POSReceiptDialog } from "./pos-receipt-dialog";
import { VoidOrderDialog } from "./void-order-dialog";
import { PosLoyaltyEnrollModal } from "@/features/loyalty/components/pos-loyalty-enroll-modal";
import { usePosWs } from "../../fb/live-table/hooks/use-pos-ws";
import type { CartItem, POSCatalogItem, PosOrderStatus, POSOrder } from "../types";
import type { LoyaltyMember, LoyaltyMemberLookup, RewardConfig } from "@/features/loyalty/types";
import type { AxiosError } from "axios";

type POSOrderListCache = { data?: POSOrder[] };

/** Extract a human-readable message from an Axios API error or generic Error. */
function extractApiError(err: unknown, fallback: string): { title: string; description?: string } {
  if (err && typeof err === "object") {
    const axiosErr = err as AxiosError<{ error?: { message?: string; code?: string } }>;
    const serverMessage = axiosErr.response?.data?.error?.message;
    const serverCode = axiosErr.response?.data?.error?.code;
    if (serverMessage && serverCode !== "INTERNAL_SERVER_ERROR") {
      return { title: fallback, description: serverMessage };
    }
    if (serverCode === "INTERNAL_SERVER_ERROR") {
      return { title: fallback, description: "Server error — please try again in a moment." };
    }
    if (axiosErr.message) {
      return { title: fallback, description: axiosErr.message };
    }
  }
  return { title: fallback };
}

function mapLookupToMember(lookup: LoyaltyMemberLookup): LoyaltyMember | undefined {
  if (!lookup.member_id || !lookup.customer_name) {
    return undefined;
  }

  return {
    id: lookup.member_id,
    customer_id: lookup.customer_id ?? "",
    customer_name: lookup.customer_name,
    customer_phone: undefined,
    program_id: "",
    program_name: undefined,
    member_code: lookup.member_code ?? "",
    current_tier: lookup.current_tier ?? "",
    tier_badge_color: lookup.tier_badge_color ?? "#CD7F32",
    point_balance: lookup.point_balance ?? 0,
    lifetime_points: 0,
    total_transactions: 0,
    joined_at: "",
  };
}

interface POSTerminalContainerProps {
  outletId: string;
  outletName: string;
  initialTableId?: string;
  initialTableLabel?: string;
  initialDraftId?: string;
  /** URL to navigate to after successful payment (e.g. live-table). If absent, stays on POS. */
  returnUrl?: string;
  hasFloorLayout?: boolean;
}

export function POSTerminalContainer({
  outletId,
  outletName,
  initialTableId,
  initialTableLabel,
  initialDraftId,
  returnUrl,
  hasFloorLayout = false,
}: POSTerminalContainerProps) {
  const router = useRouter();
  const t = useTranslations("posTerminal");
  const setFullScreen = usePOSUIStore((s) => s.setFullScreen);

  // Register as full-screen so DashboardLayout hides the outer header/breadcrumb.
  useEffect(() => {
    setFullScreen(true);
    return () => setFullScreen(false);
  }, [setFullScreen]);

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<typeof activeOrder | null>(null);
  const [receiptCustomerName, setReceiptCustomerName] = useState<string | undefined>();
  const [receiptCustomerPhone, setReceiptCustomerPhone] = useState<string | undefined>();
  const [receiptTender, setReceiptTender] = useState<number | undefined>();
  const [voidOpen, setVoidOpen] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [preparedOrder, setPreparedOrder] = useState<POSOrder | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);

  // Loyalty state — reset on each new transaction
  const [loyaltyLookup, setLoyaltyLookup] = useState<LoyaltyMemberLookup | undefined>();
  const [loyaltyMember, setLoyaltyMember] = useState<LoyaltyMember | undefined>();
  const [loyaltyRewards, setLoyaltyRewards] = useState<RewardConfig[]>([]);
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [enrollDefaultName, setEnrollDefaultName] = useState("");

  const { data: configData } = usePOSConfig(outletId, { enabled: !!outletId });
  const { data: orderData } = usePOSOrder(activeOrderId ?? "", {
    enabled: !!activeOrderId,
  });
  const realtimeSuppressToastEvents = useMemo(
    () => ["pos.new_customer_order", "pos.payment_confirmed", "pos.order_status_changed", "pos.order_deleted"],
    []
  );
  usePosWs(outletId, { suppressToastEvents: realtimeSuppressToastEvents });

  const { data: catalogData } = usePOSCatalog(outletId, { enabled: !!outletId });
  const catalogItems = useMemo(() => catalogData?.data ?? [], [catalogData]);

  const { data: draftOrdersData, refetch: refetchDrafts } = usePOSOrderList(
    {
      outlet_id: outletId,
    }
  );

  const drafts = useMemo(() => {
    if (hasFloorLayout) return [];
    return (draftOrdersData?.data ?? []).filter(
      (order) => order.status === "DRAFT" && !order.table_id && order.id !== activeOrderId
    );
  }, [draftOrdersData, hasFloorLayout, activeOrderId]);

  // When opening terminal for a specific table, automatically load any existing draft order for that table
  useEffect(() => {
    if (initialTableId && draftOrdersData?.data) {
      const existingTableDraft = draftOrdersData.data.find(
        (order) =>
          order.table_id === initialTableId &&
          (order.status === "DRAFT" ||
            order.status === "IN_PROGRESS" ||
            order.status === "READY" ||
            order.status === "WAITING_PAYMENT")
      );
      if (existingTableDraft && existingTableDraft.id !== activeOrderId) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setActiveOrderId(existingTableDraft.id);
        const mappedCart: CartItem[] = existingTableDraft.items.map((item) => {
          const catalogItem = catalogItems.find((p) => p.product_id === item.product_id);
          return {
            product_id: item.product_id,
            product_name: item.product_name,
            product_code: item.product_code || "",
            product_kind: catalogItem?.product_kind || "STOCK",
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.subtotal,
            notes: item.notes ?? undefined,
          };
        });
        setCart(mappedCart);
        if (existingTableDraft.customer_id) {
          setLoyaltyLookup({
            found: true,
            member_id: existingTableDraft.customer_id,
            customer_name: existingTableDraft.customer_name || "",
          });
        } else {
          setLoyaltyLookup(undefined);
        }
      }
    }
  }, [initialTableId, draftOrdersData?.data, catalogItems, activeOrderId]);

  // When opening terminal with an initial draft ID (e.g. from Live Table "Apply to Table")
  useEffect(() => {
    if (initialDraftId && draftOrdersData?.data) {
      const targetDraft = draftOrdersData.data.find((order) => order.id === initialDraftId);
      if (targetDraft && targetDraft.id !== activeOrderId) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setActiveOrderId(targetDraft.id);
        const mappedCart: CartItem[] = targetDraft.items.map((item) => {
          const catalogItem = catalogItems.find((p) => p.product_id === item.product_id);
          return {
            product_id: item.product_id,
            product_name: item.product_name,
            product_code: item.product_code || "",
            product_kind: catalogItem?.product_kind || "STOCK",
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.subtotal,
            notes: item.notes ?? undefined,
          };
        });
        setCart(mappedCart);
        if (targetDraft.customer_id) {
          setLoyaltyLookup({
            found: true,
            member_id: targetDraft.customer_id,
            customer_name: targetDraft.customer_name || "",
          });
        }
      }
    }
  }, [initialDraftId, draftOrdersData?.data, catalogItems, activeOrderId]);

  const handleApplyDraft = useCallback(
    async (draft: POSOrder) => {
      const mappedCart: CartItem[] = draft.items.map((item) => {
        const catalogItem = catalogItems.find((p) => p.product_id === item.product_id);
        return {
          product_id: item.product_id,
          product_name: item.product_name,
          product_code: item.product_code || "",
          product_kind: catalogItem?.product_kind || "STOCK",
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
          notes: item.notes ?? undefined,
        };
      });
      setCart(mappedCart);
      setActiveOrderId(draft.id);

      if (draft.customer_id) {
        setLoyaltyLookup({
          found: true,
          member_id: draft.customer_id,
          customer_name: draft.customer_name || "",
        });
      } else {
        setLoyaltyLookup(undefined);
      }
      toast.success(t("savedTransactions.applySuccess"));
    },
    [t, catalogItems]
  );

  const qc = useQueryClient();
  const createOrder = useCreateOrder();
  const syncItems = useSyncOrderItems();
  const assignTable = useAssignTable();
  const voidOrder = useVoidOrder();
  const deleteOrder = useDeleteOrder();

  const handleDeleteDraft = useCallback(
    async (draftId: string) => {
      try {
        await deleteOrder.mutateAsync(draftId);
        toast.success(t("savedTransactions.deleteSuccess"));
        refetchDrafts();
      } catch (err) {
        const { title, description } = extractApiError(err, t("savedTransactions.deleteFailed"));
        toast.error(title, { description });
      }
    },
    [deleteOrder, refetchDrafts, t]
  );

  const config = configData?.data ?? undefined;
  const activeOrder = orderData?.data ?? null;
  const linkedTable = useMemo(() => {
    if (activeOrder?.table_label) {
      return {
        id: activeOrder.table_id ?? initialTableId,
        label: activeOrder.table_label,
      };
    }

    if (initialTableLabel) {
      return {
        id: initialTableId,
        label: initialTableLabel,
      };
    }

    return null;
  }, [activeOrder?.table_id, activeOrder?.table_label, initialTableId, initialTableLabel]);
  const currentTableLabel = activeOrder?.table_label ?? linkedTable?.label ?? null;

  // Compute whether the active order is in a terminal state
  const isTerminalStatus = useMemo(() => {
    if (!activeOrder) return false;
    const terminal: PosOrderStatus[] = ["PAID", "COMPLETED", "VOIDED"];
    return terminal.includes(activeOrder.status);
  }, [activeOrder]);

  // Reset cart if order becomes terminal
  const handleOrderCompleted = useCallback(
    (customerName?: string, customerPhone?: string, tenderAmount?: number) => {
      // Snapshot the order for the receipt before resetting state.
      const snapshotOrder = preparedOrder || activeOrder;
      if (snapshotOrder) {
        setReceiptOrder(snapshotOrder);
        setReceiptCustomerName(customerName);
        setReceiptCustomerPhone(customerPhone);
        setReceiptTender(tenderAmount);
      }
      setPreparedOrder(null);
      setCart([]);
      setActiveOrderId(null);
      setPaymentOpen(false);
      setVoidOpen(false);
      // Reset loyalty state for next transaction
      setLoyaltyLookup(undefined);
      setLoyaltyMember(undefined);
      setLoyaltyRewards([]);
      // Navigation happens only when the receipt is closed (see handleReceiptClose below),
      // so the receipt dialog remains visible over the live-table background.
      if (!hasFloorLayout) {
        refetchDrafts();
      }
    },
    [activeOrder, preparedOrder, hasFloorLayout, refetchDrafts],
  );

  const handleOrderVoided = useCallback(() => {
    setVoidOpen(false);
    setCart([]);
    setActiveOrderId(null);
    setPreparedOrder(null);
    setPaymentOpen(false);
    setLoyaltyLookup(undefined);
    setLoyaltyMember(undefined);
    setLoyaltyRewards([]);
    toast.success("Order voided successfully");
    if (hasFloorLayout) {
      const destination = returnUrl || `/pos/fb/live-table?outlet_id=${outletId}`;
      router.push(destination);
    } else {
      refetchDrafts();
    }
  }, [hasFloorLayout, returnUrl, outletId, router, refetchDrafts]);

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
      setPreparedOrder(null);
      setPaymentOpen(false);
      setActiveOrderId(null);
    }
  }, [activeOrderId, voidOrder]);

  // Compute a map of product_id → total cart qty so the catalog can show live stock
  const cartQuantities = useMemo<Record<string, number>>(() => {
    return cart.reduce<Record<string, number>>((acc, item) => {
      acc[item.product_id] = item.quantity;
      return acc;
    }, {});
  }, [cart]);

  function handleAddItem(item: POSCatalogItem) {
    // Pure local UI update only — zero API calls on clicks to prevent backend waterfall/traffic spikes
    setPreparedOrder(null);
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
          image_url: item.image_url,
          quantity: 1,
          unit_price: item.price,
          subtotal: item.price,
        },
      ];
    });
  }

  const [isSavingDraft, setIsSavingDraft] = useState(false);

  async function handleSaveDraft() {
    if (cart.length === 0) return;
    setIsSavingDraft(true);
    setPreparedOrder(null);
    try {
      const itemsPayload = cart.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        notes: item.notes,
      }));

      let savedDraft: POSOrder | null = null;

      if (activeOrderId) {
        const currentStatus = activeOrder?.status;
        if (!currentStatus || currentStatus === "DRAFT") {
          // If already a draft order (even if previously assigned to a table):
          // 1. Unassign table to free the table and return it to the outlet draft list.
          await assignTable.mutateAsync({
            orderId: activeOrderId,
            data: { table_id: "", table_label: "" },
          });
          // 2. Synchronize all cart items in a single atomic batch.
          const syncRes = await syncItems.mutateAsync({
            orderId: activeOrderId,
            data: { items: itemsPayload },
          });
          savedDraft = syncRes.data;
        } else {
          // If in a non-draft active status, void previous order and create new outlet draft
          try {
            await voidOrder.mutateAsync({
              id: activeOrderId,
              data: { reason: "Saved as outlet-level draft" },
            });
          } catch {
            // Swallow
          }
          const createRes = await createOrder.mutateAsync({
            outlet_id: outletId,
            order_type: "DINE_IN",
            guest_count: 1,
            items: itemsPayload,
          });
          savedDraft = (createRes as { data: POSOrder }).data;
        }
      } else {
        // No prior active order: create new draft with items in 1 single request
        const createRes = await createOrder.mutateAsync({
          outlet_id: outletId,
          order_type: "DINE_IN",
          guest_count: 1,
          items: itemsPayload,
        });
        savedDraft = (createRes as { data: POSOrder }).data;
      }

      if (savedDraft) {
        // Directly upsert into list caches with table_id = null so it immediately appears in the drafts drawer
        const normalizedDraft: POSOrder = {
          ...savedDraft,
          table_id: null,
          table_label: null,
        };
        qc.setQueriesData<POSOrderListCache>(
          { queryKey: [...posKeys.orders(), "list"] },
          (current) => {
            if (!current?.data) return { data: [normalizedDraft] };
            const exists = current.data.some((o) => o.id === normalizedDraft.id);
            return {
              ...current,
              data: exists
                ? current.data.map((o) => (o.id === normalizedDraft.id ? normalizedDraft : o))
                : [normalizedDraft, ...current.data],
            };
          },
        );
        qc.setQueryData(posKeys.order(savedDraft.id), { data: normalizedDraft });
      }

      toast.success("Draft saved successfully.");
      setCart([]);
      setActiveOrderId(null);

      if (hasFloorLayout) {
        qc.invalidateQueries({ queryKey: posKeys.orders(), refetchType: "none" });
        const destination = returnUrl || `/pos/fb/live-table?outlet_id=${outletId}`;
        router.push(destination);
      } else {
        await qc.invalidateQueries({ queryKey: posKeys.orders(), refetchType: "active" });
        refetchDrafts();
      }
    } catch (err) {
      const { title, description } = extractApiError(err, "Failed to save draft order.");
      toast.error(title, { description });
    } finally {
      setIsSavingDraft(false);
    }
  }

  async function handleCheckout() {
    if (cart.length === 0 || isCheckingOut) return;
    setIsCheckingOut(true);
    try {
      const itemsPayload = cart.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        notes: item.notes,
      }));

      const targetOrderId = (!activeOrderId || isTerminalStatus) ? null : activeOrderId;
      let orderToPay: POSOrder | null = null;

      if (!targetOrderId) {
        const createResult = await createOrder.mutateAsync({
          outlet_id: outletId,
          order_type: "DINE_IN",
          table_id: linkedTable?.id,
          table_label: linkedTable?.label,
          guest_count: 1,
          items: itemsPayload,
        });
        orderToPay = (createResult as { data: POSOrder }).data;
        setActiveOrderId(orderToPay.id);
      } else {
        if (linkedTable?.id && (!activeOrder?.table_id || activeOrder.table_id !== linkedTable.id)) {
          await assignTable.mutateAsync({
            orderId: targetOrderId,
            data: { table_id: linkedTable.id, table_label: linkedTable.label },
          });
        }
        const syncResult = await syncItems.mutateAsync({
          orderId: targetOrderId,
          data: { items: itemsPayload },
        });
        orderToPay = syncResult.data;
      }

      setPreparedOrder(orderToPay);
      setPaymentOpen(true);
    } catch (err) {
      const { title, description } = extractApiError(err, "Failed to prepare order.");
      toast.error(title, { description });
    } finally {
      setIsCheckingOut(false);
    }
  }

  function handleIncrement(productId: string) {
    setPreparedOrder(null);
    setCart((prev) =>
      prev.map((c) =>
        c.product_id === productId
          ? { ...c, quantity: c.quantity + 1, subtotal: (c.quantity + 1) * c.unit_price }
          : c
      )
    );
  }

  function handleDecrement(productId: string) {
    setPreparedOrder(null);
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
  }

  function handleRemove(productId: string) {
    setPreparedOrder(null);
    setCart((prev) => prev.filter((c) => c.product_id !== productId));
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
        <div className="flex-1 flex flex-col overflow-hidden">
          {!hasFloorLayout && drafts.length > 0 && (
            <div className="px-4 pt-3 pb-2 bg-muted/30 border-b flex flex-col gap-2 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("savedTransactions.directDraftsLabel")} ({drafts.length})
                </span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
                {drafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="flex items-center gap-3 bg-card border rounded-lg px-3 py-2 text-xs shadow-sm hover:border-primary/50 transition-all duration-200 shrink-0"
                  >
                    <div
                      className="cursor-pointer flex flex-col min-w-[75px]"
                      onClick={() => handleApplyDraft(draft)}
                    >
                      <span className="font-semibold text-foreground">
                        #{draft.order_number}
                      </span>
                      <span className="text-[9px] text-muted-foreground truncate max-w-[100px]">
                        {draft.customer_name || t("savedTransactions.walkIn")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 border-l pl-3">
                      <span className="font-bold text-primary">
                        Rp {draft.total_amount.toLocaleString("id-ID")}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 rounded-full hover:bg-destructive/10 hover:text-destructive text-muted-foreground shrink-0 cursor-pointer"
                        onClick={() => handleDeleteDraft(draft.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            <POSCatalogGrid outletId={outletId} onAddItem={handleAddItem} cartQuantities={cartQuantities} />
          </div>
        </div>

        {/* Cart — hidden on mobile, visible on md+ */}
        <div className="hidden md:flex flex-col border-l min-w-[280px] max-w-[360px] w-[320px] shrink-0 overflow-hidden">
          <POSCartPanel
            items={cart}
            config={config}
            outletId={outletId}
            loyaltyLookup={loyaltyLookup}
            onLoyaltyMemberFound={(lookup) => {
              setLoyaltyLookup(lookup);
              const member = lookup.found ? mapLookupToMember(lookup) : undefined;
              setLoyaltyMember(member);
              setLoyaltyRewards(lookup.available_rewards ?? []);
            }}
            onLoyaltyEnrollRequest={(name) => {
              setEnrollDefaultName(name);
              setEnrollModalOpen(true);
            }}
            onLoyaltyClear={() => {
              setLoyaltyLookup(undefined);
              setLoyaltyMember(undefined);
              setLoyaltyRewards([]);
            }}
            onIncrement={handleIncrement}
            onDecrement={handleDecrement}
            onRemove={handleRemove}
            onCheckout={handleCheckout}
            onSaveDraft={handleSaveDraft}
            isSavingDraft={isSavingDraft}
            isPending={isCheckingOut || createOrder.isPending || syncItems.isPending}
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
              outletId={outletId}
              loyaltyLookup={loyaltyLookup}
              onLoyaltyMemberFound={(lookup) => {
                setLoyaltyLookup(lookup);
                const member = lookup.found ? mapLookupToMember(lookup) : undefined;
                setLoyaltyMember(member);
                setLoyaltyRewards(lookup.available_rewards ?? []);
              }}
              onLoyaltyEnrollRequest={(name) => {
                setEnrollDefaultName(name);
                setMobileCartOpen(false);
                setEnrollModalOpen(true);
              }}
              onLoyaltyClear={() => {
                setLoyaltyLookup(undefined);
                setLoyaltyMember(undefined);
                setLoyaltyRewards([]);
              }}
              onIncrement={handleIncrement}
              onDecrement={handleDecrement}
              onRemove={handleRemove}
              onCheckout={async () => {
                setMobileCartOpen(false);
                await handleCheckout();
              }}
              onSaveDraft={async () => {
                setMobileCartOpen(false);
                await handleSaveDraft();
              }}
              isSavingDraft={isSavingDraft}
              isPending={isCheckingOut || createOrder.isPending || syncItems.isPending}
            />
          </div>
        </SheetContent>
      </Sheet>

      {(preparedOrder || (activeOrder && !isTerminalStatus)) && (
        <>
          <POSPaymentModal
            open={paymentOpen}
            onOpenChange={(open) => {
              setPaymentOpen(open);
              if (!open) {
                setPreparedOrder(null);
              }
            }}
            order={preparedOrder || activeOrder!}
            config={config}
            onSuccess={(cName, cPhone, tender) => handleOrderCompleted(cName, cPhone, tender)}
            onPaymentError={handlePaymentError}
            loyaltyMember={loyaltyMember}
            loyaltyRewards={loyaltyRewards}
          />

          {activeOrder && (
            <VoidOrderDialog
              open={voidOpen}
              onOpenChange={setVoidOpen}
              orderId={activeOrder.id}
              orderNumber={activeOrder.order_number}
              onSuccess={handleOrderVoided}
            />
          )}
        </>
      )}

      {/* Loyalty enrollment modal — triggered from the cart lookup */}
      <PosLoyaltyEnrollModal
        open={enrollModalOpen}
        onOpenChange={setEnrollModalOpen}
        outletId={outletId}
        posOrderId={activeOrderId ?? undefined}
        defaultName={enrollDefaultName}
        onEnrolled={(member) => {
          setLoyaltyMember(member);
          setLoyaltyLookup({
            found: true,
            member_id: member.id,
            member_code: member.member_code,
            customer_id: member.customer_id,
            customer_name: member.customer_name,
            current_tier: member.current_tier,
            tier_badge_color: member.tier_badge_color,
            point_balance: member.point_balance,
          });
        }}
      />

      {/* Receipt dialog — shown after successful payment; navigates to returnUrl when closed */}
      {receiptOrder && (
        <POSReceiptDialog
          open={!!receiptOrder}
          onClose={() => {
            setReceiptOrder(null);
            setReceiptCustomerName(undefined);
            setReceiptCustomerPhone(undefined);
            setReceiptTender(undefined);
            // Navigate back to live table only after the receipt is dismissed
            if (returnUrl) {
              router.push(returnUrl);
            }
          }}
          order={receiptOrder}
          customerName={receiptCustomerName}
          customerPhone={receiptCustomerPhone}
          outletName={outletName}
          tenderAmount={receiptTender}
        />
      )}
    </div>
  );
}
