'use client';

import * as React from 'react';
import { ColumnDef, Row } from '@tanstack/react-table';

// Type for column definitions with custom width properties
type ColumnDefWithWidth<TData, TValue = unknown> = ColumnDef<TData, TValue> & {
  minWidth?: string;
};
import { User } from 'lucide-react';
import { format } from 'date-fns';
import { DataTable } from '@/components/ui/data-display/data-table';
import { Badge } from '@/components/ui/data-display/badge';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/data-display/avatar';
import { useModulePagination } from '@/lib/pagination';
import { getAvatarUrl } from '@/lib/utils/avatar-utils';

import { BaseSalary } from '../types';
import {
  useBaseSalaryData,
  useBaseSalaryModals,
  useBaseSalaryStore,
} from '../stores';
import { useTableActions } from '@/features/dashboard/hooks/use-dynamic-actions';
import { DynamicTableActions } from '@/features/dashboard/components/dynamic-table-actions';
import type { ActionConfig } from '@/features/dashboard/services/action-service';
import { useBaseSalaryFilters } from '../hooks/use-base-salary-filters';
import { CompactCurrency } from '@/lib/formatters/compact-currency';

// Cell Components -
const IdCell = ({ row }: { row: Row<BaseSalary> }) => (
  <Badge variant='secondary' className='font-mono'>
    #{String(row.getValue('id'))}
  </Badge>
);

