"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { useBusinessUnits, useDeleteBusinessUnit, useUpdateBusinessUnit } from "./use-business-units";
import type { BusinessUnit } from "../types";

export function useBusinessUnitList() {
  const t = useTranslations("organization");

  // Permissions
  const canCreate = useUserPermission("business_unit.create");
  const canUpdate = useUserPermission("business_unit.update");
  const canDelete = useUserPermission("business_unit.delete");

  // State
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBusinessUnit, setEditingBusinessUnit] = useState<BusinessUnit | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Queries & Mutations
  const { data, isLoading, isError, refetch } = useBusinessUnits({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
  });

  const deleteBusinessUnit = useDeleteBusinessUnit();
  const updateBusinessUnit = useUpdateBusinessUnit();

  const businessUnits = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  // Handlers
  const handleCreate = () => {
    setEditingBusinessUnit(null);
    setIsFormOpen(true);
  };

  const handleEdit = (businessUnit: BusinessUnit) => {
    setEditingBusinessUnit(businessUnit);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteBusinessUnit.mutateAsync(deletingId);
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
      await updateBusinessUnit.mutateAsync({
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
    setEditingBusinessUnit(null);
  };

  return {
    state: {
      search,
      page,
      pageSize,
      isFormOpen,
      editingBusinessUnit,
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
      businessUnits,
      pagination,
      isLoading,
      isError,
      refetch,
      isDeleting: deleteBusinessUnit.isPending,
      isUpdating: updateBusinessUnit.isPending,
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
