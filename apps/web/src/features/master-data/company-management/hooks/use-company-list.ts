"use client";

import { useState } from "react";
import { toast } from "sonner";
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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<number | null>(null);
  const [deletingCompanyId, setDeletingCompanyId] = useState<number | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const { data, isLoading } = useCompanies({
    page,
    limit: perPage,
    search,
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

  const handleCreate = async (formData: CreateCompanyFormData) => {
    try {
      await createCompany.mutateAsync(formData);
      setIsCreateDialogOpen(false);
      toast.success("Company created successfully");
    } catch (error) {
      // Error already handled in api-client interceptor
    }
  };

  const handleUpdate = async (formData: UpdateCompanyFormData) => {
    if (editingCompany) {
      try {
        await updateCompany.mutateAsync({ id: editingCompany, data: formData });
        setEditingCompany(null);
        toast.success("Company updated successfully");
      } catch (error) {
        // Error already handled in api-client interceptor
      }
    }
  };

  const handleDeleteClick = (id: number) => {
    setDeletingCompanyId(id);
  };

  const handleDeleteConfirm = async () => {
    if (deletingCompanyId) {
      try {
        await deleteCompany.mutateAsync(deletingCompanyId);
        toast.success("Company deleted successfully");
        setDeletingCompanyId(null);
      } catch (error) {
        // Error already handled in api-client interceptor
      }
    }
  };

  const handleApproveAll = async () => {
    try {
      await approveAll.mutateAsync();
      toast.success("All companies approved successfully");
    } catch (error) {
      // Error already handled in api-client interceptor
    }
  };

  const handleExport = async () => {
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
  };

  const handleDownloadTemplate = async () => {
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
  };

  const handleImport = async (file: File) => {
    try {
      await importCompanies.mutateAsync(file);
      setIsImportDialogOpen(false);
      toast.success("Companies imported successfully");
    } catch (error) {
      // Error already handled in api-client interceptor
    }
  };

  const handlePerPageChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1);
  };

  return {
    // State
    page,
    setPage,
    perPage,
    setPerPage: handlePerPageChange,
    search,
    setSearch,
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

