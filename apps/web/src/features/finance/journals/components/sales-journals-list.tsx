"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";

import { useFinanceSalesJournals } from "../hooks/use-finance-journals";
import { ExportButton } from "./export-button";
import { FilterToolbar } from "./filter-toolbar";
import { JournalTable, mapJournalToUnifiedRow } from "./journal-table";

export function SalesJournalsList() {
  const t = useTranslations("financeJournals");

  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const debouncedSearch = useDebounce(search, 300);

  const canExport = useUserPermission("sales_journal.export");

  const { data, isLoading, isError } = useFinanceSalesJournals({
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
    return <div className="text-center py-8 text-destructive">{t("toast.failed")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("salesTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("salesDescription")}</p>
        </div>

        {canExport && (
          <ExportButton data={mappedItems} filename="sales-journal" label={t("actions.export")} />
        )}
      </div>

      <FilterToolbar
        search={search}
        startDate={startDate}
        endDate={endDate}
        searchPlaceholder={t("search")}
        startDateLabel={t("fields.startDate")}
        endDateLabel={t("fields.endDate")}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        onStartDateChange={(value) => {
          setStartDate(value);
          setPage(1);
        }}
        onEndDateChange={(value) => {
          setEndDate(value);
          setPage(1);
        }}
      />

      <JournalTable
        isLoading={isLoading}
        data={mappedItems}
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
    </div>
  );
}
