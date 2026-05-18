"use client";

import * as React from "react";
import { format } from "date-fns";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { SalaryStructure, ChartDataPoint, ChartDotProps } from "../types";

interface SalaryHistoryChartProps {
  readonly salaryHistory: SalaryStructure[];
  readonly employeeName: string;
  readonly className?: string;
  readonly onApproveDraft?: (salaryId: string) => void;
  readonly onEditDraft?: (salaryId: string) => void;
  readonly onDeleteDraft?: (salaryId: string) => void;
}

const chartConfig = {
  salary: {
    label: "Salary",
    color: "hsl(var(--chart-1))",
  },
  draftHighlight: {
    label: "Draft",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

interface SimpleTooltipProps {
  active?: boolean;
  payload?: { payload?: ChartDataPoint }[];
}

function SimpleTooltip({ active, payload }: SimpleTooltipProps) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  return (
    <div className="bg-background border border-border rounded-lg p-2 shadow-sm max-w-[200px]">
      <div className="text-xs font-medium mb-1">{data.period}</div>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Salary:</span>
          <span className="font-medium">{formatCurrency(data.salary)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Status:</span>
          <Badge
            variant={
              data.status === "draft"
                ? "secondary"
                : "default"
            }
            className="text-xs"
          >
            {data.status}
          </Badge>
        </div>
      </div>
    </div>
  );
}

export const SalaryHistoryChart = React.memo<SalaryHistoryChartProps>(
  ({
    salaryHistory,
    employeeName,
    className,
    onApproveDraft,
    onEditDraft,
    onDeleteDraft,
  }) => {
    const [currentDraftIndex, setCurrentDraftIndex] = React.useState(0);

    const sanitizedEmployeeId = React.useMemo(
      () => employeeName.replace(/[^a-zA-Z0-9_-]+/g, "-"),
      [employeeName],
    );

    const sortedHistory = React.useMemo(
      () =>
        [...salaryHistory].sort(
          (a, b) =>
            new Date(a.effective_date).getTime() -
            new Date(b.effective_date).getTime()
        ),
      [salaryHistory]
    );

    const draftSalaries = React.useMemo(
      () => sortedHistory.filter((s) => s.status === "draft"),
      [sortedHistory]
    );

    const currentDraft = draftSalaries[currentDraftIndex] ?? null;

    const unifiedChartData = React.useMemo<ChartDataPoint[]>(
      () =>
        sortedHistory.map((salary, index) => ({
          period: format(new Date(salary.effective_date), "MMM yyyy"),
          salary: salary.basic_salary,
          draftHighlight:
            salary.status === "draft" ? salary.basic_salary : null,
          status: salary.status,
          fullDate: salary.effective_date,
          notes: salary.notes,
          id: salary.id,
          index: index + 1,
          originalSalary: salary.basic_salary,
          color:
            salary.status === "draft"
              ? "var(--color-draftHighlight)"
              : salary.status === "active"
                ? "var(--color-salary)"
                : "var(--color-warning)",
        })),
      [sortedHistory]
    );

    const CustomDot = React.useCallback((props: ChartDotProps) => {
      const { cx, cy, payload } = props;
      const isDraft = payload.status === "draft";
      return (
        <circle
          key={`dot-${payload.id}`}
          cx={cx}
          cy={cy}
          r={isDraft ? 6 : 4}
          fill={payload.color || "var(--color-salary)"}
          stroke="white"
          strokeWidth={isDraft ? 3 : 2}
          style={{
            filter: isDraft
              ? "drop-shadow(0 0 4px rgba(255, 165, 0, 0.6))"
              : "none",
          }}
        />
      );
    }, []);


    if (sortedHistory.length === 0) {
      return (
        <div className="flex items-center justify-center h-32 text-muted-foreground">
          <p>No salary history available</p>
        </div>
      );
    }

    if (unifiedChartData.length === 1 && draftSalaries.length === 0) {
      return (
        <div className="flex items-center justify-center h-32 text-center">
          <div>
            <p className="text-sm text-muted-foreground">Current Salary</p>
            <p className="text-2xl font-bold">
              {formatCurrency(unifiedChartData[0]?.salary ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground">
              Effective: {unifiedChartData[0]?.period ?? "N/A"}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className={`${className ?? ""} max-w-full`}>
        <div className="mb-4">
          <h4 className="text-sm font-medium">Salary History</h4>
          <p className="text-xs text-muted-foreground">{employeeName}</p>
        </div>

        <div className="grid grid-cols-4 gap-4 max-w-full">
          {/* Chart (3 cols) */}
          <div className="col-span-3 space-y-4">
            <div className="w-full max-w-full overflow-hidden">
              <ChartContainer config={chartConfig} className="h-56 w-full">
                <AreaChart
                  data={unifiedChartData}
                  margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                >
                  <defs>
                    <linearGradient
                      id={`fillSalary-${sanitizedEmployeeId}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="var(--color-salary)"
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-salary)"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                    <linearGradient
                      id={`fillDraft-${sanitizedEmployeeId}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="var(--color-draftHighlight)"
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-draftHighlight)"
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="period"
                    className="text-xs fill-muted-foreground"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    className="text-xs fill-muted-foreground"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) => formatCurrency(v)}
                    tickLine={false}
                    axisLine={false}
                    width={70}
                  />
                  <ChartTooltip
                    content={<SimpleTooltip />}
                    cursor={{ fill: "rgba(0, 0, 0, 0.1)" }}
                    allowEscapeViewBox={{ x: false, y: false }}
                    wrapperStyle={{ outline: "none" }}
                  />
                  <Area
                    type="natural"
                    dataKey="draftHighlight"
                    stroke="var(--color-draftHighlight)"
                    fill={`url(#fillDraft-${sanitizedEmployeeId})`}
                    strokeWidth={1}
                    strokeDasharray="3 3"
                  />
                  <Area
                    type="natural"
                    dataKey="salary"
                    stroke="var(--color-salary)"
                    fill={`url(#fillSalary-${sanitizedEmployeeId})`}
                    strokeWidth={2}
                    dot={CustomDot as unknown as boolean}
                  />
                </AreaChart>
              </ChartContainer>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-muted-foreground mb-1">Previous</p>
                <p className="font-medium text-sm">
                  {formatCurrency(unifiedChartData[0]?.salary ?? 0)}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-muted-foreground mb-1">Current</p>
                <p className="font-medium text-sm">
                  {unifiedChartData.length > 1
                    ? formatCurrency(
                        unifiedChartData.at(-1)?.salary ?? 0
                      )
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Draft card (1 col) */}
          <div className="col-span-1">
            {draftSalaries.length > 0 ? (
              <div className="bg-background border border-border rounded-lg p-4 h-full flex flex-col shadow-sm">
                <div className="mb-3 pb-3 border-b border-border">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className="text-xs">
                      Draft
                    </Badge>
                    {draftSalaries.length > 1 && (
                      <span className="text-xs text-muted-foreground">
                        {currentDraftIndex + 1} / {draftSalaries.length}
                      </span>
                    )}
                  </div>
                  <h5 className="text-sm font-medium">Pending Approval</h5>
                </div>

                {currentDraft && (
                  <div className="flex-1 space-y-3 mb-4">
                    <div className="bg-muted/50 rounded-lg p-3 text-center border border-border">
                      <p className="text-xs text-muted-foreground mb-1">
                        New Salary
                      </p>
                      <p className="text-lg font-bold">
                        {formatCurrency(currentDraft.basic_salary)}
                      </p>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center py-1.5">
                        <span className="text-muted-foreground">
                          Effective Date:
                        </span>
                        <span className="font-medium">
                          {format(
                            new Date(currentDraft.effective_date),
                            "MMM dd, yyyy"
                          )}
                        </span>
                      </div>
                      {currentDraft.notes && (
                        <div>
                          <p className="text-muted-foreground mb-1">Notes:</p>
                          <div className="bg-muted/50 rounded border p-2 text-xs max-h-16 overflow-y-auto">
                            {currentDraft.notes}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-2 mt-auto pt-3 border-t border-border">
                  <div className="flex gap-2">
                    {onApproveDraft && currentDraft && (
                      <Button
                        size="sm"
                        className="flex-1 text-xs h-8 cursor-pointer"
                        onClick={() => onApproveDraft(currentDraft.id)}
                      >
                        Approve
                      </Button>
                    )}
                    {onEditDraft && currentDraft && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs h-8 cursor-pointer"
                        onClick={() => onEditDraft(currentDraft.id)}
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                  {onDeleteDraft && currentDraft && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full text-xs h-8 cursor-pointer"
                      onClick={() => onDeleteDraft(currentDraft.id)}
                    >
                      Delete
                    </Button>
                  )}
                </div>

                {/* Pagination dots */}
                {draftSalaries.length > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-border">
                    <button
                      onClick={() =>
                        setCurrentDraftIndex((i) =>
                          (i - 1 + draftSalaries.length) % draftSalaries.length
                        )
                      }
                      className="p-1 hover:bg-muted rounded transition-colors cursor-pointer"
                      aria-label="Previous draft"
                    >
                      <ChevronLeft className="h-3 w-3 text-muted-foreground" />
                    </button>

                    <div className="flex gap-1.5">
                      {draftSalaries.map((draft, idx) => (
                        <button
                          key={draft.id}
                          onClick={() => setCurrentDraftIndex(idx)}
                          className={`h-1.5 rounded-full transition-all cursor-pointer ${
                            idx === currentDraftIndex
                              ? "w-6 bg-primary"
                              : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                          }`}
                          aria-label={`Go to draft ${idx + 1}`}
                        />
                      ))}
                    </div>

                    <button
                      onClick={() =>
                        setCurrentDraftIndex(
                          (i) => (i + 1) % draftSalaries.length
                        )
                      }
                      className="p-1 hover:bg-muted rounded transition-colors cursor-pointer"
                      aria-label="Next draft"
                    >
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-muted/30 border border-dashed border-border rounded-lg p-4 h-full flex items-center justify-center">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">No Draft</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    All salaries approved
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

SalaryHistoryChart.displayName = "SalaryHistoryChart";
