"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { useBusinessTypes, useDeleteBusinessType, useUpdateBusinessType } from "./use-business-types";
import type { BusinessType } from "../types";

export function useBusinessTypeList() {
  const t = useTranslations("organization");

  // Permissions
  const canCreate = useUserPermission("business_type.create");
  const canUpdate = useUserPermission("business_type.update");
  const canDelete = useUserPermission("business_type.delete");

  // State
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBusinessType, setEditingBusinessType] = useState<BusinessType | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Queries & Mutations
  const { data, isLoading, isError, refetch } = useBusinessTypes({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
  });

  const deleteBusinessType = useDeleteBusinessType();
  const updateBusinessType = useUpdateBusinessType();

  const businessTypes = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  // Handlers
  const handleCreate = () => {
    setEditingBusinessType(null);
    setIsFormOpen(true);
  };

  const handleEdit = (businessType: BusinessType) => {
    setEditingBusinessType(businessType);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteBusinessType.mutateAsync(deletingId);
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
      await updateBusinessType.mutateAsync({
        id,
        data: { is_active: !currentStatus },
      });
      toast.success(t("common.success_update", { name }));
    } catch (error) {
      toast.error(t("common.error_update"));
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingBusinessType(null);
  };

  return {
    state: {
      search,
      page,
      pageSize,
      isFormOpen,
      editingBusinessType,
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
      businessTypes,
      pagination,
      isLoading,
      isError,
      refetch,
      isDeleting: deleteBusinessType.isPending,
      isUpdating: updateBusinessType.isPending,
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
