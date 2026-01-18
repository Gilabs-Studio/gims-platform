"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import {
  Plus,
  Search,
  Building,
  Menu,
  X,
  Filter,
  Loader2,
  Bell,
  Settings,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapView, type MapMarker } from "@/components/ui/map/map-view";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserPermission } from "@/hooks/use-user-permission";
import { Link } from "@/i18n/routing";

import {
  useCompanies,
  useDeleteCompany,
  useApproveCompany,
  useSubmitCompanyForApproval,
} from "../../hooks/use-companies";
import type { Company, CompanyStatus } from "../../types";
import { CompanyCard } from "./company-card";
import { CompanySidePanel } from "./company-side-panel";
import { CompanyDetailDialog } from "./company-detail-dialog";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { toast } from "sonner";
import { ThemeToggleButton } from "@/components/ui/theme-toggle";
import { NotificationBadge } from "@/features/notifications/components/notification-badge";

// Dynamic import for Leaflet Marker/Popup
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

const statusColors: Record<CompanyStatus, string> = {
  draft: "bg-gray-100 text-gray-800",
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

type PanelMode = "create" | "edit" | "view" | null;

export function CompanyMapView() {
  const t = useTranslations("organization");
  const isMobile = useIsMobile();

  // State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CompanyStatus | "all">("all");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [viewingCompany, setViewingCompany] = useState<Company | null>(null);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Permissions
  const canCreate = useUserPermission("company.create");
  const canUpdate = useUserPermission("company.update");
  const canDelete = useUserPermission("company.delete");
  const canApprove = useUserPermission("company.approve");

  // Data fetching
  const { data, isLoading, refetch } = useCompanies({
    per_page: 100, // Get max allowed for map
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const deleteCompany = useDeleteCompany();
  const submitForApproval = useSubmitCompanyForApproval();
  const approveCompany = useApproveCompany();

  const companies = data?.data ?? [];

  // Filter companies with valid coordinates for map & ensure they are numbers
  const markers: MapMarker<Company>[] = useMemo(
    () => {
      const m = companies
        .filter((c) => {
          return c.latitude != null && c.longitude != null;
        })
        .map((c) => ({
          id: c.id,
          // Explicitly cast to Number to prevent string coordinate issues
          latitude: Number(c.latitude),
          longitude: Number(c.longitude),
          data: c,
        }));
      return m;
    },
    [companies]
  );

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

  const handleDelete = async () => {
    if (deletingId) {
      await deleteCompany.mutateAsync(deletingId);
      setDeletingId(null);
    }
  };

  const handleSubmitForApproval = async (company: Company) => {
    try {
      await submitForApproval.mutateAsync(company.id);
      toast.success(t("company.submitSuccess"));
    } catch {
      toast.error(t("common.error_update"));
    }
  };

  const handleApprove = async (company: Company) => {
    try {
      await approveCompany.mutateAsync({ id: company.id, data: { action: "approve" } });
      toast.success(t("company.approveSuccess"));
    } catch {
      toast.error(t("common.error_update"));
    }
  };

  const handleReject = async (company: Company) => {
    try {
      await approveCompany.mutateAsync({ id: company.id, data: { action: "reject" } });
      toast.success(t("company.rejectSuccess"));
    } catch {
      toast.error(t("common.error_update"));
    }
  };

  // Render markers on map
  const renderMarkers = (markerList: MapMarker<Company>[]) => (
    <>
      {markerList.map((marker) => {
        const company = marker.data;
        const isSelected = selectedCompanyId === marker.id;
        return (
          <Marker
            key={marker.id}
            position={[marker.latitude, marker.longitude]}
            eventHandlers={{
              click: () => setSelectedCompanyId(String(marker.id)),
            }}
          >
            <Popup>
              <div className="p-2 min-w-[220px]">
                <h3 className="font-bold text-sm mb-1">{company.name}</h3>
                {company.address && (
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                    {company.address}
                  </p>
                )}
                <Badge className={cn("text-xs mb-2", statusColors[company.status])}>
                  {t(`company.status.${company.status}`)}
                </Badge>
                <div className="flex flex-col gap-1 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full cursor-pointer"
                    onClick={() => handleView(company)}
                  >
                    View Details
                  </Button>
                  {canUpdate && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full cursor-pointer"
                      onClick={() => handleEdit(company)}
                    >
                      {t("common.edit")}
                    </Button>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );

  return (
    <div className="h-full w-full flex overflow-hidden">
      {/* Left Sidebar */}
      <div
        className={cn(
          "flex flex-col bg-background border-r transition-all duration-300 shrink-0",
          isMobile
            ? isSidebarOpen
              ? "absolute inset-y-0 left-0 z-30 w-80 shadow-xl"
              : "absolute inset-y-0 -left-80 z-30 w-80"
            : "w-80"
        )}
      >
        {/* Sidebar Header with Title & Actions */}
        <div className="shrink-0 border-b bg-background">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft className="h-5 w-5" />
              </Link>
              <Building className="h-5 w-5 text-primary" />
              <h1 className="font-semibold text-lg">{t("company.title")}</h1>
            </div>
            <div className="flex items-center gap-1">
              <NotificationBadge />
              <ThemeToggleButton />
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSidebarOpen(false)}
                  className="cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Search & Filter Row */}
          <div className="px-4 pb-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("common.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={statusFilter}
                onValueChange={(val) => setStatusFilter(val as CompanyStatus | "all")}
              >
                <SelectTrigger className="flex-1">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">{t("company.status.draft")}</SelectItem>
                  <SelectItem value="pending">{t("company.status.pending")}</SelectItem>
                  <SelectItem value="approved">{t("company.status.approved")}</SelectItem>
                  <SelectItem value="rejected">{t("company.status.rejected")}</SelectItem>
                </SelectContent>
              </Select>
              {canCreate && (
                <Button onClick={handleCreate} className="cursor-pointer shrink-0">
                  <Plus className="h-4 w-4 mr-1" />
                  {t("common.create")}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Company List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="p-4 border-b space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          ) : companies.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">{t("company.empty")}</p>
              {canCreate && (
                <Button 
                  variant="outline" 
                  className="mt-4 cursor-pointer"
                  onClick={handleCreate}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t("common.create")}
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="p-4 pb-2 flex items-center justify-between border-b bg-muted/50">
                <span className="text-sm text-muted-foreground">
                  {companies.length} {companies.length === 1 ? 'company' : 'companies'}
                </span>
                <Badge variant="secondary">{markers.length} on map</Badge>
              </div>
              {companies.map((company) => (
                <CompanyCard
                  key={company.id}
                  company={company}
                  isSelected={selectedCompanyId === company.id}
                  onClick={() => handleCompanyClick(company)}
                  t={t}
                  onDetail={() => handleView(company)}
                  onEdit={() => handleEdit(company)}
                  onDelete={() => setDeletingId(company.id)}
                  canUpdate={canUpdate}
                  canDelete={canDelete}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative">
        {/* Mobile Menu Toggle */}
        {isMobile && !isSidebarOpen && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-4 left-4 z-20 bg-background shadow-lg cursor-pointer"
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}

        {/* Map */}
        {isLoading ? (
          <div className="h-full w-full flex items-center justify-center bg-muted">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
              <p className="text-sm text-muted-foreground">Loading map...</p>
            </div>
          </div>
        ) : (
          <MapView
            markers={markers}
            renderMarkers={renderMarkers}
            className="h-full w-full"
            defaultCenter={[-6.2088, 106.8456]}
            defaultZoom={12}
            selectedMarkerId={selectedCompanyId}
          />
        )}
      </div>

      {/* Mobile Overlay */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Side Panel */}
      <CompanySidePanel
        isOpen={panelMode !== null}
        onClose={handleClosePanel}
        mode={panelMode ?? "create"}
        company={editingCompany}
        onSuccess={() => refetch()}
      />

      {/* Delete Dialog */}
      <DeleteDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        onConfirm={handleDelete}
        isLoading={deleteCompany.isPending}
        title={t("company.deleteTitle")}
        description={t("company.deleteConfirm")}
      />

      {/* Detail Dialog */}
      <CompanyDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        company={viewingCompany}
        onEdit={(company) => {
          setIsDetailOpen(false);
          handleEdit(company);
        }}
      />
    </div>
  );
}
