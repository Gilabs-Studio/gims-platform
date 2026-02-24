"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { useContactRoles, useDeleteContactRole, useUpdateContactRole } from "./use-contact-role";
import { useUserPermission } from "@/hooks/use-user-permission";
import type { ContactRole } from "../types";

export function useContactRoleList() {
  const t = useTranslations("contactRole");
  const tCommon = useTranslations("common");

  const canCreate = useUserPermission("crm_contact_role.create");
  const canUpdate = useUserPermission("crm_contact_role.update");
  const canDelete = useUserPermission("crm_contact_role.delete");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ContactRole | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useContactRoles({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
  });
  const deleteMutation = useDeleteContactRole();
  const updateMutation = useUpdateContactRole();

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const handleCreate = () => { setEditingItem(null); setDialogOpen(true); };
  const handleEdit = (item: ContactRole) => { setEditingItem(item); setDialogOpen(true); };

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
