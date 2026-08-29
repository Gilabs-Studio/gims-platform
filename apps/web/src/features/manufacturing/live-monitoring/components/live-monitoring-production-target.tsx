"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Info } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ProductionTargetMetrics } from "../types/live-monitoring.types";
import { formatInteger, formatDecimal } from "../utils/live-monitoring.utils";

interface LiveMonitoringProductionTargetProps {
  metrics: ProductionTargetMetrics;
}

export function LiveMonitoringProductionTarget({ metrics }: LiveMonitoringProductionTargetProps) {
  const t = useTranslations("manufacturingLiveMonitoring");

  const chartData = [
    { name: t("prodVsTarget.achieved"), value: metrics.completedPct, color: "#10b981" }, // Success
    { name: t("prodVsTarget.remainingTarget"), value: metrics.remainingPct, color: "hsl(var(--muted))" },
  ];

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-base font-semibold">{t("prodVsTarget.title")}</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground/70 cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent>{t("tooltips.prodVsTarget")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 flex-1 flex flex-col justify-between space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative h-28 w-28 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={34}
                  outerRadius={48}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-base font-extrabold font-mono text-foreground">{formatDecimal(metrics.completedPct)}%</span>
            </div>
          </div>

          <div className="space-y-2.5 text-xs flex-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-full bg-success shrink-0" />
                <span>{t("prodVsTarget.achieved")}</span>
              </span>
              <span className="font-bold font-mono text-foreground">
                {formatInteger(metrics.completedCount)} Pcs
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30 shrink-0" />
                <span>{t("prodVsTarget.remainingTarget")}</span>
              </span>
              <span className="font-bold font-mono text-muted-foreground">
                {formatInteger(metrics.remainingCount)} Pcs
              </span>
            </div>
          </div>
        </div>

        {/* Progress bar ratio */}
        <div className="space-y-1.5 pt-2 border-t border-border/40">
          <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
            <span>Overall Completion:</span>
            <strong className="text-foreground">{formatInteger(metrics.completedCount)} / {formatInteger(metrics.targetTotal)} Pcs</strong>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="bg-success h-full transition-all duration-500 rounded-full"
              style={{ width: `${Math.min(100, metrics.completedPct)}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

