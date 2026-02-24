"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { useLeadSources, useDeleteLeadSource, useUpdateLeadSource } from "./use-lead-source";
import { useUserPermission } from "@/hooks/use-user-permission";
import type { LeadSource } from "../types";

export function useLeadSourceList() {
  const t = useTranslations("leadSource");
  const tCommon = useTranslations("common");

  const canCreate = useUserPermission("crm_lead_source.create");
  const canUpdate = useUserPermission("crm_lead_source.update");
  const canDelete = useUserPermission("crm_lead_source.delete");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LeadSource | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useLeadSources({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
  });
  const deleteMutation = useDeleteLeadSource();
  const updateMutation = useUpdateLeadSource();

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const handleCreate = () => { setEditingItem(null); setDialogOpen(true); };
  const handleEdit = (item: LeadSource) => { setEditingItem(item); setDialogOpen(true); };

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

  const handleStatusChange = async (id: string, currentStatus: boolean, name: string) => {
    try {
      await updateMutation.mutateAsync({ id, data: { is_active: !currentStatus } });
      toast.success(name + " status updated");
    } catch {
      toast.error(tCommon("error"));
    }
  };

  const handleDialogClose = () => { setDialogOpen(false); setEditingItem(null); };

  return {
    state: { search, page, pageSize, dialogOpen, editingItem, deleteId },
    actions: { setSearch, setPage, setPageSize, setDeleteId, handleCreate, handleEdit, handleDelete, handleStatusChange, handleDialogClose },
    data: { items, pagination, isLoading, isError, refetch, isDeleting: deleteMutation.isPending, isUpdating: updateMutation.isPending },
    permissions: { canCreate, canUpdate, canDelete },
    translations: { t, tCommon },
  };
}
