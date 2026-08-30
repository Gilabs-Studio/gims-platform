"use client";

import { useTranslations } from "next-intl";
import { Shield, Users, LayoutGrid, Database, CalendarCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { AuditTrailKPIs } from "../types/csv-audit-trail.types";

interface AuditTrailKpiCardsProps {
  kpis?: AuditTrailKPIs;
  isLoading?: boolean;
}

export function AuditTrailKpiCards({ kpis, isLoading }: AuditTrailKpiCardsProps) {
  const t = useTranslations("manufacturingCsvAuditTrail");

  if (isLoading || !kpis) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    );
  }

  const stats = [
    {
      title: t("kpis.totalLogs"),
      value: kpis.totalAuditLogs.toLocaleString(),
      subtitle: t("kpis.totalLogsSubtitle"),
      icon: Shield,
      iconBg: "bg-primary/10 text-primary",
      valueColor: "text-foreground",
    },
    {
      title: t("kpis.users"),
      value: kpis.users.toString(),
      subtitle: t("kpis.usersSubtitle"),
      icon: Users,
      iconBg: "bg-success/10 text-success",
      valueColor: "text-foreground",
    },
    {
      title: t("kpis.modules"),
      value: kpis.modules.toString(),
      subtitle: t("kpis.modulesSubtitle"),
      icon: LayoutGrid,
      iconBg: "bg-purple/10 text-purple",
      valueColor: "text-foreground",
    },
    {
      title: t("kpis.criticalChanges"),
      value: kpis.criticalDataChanges.toString(),
      subtitle: t("kpis.criticalChangesSubtitle"),
      icon: Database,
      iconBg: "bg-warning/10 text-warning",
      valueColor: "text-foreground",
    },
    {
      title: t("kpis.integrity"),
      value: `${kpis.dataIntegrityPercentage}%`,
      subtitle: t("kpis.integritySubtitle"),
      icon: CalendarCheck,
      iconBg: "bg-destructive/10 text-destructive",
      valueColor: "text-success",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {stats.map((stat, index) => {
        const Icon = stat.icon;

        return (
          <div
            key={index}
            className="rounded-xl border border-border bg-card p-4 shadow-xs flex items-center gap-3.5"
          >
            <div className={`w-10 h-10 rounded-lg ${stat.iconBg} flex items-center justify-center shrink-0`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">
                {stat.title}
              </div>
              <div className={`text-xl font-bold font-mono tracking-tight ${stat.valueColor}`}>
                {stat.value}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {stat.subtitle}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
