"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { useCountries, useDeleteCountry, useUpdateCountry } from "./use-countries";
import type { Country } from "../types";

export function useCountryList() {
  const t = useTranslations("geographic");

  // Permissions
  const canCreate = useUserPermission("country.create");
  const canUpdate = useUserPermission("country.update");
  const canDelete = useUserPermission("country.delete");

  // State
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Queries & Mutations
  const { data, isLoading, isError, refetch } = useCountries({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
  });

  const deleteCountry = useDeleteCountry();
  const updateCountry = useUpdateCountry();

  const countries = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  // Handlers
  const handleCreate = () => {
    setEditingCountry(null);
    setIsFormOpen(true);
  };

  const handleEdit = (country: Country) => {
    setEditingCountry(country);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteCountry.mutateAsync(deletingId);
      setDeletingId(null);
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleStatusChange = async (id: string, currentStatus: boolean) => {
    try {
      await updateCountry.mutateAsync({
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
    setEditingCountry(null);
  };

  return {
    state: {
      search,
      page,
      pageSize,
      isFormOpen,
      editingCountry,
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
      countries,
      pagination,
      isLoading,
      isError,
      refetch,
      isDeleting: deleteCountry.isPending,
      isUpdating: updateCountry.isPending,
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
