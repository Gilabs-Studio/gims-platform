"use client";

import React from "react";

export interface OeeDonutChartProps {
  availability: number; // e.g. 70 or 92
  performance: number;  // e.g. 20 or 95
  quality: number;      // e.g. 10 or 98
  size?: number;        // e.g. 90
  strokeWidth?: number; // e.g. 10
  centerText?: string;  // e.g. "82%"
}

export function OeeDonutChart({
  availability,
  performance,
  quality,
  size = 90,
  strokeWidth = 10,
  centerText,
}: OeeDonutChartProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Total weight for proportional ring segment angles
  const total = (availability || 0) + (performance || 0) + (quality || 0);
  const availRatio = total > 0 ? availability / total : 0.33;
  const perfRatio = total > 0 ? performance / total : 0.33;
  const qualRatio = total > 0 ? quality / total : 0.34;

  const availDash = availRatio * circumference;
  const perfDash = perfRatio * circumference;
  const qualDash = qualRatio * circumference;

  // Offsets
  const availOffset = 0;
  const perfOffset = -availDash;
  const qualOffset = -(availDash + perfDash);

  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />

        {/* Availability Segment (Electric Blue / Primary) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="hsl(var(--primary))"
          strokeWidth={strokeWidth}
          strokeDasharray={`${availDash} ${circumference}`}
          strokeDashoffset={availOffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />

        {/* Performance Segment (Warning / Amber) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="var(--color-warning, #f59e0b)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${perfDash} ${circumference}`}
          strokeDashoffset={perfOffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />

        {/* Quality Segment (Success / Emerald) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="var(--color-success, #10b981)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${qualDash} ${circumference}`}
          strokeDashoffset={qualOffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>

      {centerText && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-extrabold tracking-tight text-foreground">{centerText}</span>
        </div>
      )}
    </div>
  );
}
