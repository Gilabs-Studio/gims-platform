"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  BookOpenText,
  Download,
  Filter,
  Info,
  Minus,
  Search,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FINANCE_PERMISSIONS } from "@/features/finance/permissions";
import { useUserPermission } from "@/hooks/use-user-permission";
import { useExportProgress } from "@/lib/use-export-progress";
import { formatCurrency } from "@/lib/utils";

import { useGeneralLedger } from "../hooks/use-general-ledger";
import type { GeneralLedgerAccount, GLTransactionRow } from "../types";
import {
  canResolveJournalSourceDetail,
  JournalSourceDetailModal,
} from "@/features/finance/journals/components/journal-source-detail-modal";
import { AccountLedgerDetailDialog } from "./account-ledger-detail-dialog";
import { JournalDetailModal } from "@/features/finance/journals/components/journal-detail-modal";
import type { UnifiedJournalRow } from "@/features/finance/journals/components/journal-table";

function toApiDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function GeneralLedgerView() {
  const t = useTranslations("financeReports");
  const tCommon = useTranslations("common");
  const searchParams = useSearchParams();
  const canExport = useUserPermission(FINANCE_PERMISSIONS.REPORT.GENERAL_LEDGER_EXPORT);
  const exportProgress = useExportProgress();

  const now = useMemo(() => new Date(), []);
  const [pickerRange, setPickerRange] = useState<DateRange | undefined>({
    from: new Date(now.getFullYear(), 0, 1),
    to: now,
  });
  const [companyID, setCompanyID] = useState<string>("");
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>("ALL");
  const [accountSearch, setAccountSearch] = useState<string>("");
  const [selectedAccountID, setSelectedAccountID] = useState<string | null>(null);
  const [selectedJournalID, setSelectedJournalID] = useState<string | null>(null);
  const [isJournalDetailOpen, setIsJournalDetailOpen] = useState(false);
  const [selectedSourceRow, setSelectedSourceRow] = useState<UnifiedJournalRow | null>(null);
  const [isSourceDetailOpen, setIsSourceDetailOpen] = useState(false);
  const [isAccountDetailOpen, setIsAccountDetailOpen] = useState(false);
  const accountIDFilter = searchParams.get("account_id")?.trim() ?? "";

  const dateRange = useMemo(
    () => ({
      start_date: pickerRange?.from
        ? toApiDate(pickerRange.from)
        : toApiDate(new Date(now.getFullYear(), 0, 1)),
      end_date: pickerRange?.to ? toApiDate(pickerRange.to) : toApiDate(now),
      company_id: companyID.trim() || undefined,
      account_id: accountIDFilter || undefined,
    }),
    [pickerRange, now, companyID, accountIDFilter],
  );

  const { data, isLoading, isError, refetch } = useGeneralLedger(dateRange);
  const accounts = useMemo<GeneralLedgerAccount[]>(
    () => data?.data?.accounts ?? [],
    [data?.data?.accounts],
  );

  const accountTypes = useMemo(() => {
    const uniq = new Set<string>();
    for (const account of accounts) {
      if (account.account_type) {
        uniq.add(account.account_type);
      }
    }
    return Array.from(uniq).sort((a, b) => a.localeCompare(b));
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    const keyword = accountSearch.trim().toLowerCase();
    return accounts.filter((account) => {
      const passType =
        accountTypeFilter === "ALL" ||
        account.account_type === accountTypeFilter;
      if (!passType) return false;
      if (!keyword) return true;

      const haystack =
        `${account.account_code} ${account.account_name}`.toLowerCase();
      return haystack.includes(keyword);
    });
  }, [accounts, accountTypeFilter, accountSearch]);

  const selectedAccount = useMemo(() => {
    const effectiveSelectedAccountID =
      selectedAccountID && filteredAccounts.some((account) => account.account_id === selectedAccountID)
        ? selectedAccountID
        : filteredAccounts[0]?.account_id ?? null;

    if (!effectiveSelectedAccountID) return null;
    return (
      filteredAccounts.find(
        (account) => account.account_id === effectiveSelectedAccountID,
      ) ?? null
    );
  }, [filteredAccounts, selectedAccountID]);

  const summary = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;

    for (const account of filteredAccounts) {
      totalDebit += account.total_debit ?? 0;
      totalCredit += account.total_credit ?? 0;
    }

    return {
      totalDebit,
      totalCredit,
      netBalance: totalDebit - totalCredit,
      totalAccounts: filteredAccounts.length,
    };
  }, [filteredAccounts]);

  const toSourceRow = (transaction: GLTransactionRow): UnifiedJournalRow => ({
    id: transaction.journal_id,
    entryDate: transaction.entry_date,
    description: transaction.description,
    referenceType: transaction.reference_type,
    referenceId: transaction.reference_id,
    referenceCode: transaction.reference_code,
    status: "posted",
    debit: transaction.debit,
    credit: transaction.credit,
    createdAt: transaction.entry_date,
    updatedAt: transaction.entry_date,
    original: transaction,
  });

  const handleExport = async () => {
    try {
      await exportProgress.runWithProgress({
        endpoint: "/finance/reports/export/general-ledger",
        params: dateRange,
      });
    } catch {
      toast.error(tCommon("exportFailed"));
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-6 pb-12">
        {/* Top Header Row with Title & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Title & Subtitle */}
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {t("gl_title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("gl_description")}
            </p>
          </div>

          {/* Right Actions: Date Range Picker, Filter Popover, Export */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* Quick Account Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={accountSearch}
                onChange={(e) => setAccountSearch(e.target.value)}
                placeholder={t("account_filter_placeholder")}
                className="h-9 pl-8 text-xs"
              />
            </div>

            {/* Date Range Picker */}
            <DateRangePicker dateRange={pickerRange} onDateChange={setPickerRange} />

            {/* Filter Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="cursor-pointer gap-1.5 text-xs font-semibold h-9">
                  <Filter className="w-3.5 h-3.5" />
                  <span>{t("filters")}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4 space-y-4" align="end">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-1.5 font-semibold text-sm">
                    <SlidersHorizontal className="w-4 h-4 text-primary" />
                    <span>{t("filter_reports")}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">{t("account_type")}</label>
                    <Select value={accountTypeFilter} onValueChange={setAccountTypeFilter}>
                      <SelectTrigger className="h-8 text-xs w-full">
                        <SelectValue placeholder={t("account_type")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">{t("all_account_types")}</SelectItem>
                        {accountTypes.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">{t("company_id_label")}</label>
                    <Input
                      value={companyID}
                      onChange={(e) => setCompanyID(e.target.value)}
                      placeholder={t("company_id_placeholder")}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                {(accountTypeFilter !== "ALL" || companyID || accountSearch) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAccountTypeFilter("ALL");
                      setCompanyID("");
                      setAccountSearch("");
                    }}
                    className="w-full text-xs cursor-pointer text-muted-foreground hover:text-foreground"
                  >
                    {t("reset_filter")}
                  </Button>
                )}
              </PopoverContent>
            </Popover>

            {/* Export Button */}
            {canExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={exportProgress.isExporting}
                className="cursor-pointer gap-1.5 text-xs font-semibold h-9"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{exportProgress.label(t("export"))}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Top 4 Summary KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Debit */}
          <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="flex items-start justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                  <span>{t("total_debit")}</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground/70 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>{t("total_debit_desc")}</TooltipContent>
                  </Tooltip>
                </div>
                <div className="text-2xl font-bold tracking-tight text-success font-mono">
                  {formatCurrency(summary.totalDebit)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("debit")}
                </div>
              </div>
              <div className="p-3 rounded-full bg-success/10 text-success shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Total Credit */}
          <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="flex items-start justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                  <span>{t("total_credit")}</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground/70 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>{t("total_credit_desc")}</TooltipContent>
                  </Tooltip>
                </div>
                <div className="text-2xl font-bold tracking-tight text-destructive font-mono">
                  {formatCurrency(summary.totalCredit)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("credit")}
                </div>
              </div>
              <div className="p-3 rounded-full bg-destructive/10 text-destructive shrink-0">
                <TrendingDown className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Net Balance */}
          <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="flex items-start justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                  <span>{t("net_balance")}</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground/70 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>{t("net_balance_desc")}</TooltipContent>
                  </Tooltip>
                </div>
                <div className={`text-2xl font-bold tracking-tight font-mono ${summary.netBalance >= 0 ? "text-success" : "text-destructive"}`}>
                  {formatCurrency(summary.netBalance)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Debit - Credit
                </div>
              </div>
              <div className="p-3 rounded-full bg-cyan/10 text-cyan shrink-0">
                <Minus className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Total Accounts */}
          <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="flex items-start justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                  <span>{t("total_accounts")}</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground/70 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>{t("total_accounts_desc")}</TooltipContent>
                  </Tooltip>
                </div>
                <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
                  {summary.totalAccounts.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">
                  Akun Terlibat
                </div>
              </div>
              <div className="p-3 rounded-full bg-purple/10 text-purple shrink-0">
                <BookOpenText className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Loading State */}
        {isLoading && (
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {isError && (
          <Card className="border-destructive/20 bg-destructive/5 text-center">
            <CardContent className="space-y-2 py-6">
              <p className="text-sm text-destructive font-medium">{tCommon("error")}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="cursor-pointer text-xs">
                {t("retry")}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Account Summary Table Card */}
        {!isLoading && !isError && (
          filteredAccounts.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent className="space-y-2">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">{t("no_data")}</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div className="flex items-center gap-1.5">
                  <CardTitle className="text-base font-semibold">{t("account_summary")}</CardTitle>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground/70 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>{t("tooltip_gl_table")}</TooltipContent>
                  </Tooltip>
                </div>
                <Badge variant="secondary" className="font-mono text-xs">
                  {filteredAccounts.length} Akun
                </Badge>
              </CardHeader>

              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="w-[120px] text-xs font-semibold text-foreground">
                          {t("account_code")}
                        </TableHead>
                        <TableHead className="min-w-[220px] text-xs font-semibold text-foreground">
                          {t("account_name")}
                        </TableHead>
                        <TableHead className="w-[140px] text-xs font-semibold text-foreground">
                          {t("account_type")}
                        </TableHead>
                        <TableHead className="text-right min-w-[130px] text-xs font-semibold text-foreground">
                          {t("opening_balance")}
                        </TableHead>
                        <TableHead className="text-right min-w-[130px] text-xs font-semibold text-foreground">
                          {t("debit")}
                        </TableHead>
                        <TableHead className="text-right min-w-[130px] text-xs font-semibold text-foreground">
                          {t("credit")}
                        </TableHead>
                        <TableHead className="text-right min-w-[140px] text-xs font-semibold text-foreground">
                          {t("closing_balance")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAccounts.map((account) => {
                        const isActive = account.account_id === selectedAccountID;
                        const closingBal = account.closing_balance ?? 0;
                        const openingBal = account.opening_balance ?? 0;
                        const debitVal = account.total_debit ?? 0;
                        const creditVal = account.total_credit ?? 0;

                        return (
                          <TableRow
                            key={account.account_id}
                            className={`hover:bg-muted/20 cursor-pointer ${isActive ? "bg-muted/60" : ""}`}
                            onClick={() => {
                              setSelectedAccountID(account.account_id);
                              setIsAccountDetailOpen(true);
                            }}
                          >
                            <TableCell className="font-mono text-xs text-muted-foreground py-2.5">
                              {account.account_code}
                            </TableCell>
                            <TableCell className="py-2.5 text-xs sm:text-sm font-medium text-foreground">
                              {account.account_name}
                            </TableCell>
                            <TableCell className="py-2.5 text-xs text-muted-foreground">
                              {account.account_type}
                            </TableCell>
                            <TableCell className={`text-right py-2.5 font-mono text-xs sm:text-sm tabular-nums ${openingBal < 0 ? "text-destructive" : openingBal > 0 ? "text-success" : "text-foreground"}`}>
                              {formatCurrency(openingBal)}
                            </TableCell>
                            <TableCell className={`text-right py-2.5 font-mono text-xs sm:text-sm tabular-nums ${debitVal > 0 ? "text-success" : "text-foreground"}`}>
                              {formatCurrency(debitVal)}
                            </TableCell>
                            <TableCell className={`text-right py-2.5 font-mono text-xs sm:text-sm tabular-nums ${creditVal > 0 ? "text-destructive" : "text-foreground"}`}>
                              {formatCurrency(creditVal)}
                            </TableCell>
                            <TableCell className={`text-right py-2.5 font-mono text-xs sm:text-sm tabular-nums font-bold ${closingBal < 0 ? "text-destructive" : closingBal > 0 ? "text-success" : "text-foreground"}`}>
                              {formatCurrency(closingBal)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )
        )}

        {/* Dialogs */}
        <AccountLedgerDetailDialog
          account={selectedAccount}
          open={isAccountDetailOpen}
          onOpenChange={setIsAccountDetailOpen}
          onViewJournal={(id) => {
            setSelectedJournalID(id);
            setIsJournalDetailOpen(true);
          }}
          onViewSource={(transaction) => {
            const sourceRow = toSourceRow(transaction);
            setSelectedSourceRow(sourceRow);
            setIsSourceDetailOpen(true);
          }}
          canResolveSourceDetail={canResolveJournalSourceDetail}
        />

        <JournalDetailModal
          open={isJournalDetailOpen}
          onOpenChange={setIsJournalDetailOpen}
          id={selectedJournalID}
        />

        <JournalSourceDetailModal
          open={isSourceDetailOpen}
          onOpenChange={setIsSourceDetailOpen}
          row={selectedSourceRow}
        />
      </div>
    </TooltipProvider>
  );
}
