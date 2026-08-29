"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Info } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { OEELineTrendPoint, TimeWindowOption } from "../types/live-monitoring.types";

interface LiveMonitoringOEEChartProps {
  data: OEELineTrendPoint[];
  timeWindow: TimeWindowOption;
  onTimeWindowChange: (tw: TimeWindowOption) => void;
}

export function LiveMonitoringOEEChart({ data, timeWindow, onTimeWindowChange }: LiveMonitoringOEEChartProps) {
  const t = useTranslations("manufacturingLiveMonitoring");

  const lineConfig = [
    { key: "line5", label: t("lines.line5"), color: "#8b5cf6", current: "89.2%" }, // Purple
    { key: "line1", label: t("lines.line1"), color: "#10b981", current: "82.4%" }, // Green (success)
    { key: "line2", label: t("lines.line2"), color: "#2563eb", current: "76.1%" }, // Blue (primary)
    { key: "line3", label: t("lines.line3"), color: "#f59e0b", current: "62.3%" }, // Amber (warning)
    { key: "line4", label: t("lines.line4"), color: "#ef4444", current: "35.8%" }, // Red (destructive)
  ];

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-base font-semibold">{t("oeeChart.title")}</CardTitle>
          <TooltipProvider>
            <UiTooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground/70 cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent>{t("tooltips.oeeChart")}</TooltipContent>
            </UiTooltip>
          </TooltipProvider>
        </div>
        <Select value={timeWindow} onValueChange={(val) => onTimeWindowChange(val as TimeWindowOption)}>
          <SelectTrigger className="w-[140px] h-8 text-xs cursor-pointer bg-card font-medium">
            <SelectValue placeholder={t("timeWindows.30m")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="15m" className="cursor-pointer">{t("timeWindows.15m")}</SelectItem>
            <SelectItem value="30m" className="cursor-pointer">{t("timeWindows.30m")}</SelectItem>
            <SelectItem value="1h" className="cursor-pointer">{t("timeWindows.1h")}</SelectItem>
            <SelectItem value="shift" className="cursor-pointer">{t("timeWindows.shift")}</SelectItem>
            <SelectItem value="today" className="cursor-pointer">{t("timeWindows.today")}</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        {/* Custom Legend Bar with Line chips and Current score */}
        <div className="flex flex-wrap items-center justify-start gap-4 text-xs font-medium pl-1">
          {lineConfig.map((item) => (
            <div key={item.key} className="flex items-center gap-1.5 bg-muted/30 px-2 py-1 rounded-md border border-border/40">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-mono font-bold text-foreground text-[11px] ml-0.5" style={{ color: item.color }}>
                {item.current}
              </span>
            </div>
          ))}
        </div>

        {/* Chart Viewport */}
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(v: number) => `${v}%`}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--popover))",
                  color: "hsl(var(--popover-foreground))",
                  fontSize: 12,
                }}
                formatter={(val: number, name: string) => {
                  const cfg = lineConfig.find((c) => c.key === name);
                  return [`${val}%`, cfg ? cfg.label : name];
                }}
              />
              {lineConfig.map((item) => (
                <Line
                  key={item.key}
                  type="monotone"
                  dataKey={item.key}
                  stroke={item.color}
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: item.color, stroke: "#ffffff", strokeWidth: 1.5 }}
                  activeDot={{ r: 5.5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

