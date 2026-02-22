"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import {
  useWarehouses,
  useDeleteWarehouse,
} from "./use-warehouses";
import type { Warehouse } from "../types";

export function useWarehouseList() {
  const t = useTranslations("warehouse");
  // tCommon alias for backward compatibility
  const tCommon = useTranslations("warehouse");

  // Permissions
  const canCreate = useUserPermission("warehouse.create");
  const canUpdate = useUserPermission("warehouse.update");
  const canDelete = useUserPermission("warehouse.delete");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Warehouse | null>(null);
  const [detailItem, setDetailItem] = useState<Warehouse | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useWarehouses({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
  });

  const deleteMutation = useDeleteWarehouse();

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const handleCreate = () => {
    setEditingItem(null);
    setDialogOpen(true);
  };

  const handleEdit = (item: Warehouse) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleViewDetail = (item: Warehouse) => {
    setDetailItem(item);
    setDetailOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success(t("warehouse.deleteSuccess"));
      setDeleteId(null);
    } catch {
      toast.error("Failed to delete warehouse");
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
      detailOpen,
      editingItem,
      detailItem,
      deleteId,
    },
    actions: {
      setSearch,
      setPage,
      setPageSize,
      setDetailOpen,
      setDeleteId,
      handleCreate,
      handleEdit,
      handleViewDetail,
      handleDelete,
      handleDialogClose,
    },
    data: {
      items,
      pagination,
      isLoading,
      isError,
      refetch,
      isDeleting: deleteMutation.isPending,
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
