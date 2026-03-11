"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import type { Layer, LeafletMouseEvent } from "leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import type { GeoRegionData } from "../types";

// Resolve static image src in a Turbopack-compatible way (same pattern as components/ui/map)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getImageSrc(img: any): string {
  if (typeof img === "string" && img) return img;
  if (typeof img?.src === "string" && img.src) return img.src;
  if (typeof img?.default === "string" && img.default) return img.default;
  if (typeof img?.default?.src === "string" && img.default.src) return img.default.src;
  return "";
}

// Fix Leaflet default icon paths using bundled static assets (avoids CDN dependency)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: getImageSrc(markerIcon),
  iconRetinaUrl: getImageSrc(markerIcon2x),
  shadowUrl: getImageSrc(markerShadow),
});

// Color scale from light to dark (7 steps, matched to geo-widget)
const COLOR_SCALE = [
  "#e0f2fe",
  "#bae6fd",
  "#7dd3fc",
  "#38bdf8",
  "#0ea5e9",
  "#0284c7",
  "#0369a1",
];

function getColorForValue(value: number, max: number): string {
  if (max === 0) return COLOR_SCALE[0];
  const ratio = value / max;
  const index = Math.min(Math.floor(ratio * COLOR_SCALE.length), COLOR_SCALE.length - 1);
  return COLOR_SCALE[index];
}

/** Normalize a province name to lower-case trimmed form for comparison */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(kota|kabupaten|kab\.)\s+/i, "")
    .trim();
}

interface GeoMapLeafletProps {
  readonly regions: GeoRegionData[];
}

export function GeoMapLeaflet({ regions }: GeoMapLeafletProps) {
  const [geoJson, setGeoJson] = useState<GeoJSON.FeatureCollection | null>(null);

  useEffect(() => {
    fetch("/geojson/indonesia-provinces-simple.geojson")
      .then((res) => res.json())
      .then((json: GeoJSON.FeatureCollection) => setGeoJson(json))
      .catch(() => setGeoJson(null));
  }, []);

  const maxValue = useMemo(
    () => Math.max(...regions.map((r) => r.value), 1),
    [regions],
  );

  // Build a lookup: normalized province name → region data
  const areaLookup = useMemo(() => {
    const map = new Map<string, GeoRegionData>();
    for (const region of regions) {
      map.set(normalizeName(region.name), region);
    }
    return map;
  }, [regions]);

  const geoJsonKey = useMemo(() => regions.map((r) => r.name).join(","), [regions]);

  const onEachFeature = (feature: GeoJSON.Feature, layer: Layer) => {
    const rawName = (feature.properties?.WADMPR as string) ?? "";
    const regionData = areaLookup.get(normalizeName(rawName));

    if (regionData) {
      layer.bindTooltip(
        `<div class="leaflet-tooltip-content">
          <strong>${regionData.name}</strong><br/>
          ${regionData.formatted} &bull; ${regionData.count} orders
        </div>`,
        { sticky: true, className: "leaflet-tooltip-province" },
      );
    } else {
      layer.bindTooltip(`<strong>${rawName}</strong><br/><span>No data</span>`, { sticky: true });
    }

    layer.on({
      mouseover: (e: LeafletMouseEvent) => {
        (e.target as L.Path).setStyle({ weight: 2, fillOpacity: 1 });
      },
      mouseout: (e: LeafletMouseEvent) => {
        (e.target as L.Path).setStyle({ weight: 0.5, fillOpacity: 0.75 });
      },
    });
  };

  const styleFeature = (feature?: GeoJSON.Feature) => {
    const rawName = (feature?.properties?.WADMPR as string) ?? "";
    const regionData = areaLookup.get(normalizeName(rawName));
    const fillColor = regionData
      ? getColorForValue(regionData.value, maxValue)
      : "#f1f5f9";

    return {
      fillColor,
      weight: 0.5,
      opacity: 1,
      color: "#94a3b8",
      fillOpacity: 0.75,
    };
  };

  return (
    <MapContainer
      center={[-2.5, 118.0]}
      zoom={5}
      style={{ height: "350px", width: "100%", borderRadius: "0.5rem" }}
      scrollWheelZoom={false}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      {geoJson && (
        <GeoJSON
          key={geoJsonKey}
          data={geoJson}
          style={styleFeature}
          onEachFeature={onEachFeature}
        />
      )}
    </MapContainer>
  );
}
