"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { useLeaveTypes, useDeleteLeaveType, useUpdateLeaveType } from "./use-leave-type";
import { useUserPermission } from "@/hooks/use-user-permission";
import type { LeaveType } from "../types";

export function useLeaveTypeList() {
  const t = useTranslations("leaveType");
  const tCommon = useTranslations("common");
  
  // Permissions
  const canCreate = useUserPermission("leave_type.create");
  const canUpdate = useUserPermission("leave_type.update");
  const canDelete = useUserPermission("leave_type.delete");

  // State
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LeaveType | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Queries & Mutations
  const { data, isLoading, isError, refetch } = useLeaveTypes({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
  });
  const deleteMutation = useDeleteLeaveType();
  const updateMutation = useUpdateLeaveType();

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  // Handlers
  const handleCreate = () => {
    setEditingItem(null);
    setDialogOpen(true);
  };

  const handleEdit = (item: LeaveType) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success(t("deleted"));
      setDeleteId(null);
    } catch {
      toast.error(tCommon("error"));
    }
  };

  const handleStatusChange = async (id: string, currentStatus: boolean, name: string) => {
    try {
      await updateMutation.mutateAsync({ id, data: { is_active: !currentStatus } });
      toast.success(name + " status updated");
    } catch {
      toast.error(tCommon("error"));
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingItem(null);
  };

  return {
    state: {
      search,
      page,
      pageSize,
      dialogOpen,
      editingItem,
      deleteId,
    },
    actions: {
      setSearch,
      setPage,
      setPageSize,
      setDeleteId,
      handleCreate,
      handleEdit,
      handleDelete,
      handleStatusChange,
      handleDialogClose,
    },
    data: {
      items,
      pagination,
      isLoading,
      isError,
      refetch,
      isDeleting: deleteMutation.isPending,
      isUpdating: updateMutation.isPending,
    },
    permissions: {
      canCreate,
      canUpdate,
      canDelete,
    },
    translations: {
      t,
      tCommon,
    },
  };
}
