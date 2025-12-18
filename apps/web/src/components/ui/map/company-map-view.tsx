"use client";

import { useEffect } from "react";
import { Building } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "../badge";
import { CheckCircle2, XCircle } from "lucide-react";
import type { Company } from "@/features/master-data/company-management/types";
import dynamic from "next/dynamic";

// Dynamic import untuk Leaflet (client-side only)
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);

const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

// Import Leaflet CSS
import "leaflet/dist/leaflet.css";

// Fix untuk default marker icon di Leaflet
import L from "leaflet";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: typeof icon === "string" ? icon : icon.src,
  shadowUrl: typeof iconShadow === "string" ? iconShadow : iconShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

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
  readonly selectedCompanyId?: number | null;
  readonly className?: string;
}

// Default location: Jakarta, Indonesia
const DEFAULT_LOCATION: [number, number] = [-6.2088, 106.8456];

export function CompanyMapView({
  companies,
  onCompanyClick,
  selectedCompanyId,
  className,
}: CompanyMapViewProps) {
  // Calculate initial center and zoom
  const getInitialCenterAndZoom = (): { center: [number, number]; zoom: number } => {
    if (!companies || companies.length === 0) {
      return { center: DEFAULT_LOCATION, zoom: 13 };
    }

    const validCompanies = companies.filter(
      (c) => c.latitude != null && c.longitude != null && !isNaN(Number(c.latitude)) && !isNaN(Number(c.longitude))
    );

    if (validCompanies.length === 0) {
      return { center: DEFAULT_LOCATION, zoom: 13 };
    }

    // Calculate center
    const lats = validCompanies.map((c) => Number(c.latitude));
    const lngs = validCompanies.map((c) => Number(c.longitude));
    const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
    const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

    // Calculate zoom based on bounds
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latDiff = maxLat - minLat;
    const lngDiff = maxLng - minLng;
    const maxDiff = Math.max(latDiff, lngDiff);

    // Set zoom based on difference (larger difference = lower zoom)
    let zoom = 13;
    if (maxDiff > 1) zoom = 10;
    else if (maxDiff > 0.5) zoom = 11;
    else if (maxDiff > 0.2) zoom = 12;
    else if (maxDiff > 0.1) zoom = 13;
    else zoom = 14;

    return { center: [centerLat, centerLng], zoom };
  };

  const { center: mapCenter, zoom: mapZoom } = getInitialCenterAndZoom();

  const validCompanies = companies.filter(
    (c) => c.latitude != null && c.longitude != null && !isNaN(Number(c.latitude)) && !isNaN(Number(c.longitude))
  );

  return (
    <div className={cn("relative w-full h-full bg-muted", className)}>
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        className="h-full w-full z-0"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapNavigator selectedCompanyId={selectedCompanyId ?? null} companies={companies} />
        {validCompanies.map((company) => {
          const lat = Number(company.latitude);
          const lng = Number(company.longitude);
          if (isNaN(lat) || isNaN(lng)) return null;

          return (
            <Marker
              key={company.id}
              position={[lat, lng]}
              eventHandlers={{
                click: () => {
                  onCompanyClick?.(company);
                },
              }}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-semibold text-sm mb-1">{company.name}</h3>
                  {company.address && (
                    <p className="text-xs text-muted-foreground mb-1">{company.address}</p>
                  )}
                  <Badge variant={company.is_approved ? "default" : "secondary"} className="text-xs">
                    {company.is_approved ? "Approved" : "Pending"}
                  </Badge>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

interface CompanyMapSidebarProps {
  readonly companies: Company[];
  readonly onCompanyClick?: (company: Company) => void;
  readonly selectedCompanyId?: number | null;
  readonly className?: string;
}

export function CompanyMapSidebar({
  companies,
  onCompanyClick,
  selectedCompanyId,
  className,
}: CompanyMapSidebarProps) {
  return (
    <div className={cn("h-full overflow-y-auto border-r bg-background", className)}>
      <div className="p-4 border-b">
        <h3 className="font-semibold text-lg">Companies ({companies.length})</h3>
      </div>
      <div className="divide-y">
        {companies.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            No companies found
          </div>
        ) : (
          companies.map((company) => (
            <button
              key={company.id}
              onClick={() => onCompanyClick?.(company)}
              className={cn(
                "w-full text-left p-4 hover:bg-accent transition-colors",
                selectedCompanyId === company.id && "bg-accent border-l-4 border-l-primary"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Building className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium truncate">{company.name}</span>
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
            </button>
          ))
        )}
      </div>
    </div>
  );
}
