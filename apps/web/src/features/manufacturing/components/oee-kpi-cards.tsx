"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OeeDonutChart } from "./oee-donut-chart";
import type { OEEMetrics } from "../types/oee.types";

interface OeeKpiCardsProps {
  metrics: OEEMetrics;
}

export function OeeKpiCards({ metrics }: OeeKpiCardsProps) {
  const t = useTranslations("manufacturing");

  const isHighOee = metrics.overallOee >= metrics.targetOee;

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
      {/* Main Overall Plant OEE Card */}
      <Card className="md:col-span-7 bg-card border-border shadow-xs transition-all duration-300 hover:shadow-md">
        <CardContent className="p-5 flex flex-col sm:flex-row items-center gap-6">
          <OeeDonutChart
            availability={metrics.averageAvailability}
            performance={metrics.averagePerformance}
            quality={metrics.averageQuality}
            size={100}
            strokeWidth={12}
            centerText={`${metrics.overallOee.toFixed(0)}%`}
          />

          <div className="flex-1 space-y-2 text-center sm:text-left w-full">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("kpi.plantOee")}
              </span>
              <Badge variant={isHighOee ? "success" : "destructive"} className="text-[11px] font-bold rounded-lg px-2 py-0.5">
                {t("kpi.targetOee")}
              </Badge>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight text-foreground">
                {metrics.overallOee.toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                ({isHighOee ? "+2.4% vs last shift" : "-3.1% vs target"})
              </span>
            </div>

            {/* OEE Legend breakdown dots */}
            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3 border-t border-border/60 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary inline-block" />
                <span className="text-muted-foreground">{t("kpi.availability")}:</span>
                <span className="font-semibold text-foreground">{metrics.averageAvailability}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-warning inline-block" />
                <span className="text-muted-foreground">{t("kpi.performance")}:</span>
                <span className="font-semibold text-foreground">{metrics.averagePerformance}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-success inline-block" />
                <span className="text-muted-foreground">{t("kpi.quality")}:</span>
                <span className="font-semibold text-foreground">{metrics.averageQuality}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Production Output & Machine Fleet Stat Cards */}
      <div className="md:col-span-5 grid grid-cols-2 gap-4">
        <Card className="bg-card border-border shadow-xs p-4 flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase">{t("kpi.totalOutput")}</span>
            <div className="text-2xl font-bold text-foreground tracking-tight">
              {metrics.totalActualOutput.toLocaleString("id-ID")}
              <span className="text-xs font-normal text-muted-foreground ml-1">/ {metrics.totalTargetOutput.toLocaleString("id-ID")}</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-border flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t("kpi.scrapRate")}:</span>
            <span className={`font-bold ${metrics.defectRate > 2.0 ? "text-destructive" : "text-success"}`}>
              {metrics.defectRate}% ({metrics.totalScrapUnits} {t("kpi.units")})
            </span>
          </div>
        </Card>

        <Card className="bg-card border-border shadow-xs p-4 flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase">{t("kpi.activeMachines")}</span>
            <div className="text-2xl font-bold text-success tracking-tight">
              {metrics.runningMachinesCount}
              <span className="text-xs font-normal text-muted-foreground ml-1">/ {metrics.totalMachinesCount}</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-border flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t("kpi.downMachines")}:</span>
            <span className="font-bold text-destructive">
              {metrics.downtimeMachinesCount} Down
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}
