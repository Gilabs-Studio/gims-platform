"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, Calendar } from "lucide-react";
import type { EmployeeSalesTarget } from "../types";
import { formatCurrency, cn } from "@/lib/utils";

interface SalesTargetProgressProps {
  readonly target: EmployeeSalesTarget;
}

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Half-circle arc SVG helper
function HalfCircleArc({
  percent,
  size = 200,
}: {
  percent: number;
  size?: number;
}) {
  const clampedPercent = Math.min(100, Math.max(0, percent));
  const radius = (size - 20) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = Math.PI * radius; // half circle

  // Determine stroke color class based on progress
  const strokeColor =
    clampedPercent >= 100
      ? "#8b5cf6"
      : clampedPercent >= 80
      ? "#22c55e"
      : clampedPercent >= 50
      ? "#f59e0b"
      : "#ef4444";

  const dashArray = circumference;
  const dashOffset = circumference - (clampedPercent / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size / 2 + 20 }}>
      <svg
        width={size}
        height={size / 2 + 20}
        viewBox={`0 0 ${size} ${size / 2 + 20}`}
        className="overflow-visible"
      >
        {/* Background arc */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="14"
          strokeLinecap="round"
          className="text-muted/30"
        />
        {/* Progress arc */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke={strokeColor}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={dashArray}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 0.8s ease-in-out, stroke 0.5s" }}
        />
      </svg>
      {/* Center label */}
      <div className="absolute bottom-0 flex flex-col items-center">
        <span
          className="text-3xl font-bold tabular-nums"
          style={{ color: strokeColor }}
        >
          {clampedPercent.toFixed(0)}%
        </span>
        <span className="text-xs text-muted-foreground mt-0.5">Achievement</span>
      </div>
    </div>
  );
}

function MonthBar({
  month,
  monthName,
  targetAmount,
  actualAmount,
  achievementPercent,
  isCurrentMonth,
}: {
  month: number;
  monthName: string;
  targetAmount: number;
  actualAmount: number;
  achievementPercent: number;
  isCurrentMonth: boolean;
}) {
  const clampedPercent = Math.min(100, Math.max(0, achievementPercent));
  const barColor =
    clampedPercent >= 100
      ? "bg-purple-500"
      : clampedPercent >= 80
      ? "bg-green-500"
      : clampedPercent >= 50
      ? "bg-amber-500"
      : "bg-red-400";

  return (
    <div className={cn("flex flex-col items-center gap-1.5", isCurrentMonth && "opacity-100")}>
      <div className="relative w-full h-20 flex items-end justify-center">
        <div className="w-6 bg-muted/40 rounded-t-sm h-full relative overflow-hidden">
          <div
            className={cn("absolute bottom-0 w-full rounded-t-sm transition-all duration-700", barColor)}
            style={{ height: `${clampedPercent}%` }}
          />
        </div>
        {isCurrentMonth && (
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary animate-pulse" />
        )}
      </div>
      <span
        className={cn(
          "text-[10px] font-medium",
          isCurrentMonth ? "text-primary font-semibold" : "text-muted-foreground"
        )}
      >
        {MONTH_ABBR[(month - 1) % 12]}
      </span>
    </div>
  );
}

export function SalesTargetProgress({ target }: SalesTargetProgressProps) {
  const t = useTranslations("salesTargets");
  const currentMonth = new Date().getMonth() + 1;

  const monthlyTargets = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const month = i + 1;
        const existing = target.monthly_targets?.find((m) => m.month === month);
        return existing ?? {
          id: "",
          month,
          month_name: MONTH_ABBR[i],
          target_amount: 0,
          actual_amount: 0,
          achievement_percent: 0,
          notes: "",
        };
      }),
    [target.monthly_targets]
  );

  const achievementColor =
    target.achievement_percent >= 100
      ? "text-purple-500"
      : target.achievement_percent >= 80
      ? "text-green-600"
      : target.achievement_percent >= 50
      ? "text-amber-600"
      : "text-red-500";

  const achievementBadge =
    target.achievement_percent >= 100
      ? { label: "Exceeding", variant: "default" as const, className: "bg-purple-500 hover:bg-purple-600" }
      : target.achievement_percent >= 80
      ? { label: "On Track", variant: "default" as const, className: "bg-green-500 hover:bg-green-600" }
      : target.achievement_percent >= 50
      ? { label: "In Progress", variant: "secondary" as const, className: "" }
      : { label: "Behind", variant: "destructive" as const, className: "" };

  return (
    <div className="space-y-4">
      {/* Header card with half-circle */}
      <Card className="bg-gradient-to-br from-card to-card/80 border-border/60 shadow-sm overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Left: Half circle progress */}
            <div className="flex flex-col items-center gap-2">
              <HalfCircleArc percent={target.achievement_percent} size={220} />
              <Badge className={cn("mt-1 text-xs font-semibold", achievementBadge.className)} variant={achievementBadge.variant}>
                {achievementBadge.label}
              </Badge>
            </div>

            {/* Right: Stats */}
            <div className="flex-1 w-full space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Target className="h-5 w-5 text-muted-foreground" />
                  {t("myTarget")} {target.year}
                </h2>
                {target.employee && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {target.employee.name}
                    {target.employee.employee_code && (
                      <span className="ml-2 font-mono text-xs text-muted-foreground/70">
                        #{target.employee.employee_code}
                      </span>
                    )}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">{t("totalTarget")}</p>
                  <p className="text-base font-bold text-foreground">
                    {formatCurrency(target.total_target)}
                  </p>
                </div>
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">{t("totalActual")}</p>
                  <p className={cn("text-base font-bold", achievementColor)}>
                    {formatCurrency(target.total_actual)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>
                  <span className={cn("font-semibold", achievementColor)}>
                    {target.achievement_percent.toFixed(1)}%
                  </span>{" "}
                  {t("ofAnnualGoal")}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly bar chart */}
      <Card className="shadow-sm border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {t("monthlyProgress")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-12 gap-1 items-end">
            {monthlyTargets.map((mt) => (
              <MonthBar
                key={mt.month}
                month={mt.month}
                monthName={mt.month_name}
                targetAmount={mt.target_amount}
                actualAmount={mt.actual_amount}
                achievementPercent={mt.achievement_percent}
                isCurrentMonth={mt.month === currentMonth}
              />
            ))}
          </div>

          {/* Monthly table - compact */}
          <div className="mt-4 divide-y divide-border/40">
            {monthlyTargets.map((mt) => (
              <div
                key={mt.month}
                className={cn(
                  "grid grid-cols-4 gap-2 py-2 text-xs",
                  mt.month === currentMonth && "bg-muted/30 rounded px-2"
                )}
              >
                <span className={cn("font-medium", mt.month === currentMonth && "text-primary")}>
                  {mt.month_name}
                  {mt.month === currentMonth && (
                    <span className="ml-1 text-[10px] text-primary/70">(now)</span>
                  )}
                </span>
                <span className="text-muted-foreground text-right">{formatCurrency(mt.target_amount)}</span>
                <span className="text-right">{formatCurrency(mt.actual_amount)}</span>
                <span
                  className={cn(
                    "text-right font-semibold",
                    mt.achievement_percent >= 100
                      ? "text-purple-500"
                      : mt.achievement_percent >= 80
                      ? "text-green-600"
                      : mt.achievement_percent >= 50
                      ? "text-amber-600"
                      : "text-red-500"
                  )}
                >
                  {mt.achievement_percent.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
