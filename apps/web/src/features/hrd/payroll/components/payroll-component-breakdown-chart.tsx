"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell } from "recharts";
import { formatCurrency } from "@/lib/utils";
import type { PayrollComponentItem } from "../types/payroll.types";

import { Button } from "@/components/ui/button";

interface PayrollComponentBreakdownChartProps {
  components: PayrollComponentItem[];
  totalAmount: number;
  onViewDetail?: () => void;
}

const componentChartConfig = {
  basic: { label: "Gaji Pokok", color: "#E11D48" },
  allowances: { label: "Tunjangan", color: "#10B981" },
  overtime: { label: "Lembur", color: "#F59E0B" },
  bonus: { label: "Bonus / Insentif", color: "#8B5CF6" },
  deductions: { label: "Potongan", color: "#1E293B" },
} satisfies ChartConfig;

const THEME_SLICE_COLORS: Record<string, { fill: string; dotClass: string; bgBadge: string }> = {
  basic: {
    fill: "#E11D48",
    dotClass: "bg-[#E11D48]",
    bgBadge: "bg-rose-500/15 text-rose-600 dark:text-rose-400 font-semibold",
  },
  allowances: {
    fill: "#10B981",
    dotClass: "bg-[#10B981]",
    bgBadge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold",
  },
  overtime: {
    fill: "#F59E0B",
    dotClass: "bg-[#F59E0B]",
    bgBadge: "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold",
  },
  bonus: {
    fill: "#8B5CF6",
    dotClass: "bg-[#8B5CF6]",
    bgBadge: "bg-purple-500/15 text-purple-600 dark:text-purple-400 font-semibold",
  },
  deductions: {
    fill: "#1E293B",
    dotClass: "bg-[#1E293B] dark:bg-slate-200",
    bgBadge: "bg-rose-500/15 text-rose-600 dark:text-rose-400 font-semibold",
  },
};

export function PayrollComponentBreakdownChart({
  components,
  totalAmount,
  onViewDetail,
}: PayrollComponentBreakdownChartProps) {
  const t = useTranslations("payroll");

  return (
    <Card className="h-full flex flex-col justify-between">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-bold text-foreground">
          {t("charts.breakdownTitle")}{" "}
          <span className="text-xs font-normal text-muted-foreground">(Jun 2026)</span>
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={onViewDetail}
          className="h-8 text-xs cursor-pointer"
        >
          {t("actions.viewDetail")}
        </Button>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center w-full">
          {/* Left Column: Donut Chart with central text */}
          <div className="relative flex h-[240px] w-full min-w-0 items-center justify-center md:col-span-5">
            <ChartContainer config={componentChartConfig} className="h-full w-full">
              <PieChart>
                <Pie
                  data={components}
                  cx="50%"
                  cy="50%"
                  innerRadius={68}
                  outerRadius={96}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {components.map((entry, index) => {
                    const themeColor = THEME_SLICE_COLORS[entry.key]?.fill ?? entry.color;
                    return <Cell key={`cell-${index}`} fill={themeColor} stroke="none" />;
                  })}
                </Pie>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => formatCurrency(Number(value))}
                    />
                  }
                />
              </PieChart>
            </ChartContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {t("charts.total")}
              </p>
              <p className="text-xs sm:text-base font-extrabold tracking-tight text-foreground tabular-nums truncate max-w-[130px]">
                {formatCurrency(totalAmount)}
              </p>
            </div>
          </div>

          {/* Right Column: Tabular Legend List */}
          <div className="space-y-2 md:col-span-7">
            {components.map((item) => {
              const config = THEME_SLICE_COLORS[item.key] ?? {
                dotClass: "bg-primary",
                bgBadge: "bg-primary/15 text-primary font-semibold",
              };
              return (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-muted/20 px-3 py-2 text-xs transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${config.dotClass}`} />
                    <span className="font-semibold text-foreground truncate text-xs" title={item.name}>
                      {item.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="font-bold text-foreground tabular-nums text-xs">
                      {formatCurrency(item.value)}
                    </span>
                    <span className={`rounded-md px-1.5 py-0.5 text-[10px] tabular-nums ${config.bgBadge}`}>
                      {item.pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
