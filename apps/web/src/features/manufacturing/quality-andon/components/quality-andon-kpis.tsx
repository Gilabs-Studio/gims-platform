"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";
import type { AndonDashboardKPIs } from "../types/quality-andon.types";

interface QualityAndonKPIsProps {
  kpis: AndonDashboardKPIs;
}

export function QualityAndonKPIs({ kpis }: QualityAndonKPIsProps) {
  const t = useTranslations("manufacturingQualityAndon");

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. Active Alarms */}
      <div className="rounded-lg border bg-card p-4 space-y-1 transition-all duration-200 hover:border-border/80">
        <span className="text-xs font-medium text-muted-foreground">{t("kpi.activeAlarms")}</span>
        <div className="text-2xl font-bold font-mono text-destructive tracking-tight">
          {kpis.activeAlarms.count}
        </div>
        <p className="text-[11px] text-muted-foreground">{kpis.activeAlarms.subtext}</p>
      </div>

      {/* 2. QC Checks (Today) */}
      <div className="rounded-lg border bg-card p-4 space-y-1 transition-all duration-200 hover:border-border/80">
        <span className="text-xs font-medium text-muted-foreground">{t("kpi.qcChecksToday")}</span>
        <div className="text-2xl font-bold font-mono text-foreground tracking-tight">
          {kpis.qcChecks.count.toLocaleString()}
        </div>
        <div className="flex items-center gap-1 text-[11px] text-success font-medium">
          <ArrowUpRight className="h-3 w-3" />
          <span>+{kpis.qcChecks.trendPct}% {t("kpi.vsYesterday")}</span>
        </div>
      </div>

      {/* 3. Out of Spec (Today) */}
      <div className="rounded-lg border bg-card p-4 space-y-1 transition-all duration-200 hover:border-border/80">
        <span className="text-xs font-medium text-muted-foreground">{t("kpi.outOfSpecToday")}</span>
        <div className="text-2xl font-bold font-mono text-warning tracking-tight">
          {kpis.outOfSpec.count}
        </div>
        <div className="flex items-center gap-1 text-[11px] text-warning font-medium">
          <ArrowUpRight className="h-3 w-3" />
          <span>+{kpis.outOfSpec.trendPct}% {t("kpi.vsYesterday")}</span>
        </div>
      </div>

      {/* 4. Pass Rate */}
      <div className="rounded-lg border bg-card p-4 space-y-1 transition-all duration-200 hover:border-border/80">
        <span className="text-xs font-medium text-muted-foreground">{t("kpi.passRate")}</span>
        <div className="text-2xl font-bold font-mono text-success tracking-tight">
          {kpis.passRate.percentage.toFixed(2)}%
        </div>
        <div className="flex items-center gap-1 text-[11px] text-success font-medium">
          <ArrowUpRight className="h-3 w-3" />
          <span>+{kpis.passRate.trendPct}% {t("kpi.vsYesterday")}</span>
        </div>
      </div>

      {/* 5. Open CAPA */}
      <div className="rounded-lg border bg-card p-4 space-y-1 transition-all duration-200 hover:border-border/80">
        <span className="text-xs font-medium text-muted-foreground">{t("kpi.openCapa")}</span>
        <div className="text-2xl font-bold font-mono text-foreground tracking-tight">
          {kpis.openCapa.count}
        </div>
        <p className="text-[11px] text-muted-foreground">{kpis.openCapa.subtext}</p>
      </div>
    </div>
  );
}
