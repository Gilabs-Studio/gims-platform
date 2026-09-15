"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, LayoutGrid } from "lucide-react";
import type { WidgetConfig, POSOutletItem } from "../types";
import { useUserPermission } from "@/hooks/use-user-permission";
import { WidgetAsyncState } from "./widget-async-state";
import { WIDGET_REGISTRY, resolveWidgetSpan } from "../config/widget-registry";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePosOutletOverview } from "../hooks/use-pos-outlet-overview";
import { useRouter } from "@/i18n/routing";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePermissionScope } from "@/features/master-data/user-management/hooks/use-has-permission";

interface PosCashControlWidgetProps {
  readonly widget: WidgetConfig;
}

export function PosCashControlWidget({ widget }: PosCashControlWidgetProps) {
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
  const totalActiveTables = filteredOutlets.reduce((sum, outlet) => sum + (outlet.active_table_count ?? 0), 0);

  const openLiveTable = (outlet: POSOutletItem) => {
    router.push(`/pos/fb/live-table?outlet_id=${encodeURIComponent(outlet.outlet_id)}`);
  };

  const { col } = resolveWidgetSpan(widget);
  const gridColsClass =
    col >= 4
      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      : col === 3
        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        : "grid-cols-1 sm:grid-cols-2";

  if (!canView) {
    return null;
  }

  return (
    <WidgetAsyncState isLoading={isLoading} isError={isError} onRetry={refetch}>
      <Card className="h-full flex flex-col">
        <CardHeader className="space-y-1 pb-2 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <CardDescription className="flex items-center gap-2 font-medium text-foreground">
              <LayoutGrid className="h-4 w-4 text-muted-foreground" />
              {t("widgets.pos_cash_control.title")}
            </CardDescription>
            {hasOutletFilter && (
              <Select value={selectedOutletId} onValueChange={setSelectedOutletId}>
                <SelectTrigger className="h-7 w-40 text-xs cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {canSelectAllOutlets && (
                    <SelectItem value="all" className="cursor-pointer">
                      {t("widgets.pos_cash_control.allOutlets")}
                    </SelectItem>
                  )}
                  {visibleOutlets.map((outlet) => (
                    <SelectItem key={outlet.outlet_id} value={outlet.outlet_id} className="cursor-pointer">
                      {outlet.outlet_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{t("widgets.pos_cash_control.description")}</p>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col gap-3 pt-0 min-h-0">
          {/* Minimalist Summary Bar */}
          <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2 text-xs shrink-0">
            <span className="font-medium text-foreground">
              {t("widgets.pos_cash_control.totalActiveTables", { count: totalActiveTables })}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {t("widgets.pos_cash_control.activeSessions", { count: pos?.active_sessions ?? 0 })}
            </span>
          </div>

          {isSingleOutletScope && focusedOutlet ? (
            <FocusedActiveTablesCard
              outlet={focusedOutlet}
              activeTablesText={t("widgets.pos_cash_control.activeTables", { count: focusedOutlet.active_table_count ?? 0 })}
              openLabel={t("widgets.pos_cash_control.openLiveTable")}
              onOpen={() => openLiveTable(focusedOutlet)}
              emptyLabel={t("widgets.pos_cash_control.noActiveTables")}
            />
          ) : (
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden min-h-0 pr-0.5">
              <div className={cn("grid gap-3", gridColsClass)}>
                {displayedOutlets.map((outlet) => {
                  const tableLabels = outlet.active_table_labels ?? [];
                  const count = outlet.active_table_count ?? 0;

                  return (
                    <div
                      key={outlet.outlet_id}
                      className="flex flex-col justify-between rounded-lg border bg-card p-3 transition-all duration-200 hover:border-border/80"
                    >
                      <div className="space-y-2">
                        {/* Header: Name and Table Count */}
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium text-foreground">
                            {outlet.outlet_name}
                          </p>
                          <span className="shrink-0 text-xs text-muted-foreground font-medium">
                            {count > 0
                              ? t("widgets.pos_cash_control.activeTables", { count })
                              : t("widgets.pos_cash_control.noActiveTables")}
                          </span>
                        </div>

                        {/* Table Chips: Simple minimalist tags */}
                        <div className="flex flex-wrap items-center gap-1.5 py-0.5 min-h-[1.75rem]">
                          {tableLabels.slice(0, 6).map((tableName) => (
                            <span
                              key={`${outlet.outlet_id}-${tableName}`}
                              className="rounded border bg-muted/40 px-2 py-0.5 text-xs font-medium text-foreground"
                            >
                              {tableName}
                            </span>
                          ))}
                          {tableLabels.length > 6 && (
                            <span className="rounded border bg-muted/20 px-1.5 py-0.5 text-[11px] text-muted-foreground">
                              +{tableLabels.length - 6}
                            </span>
                          )}
                          {tableLabels.length === 0 && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </div>

                      {/* Single Action Button */}
                      <div className="mt-3 border-t pt-2.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 w-full cursor-pointer justify-between text-xs font-medium transition-colors hover:bg-muted"
                          onClick={() => openLiveTable(outlet)}
                        >
                          <span>{t("widgets.pos_cash_control.openLiveTable")}</span>
                          <ArrowRight className="h-3 w-3 shrink-0" />
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {filteredOutlets.length === 0 && (
                  <div className="col-span-full flex items-center justify-center py-6 text-sm text-muted-foreground">
                    {t("noData")}
                  </div>
                )}
              </div>

              {hasMore && (
                <div className="flex justify-center pt-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="cursor-pointer text-xs"
                    onClick={() => setVisibleCount((current) => current + pageSize)}
                  >
                    {t("widgets.pos_cash_control.loadMore")}
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

function FocusedActiveTablesCard({
  outlet,
  activeTablesText,
  openLabel,
  onOpen,
  emptyLabel,
}: {
  readonly outlet: POSOutletItem;
  readonly activeTablesText: string;
  readonly openLabel: string;
  readonly onOpen: () => void;
  readonly emptyLabel: string;
}) {
  const tableLabels = outlet.active_table_labels ?? [];

  return (
    <div className="space-y-3 rounded-lg border bg-card p-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-semibold text-foreground">{outlet.outlet_name}</p>
        <span className="text-xs text-muted-foreground">{activeTablesText}</span>
      </div>

      <div className="flex flex-wrap gap-1.5 py-1 min-h-[1.75rem]">
        {tableLabels.slice(0, 12).map((tableName) => (
          <span
            key={`${outlet.outlet_id}-${tableName}`}
            className="rounded border bg-muted/40 px-2.5 py-0.5 text-xs font-medium text-foreground"
          >
            {tableName}
          </span>
        ))}
        {tableLabels.length === 0 && (
          <p className="text-xs text-muted-foreground">{emptyLabel}</p>
        )}
      </div>

      <Button
        type="button"
        size="sm"
        variant="outline"
        className="w-full h-8 cursor-pointer text-xs font-medium justify-between hover:bg-muted"
        onClick={onOpen}
      >
        <span>{openLabel}</span>
        <ArrowRight className="h-3.5 w-3.5 shrink-0" />
      </Button>
    </div>
  );
}
