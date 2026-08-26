"use client";

import { useTranslations } from "next-intl";
import { Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { useCashFlowYtdSummary } from "../hooks/use-cash-flow-statement";
import type { CashFlowQueryParams } from "../services/cash-flow-statement-service";

interface CashFlowYtdSummaryProps {
  params: CashFlowQueryParams;
}

export function CashFlowYtdSummary({ params }: CashFlowYtdSummaryProps) {
  const t = useTranslations("financeReports");
  const { data, isLoading, isError, refetch } = useCashFlowYtdSummary(params);
  const ytd = data?.data;

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-base font-semibold">{t("cash_flow_summary_ytd")}</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground/70 cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent>Ringkasan akumulasi arus kas dari awal tahun (Year-To-Date)</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-between space-y-4">
        {isLoading ? (
          <div className="space-y-4 py-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Separator />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-12 w-full rounded-md" />
          </div>
        ) : isError || !ytd ? (
          <div className="h-48 flex flex-col items-center justify-center space-y-2 text-center">
            <p className="text-sm text-destructive font-medium">{t("ytd_summary_error")}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="cursor-pointer text-xs">
              {t("retry")}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Total Cash Inflow */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-1 h-4 rounded-full bg-success inline-block" />
                <span className="text-muted-foreground font-medium">{t("total_cash_inflow")}</span>
              </div>
              <span className="font-semibold text-foreground font-mono">
                {formatCurrency(ytd.total_cash_inflow)}
              </span>
            </div>

            {/* Total Cash Outflow */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-1 h-4 rounded-full bg-destructive inline-block" />
                <span className="text-muted-foreground font-medium">{t("total_cash_outflow")}</span>
              </div>
              <span className="font-semibold text-foreground font-mono">
                {formatCurrency(ytd.total_cash_outflow)}
              </span>
            </div>

            {/* Net Cash Flow */}
            <div className="flex items-center justify-between text-sm pt-1">
              <div className="flex items-center gap-2">
                <span className="w-1 h-4 rounded-full bg-primary inline-block" />
                <span className="font-semibold text-foreground">{t("net_cash_flow")}</span>
              </div>
              <span className="font-bold text-foreground font-mono text-base">
                {formatCurrency(ytd.net_cash_flow)}
              </span>
            </div>

            <Separator className="my-2" />

            {/* Opening Cash Balance */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t("opening_cash_balance")} ({ytd.opening_cash_date || "01 Jan"})
              </span>
              <span className="font-semibold text-foreground font-mono">
                {formatCurrency(ytd.opening_cash_balance)}
              </span>
            </div>

            {/* Ending Cash Balance Container Box */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3.5 flex items-center justify-between">
              <span className="font-bold text-foreground text-sm">
                {t("ending_cash_balance")} ({ytd.ending_cash_date || t("ending")})
              </span>
              <span className="font-extrabold text-primary font-mono text-lg">
                {formatCurrency(ytd.ending_cash_balance)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
