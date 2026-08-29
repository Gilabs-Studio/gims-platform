"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Info } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { AvailabilityBreakdown, PerformanceBreakdown, QualityBreakdown, TopDowntimeItem } from "../types/live-monitoring.types";
import { formatInteger, formatDecimal } from "../utils/live-monitoring.utils";

interface LiveMonitoringOEEBreakdownProps {
  availability: AvailabilityBreakdown;
  performance: PerformanceBreakdown;
  quality: QualityBreakdown;
  topDowntime: {
    totalText: string;
    items: TopDowntimeItem[];
  };
}

export function LiveMonitoringOEEBreakdown({
  availability,
  performance,
  quality,
  topDowntime,
}: LiveMonitoringOEEBreakdownProps) {
  const t = useTranslations("manufacturingLiveMonitoring");

  const availChartData = [
    { name: t("factors.operating"), value: availability.operatingPct, color: "#10b981" }, // Success
    { name: t("factors.plannedDowntime"), value: availability.plannedDowntimePct, color: "#f59e0b" }, // Warning
    { name: t("factors.unplannedDowntime"), value: availability.unplannedDowntimePct, color: "#ef4444" }, // Destructive
  ];

  const perfChartData = [
    { name: t("factors.idealCycle"), value: performance.idealCyclePct, color: "#10b981" }, // Success
    { name: t("factors.minorStop"), value: performance.minorStopPct, color: "#f59e0b" }, // Warning
    { name: t("factors.speedLoss"), value: performance.speedLossPct, color: "#ef4444" }, // Destructive
  ];

  const qualChartData = [
    { name: t("factors.good"), value: quality.goodPct, color: "#10b981" }, // Success
    { name: t("factors.defect"), value: quality.defectPct, color: "#ef4444" }, // Destructive
  ];

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Availability */}
        <Card className="flex flex-col h-full transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-1.5">
              <CardTitle className="text-base font-semibold">{t("factors.availability")}</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-muted-foreground/70 cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent>{t("tooltips.availability")}</TooltipContent>
              </Tooltip>
            </div>
            <span className="font-mono font-bold text-sm text-foreground bg-muted/40 px-2 py-0.5 rounded border border-border/40">
              {formatDecimal(availability.score)}%
            </span>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between space-y-4 pt-1">
            <div className="flex items-center gap-4">
              <div className="relative h-24 w-24 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={availChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={28}
                      outerRadius={42}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                      stroke="none"
                      paddingAngle={2}
                    >
                      {availChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-sm font-bold font-mono text-foreground">{formatDecimal(availability.score)}%</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-muted-foreground flex-1">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-success shrink-0" />
                    <span>{t("factors.operating")}</span>
                  </span>
                  <span className="font-semibold font-mono text-foreground">{availability.operatingPct}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-warning shrink-0" />
                    <span>{t("factors.plannedDowntime")}</span>
                  </span>
                  <span className="font-semibold font-mono text-foreground">{availability.plannedDowntimePct}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-destructive shrink-0" />
                    <span>{t("factors.unplannedDowntime")}</span>
                  </span>
                  <span className="font-semibold font-mono text-foreground">{availability.unplannedDowntimePct}%</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-border/40 text-[11px] text-muted-foreground flex justify-between font-mono">
              <span>Operating Time:</span>
              <strong className="text-foreground">{availability.operatingText}</strong>
            </div>
          </CardContent>
        </Card>

        {/* 2. Performance */}
        <Card className="flex flex-col h-full transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-1.5">
              <CardTitle className="text-base font-semibold">{t("factors.performance")}</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-muted-foreground/70 cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent>{t("tooltips.performance")}</TooltipContent>
              </Tooltip>
            </div>
            <span className="font-mono font-bold text-sm text-foreground bg-muted/40 px-2 py-0.5 rounded border border-border/40">
              {formatDecimal(performance.score)}%
            </span>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between space-y-4 pt-1">
            <div className="flex items-center gap-4">
              <div className="relative h-24 w-24 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={perfChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={28}
                      outerRadius={42}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                      stroke="none"
                      paddingAngle={2}
                    >
                      {perfChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-sm font-bold font-mono text-foreground">{formatDecimal(performance.score)}%</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-muted-foreground flex-1">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-success shrink-0" />
                    <span>{t("factors.idealCycle")}</span>
                  </span>
                  <span className="font-semibold font-mono text-foreground">{performance.idealCyclePct}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-warning shrink-0" />
                    <span>{t("factors.minorStop")}</span>
                  </span>
                  <span className="font-semibold font-mono text-foreground">{performance.minorStopPct}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-destructive shrink-0" />
                    <span>{t("factors.speedLoss")}</span>
                  </span>
                  <span className="font-semibold font-mono text-foreground">{performance.speedLossPct}%</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-border/40 text-[11px] text-muted-foreground flex justify-between font-mono">
              <span>Ideal Runtime:</span>
              <strong className="text-foreground">{performance.idealCycleText}</strong>
            </div>
          </CardContent>
        </Card>

        {/* 3. Quality */}
        <Card className="flex flex-col h-full transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-1.5">
              <CardTitle className="text-base font-semibold">{t("factors.quality")}</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-muted-foreground/70 cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent>{t("tooltips.quality")}</TooltipContent>
              </Tooltip>
            </div>
            <span className="font-mono font-bold text-sm text-foreground bg-muted/40 px-2 py-0.5 rounded border border-border/40">
              {formatDecimal(quality.score)}%
            </span>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between space-y-4 pt-1">
            <div className="flex items-center gap-4">
              <div className="relative h-24 w-24 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={qualChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={28}
                      outerRadius={42}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                      stroke="none"
                      paddingAngle={2}
                    >
                      {qualChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-sm font-bold font-mono text-foreground">{formatDecimal(quality.score)}%</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-muted-foreground flex-1">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-success shrink-0" />
                    <span>{t("factors.good")}</span>
                  </span>
                  <span className="font-semibold font-mono text-foreground">{quality.goodPct}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-destructive shrink-0" />
                    <span>{t("factors.defect")}</span>
                  </span>
                  <span className="font-semibold font-mono text-foreground">{quality.defectPct}%</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-border/40 text-[11px] text-muted-foreground flex justify-between font-mono">
              <span>Good Parts:</span>
              <strong className="text-success">{formatInteger(quality.goodCount)} Pcs</strong>
            </div>
          </CardContent>
        </Card>

        {/* 4. Top Downtime (Today) */}
        <Card className="flex flex-col h-full transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-1.5">
              <CardTitle className="text-base font-semibold">{t("topDowntime.title")}</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-muted-foreground/70 cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent>{t("tooltips.topDowntime")}</TooltipContent>
              </Tooltip>
            </div>
            <Badge variant="outline" className="font-mono text-xs font-semibold">
              {topDowntime.totalText}
            </Badge>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between pt-1">
            <div className="space-y-2 text-xs">
              {topDowntime.items.map((item, idx) => (
                <div key={item.id} className="flex items-center justify-between py-1 border-b border-border/30 last:border-0">
                  <div className="flex items-center gap-2 truncate max-w-[160px]">
                    <span className="w-4 h-4 rounded-xs flex items-center justify-center bg-muted font-mono text-[10px] font-bold text-muted-foreground shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-muted-foreground font-medium truncate">
                      {t(item.reasonKey as Parameters<typeof t>[0])}
                    </span>
                  </div>
                  <span className={`font-mono font-bold ${item.severity === "high" ? "text-destructive" : "text-warning"}`}>
                    {item.durationText} ({item.percentage}%)
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2.5 mt-2 border-t border-border/40 flex items-center justify-between text-xs font-bold font-mono">
              <span className="text-muted-foreground font-sans font-medium">{t("topDowntime.total")}</span>
              <span className="text-foreground">{topDowntime.totalText}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

