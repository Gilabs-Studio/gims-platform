"use client";

import { useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { toast } from "sonner";
import { useDeleteSchedule } from "./use-schedules";
import type { Schedule } from "../types";

export function useScheduleList() {
  const t = useTranslations("crmSchedule");
  const tCommon = useTranslations("common");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Schedule | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 300);
  const deleteMutation = useDeleteSchedule();

  const canCreate = useUserPermission("crm_schedule.create");
  const canUpdate = useUserPermission("crm_schedule.update");
  const canDelete = useUserPermission("crm_schedule.delete");

  const handleCreate = () => {
    setEditingItem(null);
    setDialogOpen(true);
  };

  const handleEdit = (item: Schedule) => {
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
        dialogOpen,
        editingItem,
        deleteId,
      },
      actions: {
        setSearch,
        setPage,
        setPageSize,
        setStatusFilter,
        handleCreate,
        handleEdit,
        handleDialogClose,
        handleDelete,
        setDeleteId,
      },
      permissions: { canCreate, canUpdate, canDelete },
      translations: { t, tCommon },
    }),
    [
      search,
      debouncedSearch,
      page,
      pageSize,
      statusFilter,
      dialogOpen,
      editingItem,
      deleteId,
      canCreate,
      canUpdate,
      canDelete,
      t,
      tCommon,
      handleDelete,
    ]
  );
}
