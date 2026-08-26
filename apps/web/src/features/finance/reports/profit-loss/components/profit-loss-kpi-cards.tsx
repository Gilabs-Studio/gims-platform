"use client";

import { useTranslations } from "next-intl";
import { TrendingUp, ArrowUpRight, ArrowDownRight, Clock, CreditCard, DollarSign, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { useProfitLossSummary } from "../hooks/use-profit-loss";
import type { ProfitLossQueryParams } from "../types";

interface ProfitLossKpiCardsProps {
  params: ProfitLossQueryParams;
}

export function ProfitLossKpiCards({ params }: ProfitLossKpiCardsProps) {
  const t = useTranslations("financeReports");
  const { data, isLoading, isError, refetch } = useProfitLossSummary(params);
  const summary = data?.data;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-7 w-36" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-10 w-10 rounded-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError || !summary) {
    return (
      <Card className="border-destructive/20 bg-destructive/5 text-center">
        <CardContent className="space-y-2 py-4">
          <p className="text-sm text-destructive font-medium">{t("pl_kpi_summary_error")}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="cursor-pointer text-xs">
            {t("retry")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const prevPeriod = summary.previous_period_name || t("previous_period");

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Revenue */}
        <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="flex items-start justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                <span>{t("total_revenue")}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground/70 cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent>{t("tooltip_total_revenue")}</TooltipContent>
                </Tooltip>
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
                {formatCurrency(summary.total_revenue)}
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold">
                {summary.revenue_growth_percent >= 0 ? (
                  <span className="flex items-center text-success">
                    <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                    {summary.revenue_growth_percent}%
                  </span>
                ) : (
                  <span className="flex items-center text-destructive">
                    <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                    {Math.abs(summary.revenue_growth_percent)}%
                  </span>
                )}
                <span className="text-muted-foreground font-normal">{t("compared_to")} {prevPeriod}</span>
              </div>
            </div>
            <div className="p-3 rounded-full bg-primary/10 text-primary shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Gross Profit */}
        <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="flex items-start justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                <span>{t("gross_profit")}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground/70 cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent>{t("tooltip_gross_profit")}</TooltipContent>
                </Tooltip>
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
                {formatCurrency(summary.gross_profit)}
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-success">
                <span>{t("margin")} {summary.gross_profit_margin}%</span>
              </div>
            </div>
            <div className="p-3 rounded-full bg-success/10 text-success shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Operating Profit */}
        <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="flex items-start justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                <span>{t("operating_profit")}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground/70 cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent>{t("tooltip_operating_profit")}</TooltipContent>
                </Tooltip>
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
                {formatCurrency(summary.operating_profit)}
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-success">
                <span>{t("margin")} {summary.operating_profit_margin}%</span>
              </div>
            </div>
            <div className="p-3 rounded-full bg-cyan/10 text-cyan shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Net Profit */}
        <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="flex items-start justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                <span>{t("net_profit")}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground/70 cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent>{t("tooltip_net_profit")}</TooltipContent>
                </Tooltip>
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
                {formatCurrency(summary.net_profit)}
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-success">
                <span>{t("margin")} {summary.net_profit_margin}%</span>
              </div>
            </div>
            <div className="p-3 rounded-full bg-purple/10 text-purple shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
