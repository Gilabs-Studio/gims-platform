"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import {
  Plus,
  Search,
  Building2,
  Menu,
  X,
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
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserPermission } from "@/hooks/use-user-permission";
import { Link } from "@/i18n/routing";
import { useDebounce } from "@/hooks/use-debounce";

import {
  useSuppliers,
  useDeleteSupplier,
} from "../../hooks/use-suppliers";
import { useSupplierTypes } from "../../hooks/use-supplier-types";
import type { Supplier } from "../../types";
import { SupplierCard } from "./supplier-card";
import { SupplierSidePanel } from "./supplier-side-panel";
import { SupplierDetailModal } from "./supplier-detail-modal";
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

type PanelMode = "create" | "edit" | "view" | null;

export function SupplierMapView() {
  const t = useTranslations("supplier.supplier");
  const tCommon = useTranslations("supplier.common");
  const isMobile = useIsMobile();

  // State
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Permissions
  const canCreate = useUserPermission("supplier.create");
  const canUpdate = useUserPermission("supplier.update");
  const canDelete = useUserPermission("supplier.delete");

  // Data fetching
  const { data, isLoading, refetch } = useSuppliers({
    per_page: 20,
    search: debouncedSearch || undefined,
    supplier_type_id: typeFilter !== "all" ? typeFilter : undefined,
  });

  const { data: supplierTypesData } = useSupplierTypes({ per_page: 20 });
  const supplierTypes = supplierTypesData?.data ?? [];

  const deleteSupplier = useDeleteSupplier();

  const suppliers = useMemo(() => data?.data ?? [], [data?.data]);

  // Filter suppliers with valid coordinates for map
  const markers: MapMarker<Supplier>[] = useMemo(
    () =>
      suppliers
        .filter((s) => s.latitude != null && s.longitude != null)
        .map((s) => ({
          id: s.id,
          latitude: Number(s.latitude),
          longitude: Number(s.longitude),
          data: s,
        })),
    [suppliers]
  );

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.id === selectedSupplierId),
    [suppliers, selectedSupplierId]
  ); // Used for future feature: scroll-to-card on map marker click
  void selectedSupplier;

  // Handlers
  const handleSupplierClick = (supplier: Supplier) => {
    setSelectedSupplierId(supplier.id);
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const handleCreate = () => {
    setEditingSupplier(null);
    setPanelMode("create");
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setPanelMode("edit");
  };

  const handleView = (supplier: Supplier) => {
    setViewingSupplier(supplier);
    setIsDetailOpen(true);
  };

  const handleClosePanel = () => {
    setPanelMode(null);
    setEditingSupplier(null);
  };

  const handleDelete = async () => {
    if (deletingId) {
      try {
        await deleteSupplier.mutateAsync(deletingId);
        toast.success(t("deleteSuccess"));
        setDeletingId(null);
      } catch {
        toast.error(tCommon("error_update"));
      }
    }
  };

  // Render markers on map
  const renderMarkers = (markerList: MapMarker<Supplier>[]) => (
    <>
      <MarkerClusterGroup chunkedLoading>
        {markerList.map((marker) => {
          const supplier = marker.data;
          return (
            <Marker
              key={marker.id}
              position={[marker.latitude, marker.longitude]}
              eventHandlers={{
                click: () => setSelectedSupplierId(String(marker.id)),
              }}
            >
              <Popup>
                <div className="p-2 min-w-[220px]">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-sm">{supplier.name}</h3>
                  </div>
                  {supplier.address && (
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {supplier.address}
                    </p>
                  )}
                  <Badge variant={supplier.is_active ? "active" : "inactive"} className="text-xs mb-2">
                    {supplier.is_active ? "Active" : "Inactive"}
                  </Badge>
                  <div className="flex flex-col gap-1 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full cursor-pointer"
                      onClick={() => handleView(supplier)}
                    >
                      View Details
                    </Button>
                    {canUpdate && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full cursor-pointer"
                        onClick={() => handleEdit(supplier)}
                      >
                        {tCommon("edit")}
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
            ? isSidebarOpen
              ? "absolute inset-y-0 left-0 z-30 w-80 shadow-xl"
              : "absolute inset-y-0 -left-80 z-30 w-80"
            : "w-80"
        )}
      >
        {/* Sidebar Header */}
        <div className="shrink-0 border-b bg-background">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="text-muted-foreground hover:text-foreground transition-colors mr-2"
              >
                <ChevronLeft className="h-5 w-5" />
              </Link>
              <h1 className="font-semibold text-lg">{t("title")}</h1>
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

          {/* Search & Filter */}
          <div className="px-4 pb-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={tCommon("search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={typeFilter}
                onValueChange={(val) => setTypeFilter(val)}
              >
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {supplierTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {canCreate && (
                <Button
                  onClick={handleCreate}
                  className={
                    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:shadow-[0_0_20px] focus-visible:shadow-primary/30 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive relative overflow-hidden bg-primary text-primary-foreground hover:bg-primary/90 gradient-primary hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 h-9 px-4 py-2 has-[>svg]:px-3 w-full sm:w-[160px] cursor-pointer"
                  }
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {tCommon("create")}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Supplier List */}
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
          ) : suppliers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">{t("empty")}</p>
              {canCreate && (
                <Button
                  variant="outline"
                  className="mt-4 cursor-pointer"
                  onClick={handleCreate}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {tCommon("create")}
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="p-4 pb-2 flex items-center justify-between border-b bg-muted/50">
                <span className="text-sm text-muted-foreground">
                  {suppliers.length} {suppliers.length === 1 ? "supplier" : "suppliers"}
                </span>
                <Badge variant="secondary">{markers.length} on map</Badge>
              </div>
              {suppliers.map((supplier) => (
                <SupplierCard
                  key={supplier.id}
                  supplier={supplier}
                  isSelected={selectedSupplierId === supplier.id}
                  onClick={() => handleSupplierClick(supplier)}
                  t={t}
                  tCommon={tCommon}
                  onDetail={() => handleView(supplier)}
                  onEdit={() => handleEdit(supplier)}
                  onDelete={() => setDeletingId(supplier.id)}
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
            selectedMarkerId={selectedSupplierId}
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
      <SupplierSidePanel
        isOpen={panelMode !== null}
        onClose={handleClosePanel}
        mode={panelMode ?? "create"}
        supplier={editingSupplier}
        onSuccess={() => refetch()}
      />

      {/* Delete Dialog */}
      <DeleteDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        onConfirm={handleDelete}
        isLoading={deleteSupplier.isPending}
        title={t("deleteTitle")}
        description={t("deleteConfirm")}
      />

      {/* Detail Dialog */}
      <SupplierDetailModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        supplier={viewingSupplier}
        onEdit={handleEdit}
      />
    </div>
  );
}
