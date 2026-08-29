"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import type { MachineTimelineBlock } from "../types/machine.types";
import { formatDurationMinutes, getMachineStatusBg } from "../utils/machine.utils";
import { MachineStatusBadge } from "./machine-status-badge";

interface Machine24hTimelineProps {
  timelineBlocks: MachineTimelineBlock[];
  compact?: boolean;
}

export function Machine24hTimeline({
  timelineBlocks,
  compact = false,
}: Machine24hTimelineProps) {
  const t = useTranslations("manufacturingMachines.timeline");
  const [hoveredBlock, setHoveredBlock] = useState<MachineTimelineBlock | null>(null);

  const totalMinutes =
    timelineBlocks.reduce((acc, b) => acc + b.durationMinutes, 0) || 1440;

  const totalRunningMinutes = timelineBlocks
    .filter((b) => b.status === "running")
    .reduce((acc, b) => acc + b.durationMinutes, 0);

  const totalDowntimeMinutes = timelineBlocks
    .filter((b) => b.status === "downtime")
    .reduce((acc, b) => acc + b.durationMinutes, 0);

  if (compact) {
    return (
      <div className="flex h-2.5 w-full rounded-xs overflow-hidden gap-0.5 bg-muted p-0.5">
        {timelineBlocks.map((block) => {
          const widthPct = Math.max(1.5, (block.durationMinutes / totalMinutes) * 100);
          const bg = getMachineStatusBg(block.status);
          return (
            <div
              key={block.id}
              style={{ width: `${widthPct}%` }}
              title={`${block.start} - ${block.end} (${block.durationMinutes}m): ${block.status}`}
              className={`h-full rounded-xs ${bg}`}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="space-y-0.5">
          <h3 className="font-semibold text-sm text-foreground">
            {t("title")}
          </h3>
          <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
        </div>

        {/* Aggregate Shift Duration Stats */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-muted-foreground">{t("totalRunTime")}:</span>
            <strong className="text-foreground font-semibold">
              {formatDurationMinutes(totalRunningMinutes)}
            </strong>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
            <span className="text-muted-foreground">{t("totalDownTime")}:</span>
            <strong className="text-rose-600 font-semibold">
              {formatDurationMinutes(totalDowntimeMinutes)}
            </strong>
          </div>
        </div>
      </div>

      {/* 24-Hour Segmented Bar */}
      <div className="space-y-1.5">
        <div className="flex h-5 w-full rounded-md overflow-hidden gap-0.5 bg-muted p-0.5">
          {timelineBlocks.map((block) => {
            const widthPct = Math.max(1.2, (block.durationMinutes / totalMinutes) * 100);
            const bg = getMachineStatusBg(block.status);
            return (
              <div
                key={block.id}
                style={{ width: `${widthPct}%` }}
                onMouseEnter={() => setHoveredBlock(block)}
                onMouseLeave={() => setHoveredBlock(null)}
                className={`h-full rounded-xs cursor-pointer transition-opacity hover:opacity-80 ${bg}`}
              />
            );
          })}
        </div>

        {/* Time Axis Legend */}
        <div className="flex justify-between text-[10px] text-muted-foreground font-mono px-0.5">
          <span>00:00</span>
          <span>04:00</span>
          <span>08:00</span>
          <span>12:00</span>
          <span>16:00</span>
          <span>20:00</span>
          <span>24:00</span>
        </div>
      </div>

      {/* Hover Info or Status Legend */}
      {hoveredBlock ? (
        <div className="p-2.5 rounded-lg bg-muted/40 border border-border flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <MachineStatusBadge status={hoveredBlock.status} />
            <span className="font-semibold text-foreground font-mono">
              {hoveredBlock.start} – {hoveredBlock.end} ({formatDurationMinutes(hoveredBlock.durationMinutes)})
            </span>
            {hoveredBlock.reason && (
              <span className="text-muted-foreground border-l border-border pl-2">
                {hoveredBlock.reason}
              </span>
            )}
          </div>
          {hoveredBlock.category && (
            <span className="text-[11px] font-mono text-muted-foreground">
              {hoveredBlock.category}
            </span>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-5 text-xs text-muted-foreground pt-1 border-t border-border/50">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
            <span>{t("legendRunning")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
            <span>{t("legendIdle")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
            <span>{t("legendDowntime")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0" />
            <span>{t("legendMaintenance")}</span>
          </div>
        </div>
      )}
    </div>
  );
}
