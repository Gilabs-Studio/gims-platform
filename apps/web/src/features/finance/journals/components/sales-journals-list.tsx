"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { useDebounce } from "@/hooks/use-debounce";
import { formatCurrency } from "@/lib/utils";
import { useUserPermission } from "@/hooks/use-user-permission";

import { useFinanceSalesJournals } from "../hooks/use-finance-journals";
import { ExportButton } from "./export-button";
import { FilterToolbar } from "./filter-toolbar";
import { StandardTable } from "./standard-table";

function safeDate(value?: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function StatusBadge({ status }: { readonly status: string }) {
  if (status === "posted") {
    return <Badge variant="success">Posted</Badge>;
  }

  if (status === "draft") {
    return <Badge variant="secondary">Draft</Badge>;
  }

  return <Badge variant="outline">{status}</Badge>;
}

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
          <ExportButton data={items} filename="sales-journal" label={t("actions.export")} />
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

      <StandardTable
        isLoading={isLoading}
        columnCount={7}
        header={
          <TableRow>
            <TableHead>{t("fields.entryDate")}</TableHead>
            <TableHead>{t("fields.description")}</TableHead>
            <TableHead>{t("fields.status")}</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">{t("fields.debit")}</TableHead>
            <TableHead className="text-right">{t("fields.credit")}</TableHead>
          </TableRow>
        }
      >
        {items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
              -
            </TableCell>
          </TableRow>
        ) : (
          items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="tabular-nums">{safeDate(item.entry_date)}</TableCell>
              <TableCell className="max-w-[260px] truncate">{item.description ?? "-"}</TableCell>
              <TableCell>
                <StatusBadge status={item.status} />
              </TableCell>
              <TableCell className="font-mono text-xs">{item.reference_id ?? "-"}</TableCell>
              <TableCell>{item.reference_type ?? "-"}</TableCell>
              <TableCell className="text-right font-mono tabular-nums">{formatCurrency(item.debit_total)}</TableCell>
              <TableCell className="text-right font-mono tabular-nums">{formatCurrency(item.credit_total)}</TableCell>
            </TableRow>
          ))
        )}
      </StandardTable>

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
