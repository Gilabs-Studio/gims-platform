"use client";

import React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DowntimeReasonBreakdown } from "../types/oee.types";

interface DowntimeReasonChartProps {
  data: DowntimeReasonBreakdown[];
}

export function DowntimeReasonChart({ data }: DowntimeReasonChartProps) {
  return (
    <Card className="bg-card border-border shadow-xs">
      <CardHeader>
        <CardTitle className="text-base font-bold text-foreground">Analisis Pareto Penyebab Downtime</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Penyebab utama terhentinya mesin dan total menit waktu produksi yang hilang.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(val) => `${val}m`} />
              <YAxis
                dataKey="reason"
                type="category"
                width={160}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0].payload as DowntimeReasonBreakdown;
                  return (
                    <div className="bg-card border border-border p-2.5 rounded-lg shadow-lg text-xs space-y-1">
                      <p className="font-bold text-foreground">{item.reason}</p>
                      <p className="text-muted-foreground">Kategori: <span className="font-semibold text-foreground">{item.category}</span></p>
                      <p className="text-muted-foreground">Jumlah Kejadian: <span className="font-semibold text-foreground">{item.count} kali</span></p>
                      <p className="text-destructive font-bold">Total Waktu Hilang: {item.totalDurationMinutes} menit ({item.percentage}%)</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="totalDurationMinutes" name="Menit Hilang" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
