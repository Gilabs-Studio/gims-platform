"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Maximize2, Minimize2, RefreshCw, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { TimeWindowOption } from "../types/live-monitoring.types";

interface LiveMonitoringHeaderProps {
  lastUpdated: string;
  selectedLineId: string;
  onLineChange: (lineId: string) => void;
  timeWindow: TimeWindowOption;
  onTimeWindowChange: (tw: TimeWindowOption) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  autoRefreshEnabled: boolean;
  onToggleAutoRefresh: () => void;
  isFetching?: boolean;
  onRefreshNow?: () => void;
}

export function LiveMonitoringHeader({
  lastUpdated,
  selectedLineId,
  onLineChange,
  isFullscreen,
  onToggleFullscreen,
  autoRefreshEnabled,
  onToggleAutoRefresh,
  isFetching,
  onRefreshNow,
}: LiveMonitoringHeaderProps) {
  const t = useTranslations("manufacturingLiveMonitoring");

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      {/* Title & Subtitle */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      {/* Right Controls: Status Indicator, Line Filter, Auto Refresh, Fullscreen */}
      <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
        {/* Live Status & Last Updated Chip */}
        <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg border border-border bg-card shadow-xs">
          <span className="text-muted-foreground">
            {t("updated")}: <strong className="font-mono text-foreground">{lastUpdated}</strong>
          </span>
          {autoRefreshEnabled ? (
            <span className="flex items-center gap-1.5 text-success font-semibold ml-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
              </span>
              <span>{t("live")}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-muted-foreground font-normal ml-1">
              <Radio className="w-3 h-3 text-muted-foreground" />
              <span>Paused</span>
            </span>
          )}
        </div>

        {/* Line Selector */}
        <Select value={selectedLineId} onValueChange={onLineChange}>
          <SelectTrigger className="w-[170px] h-9 text-xs cursor-pointer bg-card font-medium">
            <SelectValue placeholder={t("allLines")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="cursor-pointer font-medium">{t("allLines")}</SelectItem>
            <SelectItem value="line-1" className="cursor-pointer">{t("lines.line1")}</SelectItem>
            <SelectItem value="line-2" className="cursor-pointer">{t("lines.line2")}</SelectItem>
            <SelectItem value="line-3" className="cursor-pointer">{t("lines.line3")}</SelectItem>
            <SelectItem value="line-4" className="cursor-pointer">{t("lines.line4")}</SelectItem>
            <SelectItem value="line-5" className="cursor-pointer">{t("lines.line5")}</SelectItem>
            <SelectItem value="line-6" className="cursor-pointer">{t("lines.line6")}</SelectItem>
          </SelectContent>
        </Select>

        {/* Auto Refresh Toggle */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onToggleAutoRefresh}
          className={cn(
            "cursor-pointer gap-1.5 text-xs font-semibold h-9 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0",
            autoRefreshEnabled ? "border-success/30 bg-success/5 text-success hover:bg-success/10" : "text-muted-foreground"
          )}
          title={autoRefreshEnabled ? "Auto refresh active (every 15s)" : "Auto refresh paused"}
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
          <span className="hidden sm:inline">{t("autoRefresh")}</span>
        </Button>

        {/* Manual Refresh (when paused or needed) */}
        {!autoRefreshEnabled && onRefreshNow && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefreshNow}
            disabled={isFetching}
            className="cursor-pointer gap-1.5 text-xs font-semibold h-9 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
            <span className="hidden sm:inline">{t("refresh")}</span>
          </Button>
        )}

        {/* Fullscreen Button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onToggleFullscreen}
          className="cursor-pointer gap-1.5 text-xs font-semibold h-9 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 hover:shadow-md hover:shadow-primary/20"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{isFullscreen ? t("exitFullScreen") : t("fullScreen")}</span>
        </Button>
      </div>
    </div>
  );
}

