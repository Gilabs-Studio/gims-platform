"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, useEffect } from "react";
import { Link } from "@/i18n/routing";
import L from "leaflet";
import {
  Plus,
  Search,
  Store,
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

import { OutletCard } from "./outlet-card";
import { OutletSidePanel } from "./outlet-side-panel";
import { OutletDetailDialog } from "./outlet-detail-dialog";
import { OutletAddonDialog } from "./outlet-addon-dialog";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ThemeToggleButton } from "@/components/ui/theme-toggle";
import { NotificationBadge } from "@/features/notifications/components/notification-badge";
import { useOutletMapView } from "../../hooks/use-outlet-map-view";
import type { Outlet } from "../../types";
import { useWarehouses } from "@/features/master-data/warehouse/hooks/use-warehouses";
import { useUpdateOutlet } from "../../hooks/use-outlets";
import { billingService } from "@/features/settings/services/billing-service";
import { authService } from "@/features/auth/services/auth-service";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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

export function OutletMapView() {
  const { state, actions, data, permissions, layout, translations } = useOutletMapView();
  const { isMobile } = layout;
  const { t } = translations;
  const updateOutlet = useUpdateOutlet();
  const { data: warehousesResp } = useWarehouses({ per_page: 100, is_active: true });

  const queryClient = useQueryClient();
  const [addonDialogOpen, setAddonDialogOpen] = useState(false);
  const [addonQuantity, setAddonQuantity] = useState(1);
  const [isAddonSubmitting, setIsAddonSubmitting] = useState(false);

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
    if (!subscription) return 500000;
    const activePlan = plans?.find((plan) => plan.slug === subscription.plan);
    if (!activePlan) return 500000;
    if (subscription.billing_period === "yearly") {
      return activePlan.outlet_addon_yearly_idr ?? 6000000;
    }
    return activePlan.outlet_addon_monthly_idr ?? 500000;
  }, [plans, subscription]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onOpenAddon = () => {
      setAddonQuantity(1);
      setAddonDialogOpen(true);
    };
    window.addEventListener("open-outlet-addon", onOpenAddon as EventListener);
    return () => window.removeEventListener("open-outlet-addon", onOpenAddon as EventListener);
  }, []);

  // Derive fly-to position from the currently selected outlet so the map
  // pans to the marker whenever the user clicks an item in the sidebar list.
  const flyToPosition = useMemo(() => {
    const sel = data.selectedOutlet;
    if (sel?.latitude == null || sel?.longitude == null) return null;
    return { lat: Number(sel.latitude), lng: Number(sel.longitude) };
  }, [data.selectedOutlet]);

  const renderMarkers = (markerList: MapMarker<Outlet>[]) => (
    <MarkerClusterGroup chunkedLoading>
      {markerList.map((marker) => {
        const outlet = marker.data;
        return (
          <Marker
            key={marker.id}
            position={[marker.latitude, marker.longitude]}
            icon={getMarkerIcon(outlet.is_active)}
            eventHandlers={{
              click: () => actions.setSelectedOutletId(String(marker.id)),
            }}
          >
            <Popup>
              <div className="p-2 min-w-[220px]">
                <h3 className="font-bold text-sm mb-1">{outlet.name}</h3>
                <p className="font-mono text-xs text-muted-foreground mb-1">{outlet.code}</p>
                {outlet.address && (
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                    {outlet.address}
                  </p>
                )}
                <div className="flex flex-col gap-1 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full cursor-pointer"
                    onClick={() => actions.handleView(outlet)}
                  >
                    View Details
                  </Button>
                  {permissions.canUpdate && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full cursor-pointer"
                      onClick={() => actions.handleEdit(outlet)}
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
              <h1 className="font-semibold text-lg">{t("outlet.title")}</h1>
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

          {/* Search & Filter */}
          <div className="px-4 pb-4 space-y-3">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("common.search")}
                value={state.search}
                onChange={(e) => actions.setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Status filter + Create button */}
            <div className="flex items-center gap-2">
              <Select
                value={state.statusFilter ?? "all"}
                onValueChange={(v) =>
                  actions.setStatusFilter(v as "all" | "active" | "inactive")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("common.status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">{t("common.active")}</SelectItem>
                  <SelectItem value="inactive">{t("common.inactive")}</SelectItem>
                </SelectContent>
              </Select>

              {permissions.canCreate && (
                <Button
                  onClick={actions.handleCreate}
                  variant={data.outletLimit && data.outletLimit.max > 0 && data.outletLimit.current >= data.outletLimit.max ? "destructive" : undefined}
                  className="shrink-0 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  {t("common.create")}
                </Button>
              )}
            </div>

            {/* Company filter */}
            {data.companies?.length ? (
              <Select
                value={state.companyFilter ?? "all"}
                onValueChange={(v) => actions.setCompanyFilter(v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {data.companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}

            {/* Warehouse filter */}
            {warehousesResp?.data?.length ? (
              <Select
                value={state.warehouseFilter ?? "all"}
                onValueChange={(v) => actions.setWarehouseFilter(v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Warehouses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Warehouses</SelectItem>
                  {warehousesResp.data.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>
        </div>

        {/* Outlet List */}
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
          ) : data.outlets.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Store className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">{t("outlet.empty")}</p>
              {permissions.canCreate && (
                <Button
                  variant={data.outletLimit && data.outletLimit.max > 0 && data.outletLimit.current >= data.outletLimit.max ? "destructive" : "outline"}
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
                    {data.outletLimit ? (
                      <span
                        className={cn(
                          "text-sm font-medium",
                          data.outletLimit.max > 0 && data.outletLimit.current >= data.outletLimit.max
                            ? "text-destructive"
                            : "text-muted-foreground"
                        )}
                      >
                      {t("outlet.limitBadge", {
                        current: data.outletLimit.current,
                        max: data.outletLimit.max,
                      })}{" "}
                      {data.outletLimit.max === 1 ? t("outlet.singular") : t("outlet.plural")}
                    </span>
                  ) : (
                    <span>
                      {data.outlets.length}{" "}
                      {data.outlets.length === 1 ? "outlet" : "outlets"}
                    </span>
                  )}
                </span>
                <Badge variant="secondary">{data.markers.length} on map</Badge>
              </div>
              {data.outlets.map((outlet) => (
                <OutletCard
                  key={outlet.id}
                  outlet={outlet}
                  isSelected={state.selectedOutletId === outlet.id}
                  onClick={() => actions.handleOutletClick(outlet)}
                  t={t}
                  onDetail={() => actions.handleView(outlet)}
                  onEdit={() => actions.handleEdit(outlet)}
                  onDelete={() => actions.setDeletingId(outlet.id)}
                  onStatusChange={
                    permissions.canUpdate
                      ? (isActive) => {
                          updateOutlet.mutate(
                            { id: outlet.id, data: { is_active: isActive } },
                            {
                              onSuccess: () => {
                                toast.success(t("outlet.updateSuccess"));
                              },
                              onError: () => {
                                toast.error(t("outlet.saveError"));
                              },
                            }
                          );
                        }
                      : undefined
                  }
                  canUpdate={permissions.canUpdate}
                  canDelete={permissions.canDelete}
                  isStatusChanging={updateOutlet.isPending}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative">
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
            selectedMarkerId={state.selectedOutletId}
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

      {/* Side Panel (Create / Edit) */}
      <OutletSidePanel
        isOpen={state.panelMode !== null}
        onClose={actions.handleClosePanel}
        mode={state.panelMode ?? "create"}
        outlet={state.editingOutlet}
        onSuccess={() => actions.refetch()}
      />

      {/* Addon Dialog (open when limit reached) */}
      <OutletAddonDialog
        open={addonDialogOpen}
        onOpenChange={(open) => setAddonDialogOpen(open)}
        current={data.outletLimit?.current ?? 0}
        max={data.outletLimit?.max ?? 0}
        quantity={addonQuantity}
        onQuantityChange={setAddonQuantity}
        unitPrice={addonUnitPrice}
        isSubmitting={isAddonSubmitting}
        onSubmit={async () => {
          if (!data.outletLimit) return;
          setIsAddonSubmitting(true);
          try {
            const actionDate = new Date().toISOString().slice(0, 10);
            const nextOutletLimit = data.outletLimit.max + addonQuantity;
            const result = await billingService.changeSubscription({
              action: "add_outlet",
              target: String(nextOutletLimit),
              action_date: actionDate,
              idempotency_key: `outlet-addon-${actionDate}-${nextOutletLimit}`,
            });

            toast.success(result.user_notification?.title || t("outlet.addon.invoiceReady"));
            if (typeof window !== "undefined") {
              window.localStorage.setItem("outlet_create_resume_intent", actionDate);
            }

            const rawInvoiceUrl = result.xendit_payload?.invoice_url;
            const invoiceUrl = typeof rawInvoiceUrl === "string" ? rawInvoiceUrl : "";
            setAddonDialogOpen(false);

            await queryClient.invalidateQueries({ queryKey: ["outlets", "limit"] });

            if (invoiceUrl) {
              window.open(invoiceUrl, "_blank", "noopener,noreferrer");
            } else {
              actions.setEditingOutlet(null);
              actions.setPanelMode("create");
            }
          } catch {
            toast.error(t("outlet.addon.invoiceError"));
          } finally {
            setIsAddonSubmitting(false);
          }
        }}
      />

      {/* Delete Dialog */}
      <DeleteDialog
        open={!!state.deletingId}
        onOpenChange={(open) => !open && actions.setDeletingId(null)}
        onConfirm={actions.handleDelete}
        isLoading={data.isDeleting}
        title={t("outlet.deleteTitle")}
        description={t("outlet.deleteConfirm")}
      />

      {/* Detail Dialog */}
      <OutletDetailDialog
        open={state.isDetailOpen}
        onOpenChange={actions.setIsDetailOpen}
        outlet={state.viewingOutlet}
        onEdit={(outlet) => {
          actions.setIsDetailOpen(false);
          actions.handleEdit(outlet);
        }}
      />
    </div>
  );
}