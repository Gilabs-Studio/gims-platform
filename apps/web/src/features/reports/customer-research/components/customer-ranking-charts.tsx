"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import type { CustomerResearchListItem } from "../types";

interface CustomerRankingChartsProps {
  readonly revenueData: CustomerResearchListItem[];
  readonly isRevenueLoading?: boolean;
  readonly frequencyData: CustomerResearchListItem[];
  readonly isFrequencyLoading?: boolean;
}

const revenueConfig = {
  total_revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

const frequencyConfig = {
  total_orders: {
    label: "Orders",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

export function CustomerRankingCharts({
  revenueData,
  isRevenueLoading,
  frequencyData,
  isFrequencyLoading,
}: CustomerRankingChartsProps) {
  const t = useTranslations("customerResearchReport.chart");

  const revenueChartData = useMemo(
    () => (revenueData ?? []).slice(0, 10).map((row) => ({
      customer: row.customer_name,
      total_revenue: row.total_revenue,
    })),
    [revenueData]
  );

  const frequencyChartData = useMemo(
    () => (frequencyData ?? []).slice(0, 10).map((row) => ({
      customer: row.customer_name,
      total_orders: row.total_orders,
    })),
    [frequencyData]
  );

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t("revenue_by_customer")}</CardTitle>
          <CardDescription>{t("revenue_by_customer_desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {isRevenueLoading ? (
            <Skeleton className="h-[320px] w-full" />
          ) : revenueChartData.length === 0 ? (
            <div className="h-[320px] flex items-center justify-center text-sm text-muted-foreground">
              {t("no_data")}
            </div>
          ) : (
            <ChartContainer config={revenueConfig} className="h-[320px] w-full">
              <BarChart data={revenueChartData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="customer" hide />
                <YAxis
                  tickFormatter={(value) =>
                    formatCurrency(Number(value)).replace("Rp", "").trim()
                  }
                  width={90}
                />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
                <Bar dataKey="total_revenue" fill="var(--color-total_revenue)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("purchase_frequency")}</CardTitle>
          <CardDescription>{t("purchase_frequency_desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {isFrequencyLoading ? (
            <Skeleton className="h-[320px] w-full" />
          ) : frequencyChartData.length === 0 ? (
            <div className="h-[320px] flex items-center justify-center text-sm text-muted-foreground">
              {t("no_data")}
            </div>
          ) : (
            <ChartContainer config={frequencyConfig} className="h-[320px] w-full">
              <BarChart data={frequencyChartData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="customer" hide />
                <YAxis width={70} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="total_orders" fill="var(--color-total_orders)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
