"use client";

import { useTranslations } from "next-intl";
import { ShieldCheck, RefreshCw, Shield, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { SystemValidationKPIs } from "../types/csv-validation.types";

interface SystemValidationKpiCardsProps {
  kpis?: SystemValidationKPIs;
  isLoading?: boolean;
}

export function SystemValidationKpiCards({ kpis, isLoading }: SystemValidationKpiCardsProps) {
  const t = useTranslations("manufacturingCsvValidation");

  if (isLoading || !kpis) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    );
  }

  const phases = ["Design", "DQ", "IQ", "OQ", "PQ", "Operational"] as const;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Card 1: System Qualification */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 text-success flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">
                {t("kpis.qualification")}
              </div>
              <div className="text-xl font-bold text-success">
                {t("kpis.qualified")}
              </div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            {t("kpis.statusActive")}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-4 mt-3 border-t border-border text-xs">
          <div>
            <div className="text-muted-foreground text-[11px]">{t("kpis.lastQualified")}</div>
            <div className="font-semibold text-foreground">{kpis.lastQualified}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-[11px]">{t("kpis.nextReview")}</div>
            <div className="font-semibold text-foreground">{kpis.nextReview}</div>
          </div>
        </div>
      </div>

      {/* Card 2: Lifecycle Phase */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple/10 text-purple flex items-center justify-center shrink-0">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">
                {t("kpis.lifecycle")}
              </div>
              <div className="text-xl font-bold text-purple">
                {t("kpis.operational")}
              </div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            {t("kpis.operationalSince")}
          </div>
        </div>

        {/* Stepper with divider, baseline line, dots and labels */}
        <div className="pt-4 mt-3 border-t border-border">
          <div className="relative">
            {/* Horizontal connecting baseline */}
            <div className="absolute left-2 right-2 top-2 h-[1px] bg-border" />

            {/* Stepper Nodes */}
            <div className="relative flex items-start justify-between w-full">
              {phases.map((phase) => {
                const isCurrent = phase === kpis.lifecyclePhase;
                return (
                  <div key={phase} className="flex flex-col items-center">
                    {/* Dot container */}
                    <div className="h-4 flex items-center justify-center">
                      {isCurrent ? (
                        <div className="w-3.5 h-3.5 rounded-full bg-purple/20 flex items-center justify-center ring-2 ring-purple/20">
                          <div className="w-2.5 h-2.5 rounded-full bg-purple" />
                        </div>
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                      )}
                    </div>

                    {/* Label */}
                    <span
                      className={`text-[10px] mt-1.5 whitespace-nowrap ${
                        isCurrent
                          ? "font-semibold text-purple"
                          : "text-muted-foreground"
                      }`}
                    >
                      {phase}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Card 3: Compliance Status */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">
                {t("kpis.compliance")}
              </div>
              <div className="text-xl font-bold text-primary">
                {t("kpis.compliant")}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-4 mt-3 border-t border-border text-xs">
          <div>
            <div className="text-muted-foreground text-[11px]">{t("kpis.regulation")}</div>
            <div className="font-semibold text-foreground">{kpis.regulation}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-[11px]">{t("kpis.complianceRate")}</div>
            <div className="font-semibold text-success">{kpis.complianceRate}%</div>
          </div>
        </div>
      </div>

      {/* Card 4: CAPA Related */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/10 text-warning flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">
                {t("kpis.capa")}
              </div>
              <div className="text-2xl font-bold text-warning">
                {kpis.openCapa}
              </div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            {t("kpis.openCapa")}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-4 mt-3 border-t border-border text-xs">
          <div>
            <div className="text-muted-foreground text-[11px]">{t("kpis.closedThisYear")}</div>
            <div className="font-semibold text-foreground">{kpis.closedThisYear}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-[11px]">{t("kpis.overdue")}</div>
            <div className="font-semibold text-destructive">{kpis.overdueCapa}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
