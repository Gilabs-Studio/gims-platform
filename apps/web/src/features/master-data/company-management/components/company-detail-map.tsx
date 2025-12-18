"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

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

interface CompanyDetailMapProps {
  readonly latitude: number;
  readonly longitude: number;
  readonly companyName: string;
}

export function CompanyDetailMap({ latitude, longitude, companyName }: CompanyDetailMapProps) {
  const [mounted, setMounted] = useState(false);

  // Setup Leaflet CSS and icon only on client-side
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Import CSS dynamically
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

  if (!mounted) {
    return (
      <div className="h-[300px] sm:h-[400px] flex items-center justify-center bg-muted rounded-md">
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  return (
    <div className="h-[300px] sm:h-[400px] rounded-md border overflow-hidden">
      <MapContainer
        center={[latitude, longitude]}
        zoom={15}
        className="h-full w-full"
        scrollWheelZoom={true}
        touchZoom={true}
        doubleClickZoom={true}
        dragging={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[latitude, longitude]}>
          <Popup>
            <div className="p-2">
              <h3 className="font-semibold text-sm">{companyName}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </p>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

