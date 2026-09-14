"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OeeDonutChart } from "./oee-donut-chart";
import { MachineGraphicTimeline } from "./machine-graphic-timeline";
import type { MachineItem } from "../types/oee.types";

interface MachineCardProps {
  machine: MachineItem;
  onSelect: (machine: MachineItem) => void;
}

export function MachineCard({ machine, onSelect }: MachineCardProps) {
  const t = useTranslations("manufacturing");

  const isRun = machine.status === "running";
  const isDown = machine.status === "downtime";
  const isMaint = machine.status === "maintenance";
  const isHighOee = machine.oeeScore >= 75.0;

  const isTempAlert = machine.temperature > 85.0;
  const isVibAlert = machine.vibrationLevel > 3.5;

  return (
    <Card
      onClick={() => onSelect(machine)}
      className="bg-card border-border shadow-xs cursor-pointer transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 hover:shadow-lg hover:shadow-primary/20 overflow-hidden"
    >
      <CardContent className="p-4 space-y-4">
        {/* Top Header: Machine Title, Line Badge & Status Chip */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-primary uppercase tracking-wide">
              {machine.lineName}
            </span>
            <h3 className="text-base font-bold text-foreground leading-tight">{machine.name}</h3>
            <p className="text-xs text-muted-foreground">ID: {machine.code}</p>
          </div>

          <Badge
            variant={isRun ? "success" : isDown ? "destructive" : isMaint ? "warning" : "secondary"}
            className="text-[11px] font-bold uppercase rounded-lg px-2.5 py-0.5"
          >
            {isRun ? t("machine.status.running") : isDown ? t("machine.status.downtime") : isMaint ? t("machine.status.maintenance") : t("machine.status.idle")}
          </Badge>
        </div>

        {/* 4 Key Metrics Tiles */}
        <div className="grid grid-cols-4 gap-2 bg-muted/40 p-2.5 rounded-lg text-center">
          <div>
            <p className="text-[10px] text-muted-foreground font-medium">{t("machine.metrics.oee")}</p>
            <p className={`text-sm font-black ${isHighOee ? "text-success" : "text-destructive"}`}>
              {machine.oeeScore.toFixed(0)}%
            </p>
          </div>

          <div>
            <p className="text-[10px] text-muted-foreground font-medium">{t("machine.metrics.partsPerHour")}</p>
            <p className="text-sm font-bold text-foreground">{machine.partsPerHour}</p>
          </div>

          <div>
            <p className="text-[10px] text-muted-foreground font-medium">{t("machine.metrics.cavitation")}</p>
            <p className="text-sm font-bold text-foreground">{machine.cavitation}</p>
          </div>

          <div>
            <p className="text-[10px] text-muted-foreground font-medium">{t("machine.metrics.rejects")}</p>
            <p className={`text-sm font-bold ${isDown ? "text-destructive" : "text-muted-foreground"}`}>
              {isRun ? "14" : "72"}
            </p>
          </div>
        </div>

        {/* Donut Chart & Breakdown Legend Row */}
        <div className="flex items-center gap-4 pt-1">
          <OeeDonutChart
            availability={machine.availabilityScore}
            performance={machine.performanceScore}
            quality={machine.qualityScore}
            size={76}
            strokeWidth={10}
          />

          <div className="flex-1 space-y-1 text-xs">
            <p className="font-bold text-foreground">{t("machine.modal.oeeBreakdown")}</p>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary inline-block" />
              <span>Avail: <strong className="text-foreground">{machine.availabilityScore}%</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-warning inline-block" />
              <span>Perf: <strong className="text-foreground">{machine.performanceScore}%</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success inline-block" />
              <span>Qual: <strong className="text-foreground">{machine.qualityScore}%</strong></span>
            </div>
          </div>

          {/* Cycle time & Sensor Alerts */}
          <div className="text-right space-y-1">
            <p className="text-[10px] text-muted-foreground">{t("machine.metrics.cycleTime")}</p>
            <p className="text-sm font-bold text-foreground">{machine.cycleTime}</p>
            <div className="flex items-center justify-end gap-1">
              {isTempAlert && (
                <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-xs">
                  {machine.temperature}°C ⚠️
                </span>
              )}
              {isVibAlert && (
                <span className="text-[10px] font-bold text-warning bg-warning/10 px-1.5 py-0.5 rounded-xs">
                  {machine.vibrationLevel}mm/s
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 24-Hour Graphic Status Timeline Bar */}
        <div className="pt-2 border-t border-border/60">
          <MachineGraphicTimeline logs={machine.downtimeLogs} currentStatus={machine.status} compactMode={false} />
        </div>
      </CardContent>
    </Card>
  );
}
