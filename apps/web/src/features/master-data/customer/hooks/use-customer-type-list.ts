"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import {
  useCustomerTypes,
  useDeleteCustomerType,
  useUpdateCustomerType,
} from "./use-customer-types";
import type { CustomerType } from "../types";

export function useCustomerTypeList() {
  const t = useTranslations("customer.customerType");
  const tCommon = useTranslations("customer.common");

  // Permissions
  const canCreate = useUserPermission("customer_type.create");
  const canUpdate = useUserPermission("customer_type.update");
  const canDelete = useUserPermission("customer_type.delete");

  // State
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CustomerType | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Queries & Mutations
  const { data, isLoading, isError, refetch } = useCustomerTypes({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
  });

  const deleteMutation = useDeleteCustomerType();
  const updateMutation = useUpdateCustomerType();

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  // Handlers
  const handleCreate = () => {
    setEditingItem(null);
    setDialogOpen(true);
  };

  const handleEdit = (item: CustomerType) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success(t("deleteSuccess"));
      setDeleteId(null);
    } catch {
      toast.error("Failed to delete customer type");
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
      toast.success(tCommon("success_update", { name }));
    } catch {
      toast.error(tCommon("error_update"));
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
    },
    actions: {
      setSearch,
      setPage,
      setPageSize,
      setDeleteId,
      handleCreate,
      handleEdit,
      handleDelete,
      handleStatusChange,
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
