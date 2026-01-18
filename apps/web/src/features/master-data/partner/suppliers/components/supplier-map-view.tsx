"use client";

import { useEffect } from "react";
import { Package, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";
import type { Supplier } from "@/features/master-data/partner/suppliers/types";
import dynamic from "next/dynamic";
import { MapView, type MapMarker, MarkerClusterGroup } from "@/components/ui/map/map-view";
import { MapSidebar } from "@/components/ui/map/map-sidebar";

// Dynamic import untuk Leaflet (client-side only)
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);

const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

// Component untuk handle map navigation (must be inside MapContainer)
const MapNavigator = dynamic(
  () =>
    import("react-leaflet").then((mod) => {
      const { useMap } = mod;
      return function MapNavigator({
        selectedSupplierId,
        suppliers,
      }: {
        selectedSupplierId: number | null;
        suppliers: Supplier[];
      }) {
        const map = useMap();

        useEffect(() => {
          if (selectedSupplierId) {
            const supplier = suppliers.find((c) => c.id === selectedSupplierId);
            if (supplier && supplier.latitude != null && supplier.longitude != null) {
              const lat = Number(supplier.latitude);
              const lng = Number(supplier.longitude);
              if (!isNaN(lat) && !isNaN(lng)) {
                map.setView([lat, lng], 15, {
                  animate: true,
                  duration: 0.5,
                });
              }
            }
          }
        }, [selectedSupplierId, suppliers, map]);

        return null;
      };
    }),
  { ssr: false }
);

interface SupplierMapViewProps {
  readonly suppliers: Supplier[];
  readonly onSupplierClick?: (supplier: Supplier) => void;
  readonly onViewDetail?: (supplier: Supplier) => void;
  readonly selectedSupplierId?: number | null;
  readonly className?: string;
  readonly showSidebar?: boolean;
  readonly onToggleSidebar?: () => void;
}


export function SupplierMapView({
  suppliers,
  onSupplierClick,
  onViewDetail,
  selectedSupplierId,
  className,
  showSidebar = false,
  onToggleSidebar,
}: SupplierMapViewProps) {
  // Convert suppliers to markers
  const markers: MapMarker<Supplier>[] = suppliers
    .filter((c) => c.latitude != null && c.longitude != null && !isNaN(Number(c.latitude)) && !isNaN(Number(c.longitude)))
    .map((supplier) => ({
      id: supplier.id,
      latitude: Number(supplier.latitude),
      longitude: Number(supplier.longitude),
      data: supplier,
    }));

  const renderMarkers = (markers: MapMarker<Supplier>[]) => {
    return (
      <>
        <MarkerClusterGroup chunkedLoading>
          {markers.map((marker) => {
            const supplier = marker.data;
            const lat = Number(marker.latitude);
            const lng = Number(marker.longitude);
            if (isNaN(lat) || isNaN(lng)) return null;

            return (
              <Marker
                key={marker.id}
                position={[lat, lng]}
                eventHandlers={{
                  click: () => {
                    onSupplierClick?.(supplier);
                  },
                }}
              >
                <Popup className="min-w-[200px]">
                  <div className="p-3 space-y-2">
                    <div>
                      <h3 className="font-semibold text-sm mb-1">{supplier.name}</h3>
                      {supplier.address && (
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{supplier.address}</p>
                      )}
                      <Badge variant={supplier.is_approved ? "default" : "secondary"} className="text-xs">
                        {supplier.is_approved ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Approved
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            Pending
                          </>
                        )}
                      </Badge>
                    </div>
                    {onViewDetail && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewDetail(supplier);
                        }}
                      >
                        <Eye className="h-3 w-3 mr-1.5" />
                        View Details
                      </Button>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>
      </>
    );
  };

  return (
    <MapView
      markers={markers}
      renderMarkers={renderMarkers}
      selectedMarkerId={selectedSupplierId}
      className={className}
      showSidebar={showSidebar}
      onToggleSidebar={onToggleSidebar}
    >
      <MapNavigator selectedSupplierId={selectedSupplierId ?? null} suppliers={suppliers} />
    </MapView>
  );
}

interface SupplierMapSidebarProps {
  readonly suppliers: Supplier[];
  readonly onSupplierClick?: (supplier: Supplier) => void;
  readonly onViewDetail?: (supplier: Supplier) => void;
  readonly selectedSupplierId?: number | null;
  readonly className?: string;
  readonly isOpen?: boolean;
  readonly onClose?: () => void;
}

export function SupplierMapSidebar({
  suppliers,
  onSupplierClick,
  onViewDetail,
  selectedSupplierId,
  className,
  isOpen = true,
  onClose,
}: SupplierMapSidebarProps) {
  const renderItem = (supplier: Supplier) => (
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Package className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium truncate cursor-pointer">{supplier.name}</span>
        </div>
        {supplier.address && (
          <p className="text-xs text-muted-foreground truncate mb-2">
            {supplier.address}
          </p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={supplier.is_approved ? "default" : "secondary"} className="text-xs">
            {supplier.is_approved ? (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Approved
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3 mr-1" />
                Pending
              </>
            )}
          </Badge>
          {supplier.city?.name && (
            <span className="text-xs text-muted-foreground">
              {supplier.city.name}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <MapSidebar
      items={suppliers}
      selectedItemId={selectedSupplierId}
      onItemClick={onSupplierClick}
      onViewDetail={onViewDetail}
      renderItem={renderItem}
      emptyMessage="No suppliers found"
      title="Suppliers"
      className={className}
      isOpen={isOpen}
      onClose={onClose}
      estimateItemHeight={140} // Height including padding and button
    />
  );
}