const EmployeeCell = ({ row }: { row: Row<BaseSalary> }) => {
  const employee = row.getValue('employee');

  // Defensive programming - handle cases where employee might be undefined
  if (!employee) {
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

  // Generate avatar URL using avatar-utils
  const avatarUrl = getAvatarUrl(
    (employee as { photo_profile?: string }).photo_profile,
    (employee as { avatar_url?: string }).avatar_url
  );

  return (
    <div className='flex items-center space-x-3'>
      <Avatar className='h-8 w-8'>
        <AvatarImage
          src={avatarUrl}
          alt={(employee as { name: string }).name}
        />
        <AvatarFallback>
          <User className='h-4 w-4' />
        </AvatarFallback>
      </Avatar>
      <div>
        <div className='font-medium'>{(employee as { name: string }).name}</div>
        <div className='text-sm text-muted-foreground'>
          @{(employee as { username: string }).username}
        </div>
      </div>
    </div>
  );
};

const BasicSalaryCell = ({ row }: { row: Row<BaseSalary> }) => {
  const amountValue = row.getValue('basic_salary');
  const amount =
    typeof amountValue === 'number' ? amountValue : Number(amountValue || 0);
  return (
    <div className='text-sm font-medium'>
      <CompactCurrency amount={amount} size='sm' />
    </div>
  );
};

const EffectiveDateCell = ({ row }: { row: Row<BaseSalary> }) => {
  const dateValue = row.getValue('effective_date');
  let dateString = '';

  if (typeof dateValue === 'string') {
    dateString = dateValue;
  } else if (dateValue !== null && dateValue !== undefined) {
    if (typeof dateValue === 'number' || typeof dateValue === 'boolean') {
      dateString = String(dateValue);
    } else {
      dateString = JSON.stringify(dateValue);
    }
  }

  const date = new Date(dateString);
  return (
    <div className='text-sm text-muted-foreground'>
      {format(date, 'MMM dd, yyyy')}
    </div>
  );
};

const StatusCell = ({ row }: { row: Row<BaseSalary> }) => {
  const statusValue = row.getValue('status');
  let status = '';

  if (typeof statusValue === 'string') {
    status = statusValue;
  } else if (statusValue !== null && statusValue !== undefined) {
    if (typeof statusValue === 'number' || typeof statusValue === 'boolean') {
      status = String(statusValue);
    } else {
      status = JSON.stringify(statusValue);
    }
  }

  return (
    <Badge variant={status === 'ACTIVE' ? 'active' : 'draft'}>{status}</Badge>
  );
};

const NotesCell = ({ row }: { row: Row<BaseSalary> }) => {
  const notesValue = row.getValue('notes');
  let notes = '';

  if (typeof notesValue === 'string') {
    notes = notesValue;
  } else if (notesValue !== null && notesValue !== undefined) {
    if (typeof notesValue === 'number' || typeof notesValue === 'boolean') {
      notes = String(notesValue);
    } else {
      notes = JSON.stringify(notesValue);
    }
  }

  return (
    <div className='text-sm text-muted-foreground max-w-[200px] truncate'>
      {notes || '-'}
    </div>
  );
};

const CreatedAtCell = ({ row }: { row: Row<BaseSalary> }) => {
  const dateValue = row.getValue('created_at');
  let dateString = '';

  if (typeof dateValue === 'string') {
    dateString = dateValue;
  } else if (dateValue !== null && dateValue !== undefined) {
    if (typeof dateValue === 'number' || typeof dateValue === 'boolean') {
      dateString = String(dateValue);
    } else {
      dateString = JSON.stringify(dateValue);
    }
  }

  const date = new Date(dateString);
  return (
    <div className='text-sm text-muted-foreground'>
      {format(date, 'MMM dd, yyyy')}
      <br />
      <span className='text-xs'>{format(date, 'HH:mm:ss')}</span>
    </div>
  );
};

const UpdatedAtCell = ({ row }: { row: Row<BaseSalary> }) => {
  const dateValue = row.getValue('updated_at');
  let dateString = '';

  if (typeof dateValue === 'string') {
    dateString = dateValue;
  } else if (dateValue !== null && dateValue !== undefined) {
    if (typeof dateValue === 'number' || typeof dateValue === 'boolean') {
      dateString = String(dateValue);
    } else {
      dateString = JSON.stringify(dateValue);
    }
  }

  const date = new Date(dateString);
  return (
    <div className='text-sm text-muted-foreground'>
      {format(date, 'MMM dd, yyyy')}
      <br />
      <span className='text-xs'>{format(date, 'HH:mm:ss')}</span>
    </div>
  );
};

const ActionsCell = ({
  row,
  tableActions,
}: {
  row: Row<BaseSalary>;
  tableActions: unknown;
}) => {
  const baseSalary = row.original;

  // Debug: Log each row's data and available actions
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Debug logging removed for production
    }
  }, [baseSalary, tableActions]);

  return (
    <div className='flex items-center gap-2'>
      <DynamicTableActions
        actions={tableActions as ActionConfig[]}
        data={baseSalary}
        maxVisibleActions={3}
      />
    </div>
  );
};

// ActionsCellFactory - creates a cell component with tableActions
const createActionsCellFactory = (tableActions: unknown) => {
  const ActionsCellComponent = ({ row }: { row: Row<BaseSalary> }) => (
    <ActionsCell row={row} tableActions={tableActions} />
  );
  ActionsCellComponent.displayName = 'ActionsCellComponent';
  return ActionsCellComponent;
};

interface BaseSalaryTableProps {
  className?: string;
}

