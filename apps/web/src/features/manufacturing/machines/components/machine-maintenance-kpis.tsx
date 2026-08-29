"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  formatDurationMinutes,
  formatMtbf,
  formatMttr,
  getHealthColorClass,
} from "../utils/machine.utils";

interface MachineMaintenanceKpisProps {
  healthIndex: number;
  mtbfHours: number;
  mttrMinutes: number;
  totalDowntimeTodayMinutes: number;
  totalIncidentsMonth: number;
}

export function MachineMaintenanceKpis({
  healthIndex,
  mtbfHours,
  mttrMinutes,
  totalDowntimeTodayMinutes,
  totalIncidentsMonth,
}: MachineMaintenanceKpisProps) {
  const t = useTranslations("manufacturingMachines.metrics");

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Machine Health Index */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-2 flex flex-col justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">
          {t("healthIndex")}
        </span>
        <div className={`text-2xl font-bold font-mono ${getHealthColorClass(healthIndex)}`}>
          {healthIndex}%
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
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

      {/* 2. MTBF */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">
          {t("mtbf")}
        </span>
        <div className="text-2xl font-bold font-mono text-foreground">
          {formatMtbf(mtbfHours)}
        </div>
        <span className="text-xs text-muted-foreground block truncate">
          {t("mtbfDesc")}
        </span>
      </div>

      {/* 3. MTTR */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">
          {t("mttr")}
        </span>
        <div className="text-2xl font-bold font-mono text-foreground">
          {formatMttr(mttrMinutes)}
        </div>
        <span className="text-xs text-muted-foreground block truncate">
          {t("mttrDesc")}
        </span>
      </div>

      {/* 4. Downtime Today */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">
          {t("downtimeToday")}
        </span>
        <div className="text-2xl font-bold font-mono text-foreground">
          {formatDurationMinutes(totalDowntimeTodayMinutes)}
        </div>
        <span className="text-xs text-muted-foreground block">
          {totalIncidentsMonth} {t("incidentsMonth")}
        </span>
      </div>
    </div>
  );
}
