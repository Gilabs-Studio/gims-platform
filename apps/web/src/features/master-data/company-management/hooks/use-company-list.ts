"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useCompanies,
  useDeleteCompany,
  useCompany,
  useCreateCompany,
  useUpdateCompany,
  useApproveAllCompanies,
  useExportCompanies,
  useDownloadCompanyTemplate,
  useImportCompanies,
} from "./use-companies";
import type { CreateCompanyFormData, UpdateCompanyFormData } from "../schemas/company.schema";

export function useCompanyList() {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | undefined>(undefined);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<number | null>(null);
  const [deletingCompanyId, setDeletingCompanyId] = useState<number | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  // Debounce search input to reduce API calls
  const debouncedSearch = useDebounce(search, 500);

  const { data, isLoading } = useCompanies({
    page,
    limit: perPage,
    search: debouncedSearch,
    sort_by: sortBy,
    sort_order: sortOrder,
  });
  const { data: editingCompanyData } = useCompany(editingCompany);
  const deleteCompany = useDeleteCompany();
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();
  const approveAll = useApproveAllCompanies();
  const exportCompanies = useExportCompanies({ page, limit: perPage, search });
  const downloadTemplate = useDownloadCompanyTemplate();
  const importCompanies = useImportCompanies();

  const companies = data?.data || [];
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

  const handleCreate = useCallback(async (formData: CreateCompanyFormData) => {
    try {
      await createCompany.mutateAsync(formData);
      setIsCreateDialogOpen(false);
      toast.success("Company created successfully");
    } catch (error) {
      // Error already handled in api-client interceptor
    }
  }, [createCompany]);

  const handleUpdate = useCallback(async (formData: UpdateCompanyFormData) => {
    if (editingCompany) {
      try {
        await updateCompany.mutateAsync({ id: editingCompany, data: formData });
        setEditingCompany(null);
        toast.success("Company updated successfully");
      } catch (error) {
        // Error already handled in api-client interceptor
      }
    }
  }, [editingCompany, updateCompany]);

  const handleDeleteClick = useCallback((id: number) => {
    setDeletingCompanyId(id);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (deletingCompanyId) {
      try {
        await deleteCompany.mutateAsync(deletingCompanyId);
        toast.success("Company deleted successfully");
        setDeletingCompanyId(null);
      } catch (error) {
        // Error already handled in api-client interceptor
      }
    }
  }, [deletingCompanyId, deleteCompany]);

  const handleApproveAll = useCallback(async () => {
    try {
      await approveAll.mutateAsync();
      toast.success("All companies approved successfully");
    } catch (error) {
      // Error already handled in api-client interceptor
    }
  }, [approveAll]);

  const handleExport = useCallback(async () => {
    try {
      const blob = await exportCompanies.mutateAsync();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `companies_export_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Companies exported successfully");
    } catch (error) {
      // Error already handled in api-client interceptor
    }
  }, [exportCompanies]);

  const handleDownloadTemplate = useCallback(async () => {
    try {
      const blob = await downloadTemplate.mutateAsync();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "companies_template.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Template downloaded successfully");
    } catch (error) {
      // Error already handled in api-client interceptor
    }
  }, [downloadTemplate]);

  const handleImport = useCallback(async (file: File) => {
    try {
      await importCompanies.mutateAsync(file);
      setIsImportDialogOpen(false);
      toast.success("Companies imported successfully");
    } catch (error) {
      // Error already handled in api-client interceptor
    }
  }, [importCompanies]);

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
    editingCompany,
    setEditingCompany,
    deletingCompanyId,
    setDeletingCompanyId,
    isImportDialogOpen,
    setIsImportDialogOpen,
    // Data
    companies,
    pagination,
    editingCompanyData,
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
    deleteCompany,
    createCompany,
    updateCompany,
    approveAll,
    exportCompanies,
    downloadTemplate,
    importCompanies,
  };
}

