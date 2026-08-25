"use client";
import { FINANCE_PERMISSIONS } from "@/features/finance/permissions";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Search } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
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
  const initialOpenJournalId = getInitialOpenJournalFromURL();

  const canCreate = useUserPermission(FINANCE_PERMISSIONS.JOURNAL.CREATE);
  const canViewTrialBalance = useUserPermission(FINANCE_PERMISSIONS.REPORT.TRIAL_BALANCE_READ);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const now = new Date();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(now.getFullYear(), 0, 1),
    to: now,
  });

  const startDate = dateRange?.from ? toApiDate(dateRange.from) : undefined;
  const endDate = dateRange?.to ? toApiDate(dateRange.to) : undefined;

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [selectedViewId, setSelectedViewId] = useState<string | null>(initialOpenJournalId);
  const [selectedReferenceRow, setSelectedReferenceRow] = useState<UnifiedJournalRow | null>(null);
  const [isReferenceModalOpen, setIsReferenceModalOpen] = useState(false);

  const [viewOpen, setViewOpen] = useState<boolean>(!!initialOpenJournalId);
  const [trialBalanceOpen, setTrialBalanceOpen] = useState(false);

  const [deletingItem, setDeletingItem] = useState<JournalEntry | null>(null);

  // include company_id from URL if present to scope results
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const companyIdFromURL = searchParams ? searchParams.get("company_id") ?? undefined : undefined;

  const { data, isLoading, isError } = useFinanceJournals({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    status: statusFilter === "all" ? undefined : (statusFilter as JournalEntry["status"]),
    journal_type: typeFilter === "all" ? undefined : typeFilter,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
    company_id: companyIdFromURL,
    sort_by: "entry_date",
    sort_dir: "desc",
  });

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const deleteMutation = useDeleteFinanceJournal();

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
                  setViewOpen(false);
                  setFormMode("create");
                  setSelectedFormId(null);
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
        <div className="w-full sm:flex-1 max-w-sm space-y-2">
          <Label>{t("search")}</Label>
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
        <div className="w-full sm:w-48 space-y-2">
          <Label>{t("fields.status")}</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" className="w-full justify-between cursor-pointer">
                {statusFilter === "all" ? "All" : t(`status.${statusFilter}`)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48">
              <DropdownMenuItem className="cursor-pointer" onClick={() => { setStatusFilter("all"); setPage(1); }}>
                All
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => { setStatusFilter("draft"); setPage(1); }}>
                {t("status.draft")}
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => { setStatusFilter("posted"); setPage(1); }}>
                {t("status.posted")}
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => { setStatusFilter("cancelled"); setPage(1); }}>
                {t("status.cancelled")}
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => { setStatusFilter("reversed"); setPage(1); }}>
                {t("status.reversed")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="w-full sm:w-56 space-y-2">
          <Label>{t("fields.journalType")}</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" className="w-full justify-between cursor-pointer">
                {typeFilter === "all" ? "All" : typeFilter.replaceAll("_", " ")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuItem className="cursor-pointer" onClick={() => { setTypeFilter("all"); setPage(1); }}>
                All
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => { setTypeFilter("GENERAL"); setPage(1); }}>
                GENERAL
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => { setTypeFilter("ADJUSTMENT"); setPage(1); }}>
                ADJUSTMENT
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
              setFormOpen(false);
              setSelectedViewId(id);
              setViewOpen(true);
            }}
            onEdit={(id: string) => {
              setViewOpen(false);
              setSelectedViewId(null);
              setFormMode("edit");
              setSelectedFormId(id);
              setFormOpen(true);
            }}
            onDelete={() => {
              const item = row.original as JournalEntry;
              setDeletingItem(item);
            }}
            onSourceDetail={(r) => {
              setSelectedReferenceRow(r);
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

      <JournalForm open={formOpen} onOpenChange={setFormOpen} mode={formMode} id={selectedFormId} />

      <JournalDetailModal
        open={viewOpen}
        onOpenChange={(open) => {
          setViewOpen(open);
          if (!open) setSelectedViewId(null);
        }}
        id={selectedViewId}
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
