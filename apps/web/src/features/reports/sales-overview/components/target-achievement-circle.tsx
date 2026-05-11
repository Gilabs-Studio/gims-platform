"use client";

import React from "react";

interface TargetAchievementCircleProps {
  achievementPercent?: number;
  targetAmount?: number;
  currentRevenue: number;
}

export function TargetAchievementCircle({
  achievementPercent = 0,
  targetAmount,
  currentRevenue,
}: TargetAchievementCircleProps) {
  // If no target, don't render anything
  if (!targetAmount || targetAmount === 0) {
    return null;
  }

  // Calculate the progress for the half-circle (0-180 degrees)
  // Clamp percentage to 0-100 for visual purposes
  const percentage = Math.min(Math.max(achievementPercent || 0, 0), 100);
  
  // Convert percentage to rotation angle (half circle = 180 degrees)
  const angle = (percentage / 100) * 180;

  return (
    <div className="flex flex-col items-center justify-center py-6">
      <div className="relative w-48 h-24 flex items-center justify-center">
        {/* Background half-circle track */}
        <svg
          className="absolute"
          width="192"
          height="96"
          viewBox="0 0 192 96"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background track */}
          <path
            d="M 12 84 A 84 84 0 0 1 180 84"
            stroke="currentColor"
            strokeWidth="8"
            className="text-muted-foreground/30"
            fill="none"
            strokeLinecap="round"
          />

          {/* Progress indicator */}
          <defs>
            <linearGradient
              id="progressGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="hsl(var(--primary) / 0.8)" />
            </linearGradient>
          </defs>

          <path
            d="M 12 84 A 84 84 0 0 1 180 84"
            stroke="url(#progressGradient)"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            pathLength="100"
            style={{
              strokeDasharray: `${(percentage / 100) * 100} 100`,
            }}
          />
        </svg>

        {/* Center text container */}
        <div className="text-center z-10">
          <div className="text-3xl font-bold text-foreground">
            {percentage.toFixed(0)}%
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Target achieved
          </div>
        </div>
      </div>

      {/* Optional info below circle */}
      <div className="mt-4 text-center space-y-1">
        <div className="text-sm">
          <span className="text-muted-foreground">Revenue: </span>
          <span className="font-medium">
            {new Intl.NumberFormat("id-ID", {
              style: "currency",
              currency: "IDR",
              minimumFractionDigits: 0,
            }).format(currentRevenue)}
          </span>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Target: </span>
          <span className="font-medium">
            {new Intl.NumberFormat("id-ID", {
              style: "currency",
              currency: "IDR",
              minimumFractionDigits: 0,
            }).format(targetAmount)}
          </span>
        </div>
      </div>
    </div>
  );
}
