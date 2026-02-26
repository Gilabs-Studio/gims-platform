"use client";

import { useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { toast } from "sonner";
import { useDeleteTask } from "./use-tasks";
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

  const debouncedSearch = useDebounce(search, 300);
  const deleteMutation = useDeleteTask();

  const canCreate = useUserPermission("crm_task.create");
  const canUpdate = useUserPermission("crm_task.update");
  const canDelete = useUserPermission("crm_task.delete");
  const canAssign = useUserPermission("crm_task.assign");

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
      },
      permissions: { canCreate, canUpdate, canDelete, canAssign },
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
      handleDelete,
      canCreate,
      canUpdate,
      canDelete,
      canAssign,
      t,
      tCommon,
    ]
  );
}
