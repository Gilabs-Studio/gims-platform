"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { LayoutGrid, Filter, ArrowRight, Store, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePosOutletOverview } from "../hooks/use-pos-outlet-overview";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFloorLayout } from "@/features/pos/fb/floor-layout/hooks/use-floor-layouts";
import { usePermissionScope } from "@/features/master-data/user-management/hooks/use-has-permission";

interface PosLiveTableWidgetProps {
  readonly widget: WidgetConfig;
}

export function PosLiveTableWidget({ widget }: PosLiveTableWidgetProps) {
  const router = useRouter();
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

  const openLiveTable = (outlet: POSOutletItem) => {
    router.push(`/pos/fb/live-table?outlet_id=${encodeURIComponent(outlet.outlet_id)}`);
  };

  const totalTables = filteredOutlets.reduce((sum, o) => sum + o.tables_total, 0);
  const occupiedTables = filteredOutlets.reduce((sum, o) => sum + o.tables_occupied, 0);
  const occupancyRate = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0;
  const focusedFloorPlanId = isSingleOutletScope ? focusedOutlet?.floor_plan_id ?? "" : "";
  const focusedPlanQuery = useFloorLayout(focusedFloorPlanId, {
    enabled: Boolean(focusedFloorPlanId && isSingleOutletScope),
  });

  const focusedTableNames = useMemo(() => {
    const layoutData = focusedPlanQuery.data?.data?.layout_data;
    if (!layoutData) {
      return [];
    }

    try {
      const parsed = typeof layoutData === "string" ? JSON.parse(layoutData) : layoutData;
      if (!Array.isArray(parsed)) {
        return [];
      }

      const names = parsed
        .filter((obj): obj is { type?: string; label?: string; tableNumber?: number; id?: string } => Boolean(obj && typeof obj === "object"))
        .filter((obj) => obj.type === "table")
        .map((obj) => obj.label || (typeof obj.tableNumber === "number" ? `T${obj.tableNumber}` : obj.id || ""))
        .filter((name): name is string => Boolean(name));

      return Array.from(new Set(names));
    } catch {
      return [];
    }
  }, [focusedPlanQuery.data?.data?.layout_data]);

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

  if (!canView) return null;

  return (
    <WidgetAsyncState isLoading={isLoading} isError={isError} onRetry={refetch}>
      <Card className="flex h-full flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-base font-semibold leading-normal">
              {t("widgets.pos_live_table_overview.title")}
            </CardTitle>
            <CardDescription className="mt-1.5 text-xs text-muted-foreground leading-normal">
              {t("widgets.pos_live_table_overview.description")}
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
                  <SelectItem value="all" className="cursor-pointer">{t("widgets.pos_live_table_overview.allOutlets")}</SelectItem>
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
          {/* 4 Solid & Minimalist Stat Cards */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="flex flex-col justify-between rounded-lg border border-border/50 bg-card p-2.5">
              <div
                className="flex size-7 shrink-0 items-center justify-center bg-primary text-primary-foreground"
                style={{ borderRadius: "9999px" }}
              >
                <LayoutGrid className="size-3.5" />
              </div>
              <div className="mt-2">
                <p className="truncate text-[11px] font-normal text-muted-foreground leading-tight">
                  {t("widgets.pos_live_table_overview.occupancy")}
                </p>
                <p className="mt-0.5 truncate text-sm font-bold tracking-tight text-foreground">
                  {occupiedTables}/{totalTables} ({occupancyRate}%)
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-lg border border-border/50 bg-card p-2.5">
              <div
                className="flex size-7 shrink-0 items-center justify-center bg-primary text-primary-foreground"
                style={{ borderRadius: "9999px" }}
              >
                <CheckCircle2 className="size-3.5" />
              </div>
              <div className="mt-2">
                <p className="truncate text-[11px] font-normal text-muted-foreground leading-tight">
                  {t("widgets.pos_live_table_overview.served")}
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
                  {t("widgets.pos_live_table_overview.waiting")}
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
                  {t("widgets.pos_live_table_overview.warnings")}
                </p>
                <p className="mt-0.5 truncate text-sm font-bold tracking-tight text-foreground">
                  {pos?.warning_orders ?? 0}
                </p>
              </div>
            </div>
          </div>

          {isSingleOutletScope && focusedOutlet ? (
            <FocusedLiveTableCard
              outlet={focusedOutlet}
              onOpen={() => openLiveTable(focusedOutlet)}
              title={t("widgets.pos_live_table_overview.focusedTitle")}
              cta={t("widgets.pos_live_table_overview.openLiveTable")}
              waitingLabel={t("widgets.pos_live_table_overview.waiting")}
              warningLabel={t("widgets.pos_live_table_overview.warnings")}
              tableNames={focusedTableNames}
              tablesLabel={t("widgets.pos_live_table_overview.tables")}
              loadingTables={focusedPlanQuery.isLoading}
              loadingTablesLabel={t("widgets.pos_live_table_overview.loadingTables")}
              noTableLabels={t("widgets.pos_live_table_overview.noTableLabels")}
            />
          ) : (
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
              {displayedOutlets.map((outlet) => {
                const rate = outlet.tables_total > 0
                  ? Math.round((outlet.tables_occupied / outlet.tables_total) * 100)
                  : 0;
                return (
                  <div
                    key={outlet.outlet_id}
                    onClick={() => openLiveTable(outlet)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-border/50 p-2.5 hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Store className="size-3.5 text-primary shrink-0" />
                      <span className="truncate text-xs font-medium text-foreground">
                        {outlet.outlet_name}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="font-mono text-xs text-muted-foreground mr-1">
                        {outlet.tables_occupied}/{outlet.tables_total}
                      </span>

                      <Badge
                        variant="outline"
                        className="gap-1 border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400"
                      >
                        <span>▲</span>
                        <span>{outlet.served_orders} {t("widgets.pos_live_table_overview.served")}</span>
                        <span>{rate}%</span>
                      </Badge>

                      <Badge
                        variant="outline"
                        className="gap-1 border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400"
                      >
                        <span>▲</span>
                        <span>{outlet.waiting_orders} {t("widgets.pos_live_table_overview.waiting")}</span>
                      </Badge>

                      <Badge
                        variant="outline"
                        className="gap-1 border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-600 dark:text-rose-400"
                      >
                        <span>▲</span>
                        <span>{outlet.warning_orders} {t("widgets.pos_live_table_overview.warnings")}</span>
                      </Badge>

                      <Badge
                        variant="outline"
                        className="gap-1 border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-600 dark:text-blue-400"
                      >
                        <span>▲</span>
                        <span>{outlet.order_count} {t("widgets.pos_live_table_overview.ordersShort")}</span>
                      </Badge>
                    </div>
                  </div>
                );
              })}

              {filteredOutlets.length === 0 && (
                <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                  {t("noData")}
                </div>
              )}

              {hasMore && (
                <div className="flex justify-center pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => setVisibleCount((current) => current + pageSize)}
                  >
                    {t("widgets.pos_live_table_overview.loadMore")}
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

function FocusedLiveTableCard({
  outlet,
  onOpen,
  title,
  cta,
  waitingLabel,
  warningLabel,
  tableNames,
  tablesLabel,
  loadingTables,
  loadingTablesLabel,
  noTableLabels,
}: {
  readonly outlet: POSOutletItem;
  readonly onOpen: () => void;
  readonly title: string;
  readonly cta: string;
  readonly waitingLabel: string;
  readonly warningLabel: string;
  readonly tableNames: string[];
  readonly tablesLabel: string;
  readonly loadingTables: boolean;
  readonly loadingTablesLabel: string;
  readonly noTableLabels: string;
}) {
  const rate = outlet.tables_total > 0
    ? Math.round((outlet.tables_occupied / outlet.tables_total) * 100)
    : 0;

  return (
    <div className="space-y-3 rounded-lg border bg-muted/10 p-3">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
        <p className="truncate text-sm font-semibold">{outlet.outlet_name}</p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-md border px-2 py-1.5">
          <p className="text-muted-foreground">Tables</p>
          <p className="font-semibold">{outlet.tables_occupied}/{outlet.tables_total}</p>
        </div>
        <div className="rounded-md border px-2 py-1.5">
          <p className="text-muted-foreground">{waitingLabel}</p>
          <p className="font-semibold">{outlet.waiting_orders}</p>
        </div>
        <div className="rounded-md border px-2 py-1.5">
          <p className="text-muted-foreground">{warningLabel}</p>
          <p className="font-semibold text-warning">{outlet.warning_orders}</p>
        </div>
      </div>

      <Progress value={rate} className="h-2" />

      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{tablesLabel}</p>
        {loadingTables ? (
          <p className="text-xs text-muted-foreground">{loadingTablesLabel}</p>
        ) : tableNames.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {tableNames.slice(0, 12).map((name) => (
              <Badge
                key={name}
                variant="secondary"
                className="px-2 py-0.5 text-xs font-medium"
              >
                {name}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{noTableLabels}</p>
        )}
      </div>

      <Button
        type="button"
        size="sm"
        className="w-full cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 hover:shadow-xs hover:shadow-primary/30 font-medium"
        onClick={onOpen}
      >
        <span>{cta}</span>
        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
