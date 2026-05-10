"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { useOutlets, useDeleteOutlet } from "./use-outlets";
import { useOutletLimit } from "./use-outlet-limit";
import { billingService } from "@/features/settings/services/billing-service";
import { authService } from "@/features/auth/services/auth-service";
import type { Outlet } from "../types";

const OUTLET_CREATE_INTENT_KEY = "outlet_create_resume_intent";

export function useOutletList() {
  const t = useTranslations("outlet");
  const queryClient = useQueryClient();

  // Permissions
  const canCreate = useUserPermission("outlet.create");
  const canUpdate = useUserPermission("outlet.update");
  const canDelete = useUserPermission("outlet.delete");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Outlet | null>(null);
  const [detailItem, setDetailItem] = useState<Outlet | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [addonDialogOpen, setAddonDialogOpen] = useState(false);
  const [addonQuantity, setAddonQuantity] = useState(1);
  const [isAddonSubmitting, setIsAddonSubmitting] = useState(false);

  const { data, isLoading, isError, refetch } = useOutlets({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
  });

  const deleteMutation = useDeleteOutlet();
  const { data: outletLimit } = useOutletLimit();
  const { data: subscription } = useQuery({
    queryKey: ["my-subscription"],
    queryFn: () => billingService.getMySubscription(),
    staleTime: 60_000,
  });
  const { data: plans } = useQuery({
    queryKey: ["public-subscription-plans"],
    queryFn: () => authService.getSubscriptionPlans(),
    staleTime: 300_000,
    retry: false,
  });

  const addonUnitPrice = useMemo(() => {
    if (!subscription) {
      return 500000;
    }
    const activePlan = plans?.find((plan) => plan.slug === subscription.plan);
    if (!activePlan) {
      return 500000;
    }
    if (subscription.billing_period === "yearly") {
      return activePlan.outlet_addon_yearly_idr ?? 6000000;
    }
    return activePlan.outlet_addon_monthly_idr ?? 500000;
  }, [plans, subscription]);

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const intent = window.localStorage.getItem(OUTLET_CREATE_INTENT_KEY);
    if (!intent) {
      return;
    }
    if (!outletLimit) {
      return;
    }
    // Defer setting state to avoid sync setState-in-effect warnings
    // If we're at the outlet limit, open addon dialog instead of the create form
    const handleIntent = () => {
      if (outletLimit.max > 0 && outletLimit.current >= outletLimit.max) {
        setAddonQuantity(1);
        setAddonDialogOpen(true);
        window.localStorage.removeItem(OUTLET_CREATE_INTENT_KEY);
        return;
      }
      setEditingItem(null);
      setDialogOpen(true);
      window.localStorage.removeItem(OUTLET_CREATE_INTENT_KEY);
    };

    const t = setTimeout(handleIntent, 0);
    return () => clearTimeout(t);
  }, [outletLimit]);

  // Allow external callers (for example the create form) to request the addon dialog
  // by dispatching a window event 'open-outlet-addon'. This decouples components.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onOpenAddon = () => {
      setAddonQuantity(1);
      setAddonDialogOpen(true);
    };
    window.addEventListener("open-outlet-addon", onOpenAddon as EventListener);
    return () => window.removeEventListener("open-outlet-addon", onOpenAddon as EventListener);
  }, []);

  const handleCreate = () => {
    if (outletLimit && outletLimit.max > 0 && outletLimit.current >= outletLimit.max) {
      setAddonQuantity(1);
      setAddonDialogOpen(true);
      return;
    }
    setEditingItem(null);
    setDialogOpen(true);
  };

  const handleEdit = (item: Outlet) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleViewDetail = (item: Outlet) => {
    setDetailItem(item);
    setDetailOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success(t("outlet.deleteSuccess"));
      setDeleteId(null);
    } catch {
      toast.error(t("outlet.deleteError"));
    }
  };

  const handlePageChange = (newPage: number) => setPage(newPage);
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  const handleAddonSubmit = async () => {
    if (!outletLimit) {
      return;
    }

    setIsAddonSubmitting(true);
    try {
      const actionDate = new Date().toISOString().slice(0, 10);
      const nextOutletLimit = outletLimit.max + addonQuantity;
      const result = await billingService.changeSubscription({
        action: "add_outlet",
        target: String(nextOutletLimit),
        action_date: actionDate,
        idempotency_key: `outlet-addon-${actionDate}-${nextOutletLimit}`,
      });

      toast.success(result.user_notification?.title || t("outlet.addon.invoiceReady"));
      if (typeof window !== "undefined") {
        window.localStorage.setItem(OUTLET_CREATE_INTENT_KEY, actionDate);
      }

      const rawInvoiceUrl = result.xendit_payload?.invoice_url;
      const invoiceUrl = typeof rawInvoiceUrl === "string" ? rawInvoiceUrl : "";
      setAddonDialogOpen(false);

      await queryClient.invalidateQueries({ queryKey: ["outlets", "limit"] });

      if (invoiceUrl) {
        window.open(invoiceUrl, "_blank", "noopener,noreferrer");
      } else {
        setEditingItem(null);
        setDialogOpen(true);
      }
    } catch {
      toast.error(t("outlet.addon.invoiceError"));
    } finally {
      setIsAddonSubmitting(false);
    }
  };

  return {
    state: {
      search,
      page,
      pageSize,
      dialogOpen,
      detailOpen,
      editingItem,
      detailItem,
      deleteId,
      addonDialogOpen,
      addonQuantity,
      isAddonSubmitting,
    },
    actions: {
      setSearch,
      setPage,
      setDialogOpen,
      setDetailOpen,
      setEditingItem,
      setDetailItem,
      setDeleteId,
      setAddonDialogOpen,
      setAddonQuantity,
      handleCreate,
      handleEdit,
      handleViewDetail,
      handleDelete,
      handlePageChange,
      handlePageSizeChange,
      handleAddonSubmit,
    },
    data: {
      items,
      pagination,
      outletLimit,
      addonUnitPrice,
      isLoading,
      isError,
      refetch,
    },
    permissions: {
      canCreate,
      canUpdate,
      canDelete,
    },
    translations: { t },
  };
}
