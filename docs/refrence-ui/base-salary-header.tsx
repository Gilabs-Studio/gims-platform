'use client';

import * as React from 'react';
import {
  DollarSign,
  TrendingDown,
  Filter,
  RefreshCw,
  Plus,
  Minus,
  Users,
  Calculator,
  Target,
} from 'lucide-react';

import { Button } from '@/components/ui/utilities/button';
import { FileOperationsDropdown } from '@/components/ui/utilities/file-operations-dropdown';
import { useBaseSalaryStore, useBaseSalaryData } from '../stores';
import { CompactCurrency } from '@/lib/formatters/compact-currency';
import { useActionPermission } from '@/hooks/use-action-permission';
import { StatsSkeleton } from '@/components/ui/feedback/stats-skeleton';

interface BaseSalaryHeaderProps {
  className?: string;
  onClearFilters?: () => void;
}

export const BaseSalaryHeader = React.memo<BaseSalaryHeaderProps>(
  ({ className, onClearFilters }) => {
    // Permission checks
    const { hasPermission } = useActionPermission();
    const canCreate = hasPermission('CREATE');
    const canView = hasPermission('VIEW');

    // Select actions and searchLoading state from the store
    const openCreateModal = useBaseSalaryStore(state => state.openCreateModal);
    const refreshData = useBaseSalaryStore(state => state.refreshData);
    const clearFilters = useBaseSalaryStore(state => state.clearFilters);
    const fetchStats = useBaseSalaryStore(state => state.fetchStats);
    const searchLoading = useBaseSalaryStore(state => state.searchLoading);
    const exportData = useBaseSalaryStore(state => state.exportData);
    const importData = useBaseSalaryStore(state => state.importData);
    const downloadTemplate = useBaseSalaryStore(
      state => state.downloadTemplate
    );

    // Use custom clear filters handler if provided, otherwise use store method
    const handleClearFilters = onClearFilters || clearFilters;

    // Select data states from the optimized selector
    const { stats, statsLoading, statsError } = useBaseSalaryData();

    // Fetch stats on component mount if they are not already loaded
    React.useEffect(() => {
      if (!stats) {
        fetchStats();
      }
    }, [stats, fetchStats]);

    // Determine the content for the stats section based on loading and error states
    const statsContent = React.useMemo(() => {
      // If user doesn't have VIEW permission, don't show stats
      if (!canView) {
        return null;
      }

      if (statsLoading) {
        return <StatsSkeleton count={7} variant='detailed' />;
      }
      if (statsError) {
        return (
          <div className='rounded-md bg-destructive/15 p-3'>
            <p className='text-sm text-destructive'>
              Failed to load statistics: {statsError}
            </p>
          </div>
        );
      }
      if (stats) {
        return (
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            {/* Left Section - Salary Overview */}
            <div className='flex flex-col h-[320px]'>
              <h3 className='text-lg font-semibold text-muted-foreground mb-4'>
                Salary Overview
              </h3>
              <div className='flex-1 grid grid-cols-1 md:grid-cols-2 gap-4'>
                {/* Total Salaries */}
                <div className='rounded-lg border p-4 bg-card'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-sm font-medium text-muted-foreground'>
                        Total Salaries
                      </p>
                      <p className='text-2xl font-bold'>
                        {stats.total.toLocaleString()}
                      </p>
                    </div>
                    <div className='h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center'>
                      <Users className='h-4 w-4 text-primary' />
                    </div>
                  </div>
                </div>

                {/* Active Salaries */}
                <div className='rounded-lg border p-4 bg-card'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-sm font-medium text-muted-foreground'>
                        Active Salaries
                      </p>
                      <p className='text-2xl font-bold text-primary'>
                        {stats.active.toLocaleString()}
                      </p>
                    </div>
                    <div className='h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center'>
                      <Target className='h-4 w-4 text-primary' />
                    </div>
                  </div>
                </div>

                {/* Draft Salaries */}
                <div className='rounded-lg border p-4 bg-card'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-sm font-medium text-muted-foreground'>
                        Draft Salaries
                      </p>
                      <p className='text-2xl font-bold text-muted-foreground'>
                        {stats.draft.toLocaleString()}
                      </p>
                    </div>
                    <div className='h-8 w-8 rounded-full bg-muted/10 flex items-center justify-center'>
                      <Calculator className='h-4 w-4 text-muted-foreground' />
                    </div>
                  </div>
                </div>

                {/* Inactive Salaries */}
                <div className='rounded-lg border p-4 bg-card'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-sm font-medium text-muted-foreground'>
                        Inactive Salaries
                      </p>
                      <p className='text-2xl font-bold text-destructive'>
                        {stats.inactive.toLocaleString()}
                      </p>
                    </div>
                    <div className='h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center'>
                      <TrendingDown className='h-4 w-4 text-destructive' />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Section - Salary Statistics */}
            <div className='flex flex-col h-[320px]'>
              <h3 className='text-lg font-semibold text-muted-foreground mb-4'>
                Salary Statistics
              </h3>
              <div className='flex-1 flex flex-col justify-between'>
                {/* Average Salary */}
                <div className='flex items-center justify-between py-4 border-b border-border'>
                  <div className='flex items-center gap-3'>
                    <div className='h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center'>
                      <Calculator className='h-5 w-5 text-primary' />
                    </div>
                    <div>
                      <p className='text-sm font-medium text-muted-foreground'>
                        Average Salary
                      </p>
                      <p className='text-2xl font-bold text-primary'>
                        <CompactCurrency amount={stats.average_salary} />
                      </p>
                    </div>
                  </div>
                </div>

                {/* Minimum Salary */}
                <div className='flex items-center justify-between py-4 border-b border-border'>
                  <div className='flex items-center gap-3'>
                    <div className='h-10 w-10 rounded-full bg-secondary/20 flex items-center justify-center'>
                      <Minus className='h-5 w-5 text-secondary-foreground' />
                    </div>
                    <div>
                      <p className='text-sm font-medium text-muted-foreground'>
                        Minimum Salary
                      </p>
                      <p className='text-2xl font-bold text-secondary-foreground'>
                        <CompactCurrency amount={stats.min_salary} />
                      </p>
                    </div>
                  </div>
                </div>

                {/* Maximum Salary */}
                <div className='flex items-center justify-between py-4'>
                  <div className='flex items-center gap-3'>
                    <div className='h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center'>
                      <DollarSign className='h-5 w-5 text-accent-foreground' />
                    </div>
                    <div>
                      <p className='text-sm font-medium text-muted-foreground'>
                        Maximum Salary
                      </p>
                      <p className='text-2xl font-bold text-accent-foreground'>
                        <CompactCurrency amount={stats.max_salary} />
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }
      return null;
    }, [stats, statsLoading, statsError, canView]);

    return (
      <div className={className}>
        {/* Mobile-first responsive header */}
        <div className='flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0'>
          <div className='flex-1'>
            <h1 className='text-2xl font-bold tracking-tight sm:text-3xl'>
              Base Salary
            </h1>
            <p className='text-muted-foreground opacity-50 text-sm sm:text-base'>
              Manage employee base salary structures and compensation
            </p>
          </div>

          {/* Action Buttons - Original design: full buttons on desktop, icon-only on mobile */}
          <div className='flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={handleClearFilters}
              disabled={searchLoading}
              className='w-full sm:w-auto'
            >
              <Filter className='mr-2 h-4 w-4' />
              <span className='hidden sm:inline'>Clear Filters</span>
              <span className='sm:hidden'>Clear</span>
            </Button>

            <Button
              variant='outline'
              size='sm'
              onClick={refreshData}
              disabled={searchLoading}
              className='w-full sm:w-auto'
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${searchLoading ? 'animate-spin' : ''}`}
              />
              <span className='hidden sm:inline'>Refresh</span>
              <span className='sm:hidden'>Refresh</span>
            </Button>

            <FileOperationsDropdown
              onExport={exportData}
              onImport={importData}
              onDownloadTemplate={downloadTemplate}
              loading={searchLoading}
              className='w-full sm:w-auto'
            />

            {/* Only show Create button if user has CREATE permission */}
            {canCreate && (
              <Button
                variant='default'
                size='sm'
                onClick={openCreateModal}
                className='w-full sm:w-auto'
              >
                <Plus className='mr-2 h-4 w-4' />
                <span className='hidden sm:inline'>Add Base Salary</span>
                <span className='sm:hidden'>Add</span>
              </Button>
            )}
          </div>
        </div>

        <div className='mt-4 lg:mt-6'>{statsContent}</div>
      </div>
    );
  }
);

BaseSalaryHeader.displayName = 'BaseSalaryHeader';
