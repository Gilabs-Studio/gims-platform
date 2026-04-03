"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { useVisitReports, useDeleteVisitReport, useCheckInVisitReport, useCheckOutVisitReport } from "./use-visit-reports";
import { useUserPermission } from "@/hooks/use-user-permission";
import { usePermissionScope } from "@/features/master-data/user-management/hooks/use-has-permission";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import { useRouter } from "@/i18n/routing";
import type { VisitReport, VisitReportOutcome } from "../types";

export function useVisitReportList() {
  const t = useTranslations("crmVisitReport");
  const tCommon = useTranslations("common");
  const router = useRouter();

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
  const [outcomeFilter, setOutcomeFilter] = useState<string>("");

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useVisitReports({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    outcome: (outcomeFilter || undefined) as VisitReportOutcome | undefined,
  });
  const deleteMutation = useDeleteVisitReport();
  const checkInMutation = useCheckInVisitReport();
  const checkOutMutation = useCheckOutVisitReport();

  const items = useMemo(() => data?.data ?? [], [data?.data]);
  const pagination = data?.meta?.pagination;

  // Compute summary metrics from loaded items for scope-aware dashboards
  const hasTeamView = readScope === "ALL" || readScope === "DIVISION" || readScope === "AREA";
  const metrics = useMemo(() => {
    const outcomeCounts = { positive: 0, neutral: 0, negative: 0, very_positive: 0 };
    let withCheckIn = 0;

    for (const item of items) {
      if (item.outcome && item.outcome in outcomeCounts) {
        outcomeCounts[item.outcome as VisitReportOutcome] += 1;
      }
      if (item.check_in_at) {
        withCheckIn += 1;
      }
    }

    return {
      total: pagination?.total ?? items.length,
      outcomeCounts,
      checkInRate: items.length > 0 ? Math.round((withCheckIn / items.length) * 100) : 0,
    };
  }, [items, pagination?.total]);

  const handleCreate = () => {
    router.push("/crm/visits/create");
  };

  const handleEdit = (item: VisitReport) => {
    router.push(`/crm/visits/${item.id}/edit`);
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
    // No-op
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

  return {
    state: {
      search,
      page,
      pageSize,
      outcomeFilter,
      deleteId,
    },
    actions: {
      setSearch,
      setPage,
      setPageSize,
      setOutcomeFilter,
      setDeleteId,
      handleCreate,
      handleEdit,
      handleDelete,
      handleDialogClose,
      handleCheckIn,
      handleCheckOut,
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
