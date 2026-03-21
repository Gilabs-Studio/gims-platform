"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import {
  useCustomers,
  useDeleteCustomer,
} from "./use-customers";
import { useCustomerTypes } from "./use-customer-types";
import type { Customer } from "../types";

export function useCustomerList() {
  const t = useTranslations("customer.customer");
  const tCommon = useTranslations("customer.common");

  // Permissions
  const canCreate = useUserPermission("customer.create");
  const canUpdate = useUserPermission("customer.update");
  const canDelete = useUserPermission("customer.delete");


  // State
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Customer | null>(null);
  const [detailItem, setDetailItem] = useState<Customer | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Queries & Mutations
  const { data, isLoading, isError, refetch } = useCustomers({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    customer_type_id: typeFilter === "all" ? undefined : typeFilter,
  });

  const { data: typesData } = useCustomerTypes({ per_page: 20 });
  const customerTypes = typesData?.data ?? [];

  const deleteMutation = useDeleteCustomer();

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  // Handlers
  const handleCreate = () => {
    setEditingItem(null);
    setDialogOpen(true);
  };

  const handleEdit = (item: Customer) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleViewDetail = (item: Customer) => {
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
      toast.error("Failed to delete customer");
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
      customerTypes,
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
