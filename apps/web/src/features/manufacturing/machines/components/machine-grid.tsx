"use client";

import React from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { BaseMachineItem, MachineItem } from "../types/machine.types";
import { MachineCard } from "./machine-card";
import { MachineStatusBadge } from "./machine-status-badge";
import {
  getHealthColorClass,
  getSensorStatus,
} from "../utils/machine.utils";

interface MachineGridProps {
  machines: BaseMachineItem[];
  viewMode?: "grid" | "table";
  onSelectMachine?: (machine: BaseMachineItem) => void;
  onReportIncident?: (machine: BaseMachineItem) => void;
}

export function MachineGrid({
  machines,
  viewMode = "table",
  onSelectMachine,
}: MachineGridProps) {
  if (machines.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
        <p className="text-sm text-muted-foreground font-medium">
          Tidak ada mesin yang sesuai dengan kriteria filter.
        </p>
      </div>
    );
  }

  // 1. Table / Horizontal Row View (Matching Reference Design)
  if (viewMode === "table") {
    return (
      <div className="space-y-3">
        {machines.map((machine) => {
          const fullMachine = machine as Partial<MachineItem>;
          const temp =
            fullMachine.currentTelemetry?.temperature ??
            machine.temperature ??
            72.0;
          const tempStatus =
            fullMachine.currentTelemetry?.temperatureStatus ??
            getSensorStatus(temp, "temperature");
          const vib =
            fullMachine.currentTelemetry?.vibration ??
            machine.vibrationLevel ??
            1.8;
          const vibStatus =
            fullMachine.currentTelemetry?.vibrationStatus ??
            getSensorStatus(vib, "vibration");
          const operatorName =
            fullMachine.assignedOperator?.name ?? "Operator On Duty";
          const healthIndex =
            fullMachine.healthIndex ??
            (fullMachine.status === "running"
              ? 92
              : fullMachine.status === "idle"
              ? 80
              : 50);
          const timelineBlocks = fullMachine.recentTimelineBlocks ?? [];

          const machineImage =
            machine.imageUrl ||
            (machine.code.includes("INJ")
              ? "/images/machines/inj-310.svg"
              : machine.code.includes("CNC")
              ? "/images/machines/cnc-v01.svg"
              : machine.code.includes("STP")
              ? "/images/machines/stp-200.svg"
              : "/images/machines/rob-k01.svg");

          return (
            <div
              key={machine.id}
              onClick={() => onSelectMachine?.(machine)}
              className="rounded-xl border border-border bg-card p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-border/80 transition-colors"
            >
              {/* Machine Image & Identity */}
              <div className="flex items-center gap-3.5 min-w-[240px] max-w-[280px]">
                <div className="relative h-14 w-18 shrink-0 rounded-lg bg-muted/30 p-1 flex items-center justify-center border border-border/40">
                  <Image
                    src={machineImage}
                    alt={machine.name}
                    width={72}
                    height={56}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="font-bold text-sm text-foreground font-mono leading-tight">
                    {machine.code}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {machine.lineName ?? "Production Line"}
                  </div>
                  <div className="text-[11px] text-muted-foreground/80 truncate">
                    {machine.name}
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="shrink-0">
                <MachineStatusBadge status={machine.status} />
              </div>

              {/* Health Score */}
              <div className="min-w-[85px] space-y-1">
                <div className="text-[11px] text-muted-foreground font-medium">
                  Health Score
                </div>
                <div className={`text-sm font-bold font-mono ${getHealthColorClass(healthIndex)}`}>
                  {healthIndex}%
                </div>
                <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      healthIndex >= 85
                        ? "bg-emerald-500"
                        : healthIndex >= 65
                        ? "bg-amber-500"
                        : "bg-rose-500"
                    }`}
                    style={{ width: `${healthIndex}%` }}
                  />
                </div>
              </div>

              {/* OEE Score */}
              <div className="min-w-[85px] space-y-1">
                <div className="text-[11px] text-muted-foreground font-medium">
                  OEE Score
                </div>
                <div className="text-sm font-bold font-mono text-foreground">
                  {(machine.oeeScore ?? 80).toFixed(1)}%
                </div>
                <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${Math.min(100, machine.oeeScore ?? 80)}%` }}
                  />
                </div>
              </div>

              {/* Output / Hour */}
              <div className="min-w-[85px] space-y-0.5">
                <div className="text-[11px] text-muted-foreground font-medium">
                  Output / Hour
                </div>
                <div className="text-sm font-bold font-mono text-foreground">
                  {machine.partsPerHour ?? 0}{" "}
                  <span className="text-[11px] font-sans font-normal text-muted-foreground">
                    pcs/h
                  </span>
                </div>
              </div>

              {/* Live Telemetry: Temp & Vib */}
              <div className="min-w-[90px] space-y-0.5 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground text-[11px]">Temp:</span>
                  <span
                    className={`font-mono font-medium ${
                      tempStatus === "critical"
                        ? "text-rose-600 font-bold"
                        : tempStatus === "warning"
                        ? "text-amber-600 font-bold"
                        : "text-foreground"
                    }`}
                  >
                    {temp}°C
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground text-[11px]">Vib:</span>
                  <span
                    className={`font-mono font-medium ${
                      vibStatus === "critical"
                        ? "text-rose-600 font-bold"
                        : vibStatus === "warning"
                        ? "text-amber-600 font-bold"
                        : "text-foreground"
                    }`}
                  >
                    {vib} G
                  </span>
                </div>
              </div>

              {/* 24h Status Timeline */}
              <div className="min-w-[120px] max-w-[150px] space-y-1">
                <div className="text-[11px] text-muted-foreground font-medium">
                  24h Status Timeline
                </div>
                <div className="flex items-center gap-0.5 h-2 w-full">
                  {timelineBlocks.length > 0 ? (
                    timelineBlocks.map((block) => {
                      const bg =
                        block.status === "running"
                          ? "bg-emerald-500"
                          : block.status === "downtime"
                          ? "bg-rose-500"
                          : block.status === "idle"
                          ? "bg-amber-500"
                          : "bg-indigo-500";
                      return (
                        <div
                          key={block.id}
                          style={{ flex: block.durationMinutes }}
                          className={`h-full rounded-xs ${bg}`}
                          title={`${block.start}-${block.end} (${block.status})`}
                        />
                      );
                    })
                  ) : (
                    <div className="h-full w-full rounded-xs bg-emerald-500" />
                  )}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      machine.status === "running"
                        ? "bg-emerald-500"
                        : machine.status === "downtime"
                        ? "bg-rose-500"
                        : machine.status === "idle"
                        ? "bg-amber-500"
                        : "bg-indigo-500"
                    }`}
                  />
                  <span className="capitalize">{machine.status}</span>
                </div>
              </div>

              {/* Operator */}
              <div className="flex items-center gap-2 min-w-[120px]">
                <Avatar className="h-7 w-7 shrink-0 border border-border">
                  <AvatarFallback dataSeed={operatorName}>
                    {operatorName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium text-foreground truncate">
                  {operatorName}
                </span>
              </div>

              {/* Detail Button */}
              <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                <Link
                  href={`/manufacturing/machines/${machine.id}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-muted/50 transition-colors"
                >
                  Detail →
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // 2. Card View (Grid of Vertical Cards)
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {machines.map((machine) => (
        <MachineCard
          key={machine.id}
          machine={machine}
          onSelectMachine={onSelectMachine}
        />
      ))}
    </div>
  );
}
