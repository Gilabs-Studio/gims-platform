"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { HourlyAlarmTrendPoint } from "../types/quality-andon.types";

interface QualityAndonTrendChartProps {
  data: HourlyAlarmTrendPoint[];
}

export function QualityAndonTrendChart({ data }: QualityAndonTrendChartProps) {
  const t = useTranslations("manufacturingQualityAndon");
  const [timeRange, setTimeRange] = useState("today");

  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between pb-3">
        <h3 className="text-sm font-bold text-foreground">
          {t("alarmTrend.title")}
        </h3>

        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-28 h-8 text-xs cursor-pointer">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="today" className="text-xs cursor-pointer">{t("alarmTrend.today")}</SelectItem>
            <SelectItem value="shift" className="text-xs cursor-pointer">{t("alarmTrend.thisShift")}</SelectItem>
            <SelectItem value="week" className="text-xs cursor-pointer">{t("alarmTrend.thisWeek")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="h-56 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
            <XAxis
              dataKey="hour"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            <RechartsTooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const total = payload.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
                  return (
                    <div className="rounded-lg border bg-popover p-2.5 shadow-md text-xs space-y-1.5 min-w-[130px]">
                      <div className="font-bold text-foreground">{label}</div>
                      <div className="space-y-1">
                        {payload.map((item, index) => (
                          <div key={index} className="flex justify-between items-center text-[11px]">
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                              <span>{item.name}:</span>
                            </span>
                            <span className="font-mono font-bold text-foreground">{item.value}</span>
                          </div>
                        ))}
                        <div className="pt-1 border-t flex justify-between font-bold text-foreground">
                          <span>Total:</span>
                          <span className="font-mono">{total}</span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              wrapperStyle={{ paddingTop: "12px", fontSize: "11px" }}
              formatter={(value) => <span className="text-muted-foreground">{value}</span>}
            />
            <Bar dataKey="critical" name={t("alarmTrend.critical")} stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
            <Bar dataKey="major" name={t("alarmTrend.major")} stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
            <Bar dataKey="minor" name={t("alarmTrend.minor")} stackId="a" fill="#eab308" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
