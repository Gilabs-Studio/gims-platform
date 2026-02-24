"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import {
  useUnitsOfMeasure,
  useDeleteUnitOfMeasure,
  useUpdateUnitOfMeasure,
} from "./use-units-of-measure";
import type { UnitOfMeasure } from "../types";

export function useUnitOfMeasureList() {
  const t = useTranslations("product.unitOfMeasure");
  const tCommon = useTranslations("product.common");

  // Permissions
  const canCreate = useUserPermission("uom.create");
  const canUpdate = useUserPermission("uom.update");
  const canDelete = useUserPermission("uom.delete");

  // State
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<UnitOfMeasure | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Queries & Mutations
  const { data, isLoading, isError, refetch } = useUnitsOfMeasure({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
  });

  const deleteMutation = useDeleteUnitOfMeasure();
  const updateMutation = useUpdateUnitOfMeasure();

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  // Handlers
  const handleCreate = () => {
    setEditingItem(null);
    setDialogOpen(true);
  };

  const handleEdit = (item: UnitOfMeasure) => {
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
      toast.error("Failed to delete UoM");
    }
  };

  const handleStatusChange = async (
    id: string,
    currentStatus: boolean,
    name: string,
  ) => {
    try {
      await updateMutation.mutateAsync({
        id,
        data: { is_active: !currentStatus },
      });
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
