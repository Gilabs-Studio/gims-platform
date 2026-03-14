'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartConfig,
} from '@/components/ui/data-display/chart';
import { formatCurrency } from '@/lib/formatters/number-formatter';
import {
  BaseSalary,
  ChartDotProps,
  ChartDataPoint,
  ChartTooltipProps,
} from '../types';
import { DynamicActionButton } from '@/features/dashboard/components/dynamic-action-button';
import { Badge } from '@/components/ui/data-display/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useBaseSalaryStore } from '../stores';

interface SalaryHistoryChartProps {
  salaryHistory: BaseSalary[];
  employeeName: string;
  className?: string;
  onApproveDraft?: (salaryId: number) => void;
  onEditDraft?: (salaryId: number) => void;
  onDeleteDraft?: (salaryId: number) => void;
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
    // Get employee ID from salary history
    const employeeId = salaryHistory[0]?.employee?.id;

    // Get chart state from Zustand store
    const { setCurrentDraftIndex, getCurrentDraftIndex } = useBaseSalaryStore();
    const currentDraftIndex = employeeId ? getCurrentDraftIndex(employeeId) : 0;

    // Sort salary history by effective date (oldest first for chart display)
    const sortedHistory = React.useMemo(() => {
      return [...salaryHistory].sort(
        (a, b) =>
          new Date(a.effective_date).getTime() -
          new Date(b.effective_date).getTime()
      );
    }, [salaryHistory]);

    // Get draft salaries
    const draftSalaries = React.useMemo(() => {
      return sortedHistory.filter(
        s =>
          (s.status as string) === 'DRAFT' || (s.status as string) === 'Draft'
      );
    }, [sortedHistory]);

    // Current draft being displayed
    const currentDraft = draftSalaries[currentDraftIndex];

    // Handle pagination using Zustand
    const handleNextDraft = React.useCallback(() => {
      if (employeeId) {
        const nextIndex = (currentDraftIndex + 1) % draftSalaries.length;
        setCurrentDraftIndex(employeeId, nextIndex);
      }
    }, [
      employeeId,
      currentDraftIndex,
      draftSalaries.length,
      setCurrentDraftIndex,
    ]);

    const handlePrevDraft = React.useCallback(() => {
      if (employeeId) {
        const prevIndex =
          (currentDraftIndex - 1 + draftSalaries.length) % draftSalaries.length;
        setCurrentDraftIndex(employeeId, prevIndex);
      }
    }, [
      employeeId,
      currentDraftIndex,
      draftSalaries.length,
      setCurrentDraftIndex,
    ]);

    const handleDotClick = React.useCallback(
      (index: number) => {
        if (employeeId) {
          setCurrentDraftIndex(employeeId, index);
        }
      },
      [employeeId, setCurrentDraftIndex]
    );

    // Helper function to get color based on status
    const getStatusColor = React.useCallback((status: string): string => {
      if (status === 'DRAFT' || status === 'Draft') {
        return 'var(--chart-2)';
      } else if (status === 'ACTIVE') {
        return 'var(--chart-1)';
      } else {
        return 'var(--chart-3)';
      }
    }, []);

    // Custom dot component for chart with status-based styling
    const CustomDot = React.useCallback((props: ChartDotProps) => {
      const { cx, cy, payload } = props;
      const isDraft = payload.status === 'DRAFT' || payload.status === 'Draft';
      return (
        <circle
          key={`dot-${payload.id || payload.index}`}
          cx={cx}
          cy={cy}
          r={isDraft ? 6 : 4}
          fill={payload.color || 'var(--color-salary)'}
          stroke='white'
          strokeWidth={isDraft ? 3 : 2}
          style={{
            filter: isDraft
              ? 'drop-shadow(0 0 4px rgba(255, 165, 0, 0.6))'
              : 'none',
          }}
        />
      );
    }, []);

    // Transform data for unified chart with status-based area coloring
    const unifiedChartData = React.useMemo(() => {
      const transformedData: ChartDataPoint[] = sortedHistory.map(
        (salary, index) => {
          const isDraft =
            (salary.status as string) === 'DRAFT' ||
            (salary.status as string) === 'Draft';
          return {
            period: format(new Date(salary.effective_date), 'MMM yyyy'),
            salary: salary.basic_salary,
            draftHighlight: isDraft ? salary.basic_salary : null,
            status: salary.status,
            fullDate: salary.effective_date,
            notes: salary.notes,
            id: salary.id,
            index: index + 1,
            originalSalary: salary.basic_salary,
            color: getStatusColor(salary.status),
          };
        }
      );

      return transformedData;
    }, [sortedHistory, getStatusColor]);

    const chartConfig = {
      salary: {
        label: 'Salary History',
        color: 'var(--chart-1)',
      },
      draftHighlight: {
        label: 'Draft Highlight',
        color: 'var(--chart-2)',
      },
    } satisfies ChartConfig;

