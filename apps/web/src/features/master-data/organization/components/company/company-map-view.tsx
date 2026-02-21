"use client";

import dynamic from "next/dynamic";
import { Link } from "@/i18n/routing";
import {
  Plus,
  Search,
  Building,
  Menu,
  X,
  Filter,
  Loader2,
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
import { MapView, type MapMarker, MarkerClusterGroup } from "@/components/ui/map/map-view";
import { cn } from "@/lib/utils";

import { CompanyCard } from "./company-card";
import { CompanySidePanel } from "./company-side-panel";
import { CompanyDetailDialog } from "./company-detail-dialog";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ThemeToggleButton } from "@/components/ui/theme-toggle";
import { NotificationBadge } from "@/features/notifications/components/notification-badge";
import { useCompanyMapView } from "../../hooks/use-company-map-view";
import type { Company, CompanyStatus } from "../../types";

const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });

const statusColors: Record<CompanyStatus, string> = {
  draft: "bg-gray-100 text-gray-800",
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export function CompanyMapView() {
  const { state, actions, data, permissions, layout, translations } = useCompanyMapView();
  const { isMobile } = layout;
  const { t } = translations;

  const renderMarkers = (markerList: MapMarker<Company>[]) => (
    <>
      <MarkerClusterGroup chunkedLoading>
        {markerList.map((marker) => {
          const company = marker.data;
          const isSelected = state.selectedCompanyId === marker.id;
          return (
            <Marker
              key={marker.id}
              position={[marker.latitude, marker.longitude]}
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
                  <Badge className={cn("text-xs mb-2", statusColors[company.status])}>
                    {t(`company.status.${company.status}`)}
                  </Badge>
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
                value={state.statusFilter}
                onValueChange={(val) => actions.setStatusFilter(val as CompanyStatus | "all")}
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
              {permissions.canCreate && (
                <Button onClick={actions.handleCreate} className="cursor-pointer shrink-0">
                  <Plus className="h-4 w-4 mr-1" />
                  {t("common.create")}
                </Button>
              )}
            </div>
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
              {permissions.canCreate && (
                <Button 
                  variant="outline" 
                  className="mt-4 cursor-pointer"
                  onClick={actions.handleCreate}
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
                  onDelete={() => actions.setDeletingId(company.id)}
                  canUpdate={permissions.canUpdate}
                  canDelete={permissions.canDelete}
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

      {/* Delete Dialog */}
      <DeleteDialog
        open={!!state.deletingId}
        onOpenChange={(open) => !open && actions.setDeletingId(null)}
        onConfirm={actions.handleDelete}
        isLoading={data.isDeleting}
        title={t("company.deleteTitle")}
        description={t("company.deleteConfirm")}
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
