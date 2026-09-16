"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Store, Filter, DollarSign, ShoppingCart, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import type { WidgetConfig, POSOutletItem } from "../types";
import { useUserPermission } from "@/hooks/use-user-permission";
import { WidgetAsyncState } from "./widget-async-state";
import { WIDGET_REGISTRY } from "../config/widget-registry";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePosOutletOverview } from "../hooks/use-pos-outlet-overview";
import { Button } from "@/components/ui/button";
import { usePermissionScope } from "@/features/master-data/user-management/hooks/use-has-permission";

interface PosOutletSalesWidgetProps {
  readonly widget: WidgetConfig;
}

export function PosOutletSalesWidget({ widget }: PosOutletSalesWidgetProps) {
  const t = useTranslations("dashboard");
  const pageSize = 6;
  const registry = WIDGET_REGISTRY[widget.type];
  const canView = useUserPermission(registry?.permission ?? "");
  const permissionScope = usePermissionScope(registry?.permission ?? "");
  const allowAllOutlets = permissionScope?.trim().toUpperCase() === "ALL";
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const {
    posSummary: pos,
    visibleOutlets,
    filteredOutlets,
    selectedOutletId,
    setSelectedOutletId,
    hasOutletFilter,
    allowAllOutlets: canSelectAllOutlets,
    isSingleOutletScope,
    focusedOutlet,
    isLoading,
    isError,
    refetch,
  } = usePosOutletOverview(widget.type, canView, { allowAllOutlets });

  useEffect(() => {
    startTransition(() => {
      setVisibleCount(pageSize);
    });
  }, [selectedOutletId]);

  const displayedOutlets = useMemo(() => filteredOutlets.slice(0, visibleCount), [filteredOutlets, visibleCount]);
  const hasMore = filteredOutlets.length > displayedOutlets.length;

  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      return;
    }

    console.debug("[Dashboard POS][Outlet Sales]", {
      widgetType: widget.type,
      canView,
      selectedOutletId,
      hasOutletFilter,
      visibleOutletCount: visibleOutlets.length,
      filteredOutletCount: filteredOutlets.length,
      isLoading,
      isError,
      summary: {
        today_total_orders: pos?.today_total_orders ?? 0,
        today_total_revenue: pos?.today_total_revenue ?? 0,
        served_orders: pos?.served_orders ?? 0,
        waiting_orders: pos?.waiting_orders ?? 0,
        warning_orders: pos?.warning_orders ?? 0,
      },
    });
  }, [
    canView,
    filteredOutlets.length,
    hasOutletFilter,
    isError,
    isLoading,
    pos?.served_orders,
    pos?.today_total_orders,
    pos?.today_total_revenue,
    pos?.waiting_orders,
    pos?.warning_orders,
    selectedOutletId,
    visibleOutlets.length,
    widget.type,
  ]);

  if (!canView) return null;

  return (
    <WidgetAsyncState isLoading={isLoading} isError={isError} onRetry={refetch}>
      <Card className="flex h-full flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-base font-semibold leading-normal">
              {t("widgets.pos_outlet_sales.title")}
            </CardTitle>
            <CardDescription className="mt-1.5 text-xs text-muted-foreground leading-normal">
              {t("widgets.pos_outlet_sales.description")}
            </CardDescription>
          </div>
          {hasOutletFilter && (
            <Select value={selectedOutletId} onValueChange={setSelectedOutletId}>
              <SelectTrigger className="h-8 w-40 text-xs cursor-pointer">
                <Filter className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {canSelectAllOutlets && (
                  <SelectItem value="all" className="cursor-pointer">
                    {t("widgets.pos_outlet_sales.allOutlets")}
                  </SelectItem>
                )}
                {visibleOutlets.map((o) => (
                  <SelectItem key={o.outlet_id} value={o.outlet_id} className="cursor-pointer">
                    {o.outlet_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardHeader>

        <CardContent className="flex h-full flex-col gap-3 pt-0">
          {/* 5 Solid & Minimalist Stat Cards */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <div className="flex flex-col justify-between rounded-lg border border-border/50 bg-card p-2.5">
              <div
                className="flex size-7 shrink-0 items-center justify-center bg-primary text-primary-foreground"
                style={{ borderRadius: "9999px" }}
              >
                <DollarSign className="size-3.5" />
              </div>
              <div className="mt-2">
                <p className="truncate text-[11px] font-normal text-muted-foreground leading-tight">
                  {t("widgets.pos_outlet_sales.todayRevenue")}
                </p>
                <p className="mt-0.5 truncate text-sm font-bold tracking-tight text-foreground">
                  {pos?.today_total_revenue_formatted ?? "Rp 0"}
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-lg border border-border/50 bg-card p-2.5">
              <div
                className="flex size-7 shrink-0 items-center justify-center bg-primary text-primary-foreground"
                style={{ borderRadius: "9999px" }}
              >
                <ShoppingCart className="size-3.5" />
              </div>
              <div className="mt-2">
                <p className="truncate text-[11px] font-normal text-muted-foreground leading-tight">
                  {t("widgets.pos_outlet_sales.todayOrders")}
                </p>
                <p className="mt-0.5 truncate text-sm font-bold tracking-tight text-foreground">
                  {pos?.today_total_orders ?? 0}
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-lg border border-border/50 bg-card p-2.5">
              <div
                className="flex size-7 shrink-0 items-center justify-center bg-emerald-600 text-white"
                style={{ borderRadius: "9999px" }}
              >
                <CheckCircle2 className="size-3.5" />
              </div>
              <div className="mt-2">
                <p className="truncate text-[11px] font-normal text-muted-foreground leading-tight">
                  {t("widgets.pos_outlet_sales.servedOrders")}
                </p>
                <p className="mt-0.5 truncate text-sm font-bold tracking-tight text-foreground">
                  {pos?.served_orders ?? 0}
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-lg border border-border/50 bg-card p-2.5">
              <div
                className="flex size-7 shrink-0 items-center justify-center bg-amber-500 text-white"
                style={{ borderRadius: "9999px" }}
              >
                <Clock className="size-3.5" />
              </div>
              <div className="mt-2">
                <p className="truncate text-[11px] font-normal text-muted-foreground leading-tight">
                  {t("widgets.pos_outlet_sales.waitingOrders")}
                </p>
                <p className="mt-0.5 truncate text-sm font-bold tracking-tight text-foreground">
                  {pos?.waiting_orders ?? 0}
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-lg border border-border/50 bg-card p-2.5">
              <div
                className="flex size-7 shrink-0 items-center justify-center bg-rose-500 text-white"
                style={{ borderRadius: "9999px" }}
              >
                <AlertTriangle className="size-3.5" />
              </div>
              <div className="mt-2">
                <p className="truncate text-[11px] font-normal text-muted-foreground leading-tight">
                  {t("widgets.pos_outlet_sales.warningOrders")}
                </p>
                <p className="mt-0.5 truncate text-sm font-bold tracking-tight text-foreground">
                  {pos?.warning_orders ?? 0}
                </p>
              </div>
            </div>
          </div>

          {isSingleOutletScope && focusedOutlet ? (
            <FocusedOutletSalesCard
              outlet={focusedOutlet}
              revenueLabel={t("widgets.pos_outlet_sales.revenue")}
              ordersLabel={t("widgets.pos_outlet_sales.orders")}
              servedLabel={t("widgets.pos_outlet_sales.servedOrders")}
              tablesLabel={t("widgets.pos_outlet_sales.tables")}
            />
          ) : (
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="pb-1.5 text-left font-medium">{t("widgets.pos_outlet_sales.outlet")}</th>
                    <th className="pb-1.5 text-right font-medium">{t("widgets.pos_outlet_sales.revenue")}</th>
                    <th className="pb-1.5 text-right font-medium">{t("widgets.pos_outlet_sales.orders")}</th>
                    <th className="pb-1.5 text-right font-medium">{t("widgets.pos_outlet_sales.tables")}</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedOutlets.map((outlet) => (
                    <tr key={outlet.outlet_id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="py-2">
                        <div className="flex items-center gap-2 font-medium">
                          <Store className="size-3.5 text-primary shrink-0" />
                          <span className="truncate">{outlet.outlet_name}</span>
                        </div>
                      </td>
                      <td className="py-2 text-right">{outlet.today_revenue_formatted}</td>
                      <td className="py-2 text-right">{outlet.order_count}</td>
                      <td className="py-2 text-right">
                        <span
                          className={cn(
                            outlet.tables_occupied > 0 ? "text-primary font-medium" : "text-muted-foreground",
                          )}
                        >
                          {outlet.tables_occupied}/{outlet.tables_total}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredOutlets.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-muted-foreground">
                        {t("noData")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {hasMore && (
                <div className="mt-3 flex justify-center">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => setVisibleCount((current) => current + pageSize)}
                  >
                    {t("widgets.pos_outlet_sales.loadMore")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </WidgetAsyncState>
  );
}

function FocusedOutletSalesCard({
  outlet,
  revenueLabel,
  ordersLabel,
  servedLabel,
  tablesLabel,
}: {
  readonly outlet: POSOutletItem;
  readonly revenueLabel: string;
  readonly ordersLabel: string;
  readonly servedLabel: string;
  readonly tablesLabel: string;
}) {
  return (
    <div className="rounded-lg border bg-muted/10 p-3">
      <p className="truncate text-sm font-semibold">{outlet.outlet_name}</p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div>
          <p>{revenueLabel}</p>
          <p className="text-sm font-semibold text-foreground">{outlet.today_revenue_formatted}</p>
        </div>
        <div>
          <p>{ordersLabel}</p>
          <p className="text-sm font-semibold text-foreground">{outlet.order_count}</p>
        </div>
        <div>
          <p>{servedLabel}</p>
          <p className="text-sm font-semibold text-foreground">{outlet.served_orders}</p>
        </div>
        <div>
          <p>{tablesLabel}</p>
          <p className="text-sm font-semibold text-foreground">{outlet.tables_occupied}/{outlet.tables_total}</p>
        </div>
      </div>
    </div>
  );
}
