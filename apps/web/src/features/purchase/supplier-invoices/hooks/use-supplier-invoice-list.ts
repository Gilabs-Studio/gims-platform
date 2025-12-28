"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useSupplierInvoices,
  useDeleteSupplierInvoice,
  useSupplierInvoice,
  useCreateSupplierInvoice,
  useUpdateSupplierInvoice,
  useSetPendingSupplierInvoice,
} from "./use-supplier-invoices";
import type {
  CreateSupplierInvoiceFormData,
  UpdateSupplierInvoiceFormData,
} from "../schemas/supplier-invoice.schema";

export function useSupplierInvoiceList() {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "DRAFT" | "UNPAID" | "PAID" | "PARTIAL" | "OVERDUE" | "ALL"
  >("ALL");
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | undefined>(undefined);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<number | null>(null);
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<number | null>(null);

  // Debounce search input to reduce API calls
  const debouncedSearch = useDebounce(search, 500);

  const { data, isLoading } = useSupplierInvoices({
    page,
    limit: perPage,
    search: debouncedSearch,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    sort_by: sortBy,
    sort_order: sortOrder,
  });
  const { data: editingInvoiceData } = useSupplierInvoice(editingInvoice);
  const deleteInvoice = useDeleteSupplierInvoice();
  const createInvoice = useCreateSupplierInvoice();
  const updateInvoice = useUpdateSupplierInvoice();
  const setPendingInvoice = useSetPendingSupplierInvoice();

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

  const handleCreate = useCallback(async (formData: CreateSupplierInvoiceFormData) => {
    try {
      await createInvoice.mutateAsync(formData);
      setIsCreateDialogOpen(false);
      toast.success("Supplier invoice created successfully");
    } catch (error) {
      // Error already handled in api-client interceptor
    }
  }, [createInvoice]);

  const handleUpdate = useCallback(async (formData: UpdateSupplierInvoiceFormData) => {
    if (editingInvoice) {
      try {
        await updateInvoice.mutateAsync({ id: editingInvoice, data: formData });
        setEditingInvoice(null);
        toast.success("Supplier invoice updated successfully");
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
        toast.success("Supplier invoice deleted successfully");
        setDeletingInvoiceId(null);
      } catch (error) {
        // Error already handled in api-client interceptor
      }
    }
  }, [deletingInvoiceId, deleteInvoice]);

  const handleSetPending = useCallback(async (id: number) => {
    try {
      await setPendingInvoice.mutateAsync(id);
      toast.success("Supplier invoice set to pending successfully");
    } catch (error) {
      // Error already handled in api-client interceptor
    }
  }, [setPendingInvoice]);

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
    handleSetPending,
    handleSortChange,
    // Mutations
    deleteInvoice,
    createInvoice,
    updateInvoice,
    setPendingInvoice,
  };
}




