"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Eye, FileText, MoreHorizontal, Pencil, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";

import type { JournalEntry } from "../types";
import {
  useDeleteFinanceJournal,
  useFinanceJournals,
  usePostFinanceJournal,
  useReverseFinanceJournal,
} from "../hooks/use-finance-journals";
import { JournalForm } from "./journal-form";
import { JournalDetailModal } from "./journal-detail-modal";
import { TrialBalanceDialog } from "./trial-balance-dialog";

function safeDate(value?: string | null): string {
  if (!value) return "-";
  return formatDate(value) || value;
}

function getStatusBadge(status: string, t: ReturnType<typeof useTranslations>) {
  const normalized = status?.toLowerCase() ?? "draft";
  switch (normalized) {
    case "posted":
    case "approved":
    case "confirmed":
    case "active":
    case "paid":
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

export function JournalsList() {
  const t = useTranslations("financeJournals");
  const tCommon = useTranslations("common");

  const canCreate = useUserPermission("journal.create");
  const canUpdate = useUserPermission("journal.update");
  const canDelete = useUserPermission("journal.delete");
  const canPost = useUserPermission("journal.post");
  const canReverse = useUserPermission("journal.reverse");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const now = new Date();
  const firstDayOfYear = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [viewOpen, setViewOpen] = useState(false);
  const [trialBalanceOpen, setTrialBalanceOpen] = useState(false);

  const [deletingItem, setDeletingItem] = useState<JournalEntry | null>(null);

  const { data, isLoading, isError } = useFinanceJournals({
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

  const deleteMutation = useDeleteFinanceJournal();
  const postMutation = usePostFinanceJournal();
  const reverseMutation = useReverseFinanceJournal();

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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => setTrialBalanceOpen(true)}
            >
              {t("actions.trialBalance")}
            </Button>
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
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-end gap-4">
        <div className="relative flex-1 max-w-sm">
          <Label className="mb-2 block">{t("search")}</Label>
          <Search className="absolute left-3 top-[34px] -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
        <div className="w-full sm:w-auto space-y-2">
          <Label>{t("fields.startDate")}</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="w-full sm:w-auto space-y-2">
          <Label>{t("fields.endDate")}</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex-1" />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("fields.entryDate")}</TableHead>
              <TableHead>{t("fields.description")}</TableHead>
              <TableHead>{t("fields.status")}</TableHead>
              <TableHead className="text-right">{t("fields.debit")}</TableHead>
              <TableHead className="text-right">{t("fields.credit")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  -
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="tabular-nums">{safeDate(item.entry_date)}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{item.description ?? "-"}</TableCell>
                  <TableCell>
                    {getStatusBadge(item.status, t)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{formatCurrency(item.debit_total)}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{formatCurrency(item.credit_total)}</TableCell>
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
                            setSelectedId(item.id);
                            setViewOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          {t("actions.view")}
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
                        {canPost && item.status === "draft" && (
                          <DropdownMenuItem
                            className="cursor-pointer text-success focus:text-success"
                            onClick={async () => {
                              try {
                                await postMutation.mutateAsync(item.id);
                                toast.success(t("toast.posted"));
                              } catch {
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
                        {canReverse && item.status === "posted" && (
                          <DropdownMenuItem
                            className="cursor-pointer text-warning focus:text-warning"
                            onClick={async () => {
                              try {
                                await reverseMutation.mutateAsync(item.id);
                                toast.success(t("toast.reversed"));
                              } catch {
                                toast.error(t("toast.failed"));
                              }
                            }}
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            {t("actions.reverse")}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
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

      <JournalForm open={formOpen} onOpenChange={setFormOpen} mode={formMode} id={selectedId} />

      <JournalDetailModal
        open={viewOpen}
        onOpenChange={(open) => {
          setViewOpen(open);
          if (!open) setSelectedId(null);
        }}
        id={selectedId}
      />

      <TrialBalanceDialog open={trialBalanceOpen} onOpenChange={setTrialBalanceOpen} />

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
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
