"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import {
  useCancelTask,
  useCompleteTask,
  useDeleteTask,
  useMarkTaskInProgress,
  useTasks,
} from "./use-tasks";
import type { Task } from "../types";

export function useTaskList() {
  const t = useTranslations("crmTask");
  const tCommon = useTranslations("common");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Task | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "calendar">("calendar");

  const debouncedSearch = useDebounce(search, 300);
  const deleteMutation = useDeleteTask();
  const completeMutation = useCompleteTask();
  const inProgressMutation = useMarkTaskInProgress();
  const cancelMutation = useCancelTask();

  const { data, isLoading, isError, refetch } = useTasks({
    page,
    per_page: pageSize,
    search: debouncedSearch,
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
  });

  const canCreate = useUserPermission("crm_task.create");
  const canUpdate = useUserPermission("crm_task.update");
  const canDelete = useUserPermission("crm_task.delete");
  const canAssign = useUserPermission("crm_task.assign");
  const canViewLead = useUserPermission("crm_lead.read");
  const canViewDeal = useUserPermission("crm_deal.read");
  const canViewCustomer = useUserPermission("customer.read");

  const items = useMemo(() => data?.data ?? [], [data?.data]);
  const pagination = data?.meta?.pagination;

  const handleCreate = () => {
    setEditingItem(null);
    setDialogOpen(true);
  };

  const handleEdit = (item: Task) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingItem(null);
  };

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success(t("deleted"));
      setDeleteId(null);
    } catch {
      toast.error(tCommon("error"));
    }
  }, [deleteId, deleteMutation, t, tCommon]);

  const handleComplete = useCallback(
    async (id: string) => {
      try {
        await completeMutation.mutateAsync(id);
        toast.success(t("completed"));
      } catch {
        toast.error(tCommon("error"));
      }
    },
    [completeMutation, t, tCommon],
  );

  const handleInProgress = useCallback(
    async (id: string) => {
      try {
        await inProgressMutation.mutateAsync(id);
        toast.success(t("inProgress"));
      } catch {
        toast.error(tCommon("error"));
      }
    },
    [inProgressMutation, t, tCommon],
  );

  const handleCancel = useCallback(
    async (id: string) => {
      try {
        await cancelMutation.mutateAsync(id);
        toast.success(t("cancelled"));
      } catch {
        toast.error(tCommon("error"));
      }
    },
    [cancelMutation, t, tCommon],
  );

  return useMemo(
    () => ({
      state: {
        search,
        debouncedSearch,
        page,
        pageSize,
        statusFilter,
        priorityFilter,
        dialogOpen,
        editingItem,
        deleteId,
        detailItem,
        viewMode,
      },
      actions: {
        setSearch,
        setPage,
        setPageSize,
        setStatusFilter,
        setPriorityFilter,
        handleCreate,
        handleEdit,
        handleDialogClose,
        handleDelete,
        setDeleteId,
        setDetailItem,
        setViewMode,
        handleComplete,
        handleInProgress,
        handleCancel,
      },
      permissions: { canCreate, canUpdate, canDelete, canAssign },
      data: {
        items,
        pagination,
        isLoading,
        isError,
        refetch,
        canViewLead,
        canViewDeal,
        canViewCustomer,
      },
      translations: { t, tCommon },
    }),
    [
      search,
      debouncedSearch,
      page,
      pageSize,
      statusFilter,
      priorityFilter,
      dialogOpen,
      editingItem,
      deleteId,
      detailItem,
      viewMode,
      items,
      pagination,
      isLoading,
      isError,
      refetch,
      canCreate,
      canUpdate,
      canDelete,
      canAssign,
      canViewLead,
      canViewDeal,
      canViewCustomer,
      handleDelete,
      handleComplete,
      handleInProgress,
      handleCancel,
      t,
      tCommon,
    ],
  );
}
