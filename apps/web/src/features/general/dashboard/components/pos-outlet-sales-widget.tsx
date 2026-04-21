"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Store, Filter, DollarSign, ShoppingCart } from "lucide-react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PosOutletSalesWidgetProps {
  readonly widget: WidgetConfig;
}

export function PosOutletSalesWidget({ widget }: PosOutletSalesWidgetProps) {
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

  // Filter outlets based on RBAC: outlet managers see only their outlets
  const visibleOutlets: POSOutletItem[] = useMemo(() => {
    if (!pos?.outlets) return [];
    // Backend already filters by RBAC, just return all
    return pos.outlets;
  }, [pos?.outlets]);

  const filteredOutlets = useMemo(() => {
    if (selectedOutletId === "all") return visibleOutlets;
    return visibleOutlets.filter((o) => o.outlet_id === selectedOutletId);
  }, [visibleOutlets, selectedOutletId]);

  if (!canView) return null;

  return (
    <WidgetAsyncState isLoading={isLoading} isError={isError} onRetry={refetch}>
      <Card className="h-full">
        <CardHeader className="space-y-1 pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardDescription className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              {t("widgets.pos_outlet_sales.title")}
            </CardDescription>
            {!isOutletScoped && visibleOutlets.length > 1 && (
              <Select value={selectedOutletId} onValueChange={setSelectedOutletId}>
                <SelectTrigger className="h-7 w-40 text-xs">
                  <Filter className="mr-1 h-3 w-3" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("widgets.pos_outlet_sales.allOutlets")}</SelectItem>
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
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <DollarSign className="h-3 w-3" />
                {t("widgets.pos_outlet_sales.todayRevenue")}
              </div>
              <CardTitle className="mt-1 text-lg">{pos?.today_total_revenue_formatted ?? "Rp 0"}</CardTitle>
            </div>
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShoppingCart className="h-3 w-3" />
                {t("widgets.pos_outlet_sales.todayOrders")}
              </div>
              <CardTitle className="mt-1 text-lg">{pos?.today_total_orders ?? 0}</CardTitle>
            </div>
          </div>

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
                {filteredOutlets.map((outlet) => (
                  <tr key={outlet.outlet_id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{outlet.outlet_name}</td>
                    <td className="py-2 text-right">{outlet.today_revenue_formatted}</td>
                    <td className="py-2 text-right">{outlet.order_count}</td>
                    <td className="py-2 text-right">
                      <span className={cn(
                        outlet.tables_occupied > 0 ? "text-primary" : "text-muted-foreground",
                      )}>
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
          </div>
        </CardContent>
      </Card>
    </WidgetAsyncState>
  );
}
