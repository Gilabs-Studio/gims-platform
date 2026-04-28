"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { LayoutGrid, Filter, Users } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { usePosOutletOverview } from "../hooks/use-pos-outlet-overview";

interface PosLiveTableWidgetProps {
  readonly widget: WidgetConfig;
}

export function PosLiveTableWidget({ widget }: PosLiveTableWidgetProps) {
  const t = useTranslations("dashboard");
  const registry = WIDGET_REGISTRY[widget.type];
  const canView = useUserPermission(registry?.permission ?? "");
  const {
    posSummary: pos,
    visibleOutlets,
    filteredOutlets,
    selectedOutletId,
    setSelectedOutletId,
    hasOutletFilter,
    isLoading,
    isError,
    refetch,
  } = usePosOutletOverview(widget.type, canView);

  if (!canView) return null;

  const totalTables = filteredOutlets.reduce((sum, o) => sum + o.tables_total, 0);
  const occupiedTables = filteredOutlets.reduce((sum, o) => sum + o.tables_occupied, 0);
  const occupancyRate = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0;

  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      return;
    }

    console.debug("[Dashboard POS][Live Table Overview]", {
      widgetType: widget.type,
      canView,
      selectedOutletId,
      hasOutletFilter,
      visibleOutletCount: visibleOutlets.length,
      filteredOutletCount: filteredOutlets.length,
      isLoading,
      isError,
      occupancy: {
        occupiedTables,
        totalTables,
        occupancyRate,
      },
      summary: {
        today_total_orders: pos?.today_total_orders ?? 0,
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
    occupiedTables,
    occupancyRate,
    pos?.served_orders,
    pos?.today_total_orders,
    pos?.waiting_orders,
    pos?.warning_orders,
    selectedOutletId,
    totalTables,
    visibleOutlets.length,
    widget.type,
  ]);

  return (
    <WidgetAsyncState isLoading={isLoading} isError={isError} onRetry={refetch}>
      <Card className="h-full">
        <CardHeader className="space-y-1 pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardDescription className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              {t("widgets.pos_live_table_overview.title")}
            </CardDescription>
            {hasOutletFilter && (
              <Select value={selectedOutletId} onValueChange={setSelectedOutletId}>
                <SelectTrigger className="h-7 w-40 text-xs">
                  <Filter className="mr-1 h-3 w-3" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("widgets.pos_live_table_overview.allOutlets")}</SelectItem>
                  {visibleOutlets.map((o) => (
                    <SelectItem key={o.outlet_id} value={o.outlet_id}>
                      {o.outlet_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex h-full flex-col gap-3 pt-0">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("widgets.pos_live_table_overview.occupancy")}</span>
              <span className="font-medium">{occupiedTables}/{totalTables} ({occupancyRate}%)</span>
            </div>
            <Progress value={occupancyRate} className="h-2" />
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="rounded-lg border px-3 py-2">
              <div className="text-muted-foreground">{t("widgets.pos_live_table_overview.served")}</div>
              <div className="mt-1 text-sm font-semibold">{pos?.served_orders ?? 0}</div>
            </div>
            <div className="rounded-lg border px-3 py-2">
              <div className="text-muted-foreground">{t("widgets.pos_live_table_overview.waiting")}</div>
              <div className="mt-1 text-sm font-semibold">{pos?.waiting_orders ?? 0}</div>
            </div>
            <div className="rounded-lg border px-3 py-2">
              <div className="text-muted-foreground">{t("widgets.pos_live_table_overview.warnings")}</div>
              <div className="mt-1 text-sm font-semibold text-warning">{pos?.warning_orders ?? 0}</div>
            </div>
          </div>

          <div className="grid flex-1 gap-3 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
            {filteredOutlets.map((outlet) => {
              const rate = outlet.tables_total > 0
                ? Math.round((outlet.tables_occupied / outlet.tables_total) * 100)
                : 0;
              return (
                <div key={outlet.outlet_id} className="space-y-2 rounded-lg border p-3">
                  <p className="truncate text-sm font-medium">{outlet.outlet_name}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {outlet.tables_occupied}/{outlet.tables_total}
                    </span>
                    <span className="flex items-center gap-1">
                      <LayoutGrid className="h-3 w-3" />
                      {outlet.served_orders} {t("widgets.pos_live_table_overview.served")}
                    </span>
                    <span className={cn(
                      "font-medium",
                      rate >= 80 ? "text-warning" : rate >= 50 ? "text-primary" : "text-success",
                    )}>
                      {rate}%
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                    <span>{t("widgets.pos_live_table_overview.waitingShort", { count: outlet.waiting_orders })}</span>
                    <span>{t("widgets.pos_live_table_overview.warningShort", { count: outlet.warning_orders })}</span>
                    <span className="text-right">{outlet.order_count} {t("widgets.pos_live_table_overview.ordersShort")}</span>
                  </div>
                  <Progress value={rate} className="h-1.5" />
                </div>
              );
            })}
            {filteredOutlets.length === 0 && (
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
