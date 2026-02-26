"use client";

/**
 * MarketingMapDemo — A lightweight Leaflet map for the landing page.
 * Uses the same tile layer and library as the full geographic feature
 * but renders demo distribution-hub markers without requiring auth.
 */

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — leaflet CSS has no type declarations
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Turbopack may return plain string or StaticImageData
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const src = (img: any): string => img?.src ?? img?.default?.src ?? img ?? "";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: src(markerIcon2x),
  iconUrl: src(markerIcon),
  shadowUrl: src(markerShadow),
});

/** Representative distribution hubs across Indonesia */
const HUBS: { name: string; lat: number; lng: number; type: "primary" | "secondary" }[] = [
  { name: "Jakarta",    lat: -6.2088,  lng: 106.8456, type: "primary" },
  { name: "Surabaya",   lat: -7.2575,  lng: 112.7521, type: "primary" },
  { name: "Bandung",    lat: -6.9175,  lng: 107.6191, type: "primary" },
  { name: "Medan",      lat: 3.5952,   lng: 98.6722,  type: "primary" },
  { name: "Makassar",   lat: -5.1477,  lng: 119.4327, type: "primary" },
  { name: "Semarang",   lat: -6.9667,  lng: 110.4167, type: "secondary" },
  { name: "Yogyakarta", lat: -7.7956,  lng: 110.3695, type: "secondary" },
  { name: "Palembang",  lat: -2.9761,  lng: 104.7754, type: "secondary" },
  { name: "Balikpapan", lat: -1.2379,  lng: 116.8529, type: "secondary" },
  { name: "Manado",     lat: 1.4748,   lng: 124.8421, type: "secondary" },
  { name: "Denpasar",   lat: -8.6500,  lng: 115.2167, type: "secondary" },
  { name: "Pekanbaru",  lat: 0.5333,   lng: 101.4500, type: "secondary" },
  { name: "Pontianak",  lat: -0.0263,  lng: 109.3425, type: "secondary" },
];

const TILE_URL =
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

export function MarketingMapDemo() {
  const mapRef = useRef<L.Map | null>(null);

  // Disable all scroll / interaction so the map doesn't hijack page scroll
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.scrollWheelZoom.disable();
    map.dragging.disable();
    map.touchZoom.disable();
    map.doubleClickZoom.disable();
    map.boxZoom.disable();
    map.keyboard.disable();
  }, []);

  return (
    <MapContainer
      center={[-2.5, 118.0]}
      zoom={4}
      zoomControl={false}
      attributionControl={false}
      className="h-full w-full rounded-2xl"
      ref={mapRef}
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTR} />

      {HUBS.map((hub) => {
        const isPrimary = hub.type === "primary";
        return (
          <CircleMarker
            key={hub.name}
            center={[hub.lat, hub.lng]}
            radius={isPrimary ? 9 : 6}
            pathOptions={{
              color: "#2563EB",
              fillColor: "#2563EB",
              fillOpacity: isPrimary ? 0.85 : 0.5,
              weight: isPrimary ? 2 : 1,
              opacity: 0.9,
            }}
          >
            <Tooltip
              permanent={isPrimary}
              direction="top"
              offset={[0, -8]}
            >
              {hub.name}
            </Tooltip>
          </CircleMarker>
        );
      })}

      {/* Subtle attribution in corner */}
      <div
        style={{
          position: "absolute",
          bottom: 4,
          right: 6,
          zIndex: 400,
          fontSize: 9,
          color: "#94a3b8",
          pointerEvents: "none",
        }}
      >
        © OSM & CARTO
      </div>
    </MapContainer>
  );
}
