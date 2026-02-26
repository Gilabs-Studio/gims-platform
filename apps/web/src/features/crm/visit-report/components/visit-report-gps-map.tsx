"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { MapPin, Navigation } from "lucide-react";
import { useTranslations } from "next-intl";

interface GpsLocation {
  lat?: number;
  lng?: number;
  accuracy?: number;
}

interface VisitReportGpsMapProps {
  readonly checkInLocation?: string | null;
  readonly checkOutLocation?: string | null;
  readonly checkInAt?: string | null;
  readonly checkOutAt?: string | null;
}

// Dynamically import map to avoid SSR issues with Leaflet
const MapInnerComponent = dynamic(
  () => import("./visit-report-gps-map-inner"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[200px] rounded-lg bg-muted flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <MapPin className="h-6 w-6 mx-auto mb-1 animate-pulse" />
          <p className="text-xs">Loading map...</p>
        </div>
      </div>
    ),
  }
);

function parseLocation(locationStr: string | null | undefined): GpsLocation | null {
  if (!locationStr) return null;
  try {
    const parsed: unknown = JSON.parse(locationStr);
    if (typeof parsed === "object" && parsed !== null) {
      const loc = parsed as Record<string, unknown>;
      // Support both lat/lng (frontend) and latitude/longitude (backend)
      const lat =
        typeof loc.lat === "number" ? loc.lat :
        typeof loc.latitude === "number" ? loc.latitude :
        undefined;
      const lng =
        typeof loc.lng === "number" ? loc.lng :
        typeof loc.longitude === "number" ? loc.longitude :
        undefined;
      if (lat !== undefined && lng !== undefined) {
        return {
          lat,
          lng,
          accuracy: typeof loc.accuracy === "number" ? loc.accuracy : undefined,
        };
      }
    }
  } catch {
    // Invalid JSON — skip
  }
  return null;
}

export function VisitReportGpsMap({
  checkInLocation,
  checkOutLocation,
  checkInAt,
  checkOutAt,
}: VisitReportGpsMapProps) {
  const t = useTranslations("crmVisitReport");

  const checkIn = useMemo(() => parseLocation(checkInLocation), [checkInLocation]);
  const checkOut = useMemo(() => parseLocation(checkOutLocation), [checkOutLocation]);

  // No GPS data available
  if (!checkIn && !checkOut) {
    return null;
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase flex items-center gap-2">
        <Navigation className="h-4 w-4" />
        {t("detail.gpsLocation")}
      </h3>

      <MapInnerComponent
        checkIn={checkIn}
        checkOut={checkOut}
        checkInAt={checkInAt}
        checkOutAt={checkOutAt}
      />

      {/* Coordinate details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {checkIn && (
          <div className="flex items-start gap-2 p-2 rounded-md bg-green-50 dark:bg-green-950/30">
            <div className="h-3 w-3 rounded-full bg-green-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-green-700 dark:text-green-400">{t("actions.checkIn")}</p>
              <p className="text-muted-foreground">
                {checkIn.lat?.toFixed(6)}, {checkIn.lng?.toFixed(6)}
              </p>
              {checkIn.accuracy != null && (
                <p className="text-muted-foreground">
                  ±{Math.round(checkIn.accuracy)}m
                </p>
              )}
            </div>
          </div>
        )}
        {checkOut && (
          <div className="flex items-start gap-2 p-2 rounded-md bg-red-50 dark:bg-red-950/30">
            <div className="h-3 w-3 rounded-full bg-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-red-700 dark:text-red-400">{t("actions.checkOut")}</p>
              <p className="text-muted-foreground">
                {checkOut.lat?.toFixed(6)}, {checkOut.lng?.toFixed(6)}
              </p>
              {checkOut.accuracy != null && (
                <p className="text-muted-foreground">
                  ±{Math.round(checkOut.accuracy)}m
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
