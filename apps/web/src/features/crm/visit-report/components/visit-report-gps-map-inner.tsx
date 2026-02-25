"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Fix default marker icons
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon.src,
  iconRetinaUrl: markerIcon2x.src,
  shadowUrl: markerShadow.src,
});

// Custom colored icons for check-in (green) and check-out (red)
function createColoredIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: "custom-map-marker",
    html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  });
}

const checkInIcon = createColoredIcon("#22c55e");
const checkOutIcon = createColoredIcon("#ef4444");

interface GpsLocation {
  lat?: number;
  lng?: number;
  accuracy?: number;
}

interface VisitReportGpsMapInnerProps {
  readonly checkIn: GpsLocation | null;
  readonly checkOut: GpsLocation | null;
  readonly checkInAt?: string | null;
  readonly checkOutAt?: string | null;
}

function FitBounds({ checkIn, checkOut }: { readonly checkIn: GpsLocation | null; readonly checkOut: GpsLocation | null }) {
  const map = useMap();

  useEffect(() => {
    const points: L.LatLngExpression[] = [];
    if (checkIn?.lat != null && checkIn?.lng != null) points.push([checkIn.lat, checkIn.lng]);
    if (checkOut?.lat != null && checkOut?.lng != null) points.push([checkOut.lat, checkOut.lng]);

    if (points.length === 2) {
      map.fitBounds(L.latLngBounds(points), { padding: [30, 30], maxZoom: 16 });
    } else if (points.length === 1) {
      map.setView(points[0], 15);
    }
  }, [map, checkIn, checkOut]);

  return null;
}

export default function VisitReportGpsMapInner({
  checkIn,
  checkOut,
  checkInAt,
  checkOutAt,
}: VisitReportGpsMapInnerProps) {
  const center: [number, number] = (() => {
    if (checkIn?.lat != null && checkIn?.lng != null) return [checkIn.lat, checkIn.lng];
    if (checkOut?.lat != null && checkOut?.lng != null) return [checkOut.lat, checkOut.lng];
    return [-6.2, 106.8]; // Default: Jakarta
  })();

  const polylinePositions: [number, number][] = [];
  if (checkIn?.lat != null && checkIn?.lng != null) polylinePositions.push([checkIn.lat, checkIn.lng]);
  if (checkOut?.lat != null && checkOut?.lng != null) polylinePositions.push([checkOut.lat, checkOut.lng]);

  return (
    <div className="h-[200px] rounded-lg overflow-hidden border">
      <MapContainer
        center={center}
        zoom={15}
        className="h-full w-full"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitBounds checkIn={checkIn} checkOut={checkOut} />

        {checkIn?.lat != null && checkIn?.lng != null && (
          <Marker position={[checkIn.lat, checkIn.lng]} icon={checkInIcon}>
            <Popup>
              <div className="text-xs">
                <p className="font-semibold text-green-700">Check In</p>
                {checkInAt && <p>{new Date(checkInAt).toLocaleString("id-ID")}</p>}
                <p>{checkIn.lat.toFixed(6)}, {checkIn.lng.toFixed(6)}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {checkOut?.lat != null && checkOut?.lng != null && (
          <Marker position={[checkOut.lat, checkOut.lng]} icon={checkOutIcon}>
            <Popup>
              <div className="text-xs">
                <p className="font-semibold text-red-700">Check Out</p>
                {checkOutAt && <p>{new Date(checkOutAt).toLocaleString("id-ID")}</p>}
                <p>{checkOut.lat.toFixed(6)}, {checkOut.lng.toFixed(6)}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Dashed line between check-in and check-out */}
        {polylinePositions.length === 2 && (
          <Polyline
            positions={polylinePositions}
            pathOptions={{ color: "#6366f1", weight: 2, dashArray: "6 4", opacity: 0.7 }}
          />
        )}
      </MapContainer>
    </div>
  );
}
