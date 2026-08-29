"use client";

import React from "react";
import { useTranslations } from "next-intl";

interface MachineOeeGaugeProps {
  oeeScore: number;
  availabilityScore: number;
  performanceScore: number;
  qualityScore: number;
}

interface CircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  sublabel?: string;
  showPercentSymbol?: boolean;
}

export function CircularProgress({
  value,
  size = 120,
  strokeWidth = 9,
  color = "#10b981", // emerald-500
  label,
  sublabel,
  showPercentSymbol = true,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.min(100, Math.max(0, value));
  const strokeDashoffset = circumference - (clampedValue / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="rotate-[-90deg] transform"
          viewBox={`0 0 ${size} ${size}`}
        >
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-muted/60"
          />
          {/* Active Value Progress Ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-mono font-bold text-foreground text-xl tracking-tight leading-none">
            {value.toFixed(1)}
            {showPercentSymbol && <span className="text-xs font-sans text-muted-foreground ml-0.5">%</span>}
          </span>
          {label && (
            <span className="text-[10px] text-muted-foreground font-medium mt-1 uppercase tracking-wider">
              {label}
            </span>
          )}
        </div>
      </div>
      {sublabel && (
        <span className="text-xs text-muted-foreground mt-2 font-medium">
          {sublabel}
        </span>
      )}
    </div>
  );
}

export function MachineOeeGauge({
  oeeScore,
  availabilityScore,
  performanceScore,
  qualityScore,
}: MachineOeeGaugeProps) {
  const t = useTranslations("manufacturingMachines.metrics");

  const getOeeColor = (score: number) => {
    if (score >= 85) return "#10b981"; // emerald-500 (World-class / Target exceeded)
    if (score >= 70) return "#0284c7"; // sky-600
    if (score >= 60) return "#f59e0b"; // amber-500
    return "#ef4444"; // rose-500
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 h-full flex flex-col justify-between space-y-4">
      {/* Card Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-foreground">
          {t("oee")}
        </h3>
        <span className="text-xs font-mono text-muted-foreground">
          Target: 85.0%
        </span>
      </div>

      {/* Main OEE Circular Ring */}
      <div className="py-2 flex items-center justify-center">
        <CircularProgress
          value={oeeScore}
          size={136}
          strokeWidth={11}
          color={getOeeColor(oeeScore)}
          label="OEE"
        />
      </div>

      {/* Tri-factor Mini Circular Gauges */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/50">
        <div className="flex flex-col items-center text-center space-y-1">
          <CircularProgress
            value={availabilityScore}
            size={58}
            strokeWidth={5}
            color="#10b981"
          />
          <span className="text-[11px] font-medium text-muted-foreground truncate w-full">
            {t("availability")}
          </span>
        </div>

        <div className="flex flex-col items-center text-center space-y-1">
          <CircularProgress
            value={performanceScore}
            size={58}
            strokeWidth={5}
            color="#0284c7"
          />
          <span className="text-[11px] font-medium text-muted-foreground truncate w-full">
            {t("performance")}
          </span>
        </div>

        <div className="flex flex-col items-center text-center space-y-1">
          <CircularProgress
            value={qualityScore}
            size={58}
            strokeWidth={5}
            color="#6366f1"
          />
          <span className="text-[11px] font-medium text-muted-foreground truncate w-full">
            {t("quality")}
          </span>
        </div>
      </div>
    </div>
  );
}
