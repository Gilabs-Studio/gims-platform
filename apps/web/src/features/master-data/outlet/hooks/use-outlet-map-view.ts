"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import type { MapMarker } from "@/components/ui/map/map-view";
import { useOutlets, useDeleteOutlet, useOutletFormData } from "./use-outlets";
import type { Outlet } from "../types";

export type OutletPanelMode = "create" | "edit" | null;

export function useOutletMapView() {
  const t = useTranslations("outlet");
  const isMobile = useIsMobile();

  // Permissions
  const canCreate = useUserPermission("outlet.create");
  const canUpdate = useUserPermission("outlet.update");
  const canDelete = useUserPermission("outlet.delete");

  // State
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [warehouseFilter, setWarehouseFilter] = useState<string>("all");
  const [selectedOutletId, setSelectedOutletId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);
  const [panelMode, setPanelMode] = useState<OutletPanelMode>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [viewingOutlet, setViewingOutlet] = useState<Outlet | null>(null);
  const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useOutlets({
    per_page: 100,
    search: debouncedSearch || undefined,
    is_active:
      statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined,
    company_id: companyFilter !== "all" ? companyFilter : undefined,
    warehouse_id: warehouseFilter !== "all" ? warehouseFilter : undefined,
  });

  const { data: formData } = useOutletFormData();

  const deleteOutlet = useDeleteOutlet();

  const outlets = useMemo(() => data?.data ?? [], [data?.data]);

  const markers: MapMarker<Outlet>[] = useMemo(
    () =>
      outlets
        .filter((o) => o.latitude != null && o.longitude != null)
        .map((o) => ({
          id: o.id,
          latitude: Number(o.latitude),
          longitude: Number(o.longitude),
          data: o,
        })),
    [outlets]
  );

  const selectedOutlet = useMemo(
    () => outlets.find((o) => o.id === selectedOutletId),
    [outlets, selectedOutletId]
  );

  // Handlers
  const handleOutletClick = (outlet: Outlet) => {
    setSelectedOutletId(outlet.id);
    if (isMobile) setIsSidebarOpen(false);
  };

  const handleCreate = () => {
    setEditingOutlet(null);
    setPanelMode("create");
  };

  const handleEdit = (outlet: Outlet) => {
    setEditingOutlet(outlet);
    setPanelMode("edit");
  };

  const handleView = (outlet: Outlet) => {
    setViewingOutlet(outlet);
    setIsDetailOpen(true);
  };

  const handleClosePanel = () => {
    setPanelMode(null);
    setEditingOutlet(null);
  };

  const handleDelete = async () => {
    if (deletingId) {
      await deleteOutlet.mutateAsync(deletingId);
      setDeletingId(null);
    }
  };

  return {
    state: {
      search,
      statusFilter,
      companyFilter,
      warehouseFilter,
      selectedOutletId,
      isSidebarOpen,
      panelMode,
      isDetailOpen,
      viewingOutlet,
      editingOutlet,
      deletingId,
    },
    actions: {
      setSearch,
      setStatusFilter,
      setCompanyFilter,
      setWarehouseFilter,
      setSelectedOutletId,
      setIsSidebarOpen,
      setPanelMode,
      setIsDetailOpen,
      setViewingOutlet,
      setEditingOutlet,
      setDeletingId,
      handleOutletClick,
      handleCreate,
      handleEdit,
      handleView,
      handleClosePanel,
      handleDelete,
      refetch,
    },
    data: {
      outlets,
      markers,
      selectedOutlet,
      isLoading,
      isDeleting: deleteOutlet.isPending,
      companies: formData?.data?.companies ?? [],
      warehouses: undefined,
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
