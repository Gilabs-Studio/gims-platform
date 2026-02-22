"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { useVillages, useDeleteVillage, useUpdateVillage } from "./use-villages";
import { useDistricts } from "./use-districts";
import type { Village } from "../types";

export function useVillageList() {
  const t = useTranslations("geographic");

  // Permissions
  const canCreate = useUserPermission("village.create");
  const canUpdate = useUserPermission("village.update");
  const canDelete = useUserPermission("village.delete");

  // State
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [districtId, setDistrictId] = useState<string>("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVillage, setEditingVillage] = useState<Village | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Queries & Mutations
  const { data: districtsData } = useDistricts({ per_page: 100 });
  const districts = districtsData?.data ?? [];

  const { data, isLoading, isError, refetch } = useVillages({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    district_id: districtId || undefined,
  });

  const deleteVillage = useDeleteVillage();
  const updateVillage = useUpdateVillage();

  const villages = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  // Handlers
  const handleCreate = () => {
    setEditingVillage(null);
    setIsFormOpen(true);
  };

  const handleEdit = (village: Village) => {
    setEditingVillage(village);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteVillage.mutateAsync(deletingId);
      setDeletingId(null);
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleStatusChange = async (id: string, currentStatus: boolean) => {
    try {
      await updateVillage.mutateAsync({
        id,
        data: { is_active: !currentStatus },
      });
      toast.success(t("common.statusUpdated"));
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingVillage(null);
  };

  return {
    state: {
      search,
      page,
      pageSize,
      districtId,
      isFormOpen,
      editingVillage,
      deletingId,
    },
    actions: {
      setSearch,
      setPage,
      setPageSize,
      setDistrictId,
      setDeletingId,
      handleCreate,
      handleEdit,
      handleDelete,
      handleStatusChange,
      handleFormClose,
    },
    data: {
      villages,
      pagination,
      districts,
      isLoading,
      isError,
      refetch,
      isDeleting: deleteVillage.isPending,
      isUpdating: updateVillage.isPending,
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