    // Simple tooltip component with proper typing
    const SimpleTooltip = React.useCallback(
      ({ active, payload }: ChartTooltipProps) => {
        if (!active || !payload || payload.length === 0) return null;

        const data = payload[0]?.payload;
        if (!data) return null;

        return (
          <div className='bg-background border border-border rounded-lg p-2 shadow-sm max-w-[200px] z-50'>
            <div className='text-xs font-medium mb-1'>{data.period}</div>
            <div className='space-y-1 text-xs'>
              <div className='flex justify-between gap-2'>
                <span className='text-muted-foreground'>Salary:</span>
                <span className='font-medium'>
                  {formatCurrency(data.salary || 0)}
                </span>
              </div>
              <div className='flex justify-between gap-2'>
                <span className='text-muted-foreground'>Status:</span>
                <Badge
                  variant={
                    data.status === 'ACTIVE'
                      ? 'active'
                      : data.status === 'DRAFT'
                        ? 'draft'
                        : 'default'
                  }
                  className='text-xs'
                >
                  {data.status}
                </Badge>
              </div>
            </div>
          </div>
        );
      },
      []
    );

    if (sortedHistory.length === 0) {
      return (
        <div className='flex items-center justify-center h-32 text-muted-foreground'>
          <p>No salary history available</p>
        </div>
      );
    }

