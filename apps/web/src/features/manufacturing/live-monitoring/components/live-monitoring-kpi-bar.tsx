"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  Activity,
  Package,
  Target,
  Play,
  AlertOctagon,
  Clock,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Info,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { LiveMonitoringKPISummary } from "../types/live-monitoring.types";
import { formatInteger, formatDecimal } from "../utils/live-monitoring.utils";

interface LiveMonitoringKPIBarProps {
  summary: LiveMonitoringKPISummary;
}

export function LiveMonitoringKPIBar({ summary }: LiveMonitoringKPIBarProps) {
  const t = useTranslations("manufacturingLiveMonitoring");

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Row 1: 4 Primary Plant Performance KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Overall OEE */}
          <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="flex items-start justify-between p-5">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                  <span>{t("kpi.oeeOverall")}</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground/70 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>{t("tooltips.oeeOverall")}</TooltipContent>
                  </Tooltip>
                </div>
                <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
                  {formatDecimal(summary.overallOee)}%
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold">
                  {summary.overallOeeTrend >= 0 ? (
                    <span className="flex items-center text-success">
                      <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                      +{summary.overallOeeTrend}%
                    </span>
                  ) : (
                    <span className="flex items-center text-destructive">
                      <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                      {summary.overallOeeTrend}%
                    </span>
                  )}
                  <span className="text-muted-foreground font-normal">{t("kpi.vsYesterday")}</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-purple/10 text-purple shrink-0">
                <Activity className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Total Production */}
          <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="flex items-start justify-between p-5">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                  <span>{t("kpi.totalProduction")}</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground/70 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>{t("tooltips.totalProduction")}</TooltipContent>
                  </Tooltip>
                </div>
                <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
                  {formatInteger(summary.totalProduction)}{" "}
                  <span className="text-xs font-normal text-muted-foreground font-sans">
                    {t("kpi.pcsUnit")}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold">
                  <span className="flex items-center text-success">
                    <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                    +{summary.totalProductionTrend}%
                  </span>
                  <span className="text-muted-foreground font-normal">{t("kpi.vsYesterday")}</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-primary/10 text-primary shrink-0">
                <Package className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Target Production */}
          <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="flex items-start justify-between p-5">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                  <span>{t("kpi.targetProduction")}</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground/70 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>{t("tooltips.targetProduction")}</TooltipContent>
                  </Tooltip>
                </div>
                <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
                  {formatInteger(summary.targetProduction)}{" "}
                  <span className="text-xs font-normal text-muted-foreground font-sans">
                    {t("kpi.pcsUnit")}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-warning">
                  <span>
                    {formatDecimal(summary.targetAchievedPct)}% {t("kpi.achieved")}
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-success/10 text-success shrink-0">
                <Target className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Defect Rate */}
          <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="flex items-start justify-between p-5">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                  <span>{t("kpi.defectRate")}</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground/70 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>{t("tooltips.defectRate")}</TooltipContent>
                  </Tooltip>
                </div>
                <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
                  {formatDecimal(summary.defectRate, 2)}%
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold">
                  <span className="flex items-center text-success">
                    <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                    {Math.abs(summary.defectRateTrend)}%
                  </span>
                  <span className="text-muted-foreground font-normal">{t("kpi.vsYesterday")}</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-rose/10 text-rose shrink-0">
                <Percent className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 2: 3 Machine Status & Active Downtime KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 5: Running Machines */}
          <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="flex items-start justify-between p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                  <span>{t("kpi.runningMachines")}</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground/70 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>{t("tooltips.runningMachines")}</TooltipContent>
                  </Tooltip>
                </div>
                <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
                  {summary.runningMachines}
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-success">
                  <span>{formatDecimal(summary.runningMachinesPct)}% of fleet</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-cyan/10 text-cyan shrink-0">
                <Play className="w-5 h-5 fill-cyan" />
              </div>
            </CardContent>
          </Card>

          {/* Card 6: Stopped Machines */}
          <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="flex items-start justify-between p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                  <span>{t("kpi.stoppedMachines")}</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground/70 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>{t("tooltips.stoppedMachines")}</TooltipContent>
                  </Tooltip>
                </div>
                <div className="text-2xl font-bold tracking-tight text-destructive font-mono">
                  {summary.stoppedMachines}
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
                  <span>{formatDecimal(summary.stoppedMachinesPct)}% of fleet</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-destructive/10 text-destructive shrink-0">
                <AlertOctagon className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 7: Active Downtime */}
          <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="flex items-start justify-between p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                  <span>{t("kpi.activeDowntime")}</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground/70 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>{t("tooltips.activeDowntime")}</TooltipContent>
                  </Tooltip>
                </div>
                <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
                  {summary.activeDowntimeCount}{" "}
                  <span className="text-xs font-normal text-muted-foreground font-sans">
                    events
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-warning">
                  <span>
                    {summary.linesAffectedCount} {t("kpi.linesAffected")}
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-warning/10 text-warning shrink-0">
                <Clock className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}

