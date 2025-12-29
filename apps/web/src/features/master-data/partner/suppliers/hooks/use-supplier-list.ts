"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useSuppliers,
  useDeleteSupplier,
  useSupplier,
  useCreateSupplier,
  useUpdateSupplier,
  useApproveAllSuppliers,
  useExportSuppliers,
  useDownloadSupplierTemplate,
  useImportSuppliers,
} from "./use-suppliers";
import type { CreateSupplierFormData, UpdateSupplierFormData } from "../schemas/supplier.schema";

export function useSupplierList() {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | undefined>(undefined);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<number | null>(null);
  const [deletingSupplierId, setDeletingSupplierId] = useState<number | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  // Debounce search input to reduce API calls
  const debouncedSearch = useDebounce(search, 500);

  const { data, isLoading } = useSuppliers({
    page,
    limit: perPage,
    search: debouncedSearch,
    sort_by: sortBy,
    sort_order: sortOrder,
  });
  const { data: editingSupplierData } = useSupplier(editingSupplier);
  const deleteSupplier = useDeleteSupplier();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const approveAll = useApproveAllSuppliers();
  const exportSuppliers = useExportSuppliers({ page, limit: perPage, search });
  const downloadTemplate = useDownloadSupplierTemplate();
  const importSuppliers = useImportSuppliers();

  const suppliers = data?.data || [];
  const pagination = data?.meta?.pagination;
  const sortMeta = data?.meta?.sort;
  const sortableColumns = data?.meta?.sortable_columns?.available_fields;

  // Sync sort state with meta if available (for initial load)
  useEffect(() => {
    if (sortMeta?.sort_by && sortBy === undefined) {
      setTimeout(() => {
        setSortBy(sortMeta.sort_by);
        setSortOrder(sortMeta.sort_order as "asc" | "desc" | undefined);
      }, 0);
    }
  }, [sortMeta, sortBy]);

  const handleCreate = useCallback(async (formData: CreateSupplierFormData) => {
    try {
      await createSupplier.mutateAsync(formData);
      setIsCreateDialogOpen(false);
      toast.success("Supplier created successfully");
    } catch {
      // Error already handled in api-client interceptor
    }
  }, [createSupplier]);

  const handleUpdate = useCallback(async (formData: UpdateSupplierFormData) => {
    if (editingSupplier) {
      try {
        await updateSupplier.mutateAsync({ id: editingSupplier, data: formData });
        setEditingSupplier(null);
        toast.success("Supplier updated successfully");
      } catch {
        // Error already handled in api-client interceptor
      }
    }
  }, [editingSupplier, updateSupplier]);

  const handleDeleteClick = useCallback((id: number) => {
    setDeletingSupplierId(id);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (deletingSupplierId) {
      try {
        await deleteSupplier.mutateAsync(deletingSupplierId);
        toast.success("Supplier deleted successfully");
        setDeletingSupplierId(null);
      } catch {
        // Error already handled in api-client interceptor
      }
    }
  }, [deletingSupplierId, deleteSupplier]);

  const handleApproveAll = useCallback(async () => {
    try {
      await approveAll.mutateAsync();
      toast.success("All suppliers approved successfully");
    } catch {
      // Error already handled in api-client interceptor
    }
  }, [approveAll]);

  const handleExport = useCallback(async () => {
    try {
      const blob = await exportSuppliers.mutateAsync();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `suppliers_export_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Suppliers exported successfully");
    } catch {
      // Error already handled in api-client interceptor
    }
  }, [exportSuppliers]);

  const handleDownloadTemplate = useCallback(async () => {
    try {
      const blob = await downloadTemplate.mutateAsync();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "suppliers_template.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Template downloaded successfully");
    } catch {
      // Error already handled in api-client interceptor
    }
  }, [downloadTemplate]);

  const handleImport = useCallback(async (file: File) => {
    try {
      await importSuppliers.mutateAsync(file);
      setIsImportDialogOpen(false);
      toast.success("Suppliers imported successfully");
    } catch {
      // Error already handled in api-client interceptor
    }
  }, [importSuppliers]);

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
    sortBy,
    sortOrder,
    sortMeta,
    sortableColumns,
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    editingSupplier,
    setEditingSupplier,
    deletingSupplierId,
    setDeletingSupplierId,
    isImportDialogOpen,
    setIsImportDialogOpen,
    // Data
    suppliers,
    pagination,
    editingSupplierData,
    isLoading,
    // Actions
    handleCreate,
    handleUpdate,
    handleDeleteClick,
    handleDeleteConfirm,
    handleApproveAll,
    handleExport,
    handleDownloadTemplate,
    handleImport,
    handleSortChange,
    // Mutations
    deleteSupplier,
    createSupplier,
    updateSupplier,
    approveAll,
    exportSuppliers,
    downloadTemplate,
    importSuppliers,
  };
}