    // If only one salary and no drafts, show simple display
    if (unifiedChartData.length === 1 && draftSalaries.length === 0) {
      return (
        <div className='flex items-center justify-center h-32 text-center'>
          <div>
            <p className='text-sm text-muted-foreground'>Current Salary</p>
            <p className='text-2xl font-bold'>
              {formatCurrency(unifiedChartData[0]?.salary || 0)}
            </p>
            <p className='text-xs text-muted-foreground'>
              Effective: {unifiedChartData[0]?.period || 'N/A'}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className={`${className} max-w-full`}>
        {/* Header */}
        <div className='mb-4'>
          <h4 className='text-sm font-medium text-foreground'>
            Salary History
          </h4>
          <p className='text-xs text-muted-foreground'>{employeeName}</p>
        </div>

        {/* Main Layout: 3:1 (Chart : Draft Card) */}
        <div className='grid grid-cols-4 gap-4 max-w-full'>
          {/* Chart Section (3 columns) */}
          <div className='col-span-3 space-y-4'>
            {/* Chart */}
            <div
              className='w-full max-w-full overflow-hidden'
              style={{ contain: 'layout style' }}
            >
              <ChartContainer config={chartConfig} className='h-64 w-full'>
                <AreaChart
                  data={unifiedChartData}
                  margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id='fillSalary' x1='0' y1='0' x2='0' y2='1'>
                      <stop
                        offset='5%'
                        stopColor='var(--color-salary)'
                        stopOpacity={0.8}
                      />
                      <stop
                        offset='95%'
                        stopColor='var(--color-salary)'
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                    <linearGradient
                      id='fillDraftHighlight'
                      x1='0'
                      y1='0'
                      x2='0'
                      y2='1'
                    >
                      <stop
                        offset='5%'
                        stopColor='var(--color-draftHighlight)'
                        stopOpacity={0.4}
                      />
                      <stop
                        offset='95%'
                        stopColor='var(--color-draftHighlight)'
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray='3 3'
                    className='stroke-muted'
                  />
                  <XAxis
                    dataKey='period'
                    className='text-xs fill-muted-foreground'
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    className='text-xs fill-muted-foreground'
                    tick={{ fontSize: 12 }}
                    tickFormatter={value => formatCurrency(value, true)}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip
                    content={<SimpleTooltip />}
                    cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
                    allowEscapeViewBox={{ x: false, y: false }}
                    wrapperStyle={{ outline: 'none' }}
                  />
                  <Area
                    type='natural'
                    dataKey='draftHighlight'
                    stroke='var(--color-draftHighlight)'
                    fill='url(#fillDraftHighlight)'
                    strokeWidth={1}
                    strokeDasharray='3 3'
                  />
                  <Area
                    type='natural'
                    dataKey='salary'
                    stroke='var(--color-salary)'
                    fill='url(#fillSalary)'
                    strokeWidth={2}
                    dot={CustomDot}
                  />
                </AreaChart>
              </ChartContainer>
            </div>

            {/* Legend & Stats */}
            <div className='space-y-3'>
              {/* Legend */}
              <div className='flex flex-wrap gap-4 text-xs'>
                <div className='flex items-center gap-2'>
                  <div
                    className='w-3 h-3 rounded'
                    style={{ backgroundColor: 'var(--chart-1)' }}
                  ></div>
                  <span className='text-muted-foreground'>Active/Inactive</span>
                </div>
                {draftSalaries.length > 0 && (
                  <div className='flex items-center gap-2'>
                    <div
                      className='w-3 h-3 rounded'
                      style={{ backgroundColor: 'var(--chart-2)' }}
                    ></div>
                    <span className='text-muted-foreground'>Draft</span>
                  </div>
                )}
              </div>

              {/* Summary Stats */}
              <div className='grid grid-cols-2 gap-4 text-xs'>
                <div className='bg-muted/50 rounded-lg p-3'>
                  <p className='text-muted-foreground mb-1'>Previous</p>
                  <p className='font-medium text-sm'>
                    {formatCurrency(unifiedChartData[0]?.salary || 0)}
                  </p>
                </div>
                <div className='bg-muted/50 rounded-lg p-3'>
                  <p className='text-muted-foreground mb-1'>Current</p>
                  <p className='font-medium text-sm'>
                    {unifiedChartData.length > 1
                      ? formatCurrency(unifiedChartData.at(-1)?.salary || 0)
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Fixed Draft Card (1 column) */}
          <div className='col-span-1'>
            {draftSalaries.length > 0 ? (
              <div className='bg-background border border-border rounded-lg p-4 h-full flex flex-col shadow-sm'>
                {/* Header */}
                <div className='mb-3 pb-3 border-b border-border'>
                  <div className='flex items-center justify-between mb-2'>
                    <Badge variant='draft' className='text-xs'>
                      Draft
                    </Badge>
                    {draftSalaries.length > 1 && (
                      <span className='text-xs text-muted-foreground'>
                        {currentDraftIndex + 1} of {draftSalaries.length}
                      </span>
                    )}
                  </div>
                  <h5 className='text-sm font-medium'>Pending Approval</h5>
                </div>

                {/* Content */}
                {currentDraft && (
                  <div className='flex-1 space-y-3 mb-4'>
                    {/* Salary Amount - Prominent */}
                    <div className='bg-muted/50 rounded-lg p-3 text-center border border-border'>
                      <p className='text-xs text-muted-foreground mb-1'>
                        New Salary
                      </p>
                      <p className='text-lg font-bold'>
                        {formatCurrency(currentDraft.basic_salary)}
                      </p>
                    </div>

                    {/* Details */}
                    <div className='space-y-2 text-xs'>
                      <div className='flex justify-between items-center py-1.5'>
                        <span className='text-muted-foreground'>
                          Effective Date:
                        </span>
                        <span className='font-medium'>
                          {format(
                            new Date(currentDraft.effective_date),
                            'MMM dd, yyyy'
                          )}
                        </span>
                      </div>

                      {currentDraft.notes && (
                        <div>
                          <p className='text-muted-foreground mb-1.5'>Notes:</p>
                          <div className='bg-muted/50 rounded border border-border p-2 text-xs max-h-16 overflow-y-auto'>
                            {currentDraft.notes}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className='space-y-2 mt-auto pt-3 border-t border-border'>
                  <div className='flex gap-2'>
                    {onApproveDraft && currentDraft && (
                      <DynamicActionButton
                        action={{
                          code: 'APPROVE',
                          label: 'Approve',
                          onClick: () => onApproveDraft(currentDraft.id),
                          variant: 'default',
                          size: 'sm',
                        }}
                        className='flex-1 text-xs h-8'
                      />
                    )}
                    {onEditDraft && currentDraft && (
                      <DynamicActionButton
                        action={{
                          code: 'EDIT',
                          label: 'Edit',
                          onClick: () => onEditDraft(currentDraft.id),
                          variant: 'outline',
                          size: 'sm',
                        }}
                        className='flex-1 text-xs h-8'
                      />
                    )}
                  </div>
                  {onDeleteDraft && currentDraft && (
                    <DynamicActionButton
                      action={{
                        code: 'DELETE',
                        label: 'Delete',
                        onClick: () => onDeleteDraft(currentDraft.id),
                        variant: 'destructive',
                        size: 'sm',
                      }}
                      className='w-full text-xs h-8'
                    />
                  )}
                </div>

                {/* Pagination Dots */}
                {draftSalaries.length > 1 && (
                  <div className='flex items-center justify-center gap-2 mt-3 pt-3 border-t border-border'>
                    <button
                      onClick={handlePrevDraft}
                      className='p-1 hover:bg-muted rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                      disabled={draftSalaries.length <= 1}
                      aria-label='Previous draft'
                    >
                      <ChevronLeft className='h-3 w-3 text-muted-foreground' />
                    </button>

                    <div className='flex gap-1.5'>
                      {draftSalaries.map(draft => (
                        <button
                          key={draft.id}
                          onClick={() =>
                            handleDotClick(draftSalaries.indexOf(draft))
                          }
                          className={`h-1.5 rounded-full transition-all ${
                            draftSalaries.indexOf(draft) === currentDraftIndex
                              ? 'w-6 bg-primary'
                              : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                          }`}
                          aria-label={`Go to draft ${draftSalaries.indexOf(draft) + 1}`}
                        />
                      ))}
                    </div>

                    <button
                      onClick={handleNextDraft}
                      className='p-1 hover:bg-muted rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                      disabled={draftSalaries.length <= 1}
                      aria-label='Next draft'
                    >
                      <ChevronRight className='h-3 w-3 text-muted-foreground' />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className='bg-muted/30 border border-dashed border-border rounded-lg p-4 h-full flex items-center justify-center'>
                <div className='text-center'>
                  <p className='text-sm text-muted-foreground'>No Draft</p>
                  <p className='text-xs text-muted-foreground mt-1'>
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

SalaryHistoryChart.displayName = 'SalaryHistoryChart';
