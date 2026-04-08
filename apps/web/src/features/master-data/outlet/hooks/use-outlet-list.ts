"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { useOutlets, useDeleteOutlet } from "./use-outlets";
import type { Outlet } from "../types";

export function useOutletList() {
  const t = useTranslations("outlet");

  // Permissions
  const canCreate = useUserPermission("outlet.create");
  const canUpdate = useUserPermission("outlet.update");
  const canDelete = useUserPermission("outlet.delete");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Outlet | null>(null);
  const [detailItem, setDetailItem] = useState<Outlet | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useOutlets({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
  });

  const deleteMutation = useDeleteOutlet();

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const handleCreate = () => {
    setEditingItem(null);
    setDialogOpen(true);
  };

  const handleEdit = (item: Outlet) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleViewDetail = (item: Outlet) => {
    setDetailItem(item);
    setDetailOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success(t("outlet.deleteSuccess"));
      setDeleteId(null);
    } catch {
      toast.error(t("outlet.deleteError"));
    }
  };

  const handlePageChange = (newPage: number) => setPage(newPage);
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
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
      setDialogOpen,
      setDetailOpen,
      setEditingItem,
      setDetailItem,
      setDeleteId,
      handleCreate,
      handleEdit,
      handleViewDetail,
      handleDelete,
      handlePageChange,
      handlePageSizeChange,
    },
    data: {
      items,
      pagination,
      isLoading,
      isError,
      refetch,
    },
    permissions: {
      canCreate,
      canUpdate,
      canDelete,
    },
    translations: { t },
  };
}
