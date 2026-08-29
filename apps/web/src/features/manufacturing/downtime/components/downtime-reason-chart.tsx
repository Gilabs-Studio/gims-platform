"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import type { DowntimeReasonBreakdown } from "../../oee/types/oee.types";

interface DowntimeReasonChartProps {
  data: DowntimeReasonBreakdown[];
}

export function DowntimeReasonChart({ data }: DowntimeReasonChartProps) {
  const t = useTranslations("manufacturingDowntime");

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="space-y-0.5">
        <h3 className="font-semibold text-sm text-foreground">{t("chartTitle")}</h3>
        <p className="text-xs text-muted-foreground">{t("chartSubtitle")}</p>
      </div>

      <div className="h-64 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} opacity={0.4} />
            <XAxis
              dataKey="reason"
              stroke="currentColor"
              className="text-[10px] font-mono text-muted-foreground"
              tickLine={false}
              interval={0}
              angle={-15}
              textAnchor="end"
            />
            <YAxis yAxisId="left" stroke="currentColor" className="text-[10px] font-mono text-muted-foreground" tickLine={false} />
            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke="currentColor" className="text-[10px] font-mono text-muted-foreground" tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-card)",
                borderColor: "var(--color-border)",
                borderRadius: "0.5rem",
                fontSize: "12px",
              }}
            />
            <Bar yAxisId="left" dataKey="totalDurationMinutes" fill="#ef4444" radius={[4, 4, 0, 0]} name="Durasi (Menit)" />
            <Line yAxisId="right" type="monotone" dataKey="percentage" stroke="#0284c7" strokeWidth={2} dot={{ r: 3 }} name="Kumulatif (%)" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
