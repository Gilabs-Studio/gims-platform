"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/utils";
import type { PayrollTrendItem } from "../types/payroll.types";

interface PayrollTrendChartProps {
  data: PayrollTrendItem[];
  filterPeriod: string;
  onFilterChange: (value: string) => void;
}

function formatYAxisTick(value: number): string {
  if (value === 0) return "0";
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(2)}M`;
  }
  if (value >= 1000000) {
    return `${Math.round(value / 1000000)}Jt`;
  }
  return value.toString();
}

export function PayrollTrendChart({ data, filterPeriod, onFilterChange }: PayrollTrendChartProps) {
  const t = useTranslations("payroll");

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-bold text-foreground">
          {t("charts.trendTitle")}
        </CardTitle>
        <Select value={filterPeriod} onValueChange={onFilterChange}>
          <SelectTrigger className="h-8 w-[140px] text-xs cursor-pointer">
            <SelectValue placeholder={t("actions.filter6Months")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="6_months" className="cursor-pointer text-xs">{t("actions.filter6Months")}</SelectItem>
            <SelectItem value="12_months" className="cursor-pointer text-xs">{t("actions.filter12Months")}</SelectItem>
            <SelectItem value="this_year" className="cursor-pointer text-xs">{t("actions.filterThisYear")}</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent>
        <div className="h-[240px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
              <XAxis
                dataKey="period"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tickFormatter={formatYAxisTick}
                domain={[0, 1500000000]}
                ticks={[0, 250000000, 500000000, 750000000, 1000000000, 1250000000, 1500000000]}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "var(--radius)",
                  border: "1px solid hsl(var(--border))",
                  backgroundColor: "hsl(var(--popover))",
                  color: "hsl(var(--popover-foreground))",
                  fontSize: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
                formatter={(value: number) => [formatCurrency(value), t("charts.totalPayrollRp")]}
              />
              <Bar
                dataKey="totalPayroll"
                fill="#E11D48"
                radius={[4, 4, 0, 0]}
                maxBarSize={44}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2">
          <div className="h-3 w-3 rounded-xs bg-[#E11D48]" />
          <span className="text-xs text-muted-foreground font-semibold">
            {t("charts.totalPayrollRp")}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
