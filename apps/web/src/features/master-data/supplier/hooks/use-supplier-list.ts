"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import {
  useSuppliers,
  useDeleteSupplier,
} from "./use-suppliers";
import { useSupplierTypes } from "./use-supplier-types";
import type { Supplier } from "../types";

export function useSupplierList() {
  const t = useTranslations("supplier.supplier");
  const tCommon = useTranslations("supplier.common");

  // Permissions
  const canCreate = useUserPermission("supplier.create");
  const canUpdate = useUserPermission("supplier.update");
  const canDelete = useUserPermission("supplier.delete");

  // State
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Supplier | null>(null);
  const [detailItem, setDetailItem] = useState<Supplier | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Queries & Mutations
  const { data, isLoading, isError, refetch } = useSuppliers({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    supplier_type_id: typeFilter === "all" ? undefined : typeFilter,
  });

  const { data: typesData } = useSupplierTypes({ per_page: 20 });
  const supplierTypes = typesData?.data ?? [];

  const deleteMutation = useDeleteSupplier();

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  // Handlers
  const handleCreate = () => {
    setEditingItem(null);
    setDialogOpen(true);
  };

  const handleEdit = (item: Supplier) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleViewDetail = (item: Supplier) => {
    setDetailItem(item);
    setDetailOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success(t("deleteSuccess"));
      setDeleteId(null);
    } catch {
      toast.error("Failed to delete supplier");
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
      typeFilter,
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
      setTypeFilter,
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
      supplierTypes,
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
