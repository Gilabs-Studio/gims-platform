"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { useVisitReports, useDeleteVisitReport, useCheckInVisitReport, useCheckOutVisitReport, useSubmitVisitReport } from "./use-visit-reports";
import { useUserPermission } from "@/hooks/use-user-permission";
import { usePermissionScope } from "@/features/master-data/user-management/hooks/use-has-permission";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import type { VisitReport, VisitReportStatus, VisitReportOutcome } from "../types";

export function useVisitReportList() {
  const t = useTranslations("crmVisitReport");
  const tCommon = useTranslations("common");

  const canCreate = useUserPermission("crm_visit.create");
  const canUpdate = useUserPermission("crm_visit.update");
  const canDelete = useUserPermission("crm_visit.delete");
  const canApprove = useUserPermission("crm_visit.approve");
  const readScope = usePermissionScope("crm_visit.read");

  const { user } = useAuthStore();
  // Returns true when the current user owns a given visit report (created_by matches user.id)
  const isOwner = (item: VisitReport): boolean => !!user && item.created_by === user.id;

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [outcomeFilter, setOutcomeFilter] = useState<string>("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VisitReport | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useVisitReports({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    status: (statusFilter || undefined) as VisitReportStatus | undefined,
    outcome: (outcomeFilter || undefined) as VisitReportOutcome | undefined,
  });
  const deleteMutation = useDeleteVisitReport();
  const checkInMutation = useCheckInVisitReport();
  const checkOutMutation = useCheckOutVisitReport();
  const submitMutation = useSubmitVisitReport();

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  // Compute summary metrics from loaded items for scope-aware dashboards
  const hasTeamView = readScope === "ALL" || readScope === "DIVISION" || readScope === "AREA";
  const metrics = useMemo(() => {
    const statusCounts = { draft: 0, submitted: 0, approved: 0, rejected: 0 };
    const outcomeCounts = { positive: 0, neutral: 0, negative: 0, very_positive: 0 };
    let withCheckIn = 0;

    for (const item of items) {
      if (item.status in statusCounts) {
        statusCounts[item.status as VisitReportStatus] += 1;
      }
      if (item.outcome && item.outcome in outcomeCounts) {
        outcomeCounts[item.outcome as VisitReportOutcome] += 1;
      }
      if (item.check_in_at) {
        withCheckIn += 1;
      }
    }

    return {
      total: pagination?.total ?? items.length,
      statusCounts,
      outcomeCounts,
      checkInRate: items.length > 0 ? Math.round((withCheckIn / items.length) * 100) : 0,
    };
  }, [items, pagination?.total]);

  const handleCreate = () => {
    setEditingItem(null);
    setDialogOpen(true);
  };

  const handleEdit = (item: VisitReport) => {
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

  const handleCheckIn = async (id: string) => {
    try {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            await checkInMutation.mutateAsync({
              id,
              data: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
              },
            });
            toast.success(t("checkedIn"));
          },
          async () => {
            // Fallback without GPS
            await checkInMutation.mutateAsync({ id, data: {} });
            toast.success(t("checkedIn"));
          }
        );
      } else {
        await checkInMutation.mutateAsync({ id, data: {} });
        toast.success(t("checkedIn"));
      }
    } catch {
      toast.error(tCommon("error"));
    }
  };

  const handleCheckOut = async (id: string) => {
    try {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            await checkOutMutation.mutateAsync({
              id,
              data: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
              },
            });
            toast.success(t("checkedOut"));
          },
          async () => {
            await checkOutMutation.mutateAsync({ id, data: {} });
            toast.success(t("checkedOut"));
          }
        );
      } else {
        await checkOutMutation.mutateAsync({ id, data: {} });
        toast.success(t("checkedOut"));
      }
    } catch {
      toast.error(tCommon("error"));
    }
  };

  const handleSubmit = async (id: string) => {
    try {
      await submitMutation.mutateAsync({ id });
      toast.success(t("submitted"));
    } catch {
      toast.error(tCommon("error"));
    }
  };

  return {
    state: {
      search,
      page,
      pageSize,
      statusFilter,
      outcomeFilter,
      dialogOpen,
      editingItem,
      deleteId,
    },
    actions: {
      setSearch,
      setPage,
      setPageSize,
      setStatusFilter,
      setOutcomeFilter,
      setDeleteId,
      handleCreate,
      handleEdit,
      handleDelete,
      handleDialogClose,
      handleCheckIn,
      handleCheckOut,
      handleSubmit,
    },
    data: {
      items,
      pagination,
      isLoading,
      isError,
      refetch,
      isDeleting: deleteMutation.isPending,
      metrics,
      hasTeamView,
    },
    permissions: { canCreate, canUpdate, canDelete, canApprove, canApproveOnly: canApprove && !canUpdate, readScope, isOwner },
    translations: { t, tCommon },
  };
}
