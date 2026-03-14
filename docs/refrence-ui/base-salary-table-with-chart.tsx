'use client';

import * as React from 'react';
import { ColumnDef, Row } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-display/data-table';
import { ChevronDown, ChevronRight, User } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/data-display/badge';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/data-display/avatar';
import { Button } from '@/components/ui/utilities/button';
import { getAvatarUrl } from '@/lib/utils/avatar-utils';
import { formatCurrency } from '@/lib/formatters/number-formatter';

import { BaseSalaryEmployeeGroup, BaseSalary } from '../types';
import {
  useBaseSalaryData,
  useBaseSalaryModals,
  useBaseSalaryStore,
} from '../stores';
import { useTableActions } from '@/features/dashboard/hooks/use-dynamic-actions';
import { DynamicTableActions } from '@/features/dashboard/components/dynamic-table-actions';
import type { ActionConfig } from '@/features/dashboard/services/action-service';
import { useBaseSalaryFilters } from '../hooks/use-base-salary-filters';
import { SalaryHistoryChart } from './salary-history-chart';

// Define the extended type for table data
type BaseSalaryEmployeeGroupWithExpanded = BaseSalaryEmployeeGroup & {
  isExpanded: boolean;
};

// Cell Components
const EmployeeIdCell = ({
  row,
}: {
  row: Row<BaseSalaryEmployeeGroupWithExpanded>;
}) => (
  <Badge variant='secondary' className='font-mono'>
    #{String(row.getValue('employee_id'))}
  </Badge>
);

const EmployeeCell = ({
  row,
}: {
  row: Row<BaseSalaryEmployeeGroupWithExpanded>;
}) => {
  const group = row.original;
  const activeSalary =
    group.salaries.find(s => s.status === 'ACTIVE') || group.salaries[0];

  if (!activeSalary?.employee) {
    return (
      <div className='flex items-center space-x-3'>
        <Avatar className='h-8 w-8'>
          <AvatarFallback>
            <User className='h-4 w-4' />
          </AvatarFallback>
        </Avatar>
        <div>
          <div className='font-medium text-muted-foreground'>
            Unknown Employee
          </div>
          <div className='text-sm text-muted-foreground'>No data available</div>
        </div>
      </div>
    );
  }

  const avatarUrl = getAvatarUrl(
    activeSalary.employee.photo_profile,
    activeSalary.employee.avatar_url
  );

  return (
    <div className='flex items-center space-x-3'>
      <Avatar className='h-8 w-8'>
        <AvatarImage src={avatarUrl} alt={activeSalary.employee.name} />
        <AvatarFallback>
          <User className='h-4 w-4' />
        </AvatarFallback>
      </Avatar>
      <div>
        <div className='font-medium'>{activeSalary.employee.name}</div>
        <div className='text-sm text-muted-foreground'>
          @{activeSalary.employee.username}
        </div>
      </div>
    </div>
  );
};

const CurrentSalaryCell = ({
  row,
}: {
  row: Row<BaseSalaryEmployeeGroupWithExpanded>;
}) => {
  const group = row.original;
  const activeSalary =
    group.salaries.find(s => s.status === 'ACTIVE') || group.salaries[0];

  return (
    <div className='text-sm font-medium'>
      {formatCurrency(activeSalary?.basic_salary || 0)}
    </div>
  );
};

const EffectiveDateCell = ({
  row,
}: {
  row: Row<BaseSalaryEmployeeGroupWithExpanded>;
}) => {
  const group = row.original;
  const activeSalary =
    group.salaries.find(s => s.status === 'ACTIVE') || group.salaries[0];

  if (!activeSalary)
    return <div className='text-sm text-muted-foreground'>-</div>;

  const date = new Date(activeSalary.effective_date);
  return (
    <div className='text-sm text-muted-foreground'>
      {format(date, 'MMM dd, yyyy')}
    </div>
  );
};

const StatusCell = ({
  row,
}: {
  row: Row<BaseSalaryEmployeeGroupWithExpanded>;
}) => {
  const group = row.original;

  // Debug logging
  console.warn('[StatusCell] Rendering:', {
    employeeId: group.employee_id,
    salariesCount: group.salaries.length,
    salaryIds: group.salaries.map(s => s.id),
    statuses: group.salaries.map(s => s.status),
  });

  const activeSalary = group.salaries.find(s => s.status === 'ACTIVE');
  const draftSalary = group.salaries.find(s => s.status === 'DRAFT');

  // Show ACTIVE if there's an active salary
  if (activeSalary) {
    return <Badge variant='active'>ACTIVE</Badge>;
  }

  // Show DRAFT if there's a draft salary
  if (draftSalary) {
    return <Badge variant='draft'>DRAFT</Badge>;
  }

  // Fallback to first salary status
  const firstSalary = group.salaries[0];
  return (
    <Badge variant={firstSalary?.status === 'ACTIVE' ? 'active' : 'draft'}>
      {firstSalary?.status || 'UNKNOWN'}
    </Badge>
  );
};

