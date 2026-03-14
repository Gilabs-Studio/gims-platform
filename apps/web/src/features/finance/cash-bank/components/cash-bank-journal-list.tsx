"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AxiosError } from "axios";
import { CheckCircle2, FileText, ListOrdered, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { CashBankJournalDetailDialog } from "./cash-bank-journal-detail-dialog";

import type { CashBankJournal } from "../types";
import {
  useDeleteFinanceCashBankJournal,
  useFinanceCashBankFormData,
  useFinanceCashBankJournals,
  usePostFinanceCashBankJournal,
} from "../hooks/use-finance-cash-bank";
import { CashBankJournalForm } from "./cash-bank-journal-form";

type ApiErrorResponse = {
  error?: {
    message?: string;
  };
};

function extractApiErrorMessage(error: unknown): string | null {
  if (error instanceof AxiosError) {
    return (error.response?.data as ApiErrorResponse | undefined)?.error?.message ?? null;
  }
  return null;
}

function safeDate(value?: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function getStatusBadge(status: string, t: ReturnType<typeof useTranslations>) {
  const normalized = status?.toLowerCase() ?? "draft";
  switch (normalized) {
    case "posted":
    case "approved":
    case "confirmed":
      return (
        <Badge variant="success" className="text-xs font-medium">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {t(`status.${status}`)}
        </Badge>
      );
    case "draft":
      return (
        <Badge variant="secondary" className="text-xs font-medium">
          <FileText className="h-3 w-3 mr-1" />
          {t(`status.${status}`)}
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-xs font-medium">
          {t(`status.${status}`)}
        </Badge>
      );
  }
}

export function CashBankJournalList() {
  const t = useTranslations("financeCashBank");
  const tCommon = useTranslations("common");

  const canCreate = useUserPermission("cash_bank.create");
  const canUpdate = useUserPermission("cash_bank.update");
  const canDelete = useUserPermission("cash_bank.delete");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] = useState<CashBankJournal | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data, isLoading, isError } = useFinanceCashBankJournals({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    sort_by: "transaction_date",
    sort_dir: "desc",
  });

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const formDataQuery = useFinanceCashBankFormData();
  const bankAccounts = formDataQuery.data?.data?.bank_accounts ?? [];

  const deleteMutation = useDeleteFinanceCashBankJournal();
  const postMutation = usePostFinanceCashBankJournal();

  if (isError) {
    return <div className="text-center py-8 text-destructive">{tCommon("error")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>

        {canCreate && (
          <Button
            onClick={() => {
              setFormMode("create");
              setSelectedId(null);
              setFormOpen(true);
            }}
            className="cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("actions.create")}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
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
        <div className="flex-1" />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("fields.journalNumber")}</TableHead>
              <TableHead>{t("fields.transactionDate")}</TableHead>
              <TableHead>{t("fields.bankAccount")}</TableHead>
              <TableHead>{t("fields.description")}</TableHead>
              <TableHead>{t("fields.type")}</TableHead>
              <TableHead>{t("fields.status")}</TableHead>
              <TableHead className="text-right">{t("fields.lineCount")}</TableHead>
              <TableHead className="text-right">{t("fields.totalAmount")}</TableHead>
              <TableHead>{t("fields.postedAt")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={10}>
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  -
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const bankOption = bankAccounts.find((bank) => bank.id === item.bank_account_id);
                const bankName = item.bank_account?.name ?? bankOption?.account_name ?? "-";
                const bankNumber = item.bank_account?.account_number ?? bankOption?.account_number;

                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.id.slice(0, 8).toUpperCase()}</TableCell>
                    <TableCell className="tabular-nums">{safeDate(item.transaction_date)}</TableCell>
                    <TableCell>
                      {bankName}
                      {bankNumber ? <div className="text-xs text-muted-foreground">{bankNumber}</div> : null}
                    </TableCell>
                    <TableCell className="max-w-[260px] truncate" title={item.description ?? ""}>
                      {item.description || "-"}
                    </TableCell>
                    <TableCell>{t(`type.${item.type}`)}</TableCell>
                    <TableCell>{getStatusBadge(item.status, t)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {typeof item.lines === "undefined" ? "-" : item.lines.length}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatCurrency(item.total_amount)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{safeDate(item.posted_at)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="cursor-pointer">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => {
                              setDetailId(item.id);
                              setDetailOpen(true);
                            }}
                          >
                            <ListOrdered className="h-4 w-4 mr-2" />
                            {t("actions.detail")}
                          </DropdownMenuItem>

                          {canUpdate && item.status === "draft" && (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => {
                                setFormMode("edit");
                                setSelectedId(item.id);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              {t("actions.edit")}
                            </DropdownMenuItem>
                          )}
                          {canUpdate && item.status === "draft" && (
                            <DropdownMenuItem
                              className="cursor-pointer text-green-600 focus:text-green-600"
                              onClick={async () => {
                                if (formDataQuery.isSuccess) {
                                  const selectedBank = bankAccounts.find((bank) => bank.id === item.bank_account_id);
                                  if (selectedBank && !selectedBank.coa_id) {
                                    toast.error(t("toast.bankAccountNotLinked"));
                                    return;
                                  }
                                }

                                try {
                                  await postMutation.mutateAsync(item.id);
                                  toast.success(t("toast.posted"));
                                } catch (error: unknown) {
                                  const apiErrorMessage = extractApiErrorMessage(error);
                                  if (apiErrorMessage?.includes("bank account is not linked to chart_of_account_id")) {
                                    toast.error(t("toast.bankAccountNotLinked"));
                                    return;
                                  }
                                  toast.error(t("toast.failed"));
                                }
                              }}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              {t("actions.post")}
                            </DropdownMenuItem>
                          )}
                          {canDelete && item.status === "draft" && (
                            <DropdownMenuItem
                              className="cursor-pointer text-destructive focus:text-destructive"
                              onClick={() => setDeletingItem(item)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t("actions.delete")}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination
        pageIndex={pagination?.page ?? page}
        pageSize={pagination?.per_page ?? pageSize}
        rowCount={pagination?.total ?? items.length}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
      />

      <CashBankJournalForm open={formOpen} onOpenChange={setFormOpen} mode={formMode} id={selectedId} />

      <CashBankJournalDetailDialog
        key={`cash-bank-journal-detail-${detailId}-${detailOpen}`}
        open={detailOpen}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
          setDetailOpen(open);
        }}
        id={detailId}
      />

      <DeleteDialog
        open={!!deletingItem}
        onOpenChange={(open) => {
          if (!open) setDeletingItem(null);
        }}
        title={t("actions.delete")}
        description=""
        onConfirm={async () => {
          const id = deletingItem?.id ?? "";
          if (!id) return;
          try {
            await deleteMutation.mutateAsync(id);
            toast.success(t("toast.deleted"));
            setDeletingItem(null);
          } catch {
            toast.error(t("toast.failed"));
          }
        }}
      />
    </div>
  );
}
