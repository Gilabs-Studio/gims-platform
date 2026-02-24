"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import {
  useAreas,
  useDeleteArea,
  useUpdateArea,
  useAreaDetail,
  useAssignSupervisors,
  useAssignMembers,
} from "./use-areas";
import type { Area, ListAreasParams } from "../types";

export type SupervisorFilter = "all" | "has" | "none";
export type MemberFilter = "all" | "has" | "none";

export function useAreaList() {
  const t = useTranslations("organization");

  // Permissions
  const canCreate = useUserPermission("area.create");
  const canView = useUserPermission("area.read");
  const canUpdate = useUserPermission("area.update");
  const canDelete = useUserPermission("area.delete");
  const canAssignSupervisor = useUserPermission("area.assign_supervisor");
  const canAssignMember = useUserPermission("area.assign_member");

  // State
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [supervisorFilter, setSupervisorFilter] = useState<SupervisorFilter>("all");
  const [memberFilter, setMemberFilter] = useState<MemberFilter>("all");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detailArea, setDetailArea] = useState<{ id: string; name: string } | null>(null);
  const [assignDialog, setAssignDialog] = useState<{
    areaId: string;
    areaName: string;
    role: "supervisor" | "member";
  } | null>(null);

  // Queries & Mutations
  const queryParams: ListAreasParams = {
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    has_supervisor: supervisorFilter === "has" ? true : supervisorFilter === "none" ? false : undefined,
    has_members: memberFilter === "has" ? true : memberFilter === "none" ? false : undefined,
  };

  const { data, isLoading, isError, refetch } = useAreas(queryParams);
  const deleteArea = useDeleteArea();
  const updateArea = useUpdateArea();
  const assignSupervisors = useAssignSupervisors();
  const assignMembers = useAssignMembers();

  const { data: assignAreaDetail } = useAreaDetail(assignDialog?.areaId ?? "");

  const areas = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  // Handlers
  const handleEdit = useCallback((area: Area) => {
    setEditingArea(area);
    setIsFormOpen(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (deletingId) {
      await deleteArea.mutateAsync(deletingId);
      setDeletingId(null);
    }
  }, [deletingId, deleteArea]);

  const handleStatusChange = useCallback(
    async (id: string, currentStatus: boolean, name: string) => {
      try {
        await updateArea.mutateAsync({
          id,
          data: { is_active: !currentStatus },
        });
        toast.success(t("common.success_update", { name }));
      } catch {
        toast.error(t("common.error_update"));
      }
    },
    [updateArea, t]
  );

  const handleRowClick = useCallback((area: Area) => {
    if (!canView) return;
    setDetailArea({ id: area.id, name: area.name });
  }, [canView]);

  const handleFormClose = useCallback(() => {
    setIsFormOpen(false);
    setEditingArea(null);
  }, []);

  const handleAssign = useCallback(
    (employeeIds: string[]) => {
      if (!assignDialog) return;

      const { areaId, role } = assignDialog;
      const mutation = role === "supervisor" ? assignSupervisors : assignMembers;

      mutation.mutate(
        { areaId, data: { employee_ids: employeeIds } },
        {
          onSuccess: () => {
            toast.success(t("area.assign.assignSuccess"));
            setAssignDialog(null);
          },
        }
      );
    },
    [assignDialog, assignSupervisors, assignMembers, t]
  );

  return {
    state: {
      search,
      page,
      pageSize,
      supervisorFilter,
      memberFilter,
      isFormOpen,
      editingArea,
      deletingId,
      detailArea,
      assignDialog,
    },
    actions: {
      setSearch,
      setPage,
      setPageSize,
      setSupervisorFilter,
      setMemberFilter,
      setIsFormOpen,
      setDeletingId,
      setDetailArea,
      setAssignDialog,
      handleEdit,
      handleDelete,
      handleStatusChange,
      handleRowClick,
      handleFormClose,
      handleAssign,
    },
    data: {
      areas,
      pagination,
      assignAreaDetail,
      isLoading,
      isError,
      refetch,
      isDeleting: deleteArea.isPending,
      isUpdating: updateArea.isPending,
      isAssigning: assignSupervisors.isPending || assignMembers.isPending,
    },
    permissions: {
      canCreate,
      canView,
      canUpdate,
      canDelete,
      canAssignSupervisor,
      canAssignMember,
    },
    translations: {
      t,
    },
  };
}
