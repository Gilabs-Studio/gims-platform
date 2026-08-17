"use client";

import { usePayroll } from "../hooks/usePayroll";
import { PayrollHeader } from "./payroll-header";
import { PayrollSummaryCards } from "./payroll-summary-cards";
import { PayrollTrendChart } from "./payroll-trend-chart";
import { PayrollComponentBreakdownChart } from "./payroll-component-breakdown-chart";
import { PayrollRunTable } from "./payroll-run-table";
import { PayrollComplianceCard } from "./payroll-compliance-card";
import { PayrollRunModal } from "./payroll-run-modal";
import { PayrollSettingsModal } from "./payroll-settings-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { PageMotion } from "@/components/motion";

export default function PayrollPageClient() {
  const {
    metrics,
    isLoadingMetrics,
    trend,
    components,
    payrollRuns,
    complianceTaxes,
    settings,
    isRunModalOpen,
    openRunModal,
    closeRunModal,
    isSettingsModalOpen,
    openSettingsModal,
    closeSettingsModal,
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
          <Skeleton className="h-72 lg:col-span-7 rounded-lg" />
          <Skeleton className="h-72 lg:col-span-5 rounded-lg" />
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

      {/* 3. Middle Section: Trend Chart & Component Breakdown */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7 xl:col-span-7">
          <PayrollTrendChart
            data={trend}
            filterPeriod={trendFilterPeriod}
            onFilterChange={setTrendFilterPeriod}
          />
        </div>

        <div className="lg:col-span-5 xl:col-span-5">
          <PayrollComponentBreakdownChart
            components={components}
            totalAmount={metrics?.totalPayrollThisMonth ?? 1256780000}
          />
        </div>
      </div>

      {/* 4. Bottom Section: Run List Table & Compliance/Tax */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-7 xl:col-span-7">
          <PayrollRunTable
            runs={payrollRuns}
          />
        </div>

        <div className="lg:col-span-5 xl:col-span-5">
          <PayrollComplianceCard items={complianceTaxes} />
        </div>
      </div>

      {/* Interactive Dialog Modals */}
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
    </PageMotion>
  );
}
