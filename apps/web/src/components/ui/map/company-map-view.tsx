"use client";

import { useEffect, useState } from "react";
import { Building, Eye, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "../badge";
import { Button } from "../button";
import { CheckCircle2, XCircle } from "lucide-react";
import type { Company } from "@/features/master-data/company-management/types";
import dynamic from "next/dynamic";
import { useIsMobile } from "@/hooks/use-mobile";

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

// Default location: Jakarta, Indonesia
const DEFAULT_LOCATION: [number, number] = [-6.2088, 106.8456];

export function CompanyMapView({
  companies,
  onCompanyClick,
  onViewDetail,
  selectedCompanyId,
  className,
  showSidebar = false,
  onToggleSidebar,
}: CompanyMapViewProps) {
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();

  // Setup Leaflet CSS and icon only on client-side
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Import CSS dynamically with type ignore
    // @ts-expect-error - CSS import for Leaflet
    void import("leaflet/dist/leaflet.css");
    
    // Setup Leaflet icon using direct paths from CDN
    void import("leaflet").then((L) => {
      const DefaultIcon = L.default.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });
      
      L.default.Marker.prototype.options.icon = DefaultIcon;
      setMounted(true);
    });
  }, []);

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

  if (!mounted) {
    return (
      <div className={cn("relative w-full h-full bg-muted flex items-center justify-center", className)}>
        <div className="text-center text-muted-foreground">
          <p className="text-sm">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full h-full bg-muted", className)}>
      {/* Mobile Sidebar Toggle Button */}
      {isMobile && onToggleSidebar && (
        <Button
          variant="outline"
          size="icon"
          className="absolute top-2 left-2 z-[1000] bg-background/90 backdrop-blur-sm shadow-md cursor-pointer"
          onClick={onToggleSidebar}
          aria-label={showSidebar ? "Hide sidebar" : "Show sidebar"}
        >
          {showSidebar ? (
            <X className="h-4 w-4" />
          ) : (
            <Menu className="h-4 w-4" />
          )}
        </Button>
      )}
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        className="h-full w-full z-0"
        scrollWheelZoom={true}
        touchZoom={true}
        doubleClickZoom={true}
        dragging={true}
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
      </MapContainer>
    </div>
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
  const isMobile = useIsMobile();

  // Mobile: Use Sheet/Drawer pattern
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        {isOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-[999] md:hidden"
            onClick={onClose}
            aria-hidden="true"
          />
        )}
        {/* Sidebar */}
        <div
          className={cn(
            "fixed left-0 top-0 h-full w-80 bg-background border-r z-[1000] transition-transform duration-300 ease-in-out md:relative md:z-auto",
            isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
            className
          )}
        >
          <div className="h-full overflow-y-auto flex flex-col">
            {/* Mobile Header */}
            <div className="flex items-center justify-between p-4 border-b md:hidden">
              <h2 className="font-semibold text-sm">Companies</h2>
              {onClose && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="cursor-pointer"
                  aria-label="Close sidebar"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="divide-y flex-1">
              {companies.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No companies found
                </div>
              ) : (
                companies.map((company) => (
                  <div
                    key={company.id}
                    className={cn(
                      "w-full border-b last:border-0",
                      selectedCompanyId === company.id && "bg-accent border-l-4 border-l-primary"
                    )}
                  >
                    <button
                      onClick={() => {
                        onCompanyClick?.(company);
                        // Close sidebar on mobile after selection
                        if (isMobile && onClose) {
                          onClose();
                        }
                      }}
                      className={cn(
                        "w-full text-left p-4 hover:bg-accent/50 transition-colors cursor-pointer",
                        selectedCompanyId === company.id && "bg-transparent"
                      )}
                    >
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
                    </button>
                    {onViewDetail && (
                      <div className="px-4 pb-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewDetail(company);
                            // Close sidebar on mobile after viewing detail
                            if (isMobile && onClose) {
                              onClose();
                            }
                          }}
                        >
                          <Eye className="h-3 w-3 mr-1.5" />
                          View Details
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  // Desktop: Normal sidebar
  return (
    <div className={cn("h-full overflow-y-auto border-r bg-background flex flex-col", className)}>
      <div className="divide-y flex-1">
        {companies.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            No companies found
          </div>
        ) : (
          companies.map((company) => (
            <div
              key={company.id}
              className={cn(
                "w-full border-b last:border-0",
                selectedCompanyId === company.id && "bg-accent border-l-4 border-l-primary"
              )}
            >
              <button
                onClick={() => onCompanyClick?.(company)}
                className={cn(
                  "w-full text-left p-4 hover:bg-accent/50 transition-colors cursor-pointer",
                  selectedCompanyId === company.id && "bg-transparent"
                )}
              >
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
              </button>
              {onViewDetail && (
                <div className="px-4 pb-3">
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
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
