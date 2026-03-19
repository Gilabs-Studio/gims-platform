"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { DateRange } from "react-day-picker";
import { ArrowUpRight, ArrowDownRight, Activity, Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";
import { formatCurrency } from "@/lib/utils";
import { useUserPermission } from "@/hooks/use-user-permission";
import type { UnifiedJournalRow } from "./journal-table";

import { useFinanceCashBankSubLedger } from "../hooks/use-finance-journals";
import { ExportButton } from "./export-button";
import { FilterToolbar } from "./filter-toolbar";
import { JournalTable, mapCashBankToUnifiedRow } from "./journal-table";
import { canResolveJournalSourceDetail, JournalSourceDetailModal } from "./journal-source-detail-modal";


export function CashBankJournalsList() {
  const t = useTranslations("financeJournals");

  const now = new Date();
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(now.getFullYear(), 0, 1),
    to: now,
  });
  const [transactionType, setTransactionType] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedReferenceRow, setSelectedReferenceRow] = useState<UnifiedJournalRow | null>(null);
  const [isReferenceModalOpen, setIsReferenceModalOpen] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const startDate = dateRange?.from ? dateRange.from.toISOString().slice(0, 10) : undefined;
  const endDate = dateRange?.to ? dateRange.to.toISOString().slice(0, 10) : undefined;

  const canExport = useUserPermission("cash_bank_journal.export");

  const { data, isLoading, isError } = useFinanceCashBankSubLedger({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
    type: transactionType !== "all" ? (transactionType as "cash_in" | "cash_out" | "transfer") : undefined,
    sort_by: "transaction_date",
    sort_dir: "desc",
  });

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const kpi = data?.meta?.additional?.kpi;

  const mappedItems = items.map((item) => mapCashBankToUnifiedRow(item));

  if (isError) {
    return <div className="text-center py-8 text-destructive">{t("toast.failed")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{t("cashBankTitle")}</h1>
            <Badge variant="secondary" className="font-normal text-xs">
              <Lock className="w-3 h-3 mr-1" />
              Read-Only Subledger
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{t("cashBankDescription")}</p>
        </div>

        {canExport && (
          <ExportButton data={mappedItems} filename="cash-bank-journal" label={t("actions.export")} />
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium">Total Inflow</p>
              <ArrowDownRight className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-500 tabular-nums">
              {formatCurrency(kpi?.total_inflow ?? 0)}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium">Total Outflow</p>
              <ArrowUpRight className="h-4 w-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold text-rose-500 tabular-nums">
              {formatCurrency(kpi?.total_outflow ?? 0)}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium">Net Movement</p>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold tabular-nums">
              {formatCurrency(kpi?.net_movement ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on {kpi?.total_records ?? 0} posted records
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1">
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
        </div>
        <div className="w-full sm:w-[200px] flex gap-2 flex-col">
          <Label className="text-xs">Transaction Type</Label>
          <Select
            value={transactionType}
            onValueChange={(val) => {
              setTransactionType(val);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="cash_in">Cash In</SelectItem>
              <SelectItem value="cash_out">Cash Out</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <JournalTable
        isLoading={isLoading}
        data={mappedItems}
        showBankAccountColumn
        rowStartNumber={((pagination?.page ?? page) - 1) * (pagination?.per_page ?? pageSize) + 1}
        referenceTooltipText="Click to view detail"
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
