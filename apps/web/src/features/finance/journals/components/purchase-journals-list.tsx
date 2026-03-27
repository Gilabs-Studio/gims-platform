"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { DateRange } from "react-day-picker";
import type { UnifiedJournalRow } from "./journal-table";

import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { FinanceListErrorState } from "@/features/finance/shared/components/finance-list-error-state";

import { useFinancePurchaseJournals } from "../hooks/use-finance-journals";
import { ExportButton } from "./export-button";
import { FilterToolbar } from "./filter-toolbar";
import { JournalTable, mapJournalToUnifiedRow } from "./journal-table";
import { canResolveJournalSourceDetail, JournalSourceDetailModal } from "./journal-source-detail-modal";
import { toLocalDateString } from "@/lib/utils";

export function PurchaseJournalsList() {
  const t = useTranslations("financeJournals");

  const now = new Date();
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(now.getFullYear(), 0, 1),
    to: now,
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedReferenceRow, setSelectedReferenceRow] = useState<UnifiedJournalRow | null>(null);
  const [isReferenceModalOpen, setIsReferenceModalOpen] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const startDate = dateRange?.from ? toLocalDateString(dateRange.from) : undefined;
  const endDate = dateRange?.to ? toLocalDateString(dateRange.to) : undefined;

  const canExport = useUserPermission("purchase_journal.export");

  const { data, isLoading, isError } = useFinancePurchaseJournals({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
    sort_by: "entry_date",
    sort_dir: "desc",
  });

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const mappedItems = items.map(mapJournalToUnifiedRow);

  if (isError) {
    return <FinanceListErrorState message={t("toast.failed")} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("purchaseTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("purchaseDescription")}</p>
        </div>

        {canExport && (
          <ExportButton data={mappedItems} filename="purchase-journal" label={t("actions.export")} />
        )}
      </div>

      <FilterToolbar
        search={search}
        dateRange={dateRange}
        searchPlaceholder={t("search")}
        dateRangeLabel={t("fields.dateRange")}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        onDateRangeChange={(value) => {
          setDateRange(value);
          setPage(1);
        }}
      />

      <JournalTable
        isLoading={isLoading}
        data={mappedItems}
        rowStartNumber={((pagination?.page ?? page) - 1) * (pagination?.per_page ?? pageSize) + 1}
        canReferenceClick={(row) => canResolveJournalSourceDetail(row.referenceType)}
        onReferenceClick={(row) => {
          setSelectedReferenceRow(row);
          setIsReferenceModalOpen(true);
        }}
      />

      <DataTablePagination
        pageIndex={pagination?.page ?? page}
        pageSize={pagination?.per_page ?? pageSize}
        rowCount={pagination?.total ?? items.length}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />

      <JournalSourceDetailModal
        open={isReferenceModalOpen}
        onOpenChange={(open) => {
          setIsReferenceModalOpen(open);
          if (!open) {
            setSelectedReferenceRow(null);
          }
        }}
        row={selectedReferenceRow}
      />
    </div>
  );
}
