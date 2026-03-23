"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import {
  Plus,
  Search,
  Warehouse,
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
  useWarehouses,
  useDeleteWarehouse,
} from "../../hooks/use-warehouses";
import type { Warehouse as WarehouseType } from "../../types";
import { WarehouseCard } from "./warehouse-card";
import { WarehouseSidePanel } from "./warehouse-side-panel";
import { WarehouseDetailModal } from "./warehouse-detail-modal";
import { WarehouseDeleteBlockedDialog } from "./warehouse-delete-blocked-dialog";
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

export function WarehouseMapView() {
  const t = useTranslations("warehouse");
  // tCommon is just an alias for t now since we use root scope
  // and we will use full paths like t("common.search")
  const isMobile = useIsMobile();

  // State
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [viewingWarehouse, setViewingWarehouse] = useState<WarehouseType | null>(null);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseType | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [blockedDeleteId, setBlockedDeleteId] = useState<string | null>(null);

  // Permissions
  const canCreate = useUserPermission("warehouse.create");
  const canUpdate = useUserPermission("warehouse.update");
  const canDelete = useUserPermission("warehouse.delete");

  // Data fetching
  const { data, isLoading, refetch } = useWarehouses({
    per_page: 20,
    search: debouncedSearch || undefined,
    is_active: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const deleteWarehouse = useDeleteWarehouse();

  const warehouses = data?.data ?? [];

  // Filter warehouses with valid coordinates for map
  const markers: MapMarker<WarehouseType>[] = useMemo(
    () =>
      warehouses
        .filter((w) => w.latitude != null && w.longitude != null)
        .map((w) => ({
          id: w.id,
          latitude: Number(w.latitude),
          longitude: Number(w.longitude),
          data: w,
        })),
    [warehouses]
  );

  const selectedWarehouse = useMemo(
    () => warehouses.find((w) => w.id === selectedWarehouseId),
    [warehouses, selectedWarehouseId]
  );

  // Handlers
  const handleWarehouseClick = (warehouse: WarehouseType) => {
    setSelectedWarehouseId(warehouse.id);
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const handleCreate = () => {
    setEditingWarehouse(null);
    setPanelMode("create");
  };

  const handleEdit = (warehouse: WarehouseType) => {
    setEditingWarehouse(warehouse);
    setPanelMode("edit");
  };

  const handleView = (warehouse: WarehouseType) => {
    setViewingWarehouse(warehouse);
    setIsDetailOpen(true);
  };

  const handleClosePanel = () => {
    setPanelMode(null);
    setEditingWarehouse(null);
  };

  const handleDelete = async () => {
    if (deletingId) {
      try {
        await deleteWarehouse.mutateAsync(deletingId);
        toast.success(t("warehouse.deleteSuccess"));
        setDeletingId(null);
      } catch {
        toast.error(t("common.error_update"));
      }
    }
  };

  // Render markers on map
  const renderMarkers = (markerList: MapMarker<WarehouseType>[]) => (
    <>
      <MarkerClusterGroup chunkedLoading>
        {markerList.map((marker) => {
          const warehouse = marker.data;
          return (
            <Marker
              key={marker.id}
              position={[marker.latitude, marker.longitude]}
              eventHandlers={{
                click: () => setSelectedWarehouseId(String(marker.id)),
              }}
            >
              <Popup>
                <div className="p-2 min-w-[220px]">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-sm">{warehouse.name}</h3>
                  </div>
                  {warehouse.address && (
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {warehouse.address}
                    </p>
                  )}
                  <Badge 
                    className="text-xs mb-2"
                    variant={warehouse.is_active ? "success" : "secondary"}
                  >
                    {warehouse.is_active ? t("common.active") : t("common.inactive")}
                  </Badge>
                  <div className="flex flex-col gap-1 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full cursor-pointer"
                      onClick={() => handleView(warehouse)}
                    >
                      View Details
                    </Button>
                    {canUpdate && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full cursor-pointer"
                        onClick={() => handleEdit(warehouse)}
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
              <h1 className="font-semibold text-lg">{t("warehouse.title")}</h1>
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
                placeholder={t("common.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={activeFilter}
                onValueChange={(val) => setActiveFilter(val as "all" | "active" | "inactive")}
              >
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">{t("common.active")}</SelectItem>
                  <SelectItem value="inactive">{t("common.inactive")}</SelectItem>
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
                  {t("common.create")}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Warehouse List */}
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
          ) : warehouses.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Warehouse className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">{t("warehouse.empty")}</p>
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
                  {warehouses.length} {warehouses.length === 1 ? "warehouse" : "warehouses"}
                </span>
                <Badge variant="secondary">{markers.length} on map</Badge>
              </div>
              {warehouses.map((warehouse) => (
                <WarehouseCard
                  key={warehouse.id}
                  warehouse={warehouse}
                  isSelected={selectedWarehouseId === warehouse.id}
                  onClick={() => handleWarehouseClick(warehouse)}
                  t={(key) => t(key as Parameters<typeof t>[0])}
                  onDetail={() => handleView(warehouse)}
                  onEdit={() => handleEdit(warehouse)}
                  onDelete={() => {
                    console.log("Map View Delete clicked for item:", warehouse);
                    console.log("has_stock:", warehouse.has_stock);
                    if (warehouse.has_stock) {
                      setBlockedDeleteId(warehouse.id);
                    } else {
                      setDeletingId(warehouse.id);
                    }
                  }}
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
            selectedMarkerId={selectedWarehouseId}
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
      <WarehouseSidePanel
        isOpen={panelMode !== null}
        onClose={handleClosePanel}
        mode={panelMode ?? "create"}
        warehouse={editingWarehouse}
        onSuccess={() => refetch()}
      />

      {/* Delete Dialog */}
      <DeleteDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        onConfirm={handleDelete}
        isLoading={deleteWarehouse.isPending}
        title={t("warehouse.deleteTitle")}
        description={t("warehouse.deleteConfirm")}
      />

      {/* Blocked delete — warehouse still has stock */}
      <WarehouseDeleteBlockedDialog
        open={!!blockedDeleteId}
        onOpenChange={(open: boolean) => !open && setBlockedDeleteId(null)}
      />

      {/* Detail Dialog */}
      <WarehouseDetailModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        warehouse={viewingWarehouse}
        onEdit={handleEdit}
      />
    </div>
  );
}
