"use client";

import { useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Download, FileText, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { formatCurrency } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";

import { useFinanceCoaTree } from "@/features/finance/coa/hooks/use-finance-coa";
import type { ChartOfAccountTreeNode } from "@/features/finance/coa/types";

import type {
  AccountType,
  JournalLineDetail,
  JournalStatus,
  ListJournalLinesParams,
  ReferenceTypeOption,
} from "../types";
import { useJournalLines } from "../hooks/use-journal-lines";
import { journalLinesService } from "../services/journal-lines-service";

// ─── Helpers ─────────────────────────────────────────────────

interface CoaOption {
  id: string;
  code: string;
  name: string;
}

function flattenCoa(nodes: ChartOfAccountTreeNode[]): CoaOption[] {
  const result: CoaOption[] = [];
  for (const node of nodes) {
    result.push({ id: node.id, code: node.code, name: node.name });
    if (node.children?.length > 0) {
      result.push(...flattenCoa(node.children));
    }
  }
  return result.sort((a, b) => a.code.localeCompare(b.code));
}

function formatAmount(value: number): string {
  if (value === 0) return "-";
  return formatCurrency(value);
}

function getStatusBadge(
  status: string,
  t: ReturnType<typeof useTranslations>
) {
  const normalized = status?.toLowerCase() ?? "draft";
  switch (normalized) {
    case "posted":
      return (
        <Badge variant="success" className="text-xs font-medium">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {t("status.posted")}
        </Badge>
      );
    case "draft":
      return (
        <Badge variant="secondary" className="text-xs font-medium">
          <FileText className="h-3 w-3 mr-1" />
          {t("status.draft")}
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-xs font-medium">
          {status}
        </Badge>
      );
  }
}

// Account type options for filter
const ACCOUNT_TYPE_OPTIONS: { value: AccountType; label: string }[] = [
  { value: "ASSET", label: "Asset" },
  { value: "CASH_BANK", label: "Cash & Bank" },
  { value: "CURRENT_ASSET", label: "Current Asset" },
  { value: "FIXED_ASSET", label: "Fixed Asset" },
  { value: "LIABILITY", label: "Liability" },
  { value: "TRADE_PAYABLE", label: "Trade Payable" },
  { value: "EQUITY", label: "Equity" },
  { value: "REVENUE", label: "Revenue" },
  { value: "EXPENSE", label: "Expense" },
  { value: "COST_OF_GOODS_SOLD", label: "COGS" },
  { value: "SALARY_WAGES", label: "Salary & Wages" },
  { value: "OPERATIONAL", label: "Operational" },
];

// Reference type options for filter
const REFERENCE_TYPE_OPTIONS: { value: ReferenceTypeOption; label: string }[] = [
  { value: "SO", label: "Sales Order" },
  { value: "PO", label: "Purchase Order" },
  { value: "DO", label: "Delivery Order" },
  { value: "GR", label: "Goods Receipt" },
  { value: "STOCK_OP", label: "Stock Opname" },
  { value: "ADJUSTMENT", label: "Adjustment" },
  { value: "NTP", label: "Non-Trade Payable" },
  { value: "PAYMENT", label: "Payment" },
  { value: "ASSET_TXN", label: "Asset Transaction" },
  { value: "ASSET_DEP", label: "Asset Depreciation" },
  { value: "CASH_BANK", label: "Cash & Bank" },
  { value: "UP_COUNTRY", label: "Up Country Cost" },
];

// ─── Main Component ──────────────────────────────────────────

export function JournalLinesList() {
  const t = useTranslations("journalLines");
  const tCommon = useTranslations("common");

  // Filter state
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [coaId, setCoaId] = useState("");
  const [accountType, setAccountType] = useState("");
  const [referenceType, setReferenceType] = useState("");
  const [journalStatus, setJournalStatus] = useState("");

  // COA data for dropdown filter
  const { data: coaData } = useFinanceCoaTree({ only_active: true });
  const coaOptions = useMemo(
    () => flattenCoa(coaData?.data ?? []),
    [coaData?.data]
  );

  // Build query params
  const params: ListJournalLinesParams = useMemo(
    () => ({
      page,
      per_page: pageSize,
      search: debouncedSearch || undefined,
      chart_of_account_id: coaId || undefined,
      account_type: (accountType as AccountType) || undefined,
      reference_type: referenceType || undefined,
      journal_status: (journalStatus as JournalStatus) || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      sort_by: "entry_date",
      sort_dir: "asc",
    }),
    [
      page,
      pageSize,
      debouncedSearch,
      coaId,
      accountType,
      referenceType,
      journalStatus,
      startDate,
      endDate,
    ]
  );

  const { data, isLoading, isError } = useJournalLines(params);

  const lines = data?.data?.lines ?? [];
  const totalDebit = data?.data?.total_debit ?? 0;
  const totalCredit = data?.data?.total_credit ?? 0;
  const totalRows = data?.meta?.pagination?.total ?? 0;
  const hasRunningBalance = !!coaId;

  // Export handler
  const handleExport = useCallback(async () => {
    try {
      const blob = await journalLinesService.export(params);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      const filename = `journal_lines_${startDate || "all"}_${endDate || "all"}.csv`;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(t("toast.exportSuccess"));
    } catch {
      toast.error(tCommon("exportFailed"));
    }
  }, [params, startDate, endDate, t, tCommon]);

  // Reset filters
  const handleResetFilters = useCallback(() => {
    setSearch("");
    setStartDate("");
    setEndDate("");
    setCoaId("");
    setAccountType("");
    setReferenceType("");
    setJournalStatus("");
    setPage(1);
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Button
          onClick={handleExport}
          variant="outline"
          size="sm"
          className="cursor-pointer"
        >
          <Download className="h-4 w-4 mr-2" />
          {t("actions.export")}
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("search")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>

        {/* COA Filter */}
        <Select
          value={coaId}
          onValueChange={(val) => {
            setCoaId(val === "all" ? "" : val);
            setPage(1);
          }}
        >
          <SelectTrigger className="cursor-pointer">
            <SelectValue placeholder={t("filters.selectCoa")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="cursor-pointer">
              {t("filters.allAccounts")}
            </SelectItem>
            {coaOptions.map((opt) => (
              <SelectItem
                key={opt.id}
                value={opt.id}
                className="cursor-pointer"
              >
                {opt.code} - {opt.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Account Type Filter */}
        <Select
          value={accountType}
          onValueChange={(val) => {
            setAccountType(val === "all" ? "" : val);
            setPage(1);
          }}
        >
          <SelectTrigger className="cursor-pointer">
            <SelectValue placeholder={t("filters.accountType")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="cursor-pointer">
              {t("filters.allTypes")}
            </SelectItem>
            {ACCOUNT_TYPE_OPTIONS.map((opt) => (
              <SelectItem
                key={opt.value}
                value={opt.value}
                className="cursor-pointer"
              >
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Journal Status Filter */}
        <Select
          value={journalStatus}
          onValueChange={(val) => {
            setJournalStatus(val === "all" ? "" : val);
            setPage(1);
          }}
        >
          <SelectTrigger className="cursor-pointer">
            <SelectValue placeholder={t("filters.journalStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="cursor-pointer">
              {t("filters.allStatuses")}
            </SelectItem>
            <SelectItem value="draft" className="cursor-pointer">
              {t("status.draft")}
            </SelectItem>
            <SelectItem value="posted" className="cursor-pointer">
              {t("status.posted")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Second row of filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Reference Type Filter */}
        <Select
          value={referenceType}
          onValueChange={(val) => {
            setReferenceType(val === "all" ? "" : val);
            setPage(1);
          }}
        >
          <SelectTrigger className="cursor-pointer">
            <SelectValue placeholder={t("filters.referenceType")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="cursor-pointer">
              {t("filters.allReferences")}
            </SelectItem>
            {REFERENCE_TYPE_OPTIONS.map((opt) => (
              <SelectItem
                key={opt.value}
                value={opt.value}
                className="cursor-pointer"
              >
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Start Date */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            {t("filters.startDate")}
          </Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {/* End Date */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            {t("filters.endDate")}
          </Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {/* Reset */}
        <div className="flex items-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="cursor-pointer text-muted-foreground"
          >
            {t("actions.resetFilters")}
          </Button>
        </div>
      </div>

      {/* Running balance info banner */}
      {hasRunningBalance && (
        <div className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
          {t("runningBalanceInfo")}
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead className="min-w-[100px]">
                {t("columns.entryDate")}
              </TableHead>
              <TableHead className="min-w-[180px]">
                {t("columns.journalDescription")}
              </TableHead>
              <TableHead>{t("columns.refType")}</TableHead>
              <TableHead className="min-w-[80px]">
                {t("columns.coaCode")}
              </TableHead>
              <TableHead className="min-w-[150px]">
                {t("columns.coaName")}
              </TableHead>
              <TableHead className="min-w-[100px]">
                {t("columns.memo")}
              </TableHead>
              <TableHead className="text-right min-w-[120px]">
                {t("columns.debit")}
              </TableHead>
              <TableHead className="text-right min-w-[120px]">
                {t("columns.credit")}
              </TableHead>
              {hasRunningBalance && (
                <TableHead className="text-right min-w-[130px]">
                  {t("columns.runningBalance")}
                </TableHead>
              )}
              <TableHead className="w-20">{t("columns.status")}</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {Array.from({
                    length: hasRunningBalance ? 11 : 10,
                  }).map((_, j) => (
                    <TableCell key={`skeleton-cell-${i}-${j}`}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={hasRunningBalance ? 11 : 10}
                  className="text-center py-8 text-destructive"
                >
                  {t("error")}
                </TableCell>
              </TableRow>
            ) : lines.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={hasRunningBalance ? 11 : 10}
                  className="text-center py-8 text-muted-foreground"
                >
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              lines.map((line, idx) => (
                <JournalLineRow
                  key={line.id}
                  line={line}
                  index={(page - 1) * pageSize + idx + 1}
                  hasRunningBalance={hasRunningBalance}
                  t={t}
                />
              ))
            )}
          </TableBody>

          {/* Totals Footer */}
          {!isLoading && lines.length > 0 && (
            <TableFooter>
              <TableRow className="font-semibold">
                <TableCell
                  colSpan={hasRunningBalance ? 7 : 7}
                  className="text-right"
                >
                  {t("totals")}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(totalDebit)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(totalCredit)}
                </TableCell>
                {hasRunningBalance && <TableCell />}
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      {/* Pagination */}
      {totalRows > 0 && (
        <DataTablePagination
          pageIndex={page}
          pageSize={pageSize}
          rowCount={totalRows}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}
    </div>
  );
}

// ─── Row Component ───────────────────────────────────────────

interface JournalLineRowProps {
  readonly line: JournalLineDetail;
  readonly index: number;
  readonly hasRunningBalance: boolean;
  readonly t: ReturnType<typeof useTranslations>;
}

function JournalLineRow({
  line,
  index,
  hasRunningBalance,
  t,
}: JournalLineRowProps) {
  const isDraft = line.journal_status === "draft";
  const isNegativeBalance = line.running_balance < 0;

  return (
    <TableRow className={isDraft ? "bg-yellow-50/50 dark:bg-yellow-950/10" : ""}>
      <TableCell className="text-muted-foreground text-xs">{index}</TableCell>
      <TableCell className="text-sm whitespace-nowrap">
        {line.entry_date ?? "-"}
      </TableCell>
      <TableCell className="text-sm max-w-[250px] truncate" title={line.journal_description ?? ""}>
        {line.journal_description ?? "-"}
      </TableCell>
      <TableCell className="text-xs">
        {line.reference_type ? (
          <Badge variant="outline" className="text-xs">
            {line.reference_type}
          </Badge>
        ) : (
          "-"
        )}
      </TableCell>
      <TableCell className="text-sm font-mono">
        {line.chart_of_account_code ?? "-"}
      </TableCell>
      <TableCell className="text-sm max-w-[180px] truncate" title={line.chart_of_account_name ?? ""}>
        {line.chart_of_account_name ?? "-"}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground max-w-[120px] truncate" title={line.memo ?? ""}>
        {line.memo || "-"}
      </TableCell>
      <TableCell className="text-right text-sm font-mono">
        {formatAmount(line.debit)}
      </TableCell>
      <TableCell className="text-right text-sm font-mono">
        {formatAmount(line.credit)}
      </TableCell>
      {hasRunningBalance && (
        <TableCell
          className={`text-right text-sm font-mono font-medium ${
            isNegativeBalance
              ? "text-destructive"
              : "text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {formatCurrency(line.running_balance)}
        </TableCell>
      )}
      <TableCell>{getStatusBadge(line.journal_status, t)}</TableCell>
    </TableRow>
  );
}
