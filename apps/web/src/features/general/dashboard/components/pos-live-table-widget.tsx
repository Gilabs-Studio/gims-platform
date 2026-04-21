"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { LayoutGrid, Filter, Users } from "lucide-react";
import type { WidgetConfig, POSOutletItem } from "../types";
import { useDashboardWidgetOverview } from "../hooks/use-dashboard";
import { useUserPermission } from "@/hooks/use-user-permission";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
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

interface PosLiveTableWidgetProps {
  readonly widget: WidgetConfig;
}

export function PosLiveTableWidget({ widget }: PosLiveTableWidgetProps) {
  const t = useTranslations("dashboard");
  const registry = WIDGET_REGISTRY[widget.type];
  const canView = useUserPermission(registry?.permission ?? "");
  const { user } = useAuthStore();
  const [selectedOutletId, setSelectedOutletId] = useState<string>("all");

  const { data, isLoading, isError, refetch } = useDashboardWidgetOverview(widget.type, {
    enabled: canView,
  });

  const pos = data?.pos_summary;
  const isOutletScoped = user?.role?.data_scope === "OUTLET";

  const visibleOutlets: POSOutletItem[] = useMemo(() => {
    if (!pos?.outlets) return [];
    return pos.outlets;
  }, [pos?.outlets]);

  const filteredOutlets = useMemo(() => {
    if (selectedOutletId === "all") return visibleOutlets;
    return visibleOutlets.filter((o) => o.outlet_id === selectedOutletId);
  }, [visibleOutlets, selectedOutletId]);

  if (!canView) return null;

  const totalTables = filteredOutlets.reduce((sum, o) => sum + o.tables_total, 0);
  const occupiedTables = filteredOutlets.reduce((sum, o) => sum + o.tables_occupied, 0);
  const occupancyRate = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0;

  return (
    <WidgetAsyncState isLoading={isLoading} isError={isError} onRetry={refetch}>
      <Card className="h-full">
        <CardHeader className="space-y-1 pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardDescription className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              {t("widgets.pos_live_table_overview.title")}
            </CardDescription>
            {!isOutletScoped && visibleOutlets.length > 1 && (
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

          <div className="grid flex-1 gap-3 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
            {filteredOutlets.map((outlet) => {
              const rate = outlet.tables_total > 0
                ? Math.round((outlet.tables_occupied / outlet.tables_total) * 100)
                : 0;
              return (
                <div key={outlet.outlet_id} className="space-y-2 rounded-lg border p-3">
                  <p className="truncate text-sm font-medium">{outlet.outlet_name}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {outlet.tables_occupied}/{outlet.tables_total}
                    </span>
                    <span className={cn(
                      "font-medium",
                      rate >= 80 ? "text-warning" : rate >= 50 ? "text-primary" : "text-success",
                    )}>
                      {rate}%
                    </span>
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
