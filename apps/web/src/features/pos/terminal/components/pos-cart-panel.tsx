"use client";

import { useState } from "react";
import { Minus, Plus, Trash2, ShoppingCart, Package, UtensilsCrossed } from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency, resolveImageUrl } from "@/lib/utils";
import { PosLoyaltyLookup } from "@/features/loyalty/components/pos-loyalty-lookup";
import type { CartItem, POSConfig } from "../types";
import type { LoyaltyMemberLookup } from "@/features/loyalty/types";

function normalizeRate(rate: number | undefined, fallback: number): number {
  if (rate === undefined || Number.isNaN(rate)) return fallback;
  if (rate <= 0) return 0;
  if (rate > 1) return rate / 100;
  return rate;
}

function formatRatePercent(rate: number): string {
  const percent = rate * 100;
  if (Number.isInteger(percent)) return `${percent}`;
  return percent.toFixed(2).replace(/\.?0+$/, "");
}

interface POSCartPanelProps {
  items: CartItem[];
  config?: POSConfig;
  outletId?: string;
  loyaltyLookup?: LoyaltyMemberLookup;
  onLoyaltyMemberFound?: (lookup: LoyaltyMemberLookup) => void;
  onLoyaltyEnrollRequest?: (name: string) => void;
  onLoyaltyClear?: () => void;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  onRemove: (productId: string) => void;
  onCheckout: () => void;
  isPending?: boolean;
  onSaveDraft?: () => void;
  isSavingDraft?: boolean;
}

interface CartItemRowProps {
  item: CartItem;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  onRemove: (productId: string) => void;
}

