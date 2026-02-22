"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { useJobPositions, useDeleteJobPosition, useUpdateJobPosition } from "./use-job-positions";
import type { JobPosition } from "../types";

export function useJobPositionList() {
  const t = useTranslations("organization");

  // Permissions
  const canCreate = useUserPermission("job_position.create");
  const canUpdate = useUserPermission("job_position.update");
  const canDelete = useUserPermission("job_position.delete");

  // State
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingJobPosition, setEditingJobPosition] = useState<JobPosition | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Queries & Mutations
  const { data, isLoading, isError, refetch } = useJobPositions({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
  });

  const deleteJobPosition = useDeleteJobPosition();
  const updateJobPosition = useUpdateJobPosition();

  const jobPositions = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  // Handlers
  const handleCreate = () => {
    setEditingJobPosition(null);
    setIsFormOpen(true);
  };

  const handleEdit = (jobPosition: JobPosition) => {
    setEditingJobPosition(jobPosition);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteJobPosition.mutateAsync(deletingId);
      setDeletingId(null);
    } catch {
      toast.error(t("common.error_delete"));
    }
  };

  const handleStatusChange = async (
    id: string,
    currentStatus: boolean,
    name: string,
  ) => {
    try {
      await updateJobPosition.mutateAsync({
        id,
        data: { is_active: !currentStatus },
      });
      toast.success(t("common.success_update", { name }));
    } catch (error) {
      toast.error(t("common.error_update"));
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingJobPosition(null);
  };

  return {
    state: {
      search,
      page,
      pageSize,
      isFormOpen,
      editingJobPosition,
      deletingId,
    },
    actions: {
      setSearch,
      setPage,
      setPageSize,
      setDeletingId,
      handleCreate,
      handleEdit,
      handleDelete,
      handleStatusChange,
      handleFormClose,
    },
    data: {
      jobPositions,
      pagination,
      isLoading,
      isError,
      refetch,
      isDeleting: deleteJobPosition.isPending,
      isUpdating: updateJobPosition.isPending,
    },
    permissions: {
      canCreate,
      canUpdate,
      canDelete,
    },
    translations: {
      t,
    },
  };
}
