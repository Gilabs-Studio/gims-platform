"use client";

import { CheckCircle2, Clock, ChefHat, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { CustomerOrderResponse } from "../types";

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
    SERVED: { label: t("status.statusLabels.SERVED"), icon: CheckCircle2, color: "text-green-600" },
    COMPLETED: { label: t("status.statusLabels.COMPLETED"), icon: CheckCircle2, color: "text-green-700" },
    PAID: { label: t("status.statusLabels.PAID"), icon: CheckCircle2, color: "text-green-700" },
    CANCELLED: { label: t("status.statusLabels.CANCELLED"), icon: XCircle, color: "text-destructive" },
    VOIDED: { label: t("status.statusLabels.CANCELLED", { fallback: "Dibatalkan" }), icon: XCircle, color: "text-destructive" },
  };

  const cfg = STATUS_CONFIG[order.status] ?? {
    label: order.status,
    icon: Clock,
    color: "text-muted-foreground",
  };
  const Icon = cfg.icon;
  const isTerminal =
    order.status === "COMPLETED" ||
    order.status === "PAID" ||
    order.status === "CANCELLED" ||
    order.status === "VOIDED";

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 py-10">
      {/* Status icon */}
      <div className="flex flex-col items-center gap-4 py-8">
        <div className={`flex items-center justify-center h-24 w-24 rounded-full bg-muted/50 shadow-sm ${cfg.color}`}>
          <Icon className="h-12 w-12" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{cfg.label}</h1>
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
      <div className="bg-card p-5 rounded-3xl border border-border/50 shadow-sm flex-1 mb-8">
        <div className="space-y-3 mb-4">
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between items-start text-sm">
              <span className="font-medium pr-4 leading-tight">
                <span className="text-muted-foreground mr-2">{item.quantity}×</span>
                {item.product_name}
              </span>
              <span className="font-semibold shrink-0">
                {formatCurrency(item.subtotal, currency)}
              </span>
            </div>
          ))}
        </div>
        <Separator className="my-4 border-border/50" />
        <div className="space-y-2">
          <div className="flex justify-between text-sm font-medium text-muted-foreground">
            <span>{t("status.subtotal")}</span>
            <span>{formatCurrency(order.subtotal, currency)}</span>
          </div>
          {order.tax_amount > 0 && (
            <div className="flex justify-between text-sm font-medium text-muted-foreground">
              <span>{t("status.tax")}</span>
              <span>{formatCurrency(order.tax_amount, currency)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold tracking-tight pt-2">
            <span>{t("status.total")}</span>
            <span>{formatCurrency(order.total_amount, currency)}</span>
          </div>
        </div>
      </div>

      {(isTerminal || order.status === "SERVED") && (
        <Button 
          variant="outline" 
          onClick={onOrderMore}
          className="h-14 w-full rounded-2xl border-border/50 text-base font-semibold shadow-sm hover:bg-muted/50 hover:border-border transition-all cursor-pointer"
        >
          {t("status.orderAgain")}
        </Button>
      )}

      {(order.status === "DRAFT" || order.status === "PENDING" || order.status === "WAITING_PAYMENT" || order.status === "WAITING_CASHIER") && onCancelOrder && (
        <Button 
          variant="destructive" 
          onClick={onCancelOrder}
          disabled={isCancelling}
          className="h-14 w-full rounded-2xl text-base font-semibold shadow-sm transition-all cursor-pointer mt-4"
        >
          {isCancelling ? "Membatalkan..." : "Batalkan Pesanan"}
        </Button>
      )}
    </div>
  );
}
