"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import type { QualityDonutDistribution } from "../types/quality-andon.types";

interface QualityAndonDonutProps {
  distribution: QualityDonutDistribution;
}

export function QualityAndonDonut({ distribution }: QualityAndonDonutProps) {
  const t = useTranslations("manufacturingQualityAndon");

  const chartData = [
    { name: t("qualityOverview.pass"), value: distribution.passCount, color: "#10b981" },
    { name: t("qualityOverview.warning"), value: distribution.warningCount, color: "#f59e0b" },
    { name: t("qualityOverview.fail"), value: distribution.failCount, color: "#ef4444" },
  ];

  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col justify-between h-full">
      <div className="pb-3 border-b">
        <h3 className="text-sm font-bold text-foreground">
          {t("qualityOverview.title")}
        </h3>
      </div>

      <div className="py-2 flex-1 flex flex-col justify-center">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Donut Chart */}
          <div className="relative h-32 w-32 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={38}
                  outerRadius={52}
                  dataKey="value"
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-sm font-extrabold font-mono text-foreground">
                {distribution.passPct}%
              </span>
              <span className="text-[9px] text-muted-foreground">{t("qualityOverview.pass")}</span>
            </div>
          </div>

          {/* Legend breakdown rows */}
          <div className="space-y-2 text-xs flex-1 w-full">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                <span>{t("qualityOverview.pass")}</span>
              </span>
              <span className="font-bold font-mono text-foreground">
                {distribution.passCount.toLocaleString()} ({distribution.passPct}%)
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                <span>{t("qualityOverview.warning")}</span>
              </span>
              <span className="font-bold font-mono text-foreground">
                {distribution.warningCount} ({distribution.warningPct}%)
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                <span>{t("qualityOverview.fail")}</span>
              </span>
              <span className="font-bold font-mono text-destructive">
                {distribution.failCount} ({distribution.failPct}%)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
