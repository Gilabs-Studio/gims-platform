"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import type { DateRange } from "react-day-picker";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useGoodsReceipts,
  useDeleteGoodsReceipt,
  useGoodsReceipt,
  useCreateGoodsReceipt,
  useUpdateGoodsReceipt,
  useConfirmGoodsReceipt,
} from "./use-goods-receipts";
import type {
  CreateGoodsReceiptFormData,
  UpdateGoodsReceiptFormData,
} from "../schemas/goods-receipt.schema";

export function useGoodsReceiptList() {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"PENDING" | "RECEIVED" | "PARTIAL" | "ALL">("ALL");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | undefined>(undefined);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingGoodsReceipt, setEditingGoodsReceipt] = useState<number | null>(null);
  const [deletingGoodsReceiptId, setDeletingGoodsReceiptId] = useState<number | null>(null);

  // Debounce search input to reduce API calls
  const debouncedSearch = useDebounce(search, 500);

  // Format date range to ISO strings
  const startDate = useMemo(
    () => (dateRange?.from ? dateRange.from.toISOString().split("T")[0] : undefined),
    [dateRange]
  );
  const endDate = useMemo(
    () => (dateRange?.to ? dateRange.to.toISOString().split("T")[0] : undefined),
    [dateRange]
  );

  const { data, isLoading } = useGoodsReceipts({
    page,
    limit: perPage,
    search: debouncedSearch,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    start_date: startDate,
    end_date: endDate,
    sort_by: sortBy,
    sort_order: sortOrder,
  });
  const { data: editingGoodsReceiptData } = useGoodsReceipt(editingGoodsReceipt);
  const deleteGoodsReceipt = useDeleteGoodsReceipt();
  const createGoodsReceipt = useCreateGoodsReceipt();
  const updateGoodsReceipt = useUpdateGoodsReceipt();
  const confirmGoodsReceipt = useConfirmGoodsReceipt();

  const goodsReceipts = data?.data || [];
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

  const handleCreate = useCallback(async (formData: CreateGoodsReceiptFormData) => {
    try {
      await createGoodsReceipt.mutateAsync(formData);
      setIsCreateDialogOpen(false);
      toast.success("Goods receipt created successfully");
    } catch {
      // Error already handled in api-client interceptor
    }
  }, [createGoodsReceipt]);

  const handleUpdate = useCallback(async (formData: UpdateGoodsReceiptFormData) => {
    if (editingGoodsReceipt) {
      try {
        await updateGoodsReceipt.mutateAsync({ id: editingGoodsReceipt, data: formData });
        setEditingGoodsReceipt(null);
        toast.success("Goods receipt updated successfully");
      } catch {
        // Error already handled in api-client interceptor
      }
    }
  }, [editingGoodsReceipt, updateGoodsReceipt]);

  const handleDeleteClick = useCallback((id: number) => {
    setDeletingGoodsReceiptId(id);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (deletingGoodsReceiptId) {
      try {
        await deleteGoodsReceipt.mutateAsync(deletingGoodsReceiptId);
        toast.success("Goods receipt deleted successfully");
        setDeletingGoodsReceiptId(null);
      } catch {
        // Error already handled in api-client interceptor
      }
    }
  }, [deletingGoodsReceiptId, deleteGoodsReceipt]);

  const handleConfirm = useCallback(async (id: number) => {
    try {
      await confirmGoodsReceipt.mutateAsync(id);
      toast.success("Goods receipt confirmed successfully");
    } catch {
      // Error already handled in api-client interceptor
    }
  }, [confirmGoodsReceipt]);

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
    dateRange,
    setDateRange,
    sortBy,
    sortOrder,
    sortMeta,
    sortableColumns,
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    editingGoodsReceipt,
    setEditingGoodsReceipt,
    deletingGoodsReceiptId,
    setDeletingGoodsReceiptId,
    // Data
    goodsReceipts,
    pagination,
    editingGoodsReceiptData,
    isLoading,
    // Actions
    handleCreate,
    handleUpdate,
    handleDeleteClick,
    handleDeleteConfirm,
    handleConfirm,
    handleSortChange,
    // Mutations
    deleteGoodsReceipt,
    createGoodsReceipt,
    updateGoodsReceipt,
    confirmGoodsReceipt,
  };
}




