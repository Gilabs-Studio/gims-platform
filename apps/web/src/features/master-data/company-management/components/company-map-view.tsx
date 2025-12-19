"use client";

import { useEffect } from "react";
import { Building, Eye } from "lucide-react";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";
import type { Company } from "@/features/master-data/company-management/types";
import dynamic from "next/dynamic";
import { MapView, type MapMarker } from "../../../../components/ui/map/map-view";
import { MapSidebar } from "../../../../components/ui/map/map-sidebar";

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
        selectedCompanyId,
        companies,
      }: {
        selectedCompanyId: number | null;
        companies: Company[];
      }) {
        const map = useMap();

        useEffect(() => {
          if (selectedCompanyId) {
            const company = companies.find((c) => c.id === selectedCompanyId);
            if (company && company.latitude != null && company.longitude != null) {
              const lat = Number(company.latitude);
              const lng = Number(company.longitude);
              if (!isNaN(lat) && !isNaN(lng)) {
                map.setView([lat, lng], 15, {
                  animate: true,
                  duration: 0.5,
                });
              }
            }
          }
        }, [selectedCompanyId, companies, map]);

        return null;
      };
    }),
  { ssr: false }
);

interface CompanyMapViewProps {
  readonly companies: Company[];
  readonly onCompanyClick?: (company: Company) => void;
  readonly onViewDetail?: (company: Company) => void;
  readonly selectedCompanyId?: number | null;
  readonly className?: string;
  readonly showSidebar?: boolean;
  readonly onToggleSidebar?: () => void;
}


export function CompanyMapView({
  companies,
  onCompanyClick,
  onViewDetail,
  selectedCompanyId,
  className,
  showSidebar = false,
  onToggleSidebar,
}: CompanyMapViewProps) {
  // Convert companies to markers
  const markers: MapMarker<Company>[] = companies
    .filter((c) => c.latitude != null && c.longitude != null && !isNaN(Number(c.latitude)) && !isNaN(Number(c.longitude)))
    .map((company) => ({
      id: company.id,
      latitude: Number(company.latitude),
      longitude: Number(company.longitude),
      data: company,
    }));

  const renderMarkers = (markers: MapMarker<Company>[]) => {
    return (
      <>
        {markers.map((marker) => {
          const company = marker.data;
          const lat = Number(marker.latitude);
          const lng = Number(marker.longitude);
          if (isNaN(lat) || isNaN(lng)) return null;

          return (
            <Marker
              key={marker.id}
              position={[lat, lng]}
              eventHandlers={{
                click: () => {
                  onCompanyClick?.(company);
                },
              }}
            >
              <Popup className="min-w-[200px]">
                <div className="p-3 space-y-2">
                  <div>
                    <h3 className="font-semibold text-sm mb-1">{company.name}</h3>
                    {company.address && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{company.address}</p>
                    )}
                    <Badge variant={company.is_approved ? "default" : "secondary"} className="text-xs">
                      {company.is_approved ? (
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
                        onViewDetail(company);
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
      </>
    );
  };

  return (
    <MapView
      markers={markers}
      renderMarkers={renderMarkers}
      onMarkerClick={(marker) => onCompanyClick?.(marker.data)}
      selectedMarkerId={selectedCompanyId}
      className={className}
      showSidebar={showSidebar}
      onToggleSidebar={onToggleSidebar}
    >
      <MapNavigator selectedCompanyId={selectedCompanyId ?? null} companies={companies} />
    </MapView>
  );
}

interface CompanyMapSidebarProps {
  readonly companies: Company[];
  readonly onCompanyClick?: (company: Company) => void;
  readonly onViewDetail?: (company: Company) => void;
  readonly selectedCompanyId?: number | null;
  readonly className?: string;
  readonly isOpen?: boolean;
  readonly onClose?: () => void;
}

export function CompanyMapSidebar({
  companies,
  onCompanyClick,
  onViewDetail,
  selectedCompanyId,
  className,
  isOpen = true,
  onClose,
}: CompanyMapSidebarProps) {
  const renderItem = (company: Company) => (
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Building className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium truncate cursor-pointer">{company.name}</span>
        </div>
        {company.address && (
          <p className="text-xs text-muted-foreground truncate mb-2">
            {company.address}
          </p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={company.is_approved ? "default" : "secondary"} className="text-xs">
            {company.is_approved ? (
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
          {company.city?.name && (
            <span className="text-xs text-muted-foreground">
              {company.city.name}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <MapSidebar
      items={companies}
      selectedItemId={selectedCompanyId}
      onItemClick={onCompanyClick}
      onViewDetail={onViewDetail}
      renderItem={renderItem}
      emptyMessage="No companies found"
      title="Companies"
      className={className}
      isOpen={isOpen}
      onClose={onClose}
      estimateItemHeight={140} // Height including padding and button
    />
  );
}
