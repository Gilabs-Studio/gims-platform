"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import {
  usePurchaseOrders,
  useDeletePurchaseOrder,
  usePurchaseOrder,
  useCreatePurchaseOrder,
  useUpdatePurchaseOrder,
  useConfirmPurchaseOrder,
} from "./use-purchase-orders";
import type {
  CreatePurchaseOrderFormData,
  UpdatePurchaseOrderFormData,
} from "../schemas/purchase-order.schema";

export function usePurchaseOrderList() {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"DRAFT" | "APPROVED" | "CLOSED" | "ALL">("ALL");
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | undefined>(undefined);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<number | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<number | null>(null);

  // Debounce search input to reduce API calls
  const debouncedSearch = useDebounce(search, 500);

  const { data, isLoading } = usePurchaseOrders({
    page,
    limit: perPage,
    search: debouncedSearch,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    sort_by: sortBy,
    sort_order: sortOrder,
  });
  const { data: editingOrderData } = usePurchaseOrder(editingOrder);
  const deleteOrder = useDeletePurchaseOrder();
  const createOrder = useCreatePurchaseOrder();
  const updateOrder = useUpdatePurchaseOrder();
  const confirmOrder = useConfirmPurchaseOrder();

  const orders = data?.data || [];
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

  const handleCreate = useCallback(async (formData: CreatePurchaseOrderFormData) => {
    try {
      await createOrder.mutateAsync(formData);
      setIsCreateDialogOpen(false);
      toast.success("Purchase order created successfully");
    } catch (error) {
      // Error already handled in api-client interceptor
    }
  }, [createOrder]);

  const handleUpdate = useCallback(async (formData: UpdatePurchaseOrderFormData) => {
    if (editingOrder) {
      try {
        await updateOrder.mutateAsync({ id: editingOrder, data: formData });
        setEditingOrder(null);
        toast.success("Purchase order updated successfully");
      } catch (error) {
        // Error already handled in api-client interceptor
      }
    }
  }, [editingOrder, updateOrder]);

  const handleDeleteClick = useCallback((id: number) => {
    setDeletingOrderId(id);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (deletingOrderId) {
      try {
        await deleteOrder.mutateAsync(deletingOrderId);
        toast.success("Purchase order deleted successfully");
        setDeletingOrderId(null);
      } catch (error) {
        // Error already handled in api-client interceptor
      }
    }
  }, [deletingOrderId, deleteOrder]);

  const handleConfirm = useCallback(async (id: number) => {
    try {
      await confirmOrder.mutateAsync(id);
      toast.success("Purchase order confirmed successfully");
    } catch (error) {
      // Error already handled in api-client interceptor
    }
  }, [confirmOrder]);

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
    editingOrder,
    setEditingOrder,
    deletingOrderId,
    setDeletingOrderId,
    // Data
    orders,
    pagination,
    editingOrderData,
    isLoading,
    // Actions
    handleCreate,
    handleUpdate,
    handleDeleteClick,
    handleDeleteConfirm,
    handleConfirm,
    handleSortChange,
    // Mutations
    deleteOrder,
    createOrder,
    updateOrder,
    confirmOrder,
  };
}

