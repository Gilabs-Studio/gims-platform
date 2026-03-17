"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, Activity, ExternalLink, Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

import { useFinanceCashBankSubLedger } from "../hooks/use-finance-journals";
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

function TypeBadge({ type }: { readonly type: string }) {
  switch (type) {
    case "cash_in":
      return (
        <Badge variant="outline" className="text-emerald-500 bg-emerald-500/10 border-emerald-500/20">
          <ArrowDownRight className="w-3 h-3 mr-1" />
          Cash In
        </Badge>
      );
    case "cash_out":
      return (
        <Badge variant="outline" className="text-rose-500 bg-rose-500/10 border-rose-500/20">
          <ArrowUpRight className="w-3 h-3 mr-1" />
          Cash Out
        </Badge>
      );
    case "transfer":
      return (
        <Badge variant="outline" className="text-blue-500 bg-blue-500/10 border-blue-500/20">
          <Activity className="w-3 h-3 mr-1" />
          Transfer
        </Badge>
      );
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
}

export function CashBankJournalsList() {
  const t = useTranslations("financeJournals");

  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [transactionType, setTransactionType] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const debouncedSearch = useDebounce(search, 300);

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
          <ExportButton data={items} filename="cash-bank-journal" label={t("actions.export")} />
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

      <StandardTable
        isLoading={isLoading}
        columnCount={7}
        header={
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Bank Account</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total Amount</TableHead>
            <TableHead className="text-right">Actions</TableHead>
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
              <TableCell className="tabular-nums">{safeDate(item.transaction_date)}</TableCell>
              <TableCell>
                <TypeBadge type={item.type} />
              </TableCell>
              <TableCell>
                <div className="font-medium">
                  {item.bank_account?.name ?? "-"}
                </div>
                {item.bank_account?.account_number && (
                  <div className="text-xs text-muted-foreground font-mono">
                    {item.bank_account.account_number}
                  </div>
                )}
              </TableCell>
              <TableCell className="max-w-[260px] truncate" title={item.description ?? ""}>
                {item.description ?? "-"}
              </TableCell>
              <TableCell>
                <StatusBadge status={item.status} />
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums font-medium">
                {formatCurrency(item.total_amount)}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/finance/cash-bank/${item.id}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Detail
                  </Link>
                </Button>
              </TableCell>
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
