"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import type { RecentAlarmItem } from "../types/quality-andon.types";

interface QualityAndonRecentAlarmsProps {
  alarms: RecentAlarmItem[];
  onSelectAlarm?: (alarm: RecentAlarmItem) => void;
  onViewAll?: () => void;
}

export function QualityAndonRecentAlarms({
  alarms,
  onSelectAlarm,
  onViewAll,
}: QualityAndonRecentAlarmsProps) {
  const t = useTranslations("manufacturingQualityAndon");

  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col justify-between h-full">
      <div className="pb-3 border-b">
        <h3 className="text-sm font-bold text-foreground">
          {t("recentAlarms.title")}
        </h3>
      </div>

      <div className="py-3 space-y-2.5 flex-1 flex flex-col justify-center">
        {alarms.map((alarm) => {
          const isCritical = alarm.severity === "critical";
          return (
            <div
              key={alarm.id}
              onClick={() => onSelectAlarm?.(alarm)}
              className="flex items-start justify-between gap-2 p-2 rounded-md hover:bg-muted/30 transition-colors cursor-pointer text-xs"
            >
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`h-2 w-2 rounded-full shrink-0 ${
                      isCritical ? "bg-destructive animate-pulse" : "bg-warning"
                    }`}
                  />
                  <span className="font-semibold text-foreground truncate">{alarm.title}</span>
                  <Badge
                    variant={isCritical ? "destructive" : "warning"}
                    className="text-[9px] uppercase font-bold px-1.5 py-0"
                  >
                    {t(`severity.${alarm.severity}`)}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground truncate pl-3.5">
                  {alarm.lineName} • {alarm.productName}
                </p>
              </div>

              <div className="text-right shrink-0 font-mono text-[10px] text-muted-foreground">
                <div>{alarm.timestamp}</div>
                <div className="text-[10px] text-muted-foreground/70">{alarm.relativeTime}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-2 border-t text-center">
        <button
          type="button"
          onClick={onViewAll}
          className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
        >
          <span>{t("recentAlarms.viewAllAlarms")}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
