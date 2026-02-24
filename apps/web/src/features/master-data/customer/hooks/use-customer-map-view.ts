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
} from "./use-customers";
import { useCustomerTypes } from "./use-customer-types";
import type { Customer } from "../types";

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
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
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
    customer_type_id: typeFilter === "all" ? undefined : typeFilter,
  });

  // Fetch filter options from server (customer types)
  const { data: typesData } = useCustomerTypes({ per_page: 100 });
  const customerTypes = typesData?.data ?? [];

  const deleteCustomer = useDeleteCustomer();

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

  return {
    state: {
      search,
      statusFilter,
      typeFilter,
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
      setTypeFilter,
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
      refetch,
    },
    data: {
      customers,
      markers,
      selectedCustomer,
      isLoading,
      isDeleting: deleteCustomer.isPending,
      customerTypes,
    },
    permissions: {
      canCreate,
      canUpdate,
      canDelete,
    },
    layout: {
      isMobile,
    },
    translations: {
      t,
    },
  };
}
