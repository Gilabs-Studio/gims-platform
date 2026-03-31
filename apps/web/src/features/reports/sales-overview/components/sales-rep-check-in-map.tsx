"use client";

import { useTranslations } from "next-intl";
import { useState, useMemo } from "react";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { MapView, type MapMarker, MarkerClusterGroup } from "@/components/ui/map/map-view";
import dynamic from "next/dynamic";
import type { SalesRepCheckInLocation } from "../types";

const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);
const Polyline = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polyline),
  { ssr: false }
);

import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Turbopack may return a plain string or a StaticImageData object for PNG imports.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getImageSrc = (img: any): string => {
  if (typeof img === "string" && img) return img;
  if (typeof img?.src === "string" && img.src) return img.src;
  if (typeof img?.default === "string" && img.default) return img.default;
  if (typeof img?.default?.src === "string" && img.default.src) return img.default.src;
  return "";
};

// Fix default marker icons for Next.js (static imports avoid CDN dependency)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: getImageSrc(markerIcon2x),
  iconUrl: getImageSrc(markerIcon),
  shadowUrl: getImageSrc(markerShadow),
});

interface SalesRepCheckInMapProps {
  readonly locations: readonly SalesRepCheckInLocation[];
  readonly isLoading?: boolean;
  readonly totalVisits?: number;
  readonly page?: number;
  readonly perPage?: number;
  readonly onPageChange?: (page: number) => void;
  readonly onPerPageChange?: (perPage: number) => void;
}

function createNumberedMarkerIcon(number: number) {
  return L.divIcon({
    className: "custom-numbered-marker",
    html: `
      <div style="
        background-color: var(--color-primary);
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 14px;
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">
        ${number}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

export function SalesRepCheckInMap({
  locations,
  isLoading,
  totalVisits = 0,
  page = 1,
  perPage = 50,
  onPageChange,
}: SalesRepCheckInMapProps) {
  const t = useTranslations("salesOverviewReport");
  const [selectedLocation, setSelectedLocation] =
    useState<SalesRepCheckInLocation | null>(null);

  const validLocations = useMemo(() => {
    return locations
      .filter(
        (loc) => loc.location?.latitude && loc.location?.longitude
      )
      .sort((a, b) => b.visit_number - a.visit_number);
  }, [locations]);

  const mapMarkers = useMemo<MapMarker<SalesRepCheckInLocation>[]>(() => {
    return validLocations.map((location) => ({
      id: location.visit_report_id,
      latitude: location.location?.latitude ?? 0,
      longitude: location.location?.longitude ?? 0,
      data: location,
    }));
  }, [validLocations]);

  const polylineCoordinates = useMemo(() => {
    return validLocations.map(
      (loc) =>
        [
          loc.location?.latitude ?? 0,
          loc.location?.longitude ?? 0,
        ] as [number, number]
    );
  }, [validLocations]);

  if (isLoading) {
    return <Skeleton className="h-[500px] w-full" />;
  }

  if (locations.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t("no_check_in_locations")}
      </div>
    );
  }

  const renderMarkers = (
    markerList: MapMarker<SalesRepCheckInLocation>[]
  ) => (
    <>
      {polylineCoordinates.length > 1 && (
        <Polyline
          positions={polylineCoordinates}
          pathOptions={{
            color: "var(--color-primary)",
            weight: 3,
            opacity: 0.6,
          }}
        />
      )}

      <MarkerClusterGroup chunkedLoading>
        {markerList.map((marker) => {
          const location = marker.data;

          return (
            <Marker
              key={location.visit_report_id}
              position={[marker.latitude, marker.longitude]}
              icon={createNumberedMarkerIcon(location.visit_number)}
              eventHandlers={{
                click: () => setSelectedLocation(location),
              }}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-medium">
                    Visit #{location.visit_number}
                  </div>
                  {location.location?.address && (
                    <div className="mt-1">
                      {location.location.address}
                    </div>
                  )}
                  {location.customer?.name && (
                    <div className="mt-1 text-muted-foreground">
                      {location.customer.name}
                    </div>
                  )}
                  {location.purpose && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {location.purpose}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MarkerClusterGroup>
    </>
  );

  return (
    <div className="space-y-4">
      {/* Map Container */}
      <div className="relative h-[500px] w-full rounded-lg border overflow-hidden bg-muted">
        <MapView
          markers={mapMarkers}
          renderMarkers={renderMarkers}
          className="h-full w-full"
          defaultCenter={[-6.2088, 106.8456]}
          defaultZoom={12}
          selectedMarkerId={selectedLocation?.visit_report_id ?? null}
        />

        {/* Overlay info */}
        {validLocations.length > 0 && (
          <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm px-3 py-2 rounded-md border shadow-sm z-1000">
            <p className="text-xs font-medium">
              {validLocations.length}{" "}
              {validLocations.length === 1
                ? "location"
                : "locations"}
            </p>
          </div>
        )}
      </div>

      {/* Locations List - Horizontal Slider */}
      <div className="space-y-4">
        {totalVisits > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {t("showing_locations", {
                start: (page - 1) * perPage + 1,
                end: Math.min(page * perPage, totalVisits),
                total: totalVisits,
              })}
            </p>
            {onPageChange && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    onPageChange(Math.max(1, page - 1))
                  }
                  disabled={page <= 1 || isLoading}
                  className="cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {t("page_of", {
                    page,
                    total: Math.ceil(totalVisits / perPage),
                  })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(page + 1)}
                  disabled={
                    page * perPage >= totalVisits || isLoading
                  }
                  className="cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Horizontal Scrollable Cards */}
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-4 pb-4">
            {validLocations.map((location) => (
              <Card
                key={location.visit_report_id}
                className={`min-w-[320px] max-w-[320px] p-4 cursor-pointer hover:bg-accent/50 dark:hover:bg-accent/30 transition-colors shrink-0 ${
                  selectedLocation?.visit_report_id ===
                  location.visit_report_id
                    ? "bg-accent border-primary"
                    : ""
                }`}
                onClick={() => setSelectedLocation(location)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="font-medium">
                      #{location.visit_number}
                    </Badge>
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(location.check_in_time)}
                  </span>
                </div>
                {location.customer?.name && (
                  <div className="mt-2 font-medium truncate">
                    {location.customer.name}
                  </div>
                )}
                {location.location?.address && (
                  <div className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {location.location.address}
                  </div>
                )}
                {location.purpose && (
                  <div className="mt-2 text-xs text-muted-foreground truncate">
                    {location.purpose}
                  </div>
                )}
                {location.location?.latitude !== undefined &&
                  location.location?.longitude !== undefined && (
                    <div className="mt-2 text-xs text-muted-foreground font-mono">
                      {location.location.latitude.toFixed(6)},{" "}
                      {location.location.longitude.toFixed(6)}
                    </div>
                  )}
              </Card>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  );
}
