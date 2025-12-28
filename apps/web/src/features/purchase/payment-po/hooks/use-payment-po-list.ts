"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import {
  usePaymentPOs,
  useDeletePaymentPO,
  usePaymentPO,
  useCreatePaymentPO,
  useUpdatePaymentPO,
  useConfirmPaymentPO,
} from "./use-payment-pos";
import type {
  CreatePaymentPOFormData,
  UpdatePaymentPOFormData,
} from "../schemas/payment-po.schema";

export function usePaymentPOList() {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"PENDING" | "CONFIRMED" | "ALL">("ALL");
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | undefined>(undefined);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPaymentPO, setEditingPaymentPO] = useState<number | null>(null);
  const [deletingPaymentPOId, setDeletingPaymentPOId] = useState<number | null>(null);

  // Debounce search input to reduce API calls
  const debouncedSearch = useDebounce(search, 500);

  const { data, isLoading } = usePaymentPOs({
    page,
    limit: perPage,
    search: debouncedSearch,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    sort_by: sortBy,
    sort_order: sortOrder,
  });
  const { data: editingPaymentPOData } = usePaymentPO(editingPaymentPO);
  const deletePaymentPO = useDeletePaymentPO();
  const createPaymentPO = useCreatePaymentPO();
  const updatePaymentPO = useUpdatePaymentPO();
  const confirmPaymentPO = useConfirmPaymentPO();

  const paymentPOs = data?.data || [];
  const pagination = data?.meta?.pagination;
  const sortMeta = data?.meta?.sort;
  const sortableColumns = data?.meta?.sortable_columns?.available_fields;

  // Sync sort state with meta if available (for initial load)
  useEffect(() => {
    if (sortMeta?.sort_by && sortBy === undefined) {
      setSortBy(sortMeta.sort_by);
      setSortOrder(sortMeta.sort_order as "asc" | "desc" | undefined);
    }
  }, [sortMeta, sortBy]);

  const handleCreate = useCallback(async (formData: CreatePaymentPOFormData) => {
    try {
      await createPaymentPO.mutateAsync(formData);
      setIsCreateDialogOpen(false);
      toast.success("Payment PO created successfully");
    } catch (error) {
      // Error already handled in api-client interceptor
    }
  }, [createPaymentPO]);

  const handleUpdate = useCallback(async (formData: UpdatePaymentPOFormData) => {
    if (editingPaymentPO) {
      try {
        await updatePaymentPO.mutateAsync({ id: editingPaymentPO, data: formData });
        setEditingPaymentPO(null);
        toast.success("Payment PO updated successfully");
      } catch (error) {
        // Error already handled in api-client interceptor
      }
    }
  }, [editingPaymentPO, updatePaymentPO]);

  const handleDeleteClick = useCallback((id: number) => {
    setDeletingPaymentPOId(id);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (deletingPaymentPOId) {
      try {
        await deletePaymentPO.mutateAsync(deletingPaymentPOId);
        toast.success("Payment PO deleted successfully");
        setDeletingPaymentPOId(null);
      } catch (error) {
        // Error already handled in api-client interceptor
      }
    }
  }, [deletingPaymentPOId, deletePaymentPO]);

  const handleConfirm = useCallback(async (id: number) => {
    try {
      await confirmPaymentPO.mutateAsync(id);
      toast.success("Payment PO confirmed successfully");
    } catch (error) {
      // Error already handled in api-client interceptor
    }
  }, [confirmPaymentPO]);

  const handlePerPageChange = useCallback((newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1);
  }, []);

  const handleSortChange = useCallback((newSortBy: string, newSortOrder: "asc" | "desc") => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setPage(1); // Reset to first page when sorting changes
  }, []);

  return {
    // State
    page,
    setPage,
    perPage,
    setPerPage: handlePerPageChange,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    sortBy,
    sortOrder,
    sortMeta,
    sortableColumns,
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    editingPaymentPO,
    setEditingPaymentPO,
    paymentPOs,
    pagination,
    editingPaymentPOData,
    isLoading,
    handleCreate,
    handleUpdate,
    handleDeleteClick,
    handleDeleteConfirm,
    handleConfirm,
    deletingPaymentPOId,
    setDeletingPaymentPOId,
    handleSortChange,
    deletePaymentPO,
    createPaymentPO,
    updatePaymentPO,
    confirmPaymentPO,
  };
}
