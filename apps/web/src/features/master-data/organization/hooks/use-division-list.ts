"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { useDivisions, useDeleteDivision, useUpdateDivision } from "./use-divisions";
import type { Division } from "../types";

export function useDivisionList() {
  const t = useTranslations("organization");

  // Permissions
  const canCreate = useUserPermission("division.create");
  const canUpdate = useUserPermission("division.update");
  const canDelete = useUserPermission("division.delete");

  // State
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDivision, setEditingDivision] = useState<Division | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Queries & Mutations
  const { data, isLoading, isError, refetch } = useDivisions({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
  });

  const deleteDivision = useDeleteDivision();
  const updateDivision = useUpdateDivision();

  const divisions = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  // Handlers
  const handleCreate = () => {
    setEditingDivision(null);
    setIsFormOpen(true);
  };

  const handleEdit = (division: Division) => {
    setEditingDivision(division);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteDivision.mutateAsync(deletingId);
      setDeletingId(null);
    } catch {
      toast.error(t("common.error_delete"));
    }
  };

  const handleStatusChange = async (
    id: string,
    currentStatus: boolean,
    name: string,
  ) => {
    try {
      await updateDivision.mutateAsync({
        id,
        data: { is_active: !currentStatus },
      });
      toast.success(t("common.success_update", { name }));
    } catch {
      toast.error(t("common.error_update"));
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingDivision(null);
  };

  return {
    state: {
      search,
      page,
      pageSize,
      isFormOpen,
      editingDivision,
      deletingId,
    },
    actions: {
      setSearch,
      setPage,
      setPageSize,
      setDeletingId,
      handleCreate,
      handleEdit,
      handleDelete,
      handleStatusChange,
      handleFormClose,
    },
    data: {
      divisions,
      pagination,
      isLoading,
      isError,
      refetch,
      isDeleting: deleteDivision.isPending,
      isUpdating: updateDivision.isPending,
    },
    permissions: {
      canCreate,
      canUpdate,
      canDelete,
    },
    translations: {
      t,
    },
  };
}
