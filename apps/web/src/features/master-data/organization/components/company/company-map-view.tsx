"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { Link } from "@/i18n/routing";
import L from "leaflet";
import {
  Search,
  Building,
  Menu,
  X,
  Loader2,
  ChevronLeft,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
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
import { MapView, type MapMarker, MarkerClusterGroup } from "@/components/ui/map/map-view";
import { cn } from "@/lib/utils";

import { CompanyCard } from "./company-card";
import { CompanySidePanel } from "./company-side-panel";
import { CompanyDetailDialog } from "./company-detail-dialog";
import { ThemeToggleButton } from "@/components/ui/theme-toggle";
import { NotificationBadge } from "@/features/notifications/components/notification-badge";
import { useCompanyMapView } from "../../hooks/use-company-map-view";
import { useUpdateCompany } from "../../hooks/use-companies";
import type { Company } from "../../types";

const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });

const getMarkerIcon = (isActive: boolean) => {
  const color = isActive ? "#2563eb" : "#94a3b8";

  return L.icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 40" width="25" height="40">
        <path fill="${color}" d="M12.5,1 C6,1 1,6 1,12.5 C1,20 12.5,39 12.5,39 C12.5,39 24,20 24,12.5 C24,6 19,1 12.5,1 Z" />
        <circle cx="12.5" cy="12" r="4" fill="white" />
      </svg>`
    )}`,
    iconSize: [25, 40],
    iconAnchor: [12, 40],
    popupAnchor: [1, -34],
  });
};

