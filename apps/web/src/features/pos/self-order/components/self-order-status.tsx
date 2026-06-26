"use client";

import { CheckCircle2, Clock, ChefHat, Circle, Utensils, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { CustomerOrderItemResponse, CustomerOrderResponse } from "../types";

interface SelfOrderStatusProps {
  order: CustomerOrderResponse;
  currency: string;
  onOrderMore: () => void;
  onCancelOrder?: () => void;
  isCancelling?: boolean;
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

function normalizeStatus(status?: string) {
  return (status ?? "").trim().toUpperCase();
}

function getItemQuantity(item: CustomerOrderItemResponse) {
  return Math.max(item.quantity, 0);
}

function getServedCount(order: CustomerOrderResponse) {
  return order.items.reduce((total, item) => {
    if (normalizeStatus(item.status) !== "SERVED") return total;
    return total + getItemQuantity(item);
  }, 0);
}

function getActiveItemCount(order: CustomerOrderResponse) {
  return order.items.reduce((total, item) => {
    if (normalizeStatus(item.status) === "CANCELLED") return total;
    return total + getItemQuantity(item);
  }, 0);
}

type ItemStatusConfig = Record<string, { label: string; className: string; dot: string }>;

function OrderItemRow({
  item,
  currency,
  itemStatusConfig,
  compact,
}: {
  item: CustomerOrderItemResponse;
  currency: string;
  itemStatusConfig: ItemStatusConfig;
  compact?: boolean;
}) {
  const itemStatus = itemStatusConfig[normalizeStatus(item.status) || "PENDING"] ?? itemStatusConfig.PENDING;

  return (
    <div className="flex justify-between items-start gap-3 text-sm">
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${itemStatus.dot}`} />
          <span className="font-medium leading-tight">
            <span className="text-muted-foreground mr-2">{item.quantity}x</span>
            {item.product_name}
          </span>
        </div>
        {!compact && (
          <div
            className={`ml-4 mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${itemStatus.className}`}
          >
            {itemStatus.label}
          </div>
        )}
      </div>
      <span className="font-semibold shrink-0 text-right">
        {formatCurrency(item.subtotal, currency)}
      </span>
    </div>
  );
}

export function SelfOrderStatus({
  order,
  currency,
  onOrderMore,
  onCancelOrder,
  isCancelling,
}: SelfOrderStatusProps) {
  const t = useTranslations("selfOrder");

  const STATUS_CONFIG: Record<
    string,
    { label: string; icon: React.ElementType; color: string }
  > = {
    PENDING: { label: t("status.statusLabels.PENDING"), icon: Clock, color: "text-yellow-600" },
    WAITING_PAYMENT: { label: t("status.statusLabels.WAITING_PAYMENT"), icon: Clock, color: "text-amber-600" },
    CONFIRMED: { label: t("status.statusLabels.CONFIRMED"), icon: Clock, color: "text-blue-600" },
    PREPARING: { label: t("status.statusLabels.PREPARING"), icon: ChefHat, color: "text-orange-600" },
    IN_PROGRESS: { label: t("status.statusLabels.IN_PROGRESS"), icon: ChefHat, color: "text-orange-600" },
    READY: { label: t("status.statusLabels.READY"), icon: CheckCircle2, color: "text-green-600" },
    PARTIAL_SERVED: { label: t("status.statusLabels.PARTIAL_SERVED"), icon: Utensils, color: "text-amber-600" },
    SERVED: { label: t("status.statusLabels.SERVED"), icon: CheckCircle2, color: "text-green-600" },
    COMPLETED: { label: t("status.statusLabels.COMPLETED"), icon: CheckCircle2, color: "text-green-700" },
    PAID: { label: t("status.statusLabels.PAID"), icon: ChefHat, color: "text-orange-600" },
    CANCELLED: { label: t("status.statusLabels.CANCELLED"), icon: XCircle, color: "text-destructive" },
    VOIDED: { label: t("status.statusLabels.CANCELLED", { fallback: "Dibatalkan" }), icon: XCircle, color: "text-destructive" },
  };

  const orderStatus = normalizeStatus(order.status);
  const cfg = STATUS_CONFIG[orderStatus] ?? {
    label: orderStatus || order.status,
    icon: Clock,
    color: "text-muted-foreground",
  };
  const paymentStatus = normalizeStatus(order.payment_status);
  const Icon = cfg.icon;
  const isTerminal =
    orderStatus === "COMPLETED" ||
    orderStatus === "CANCELLED" ||
    orderStatus === "VOIDED";
  const servedCount = getServedCount(order);
  const totalItems = getActiveItemCount(order);
  const shouldShowServiceProgress =
    orderStatus === "PAID" ||
    orderStatus === "CONFIRMED" ||
    orderStatus === "PREPARING" ||
    orderStatus === "IN_PROGRESS" ||
    orderStatus === "READY" ||
    orderStatus === "PARTIAL_SERVED" ||
    orderStatus === "SERVED" ||
    orderStatus === "COMPLETED";
  const servedItems = order.items.filter((item) => normalizeStatus(item.status) === "SERVED");
  const pendingServeItems = order.items.filter((item) => {
    const status = normalizeStatus(item.status);
    return status !== "SERVED" && status !== "CANCELLED";
  });
  const serviceProgress = totalItems > 0 ? Math.min(100, Math.round((servedCount / totalItems) * 100)) : 0;
  const serviceSummary =
    totalItems === 0
      ? ""
      : servedCount === 0
        ? t("status.serviceSummary.none")
        : servedCount === totalItems
          ? t("status.serviceSummary.all")
          : t("status.serviceSummary.partial");
  const itemStatusConfig: ItemStatusConfig = {
    PENDING: {
      label: t("status.itemStatus.PENDING"),
      className: "border-muted-foreground/20 bg-muted text-muted-foreground",
      dot: "bg-muted-foreground/50",
    },
    PREPARING: {
      label: t("status.itemStatus.PREPARING"),
      className: "border-orange-500/25 bg-orange-500/10 text-orange-700",
      dot: "bg-orange-500 animate-pulse",
    },
    DONE: {
      label: t("status.itemStatus.DONE"),
      className: "border-blue-500/25 bg-blue-500/10 text-blue-700",
      dot: "bg-blue-500",
    },
    READY: {
      label: t("status.itemStatus.READY"),
      className: "border-blue-500/25 bg-blue-500/10 text-blue-700",
      dot: "bg-blue-500",
    },
    SERVED: {
      label: t("status.itemStatus.SERVED"),
      className: "border-green-500/25 bg-green-500/10 text-green-700",
      dot: "bg-green-500",
    },
    CANCELLED: {
      label: t("status.itemStatus.CANCELLED"),
      className: "border-destructive/25 bg-destructive/10 text-destructive",
      dot: "bg-destructive",
    },
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-4 py-8 sm:px-6">
      {/* Status icon */}
      <div className="flex w-full max-w-2xl flex-col items-center gap-4 py-6">
        <div className={`flex h-20 w-20 items-center justify-center rounded-2xl border border-border/50 bg-card shadow-sm ${cfg.color}`}>
          <Icon className="h-10 w-10" />
        </div>
        <h1 className="text-center text-2xl font-bold tracking-tight">{cfg.label}</h1>
        {shouldShowServiceProgress && totalItems > 0 && (
          <div className="w-full max-w-sm space-y-2 text-center">
            <p className="text-sm font-semibold text-foreground">
              {serviceSummary}
            </p>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-green-500 transition-all duration-500"
                style={{ width: `${serviceProgress}%` }}
              />
            </div>
            <p className="text-xs font-medium text-muted-foreground">
              {t("status.servedProgress", { served: servedCount, total: totalItems })}
            </p>
          </div>
        )}
        <div className="flex flex-col items-center gap-1">
          <p className="text-base text-muted-foreground">
            {t("status.table")} <span className="font-semibold text-foreground">{order.table_label}</span>
          </p>
          <p className="text-sm font-medium text-muted-foreground/70 uppercase tracking-widest">
            #{order.order_number}
          </p>
        </div>
      </div>

      {/* Order items */}
      <div className="mb-6 w-full max-w-2xl rounded-3xl border border-border/50 bg-card p-5 shadow-sm">
        {(paymentStatus === "CANCELLED" || orderStatus === "VOIDED" || orderStatus === "CANCELLED") && (
          <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {t("status.paymentCancelled")}
            {order.cancel_reason && (
              <p className="mt-1 text-xs text-destructive/80">{order.cancel_reason}</p>
            )}
          </div>
        )}
        <div className="space-y-4 mb-4">
          {shouldShowServiceProgress ? (
            <>
              <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Circle className="h-4 w-4 text-amber-600" />
                    <p className="text-sm font-bold text-amber-700">{t("status.sections.pendingServe")}</p>
                  </div>
                  <span className="text-xs font-semibold text-amber-700">
                    {pendingServeItems.length}
                  </span>
                </div>
                {pendingServeItems.length > 0 ? (
                  <div className="space-y-3">
                    {pendingServeItems.map((item, i) => (
                      <OrderItemRow
                        key={item.id || i}
                        item={item}
                        currency={currency}
                        itemStatusConfig={itemStatusConfig}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-medium text-muted-foreground">{t("status.sections.emptyPendingServe")}</p>
                )}
              </div>

              <div className="rounded-2xl border border-green-500/25 bg-green-500/5 p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <p className="text-sm font-bold text-green-700">{t("status.sections.served")}</p>
                  </div>
                  <span className="text-xs font-semibold text-green-700">
                    {servedItems.length}
                  </span>
                </div>
                {servedItems.length > 0 ? (
                  <div className="space-y-3">
                    {servedItems.map((item, i) => (
                      <OrderItemRow
                        key={item.id || i}
                        item={item}
                        currency={currency}
                        itemStatusConfig={itemStatusConfig}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-medium text-muted-foreground">{t("status.sections.emptyServed")}</p>
                )}
              </div>
            </>
          ) : (
            order.items.map((item, i) => (
              <OrderItemRow
                key={item.id || i}
                item={item}
                currency={currency}
                itemStatusConfig={itemStatusConfig}
                compact
              />
            ))
          )}
        </div>
        <Separator className="my-4 border-border/50" />
        <div className="space-y-2">
          <div className="flex justify-between text-sm font-medium text-muted-foreground">
            <span>{t("status.subtotal")}</span>
            <span>{formatCurrency(order.subtotal, currency)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold tracking-tight pt-2">
            <span>{t("status.total")}</span>
            <span>{formatCurrency(order.total_amount, currency)}</span>
          </div>
        </div>
      </div>

      {(isTerminal || orderStatus === "SERVED") && (
        <Button 
          variant="outline" 
          onClick={onOrderMore}
          className="h-14 w-full max-w-2xl rounded-2xl border-border/50 text-base font-semibold shadow-sm hover:bg-muted/50 hover:border-border transition-all cursor-pointer"
        >
          {t("status.orderAgain")}
        </Button>
      )}

      {(orderStatus === "DRAFT" || orderStatus === "PENDING" || orderStatus === "WAITING_PAYMENT" || orderStatus === "WAITING_CASHIER") && onCancelOrder && (
        <Button 
          variant="destructive" 
          onClick={onCancelOrder}
          disabled={isCancelling}
          className="h-14 w-full max-w-2xl rounded-2xl text-base font-semibold shadow-sm transition-all cursor-pointer mt-4"
        >
          {isCancelling ? "Membatalkan..." : "Batalkan Pesanan"}
        </Button>
      )}
    </div>
  );
}
