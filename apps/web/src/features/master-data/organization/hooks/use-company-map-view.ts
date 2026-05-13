"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { MapMarker } from "@/components/ui/map/map-view";
import {
  useCompanies,
  useSubmitCompanyForApproval,
} from "./use-companies";
import type { Company } from "../types";

export type PanelMode = "create" | "edit" | "view" | null;

export function useCompanyMapView() {
  const t = useTranslations("organization");
  const isMobile = useIsMobile();

  // Permissions
  const canCreate = useUserPermission("company.create");
  const canUpdate = useUserPermission("company.update");

  // State
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [typeFilter, setTypeFilter] = useState<string | "all">("all");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [viewingCompany, setViewingCompany] = useState<Company | null>(null);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  // Queries & Mutations
  const { data, isLoading, refetch } = useCompanies({
    per_page: 20, // Get max allowed for map
    search: debouncedSearch || undefined,
    is_active: statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined,
  });

  const submitForApproval = useSubmitCompanyForApproval();
  // Approval workflow disabled for single-company tenant model

  const companies = useMemo(() => data?.data ?? [], [data?.data]);

  // Filter companies with valid coordinates for map & ensure they are numbers
  const markers: MapMarker<Company>[] = useMemo(() => {
    return companies
      .filter((c) => c.latitude != null && c.longitude != null)
      .map((c) => ({
        id: c.id,
        // Explicitly cast to Number to prevent string coordinate issues
        latitude: Number(c.latitude),
        longitude: Number(c.longitude),
        data: c,
      }));
  }, [companies]);

  const selectedCompany = useMemo(
    () => companies.find((c) => c.id === selectedCompanyId),
    [companies, selectedCompanyId]
  );

  // Handlers
  const handleCompanyClick = (company: Company) => {
    setSelectedCompanyId(company.id);
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const handleCreate = () => {
    setEditingCompany(null);
    setPanelMode("create");
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setPanelMode("edit");
  };

  const handleView = (company: Company) => {
    setViewingCompany(company);
    setIsDetailOpen(true);
  };

  const handleClosePanel = () => {
    setPanelMode(null);
    setEditingCompany(null);
  };

  const handleSubmitForApproval = async (company: Company) => {
    try {
      await submitForApproval.mutateAsync(company.id);
      toast.success(t("company.submitSuccess"));
    } catch {
      toast.error(t("common.error_update"));
    }
  };

  // Approval workflow disabled for single-company tenant model

  return {
    state: {
      search,
      statusFilter,
      typeFilter,
      selectedCompanyId,
      isSidebarOpen,
      panelMode,
      isDetailOpen,
      viewingCompany,
      editingCompany,
    },
    actions: {
      setSearch,
      setStatusFilter,
      setTypeFilter,
      setSelectedCompanyId,
      setIsSidebarOpen,
      setPanelMode,
      setIsDetailOpen,
      setViewingCompany,
      setEditingCompany,
      handleCompanyClick,
      handleCreate,
      handleEdit,
      handleView,
      handleClosePanel,
      handleSubmitForApproval,
      refetch,
    },
    data: {
      companies,
      markers,
      selectedCompany,
      isLoading,
    },
    permissions: {
      canCreate,
      canUpdate,
    },
    layout: {
      isMobile,
    },
    translations: {
      t,
    },
  };
}
