"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Package, Activity } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/utils";
import type { StockValuationStats } from "../types";
import { cn } from "@/lib/utils";

interface StatsCardsProps {
  readonly stats?: StockValuationStats;
  readonly isLoading?: boolean;
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  const t = useTranslations("stockValuations.stats");

  const cards = [
    {
      title: t("totalMovements"),
      description: t("totalMovementsDesc"),
      value: stats?.total_movements?.toLocaleString() ?? "0",
      icon: Activity,
      iconColor: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: t("netQuantity"),
      description: t("netQuantityDesc"),
      value: stats?.net_quantity?.toLocaleString() ?? "0",
      icon: Package,
      iconColor: "text-green-500",
      bgColor: "bg-green-500/10",
      trend: stats?.net_quantity ?? 0,
    },
    {
      title: t("netValue"),
      description: t("netValueDesc"),
      value: formatCurrency(stats?.net_value ?? 0),
      icon: stats?.net_value && stats.net_value >= 0 ? TrendingUp : TrendingDown,
      iconColor: stats?.net_value && stats.net_value >= 0 ? "text-emerald-500" : "text-red-500",
      bgColor: stats?.net_value && stats.net_value >= 0 ? "bg-emerald-500/10" : "bg-red-500/10",
    },
    {
      title: t("averageUnitCost"),
      description: t("averageUnitCostDesc"),
      value: formatCurrency(stats?.average_unit_cost ?? 0),
      icon: TrendingUp,
      iconColor: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-8 w-8 bg-muted rounded-lg" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 bg-muted rounded mb-1" />
              <div className="h-3 w-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={cn("p-2 rounded-lg", card.bgColor)}>
                <Icon className={cn("h-4 w-4", card.iconColor)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
