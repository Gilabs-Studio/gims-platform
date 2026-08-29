"use client";

import React from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { BaseMachineItem, MachineItem } from "../types/machine.types";
import { MachineStatusBadge } from "./machine-status-badge";
import {
  getHealthColorClass,
  getSensorStatus,
} from "../utils/machine.utils";

interface MachineCardProps {
  machine: BaseMachineItem;
  onSelectMachine?: (machine: BaseMachineItem) => void;
}

export function MachineCard({
  machine,
  onSelectMachine,
}: MachineCardProps) {
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
      onClick={() => onSelectMachine?.(machine)}
      className="rounded-xl border border-border bg-card p-5 flex flex-col justify-between space-y-4 hover:border-border/80 transition-colors cursor-pointer"
    >
      {/* Top Header: Code & Status */}
      <div className="flex items-center justify-between gap-2">
        <div className="font-bold text-sm text-foreground font-mono">
          {machine.code}
        </div>
        <MachineStatusBadge status={machine.status} />
      </div>

      {/* Machine Image */}
      <div className="relative h-28 w-full rounded-lg bg-muted/30 p-2 flex items-center justify-center border border-border/40">
        <Image
          src={machineImage}
          alt={machine.name}
          width={120}
          height={80}
          className="h-full w-full object-contain"
        />
      </div>

      {/* Name & Line */}
      <div className="space-y-0.5">
        <h3 className="font-semibold text-sm text-foreground line-clamp-1">
          {machine.name}
        </h3>
        <p className="text-xs text-muted-foreground truncate">
          {machine.lineName ?? "Production Line"}
        </p>
      </div>

      {/* Metrics Row: Health & OEE */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50 text-xs">
        <div className="space-y-1">
          <div className="text-[11px] text-muted-foreground font-medium">
            Health Score
          </div>
          <div className={`font-bold font-mono text-sm ${getHealthColorClass(healthIndex)}`}>
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

        <div className="space-y-1">
          <div className="text-[11px] text-muted-foreground font-medium">
            OEE Score
          </div>
          <div className="font-bold font-mono text-sm text-foreground">
            {(machine.oeeScore ?? 80).toFixed(1)}%
          </div>
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${Math.min(100, machine.oeeScore ?? 80)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Sensors & Output */}
      <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/50">
        <div>
          <span className="text-[11px] text-muted-foreground block">Output:</span>
          <span className="font-mono font-medium text-foreground text-xs">
            {machine.partsPerHour ?? 0} pcs/h
          </span>
        </div>
        <div>
          <span className="text-[11px] text-muted-foreground block">Temp / Vib:</span>
          <span
            className={`font-mono font-medium text-xs ${
              tempStatus === "critical" || vibStatus === "critical"
                ? "text-rose-600 font-bold"
                : "text-foreground"
            }`}
          >
            {temp}°C / {vib}G
          </span>
        </div>
      </div>

      {/* 24h Timeline Mini Strip */}
      <div className="space-y-1 pt-1 border-t border-border/50">
        <div className="text-[11px] text-muted-foreground font-medium">
          24h Timeline
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
      </div>

      {/* Footer: Operator & Detail Action */}
      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="h-6 w-6 shrink-0 border border-border">
            <AvatarFallback dataSeed={operatorName}>
              {operatorName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium text-muted-foreground truncate">
            {operatorName}
          </span>
        </div>

        <Link
          href={`/manufacturing/machines/${machine.id}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-muted/50 transition-colors"
        >
          Detail →
        </Link>
      </div>
    </div>
  );
}
