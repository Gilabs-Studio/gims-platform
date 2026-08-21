"use client";

import React, { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { OEETrendPoint } from "../types/oee.types";

interface OeeTrendChartProps {
  data: OEETrendPoint[];
}

export function OeeTrendChart({ data }: OeeTrendChartProps) {
  const [activeMetric, setActiveMetric] = useState<"all" | "overallOee" | "availability" | "performance" | "quality">("all");

  return (
    <Card className="bg-card border-border shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-bold text-foreground">Tren Historis Efisiensi Mesin (OEE)</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Perbandingan skor OEE, Availability, Performance, dan Quality dalam 7 hari terakhir.
          </CardDescription>
        </div>

        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
          <Button
            type="button"
            variant={activeMetric === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveMetric("all")}
            className="text-xs h-7 px-2.5 cursor-pointer"
          >
            Semua
          </Button>
          <Button
            type="button"
            variant={activeMetric === "overallOee" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveMetric("overallOee")}
            className="text-xs h-7 px-2.5 cursor-pointer"
          >
            OEE
          </Button>
          <Button
            type="button"
            variant={activeMetric === "availability" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveMetric("availability")}
            className="text-xs h-7 px-2.5 cursor-pointer"
          >
            Avail
          </Button>
          <Button
            type="button"
            variant={activeMetric === "performance" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveMetric("performance")}
            className="text-xs h-7 px-2.5 cursor-pointer"
          >
            Perf
          </Button>
          <Button
            type="button"
            variant={activeMetric === "quality" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveMetric("quality")}
            className="text-xs h-7 px-2.5 cursor-pointer"
          >
            Qual
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorOee" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorAvail" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorPerf" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorQual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis dataKey="timestamp" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis domain={[50, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(val) => `${val}%`} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-card border border-border p-2.5 rounded-lg shadow-lg text-xs space-y-1">
                      <p className="font-bold text-foreground">{label}</p>
                      {payload.map((entry) => (
                        <div key={entry.name} className="flex items-center justify-between gap-4">
                          <span style={{ color: entry.color }} className="font-medium">
                            {entry.name}:
                          </span>
                          <span className="font-bold text-foreground">{entry.value}%</span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />

              {(activeMetric === "all" || activeMetric === "overallOee") && (
                <Area type="monotone" dataKey="overallOee" name="OEE Total" stroke="hsl(var(--primary))" strokeWidth={2.5} fillOpacity={1} fill="url(#colorOee)" />
              )}
              {(activeMetric === "all" || activeMetric === "availability") && (
                <Area type="monotone" dataKey="availability" name="Availability" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorAvail)" />
              )}
              {(activeMetric === "all" || activeMetric === "performance") && (
                <Area type="monotone" dataKey="performance" name="Performance" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorPerf)" />
              )}
              {(activeMetric === "all" || activeMetric === "quality") && (
                <Area type="monotone" dataKey="quality" name="Quality" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorQual)" />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
