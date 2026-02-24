"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { useLeads, useDeleteLead } from "./use-leads";
import { useUserPermission } from "@/hooks/use-user-permission";
import type { Lead } from "../types";

export function useLeadList() {
  const t = useTranslations("crmLead");
  const tCommon = useTranslations("common");

  const canCreate = useUserPermission("crm_lead.create");
  const canUpdate = useUserPermission("crm_lead.update");
  const canDelete = useUserPermission("crm_lead.delete");
  const canConvert = useUserPermission("crm_lead.convert");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<string>("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Lead | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [convertItem, setConvertItem] = useState<Lead | null>(null);

  const { data, isLoading, isError, refetch } = useLeads({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    lead_status_id: statusFilter || undefined,
    lead_source_id: sourceFilter || undefined,
  });
  const deleteMutation = useDeleteLead();

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const handleCreate = () => {
    setEditingItem(null);
    setDialogOpen(true);
  };

  const handleEdit = (item: Lead) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleConvert = (item: Lead) => {
    setConvertItem(item);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success(t("deleted"));
      setDeleteId(null);
    } catch {
      toast.error(tCommon("error"));
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingItem(null);
  };

  const handleConvertClose = () => {
    setConvertItem(null);
  };

  return {
    state: {
      search,
      page,
      pageSize,
      statusFilter,
      sourceFilter,
      dialogOpen,
      editingItem,
      deleteId,
      convertItem,
    },
    actions: {
      setSearch,
      setPage,
      setPageSize,
      setStatusFilter,
      setSourceFilter,
      setDeleteId,
      handleCreate,
      handleEdit,
      handleDelete,
      handleConvert,
      handleDialogClose,
      handleConvertClose,
    },
    data: {
      items,
      pagination,
      isLoading,
      isError,
      refetch,
      isDeleting: deleteMutation.isPending,
    },
    permissions: { canCreate, canUpdate, canDelete, canConvert },
    translations: { t, tCommon },
  };
}
