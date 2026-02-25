"use client";

import {
  MoreHorizontal,
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  Filter,
  CheckCircle2,
  PlayCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskFormDialog } from "./task-form-dialog";
import { TaskDetailDialog } from "./task-detail-dialog";
import { useTaskList } from "../hooks/use-task-list";
import { useTasks, useCompleteTask, useMarkTaskInProgress } from "../hooks/use-tasks";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import type { Task } from "../types";

const STATUS_VARIANT_MAP: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "outline",
  in_progress: "secondary",
  completed: "default",
  cancelled: "destructive",
};

const PRIORITY_VARIANT_MAP: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  low: "outline",
  medium: "secondary",
  high: "default",
  urgent: "destructive",
};

export function TaskList() {
  const { state, actions, permissions, translations } = useTaskList();
  const { t, tCommon } = translations;

  const { data: tasksRes, isLoading, isError, refetch } = useTasks({
    page: state.page,
    per_page: state.pageSize,
    search: state.debouncedSearch,
    status: state.statusFilter || undefined,
    priority: state.priorityFilter || undefined,
  });

  const completeMutation = useCompleteTask();
  const inProgressMutation = useMarkTaskInProgress();

  const items = tasksRes?.data ?? [];
  const pagination = tasksRes?.meta?.pagination;

  const handleComplete = async (id: string) => {
    try {
      await completeMutation.mutateAsync(id);
      toast.success(t("completed"));
    } catch {
      toast.error(tCommon("error"));
    }
  };

  const handleInProgress = async (id: string) => {
    try {
      await inProgressMutation.mutateAsync(id);
      toast.success(t("inProgress"));
    } catch {
      toast.error(tCommon("error"));
    }
  };

  if (isError) {
    return (
      <div className="p-4 text-center text-destructive">
        {tCommon("noData")}
        <Button variant="outline" onClick={() => refetch()} className="mt-4 ml-2 cursor-pointer">
          {tCommon("retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
        </div>
        {permissions.canCreate && (
          <Button onClick={actions.handleCreate} className="cursor-pointer">
            <Plus className="mr-2 h-4 w-4" />
            {t("addTask")}
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={state.search}
            onChange={(e) => {
              actions.setSearch(e.target.value);
              actions.setPage(1);
            }}
            className="pl-8"
          />
        </div>
        <Select
          value={state.statusFilter || "all"}
          onValueChange={(value) => {
            actions.setStatusFilter(value === "all" ? "" : value);
            actions.setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px] cursor-pointer">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder={t("allStatuses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="cursor-pointer">{t("allStatuses")}</SelectItem>
            {(["pending", "in_progress", "completed", "cancelled"] as const).map((s) => (
              <SelectItem key={s} value={s} className="cursor-pointer">
                {t(`statuses.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={state.priorityFilter || "all"}
          onValueChange={(value) => {
            actions.setPriorityFilter(value === "all" ? "" : value);
            actions.setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px] cursor-pointer">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder={t("allPriorities")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="cursor-pointer">{t("allPriorities")}</SelectItem>
            {(["low", "medium", "high", "urgent"] as const).map((p) => (
              <SelectItem key={p} value={p} className="cursor-pointer">
                {t(`priorities.${p}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.title")}</TableHead>
              <TableHead>{t("table.type")}</TableHead>
              <TableHead>{t("table.status")}</TableHead>
              <TableHead>{t("table.priority")}</TableHead>
              <TableHead>{t("table.dueDate")}</TableHead>
              <TableHead>{t("table.assignedTo")}</TableHead>
              <TableHead>{t("table.createdAt")}</TableHead>
              {(permissions.canUpdate || permissions.canDelete) && (
                <TableHead className="w-[100px]">{tCommon("actions")}</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  {(permissions.canUpdate || permissions.canDelete) && (
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  )}
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={(permissions.canUpdate || permissions.canDelete) ? 8 : 7}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("emptyState")}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item: Task) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => actions.setDetailItem(item)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {item.title}
                      {item.is_overdue && (
                        <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{t(`types.${item.type}` as Parameters<typeof t>[0])}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT_MAP[item.status] ?? "outline"}>
                      {t(`statuses.${item.status}` as Parameters<typeof t>[0])}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={PRIORITY_VARIANT_MAP[item.priority] ?? "outline"}>
                      {t(`priorities.${item.priority}` as Parameters<typeof t>[0])}
                    </Badge>
                  </TableCell>
                  <TableCell className={`text-sm ${item.is_overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                    {item.due_date ? formatDate(item.due_date) : "-"}
                  </TableCell>
                  <TableCell>{item.assigned_to_employee?.name ?? "-"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(item.created_at)}
                  </TableCell>
                  {(permissions.canUpdate || permissions.canDelete) && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="cursor-pointer">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => actions.setDetailItem(item)}
                            className="cursor-pointer"
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            {t("detailTitle")}
                          </DropdownMenuItem>
                          {permissions.canUpdate && item.status !== "completed" && (
                            <DropdownMenuItem onClick={() => actions.handleEdit(item)} className="cursor-pointer">
                              <Pencil className="mr-2 h-4 w-4" />
                              {tCommon("edit")}
                            </DropdownMenuItem>
                          )}
                          {permissions.canUpdate && item.status === "pending" && (
                            <DropdownMenuItem onClick={() => handleInProgress(item.id)} className="cursor-pointer">
                              <PlayCircle className="mr-2 h-4 w-4" />
                              {t("actions.inProgress")}
                            </DropdownMenuItem>
                          )}
                          {permissions.canUpdate && item.status !== "completed" && item.status !== "cancelled" && (
                            <DropdownMenuItem onClick={() => handleComplete(item.id)} className="cursor-pointer">
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              {t("actions.complete")}
                            </DropdownMenuItem>
                          )}
                          {permissions.canDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => actions.setDeleteId(item.id)}
                                className="cursor-pointer text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {tCommon("delete")}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && (
        <DataTablePagination
          pageIndex={pagination.page}
          pageSize={pagination.per_page}
          rowCount={pagination.total}
          onPageChange={actions.setPage}
          onPageSizeChange={(newSize) => {
            actions.setPageSize(newSize);
            actions.setPage(1);
          }}
        />
      )}

      {/* Dialogs */}
      {(permissions.canCreate || permissions.canUpdate) && (
        <TaskFormDialog
          open={state.dialogOpen}
          onClose={actions.handleDialogClose}
          task={state.editingItem}
        />
      )}

      {permissions.canDelete && (
        <DeleteDialog
          open={!!state.deleteId}
          onOpenChange={(open) => !open && actions.setDeleteId(null)}
          onConfirm={actions.handleDelete}
          itemName="task"
          isLoading={false}
        />
      )}

      {/* Detail Dialog */}
      <TaskDetailDialog
        open={!!state.detailItem}
        onClose={() => actions.setDetailItem(null)}
        task={state.detailItem}
      />
    </div>
  );
}
