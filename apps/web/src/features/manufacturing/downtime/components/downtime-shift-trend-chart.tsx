"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
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
import type { ShiftTrendItem } from "../types/downtime.types";

interface DowntimeShiftTrendChartProps {
  readonly data: ShiftTrendItem[];
  readonly isLoading?: boolean;
}

const chartConfig = {
  unplanned: {
    label: "Unplanned Loss",
    color: "hsl(var(--destructive))",
  },
  planned: {
    label: "Planned Routine",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export function DowntimeShiftTrendChart({
  data,
  isLoading,
}: DowntimeShiftTrendChartProps) {
  const t = useTranslations("manufacturingDowntime.trends");

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[280px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((item) => ({
    shift: item.shift.split(" ")[0] + " " + item.shift.split(" ")[1], // e.g. "Shift 1"
    unplanned: item.unplannedDurationMinutes,
    planned: item.plannedDurationMinutes,
    total: item.totalDurationMinutes,
    incidents: item.incidentCount,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 20, bottom: 20, left: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="shift" tickLine={false} tickMargin={10} axisLine={false} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `${val}m`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <>
                      <span className="font-medium">
                        {name === "unplanned" ? t("unplanned") : t("planned")}
                      </span>
                      <span className="ml-auto font-mono font-medium tabular-nums text-foreground">
                        {value}m
                      </span>
                    </>
                  )}
                />
              }
            />
            <Bar
              dataKey="unplanned"
              name="unplanned"
              fill="hsl(var(--destructive))"
              stackId="a"
              radius={[0, 0, 0, 0]}
              maxBarSize={45}
            />
            <Bar
              dataKey="planned"
              name="planned"
              fill="hsl(var(--primary))"
              stackId="a"
              radius={[4, 4, 0, 0]}
              maxBarSize={45}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
