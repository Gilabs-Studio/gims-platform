"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import {
  useProducts,
  useDeleteProduct,
  useUpdateProduct,
  useSubmitProduct,
} from "./use-products";
import type { Product } from "../types";

export function useProductList() {
  const t = useTranslations("product.transaction");
  const tCommon = useTranslations("product.common");

  // Permission checks
  const canCreate = useUserPermission("product.create");
  const canUpdate = useUserPermission("product.update");
  const canDelete = useUserPermission("product.delete");

  // State
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // View detail dialog state
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState<Product | null>(null);

  // Queries & Mutations
  const { data, isLoading, isError, refetch } = useProducts({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
  });

  const deleteMutation = useDeleteProduct();
  const updateMutation = useUpdateProduct();
  const submitMutation = useSubmitProduct();

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  // Handlers
  const handleCreate = () => {
    setEditingItem(null);
    setDialogOpen(true);
  };

  const handleEdit = (item: Product) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleView = (item: Product) => {
    setViewingItem(item);
    setDetailDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success(t("deleted"));
      setDeleteId(null);
    } catch {
      toast.error("Failed to delete product");
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

  const handleSubmit = async (id: string) => {
    try {
      await submitMutation.mutateAsync(id);
      toast.success(t("submitted"));
    } catch {
      toast.error("Failed to submit product");
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
      detailDialogOpen,
      viewingItem,
    },
    actions: {
      setSearch,
      setPage,
      setPageSize,
      setDeleteId,
      setDetailDialogOpen,
      handleCreate,
      handleEdit,
      handleView,
      handleDelete,
      handleStatusChange,
      handleSubmit,
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
      isSubmitting: submitMutation.isPending,
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
