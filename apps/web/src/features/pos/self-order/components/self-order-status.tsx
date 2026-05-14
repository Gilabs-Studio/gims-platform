"use client";

import { CheckCircle2, Clock, ChefHat, XCircle, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { CustomerOrderResponse } from "../types";

interface SelfOrderStatusProps {
  order: CustomerOrderResponse;
  currency: string;
  onOrderMore: () => void;
  isRefetching: boolean;
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
  isRefetching,
}: SelfOrderStatusProps) {
  const t = useTranslations("selfOrder");

  const STATUS_CONFIG: Record<
    string,
    { label: string; icon: React.ElementType; color: string }
  > = {
    PENDING: { label: t("status.statusLabels.PENDING"), icon: Clock, color: "text-yellow-600" },
    CONFIRMED: { label: t("status.statusLabels.CONFIRMED"), icon: Clock, color: "text-blue-600" },
    PREPARING: { label: t("status.statusLabels.PREPARING"), icon: ChefHat, color: "text-orange-600" },
    READY: { label: t("status.statusLabels.READY"), icon: CheckCircle2, color: "text-green-600" },
    SERVED: { label: t("status.statusLabels.SERVED"), icon: CheckCircle2, color: "text-green-600" },
    COMPLETED: { label: t("status.statusLabels.COMPLETED"), icon: CheckCircle2, color: "text-green-700" },
    PAID: { label: t("status.statusLabels.PAID"), icon: CheckCircle2, color: "text-green-700" },
    CANCELLED: { label: t("status.statusLabels.CANCELLED"), icon: XCircle, color: "text-destructive" },
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
    order.status === "CANCELLED";

  return (
    <div className="flex flex-col min-h-screen bg-background px-4 py-6">
      {/* Status icon */}
      <div className="flex flex-col items-center gap-3 py-8">
        <Icon className={`h-16 w-16 ${cfg.color}`} />
        <h1 className="text-lg font-bold">{cfg.label}</h1>
        <p className="text-sm text-muted-foreground">
          {t("status.table")} <strong>{order.table_label}</strong>
        </p>
        <p className="text-xs text-muted-foreground">
          #{order.order_number}
        </p>
      </div>

      {/* Order items */}
      <div className="space-y-2 mb-4">
        {order.items.map((item, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {item.quantity}× {item.product_name}
            </span>
            <span>{formatCurrency(item.subtotal, currency)}</span>
          </div>
        ))}
      </div>
      <Separator className="mb-4" />
      <div className="flex justify-between text-sm text-muted-foreground mb-1">
        <span>{t("status.subtotal")}</span>
        <span>{formatCurrency(order.subtotal, currency)}</span>
      </div>
      {order.tax_amount > 0 && (
        <div className="flex justify-between text-sm text-muted-foreground mb-1">
          <span>{t("status.tax")}</span>
          <span>{formatCurrency(order.tax_amount, currency)}</span>
        </div>
      )}
      <div className="flex justify-between font-bold mb-6">
        <span>{t("status.total")}</span>
        <span>{formatCurrency(order.total_amount, currency)}</span>
      </div>

      {!isTerminal && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-4">
          <RefreshCw
            className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`}
          />
          {t("status.updatingEvery5Seconds")}
        </div>
      )}

      {(isTerminal || order.status === "SERVED") && (
        <Button variant="outline" onClick={onOrderMore}>
          {t("status.orderAgain")}
        </Button>
      )}
    </div>
  );
}
