"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import type { MapMarker } from "@/components/ui/map/map-view";
import {
  useCustomers,
  useDeleteCustomer,
  useApproveCustomer,
  useSubmitCustomer,
} from "./use-customers";
import type { Customer, CustomerStatus } from "../types";

export type PanelMode = "create" | "edit" | "view" | null;

export function useCustomerMapView() {
  const t = useTranslations("customer");
  const isMobile = useIsMobile();

  // Permissions
  const canCreate = useUserPermission("customer.create");
  const canUpdate = useUserPermission("customer.update");
  const canDelete = useUserPermission("customer.delete");
  const canApprove = useUserPermission("customer.approve");

  // State
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | "all">("all");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Queries & Mutations
  const { data, isLoading, refetch } = useCustomers({
    per_page: 100,
    search: debouncedSearch || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const deleteCustomer = useDeleteCustomer();
  const submitForApproval = useSubmitCustomer();
  const approveCustomer = useApproveCustomer();

  const customers = data?.data ?? [];

  // Filter customers with valid coordinates for map markers
  const markers: MapMarker<Customer>[] = useMemo(() => {
    return customers
      .filter((c) => c.latitude != null && c.longitude != null)
      .map((c) => ({
        id: c.id,
        latitude: Number(c.latitude),
        longitude: Number(c.longitude),
        data: c,
      }));
  }, [customers]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId),
    [customers, selectedCustomerId]
  );

  // Handlers
  const handleCustomerClick = (customer: Customer) => {
    setSelectedCustomerId(customer.id);
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const handleCreate = () => {
    setEditingCustomer(null);
    setPanelMode("create");
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setPanelMode("edit");
  };

  const handleView = (customer: Customer) => {
    setViewingCustomer(customer);
    setIsDetailOpen(true);
  };

  const handleClosePanel = () => {
    setPanelMode(null);
    setEditingCustomer(null);
  };

  const handleDelete = async () => {
    if (deletingId) {
      await deleteCustomer.mutateAsync(deletingId);
      setDeletingId(null);
    }
  };

  const handleSubmitForApproval = async (customer: Customer) => {
    try {
      await submitForApproval.mutateAsync(customer.id);
      toast.success(t("customer.submitSuccess"));
    } catch {
      toast.error(t("common.error_update"));
    }
  };

  const handleApprove = async (customer: Customer) => {
    try {
      await approveCustomer.mutateAsync({ id: customer.id, data: { action: "approve" } });
      toast.success(t("customer.approveSuccess"));
    } catch {
      toast.error(t("common.error_update"));
    }
  };

  const handleReject = async (customer: Customer) => {
    try {
      await approveCustomer.mutateAsync({ id: customer.id, data: { action: "reject" } });
      toast.success(t("customer.rejectSuccess"));
    } catch {
      toast.error(t("common.error_update"));
    }
  };

  return {
    state: {
      search,
      statusFilter,
      selectedCustomerId,
      isSidebarOpen,
      panelMode,
      isDetailOpen,
      viewingCustomer,
      editingCustomer,
      deletingId,
    },
    actions: {
      setSearch,
      setStatusFilter,
      setSelectedCustomerId,
      setIsSidebarOpen,
      setPanelMode,
      setIsDetailOpen,
      setViewingCustomer,
      setEditingCustomer,
      setDeletingId,
      handleCustomerClick,
      handleCreate,
      handleEdit,
      handleView,
      handleClosePanel,
      handleDelete,
      handleSubmitForApproval,
      handleApprove,
      handleReject,
      refetch,
    },
    data: {
      customers,
      markers,
      selectedCustomer,
      isLoading,
      isDeleting: deleteCustomer.isPending,
    },
    permissions: {
      canCreate,
      canUpdate,
      canDelete,
      canApprove,
    },
    layout: {
      isMobile,
    },
    translations: {
      t,
    },
  };
}