export function CompanyMapView() {
  const { state, actions, data, permissions, layout, translations } = useCompanyMapView();
  const { isMobile } = layout;
  const { t } = translations;
  const updateCompany = useUpdateCompany();

  // Pan map to selected company when user clicks a sidebar card
  const flyToPosition = useMemo(() => {
    const sel = data.selectedCompany;
    if (sel?.latitude == null || sel?.longitude == null) return null;
    return { lat: Number(sel.latitude), lng: Number(sel.longitude) };
  }, [data.selectedCompany]);

  const renderMarkers = (markerList: MapMarker<Company>[]) => (
    <>
      <MarkerClusterGroup chunkedLoading>
        {markerList.map((marker) => {
          const company = marker.data;
          return (
            <Marker
              key={marker.id}
              position={[marker.latitude, marker.longitude]}
              icon={getMarkerIcon(company.is_active)}
              eventHandlers={{
                click: () => actions.setSelectedCompanyId(String(marker.id)),
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
                  <div className="flex flex-col gap-1 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full cursor-pointer"
                      onClick={() => actions.handleView(company)}
                    >
                      View Details
                    </Button>
                    {permissions.canUpdate && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full cursor-pointer"
                        onClick={() => actions.handleEdit(company)}
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
      </MarkerClusterGroup>
    </>
  );

  return (
    <div className="h-full w-full flex overflow-hidden">
      {/* Left Sidebar */}
      <div
        className={cn(
          "flex flex-col bg-background border-r transition-all duration-300 shrink-0",
          isMobile
            ? state.isSidebarOpen
              ? "absolute inset-y-0 left-0 z-30 w-80 shadow-xl"
              : "absolute inset-y-0 -left-80 z-30 w-80"
            : "w-80"
        )}
      >
        {/* Sidebar Header with Title & Actions */}
        <div className="shrink-0 border-b bg-background">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors mr-2">
                <ChevronLeft className="h-5 w-5" />
              </Link>
              <h1 className="font-semibold text-lg">{t("company.title")}</h1>
            </div>
            <div className="flex items-center gap-1">
              <NotificationBadge />
              <ThemeToggleButton />
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => actions.setIsSidebarOpen(false)}
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
                value={state.search}
                onChange={(e) => actions.setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={state.statusFilter ?? "all"}
                onValueChange={(v) =>
                  actions.setStatusFilter?.(v as "all" | "active" | "inactive")
                }
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder={t("common.status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">{t("common.active")}</SelectItem>
                  <SelectItem value="inactive">{t("common.inactive")}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                asChild
                variant="outline"
                className="w-full sm:w-auto cursor-pointer whitespace-nowrap"
              >
                <a
                  href="https://wa.me/6289526770703?text=Hi%20GiLabs%20Sales%2C%20I%20want%20to%20add%20a%20company%20to%20my%20account."
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("company.contactSales.ariaLabel")}
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  {t("company.contactSales.button")}
                </a>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("company.contactSales.description")}
            </p>
          </div>
        </div>

        {/* Company List */}
        <div className="flex-1 overflow-y-auto">
          {data.isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="p-4 border-b space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          ) : data.companies.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">{t("company.empty")}</p>
              <p className="text-xs mt-1 mb-4">{t("company.contactSales.description")}</p>
              <Button
                asChild
                variant="outline"
                className="cursor-pointer"
              >
                <a
                  href="https://wa.me/6289526770703?text=Hi%20GiLabs%20Sales%2C%20I%20want%20to%20add%20a%20company%20to%20my%20account."
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("company.contactSales.ariaLabel")}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  {t("company.contactSales.buttonWithNumber")}
                </a>
              </Button>
            </div>
          ) : (
            <>
              <div className="p-4 pb-2 flex items-center justify-between border-b bg-muted/50">
                <span className="text-sm text-muted-foreground">
                  {data.companies.length} {data.companies.length === 1 ? 'company' : 'companies'}
                </span>
                <Badge variant="secondary">{data.markers.length} on map</Badge>
              </div>
              {data.companies.map((company) => (
                <CompanyCard
                  key={company.id}
                  company={company}
                  isSelected={state.selectedCompanyId === company.id}
                  onClick={() => actions.handleCompanyClick(company)}
                  t={t}
                  onDetail={() => actions.handleView(company)}
                  onEdit={() => actions.handleEdit(company)}
                  onStatusChange={permissions.canUpdate ? (isActive) => {
                    updateCompany.mutate(
                      { id: company.id, data: { is_active: isActive } },
                      {
                        onSuccess: () => {
                          toast.success(
                            isActive
                              ? t("company.activeSuccess")
                              : t("company.inactiveSuccess")
                          );
                        },
                        onError: () => {
                          toast.error(t("company.updateError"));
                        },
                      }
                    );
                  } : undefined}
                  canUpdate={permissions.canUpdate}
                  isStatusChanging={updateCompany.isPending}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative">
        {/* Mobile Menu Toggle */}
        {isMobile && !state.isSidebarOpen && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => actions.setIsSidebarOpen(true)}
            className="absolute top-4 left-4 z-20 bg-background shadow-lg cursor-pointer"
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}

        {/* Map */}
        {data.isLoading ? (
          <div className="h-full w-full flex items-center justify-center bg-muted">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
              <p className="text-sm text-muted-foreground">Loading map...</p>
            </div>
          </div>
        ) : (
          <MapView
            markers={data.markers}
            renderMarkers={renderMarkers}
            className="h-full w-full"
            defaultCenter={[-6.2088, 106.8456]}
            defaultZoom={12}
            selectedMarkerId={state.selectedCompanyId}
            flyToPosition={flyToPosition}
          />
        )}
      </div>

      {/* Mobile Overlay */}
      {isMobile && state.isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20"
          onClick={() => actions.setIsSidebarOpen(false)}
        />
      )}

      {/* Side Panel */}
      <CompanySidePanel
        isOpen={state.panelMode !== null}
        onClose={actions.handleClosePanel}
        mode={state.panelMode ?? "create"}
        company={state.editingCompany}
        onSuccess={() => actions.refetch()}
      />

      {/* Detail Dialog */}
      <CompanyDetailDialog
        open={state.isDetailOpen}
        onOpenChange={actions.setIsDetailOpen}
        company={state.viewingCompany}
        onEdit={(company) => {
          actions.setIsDetailOpen(false);
          actions.handleEdit(company);
        }}
      />
    </div>
  );
}
