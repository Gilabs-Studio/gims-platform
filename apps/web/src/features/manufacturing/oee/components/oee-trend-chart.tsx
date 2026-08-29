"use client";

import React from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";
import type { OEETrendPoint } from "../types/oee.types";

interface OeeTrendChartProps {
  data: OEETrendPoint[];
}

export function OeeTrendChart({ data }: OeeTrendChartProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h3 className="font-semibold text-sm text-foreground">Grafik Tren OEE Pabrik</h3>
          <p className="text-xs text-muted-foreground">Pergerakan OEE harian/shift dibandingkan target 85%.</p>
        </div>
      </div>

      <div className="h-64 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="oeeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} opacity={0.4} />
            <XAxis dataKey="timestamp" stroke="currentColor" className="text-[10px] font-mono text-muted-foreground" tickLine={false} />
            <YAxis domain={[50, 100]} stroke="currentColor" className="text-[10px] font-mono text-muted-foreground" tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-card)",
                borderColor: "var(--color-border)",
                borderRadius: "0.5rem",
                fontSize: "12px",
              }}
            />
            <ReferenceLine y={85} stroke="#0284c7" strokeDasharray="4 4" label={{ value: "Target 85%", fill: "#0284c7", fontSize: 11 }} />
            <Area type="monotone" dataKey="overallOee" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#oeeGradient)" name="OEE Total (%)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
