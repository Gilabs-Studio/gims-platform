"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/utils";
import type { PayrollComponentItem } from "../types/payroll.types";

interface PayrollComponentBreakdownChartProps {
  components: PayrollComponentItem[];
  totalAmount: number;
}

const THEME_SLICE_COLORS: Record<string, { fill: string; dotClass: string }> = {
  basic: { fill: "hsl(var(--primary))", dotClass: "bg-primary" },
  allowances: { fill: "hsl(var(--success))", dotClass: "bg-success" },
  overtime: { fill: "hsl(var(--warning))", dotClass: "bg-warning" },
  bonus: { fill: "hsl(var(--purple))", dotClass: "bg-purple" },
  deductions: { fill: "hsl(var(--rose))", dotClass: "bg-rose" },
};

export function PayrollComponentBreakdownChart({
  components,
  totalAmount,
}: PayrollComponentBreakdownChartProps) {
  const t = useTranslations("payroll");

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold text-foreground">
          {t("charts.breakdownTitle")}{" "}
          <span className="text-xs font-normal text-muted-foreground">(Jun 2026)</span>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-12">
          {/* Donut Chart with central text */}
          <div className="relative flex h-[210px] w-full min-w-0 items-center justify-center sm:col-span-6">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={210}>
              <PieChart>
                <Pie
                  data={components}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {components.map((entry, index) => {
                    const themeColor = THEME_SLICE_COLORS[entry.key]?.fill ?? entry.color;
                    return <Cell key={`cell-${index}`} fill={themeColor} stroke="none" />;
                  })}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: "var(--radius)",
                    border: "1px solid hsl(var(--border))",
                    backgroundColor: "hsl(var(--popover))",
                    color: "hsl(var(--popover-foreground))",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [formatCurrency(value), "Nominal"]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <p className="text-xs font-bold text-foreground sm:text-sm">
                {formatCurrency(totalAmount)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {t("charts.total")}
              </p>
            </div>
          </div>

          {/* Right Custom Legend List */}
          <div className="space-y-2.5 sm:col-span-6">
            {components.map((item) => {
              const dotClass = THEME_SLICE_COLORS[item.key]?.dotClass ?? "bg-primary";
              return (
                <div key={item.key} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${dotClass}`} />
                    <span className="text-muted-foreground font-medium">{item.name}</span>
                  </div>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(item.value)}{" "}
                    <span className="text-[11px] font-normal text-muted-foreground">
                      ({item.pct}%)
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
