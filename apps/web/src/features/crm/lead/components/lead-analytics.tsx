"use client";

import { useTranslations } from "next-intl";
import { TrendingUp, Users, BarChart3, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLeadAnalytics } from "../hooks/use-leads";

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export function LeadAnalytics() {
  const t = useTranslations("crmLead");
  const { data: response, isLoading } = useLeadAnalytics();
  const analytics = response?.data;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  const conversionRateFormatted = `${analytics.conversion_rate.toFixed(1)}%`;
  const avgScoreFormatted = Math.round(analytics.avg_score);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label={t("analytics.totalLeads")}
          value={analytics.total_leads}
          color="bg-primary/10 text-primary"
        />
        <StatCard
          icon={TrendingUp}
          label={t("analytics.conversionRate")}
          value={conversionRateFormatted}
          color="bg-green-500/10 text-green-600"
        />
        <StatCard
          icon={Target}
          label={t("analytics.avgScore")}
          value={avgScoreFormatted}
          color="bg-yellow-500/10 text-yellow-600"
        />
        <StatCard
          icon={BarChart3}
          label={t("analytics.byStatus")}
          value={analytics.by_status?.length ?? 0}
          sub={`${analytics.by_source?.length ?? 0} ${t("analytics.bySource").toLowerCase()}`}
          color="bg-blue-500/10 text-blue-600"
        />
      </div>

      {/* Distribution: Status + Source */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* By Status */}
        {analytics.by_status && analytics.by_status.length > 0 && (
          <div className="rounded-lg border p-4 space-y-3">
            <h4 className="text-sm font-semibold">{t("analytics.byStatus")}</h4>
            <div className="space-y-2">
              {analytics.by_status.map((item) => {
                const pct = analytics.total_leads > 0
                  ? Math.round((item.count / analytics.total_leads) * 100)
                  : 0;
                return (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <Badge
                          variant="outline"
                          style={item.color ? { borderColor: item.color, color: item.color } : undefined}
                        >
                          {item.name}
                        </Badge>
                        <span className="text-muted-foreground">{item.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: item.color ?? "hsl(var(--primary))",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* By Source */}
        {analytics.by_source && analytics.by_source.length > 0 && (
          <div className="rounded-lg border p-4 space-y-3">
            <h4 className="text-sm font-semibold">{t("analytics.bySource")}</h4>
            <div className="space-y-2">
              {analytics.by_source.map((item) => {
                const pct = analytics.total_leads > 0
                  ? Math.round((item.count / analytics.total_leads) * 100)
                  : 0;
                return (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-muted-foreground">{item.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted">
                        <div
                          className="h-1.5 rounded-full bg-primary/60 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