function CartItemRow({ item, onIncrement, onDecrement, onRemove }: CartItemRowProps) {
  const [imageBroken, setImageBroken] = useState(false);
  const resolvedUrl = resolveImageUrl(item.image_url);
  const showImage = !!resolvedUrl && !imageBroken;
  const FallbackIcon = item.product_kind === "STOCK" ? Package : UtensilsCrossed;

  // Swipe to delete logic
  const x = useMotionValue(0);
  const background = useTransform(
    x,
    [-100, -50, 0],
    ["#ef4444", "#ef4444", "rgba(239, 68, 68, 0)"]
  );
  const iconScale = useTransform(x, [-100, -50, 0], [1.2, 1, 0.5]);
  const iconOpacity = useTransform(x, [-60, -30, 0], [1, 0.5, 0]);

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x < -80) {
      onRemove(item.product_id);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl mb-1 group w-full">
      {/* Background Action */}
      <motion.div
        style={{ background }}
        className="absolute inset-0 flex items-center justify-end px-6 rounded-xl"
      >
        <motion.div style={{ scale: iconScale, opacity: iconOpacity }}>
          <Trash2 className="h-5 w-5 text-white" />
        </motion.div>
      </motion.div>

      {/* Main Content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={0.05}
        dragTransition={{ bounceStiffness: 600, bounceDamping: 30 }}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative grid grid-cols-[40px_1fr_auto] items-center gap-2.5 py-3 px-3 bg-background border rounded-xl touch-none cursor-pointer active:cursor-grabbing transition-colors hover:border-primary/20 w-full"
      >
        {/* Product Image */}
        <div className="h-10 w-10 rounded-lg border bg-muted/30 overflow-hidden shrink-0 flex items-center justify-center">
          {showImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolvedUrl}
              alt={item.product_name}
              className="h-full w-full object-cover"
              onError={() => setImageBroken(true)}
            />
          ) : (
            <FallbackIcon className="h-4 w-4 text-muted-foreground/30" />
          )}
        </div>

        {/* Item Info */}
        <div className="min-w-0 flex flex-col justify-center">
          <p
            className="text-[13px] font-semibold leading-tight line-clamp-1 text-foreground"
            title={item.product_name}
          >
            {item.product_name}
          </p>
          <div className="flex flex-wrap items-center gap-x-1.5 mt-0.5 leading-none">
            <span className="text-[10px] text-muted-foreground font-medium">
              {formatCurrency(item.unit_price)} × {item.quantity}
            </span>
            <span className="text-[11px] font-bold text-primary">
              {formatCurrency(item.subtotal)}
            </span>
          </div>
        </div>

        {/* Quantity Controls */}
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full cursor-pointer hover:bg-muted"
            onClick={(e) => {
              e.stopPropagation();
              onDecrement(item.product_id);
            }}
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="w-5 text-center text-xs font-bold tabular-nums">
            {item.quantity}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full cursor-pointer hover:bg-muted"
            onClick={(e) => {
              e.stopPropagation();
              onIncrement(item.product_id);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export function POSCartPanel({
  items,
  config,
  outletId,
  loyaltyLookup,
  onLoyaltyMemberFound,
  onLoyaltyEnrollRequest,
  onLoyaltyClear,
  onIncrement,
  onDecrement,
  onRemove,
  onCheckout,
  isPending,
  onSaveDraft,
  isSavingDraft,
}: POSCartPanelProps) {
  const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
  const serviceRate = normalizeRate(config?.service_charge_rate, 0);
  const serviceAmount = subtotal * serviceRate;
  const total = subtotal + serviceAmount;

  if (items.length === 0) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {outletId && onLoyaltyMemberFound && onLoyaltyEnrollRequest && onLoyaltyClear && (
          <>
            <PosLoyaltyLookup
              outletId={outletId}
              onMemberFound={onLoyaltyMemberFound}
              onEnrollRequest={onLoyaltyEnrollRequest}
              onClear={onLoyaltyClear}
              selectedMemberId={loyaltyLookup?.member_id}
            />
            <Separator />
          </>
        )}
        <div className="flex flex-col flex-1 items-center justify-center text-muted-foreground gap-3 p-6">
          <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center">
            <ShoppingCart className="h-6 w-6 opacity-40" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">Cart is empty</p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">Tap a product to add it</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Loyalty member lookup */}
      {outletId && onLoyaltyMemberFound && onLoyaltyEnrollRequest && onLoyaltyClear && (
        <>
          <PosLoyaltyLookup
            outletId={outletId}
            onMemberFound={onLoyaltyMemberFound}
            onEnrollRequest={onLoyaltyEnrollRequest}
            onClear={onLoyaltyClear}
            selectedMemberId={loyaltyLookup?.member_id}
          />
          <Separator />
        </>
      )}

      {/* Item list */}
      <ScrollArea className="flex-1">
        <div className="px-3 py-2 space-y-1.5 flex flex-col w-full min-w-0 overflow-hidden">
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <CartItemRow
                key={item.product_id}
                item={item}
                onIncrement={onIncrement}
                onDecrement={onDecrement}
                onRemove={onRemove}
              />
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Totals + checkout */}
      <div className="border-t px-4 py-3 space-y-2 text-sm bg-background shrink-0">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatCurrency(subtotal)}</span>
        </div>
        {serviceAmount > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>Service ({formatRatePercent(serviceRate)}%)</span>
            <span className="tabular-nums">{formatCurrency(serviceAmount)}</span>
          </div>
        )}
        <Separator />
        <div className="flex justify-between font-bold text-base">
          <span>Total</span>
          <span className="text-primary tabular-nums">{formatCurrency(total)}</span>
        </div>
        <div className="flex gap-2 w-full mt-1">
          {onSaveDraft && (
            <Button
              variant="outline"
              className="flex-1 cursor-pointer"
              size="lg"
              onClick={onSaveDraft}
              disabled={isPending || isSavingDraft || items.length === 0}
            >
              {isSavingDraft ? "Saving…" : "Save Draft"}
            </Button>
          )}
          <Button
            className={`cursor-pointer ${onSaveDraft ? "flex-1" : "w-full"}`}
            size="lg"
            onClick={onCheckout}
            disabled={isPending || isSavingDraft || items.length === 0}
          >
            {isPending ? "Processing…" : `Pay ${formatCurrency(total)}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
