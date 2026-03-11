"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Warehouse } from "lucide-react";
import type { WarehouseOverviewData } from "../types";

interface WarehouseWidgetProps {
  readonly data?: WarehouseOverviewData;
}

export function WarehouseWidget({ data }: WarehouseWidgetProps) {
  const t = useTranslations("dashboard");
  const warehouses = data?.warehouses ?? [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">
            {t("widgets.warehouse_overview.title")}
          </CardTitle>
          {data?.total_stock_formatted && (
            <span className="text-sm font-semibold text-primary">
              {data.total_stock_formatted}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {warehouses.length === 0 ? (
          <div className="flex h-36 items-center justify-center">
            <p className="text-sm text-muted-foreground">{t("noData")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {warehouses.slice(0, 5).map((wh) => (
              <div key={wh.id} className="space-y-1.5 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Warehouse className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{wh.name}</span>
                  </div>
                  <span className="text-sm font-semibold">
                    {wh.stock_formatted}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress
                    value={Math.min(wh.utilization_percent, 100)}
                    className="h-1.5"
                  />
                  <span className="min-w-[3rem] text-right text-xs text-muted-foreground">
                    {wh.utilization_percent}%
                  </span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{wh.location}</span>
                  <span>
                    {wh.item_count} {t("widgets.warehouse_overview.items")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
