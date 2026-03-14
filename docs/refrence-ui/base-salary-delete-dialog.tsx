'use client';

import * as React from 'react';
import { User, DollarSign, Calendar, FileText } from 'lucide-react';

import { AlertDialog } from '@/components/ui/feedback/alert-dialog';
import { useDialogHandlers, useDialogConfig } from '@/lib/hooks';
import { useBaseSalaryStore } from '../stores';

interface DeleteBaseSalaryDialogProps {
  onDeleteSuccess?: () => void;
}

export function DeleteBaseSalaryDialog({
  onDeleteSuccess,
}: DeleteBaseSalaryDialogProps = {}) {
  const {
    isDeleteModalOpen,
    selectedBaseSalaryId,
    baseSalaries,
    loading,
    error,
    deleteBaseSalary,
    closeModalsOnly,
    clearError,
  } = useBaseSalaryStore();

  // Get the selected base salary details
  const selectedBaseSalary = React.useMemo(() => {
    if (!selectedBaseSalaryId) return null;
    return baseSalaries.find(
      baseSalary => baseSalary.id === selectedBaseSalaryId
    );
  }, [selectedBaseSalaryId, baseSalaries]);

  // Clear error when dialog opens
  React.useEffect(() => {
    if (isDeleteModalOpen) {
      clearError();
    }
  }, [isDeleteModalOpen, clearError]);

  // Use reusable dialog handlers hook
  const { handleDelete, handleClose } = useDialogHandlers({
    onDelete: deleteBaseSalary,
    onDeleteSuccess,
    clearError,
    closeModal: closeModalsOnly,
  });

  // Memoize fields separately untuk optimasi
  const fields = React.useMemo(() => {
    if (!selectedBaseSalary) return [];

    return [
      {
        label: 'Base Salary ID',
        value: selectedBaseSalary.id,
        type: 'badge' as const,
      },
      {
        label: 'Employee',
        value: selectedBaseSalary.employee?.name || 'Unknown Employee',
        type: 'text' as const,
        icon: <User className='h-4 w-4' />,
      },
      {
        label: 'Username',
        value: `@${selectedBaseSalary.employee?.username || 'unknown'}`,
        type: 'text' as const,
      },
      {
        label: 'Basic Salary',
        value: new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          minimumFractionDigits: 0,
        }).format(selectedBaseSalary.basic_salary),
        type: 'text' as const,
        icon: <DollarSign className='h-4 w-4' />,
      },
      {
        label: 'Effective Date',
        value: selectedBaseSalary.effective_date,
        type: 'date' as const,
        icon: <Calendar className='h-4 w-4' />,
      },
      {
        label: 'Status',
        value: selectedBaseSalary.status,
        type: 'status' as const,
      },
      ...(selectedBaseSalary.notes
        ? [
            {
              label: 'Notes',
              value: selectedBaseSalary.notes,
              type: 'text' as const,
              icon: <FileText className='h-4 w-4' />,
            },
          ]
        : []),
    ];
  }, [selectedBaseSalary]);

  // Create dialog config dengan proper memoization menggunakan hook
  const dialogConfig = useDialogConfig({
    config: {
      type: 'delete',
      title: 'Delete Base Salary',
      description:
        'This action cannot be undone. This will permanently delete the base salary record and remove all associated data from the system.',
      itemName: 'Base Salary',
      fields,
      warnings: [
        'Payroll calculations and reports',
        'Historical salary data and analytics',
        'Employee compensation records',
        'Audit logs and compliance data',
        'Related financial transactions',
      ],
    },
    onAction: handleDelete,
    onClose: handleClose,
  });

  return (
    <AlertDialog
      isOpen={isDeleteModalOpen}
      loading={loading}
      error={error}
      selectedId={selectedBaseSalaryId}
      config={dialogConfig}
    />
  );
}
