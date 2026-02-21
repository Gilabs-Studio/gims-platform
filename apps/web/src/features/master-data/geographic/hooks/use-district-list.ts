"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { useDistricts, useDeleteDistrict, useUpdateDistrict } from "./use-districts";
import { useCities } from "./use-cities";
import type { District } from "../types";

export function useDistrictList() {
  const t = useTranslations("geographic");

  // Permissions
  const canCreate = useUserPermission("district.create");
  const canUpdate = useUserPermission("district.update");
  const canDelete = useUserPermission("district.delete");

  // State
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [cityId, setCityId] = useState<string>("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDistrict, setEditingDistrict] = useState<District | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Queries & Mutations
  const { data: citiesData } = useCities({ per_page: 100 });
  const cities = citiesData?.data ?? [];

  const { data, isLoading, isError, refetch } = useDistricts({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    city_id: cityId || undefined,
  });

  const deleteDistrict = useDeleteDistrict();
  const updateDistrict = useUpdateDistrict();

  const districts = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  // Handlers
  const handleCreate = () => {
    setEditingDistrict(null);
    setIsFormOpen(true);
  };

  const handleEdit = (district: District) => {
    setEditingDistrict(district);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteDistrict.mutateAsync(deletingId);
      setDeletingId(null);
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleStatusChange = async (id: string, currentStatus: boolean) => {
    try {
      await updateDistrict.mutateAsync({
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
    setEditingDistrict(null);
  };

  return {
    state: {
      search,
      page,
      pageSize,
      cityId,
      isFormOpen,
      editingDistrict,
      deletingId,
    },
    actions: {
      setSearch,
      setPage,
      setPageSize,
      setCityId,
      setDeletingId,
      handleCreate,
      handleEdit,
      handleDelete,
      handleStatusChange,
      handleFormClose,
    },
    data: {
      districts,
      pagination,
      cities,
      isLoading,
      isError,
      refetch,
      isDeleting: deleteDistrict.isPending,
      isUpdating: updateDistrict.isPending,
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
