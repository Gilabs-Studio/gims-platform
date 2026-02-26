"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      label: t("total_revenue"),
      value: statistics.total_revenue_formatted,
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
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.label}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-medium">{stat.value}</div>
              {stat.subtitle && (
                <div className="text-xs text-muted-foreground mt-1">
                  {stat.subtitle}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
