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

  const handleDelete = () => {
    if (!deleteId) return;
    const idToDelete = deleteId;
    // Close the confirm dialog immediately before mutation settles
    setDeleteId(null);
    deleteMutation.mutate(idToDelete, {
      onSuccess: () => {
        toast.success(t("deleteSuccess"));
      },
      onError: (error: unknown) => {
        // BE returns 422 WAREHOUSE_HAS_STOCK when inventory still exists
        const code = (error as { response?: { data?: { error?: { code?: string } } } })
          ?.response?.data?.error?.code;
        if (code === "WAREHOUSE_HAS_STOCK") {
          setBlockedDeleteId(idToDelete);
        } else {
          toast.error(t("deleteError"));
        }
      },
    });
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