const SalaryCountCell = ({
  row,
}: {
  row: Row<BaseSalaryEmployeeGroupWithExpanded>;
}) => {
  const group = row.original;

  // Debug logging
  console.warn('[SalaryCountCell] Rendering:', {
    employeeId: group.employee_id,
    salaryCount: group.salary_count,
    actualLength: group.salaries.length,
  });

  return (
    <Badge variant='outline' className='font-mono'>
      {group.salary_count || group.salaries.length}
    </Badge>
  );
};

const HistoryToggleCell = ({
  row,
  onToggle,
}: {
  row: Row<BaseSalaryEmployeeGroupWithExpanded>;
  onToggle: (id: number) => void;
}) => {
  const group = row.original;
  const activeSalary = group.salaries.find(s => s.status === 'ACTIVE');
  const draftSalary = group.salaries.find(s => s.status === 'DRAFT');

  // Only show history toggle for ACTIVE status (has salary history)
  if (!activeSalary || draftSalary) {
    return <div className='text-center text-muted-foreground text-xs'>-</div>;
  }

  const handleToggle = () => {
    onToggle(group.employee_id);
  };

  return (
    <Button
      variant='ghost'
      size='sm'
      className='h-8 w-8 p-0'
      onClick={handleToggle}
    >
      {group.isExpanded ? (
        <ChevronDown className='h-4 w-4' />
      ) : (
        <ChevronRight className='h-4 w-4' />
      )}
      <span className='sr-only'>Toggle salary history</span>
    </Button>
  );
};

const ActionsCell = ({
  row,
  tableActions,
}: {
  row: Row<BaseSalaryEmployeeGroupWithExpanded>;
  tableActions: unknown;
}) => {
  const group = row.original;
  const activeSalary =
    group.salaries.find(s => s.status === 'ACTIVE') || group.salaries[0];
  const draftSalary = group.salaries.find(
    s => s.status === 'DRAFT' || s.status === 'Draft'
  );

  // Check if there's any draft salary in the group
  const hasDraftSalary = group.salaries.some(
    s => s.status === 'DRAFT' || s.status === 'Draft'
  );

  // Only show CREATE action if there's no draft salary
  const createAction = hasDraftSalary
    ? null
    : (tableActions as unknown[]).find(
        (action: unknown) => (action as { code: string }).code === 'CREATE'
      );

  // Always show DETAIL action
  const detailAction = (tableActions as unknown[]).find(
    (action: unknown) => (action as { code: string }).code === 'DETAIL'
  );

  // If there's a draft salary, show draft actions + detail
  if (hasDraftSalary && draftSalary) {
    const draftActions = (tableActions as unknown[]).filter((action: unknown) =>
      ['APPROVE', 'EDIT', 'DELETE'].includes((action as { code: string }).code)
    );
    const actionsToShow: ActionConfig<BaseSalary>[] = detailAction
      ? ([...draftActions, detailAction] as ActionConfig<BaseSalary>[])
      : (draftActions as ActionConfig<BaseSalary>[]);
    return (
      <div className='flex items-center gap-2'>
        <DynamicTableActions<BaseSalary>
          actions={actionsToShow}
          data={draftSalary}
          maxVisibleActions={4}
        />
      </div>
    );
  }

  // For ACTIVE/INACTIVE status without draft, show CREATE and DETAIL actions
  if (activeSalary && activeSalary.status === 'ACTIVE' && !hasDraftSalary) {
    const actionsToShow: ActionConfig<BaseSalary>[] = (() => {
      if (createAction && detailAction)
        return [createAction, detailAction] as ActionConfig<BaseSalary>[];
      if (createAction) return [createAction] as ActionConfig<BaseSalary>[];
      if (detailAction) return [detailAction] as ActionConfig<BaseSalary>[];
      return [];
    })();
    return (
      <div className='flex items-center gap-2'>
        <DynamicTableActions<BaseSalary>
          actions={actionsToShow}
          data={activeSalary}
          maxVisibleActions={2}
        />
      </div>
    );
  }

  // Fallback: show CREATE and DETAIL if available and no draft
  const fallbackActions: ActionConfig<BaseSalary>[] = [];
  if (createAction && !hasDraftSalary)
    fallbackActions.push(createAction as ActionConfig<BaseSalary>);
  if (detailAction)
    fallbackActions.push(detailAction as ActionConfig<BaseSalary>);

  if (fallbackActions.length > 0) {
    return (
      <div className='flex items-center gap-2'>
        <DynamicTableActions<BaseSalary>
          actions={fallbackActions}
          data={group.salaries[0]}
          maxVisibleActions={2}
        />
      </div>
    );
  }

  return null;
};

