"use client";

import React from "react";
import type { DowntimeLogEvent, MachineStatus } from "../types/oee.types";

interface MachineGraphicTimelineProps {
  logs: DowntimeLogEvent[];
  currentStatus: MachineStatus;
  compactMode?: boolean;
}

export function MachineGraphicTimeline({
  logs,
  currentStatus,
  compactMode = false,
}: MachineGraphicTimelineProps) {
  // Generate 24 segment blocks representing 24 hours of a shift/day
  // Default status is running unless specified in logs
  const hours = Array.from({ length: 24 }, (_, i) => {
    const hourStr = `${i.toString().padStart(2, "0")}:00`;
    // Find matching log if any
    const matchingLog = logs.find((log) => {
      const startH = parseInt(log.startTime.split(":")[0] || "0", 10);
      const endH = parseInt(log.endTime.split(":")[0] || "24", 10);
      return i >= startH && i <= endH;
    });

    let statusColor = "bg-success"; // Default green for running
    let statusText = "Running (Normal)";
    let reasonText = "Production Active";

    if (matchingLog) {
      if (matchingLog.status === "downtime") {
        statusColor = "bg-destructive";
        statusText = "Downtime / Stop";
        reasonText = matchingLog.reason;
      } else if (matchingLog.status === "maintenance") {
        statusColor = "bg-warning";
        statusText = "Maintenance / Servis";
        reasonText = matchingLog.reason;
      } else if (matchingLog.status === "idle") {
        statusColor = "bg-muted-foreground/40";
        statusText = "Idle";
        reasonText = matchingLog.reason;
      }
    } else if (i >= 18 && currentStatus === "downtime") {
      // Recent status reflection
      statusColor = "bg-destructive";
      statusText = "Current Downtime";
      reasonText = "Machine Stop";
    }

    return {
      hour: hourStr,
      color: statusColor,
      statusText,
      reasonText,
    };
  });

  return (
    <div className="space-y-1.5 w-full">
      {!compactMode && (
        <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
          <span>Visualisasi Operasi 24 Jam</span>
          <span>00:00 - 24:00</span>
        </div>
      )}

      {/* Segmented Timeline Bar */}
      <div className="flex h-3 w-full rounded-lg overflow-hidden bg-muted/30 p-0.5 gap-0.5 border border-border/40">
        {hours.map((h, index) => (
          <div
            key={index}
            className={`flex-1 ${h.color} transition-all hover:opacity-80 cursor-pointer rounded-xs`}
            title={`${h.hour}: ${h.statusText} (${h.reasonText})`}
          />
        ))}
      </div>

      {!compactMode && (
        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>24:00</span>
        </div>
      )}
    </div>
  );
}
