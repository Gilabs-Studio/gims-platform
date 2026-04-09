"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { DateRange } from "react-day-picker";
import {
  CheckCircle2,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { FilterToolbar } from "./filter-toolbar";
import { FinanceListErrorState } from "@/features/finance/shared/components/finance-list-error-state";

import type { JournalEntry } from "../types";
import {
  useFinanceAdjustmentJournals,
  useDeleteFinanceJournal,
  usePostFinanceAdjustmentJournal,
  useReverseFinanceAdjustmentJournal,
} from "../hooks/use-finance-journals";
import { JournalForm } from "./journal-form";
import { JournalDetailModal } from "./journal-detail-modal";
import { JournalTable, mapJournalToUnifiedRow } from "./journal-table";
import { canResolveJournalSourceDetail, JournalSourceDetailModal } from "./journal-source-detail-modal";
import type { UnifiedJournalRow } from "./journal-table";
import { getErrorMessage, parseApiError } from "../utils/error-parser";


export function AdjustmentJournalsList() {
  const t = useTranslations("financeJournals");
  const tCommon = useTranslations("common");

  const canCreate = useUserPermission("adjustment_journal.create");
  const canUpdate = useUserPermission("adjustment_journal.update");
  const canDelete = useUserPermission("journal.delete");
  const canPost = useUserPermission("adjustment_journal.post");
  const canReverse = useUserPermission("adjustment_journal.reverse");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const now = useMemo(() => new Date(), []);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(now.getFullYear(), 0, 1),
    to: now,
  });

  const startDate = dateRange?.from ? dateRange.from.toISOString().slice(0, 10) : undefined;
  const endDate = dateRange?.to ? dateRange.to.toISOString().slice(0, 10) : undefined;

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedReferenceRow, setSelectedReferenceRow] = useState<UnifiedJournalRow<JournalEntry> | null>(null);
  const [isReferenceModalOpen, setIsReferenceModalOpen] = useState(false);

  const [viewOpen, setViewOpen] = useState(false);

  const [deletingItem, setDeletingItem] = useState<JournalEntry | null>(null);

  const { data, isLoading, isError } = useFinanceAdjustmentJournals({
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
  const postMutation = usePostFinanceAdjustmentJournal();
  const reverseMutation = useReverseFinanceAdjustmentJournal();

  if (isError) {
    return <FinanceListErrorState message={tCommon("error")} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {t("adjustmentTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("adjustmentDescription")}
          </p>
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
        data={items.map(mapJournalToUnifiedRow)}
        rowStartNumber={((pagination?.page ?? page) - 1) * (pagination?.per_page ?? pageSize) + 1}
        canReferenceClick={(row) => canResolveJournalSourceDetail(row.referenceType)}
        onReferenceClick={(row) => {
          setSelectedReferenceRow(row);
          setIsReferenceModalOpen(true);
        }}
        actionRender={(row) => {
          const item = row.original;
          return (
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
                {canUpdate && item.status === "draft" && !item.is_system_generated && (
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
                      } catch (error: unknown) {
                        const parsedError = parseApiError(error);
                        toast.error(getErrorMessage(parsedError, (key) => t(key)));
                      }
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {t("actions.post")}
                  </DropdownMenuItem>
                )}
                {canDelete && item.status === "draft" && !item.is_system_generated && (
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
                      } catch (error: unknown) {
                        const parsedError = parseApiError(error);
                        toast.error(getErrorMessage(parsedError, (key) => t(key)));
                      }
                    }}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    {t("actions.reverse")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }}
      />

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

      <JournalForm
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        id={selectedId}
        isAdjustment={true}
      />

      <JournalDetailModal
        open={viewOpen}
        onOpenChange={(open) => {
          setViewOpen(open);
          if (!open) setSelectedId(null);
        }}
        id={selectedId}
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
