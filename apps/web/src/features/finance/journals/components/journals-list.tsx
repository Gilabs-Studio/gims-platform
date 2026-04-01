"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Eye, FileText, MoreHorizontal, Pencil, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { FinanceListErrorState } from "@/features/finance/shared/components/finance-list-error-state";

import type { JournalEntry } from "../types";
import {
  useDeleteFinanceJournal,
  useFinanceJournals,
  usePostFinanceJournal,
  useReverseFinanceJournal,
} from "../hooks/use-finance-journals";
import { JournalForm } from "./journal-form";
import { JournalDetailModal } from "./journal-detail-modal";
import { canResolveJournalSourceDetail, JournalSourceDetailModal } from "./journal-source-detail-modal";
import { TrialBalanceDialog } from "./trial-balance-dialog";
import { JournalTable, mapJournalToUnifiedRow } from "./journal-table";
import type { UnifiedJournalRow } from "./journal-table";
import { JournalActionMenu } from "./journal-action-menu";

function toApiDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getInitialOpenJournalFromURL(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get("open_journal");
}

export function JournalsList() {
  const t = useTranslations("financeJournals");
  const tCommon = useTranslations("common");

  const canCreate = useUserPermission("journal.create");
  const canUpdate = useUserPermission("journal.update");
  const canDelete = useUserPermission("journal.delete");
  const canPost = useUserPermission("journal.post");
  const canReverse = useUserPermission("journal.reverse");
  const canViewTrialBalance = useUserPermission("trial_balance_report.read");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const now = new Date();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(now.getFullYear(), 0, 1),
    to: now,
  });

  const startDate = useMemo(() => (dateRange?.from ? toApiDate(dateRange.from) : undefined), [dateRange?.from]);
  const endDate = useMemo(() => (dateRange?.to ? toApiDate(dateRange.to) : undefined), [dateRange?.to]);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedId, setSelectedId] = useState<string | null>(getInitialOpenJournalFromURL);
  const [selectedReferenceRow, setSelectedReferenceRow] = useState<UnifiedJournalRow<JournalEntry> | null>(null);
  const [isReferenceModalOpen, setIsReferenceModalOpen] = useState(false);

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

  useEffect(() => {
    if (selectedId) {
      setViewOpen(true);
    }
  }, [selectedId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const searchParams = new URLSearchParams(window.location.search);
    if (!searchParams.get("open_journal")) return;

    searchParams.delete("open_journal");
    const nextQuery = searchParams.toString();
    const nextURL = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
    window.history.replaceState(null, "", nextURL);
  }, []);

  if (isError) {
    return <FinanceListErrorState message={tCommon("error")} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>

        {(canCreate || canViewTrialBalance) && (
          <div className="flex items-center gap-2">
            {canViewTrialBalance && (
              <Button
                variant="outline"
                className="cursor-pointer"
                onClick={() => setTrialBalanceOpen(true)}
              >
                {t("actions.trialBalance")}
              </Button>
            )}
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
          <Label>{t("fields.dateRange")}</Label>
          <DateRangePicker
            dateRange={dateRange}
            onDateChange={(range) => {
              setDateRange(range);
              setPage(1);
            }}
          />
        </div>
        <div className="flex-1" />
      </div>

      <JournalTable
        isLoading={isLoading}
        data={items.map(mapJournalToUnifiedRow)}
        rowStartNumber={((pagination?.page ?? page) - 1) * (pagination?.per_page ?? pageSize) + 1}
        canReferenceClick={(row) => canResolveJournalSourceDetail(row.referenceType)}
        onReferenceClick={(row) => {
          setSelectedReferenceRow(row);
          setIsReferenceModalOpen(true);
        }}
        actionRender={(row) => (
          <JournalActionMenu
            row={row}
            onView={(id: string) => {
              setSelectedId(id);
              setViewOpen(true);
            }}
            onEdit={(id: string) => {
              setFormMode("edit");
              setSelectedId(id);
              setFormOpen(true);
            }}
            onDelete={(id: string) => {
              const item = row.original as JournalEntry;
              setDeletingItem(item);
            }}
            onSourceDetail={(r: UnifiedJournalRow<any>) => {
              setSelectedReferenceRow(r as any);
              setIsReferenceModalOpen(true);
            }}
          />
        )}
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

      <JournalForm open={formOpen} onOpenChange={setFormOpen} mode={formMode} id={selectedId} />

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
