"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  BookOpenText,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserPermission } from "@/hooks/use-user-permission";
import { useExportProgress } from "@/lib/use-export-progress";
import { useGeneralLedger } from "../hooks/use-general-ledger";
import { formatCurrency, formatDate as formatDateUtil } from "@/lib/utils";
import { toast } from "sonner";
import type { GeneralLedgerAccount, GLTransactionRow } from "../types";
import { ExportButton } from "@/features/finance/journals/components/export-button";
import { FilterToolbar } from "@/features/finance/journals/components/filter-toolbar";
import {
  canResolveJournalSourceDetail,
  JournalSourceDetailModal,
} from "@/features/finance/journals/components/journal-source-detail-modal";
import { AccountLedgerDetailDialog } from "./account-ledger-detail-dialog";

import { JournalDetailModal } from "@/features/finance/journals/components/journal-detail-modal";
import type { UnifiedJournalRow } from "@/features/finance/journals/components/journal-table";

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toApiDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function GeneralLedgerView() {
  const t = useTranslations("financeReports");
  const tCommon = useTranslations("common");
  const canExport = useUserPermission("general_ledger_report.export");
  const exportProgress = useExportProgress();

  const now = new Date();
  const [pickerRange, setPickerRange] = useState<DateRange | undefined>({
    from: new Date(now.getFullYear(), 0, 1),
    to: now,
  });
  const [companyID, setCompanyID] = useState<string>("");
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>("ALL");
  const [accountSearch, setAccountSearch] = useState<string>("");
  const [selectedAccountID, setSelectedAccountID] = useState<string | null>(
    null,
  );
  const [selectedJournalID, setSelectedJournalID] = useState<string | null>(
    null,
  );
  const [isJournalDetailOpen, setIsJournalDetailOpen] = useState(false);
  const [selectedSourceRow, setSelectedSourceRow] =
    useState<UnifiedJournalRow | null>(null);
  const [isSourceDetailOpen, setIsSourceDetailOpen] = useState(false);
  const [isAccountDetailOpen, setIsAccountDetailOpen] = useState(false);
  

  const dateRange = useMemo(
    () => ({
      start_date: pickerRange?.from
        ? toApiDate(pickerRange.from)
        : toApiDate(new Date(now.getFullYear(), 0, 1)),
      end_date: pickerRange?.to ? toApiDate(pickerRange.to) : toApiDate(now),
      company_id: companyID.trim() || undefined,
    }),
    [pickerRange, now, companyID],
  );

  const { data, isLoading, isError } = useGeneralLedger(dateRange);
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

  useEffect(() => {
    if (filteredAccounts.length === 0) {
      setSelectedAccountID(null);
      return;
    }

    const stillExists = filteredAccounts.some(
      (account) => account.account_id === selectedAccountID,
    );
    if (!stillExists) {
      setSelectedAccountID(filteredAccounts[0].account_id);
    }
  }, [filteredAccounts, selectedAccountID]);

  const selectedAccount = useMemo(() => {
    if (!selectedAccountID) return null;
    return (
      filteredAccounts.find(
        (account) => account.account_id === selectedAccountID,
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

  const metrics = [
    {
      label: t("total_debit"),
      value: formatCurrency(summary.totalDebit),
      Icon: TrendingUp,
      desc: "Total transaksi masuk pencatatan debit",
      valueClass: "",
    },
    {
      label: t("total_credit"),
      value: formatCurrency(summary.totalCredit),
      Icon: TrendingDown,
      desc: "Total transaksi keluar pencatatan kredit",
      valueClass: "",
    },
    {
      label: t("net_balance"),
      value: formatCurrency(summary.netBalance),
      Icon: Minus,
      desc: "Selisih debit & kredit",
      valueClass: summary.netBalance >= 0 ? "text-success" : "text-destructive",
    },
    {
      label: t("total_accounts"),
      value: summary.totalAccounts.toLocaleString(),
      Icon: BookOpenText,
      desc: "Jumlah akun yang terlibat",
      valueClass: "",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("gl_title")}</h1>
          <p className="text-muted-foreground">{t("gl_description")}</p>
        </div>
      </div>

      <FilterToolbar>
        <DateRangePicker
          dateRange={pickerRange}
          onDateChange={setPickerRange}
        />
        <Input
          value={accountSearch}
          onChange={(event) => setAccountSearch(event.target.value)}
          placeholder={t("account_filter_placeholder")}
          className="w-full sm:w-[280px]"
        />
        <Input
          value={companyID}
          onChange={(event) => setCompanyID(event.target.value)}
          placeholder={t("company_id_placeholder")}
          className="w-full sm:w-[280px]"
        />
        <Select value={accountTypeFilter} onValueChange={setAccountTypeFilter}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder={t("account_type")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("all_account_types")}</SelectItem>
            {accountTypes.map((accountType) => (
              <SelectItem key={accountType} value={accountType}>
                {accountType}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canExport ? (
          <ExportButton label={exportProgress.label(t("export"))} onClick={handleExport} disabled={exportProgress.isExporting} />
        ) : null}
      </FilterToolbar>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-80 w-full" />
        </div>
      ) : isError ? (
        <div className="text-center py-8 text-destructive">
          {tCommon("error")}
        </div>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map(({ label, value, Icon, desc, valueClass }, i) => (
              <Card
                key={label}
                className="flex flex-col justify-between shadow-sm p-5 space-y-4 rounded-xl"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-full text-primary">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {label}
                    </p>
                    <p
                      className={`text-2xl font-bold tracking-tight ${valueClass ?? ""}`}
                    >
                      {value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {filteredAccounts.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">{t("no_data")}</p>
            </div>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {t("account_summary")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("account_code")}</TableHead>
                        <TableHead>{t("account_name")}</TableHead>
                        <TableHead>{t("account_type")}</TableHead>
                        <TableHead className="text-right">
                          {t("opening_balance")}
                        </TableHead>
                        <TableHead className="text-right">
                          {t("debit")}
                        </TableHead>
                        <TableHead className="text-right">
                          {t("credit")}
                        </TableHead>
                        <TableHead className="text-right">
                          {t("closing_balance")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAccounts.map((account) => {
                        const isActive =
                          account.account_id === selectedAccountID;
                        return (
                          <TableRow
                            key={account.account_id}
                            className={`cursor-pointer ${isActive ? "bg-muted/60" : ""}`}
                            onClick={() => {
                              setSelectedAccountID(account.account_id);
                              setIsAccountDetailOpen(true);
                            }}
                          >
                            <TableCell className="font-mono text-xs">
                              {account.account_code}
                            </TableCell>
                            <TableCell className="text-sm">
                              {account.account_name}
                            </TableCell>
                            <TableCell className="text-xs">
                              {account.account_type}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {formatCurrency(account.opening_balance)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {formatCurrency(account.total_debit)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {formatCurrency(account.total_credit)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs font-semibold">
                              {formatCurrency(account.closing_balance)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

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
            </div>
          )}
        </>
      )}

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
  );
}
