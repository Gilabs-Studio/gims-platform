"use client";

import { useTranslations } from "next-intl";
import {
  TrendingUp,
  Trophy,
  XCircle,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { usePipelineSummary } from "../hooks/use-deals";

export function PipelineSummary() {
  const t = useTranslations("crmDeal");
  const { data: summary, isLoading } = usePipelineSummary();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-20 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) return null;

  const cards = [
    {
      title: t("totalDeals"),
      value: summary.total_deals,
      subtitle: formatCurrency(summary.total_value),
      icon: BarChart3,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: t("openDeals"),
      value: summary.open_deals,
      subtitle: formatCurrency(summary.open_value),
      icon: TrendingUp,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      title: t("wonDeals"),
      value: summary.won_deals,
      subtitle: formatCurrency(summary.won_value),
      icon: Trophy,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: t("lostDeals"),
      value: summary.lost_deals,
      subtitle: formatCurrency(summary.lost_value),
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
  ];

  // Win rate calculation
  const closedDeals = summary.won_deals + summary.lost_deals;
  const winRate = closedDeals > 0 ? Math.round((summary.won_deals / closedDeals) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {card.subtitle}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Win rate bar */}
      {closedDeals > 0 && (
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{t("winRate")}</span>
              <span className="text-sm font-semibold">{winRate}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-green-500 transition-all duration-500"
                style={{ width: `${winRate}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {t("winRateDescription", {
                won: summary.won_deals,
                total: closedDeals,
              })}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stage breakdown */}
      {summary.by_stage && summary.by_stage.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stageBreakdown")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.by_stage.map((stage) => {
              const pct =
                summary.total_deals > 0
                  ? Math.round((stage.deal_count / summary.total_deals) * 100)
                  : 0;
              return (
                <div key={stage.stage_id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: stage.stage_color || "#6b7280" }}
                      />
                      <span>{stage.stage_name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span>{stage.deal_count}</span>
                      <span className="w-16 text-right">
                        {formatCurrency(stage.total_value)}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: stage.stage_color || "#6b7280",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
