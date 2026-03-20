"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  FileText,
  LayoutGrid,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  XCircle,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";

import type { Budget } from "../types";
import { useApproveFinanceBudget, useDeleteFinanceBudget, useFinanceBudget, useFinanceBudgets } from "../hooks/use-finance-budget";
import { BudgetForm } from "./budget-form";
import { BudgetOverview } from "./budget-overview";
import { BudgetDetailModal } from "./budget-detail-modal";

function safeDate(value?: string | null): string {
  if (!value) return "-";
  return formatDate(value) || value;
}

function getStatusBadge(status: string, t: ReturnType<typeof useTranslations>) {
  const normalized = status?.toLowerCase() ?? "draft";
  switch (normalized) {
    case "approved":
    case "active":
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
    case "rejected":
    case "cancelled":
      return (
        <Badge variant="destructive" className="text-xs font-medium">
          <XCircle className="h-3 w-3 mr-1" />
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

function InlineUtilBar({ planned, used }: { planned: number; used: number }) {
  const percent = planned > 0 ? Math.min(100, (used / planned) * 100) : 0;
  const colorClass =
    percent >= 90 ? "bg-destructive" : percent >= 70 ? "bg-warning" : percent >= 50 ? "bg-secondary" : "bg-success";

  return (
    <div className="min-w-20 space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-mono tabular-nums">{formatCurrency(used)}</span>
        <span className="text-muted-foreground">{Math.round(percent)}%</span>
      </div>
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function BudgetsList() {
  const t = useTranslations("financeBudget");
  const tCommon = useTranslations("common");

  const canCreate = useUserPermission("budget.create");
  const canUpdate = useUserPermission("budget.update");
  const canDelete = useUserPermission("budget.delete");
  const canApprove = useUserPermission("budget.approve");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [view, setView] = useState<"card" | "list">("card");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] = useState<Budget | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data, isLoading, isError } = useFinanceBudgets({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    sort_by: "start_date",
    sort_dir: "desc",
  });

  // For overview, fetch all (up to 100) for the cards
  const { data: overviewData, isLoading: isOverviewLoading } = useFinanceBudgets({
    per_page: 100,
    sort_by: "start_date",
    sort_dir: "desc",
  });

  const { data: detailData, isLoading: isDetailLoading } = useFinanceBudget(detailId ?? "", {
    enabled: detailOpen && !!detailId,
  });

  const items = data?.data ?? [];
  const overviewBudgets = overviewData?.data ?? [];
  const pagination = data?.meta?.pagination;

  const deleteMutation = useDeleteFinanceBudget();
  const approveMutation = useApproveFinanceBudget();

  const handleOpenDetail = (id: string) => {
    setDetailId(id);
    setDetailOpen(true);
  };

  if (isError) {
    return <div className="text-center py-8 text-destructive">{tCommon("error")}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
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

      <Tabs value={view} onValueChange={(v) => setView(v as "card" | "list")}> 
        <TabsList>
          <TabsTrigger value="card">
            <LayoutGrid className="h-4 w-4" />
            {t("views.card")}
          </TabsTrigger>
          <TabsTrigger value="list">
            <List className="h-4 w-4" />
            {t("views.list")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="card">
          <BudgetOverview
            budgets={overviewBudgets}
            isLoading={isOverviewLoading}
            onBudgetClick={(b) => handleOpenDetail(b.id)}
          />
        </TabsContent>

        <TabsContent value="list">
          <div className="space-y-4">
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
                    <TableHead>{t("fields.name")}</TableHead>
                    <TableHead>{t("fields.period")}</TableHead>
                    <TableHead>{t("fields.status")}</TableHead>
                    <TableHead className="text-right">{t("fields.totalAmount")}</TableHead>
                    <TableHead>{t("fields.usedAmount")}</TableHead>
                    <TableHead className="text-right">{t("fields.remainingAmount")}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={7}>
                          <Skeleton className="h-10 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        <p className="text-sm">{t("empty")}</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => {
                      const planned = item.total_amount ?? 0;
                      const used = item.used_amount ?? 0;
                      const remaining = Math.max(0, planned - used);

                      return (
                        <TableRow
                          key={item.id}
                          className="cursor-pointer hover:bg-muted/40 transition-colors"
                          onClick={() => handleOpenDetail(item.id)}
                        >
                          <TableCell className="font-medium">
                            <div>
                              <p>{item.name ?? "-"}</p>
                              {item.department && (
                                <p className="text-xs text-muted-foreground">{item.department}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="tabular-nums text-sm">
                            {safeDate(item.start_date)} – {safeDate(item.end_date)}
                          </TableCell>
                          <TableCell>{getStatusBadge(item.status, t)}</TableCell>
                          <TableCell className="text-right font-mono tabular-nums">{formatCurrency(planned)}</TableCell>
                          <TableCell><InlineUtilBar planned={planned} used={used} /></TableCell>
                          <TableCell className="text-right font-mono tabular-nums">{formatCurrency(remaining)}</TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="cursor-pointer">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  className="cursor-pointer"
                                  onClick={() => handleOpenDetail(item.id)}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  {t("actions.viewDetail")}
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
                                {canApprove && item.status === "draft" && (
                                  <DropdownMenuItem
                                    className="cursor-pointer text-success focus:text-success"
                                    onClick={async () => {
                                      try {
                                        await approveMutation.mutateAsync(item.id);
                                        toast.success(t("toast.approved"));
                                      } catch {
                                        toast.error(t("toast.failed"));
                                      }
                                    }}
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    {t("actions.approve")}
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
          </div>
        </TabsContent>
      </Tabs>

      <BudgetForm open={formOpen} onOpenChange={setFormOpen} mode={formMode} id={selectedId} />

      <BudgetDetailModal
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setDetailId(null);
        }}
        budget={detailData?.data ?? null}
        isLoading={isDetailLoading}
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
