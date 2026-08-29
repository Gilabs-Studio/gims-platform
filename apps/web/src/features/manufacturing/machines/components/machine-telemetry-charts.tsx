"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { MachineTelemetryPoint } from "../types/machine.types";

interface MachineTelemetryChartsProps {
  data: MachineTelemetryPoint[];
}

const chartConfig: ChartConfig = {
  temperature: {
    label: "Motor Temp (°C)",
    color: "#e11d48",
  },
  vibration: {
    label: "Vibration (G)",
    color: "#0284c7",
  },
  power: {
    label: "Power (kW)",
    color: "#4f46e5",
  },
};

export function MachineTelemetryCharts({ data }: MachineTelemetryChartsProps) {
  const t = useTranslations("manufacturingMachines.charts");
  const [activeMetric, setActiveMetric] = useState<"both" | "temperature" | "vibration">("both");

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h3 className="font-semibold text-sm text-foreground">
            {t("telemetryTitle")}
          </h3>
          <p className="text-xs text-muted-foreground">{t("telemetrySubtitle")}</p>
        </div>

        {/* Metric Selector */}
        <div className="flex items-center bg-muted/40 p-0.5 rounded-lg border border-border text-xs">
          <button
            type="button"
            onClick={() => setActiveMetric("both")}
            className={`px-3 py-1 font-medium rounded-md transition-colors cursor-pointer ${
              activeMetric === "both"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Sensors
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric("temperature")}
            className={`px-3 py-1 font-medium rounded-md transition-colors cursor-pointer ${
              activeMetric === "temperature"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Temperature
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric("vibration")}
            className={`px-3 py-1 font-medium rounded-md transition-colors cursor-pointer ${
              activeMetric === "vibration"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Vibration
          </button>
        </div>
      </div>

      {/* Area Chart */}
      <ChartContainer config={chartConfig} className="h-60 w-full aspect-auto">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 12, left: -16, bottom: 0 }}
        >
          <defs>
            <linearGradient id="tempGradientMinimal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#e11d48" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#e11d48" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="vibGradientMinimal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0284c7" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.35} />
          <XAxis
            dataKey="time"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            className="text-[10px] font-mono text-muted-foreground"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            className="text-[10px] font-mono text-muted-foreground"
          />

          {(activeMetric === "both" || activeMetric === "temperature") && (
            <ReferenceLine
              y={75}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              label={{
                value: "Temp Limit (75°C)",
                fill: "#d97706",
                fontSize: 10,
                position: "insideTopRight",
              }}
            />
          )}

          {(activeMetric === "both" || activeMetric === "temperature") && (
            <Area
              type="monotone"
              dataKey="temperature"
              name="Temperature"
              stroke="#e11d48"
              strokeWidth={1.5}
              fill="url(#tempGradientMinimal)"
              activeDot={{ r: 3 }}
            />
          )}

          {(activeMetric === "both" || activeMetric === "vibration") && (
            <Area
              type="monotone"
              dataKey="vibration"
              name="Vibration"
              stroke="#0284c7"
              strokeWidth={1.5}
              fill="url(#vibGradientMinimal)"
              activeDot={{ r: 3 }}
            />
          )}

          <ChartTooltip
            cursor={{ stroke: "var(--color-border)", strokeWidth: 1 }}
            content={
              <ChartTooltipContent
                labelFormatter={(value) => `Time: ${value}`}
                formatter={(val, name) => (
                  <div className="flex items-center justify-between gap-4 w-full text-xs">
                    <span className="text-muted-foreground">{name}:</span>
                    <span className="font-mono font-semibold text-foreground">
                      {name === "Temperature" ? `${val}°C` : `${val} G`}
                    </span>
                  </div>
                )}
              />
            }
          />
        </AreaChart>
      </ChartContainer>

      {/* Sensor Metric Readout Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/50 text-xs">
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
          <span className="text-muted-foreground">{t("temperatureCurve")}</span>
          <span className="font-mono font-semibold text-sm text-foreground">
            {data[data.length - 1]?.temperature ?? 0}°C
          </span>
        </div>
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
          <span className="text-muted-foreground">{t("vibrationCurve")}</span>
          <span className="font-mono font-semibold text-sm text-foreground">
            {data[data.length - 1]?.vibration ?? 0} G
          </span>
        </div>
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
          <span className="text-muted-foreground">{t("rpmCurve")}</span>
          <span className="font-mono font-semibold text-sm text-foreground">
            {data[data.length - 1]?.rpm ?? 0} RPM
          </span>
        </div>
      </div>
    </div>
  );
}
