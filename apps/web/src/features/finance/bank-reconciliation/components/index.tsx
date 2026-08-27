"use client";

import { useState, useMemo, Suspense, lazy } from "react";
import { useTranslations } from "next-intl";
import type { DateRange } from "react-day-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { WidgetErrorBoundary } from "./widget-error-boundary";
import { ReconciliationHeader } from "./reconciliation-header";
import { ReconciliationFilterBar } from "./reconciliation-filter-bar";
import { UploadStatementModal } from "./upload-statement-modal";
import { ExportSummaryModal } from "./export-summary-modal";
import {
  useBankReconciliations,
  useBankReconciliation,
  useBankReconciliationFormData,
  useImportBankReconciliation,
  useAutoMatchBankReconciliation,
  useConfirmBankReconciliation,
} from "../hooks/use-bank-reconciliation";
import type { ImportBankStatementInput, BankReconciliationStatus } from "../types";

// Lazy-loaded widget components for independent loading & failure isolation
const LedgerBalanceCardLazy = lazy(() =>
  import("./ledger-balance-card").then((m) => ({ default: m.LedgerBalanceCard })),
);
const StatementBalanceCardLazy = lazy(() =>
  import("./statement-balance-card").then((m) => ({ default: m.StatementBalanceCard })),
);
const ReconciliationDualTableLazy = lazy(() =>
  import("./reconciliation-dual-table").then((m) => ({ default: m.ReconciliationDualTable })),
);

function toApiDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function CardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <Skeleton className="h-4 w-32" />
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-8 w-32" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export function FinanceBankReconciliationContainer() {
  const t = useTranslations("financeBankReconciliation");
  const now = useMemo(() => new Date(), []);
  const [pickerRange, setPickerRange] = useState<DateRange | undefined>({
    from: new Date(now.getFullYear(), now.getMonth(), 1),
    to: now,
  });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  // Dynamic Query Parameters for backend API
  const queryParams = useMemo(
    () => ({
      date_from: pickerRange?.from ? toApiDate(pickerRange.from) : undefined,
      date_to: pickerRange?.to ? toApiDate(pickerRange.to) : undefined,
      status: statusFilter !== "all" ? (statusFilter as BankReconciliationStatus) : undefined,
      page: 1,
      per_page: 20,
    }),
    [pickerRange, statusFilter],
  );

  // Real Production TanStack Query Hooks
  const { data: reconciliationsData, isLoading: isListLoading } = useBankReconciliations(queryParams);
  const { data: formDataResponse } = useBankReconciliationFormData();
  const importMutation = useImportBankReconciliation();
  const autoMatchMutation = useAutoMatchBankReconciliation();
  const confirmMutation = useConfirmBankReconciliation();

  const reconciliations = reconciliationsData?.data || [];
  const latestReconciliationSummary = reconciliations[0] || null;

  // Detail Query for Active Bank Reconciliation Statement Lines
  const { data: reconciliationDetailResponse, isLoading: isDetailLoading } = useBankReconciliation(
    latestReconciliationSummary?.id || "",
    { enabled: !!latestReconciliationSummary?.id },
  );

  const activeReconciliation = reconciliationDetailResponse?.data || latestReconciliationSummary;
  const statementLines = activeReconciliation?.bank_statement_lines || [];
  const bankAccounts = formDataResponse?.data?.bank_accounts || [];

  const handleUploadStatement = async (payload: ImportBankStatementInput) => {
    await importMutation.mutateAsync(payload);
  };

  const handleAutoMatch = () => {
    if (activeReconciliation?.id) {
      autoMatchMutation.mutate(activeReconciliation.id);
    }
  };

  const handleConfirm = () => {
    if (activeReconciliation?.id) {
      confirmMutation.mutate(activeReconciliation.id);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Row with Title, DateRangePicker, Popover Filters & Actions */}
      <ReconciliationHeader
        totalCount={reconciliationsData?.meta?.pagination?.total || reconciliations.length}
        dateRange={pickerRange}
        onDateChange={setPickerRange}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
      />

      {/* Active Filter Pills Bar */}
      <ReconciliationFilterBar
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onResetFilters={() => setStatusFilter("all")}
      />

      {/* Top KPI Cards Grid (Ledger Balance & Statement Balance) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WidgetErrorBoundary title={t("ledgerBalance")}>
          <Suspense fallback={<CardSkeleton />}>
            <LedgerBalanceCardLazy
              clearedBalance={activeReconciliation?.book_balance ?? 0}
              paymentsAmount={0}
              paymentsCount={0}
              depositsAmount={0}
              depositsCount={0}
            />
          </Suspense>
        </WidgetErrorBoundary>

        <WidgetErrorBoundary title={t("statementBalance")}>
          <Suspense fallback={<CardSkeleton />}>
            <StatementBalanceCardLazy
              endingBalance={activeReconciliation?.statement_balance ?? 0}
              clearedBalance={activeReconciliation?.book_balance ?? 0}
              difference={activeReconciliation?.difference ?? 0}
            />
          </Suspense>
        </WidgetErrorBoundary>
      </div>

      {/* Dual Side-by-Side Matching Table Section */}
      <WidgetErrorBoundary title="Bank Reconciliation Matching Table">
        <Suspense fallback={<TableSkeleton />}>
          <ReconciliationDualTableLazy
            reconciliation={activeReconciliation}
            statementLines={statementLines}
            onAutoMatch={handleAutoMatch}
            onConfirm={handleConfirm}
            onOpenUploadModal={() => setIsUploadModalOpen(true)}
            isLoading={isListLoading || isDetailLoading || autoMatchMutation.isPending || confirmMutation.isPending}
          />
        </Suspense>
      </WidgetErrorBoundary>

      {/* Upload Statement Modal */}
      <UploadStatementModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUploadStatement}
        bankAccounts={bankAccounts}
      />

      {/* Export Summary Modal */}
      <ExportSummaryModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
}

export default FinanceBankReconciliationContainer;
