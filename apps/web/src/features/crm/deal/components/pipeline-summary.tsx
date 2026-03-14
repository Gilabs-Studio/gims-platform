"use client";

import { useTranslations } from "next-intl";
import { TrendingUp, Trophy, XCircle, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { usePipelineSummary } from "../hooks/use-deals";

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

export function PipelineSummary() {
  const t = useTranslations("crmDeal");
  const { data: summary, isLoading } = usePipelineSummary();

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

  if (!summary) return null;

  // Win rate calculation
  const closedDeals = summary.won_deals + summary.lost_deals;
  const winRate = closedDeals > 0 ? Math.round((summary.won_deals / closedDeals) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Summary stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={BarChart3}
          label={t("totalDeals")}
          value={summary.total_deals}
          sub={formatCurrency(summary.total_value)}
          color="bg-primary/10 text-primary"
        />
        <StatCard
          icon={TrendingUp}
          label={t("openDeals")}
          value={summary.open_deals}
          sub={formatCurrency(summary.open_value)}
          color="bg-warning/10 text-warning"
        />
        <StatCard
          icon={Trophy}
          label={t("wonDeals")}
          value={summary.won_deals}
          sub={formatCurrency(summary.won_value)}
          color="bg-success/10 text-success"
        />
        <StatCard
          icon={XCircle}
          label={t("lostDeals")}
          value={summary.lost_deals}
          sub={formatCurrency(summary.lost_value)}
          color="bg-destructive/10 text-destructive"
        />
      </div>

      {/* Win rate & stage breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Win rate bar */}
        {closedDeals > 0 && (
          <div className="rounded-lg border p-4 space-y-3">
            <h4 className="text-sm font-semibold">{t("winRate")}</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("winRateDescription", {
                    won: summary.won_deals,
                    total: closedDeals,
                  })}
                </span>
                <span className="font-semibold text-success">{winRate}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-success transition-all duration-500"
                  style={{ width: `${winRate}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Stage breakdown */}
        {summary.by_stage && summary.by_stage.length > 0 && (
          <div className="rounded-lg border p-4 space-y-3">
            <h4 className="text-sm font-semibold">{t("stageBreakdown")}</h4>
            <div className="space-y-2">
              {summary.by_stage.map((stage) => {
                const pct =
                  summary.total_deals > 0
                    ? Math.round((stage.deal_count / summary.total_deals) * 100)
                    : 0;
                return (
                  <div key={stage.stage_id} className="flex-1 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: stage.stage_color || "var(--color-muted-foreground)" }}
                        />
                        <span className="font-medium">{stage.stage_name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <span>{stage.deal_count}</span>
                        <span className="w-24 text-right">
                          {formatCurrency(stage.total_value)}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-1.5 rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: stage.stage_color || "var(--color-muted-foreground)",
                        }}
                      />
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
