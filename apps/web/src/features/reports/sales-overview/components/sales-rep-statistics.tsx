"use client";

import { useTranslations } from "next-intl";
import { DollarSign, ShoppingCart, MapPin, Truck } from "lucide-react";
import type { SalesRepStatisticsData } from "../types";

interface SalesRepStatisticsProps {
  readonly statistics: SalesRepStatisticsData | undefined;
}

export function SalesRepStatistics({ statistics }: SalesRepStatisticsProps) {
  const t = useTranslations("salesOverviewReport");

  if (!statistics) {
    return null;
  }

  const stats = [
    {
      label: t("target_revenue"),
      value:
        statistics.target_amount_formatted && statistics.target_amount_formatted.length > 0
          ? `${statistics.target_amount_formatted} / ${statistics.total_revenue_formatted}`
          : statistics.total_revenue_formatted,
      icon: DollarSign,
      subtitle: `${t("avg_order_value")}: ${statistics.average_order_value_formatted}`,
    },
    {
      label: t("total_orders"),
      value: statistics.total_orders.toString(),
      icon: ShoppingCart,
      subtitle: `${t("conversion_rate")}: ${statistics.conversion_rate.toFixed(1)}%`,
    },
    {
      label: t("visits_completed"),
      value: statistics.visits_completed.toString(),
      icon: MapPin,
    },
    {
      label: t("tasks_completed"),
      value: statistics.tasks_completed.toString(),
      icon: Truck,
    },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;

        return (
          <div key={index} className="rounded-xl border bg-card p-5 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between pb-2">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </div>
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight">{stat.value}</div>
            {stat.subtitle && (
              <div className="text-xs text-muted-foreground mt-1">
                {stat.subtitle}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
