"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { useProvinces, useDeleteProvince, useUpdateProvince } from "./use-provinces";
import { useCountries } from "./use-countries";
import type { Province } from "../types";

export function useProvinceList() {
  const t = useTranslations("geographic");

  // Permissions
  const canCreate = useUserPermission("province.create");
  const canUpdate = useUserPermission("province.update");
  const canDelete = useUserPermission("province.delete");

  // State
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [countryId, setCountryId] = useState<string>("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProvince, setEditingProvince] = useState<Province | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Queries & Mutations
  const { data: countriesData } = useCountries({ per_page: 100 });
  const countries = countriesData?.data ?? [];

  const { data, isLoading, isError, refetch } = useProvinces({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    country_id: countryId || undefined,
  });

  const deleteProvince = useDeleteProvince();
  const updateProvince = useUpdateProvince();

  const provinces = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  // Handlers
  const handleCreate = () => {
    setEditingProvince(null);
    setIsFormOpen(true);
  };

  const handleEdit = (province: Province) => {
    setEditingProvince(province);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteProvince.mutateAsync(deletingId);
      setDeletingId(null);
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleStatusChange = async (id: string, currentStatus: boolean) => {
    try {
      await updateProvince.mutateAsync({
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
    setEditingProvince(null);
  };

  return {
    state: {
      search,
      page,
      pageSize,
      countryId,
      isFormOpen,
      editingProvince,
      deletingId,
    },
    actions: {
      setSearch,
      setPage,
      setPageSize,
      setCountryId,
      setDeletingId,
      handleCreate,
      handleEdit,
      handleDelete,
      handleStatusChange,
      handleFormClose,
    },
    data: {
      provinces,
      pagination,
      countries,
      isLoading,
      isError,
      refetch,
      isDeleting: deleteProvince.isPending,
      isUpdating: updateProvince.isPending,
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
