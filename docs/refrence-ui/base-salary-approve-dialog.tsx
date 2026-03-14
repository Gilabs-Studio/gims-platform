'use client';

import * as React from 'react';
import {
  AlertDialog,
  DialogConfig,
} from '@/components/ui/feedback/alert-dialog';
import { useBaseSalaryStore } from '../stores';
import { formatCurrency } from '@/lib/formatters/number-formatter';

interface BaseSalaryApproveDialogProps {
  onApproveSuccess?: () => void;
}

export function BaseSalaryApproveDialog({
  onApproveSuccess,
}: BaseSalaryApproveDialogProps = {}) {
  const {
    isApproveModalOpen,
    selectedBaseSalaryId,
    baseSalaries,
    currentBaseSalary,
    loading,
    error,
    approveBaseSalary,
    closeModalsOnly,
    clearError,
  } = useBaseSalaryStore();

  // Get the selected base salary details - prefer currentBaseSalary (detail page), fallback to baseSalaries array
  const selectedBaseSalary = React.useMemo(() => {
    if (!selectedBaseSalaryId) return null;

    // If we have currentBaseSalary and it matches the selected ID, use it (detail page scenario)
    if (currentBaseSalary && currentBaseSalary.id === selectedBaseSalaryId) {
      return currentBaseSalary;
    }

    // Otherwise, find from baseSalaries array (list page scenario)
    return baseSalaries.find(bs => bs.id === selectedBaseSalaryId);
  }, [selectedBaseSalaryId, baseSalaries, currentBaseSalary]);

  // Clear error when dialog opens
  React.useEffect(() => {
    if (isApproveModalOpen) {
      clearError();
    }
  }, [isApproveModalOpen, clearError]);

  const handleApprove = async (id: number) => {
    try {
      const success = await approveBaseSalary(id);
      if (success && onApproveSuccess) {
        onApproveSuccess();
      }
      return success;
    } catch (error) {
      console.error('Error approving base salary:', error);
      return false;
    }
  };

  const handleClose = () => {
    clearError();
    closeModalsOnly();
  };

  if (!selectedBaseSalary) return null;

  const dialogConfig: DialogConfig = {
    title: 'Approve Base Salary',
    description:
      'Are you sure you want to approve this base salary? This action will mark the salary as active and make it effective for the employee.',
    itemName: 'Base Salary',
    type: 'confirm',
    confirmColor: 'green',
    actionText: 'Approve Base Salary',
    confirmText: 'Approve Salary',
    fields: [
      {
        label: 'Employee',
        value: selectedBaseSalary.employee?.name || 'N/A',
        type: 'text',
      },
      {
        label: 'Basic Salary',
        value: formatCurrency(selectedBaseSalary.basic_salary || 0),
        type: 'text',
      },
      {
        label: 'Effective Date',
        value: selectedBaseSalary.effective_date,
        type: 'date',
      },
      {
        label: 'Current Status',
        value: selectedBaseSalary.status || 'Draft',
        type: 'status',
      },
    ],
    statusChange: {
      from: 'Draft',
      to: 'Active',
      fromVariant: 'draft',
      toVariant: 'active',
    },
    warnings: [
      'Salary will become effective for the employee',
      'Cannot be edited after approval',
      'Employee will receive the new salary amount',
    ],
    onAction: handleApprove,
    onClose: handleClose,
  };

  return (
    <AlertDialog
      isOpen={isApproveModalOpen}
      loading={loading}
      error={error}
      selectedId={selectedBaseSalaryId}
      config={dialogConfig}
    />
  );
}
