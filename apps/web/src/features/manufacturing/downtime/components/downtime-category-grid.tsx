"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CategoryBreakdownItem } from "../types/downtime.types";
import { formatDurationMinutes } from "../utils/downtime-calculator";

interface DowntimeCategoryGridProps {
  readonly data: CategoryBreakdownItem[];
  readonly isLoading?: boolean;
}

export function DowntimeCategoryGrid({ data, isLoading }: DowntimeCategoryGridProps) {
  const t = useTranslations("manufacturingDowntime.categories");

  const unplannedItems = data.filter((item) => item.categoryType === "unplanned");
  const plannedItems = data.filter((item) => item.categoryType === "planned");

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="h-64 animate-pulse bg-muted/20" />
        <Card className="h-64 animate-pulse bg-muted/20" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Unplanned Stoppages */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <CardTitle className="text-base">{t("unplannedTitle")}</CardTitle>
              <CardDescription>Corrective actions required</CardDescription>
            </div>
            <Badge variant="destructive" className="text-[10px] uppercase font-semibold">
              Corrective
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {unplannedItems.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">
              No unplanned stoppage recorded.
            </div>
          ) : (
            unplannedItems.map((item) => (
              <div key={item.category} className="space-y-1.5 border-b border-border/50 pb-2.5 last:border-0 last:pb-0">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{item.category}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-mono">
                      {item.frequency} {t("occurrences")}
                    </span>
                    <span className="font-mono font-semibold text-destructive">
                      {formatDurationMinutes(item.totalDurationMinutes)} ({item.percentageShare}%)
                    </span>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-destructive transition-all duration-300"
                    style={{ width: `${Math.min(100, item.percentageShare * 2)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="truncate max-w-[280px]">
                    {t("topCause")}: <strong className="text-foreground">{item.topReason}</strong>
                  </span>
                  <span>Avg {item.averageDurationMinutes}m</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* 2. Planned Stoppages */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <CardTitle className="text-base">{t("plannedTitle")}</CardTitle>
              <CardDescription>Scheduled operational stops</CardDescription>
            </div>
            <Badge variant="secondary" className="text-[10px] uppercase font-semibold">
              Operational
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {plannedItems.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">
              No planned stoppage recorded.
            </div>
          ) : (
            plannedItems.map((item) => (
              <div key={item.category} className="space-y-1.5 border-b border-border/50 pb-2.5 last:border-0 last:pb-0">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{item.category}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-mono">
                      {item.frequency} {t("occurrences")}
                    </span>
                    <span className="font-mono font-semibold text-primary">
                      {formatDurationMinutes(item.totalDurationMinutes)} ({item.percentageShare}%)
                    </span>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${Math.min(100, item.percentageShare * 2)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="truncate max-w-[280px]">
                    {t("topCause")}: <strong className="text-foreground">{item.topReason}</strong>
                  </span>
                  <span>Avg {item.averageDurationMinutes}m</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
