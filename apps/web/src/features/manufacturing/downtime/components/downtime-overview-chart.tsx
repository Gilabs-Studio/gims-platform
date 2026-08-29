"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  ComposedChart,
  Bar,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceLine,
  Cell,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  DowntimeCategoryType,
  DowntimeKpiSummary,
  ParetoItem,
  ProductionLineInfo,
  TimeWindowFilter,
} from "../types/downtime.types";
import { formatDurationMinutes } from "../utils/downtime-calculator";

export interface DowntimeOverviewChartProps {
  readonly data: ParetoItem[];
  readonly summary: DowntimeKpiSummary | undefined;
  readonly productionLines: ProductionLineInfo[];
  readonly selectedLineId: string;
  readonly onLineChange: (lineId: string) => void;
  readonly categoryType: "all" | DowntimeCategoryType;
  readonly onCategoryTypeChange: (type: "all" | DowntimeCategoryType) => void;
  readonly timeWindow: TimeWindowFilter;
  readonly onTimeWindowChange: (w: TimeWindowFilter) => void;
  readonly metric: "duration" | "frequency";
  readonly onMetricChange: (metric: "duration" | "frequency") => void;
  readonly onOpenLogModal: () => void;
  readonly isLoading?: boolean;
}

const chartConfig = {
  duration: {
    label: "Lost Duration",
    color: "hsl(var(--destructive))",
  },
  frequency: {
    label: "Frequency",
    color: "hsl(var(--primary))",
  },
  cumulative: {
    label: "Cumulative %",
    color: "hsl(var(--foreground))",
  },
} satisfies ChartConfig;

