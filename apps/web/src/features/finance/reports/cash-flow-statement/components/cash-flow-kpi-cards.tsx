"use client";

import { useTranslations } from "next-intl";
import { Info, ArrowUpRight, ArrowDownRight, Wallet, ArrowDown, ArrowUp, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { useCashFlowSummary } from "../hooks/use-cash-flow-statement";
import type { CashFlowQueryParams } from "../services/cash-flow-statement-service";

interface CashFlowKpiCardsProps {
  params: CashFlowQueryParams;
}

export function CashFlowKpiCards({ params }: CashFlowKpiCardsProps) {
  const t = useTranslations("financeReports");
  const { data, isLoading, isError, refetch } = useCashFlowSummary(params);
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
          <p className="text-sm text-destructive font-medium">{t("kpi_summary_error")}</p>
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
        {/* Card 1: Net Cash Flow */}
        <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="flex items-start justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                <span>{t("net_cash_flow")}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground/70 cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent>{t("tooltip_net_cash_flow")}</TooltipContent>
                </Tooltip>
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
                {formatCurrency(summary.net_cash_flow)}
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold">
                {summary.net_cash_flow_growth_percent >= 0 ? (
                  <span className="flex items-center text-success">
                    <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                    {summary.net_cash_flow_growth_percent}%
                  </span>
                ) : (
                  <span className="flex items-center text-destructive">
                    <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                    {Math.abs(summary.net_cash_flow_growth_percent)}%
                  </span>
                )}
                <span className="text-muted-foreground font-normal">{t("compared_to")} {prevPeriod}</span>
              </div>
            </div>
            <div className="p-3 rounded-full bg-primary/10 text-primary shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Cash Inflow */}
        <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="flex items-start justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                <span>{t("cash_inflow")}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground/70 cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent>{t("tooltip_cash_inflow")}</TooltipContent>
                </Tooltip>
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
                {formatCurrency(summary.cash_inflow)}
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold">
                {summary.cash_inflow_growth_percent >= 0 ? (
                  <span className="flex items-center text-success">
                    <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                    {summary.cash_inflow_growth_percent}%
                  </span>
                ) : (
                  <span className="flex items-center text-destructive">
                    <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                    {Math.abs(summary.cash_inflow_growth_percent)}%
                  </span>
                )}
                <span className="text-muted-foreground font-normal">{t("compared_to")} {prevPeriod}</span>
              </div>
            </div>
            <div className="p-3 rounded-full bg-success/10 text-success shrink-0">
              <ArrowDown className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Cash Outflow */}
        <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="flex items-start justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                <span>{t("cash_outflow")}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground/70 cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent>{t("tooltip_cash_outflow")}</TooltipContent>
                </Tooltip>
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
                {formatCurrency(summary.cash_outflow)}
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold">
                {summary.cash_outflow_growth_percent <= 0 ? (
                  <span className="flex items-center text-success">
                    <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                    {Math.abs(summary.cash_outflow_growth_percent)}%
                  </span>
                ) : (
                  <span className="flex items-center text-destructive">
                    <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                    {summary.cash_outflow_growth_percent}%
                  </span>
                )}
                <span className="text-muted-foreground font-normal">{t("compared_to")} {prevPeriod}</span>
              </div>
            </div>
            <div className="p-3 rounded-full bg-destructive/10 text-destructive shrink-0">
              <ArrowUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Ending Cash Balance */}
        <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="flex items-start justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                <span>{t("ending_cash_balance")}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground/70 cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent>{t("tooltip_ending_cash_balance")}</TooltipContent>
                </Tooltip>
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
                {formatCurrency(summary.ending_cash_balance)}
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                Per {summary.ending_cash_balance_date || t("ending")}
              </div>
            </div>
            <div className="p-3 rounded-full bg-purple/10 text-purple shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