export const BaseSalaryTable = React.memo<BaseSalaryTableProps>(
  ({ className }) => {
    const { baseSalaries, loading } = useBaseSalaryData();
    const {
      openEditModal,
      openDeleteModal,
      openDetailModal,
      openApproveModal,
    } = useBaseSalaryModals();
    const columnVisibility = useBaseSalaryStore(
      state => state.columnVisibility
    );
    const updateColumnVisibility = useBaseSalaryStore(
      state => state.updateColumnVisibility
    );

    // Use optimized filters hook - memoized to prevent rerenders
    const filters = useBaseSalaryFilters();

    // Destructure filters with stable references
    const { search, dateRange, sort, pagination } = React.useMemo(
      () => filters,
      [filters]
    );

    // Define action configurations based on permissions
    const actionConfigs: ActionConfig<BaseSalary>[] = React.useMemo(
      () => [
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
          onClick: baseSalary => baseSalary && openEditModal(baseSalary.id),
        },
        {
          code: 'APPROVE',
          label: 'Approve Salary',
          icon: 'Check',
          variant: 'ghost',
          showInTable: true,
          showCondition: baseSalary =>
            baseSalary?.status?.toUpperCase() === 'DRAFT',
          onClick: baseSalary => baseSalary && openApproveModal(baseSalary.id),
        },
        {
          code: 'DELETE',
          label: 'Delete Base Salary',
          icon: 'Trash2',
          variant: 'ghost',
          showInTable: true,
          requiresConfirmation: true,
          onClick: baseSalary => baseSalary && openDeleteModal(baseSalary.id),
        },
      ],
      [openDetailModal, openEditModal, openDeleteModal, openApproveModal]
    );

    // Use dynamic actions hook
    const {
      actions: tableActions,
      hasPermission,
      isLoading: actionsLoading,
    } = useTableActions(actionConfigs);

    // Debug: Log permission and actions info
    React.useEffect(() => {
      if (process.env.NODE_ENV === 'development') {
        // Debug logging removed for production
      }
    }, [
      actionConfigs,
      tableActions,
      hasPermission,
      actionsLoading,
      baseSalaries,
    ]);

    const columns: ColumnDefWithWidth<BaseSalary>[] = [
      {
        accessorKey: 'id',
        header: 'ID',
        enableSorting: true,
        cell: IdCell,
      },
      {
        accessorKey: 'employee',
        header: 'Employee',
        minWidth: '120px',
        cell: EmployeeCell,
      },
      {
        accessorKey: 'basic_salary',
        header: 'Basic Salary',
        minWidth: '140px',
        enableSorting: true,
        cell: BasicSalaryCell,
      },
      {
        accessorKey: 'effective_date',
        header: 'Effective Date',
        minWidth: '140px',
        enableSorting: true,
        cell: EffectiveDateCell,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        minWidth: '100px',
        enableSorting: true,
        cell: StatusCell,
      },
      {
        accessorKey: 'notes',
        header: 'Notes',
        minWidth: '200px',
        cell: NotesCell,
      },
      {
        accessorKey: 'created_at',
        header: 'Created At',
        minWidth: '140px',
        enableSorting: true,
        cell: CreatedAtCell,
      },
      {
        accessorKey: 'updated_at',
        header: 'Updated At',
        minWidth: '140px',
        enableSorting: true,
        cell: UpdatedAtCell,
      },
      {
        id: 'actions',
        header: 'Actions',
        enableHiding: false,
        cell: createActionsCellFactory(tableActions),
      },
    ];

    // Get pagination service for configuration - AUTOMATIC!
    const { paginationConfig } = useModulePagination('EMPLOYEES');

    return (
      <div className={className}>
        {/* Data Table */}
        <DataTable
          columns={columns as ColumnDef<BaseSalary>[]}
          data={baseSalaries}
          onSearch={search.handleSearch}
          onDateRangeChange={dateRange.handleDateRangeChange}
          dateRange={dateRange.dateRange}
          pagination={{
            page: pagination.page,
            limit: pagination.limit,
            total: pagination.total,
            onPageChange: pagination.handlePageChange,
            onPageSizeChange: pagination.handlePageSizeChange,
          }}
          paginationConfig={paginationConfig}
          loading={loading}
          searchConfig={{
            searchableFields: [
              'id',
              'employee',
              'basic_salary',
              'effective_date',
              'notes',
              'status',
            ],
            defaultSearchField: 'employee',
            // Custom search logic removed - all search is now server-side
          }}
          searchTerm={search.searchTerm}
          searchColumn={search.searchColumn}
          defaultSorting={sort.sorting}
          onSortingChange={sort.handleSortingChange}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={updateColumnVisibility}
        />
      </div>
    );
  }
);

BaseSalaryTable.displayName = 'BaseSalaryTable';
