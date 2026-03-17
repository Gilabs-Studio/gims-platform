"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import type {
  SupplierDeliveryTimeItem,
  SupplierPurchaseVolumeItem,
  SupplierSpendTrendPoint,
} from "../types";

interface SupplierResearchChartsProps {
  readonly purchaseVolume: SupplierPurchaseVolumeItem[];
  readonly isPurchaseVolumeLoading: boolean;
  readonly deliveryTime: SupplierDeliveryTimeItem[];
  readonly isDeliveryTimeLoading: boolean;
  readonly spendTrend: SupplierSpendTrendPoint[];
  readonly isSpendTrendLoading: boolean;
}

const purchaseVolumeChartConfig = {
  purchase_value: {
    label: "Purchase Value",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

const deliveryTimeChartConfig = {
  lead_time: {
    label: "Lead Time",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

const spendTrendChartConfig = {
  spend: {
    label: "Spend",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

function ChartLoading() {
  return <Skeleton className="h-80 w-full" />;
}

export function SupplierResearchCharts({
  purchaseVolume,
  isPurchaseVolumeLoading,
  deliveryTime,
  isDeliveryTimeLoading,
  spendTrend,
  isSpendTrendLoading,
}: SupplierResearchChartsProps) {
  const t = useTranslations("supplierResearchReport.charts");

  const purchaseVolumeChartData = useMemo(() => {
    return (purchaseVolume ?? []).slice(0, 8).map((item) => ({
      supplier: item.supplier_name,
      purchase_value: item.total_purchase_value,
    }));
  }, [purchaseVolume]);

  const deliveryTimeChartData = useMemo(() => {
    return (deliveryTime ?? []).slice(0, 8).map((item) => ({
      supplier: item.supplier_name,
      lead_time: item.average_lead_time_days,
      on_time_rate: item.supplier_on_time_rate,
    }));
  }, [deliveryTime]);

  const spendTrendChartData = useMemo(() => {
    return (spendTrend ?? []).map((point) => ({
      period: point.period,
      spend: point.total_purchase_value,
    }));
  }, [spendTrend]);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>{t("purchaseVolume")}</CardTitle>
          <CardDescription>{t("purchaseValue")}</CardDescription>
        </CardHeader>
        <CardContent>
          {isPurchaseVolumeLoading ? (
            <ChartLoading />
          ) : purchaseVolumeChartData.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {t("noData")}
            </div>
          ) : (
            <ChartContainer
              config={purchaseVolumeChartConfig}
              className="h-80 w-full"
            >
              <BarChart data={purchaseVolumeChartData} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="supplier" tickLine={false} axisLine={false} hide />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${Math.round(value / 1000000)}M`}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => formatCurrency(Number(value))}
                    />
                  }
                />
                <Bar
                  dataKey="purchase_value"
                  fill="var(--color-purchase_value)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("deliveryTime")}</CardTitle>
          <CardDescription>{t("leadTime")}</CardDescription>
        </CardHeader>
        <CardContent>
          {isDeliveryTimeLoading ? (
            <ChartLoading />
          ) : deliveryTimeChartData.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {t("noData")}
            </div>
          ) : (
            <ChartContainer config={deliveryTimeChartConfig} className="h-80 w-full">
              <BarChart data={deliveryTimeChartData} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="supplier" tickLine={false} axisLine={false} hide />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name, props) => {
                        if (name === "lead_time") {
                          const row = props.payload;
                          const onTimeRate = row?.on_time_rate ?? 0;
                          return (
                            <>
                              <span>{`${Number(value).toFixed(2)} ${t("leadTime")}`}</span>
                              <span className="ml-2 text-xs text-muted-foreground">
                                {`${t("onTimeRate")}: ${Number(onTimeRate).toFixed(2)}%`}
                              </span>
                            </>
                          );
                        }

                        return <span>{String(value)}</span>;
                      }}
                    />
                  }
                />
                <Bar dataKey="lead_time" fill="var(--color-lead_time)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("spendTrend")}</CardTitle>
          <CardDescription>{t("purchaseValue")}</CardDescription>
        </CardHeader>
        <CardContent>
          {isSpendTrendLoading ? (
            <ChartLoading />
          ) : spendTrendChartData.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {t("noData")}
            </div>
          ) : (
            <ChartContainer config={spendTrendChartConfig} className="h-80 w-full">
              <LineChart data={spendTrendChartData} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="period" tickLine={false} axisLine={false} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${Math.round(value / 1000000)}M`}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="spend"
                  stroke="var(--color-spend)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
