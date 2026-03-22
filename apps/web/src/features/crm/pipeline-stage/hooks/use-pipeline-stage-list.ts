"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { usePipelineStages, useDeletePipelineStage } from "./use-pipeline-stage";
import { useUserPermission } from "@/hooks/use-user-permission";
import type { PipelineStage } from "../types";

export function usePipelineStageList() {
  const t = useTranslations("pipelineStage");
  const tCommon = useTranslations("common");

  const canCreate = useUserPermission("crm_pipeline_stage.create");
  const canUpdate = useUserPermission("crm_pipeline_stage.update");
  const canDelete = useUserPermission("crm_pipeline_stage.delete");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PipelineStage | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = usePipelineStages({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
  });
  const deleteMutation = useDeletePipelineStage();

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const handleCreate = () => {
    setEditingItem(null);
    setDialogOpen(true);
  };

  const handleEdit = (item: PipelineStage) => {
    setEditingItem(item);
    setDialogOpen(true);
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

  return {
    state: { search, page, pageSize, dialogOpen, editingItem, deleteId },
    actions: { setSearch, setPage, setPageSize, setDeleteId, handleCreate, handleEdit, handleDelete, handleDialogClose },
    data: { items, pagination, isLoading, isError, refetch, isDeleting: deleteMutation.isPending },
    permissions: { canCreate, canUpdate, canDelete },
    translations: { t, tCommon },
  };
}
