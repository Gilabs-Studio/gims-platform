"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from "recharts";
import { ChevronRight } from "lucide-react";
import type { UsageTrendItem } from "../types/room-booking.types";

interface RoomUsageChartProps {
  data: UsageTrendItem[];
  period: string;
  onPeriodChange: (val: string) => void;
}

const chartConfig = {
  percentage: {
    label: "Tingkat Penggunaan",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export function RoomUsageChart({ data, period, onPeriodChange }: RoomUsageChartProps) {
  const t = useTranslations("roomBooking");

  return (
    <Card className="h-full border border-border/60 bg-card transition-all duration-200 hover:shadow-sm flex flex-col justify-between">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-6 pb-3 pt-4">
        <CardTitle className="text-base font-bold text-foreground">
          {t("chart.title")}
        </CardTitle>

        <Select value={period} onValueChange={onPeriodChange}>
          <SelectTrigger className="h-8 w-[110px] text-xs cursor-pointer">
            <SelectValue placeholder={t("filterOptions.thisWeek")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="this_week" className="cursor-pointer text-xs">
              {t("filterOptions.thisWeek")}
            </SelectItem>
            <SelectItem value="this_month" className="cursor-pointer text-xs">
              {t("filterOptions.thisMonth")}
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent className="px-6 pb-6 pt-2 space-y-4">
        <div className="h-[210px] w-full min-w-0">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <BarChart accessibilityLayer data={data} margin={{ top: 20, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <XAxis
                dataKey="day"
                axisLine={{ stroke: "hsl(var(--border))", strokeOpacity: 0.6 }}
                tickLine={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => `${val}%`}
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(val) => [`${val}%`, "Occupancy Rate"]}
                  />
                }
              />
              <Bar
                dataKey="percentage"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              >
                <LabelList
                  dataKey="percentage"
                  position="top"
                  formatter={(val: unknown) => `${String(val)}%`}
                  style={{ fontSize: 10, fontWeight: 600, fill: "hsl(var(--foreground))" }}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>

        {/* Weekly Average Banner Footer */}
        <div className="p-3 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">
            {t("chart.weeklyAverage")}
          </span>
          <div className="flex items-center gap-1 text-sm font-bold text-primary cursor-pointer hover:underline">
            <span>58%</span>
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
