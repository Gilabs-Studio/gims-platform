"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { CircularProgress } from "../../machines/components/machine-oee-gauge";
import type { OEEMetrics } from "../types/oee.types";

interface OeeKpiCardsProps {
  metrics: OEEMetrics;
}

export function OeeKpiCards({ metrics }: OeeKpiCardsProps) {
  const t = useTranslations("manufacturingOee");

  const getOeeColor = (score: number) => {
    if (score >= 85) return "#10b981"; // emerald-500
    if (score >= 70) return "#0284c7"; // sky-600
    if (score >= 60) return "#f59e0b"; // amber-500
    return "#ef4444"; // rose-500
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Plant OEE Card with Circular Ring */}
      <div className="rounded-xl border border-border bg-card p-5 flex items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("kpi.plantOee")}
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">
            {metrics.overallOee}%
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-emerald-500/30 text-emerald-600 bg-emerald-500/10 font-mono">
              +2.4%
            </Badge>
            <span className="text-[11px]">vs last shift</span>
          </div>
        </div>

        <div className="shrink-0">
          <CircularProgress
            value={metrics.overallOee}
            size={72}
            strokeWidth={7}
            color={getOeeColor(metrics.overallOee)}
            showPercentSymbol={false}
          />
        </div>
      </div>

      {/* 2. Availability Card with Circular Ring */}
      <div className="rounded-xl border border-border bg-card p-5 flex items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            {t("kpi.availability")}
          </span>
          <div className="text-2xl font-bold font-mono text-foreground">
            {metrics.averageAvailability}%
          </div>
          <span className="text-xs text-muted-foreground block truncate">
            {metrics.runningMachinesCount}/{metrics.totalMachinesCount} {t("kpi.activeMachines")}
          </span>
        </div>

        <div className="shrink-0">
          <CircularProgress
            value={metrics.averageAvailability}
            size={72}
            strokeWidth={7}
            color="#10b981"
            showPercentSymbol={false}
          />
        </div>
      </div>

      {/* 3. Performance Card with Circular Ring */}
      <div className="rounded-xl border border-border bg-card p-5 flex items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            {t("kpi.performance")}
          </span>
          <div className="text-2xl font-bold font-mono text-foreground">
            {metrics.averagePerformance}%
          </div>
          <span className="text-xs text-muted-foreground block truncate">
            {metrics.totalActualOutput.toLocaleString()} {t("kpi.units")}
          </span>
        </div>

        <div className="shrink-0">
          <CircularProgress
            value={metrics.averagePerformance}
            size={72}
            strokeWidth={7}
            color="#0284c7"
            showPercentSymbol={false}
          />
        </div>
      </div>

      {/* 4. Quality Card with Circular Ring */}
      <div className="rounded-xl border border-border bg-card p-5 flex items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            {t("kpi.quality")}
          </span>
          <div className="text-2xl font-bold font-mono text-foreground">
            {metrics.averageQuality}%
          </div>
          <span className="text-xs font-medium text-rose-600 block truncate">
            {metrics.defectRate}% {t("kpi.scrapRate")}
          </span>
        </div>

        <div className="shrink-0">
          <CircularProgress
            value={metrics.averageQuality}
            size={72}
            strokeWidth={7}
            color="#6366f1"
            showPercentSymbol={false}
          />
        </div>
      </div>
    </div>
  );
}