export function DowntimeOverviewChart({
  data,
  summary,
  productionLines,
  selectedLineId,
  onLineChange,
  categoryType,
  onCategoryTypeChange,
  timeWindow,
  onTimeWindowChange,
  metric,
  onMetricChange,
  onOpenLogModal,
  isLoading,
}: DowntimeOverviewChartProps) {
  const t = useTranslations("manufacturingDowntime");
  const tChart = useTranslations("manufacturingDowntime.chart");
  const tFilter = useTranslations("manufacturingDowntime.filters");
  const tMetrics = useTranslations("manufacturingDowntime.metrics");

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasData = data && data.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>{tChart("title")}</CardTitle>
            <CardDescription>{tChart("description")}</CardDescription>
          </div>

          {/* Controls Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Time window toggle */}
            <div className="flex items-center bg-muted p-1 rounded-lg">
              <button
                type="button"
                onClick={() => onTimeWindowChange("shift")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  timeWindow === "shift"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tFilter("shift")}
              </button>
              <button
                type="button"
                onClick={() => onTimeWindowChange("day")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  timeWindow === "day"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tFilter("day")}
              </button>
              <button
                type="button"
                onClick={() => onTimeWindowChange("week")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  timeWindow === "week"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tFilter("week")}
              </button>
              <button
                type="button"
                onClick={() => onTimeWindowChange("month")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  timeWindow === "month"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tFilter("month")}
              </button>
            </div>

            {/* Line Filter */}
            <Select value={selectedLineId} onValueChange={onLineChange}>
              <SelectTrigger className="w-[160px] h-9 text-xs">
                <SelectValue placeholder={tFilter("allLines")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tFilter("allLines")}</SelectItem>
                {productionLines.map((line) => (
                  <SelectItem key={line.id} value={line.id}>
                    {line.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Category Type Filter */}
            <Select
              value={categoryType}
              onValueChange={(val) => onCategoryTypeChange(val as "all" | DowntimeCategoryType)}
            >
              <SelectTrigger className="w-[150px] h-9 text-xs">
                <SelectValue placeholder={tFilter("allTypes")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tFilter("allTypes")}</SelectItem>
                <SelectItem value="unplanned">{tFilter("unplanned")}</SelectItem>
                <SelectItem value="planned">{tFilter("planned")}</SelectItem>
              </SelectContent>
            </Select>

            {/* Metric Sort Toggle */}
            <Select
              value={metric}
              onValueChange={(val) => onMetricChange(val as "duration" | "frequency")}
            >
              <SelectTrigger className="w-[130px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="duration">{tFilter("sortByDuration")}</SelectItem>
                <SelectItem value="frequency">{tFilter("sortByFrequency")}</SelectItem>
              </SelectContent>
            </Select>

            {/* Log CTA */}
            <Button
              onClick={onOpenLogModal}
              size="sm"
              className="h-9 px-3 text-xs font-semibold cursor-pointer transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
            >
              {t("logDowntimeBtn")}
            </Button>
          </div>
        </div>

        {/* Minimal Metric Strip (Direct container without nested Card padding) */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
            <div className="rounded-lg border bg-card/70 p-3 shadow-2xs space-y-1">
              <p className="text-xs text-muted-foreground">{tMetrics("totalDowntime")}</p>
              <p className="text-lg font-semibold font-mono tracking-tight text-foreground">
                {formatDurationMinutes(summary.totalLostTimeMinutes)}
              </p>
            </div>
            <div className="rounded-lg border bg-card/70 p-3 shadow-2xs space-y-1">
              <p className="text-xs text-muted-foreground">{tMetrics("unplannedLosses")}</p>
              <p className="text-lg font-semibold font-mono tracking-tight text-destructive">
                {summary.unplannedDurationHours}h ({summary.unplannedPercentage}%)
              </p>
            </div>
            <div className="rounded-lg border bg-card/70 p-3 shadow-2xs space-y-1">
              <p className="text-xs text-muted-foreground">{tMetrics("plannedLosses")}</p>
              <p className="text-lg font-semibold font-mono tracking-tight text-primary">
                {summary.plannedDurationHours}h ({summary.plannedPercentage}%)
              </p>
            </div>
            <div className="rounded-lg border bg-card/70 p-3 shadow-2xs space-y-1">
              <p className="text-xs text-muted-foreground">{tMetrics("mttr")}</p>
              <p className="text-lg font-semibold font-mono tracking-tight text-foreground">
                {summary.mttrMinutes} min
              </p>
            </div>
            <div className="rounded-lg border bg-card/70 p-3 shadow-2xs space-y-1">
              <p className="text-xs text-muted-foreground">{tMetrics("mtbf")}</p>
              <p className="text-lg font-semibold font-mono tracking-tight text-foreground">
                {summary.mtbfHours} hrs
              </p>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {!hasData ? (
          <div className="text-center py-12 text-muted-foreground">{tChart("noData")}</div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[380px] w-full">
            <ComposedChart
              data={data}
              margin={{ top: 20, right: 20, bottom: 40, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="reason"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                fontSize={11}
                interval={0}
                angle={-15}
                textAnchor="end"
              />
              <YAxis
                yAxisId="left"
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => (metric === "duration" ? `${value}m` : `${value}`)}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}%`}
              />
              <ReferenceLine
                yAxisId="right"
                y={80}
                stroke="hsl(var(--destructive))"
                strokeDasharray="4 4"
                label={{
                  value: tChart("threshold80"),
                  fill: "hsl(var(--destructive))",
                  fontSize: 10,
                  position: "insideTopRight",
                  fontWeight: 600,
                }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => {
                      if (name === "cumulativePercentage") {
                        return (
                          <>
                            <span className="font-medium">{tChart("cumulative")}</span>
                            <span className="ml-auto font-mono font-medium tabular-nums text-foreground">
                              {value}%
                            </span>
                          </>
                        );
                      }
                      return (
                        <>
                          <span className="font-medium">
                            {metric === "duration" ? tChart("duration") : tChart("frequency")}
                          </span>
                          <span className="ml-auto font-mono font-medium tabular-nums text-foreground">
                            {metric === "duration" ? `${value}m` : `${value}`}
                          </span>
                        </>
                      );
                    }}
                  />
                }
              />
              <Bar
                yAxisId="left"
                dataKey={metric === "duration" ? "totalDurationMinutes" : "frequency"}
                radius={[4, 4, 0, 0]}
                maxBarSize={45}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.categoryType === "unplanned"
                        ? "hsl(var(--destructive))"
                        : "hsl(var(--primary))"
                    }
                    opacity={entry.isVitalFew ? 1 : 0.65}
                  />
                ))}
              </Bar>
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumulativePercentage"
                stroke="hsl(var(--foreground))"
                strokeWidth={2}
                dot={{ r: 3, fill: "hsl(var(--card))", stroke: "hsl(var(--foreground))", strokeWidth: 1.5 }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
