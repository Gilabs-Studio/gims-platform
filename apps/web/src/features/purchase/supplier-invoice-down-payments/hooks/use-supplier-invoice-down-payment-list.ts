"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useSupplierInvoiceDownPayments,
  useDeleteSupplierInvoiceDownPayment,
  useSupplierInvoiceDownPayment,
  useCreateSupplierInvoiceDownPayment,
  useUpdateSupplierInvoiceDownPayment,
  usePendingSupplierInvoiceDownPayment,
} from "./use-supplier-invoice-down-payments";
import type {
  CreateSupplierInvoiceDownPaymentFormData,
  UpdateSupplierInvoiceDownPaymentFormData,
} from "../schemas/supplier-invoice-down-payment.schema";

export function useSupplierInvoiceDownPaymentList() {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"DRAFT" | "UNPAID" | "PAID" | "ALL">("ALL");
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | undefined>(undefined);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<number | null>(null);
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<number | null>(null);

  // Debounce search input to reduce API calls
  const debouncedSearch = useDebounce(search, 500);

  const { data, isLoading } = useSupplierInvoiceDownPayments({
    page,
    limit: perPage,
    search: debouncedSearch,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    sort_by: sortBy,
    sort_order: sortOrder,
  });
  const { data: editingInvoiceData } = useSupplierInvoiceDownPayment(editingInvoice);
  const deleteInvoice = useDeleteSupplierInvoiceDownPayment();
  const createInvoice = useCreateSupplierInvoiceDownPayment();
  const updateInvoice = useUpdateSupplierInvoiceDownPayment();
  const pendingInvoice = usePendingSupplierInvoiceDownPayment();

  const invoices = data?.data || [];
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

  const handleCreate = useCallback(async (formData: CreateSupplierInvoiceDownPaymentFormData) => {
    try {
      await createInvoice.mutateAsync(formData);
      setIsCreateDialogOpen(false);
      toast.success("Supplier invoice down payment created successfully");
    } catch (error) {
      // Error already handled in api-client interceptor
    }
  }, [createInvoice]);

  const handleUpdate = useCallback(async (formData: UpdateSupplierInvoiceDownPaymentFormData) => {
    if (editingInvoice) {
      try {
        await updateInvoice.mutateAsync({ id: editingInvoice, data: formData });
        setEditingInvoice(null);
        toast.success("Supplier invoice down payment updated successfully");
      } catch (error) {
        // Error already handled in api-client interceptor
      }
    }
  }, [editingInvoice, updateInvoice]);

  const handleDeleteClick = useCallback((id: number) => {
    setDeletingInvoiceId(id);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (deletingInvoiceId) {
      try {
        await deleteInvoice.mutateAsync(deletingInvoiceId);
        toast.success("Supplier invoice down payment deleted successfully");
        setDeletingInvoiceId(null);
      } catch (error) {
        // Error already handled in api-client interceptor
      }
    }
  }, [deletingInvoiceId, deleteInvoice]);

  const handlePending = useCallback(async (id: number) => {
    try {
      await pendingInvoice.mutateAsync(id);
      toast.success("Supplier invoice down payment status updated to pending successfully");
    } catch (error) {
      // Error already handled in api-client interceptor
    }
  }, [pendingInvoice]);

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
    editingInvoice,
    setEditingInvoice,
    deletingInvoiceId,
    setDeletingInvoiceId,
    // Data
    invoices,
    pagination,
    editingInvoiceData,
    isLoading,
    // Actions
    handleCreate,
    handleUpdate,
    handleDeleteClick,
    handleDeleteConfirm,
    handlePending,
    handleSortChange,
    // Mutations
    deleteInvoice,
    createInvoice,
    updateInvoice,
    pendingInvoice,
  };
}




