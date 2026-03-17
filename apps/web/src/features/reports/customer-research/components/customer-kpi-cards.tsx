"use client";

import { useTranslations } from "next-intl";
import { Users, UserCheck, UserX, Wallet, ShoppingCart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import type { CustomerResearchKpis } from "../types";

interface CustomerKpiCardsProps {
  readonly data?: CustomerResearchKpis;
  readonly isLoading?: boolean;
}

export function CustomerKpiCards({
  data,
  isLoading,
}: CustomerKpiCardsProps) {
  const t = useTranslations("customerResearchReport.kpis");

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-28" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totalCustomers = data?.total_customers ?? 0;
  const activeCustomers = data?.active_customers ?? 0;
  const inactiveCustomers = data?.inactive_customers ?? 0;
  const totalRevenue = data?.total_revenue ?? 0;
  const averageOrderValue = data?.average_order_value ?? 0;

  const cards = [
    {
      key: "total",
      label: t("total_customers"),
      value: totalCustomers.toLocaleString("id-ID"),
      icon: Users,
    },
    {
      key: "active",
      label: t("active_customers"),
      value: activeCustomers.toLocaleString("id-ID"),
      icon: UserCheck,
    },
    {
      key: "inactive",
      label: t("inactive_customers"),
      value: inactiveCustomers.toLocaleString("id-ID"),
      icon: UserX,
    },
    {
      key: "revenue",
      label: t("total_revenue"),
      value: formatCurrency(totalRevenue),
      icon: Wallet,
    },
    {
      key: "aov",
      label: t("average_order_value"),
      value: formatCurrency(averageOrderValue),
      icon: ShoppingCart,
    },
  ] as const;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                {item.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tracking-tight">{item.value}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
