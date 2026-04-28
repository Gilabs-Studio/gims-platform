"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Banknote, CircleAlert, ShieldAlert, Store } from "lucide-react";
import type { WidgetConfig } from "../types";
import { useUserPermission } from "@/hooks/use-user-permission";
import { WidgetAsyncState } from "./widget-async-state";
import { WIDGET_REGISTRY } from "../config/widget-registry";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";
import { usePosOutletOverview } from "../hooks/use-pos-outlet-overview";

interface PosCashControlWidgetProps {
  readonly widget: WidgetConfig;
}

export function PosCashControlWidget({ widget }: PosCashControlWidgetProps) {
  const t = useTranslations("dashboard");
  const registry = WIDGET_REGISTRY[widget.type];
  const canView = useUserPermission(registry?.permission ?? "");
  const {
    posSummary: pos,
    visibleOutlets: outlets,
    isLoading,
    isError,
    refetch,
  } = usePosOutletOverview(widget.type, canView);

  if (!canView) return null;

  const servedRate = pos && pos.today_total_orders > 0
    ? Math.round((pos.served_orders / pos.today_total_orders) * 100)
    : 0;
  const hasVariance = pos ? Math.abs(pos.cash_variance) >= 10000 : false;
  const showAlert = Boolean(pos && (hasVariance || pos.warning_orders > 0));

  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      return;
    }

    console.debug("[Dashboard POS][Cash Control]", {
      widgetType: widget.type,
      canView,
      isLoading,
      isError,
      outletsCount: outlets.length,
      servedRate,
      hasVariance,
      showAlert,
      summary: {
        today_total_orders: pos?.today_total_orders ?? 0,
        served_orders: pos?.served_orders ?? 0,
        active_sessions: pos?.active_sessions ?? 0,
        expected_cash: pos?.expected_cash ?? 0,
        actual_cash: pos?.actual_cash ?? 0,
        cash_variance: pos?.cash_variance ?? 0,
      },
    });
  }, [
    canView,
    hasVariance,
    isError,
    isLoading,
    outlets.length,
    pos?.active_sessions,
    pos?.actual_cash,
    pos?.cash_variance,
    pos?.expected_cash,
    pos?.served_orders,
    pos?.today_total_orders,
    servedRate,
    showAlert,
    widget.type,
  ]);

  return (
    <WidgetAsyncState isLoading={isLoading} isError={isError} onRetry={refetch}>
      <Card className="h-full">
        <CardHeader className="space-y-1 pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardDescription className="flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              {t("widgets.pos_cash_control.title")}
            </CardDescription>
            <div className="text-right text-[11px] text-muted-foreground">
              <p>{t("widgets.pos_cash_control.activeSessions", { count: pos?.active_sessions ?? 0 })}</p>
              <p>{t("widgets.pos_cash_control.servedRate", { rate: servedRate })}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("widgets.pos_cash_control.description")}
          </p>
        </CardHeader>

        <CardContent className="flex h-full flex-col gap-4 pt-0">
          {showAlert && pos && (
            <div className={cn(
              "flex items-start gap-2 rounded-lg border px-3 py-2 text-xs",
              hasVariance ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-warning/30 bg-warning/5 text-warning",
            )}>
              {hasVariance ? <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> : <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />}
              <div className="space-y-0.5">
                <p className="font-medium">
                  {hasVariance ? t("widgets.pos_cash_control.varianceAlert") : t("widgets.pos_cash_control.warningAlert")}
                </p>
                <p>
                  {hasVariance
                    ? t("widgets.pos_cash_control.varianceSummary", {
                        variance: pos.cash_variance_formatted,
                      })
                    : t("widgets.pos_cash_control.warningSummary", {
                        count: pos.warning_orders,
                      })}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard
              label={t("widgets.pos_cash_control.expectedCash")}
              value={pos?.expected_cash_formatted ?? formatCurrency(0)}
              tone="primary"
            />
            <MetricCard
              label={t("widgets.pos_cash_control.actualCash")}
              value={pos?.actual_cash_formatted ?? formatCurrency(0)}
              tone="neutral"
            />
            <MetricCard
              label={t("widgets.pos_cash_control.cashVariance")}
              value={pos?.cash_variance_formatted ?? formatCurrency(0)}
              tone={pos && pos.cash_variance < 0 ? "danger" : "success"}
            />
            <MetricCard
              label={t("widgets.pos_cash_control.cashSales")}
              value={pos?.cash_sales_today_formatted ?? formatCurrency(0)}
              tone="neutral"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("widgets.pos_cash_control.cashCover")}</span>
              <span className="font-medium">
                {pos?.served_orders ?? 0}/{pos?.today_total_orders ?? 0}
              </span>
            </div>
            <Progress value={servedRate} className="h-2" />
          </div>

          <div className="grid flex-1 gap-3 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3">
            {outlets.map((outlet) => (
              <div key={outlet.outlet_id} className="space-y-2 rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{outlet.outlet_name}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(outlet.today_revenue)}</p>
                  </div>
                  <Store className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <MiniStat label={t("widgets.pos_cash_control.served")} value={outlet.served_orders} />
                  <MiniStat label={t("widgets.pos_cash_control.waiting")} value={outlet.waiting_orders} />
                  <MiniStat label={t("widgets.pos_cash_control.warnings")} value={outlet.warning_orders} tone={outlet.warning_orders > 0 ? "warning" : "neutral"} />
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("widgets.pos_cash_control.tableCoverage", {
                    occupied: outlet.tables_occupied,
                    total: outlet.tables_total,
                  })}
                </div>
              </div>
            ))}
            {outlets.length === 0 && (
              <div className="col-span-full flex items-center justify-center py-6 text-sm text-muted-foreground">
                {t("noData")}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </WidgetAsyncState>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  readonly label: string;
  readonly value: string;
  readonly tone: "primary" | "neutral" | "danger" | "success";
}) {
  const toneClassName =
    tone === "primary"
      ? "border-primary/20 bg-primary/5 text-primary"
      : tone === "danger"
        ? "border-destructive/20 bg-destructive/5 text-destructive"
        : tone === "success"
          ? "border-success/20 bg-success/5 text-success"
          : "border-border bg-card text-foreground";

  return (
    <div className={cn("rounded-lg border p-3", toneClassName)}>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone = "neutral",
}: {
  readonly label: string;
  readonly value: number;
  readonly tone?: "neutral" | "warning";
}) {
  return (
    <div className={cn(
      "rounded-md border px-2 py-1.5 text-center",
      tone === "warning" ? "border-warning/20 bg-warning/5 text-warning" : "bg-muted/30",
    )}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold">{value}</div>
    </div>
  );
}
