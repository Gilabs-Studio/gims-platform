'use client';

import * as React from 'react';
import { toast } from 'sonner';

import { BaseSalaryHeader } from './base-salary-header';
import { BaseSalaryTableWithChart } from './base-salary-table-with-chart';
import { CreateBaseSalaryModal, EditBaseSalaryModal } from './base-salary-form';
import { DeleteBaseSalaryDialog } from './base-salary-delete-dialog';
import { BaseSalaryDetailModal } from './base-salary-detail-modal';
import { BaseSalaryApproveDialog } from './base-salary-approve-dialog';

import {
  useBaseSalaryModals,
  useBaseSalaryPageData,
  useBaseSalaryStore,
} from '../stores';

// This component handles data fetching and global side-effects like toasts.
const BaseSalaryDataHandler = React.memo(() => {
  const { error, lastOperation } = useBaseSalaryPageData();

  const fetchBaseSalaries = React.useCallback(() => {
    useBaseSalaryStore.getState().fetchBaseSalaries();
  }, []);

  const clearError = React.useCallback(() => {
    useBaseSalaryStore.getState().clearError();
  }, []);

  // Initial data fetch
  React.useEffect(() => {
    fetchBaseSalaries();
  }, [fetchBaseSalaries]);

  // Error toast notifications
  React.useEffect(() => {
    if (error) {
      toast.error('Error', {
        description: error,
        action: { label: 'Dismiss', onClick: () => clearError() },
      });
    }
  }, [error, clearError]);

  // Success toast notifications
  React.useEffect(() => {
    if (lastOperation === 'create') {
      toast.success('Success', {
        description: 'Base salary created successfully!',
      });
    } else if (lastOperation === 'update') {
      toast.success('Success', {
        description: 'Base salary updated successfully!',
      });
    } else if (lastOperation === 'delete') {
      toast.success('Success', {
        description: 'Base salary deleted successfully!',
      });
    } else if (lastOperation === 'approve') {
      toast.success('Success', {
        description: 'Base salary approved successfully!',
      });
    }
    // Don't show toast for 'pagination' or 'none' operations
  }, [lastOperation]);

  return null; // This component does not render anything to the DOM
});
BaseSalaryDataHandler.displayName = 'BaseSalaryDataHandler';

export const BaseSalaryPage = React.memo(() => {
  const { isDetailModalOpen, selectedBaseSalaryId, closeAllModals } =
    useBaseSalaryModals();
  const baseSalaries = useBaseSalaryStore(state => state.baseSalaries);
  const clearFilters = useBaseSalaryStore(state => state.clearFilters);

  // State untuk tracking clear filters dan memaksa re-render table
  const [tableKey, setTableKey] = React.useState(0);

  // Handler untuk clear filters yang juga reset table key
  const handleClearFilters = React.useCallback(() => {
    clearFilters();
    setTableKey(prev => prev + 1); // Increment key untuk force re-render
  }, [clearFilters]);

  const selectedBaseSalary = React.useMemo(() => {
    if (!selectedBaseSalaryId) return null;
    return baseSalaries.find(
      baseSalary => baseSalary.id === selectedBaseSalaryId
    );
  }, [selectedBaseSalaryId, baseSalaries]);

  return (
    <>
      <BaseSalaryDataHandler />

      {/* Header Section */}
      <div className='px-2 pt-1 pb-6'>
        <BaseSalaryHeader onClearFilters={handleClearFilters} />
      </div>

      {/* Table Section */}
      <div className='w-full'>
        <div
          className='mx-2 rounded-lg border bg-card overflow-hidden'
          style={{ contain: 'layout style' }}
        >
          <div className='p-6'>
            <BaseSalaryTableWithChart key={tableKey} />
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateBaseSalaryModal />
      <EditBaseSalaryModal />
      <DeleteBaseSalaryDialog />
      <BaseSalaryApproveDialog />
      {selectedBaseSalary && (
        <BaseSalaryDetailModal
          baseSalary={selectedBaseSalary}
          open={isDetailModalOpen}
          onClose={closeAllModals}
        />
      )}
    </>
  );
});

BaseSalaryPage.displayName = 'BaseSalaryPage';
