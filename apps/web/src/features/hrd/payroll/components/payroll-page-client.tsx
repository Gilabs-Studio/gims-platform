"use client";

import { usePayroll } from "../hooks/usePayroll";
import { PayrollHeader } from "./payroll-header";
import { PayrollSummaryCards } from "./payroll-summary-cards";
import { PayrollTrendChart } from "./payroll-trend-chart";
import { PayrollComponentBreakdownChart } from "./payroll-component-breakdown-chart";
import { PayrollLastRunCard } from "./payroll-last-run-card";
import { PayrollRunTable } from "./payroll-run-table";
import { PayrollComplianceCard } from "./payroll-compliance-card";
import { PayrollRunModal } from "./payroll-run-modal";
import { PayrollSettingsModal } from "./payroll-settings-modal";
import { PayrollDetailSheet } from "./payroll-detail-sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { PageMotion } from "@/components/motion";

export default function PayrollPageClient() {
  const {
    metrics,
    isLoadingMetrics,
    trend,
    components,
    lastRun,
    payrollRuns,
    complianceTaxes,
    settings,
    isRunModalOpen,
    openRunModal,
    closeRunModal,
    isSettingsModalOpen,
    openSettingsModal,
    closeSettingsModal,
    selectedRunRecord,
    setSelectedRunRecord,
    trendFilterPeriod,
    setTrendFilterPeriod,
    runPayroll,
    isSubmittingRun,
  } = usePayroll();

  if (isLoadingMetrics) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Skeleton className="h-72 lg:col-span-5 rounded-lg" />
          <Skeleton className="h-72 lg:col-span-4 rounded-lg" />
          <Skeleton className="h-72 lg:col-span-3 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <PageMotion className="space-y-6">
      {/* 1. Page Header */}
      <PayrollHeader
        onRunPayroll={openRunModal}
        onOpenSettings={openSettingsModal}
      />

      {/* 2. Top Summary Metric Cards */}
      <PayrollSummaryCards metrics={metrics} />

      {/* 3. Middle Section: Trend, Breakdown, Last Run */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-6 xl:col-span-5">
          <PayrollTrendChart
            data={trend}
            filterPeriod={trendFilterPeriod}
            onFilterChange={setTrendFilterPeriod}
          />
        </div>

        <div className="lg:col-span-6 xl:col-span-4">
          <PayrollComponentBreakdownChart
            components={components}
            totalAmount={metrics?.totalPayrollThisMonth ?? 1256780000}
          />
        </div>

        <div className="lg:col-span-12 xl:col-span-3">
          <PayrollLastRunCard
            lastRun={lastRun}
            onViewDetail={(run) => setSelectedRunRecord(run)}
          />
        </div>
      </div>

      {/* 4. Bottom Section: Run List Table & Compliance/Tax */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7 xl:col-span-8">
          <PayrollRunTable
            runs={payrollRuns}
            onSelectRun={(run) => setSelectedRunRecord(run)}
          />
        </div>

        <div className="lg:col-span-5 xl:col-span-4">
          <PayrollComplianceCard items={complianceTaxes} />
        </div>
      </div>

      {/* Interactive Dialogs & Drawers */}
      <PayrollRunModal
        isOpen={isRunModalOpen}
        onClose={closeRunModal}
        onSubmit={(values) => runPayroll(values)}
        isSubmitting={isSubmittingRun}
      />

      <PayrollSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={closeSettingsModal}
        initialValues={settings}
      />

      <PayrollDetailSheet
        run={selectedRunRecord}
        onClose={() => setSelectedRunRecord(null)}
      />
    </PageMotion>
  );
}
