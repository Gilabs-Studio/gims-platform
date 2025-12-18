"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import type { DeliveriesMetrics } from "../types";
import { TrendingUpIcon, TrendingDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeliveriesCardProps {
  readonly data?: DeliveriesMetrics;
}

export function DeliveriesCard({ data }: DeliveriesCardProps) {
  const t = useTranslations("dashboard.deliveries");
  const deliveries = data ?? {
    total: 0,
    pending: 0,
    completed: 0,
    total_formatted: "0",
    pending_formatted: "0",
    completed_formatted: "0",
    change_percent: 0,
  };

  const changePercent = deliveries.change_percent ?? 0;
  const isPositive = changePercent >= 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <MetricBox
            label={t("total")}
            value={deliveries.total_formatted ?? String(deliveries.total ?? 0)}
          />
          <MetricBox
            label={t("pending")}
            value={deliveries.pending_formatted ?? String(deliveries.pending ?? 0)}
          />
          <MetricBox
            label={t("completed")}
            value={deliveries.completed_formatted ?? String(deliveries.completed ?? 0)}
            changePercent={changePercent}
            isPositive={isPositive}
          />
        </div>
      </CardContent>
    </Card>
  );
}

interface MetricBoxProps {
  readonly label: string;
  readonly value: string;
  readonly changePercent?: number;
  readonly isPositive?: boolean;
}

function MetricBox({ label, value, changePercent, isPositive }: MetricBoxProps) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-semibold">{value}</p>
        {changePercent !== undefined && (
          <div
            className={cn(
              "flex items-center gap-0.5 text-xs",
              isPositive ? "text-green-600" : "text-red-600",
            )}
          >
            {isPositive ? (
              <TrendingUpIcon className="h-3 w-3" />
            ) : (
              <TrendingDownIcon className="h-3 w-3" />
            )}
            <span>{Math.abs(changePercent).toFixed(1)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

