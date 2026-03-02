"use client";

import { useState } from "react";
import { isAxiosError } from "axios";
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

  // Set when BE rejects delete with WAREHOUSE_HAS_STOCK (422)
  const [blockedDeleteId, setBlockedDeleteId] = useState<string | null>(null);

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
    // Capture immediately so the value is stable even after async state changes
    const idToDelete = deleteId;
    if (!idToDelete) return;
    try {
      await deleteMutation.mutateAsync(idToDelete);
      toast.success(t("warehouse.deleteSuccess"));
      setDeleteId(null);
    } catch (error: unknown) {
      // BE returns 422 WAREHOUSE_HAS_STOCK when inventory still exists
      const code = isAxiosError(error)
        ? error.response?.data?.error?.code
        : undefined;
      if (code === "WAREHOUSE_HAS_STOCK") {
        setDeleteId(null);
        setBlockedDeleteId(idToDelete);
      } else {
        toast.error(t("warehouse.deleteError"));
      }
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
      blockedDeleteId,
    },
    actions: {
      setSearch,
      setPage,
      setPageSize,
      setDetailOpen,
      setDeleteId,
      setBlockedDeleteId,
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