interface BaseSalaryTableWithChartProps {
  className?: string;
}

export const BaseSalaryTableWithChart =
  React.memo<BaseSalaryTableWithChartProps>(({ className }) => {
    const { baseSalaryGroups, loading } = useBaseSalaryData();
    const {
      openEditModal,
      openDeleteModal,
      openDetailModal,
      openApproveModal,
      openCreateModalForEmployee,
    } = useBaseSalaryModals();

    // Get chart state from Zustand store
    const { chartState, setExpandedEmployeeId } = useBaseSalaryStore();
    const { expandedEmployeeId } = chartState;

    // Use optimized filters hook - memoized to prevent rerenders
    const filters = useBaseSalaryFilters();

    // Destructure filters with stable references
    const { search, pagination } = React.useMemo(() => filters, [filters]);

    // Define action configurations based on permissions
    const actionConfigs: ActionConfig<BaseSalary>[] = React.useMemo(
      () => [
        {
          code: 'CREATE',
          label: 'Add Salary',
          icon: 'Plus',
          variant: 'ghost',
          showInTable: true,
          onClick: baseSalary =>
            baseSalary && openCreateModalForEmployee(baseSalary.employee.id),
        },
        {
          code: 'DETAIL',
          label: 'View Details',
          icon: 'Eye',
          variant: 'outline',
          showInTable: true,
          onClick: baseSalary => baseSalary && openDetailModal(baseSalary.id),
        },
        {
          code: 'EDIT',
          label: 'Edit Base Salary',
          icon: 'Edit',
          variant: 'ghost',
          showInTable: true,
          showCondition: baseSalary => baseSalary?.status === 'DRAFT',
          onClick: baseSalary => baseSalary && openEditModal(baseSalary.id),
        },
        {
          code: 'APPROVE',
          label: 'Approve Salary',
          icon: 'Check',
          variant: 'ghost',
          showInTable: true,
          showCondition: baseSalary => baseSalary?.status === 'DRAFT',
          onClick: baseSalary => baseSalary && openApproveModal(baseSalary.id),
        },
        {
          code: 'DELETE',
          label: 'Delete Base Salary',
          icon: 'Trash2',
          variant: 'ghost',
          showInTable: true,
          showCondition: baseSalary => baseSalary?.status === 'DRAFT',
          requiresConfirmation: true,
          onClick: baseSalary => baseSalary && openDeleteModal(baseSalary.id),
        },
      ],
      [
        openDetailModal,
        openEditModal,
        openDeleteModal,
        openApproveModal,
        openCreateModalForEmployee,
      ]
    );

    // Use dynamic actions hook
    const { actions: tableActions } = useTableActions(actionConfigs);

    // Handle toggle for chart expansion using Zustand
    const handleToggleChart = React.useCallback(
      (employeeId: number) => {
        setExpandedEmployeeId(
          expandedEmployeeId === employeeId ? null : employeeId
        );
      },
      [expandedEmployeeId, setExpandedEmployeeId]
    );

    // Factory functions for cell components that need props
    const createHistoryToggleCell = React.useCallback(
      (onToggle: (id: number) => void) => {
        const HistoryToggleCellWithProps = ({
          row,
        }: {
          row: Row<BaseSalaryEmployeeGroupWithExpanded>;
        }) => <HistoryToggleCell row={row} onToggle={onToggle} />;
        HistoryToggleCellWithProps.displayName = 'HistoryToggleCellWithProps';
        return HistoryToggleCellWithProps;
      },
      []
    );

    const createActionsCell = React.useCallback((tableActions: unknown) => {
      const ActionsCellWithProps = ({
        row,
      }: {
        row: Row<BaseSalaryEmployeeGroupWithExpanded>;
      }) => <ActionsCell row={row} tableActions={tableActions} />;
      ActionsCellWithProps.displayName = 'ActionsCellWithProps';
      return ActionsCellWithProps;
    }, []);

    // Create table columns with proper typing - use the type alias for consistency
    const columns: ColumnDef<BaseSalaryEmployeeGroupWithExpanded>[] =
      React.useMemo(
        () => [
          {
            accessorKey: 'employee_id',
            header: 'ID',
            cell: EmployeeIdCell,
          },
          {
            accessorKey: 'employee_name',
            header: 'Employee',
            cell: EmployeeCell,
          },
          {
            accessorKey: 'current_salary',
            header: 'Current Salary',
            cell: CurrentSalaryCell,
          },
          {
            accessorKey: 'effective_date',
            header: 'Effective Date',
            cell: EffectiveDateCell,
          },
          {
            accessorKey: 'status',
            header: 'Status',
            cell: StatusCell,
          },
          {
            accessorKey: 'salary_count',
            header: 'History Count',
            cell: SalaryCountCell,
          },
          {
            id: 'history_toggle',
            header: 'History',
            cell: createHistoryToggleCell(handleToggleChart),
          },
          {
            id: 'actions',
            header: 'Actions',
            cell: createActionsCell(tableActions),
          },
        ],
        [
          handleToggleChart,
          tableActions,
          createHistoryToggleCell,
          createActionsCell,
        ]
      );

    // Create a custom data structure that includes chart data for each row
    const tableDataWithCharts = React.useMemo(() => {
      return baseSalaryGroups.map(
        group =>
          ({
            ...group,
            isExpanded: expandedEmployeeId === group.employee_id,
          }) as BaseSalaryEmployeeGroup & { isExpanded: boolean }
      );
    }, [baseSalaryGroups, expandedEmployeeId]);

    // Create a stable key based on data content to force re-render when data changes
    const tableKey = React.useMemo(() => {
      // Create a simple hash of relevant data
      const dataHash = baseSalaryGroups
        .map(g => `${g.employee_id}-${g.salary_count}-${g.salaries.length}`)
        .join('|');
      return `table-${dataHash}`;
    }, [baseSalaryGroups]);

    // Custom row renderer to show chart inline below expanded rows
    const customRowRenderer = React.useCallback(
      (
        rowData: BaseSalaryEmployeeGroup & { isExpanded: boolean },
        children: React.ReactNode
      ) => {
        const rowKey = `row-${rowData.employee_id}`;
        const chartKey = `chart-${rowData.employee_id}`;

        if (!rowData.isExpanded) {
          // Just return the row wrapped in Fragment with key
          return <React.Fragment key={rowKey}>{children}</React.Fragment>;
        }

        // Return both row and chart
        return (
          <React.Fragment key={rowKey}>
            {children}
            <tr key={chartKey}>
              <td colSpan={8} className='p-0'>
                <div className='px-4 py-4 bg-muted/30 border-b'>
                  <SalaryHistoryChart
                    salaryHistory={rowData.salaries}
                    employeeName={rowData.employee_name}
                    className='w-full'
                    onApproveDraft={salaryId => {
                      const draftSalary = rowData.salaries.find(
                        s =>
                          s.id === salaryId &&
                          ((s.status as string) === 'DRAFT' ||
                            (s.status as string) === 'Draft')
                      );
                      if (draftSalary) {
                        openApproveModal(salaryId);
                      }
                    }}
                    onEditDraft={salaryId => {
                      const draftSalary = rowData.salaries.find(
                        s =>
                          s.id === salaryId &&
                          ((s.status as string) === 'DRAFT' ||
                            (s.status as string) === 'Draft')
                      );
                      if (draftSalary) {
                        openEditModal(salaryId);
                      }
                    }}
                    onDeleteDraft={salaryId => {
                      const draftSalary = rowData.salaries.find(
                        s =>
                          s.id === salaryId &&
                          ((s.status as string) === 'DRAFT' ||
                            (s.status as string) === 'Draft')
                      );
                      if (draftSalary) {
                        openDeleteModal(salaryId);
                      }
                    }}
                  />
                </div>
              </td>
            </tr>
          </React.Fragment>
        );
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [
        openApproveModal,
        openEditModal,
        openDeleteModal,
        baseSalaryGroups,
        expandedEmployeeId,
      ]
    );

    return (
      <div className={`${className}`}>
        {/* Data Table with Inline Charts */}
        <DataTable
          key={tableKey}
          columns={columns}
          data={tableDataWithCharts}
          loading={loading}
          searchPlaceholder='Search employees, status, or ID...'
          searchConfig={{
            searchableFields: ['employee_id', 'employee_name', 'status'],
            defaultSearchField: 'employee_name',
          }}
          searchTerm={search.searchTerm}
          searchColumn={search.searchColumn}
          onSearch={search.handleSearch}
          pagination={{
            page: pagination.page,
            limit: pagination.limit,
            total: pagination.total,
            onPageChange: pagination.handlePageChange,
            onPageSizeChange: pagination.handlePageSizeChange,
          }}
          customRowRenderer={customRowRenderer}
        />
      </div>
    );
  });

BaseSalaryTableWithChart.displayName = 'BaseSalaryTableWithChart';
