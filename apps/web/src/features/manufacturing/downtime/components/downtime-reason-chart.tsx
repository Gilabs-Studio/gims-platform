"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Card } from "@/components/ui/card";
import type { DowntimeReasonBreakdown } from "../../oee/types/oee.types";

interface DowntimeReasonChartProps {
  data: DowntimeReasonBreakdown[];
}

export function DowntimeReasonChart({ data }: DowntimeReasonChartProps) {
  const t = useTranslations("manufacturingDowntime");

  return (
    <Card className="bg-card border border-border p-5 rounded-lg shadow-xs space-y-3">
      <div>
        <h3 className="font-bold text-base text-foreground">{t("chartTitle")}</h3>
        <p className="text-xs text-muted-foreground">{t("chartSubtitle")}</p>
      </div>

      <div className="h-[260px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="reason"
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              tickLine={false}
              interval={0}
              angle={-15}
              textAnchor="end"
            />
            <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
                borderRadius: "var(--radius)",
                fontSize: "12px",
              }}
            />
            <Bar yAxisId="left" dataKey="totalDurationMinutes" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Durasi (Menit)" />
            <Line yAxisId="right" type="monotone" dataKey="percentage" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} name="Kumulatif (%)" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
