"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { useCities, useDeleteCity, useUpdateCity } from "./use-cities";
import { useProvinces } from "./use-provinces";
import type { City } from "../types";

export function useCityList() {
  const t = useTranslations("geographic");

  // Permissions
  const canCreate = useUserPermission("city.create");
  const canUpdate = useUserPermission("city.update");
  const canDelete = useUserPermission("city.delete");

  // State
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [provinceId, setProvinceId] = useState<string>("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Queries & Mutations
  const { data: provincesData } = useProvinces({ per_page: 100 });
  const provinces = provincesData?.data ?? [];

  const { data, isLoading, isError, refetch } = useCities({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    province_id: provinceId || undefined,
  });

  const deleteCity = useDeleteCity();
  const updateCity = useUpdateCity();

  const cities = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  // Handlers
  const handleCreate = () => {
    setEditingCity(null);
    setIsFormOpen(true);
  };

  const handleEdit = (city: City) => {
    setEditingCity(city);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteCity.mutateAsync(deletingId);
      setDeletingId(null);
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleStatusChange = async (id: string, currentStatus: boolean) => {
    try {
      await updateCity.mutateAsync({
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
    setEditingCity(null);
  };

  return {
    state: {
      search,
      page,
      pageSize,
      provinceId,
      isFormOpen,
      editingCity,
      deletingId,
    },
    actions: {
      setSearch,
      setPage,
      setPageSize,
      setProvinceId,
      setDeletingId,
      handleCreate,
      handleEdit,
      handleDelete,
      handleStatusChange,
      handleFormClose,
    },
    data: {
      cities,
      pagination,
      provinces,
      isLoading,
      isError,
      refetch,
      isDeleting: deleteCity.isPending,
      isUpdating: updateCity.isPending,
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
