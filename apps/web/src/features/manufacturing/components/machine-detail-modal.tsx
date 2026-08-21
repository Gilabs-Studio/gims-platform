"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OeeDonutChart } from "./oee-donut-chart";
import { MachineGraphicTimeline } from "./machine-graphic-timeline";
import type { MachineItem } from "../types/oee.types";

interface MachineDetailModalProps {
  machine: MachineItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MachineDetailModal({
  machine,
  open,
  onOpenChange,
}: MachineDetailModalProps) {
  const t = useTranslations("manufacturing");

  if (!machine) return null;

  const isRun = machine.status === "running";
  const isDown = machine.status === "downtime";
  const isMaint = machine.status === "maintenance";

  const isTempAlert = machine.temperature > 85.0;
  const isVibAlert = machine.vibrationLevel > 3.5;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6">
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary uppercase bg-primary/10 px-2 py-0.5 rounded-md">
                  {machine.lineName}
                </span>
                <Badge
                  variant={isRun ? "success" : isDown ? "destructive" : isMaint ? "warning" : "secondary"}
                  className="text-xs font-bold uppercase rounded-lg px-2.5 py-0.5"
                >
                  {isRun ? t("machine.status.running") : isDown ? t("machine.status.downtime") : isMaint ? t("machine.status.maintenance") : t("machine.status.idle")}
                </Badge>
              </div>

              <DialogTitle className="text-xl font-extrabold text-foreground">{machine.name}</DialogTitle>
              <p className="text-xs text-muted-foreground">
                {t("machine.modal.id")}: <strong className="text-foreground">{machine.id}</strong> • {t("machine.metrics.lastMaintenance")}: {machine.lastMaintenance}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Core OEE Card */}
        <div className="bg-muted/30 border border-border p-4 rounded-lg flex items-center gap-6">
          <OeeDonutChart
            availability={machine.availabilityScore}
            performance={machine.performanceScore}
            quality={machine.qualityScore}
            size={90}
            strokeWidth={11}
            centerText={`${machine.oeeScore.toFixed(0)}%`}
          />

          <div className="flex-1 space-y-1.5">
            <span className="text-xs font-bold text-muted-foreground uppercase">{t("kpi.plantOee")}</span>
            <div className="text-2xl font-black text-foreground">{machine.oeeScore.toFixed(1)}%</div>
            <div className="flex flex-wrap gap-3 text-xs pt-1">
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">Avail:</span>
                <span className="font-bold text-foreground">{machine.availabilityScore}%</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-warning" />
                <span className="text-muted-foreground">Perf:</span>
                <span className="font-bold text-foreground">{machine.performanceScore}%</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-success" />
                <span className="text-muted-foreground">Qual:</span>
                <span className="font-bold text-foreground">{machine.qualityScore}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Realtime Telemetry Grid */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-foreground">Sensor & Telemetri Real-Time</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className={`p-3 rounded-lg border ${isTempAlert ? "bg-destructive/10 border-destructive/30" : "bg-card border-border"}`}>
              <p className="text-muted-foreground font-medium">{t("machine.metrics.temperature")}</p>
              <p className={`text-base font-bold ${isTempAlert ? "text-destructive" : "text-foreground"}`}>
                {machine.temperature}°C
              </p>
              <p className="text-[10px] text-muted-foreground">{isTempAlert ? "Overheat Warning!" : "Normal (<80°C)"}</p>
            </div>

            <div className={`p-3 rounded-lg border ${isVibAlert ? "bg-warning/10 border-warning/30" : "bg-card border-border"}`}>
              <p className="text-muted-foreground font-medium">{t("machine.metrics.vibration")}</p>
              <p className={`text-base font-bold ${isVibAlert ? "text-warning" : "text-foreground"}`}>
                {machine.vibrationLevel} mm/s
              </p>
              <p className="text-[10px] text-muted-foreground">{isVibAlert ? "Tinggi" : "Safe Threshold"}</p>
            </div>

            <div className="p-3 rounded-lg border bg-card border-border">
              <p className="text-muted-foreground font-medium">{t("machine.metrics.partsPerHour")}</p>
              <p className="text-base font-bold text-foreground">{machine.partsPerHour} Parts/Jam</p>
              <p className="text-[10px] text-muted-foreground">Target: 250 Parts</p>
            </div>

            <div className="p-3 rounded-lg border bg-card border-border">
              <p className="text-muted-foreground font-medium">{t("machine.metrics.cycleTime")}</p>
              <p className="text-base font-bold text-foreground">{machine.cycleTime}</p>
              <p className="text-[10px] text-muted-foreground">Standard: 2.45m</p>
            </div>
          </div>
        </div>

        {/* 24-Hour Timeline & Log Events */}
        <div className="space-y-3 pt-2">
          <MachineGraphicTimeline logs={machine.downtimeLogs} currentStatus={machine.status} />

          <h4 className="text-sm font-bold text-foreground pt-2">{t("machine.modal.recentEvents")}</h4>

          {machine.downtimeLogs.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2">Tidak ada catatan downtime pada shift ini.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {machine.downtimeLogs.map((log) => (
                <div key={log.id} className="p-2.5 rounded-lg border border-border/80 bg-muted/20 text-xs flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{log.startTime} - {log.endTime}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {log.durationMinutes} menit
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">{log.reason}</p>
                  </div>
                  <Badge variant={log.status === "downtime" ? "destructive" : "warning"} className="text-[10px]">
                    {log.category}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer"
          >
            {t("machine.modal.close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
