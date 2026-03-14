"use client";

import { useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/utils";
import type { BudgetStatus } from "../types";

interface BudgetProgressCardProps {
  readonly label: string;
  readonly department?: string;
  readonly plannedAmount: number;
  readonly usedAmount?: number;
  readonly status: BudgetStatus;
  readonly onClick?: () => void;
}

function getProgressColor(percent: number): string {
  if (percent >= 90) return "#ef4444"; // red-500
  if (percent >= 70) return "#f97316"; // orange-500
  if (percent >= 50) return "#eab308"; // yellow-500
  return "#22c55e"; // green-500
}

function HalfCircleProgress({ percent }: { readonly percent: number }) {
  const RADIUS = 54;
  const cx = 70;
  const cy = 70;
  // Arc from 180° to 0° (left to right across the top, i.e. the top semicircle)
  const startAngle = Math.PI; // 180°
  const endAngle = 0; // 0°

  // For a half circle, we sweep from 180° (left) through 270° (bottom) to 0°/360° (right)
  // Actually for a gauge from left to right (top), we go from 180° to 360°
  const gaugeStart = Math.PI; // 180°
  const gaugeEnd = 2 * Math.PI; // 360°
  const clampedPercent = Math.min(100, Math.max(0, percent));
  const progressAngle = gaugeStart + (clampedPercent / 100) * (gaugeEnd - gaugeStart);

  function polarToCartesian(angle: number) {
    return {
      x: cx + RADIUS * Math.cos(angle),
      y: cy + RADIUS * Math.sin(angle),
    };
  }

  const bgStart = polarToCartesian(gaugeStart);
  const bgEnd = polarToCartesian(gaugeEnd);
  const bgPath = [
    `M ${bgStart.x} ${bgStart.y}`,
    `A ${RADIUS} ${RADIUS} 0 1 1 ${bgEnd.x} ${bgEnd.y}`,
  ].join(" ");

  const progStart = polarToCartesian(gaugeStart);
  const progEnd = polarToCartesian(progressAngle);
  const largeArc = clampedPercent > 50 ? 1 : 0;
  const progPath = [
    `M ${progStart.x} ${progStart.y}`,
    `A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${progEnd.x} ${progEnd.y}`,
  ].join(" ");

  const color = getProgressColor(clampedPercent);

  return (
    <svg viewBox="0 0 140 95" className="w-full max-w-[160px] mx-auto">
      {/* Background track */}
      <path d={bgPath} fill="none" stroke="currentColor" strokeWidth="10" className="text-muted/30" strokeLinecap="round" />
      {/* Progress arc */}
      {clampedPercent > 0 && (
        <path d={progPath} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />
      )}
      {/* Center % text */}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="20" fontWeight="700" fill={color} className="font-bold">
        {Math.round(clampedPercent)}%
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="9" fill="currentColor" className="text-muted-foreground uppercase tracking-wider">
        utilized
      </text>
    </svg>
  );
}

export function BudgetProgressCard({
  label,
  department,
  plannedAmount,
  usedAmount = 0,
  status,
  onClick,
}: BudgetProgressCardProps) {
  const t = useTranslations("financeBudget");
  const used = usedAmount ?? 0;
  const planned = plannedAmount ?? 0;
  const remaining = Math.max(0, planned - used);
  const percent = planned > 0 ? (used / planned) * 100 : 0;
  const color = getProgressColor(percent);

  return (
    <div
      className="relative flex flex-col p-4 rounded-xl border bg-card shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group min-w-[280px] h-full"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick?.(); }}
    >
      {/* Header with Status badge */}
      <div className="flex justify-between items-start gap-2 mb-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-snug line-clamp-2 group-hover:text-primary transition-colors pr-2">
            {label}
          </p>
          {department && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{department}</p>
          )}
        </div>
        <span
          className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            status === "approved"
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-secondary text-muted-foreground"
          }`}
        >
          {t(`status.${status}`)}
        </span>
      </div>

      {/* Half-circle gauge */}
      <div className="flex-1 flex items-center justify-center py-2">
        <HalfCircleProgress percent={percent} />
      </div>

      {/* Amount stats - Vertical layout for better readability */}
      <div className="w-full mt-4 space-y-3 pt-3 border-t">
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("fields.usedAmount")}</span>
            <span className="text-sm font-mono font-bold" style={{ color }}>{formatCurrency(used)}</span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("fields.remainingAmount")}</span>
            <span className="text-sm font-mono font-bold text-foreground">{formatCurrency(remaining)}</span>
          </div>
        </div>
        
        <div className="flex flex-col pt-2 border-t border-dashed">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("fields.totalAmount")}</span>
          <span className="text-base font-mono font-black text-primary">{formatCurrency(planned)}</span>
        </div>
      </div>
    </div>
  );
}
