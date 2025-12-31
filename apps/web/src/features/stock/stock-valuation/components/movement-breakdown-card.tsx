"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/utils";
import type { StockValuationStats } from "../types";

interface MovementBreakdownCardProps {
  readonly stats?: StockValuationStats;
  readonly isLoading?: boolean;
}

export function MovementBreakdownCard({ stats, isLoading }: MovementBreakdownCardProps) {
  const t = useTranslations("stockValuations.breakdown");

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-5 w-40 bg-muted rounded" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="h-4 w-20 bg-muted rounded" />
              <div className="h-8 w-24 bg-muted rounded" />
              <div className="h-4 w-32 bg-muted rounded" />
            </div>
            <div className="space-y-4">
              <div className="h-4 w-20 bg-muted rounded" />
              <div className="h-8 w-24 bg-muted rounded" />
              <div className="h-4 w-32 bg-muted rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const inQuantity = stats?.total_in_quantity ?? 0;
  const outQuantity = stats?.total_out_quantity ?? 0;
  const inValue = stats?.total_in_value ?? 0;
  const outValue = stats?.total_out_value ?? 0;
  const totalQuantity = inQuantity + outQuantity;
  const inPercentage = totalQuantity > 0 ? (inQuantity / totalQuantity) * 100 : 50;
  const outPercentage = totalQuantity > 0 ? (outQuantity / totalQuantity) * 100 : 50;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visual Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              {t("inMovements")} ({inPercentage.toFixed(0)}%)
            </span>
            <span className="flex items-center gap-1">
              {t("outMovements")} ({outPercentage.toFixed(0)}%)
              <TrendingDown className="h-3 w-3 text-red-500" />
            </span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden flex">
            <div
              className="bg-green-500 transition-all duration-500"
              style={{ width: `${inPercentage}%` }}
            />
            <div
              className="bg-red-500 transition-all duration-500"
              style={{ width: `${outPercentage}%` }}
            />
          </div>
        </div>

        {/* Breakdown Grid */}
        <div className="grid grid-cols-2 gap-6">
          {/* Incoming */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-green-500/10">
                <ArrowUpRight className="h-4 w-4 text-green-500" />
              </div>
              <span className="font-medium text-green-600">{t("inMovements")}</span>
            </div>
            <div className="space-y-2 pl-8">
              <div>
                <p className="text-xs text-muted-foreground">{t("inQuantity")}</p>
                <p className="text-xl font-semibold">{inQuantity.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("inValue")}</p>
                <p className="text-lg font-medium text-green-600">{formatCurrency(inValue)}</p>
              </div>
            </div>
          </div>

          {/* Outgoing */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-red-500/10">
                <ArrowDownRight className="h-4 w-4 text-red-500" />
              </div>
              <span className="font-medium text-red-600">{t("outMovements")}</span>
            </div>
            <div className="space-y-2 pl-8">
              <div>
                <p className="text-xs text-muted-foreground">{t("outQuantity")}</p>
                <p className="text-xl font-semibold">{outQuantity.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("outValue")}</p>
                <p className="text-lg font-medium text-red-600">{formatCurrency(outValue)}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
