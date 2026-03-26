"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { MapPin, TrendingUp, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import L from "leaflet";
import {
  GeoJSON,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { MarkerClusterGroup } from "@/components/ui/map/map-view";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — leaflet CSS has no type declarations; required for map rendering
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import type { Feature, FeatureCollection } from "geojson";
import { useAreaMapping } from "../hooks/use-area-mapping";
import type {
  AreaMappingCluster,
  AreaMappingItem,
  AreaMappingLeadData,
  AreaMappingPipelineData,
  AreaMappingRequest,
} from "../types";

// Fix for default marker icons in Next.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  iconRetinaUrl: typeof (markerIcon2x as any)?.src === "string" ? (markerIcon2x as any).src : markerIcon2x,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  iconUrl: typeof (markerIcon as any)?.src === "string" ? (markerIcon as any).src : markerIcon,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  shadowUrl: typeof (markerShadow as any)?.src === "string" ? (markerShadow as any).src : markerShadow,
});

type MapStyle = "auto" | "light" | "dark" | "satellite";
type MapMode = "location-view" | "regional-intensity";
const TILE_LAYERS: Record<
  Exclude<MapStyle, "auto">,
  { url: string; attribution: string }
> = {
  light: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CARTO',
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CARTO',
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri",
  },
};

const INDONESIA_CENTER: L.LatLngExpression = [-2.5, 118.0];
const DEFAULT_ZOOM = 5;

const INTENSITY_COLORS = [
  "#f0f9ff",
  "#bfdbfe",
  "#93c5fd",
  "#60a5fa",
  "#3b82f6",
  "#2563eb",
  "#1d4ed8",
  "#1e3a8a",
];

function normalizeRegionName(value: string | undefined): string {
  const normalized = String(value ?? "")
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .replace(/^city\s+of\s+/, "")
    .replace(/^provinsi\s+/, "")
    .replace(/^province\s+/, "")
    .replace(/^prov\s+/, "")
    .replace(/^kota\s+/, "")
    .replace(/^kabupaten\s+/, "")
    .replace(/^kab\.?\s+/, "")
    .replace(/\s+city$/, "")
    .replace(/\s+province$/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return "";

  if (normalized === "west sumatra") return "sumatera barat";
  if (normalized === "north sumatra") return "sumatera utara";
  if (normalized === "south sumatra") return "sumatera selatan";
  if (normalized === "special capital region of jakarta") return "dki jakarta";
  if (normalized === "special region of yogyakarta") return "daerah istimewa yogyakarta";
  if (normalized === "riau islands") return "kepulauan riau";
  if (normalized === "bangka belitung islands") return "kepulauan bangka belitung";

  return normalized.replace(/sumatra/g, "sumatera");
}

function getColorForIntensity(score: number): string {
  const normalized = Math.max(0, Math.min(100, score));
  const index = Math.floor((normalized / 100) * (INTENSITY_COLORS.length - 1));
  return INTENSITY_COLORS[index];
}

function formatCurrency(value: number): string {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function getColorForValue(value: number, maxValue: number): string {
  if (maxValue <= 0 || value <= 0) return "transparent";
  const ratio = Math.min(value / maxValue, 1);
  const index = Math.min(
    Math.floor(ratio * (INTENSITY_COLORS.length - 1)),
    INTENSITY_COLORS.length - 1
  );
  return INTENSITY_COLORS[index];
}

type GeometryBounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

function isPointInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]?.[0] ?? 0;
    const yi = ring[i]?.[1] ?? 0;
    const xj = ring[j]?.[0] ?? 0;
    const yj = ring[j]?.[1] ?? 0;

    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi + Number.EPSILON) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

function isPointInPolygon(lng: number, lat: number, polygon: number[][][]): boolean {
  if (!polygon.length) return false;
  if (!isPointInRing(lng, lat, polygon[0])) return false;

  for (let i = 1; i < polygon.length; i += 1) {
    if (isPointInRing(lng, lat, polygon[i])) return false;
  }

  return true;
}

function isPointInFeature(lng: number, lat: number, feature?: Feature): boolean {
  const geometry = feature?.geometry;
  if (!geometry) return false;

  if (geometry.type === "Polygon") {
    return isPointInPolygon(lng, lat, geometry.coordinates as number[][][]);
  }

  if (geometry.type === "MultiPolygon") {
    const polygons = geometry.coordinates as number[][][][];
    return polygons.some((polygon) => isPointInPolygon(lng, lat, polygon));
  }

  return false;
}

function getFeatureBounds(feature?: Feature): GeometryBounds | null {
  const geometry = feature?.geometry;
  if (!geometry) return null;

  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  let minLng = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;

  const updateBounds = (lng: number, lat: number) => {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  };

  if (geometry.type === "Polygon") {
    const polygon = geometry.coordinates as number[][][];
    for (const ring of polygon) {
      for (const coord of ring) {
        updateBounds(coord?.[0] ?? 0, coord?.[1] ?? 0);
      }
    }
  } else if (geometry.type === "MultiPolygon") {
    const polygons = geometry.coordinates as number[][][][];
    for (const polygon of polygons) {
      for (const ring of polygon) {
        for (const coord of ring) {
          updateBounds(coord?.[0] ?? 0, coord?.[1] ?? 0);
        }
      }
    }
  } else {
    return null;
  }

  if (!Number.isFinite(minLat) || !Number.isFinite(minLng)) return null;

  return { minLat, maxLat, minLng, maxLng };
}

function isPointInBounds(lat: number, lng: number, bounds?: GeometryBounds | null): boolean {
  if (!bounds) return false;
  return (
    lat >= bounds.minLat &&
    lat <= bounds.maxLat &&
    lng >= bounds.minLng &&
    lng <= bounds.maxLng
  );
}

function FitBoundsToMarkers({ items }: { items: AreaMappingItem[] }) {
  const map = useMap();

  useEffect(() => {
    if (!items.length) return;

    const bounds = L.latLngBounds(
      items
        .map((item) => {
          const point = item.type === "lead" ? item.lead : item.pipeline;
          if (!point) return null;
          return [point.latitude, point.longitude] as [number, number];
        })
        .filter((point): point is [number, number] => point !== null)
    );

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], animate: true, maxZoom: 12 });
    }
  }, [items, map]);

  return null;
}

function LeadMarker({ data, simple }: { data: AreaMappingLeadData; simple?: boolean }) {
  if (simple) {
    return (
      <Marker position={[data.latitude, data.longitude]} title={data.name}>
        <Popup className="area-mapping-popup">
          <div className="w-48 p-2 text-xs text-foreground">
            <h4 className="mb-2 font-semibold text-foreground">{data.name}</h4>
            <p className="mb-1 text-foreground">{data.code}</p>
            <p className="mb-2 text-foreground">
              {data.city}, {data.province}
            </p>
            <div className="space-y-1 border-t border-border pt-2">
              <div className="flex justify-between">
                <span>Status:</span>
                <Badge variant="outline" className="text-xs">
                  {data.lead_status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Score:</span>
                <span className="font-medium">{data.lead_score}</span>
              </div>
              <div className="flex justify-between">
                <span>Activities:</span>
                <span className="font-medium">{data.activity_count}</span>
              </div>
              <div className="flex justify-between">
                <span>Tasks:</span>
                <span className="font-medium">{data.task_count}</span>
              </div>
              <div className="flex justify-between">
                <span>Est. Value:</span>
                <span className="font-medium text-orange-600">
                  {formatCurrency(data.estimated_value)}
                </span>
              </div>
            </div>
          </div>
        </Popup>
      </Marker>
    );
  }

  const color = getColorForIntensity(data.intensity_score);
  const icon = L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        border: 3px solid #7c2d12;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">
        L
      </div>
    `,
    iconSize: [30, 30],
    className: "lead-marker",
  });

  return (
    <Marker position={[data.latitude, data.longitude]} icon={icon} title={data.name}>
      <Popup className="area-mapping-popup">
        <div className="w-48 p-2 text-xs">
          <h4 className="mb-2 font-semibold">{data.name}</h4>
          <p className="mb-1 text-muted-foreground">{data.code}</p>
          <p className="mb-2">
            {data.city}, {data.province}
          </p>
          <div className="space-y-1 border-t border-border pt-2">
            <div className="flex justify-between">
              <span>Status:</span>
              <Badge variant="outline" className="text-xs">
                {data.lead_status}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Score:</span>
              <span className="font-medium">{data.lead_score}</span>
            </div>
            <div className="flex justify-between">
              <span>Activities:</span>
              <span className="font-medium">{data.activity_count}</span>
            </div>
            <div className="flex justify-between">
              <span>Tasks:</span>
              <span className="font-medium">{data.task_count}</span>
            </div>
            <div className="flex justify-between">
              <span>Est. Value:</span>
              <span className="font-medium text-orange-600">
                {formatCurrency(data.estimated_value)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Intensity:</span>
              <span className="font-medium">{data.intensity_score.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

function PipelineMarker({ data, simple }: { data: AreaMappingPipelineData; simple?: boolean }) {
  if (simple) {
    return (
      <Marker position={[data.latitude, data.longitude]} title={data.title}>
        <Popup className="area-mapping-popup">
          <div className="w-52 p-2 text-xs text-foreground">
            <h4 className="mb-2 font-semibold text-foreground">{data.title}</h4>
            <p className="mb-1 text-foreground">{data.code}</p>
            <p className="mb-2 text-foreground">
              {data.city}, {data.province}
            </p>
            <div className="space-y-1 border-t border-border pt-2">
              <div className="flex justify-between">
                <span>Stage:</span>
                <span className="font-medium">{data.pipeline_stage_name}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <Badge variant="outline" className="text-xs">
                  {data.status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Probability:</span>
                <span className="font-medium">{data.probability}%</span>
              </div>
              <div className="flex justify-between">
                <span>Pipeline Value:</span>
                <span className="font-medium text-green-600">{formatCurrency(data.value)}</span>
              </div>
            </div>
          </div>
        </Popup>
      </Marker>
    );
  }

  const color = getColorForIntensity(data.intensity_score);
  const icon = L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        border: 3px solid #14532d;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">
        P
      </div>
    `,
    iconSize: [30, 30],
    className: "pipeline-marker",
  });

  return <Marker position={[data.latitude, data.longitude]} icon={icon} title={data.title} />;
}

export function AreaMappingMapView() {
  const t = useTranslations("areaMapping");
  const { resolvedTheme } = useTheme();

  const [mapStyle, setMapStyle] = useState<MapStyle>("auto");
  const [mapMode, setMapMode] = useState<MapMode>("location-view");
  const [selectedType, setSelectedType] = useState<"all" | "lead" | "pipeline">("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("__all__");
  const [selectedYear, setSelectedYear] = useState<string>("__all__");
  const [allFeatures, setAllFeatures] = useState<Feature[]>([]);

  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    return Array.from({ length: 7 }).map((_, index) => currentYear - 5 + index);
  }, [currentYear]);

  const requestParams = useMemo((): AreaMappingRequest | undefined => {
    const month = selectedMonth === "__all__" ? undefined : Number(selectedMonth);
    const year = selectedYear === "__all__" ? undefined : Number(selectedYear);

    if (!month && !year) return undefined;

    return {
      month: Number.isFinite(month) ? month : undefined,
      year: Number.isFinite(year) ? year : undefined,
    };
  }, [selectedMonth, selectedYear]);

  const { data, isLoading, error } = useAreaMapping(requestParams);

  useEffect(() => {
    fetch("/geojson/indonesia-provinces-simple.geojson")
      .then((res) => res.json())
      .then((geoJson: FeatureCollection) => {
        setAllFeatures(geoJson.features ?? []);
      })
      .catch(() => {
        setAllFeatures([]);
      });
  }, []);

  const mapItems = useMemo(
    (): AreaMappingItem[] =>
      (data?.data?.items ?? []).filter((item: AreaMappingItem) => {
        if (item.type === "lead") return Boolean(item.lead);
        if (item.type === "pipeline") return Boolean(item.pipeline);
        return false;
      }),
    [data?.data?.items]
  );

  const filteredItems = useMemo((): AreaMappingItem[] => {
    if (selectedType === "all") return mapItems;
    return mapItems.filter((item) => item.type === selectedType);
  }, [mapItems, selectedType]);

  const summaryMetrics = useMemo(() => {
    return mapItems.reduce(
      (acc, item) => {
        if (item.type === "lead" && item.lead) {
          acc.totalLeads += 1;
          acc.totalActivities += item.lead.activity_count + item.lead.task_count;
          acc.totalPipelineValue += item.lead.estimated_value;
        }

        if (item.type === "pipeline" && item.pipeline) {
          acc.pipelineDealCount += 1;
          acc.totalPipelineValue += item.pipeline.value;
        }

        return acc;
      },
      {
        totalLeads: 0,
        pipelineDealCount: 0,
        totalActivities: 0,
        totalPipelineValue: 0,
      }
    );
  }, [mapItems]);

  const geoCityFeatures = useMemo(() => {
    return allFeatures
      .map((feature) => {
        const properties = feature.properties as Record<string, unknown> | undefined;
        const cityLabel = String(properties?.WADMKK ?? "").trim();
        const cityKey = normalizeRegionName(cityLabel);

        if (!cityKey) return null;

        return {
          feature,
          cityKey,
          cityLabel,
          bounds: getFeatureBounds(feature),
        };
      })
      .filter(
        (
          entry
        ): entry is {
          feature: Feature;
          cityKey: string;
          cityLabel: string;
          bounds: GeometryBounds | null;
        } => entry !== null
      );
  }, [allFeatures]);

  const visibleClusters = useMemo((): AreaMappingCluster[] => {
    if (!filteredItems.length) return [];

    const clusters = new Map<
      string,
      {
        city: string;
        totalPoints: number;
        leadCount: number;
        pipelineDealCount: number;
        totalPipelineValue: number;
        totalLat: number;
        totalLng: number;
        totalIntensity: number;
        maxIntensity: number;
      }
    >();

    for (const item of filteredItems) {
      const point = item.type === "lead" ? item.lead : item.pipeline;
      if (!point) continue;

      const matchedGeoCity = geoCityFeatures.find((entry) => {
        if (!isPointInBounds(point.latitude, point.longitude, entry.bounds)) return false;
        return isPointInFeature(point.longitude, point.latitude, entry.feature);
      });

      const fallbackCity =
        String(point.city ?? "").trim() ||
        String(point.province ?? "").trim() ||
        "Unknown";

      const cityKey =
        matchedGeoCity?.cityKey || normalizeRegionName(fallbackCity) || "unknown";
      const cityLabel = matchedGeoCity?.cityLabel || fallbackCity;

      const existing = clusters.get(cityKey) ?? {
        city: cityLabel,
        totalPoints: 0,
        leadCount: 0,
        pipelineDealCount: 0,
        totalPipelineValue: 0,
        totalLat: 0,
        totalLng: 0,
        totalIntensity: 0,
        maxIntensity: 0,
      };

      existing.totalPoints += 1;
      if (item.type === "lead") {
        existing.leadCount += 1;
        existing.totalPipelineValue += item.lead?.estimated_value ?? 0;
      }
      if (item.type === "pipeline") {
        existing.pipelineDealCount += 1;
        existing.totalPipelineValue += item.pipeline?.value ?? 0;
      }
      existing.totalLat += point.latitude;
      existing.totalLng += point.longitude;
      existing.totalIntensity += point.intensity_score;
      existing.maxIntensity = Math.max(existing.maxIntensity, point.intensity_score);
      clusters.set(cityKey, existing);
    }

    return Array.from(clusters.values())
      .filter((cluster) => cluster.totalPoints > 0)
      .sort((left, right) => right.totalPoints - left.totalPoints)
      .map((cluster) => ({
        city: cluster.city,
        total_points: cluster.totalPoints,
        lead_count: cluster.leadCount,
        pipeline_deal_count: cluster.pipelineDealCount,
        total_pipeline_value: cluster.totalPipelineValue,
        avg_intensity: cluster.totalIntensity / cluster.totalPoints,
        max_intensity: cluster.maxIntensity,
        center_lat: cluster.totalLat / cluster.totalPoints,
        center_lng: cluster.totalLng / cluster.totalPoints,
      }));
  }, [filteredItems, geoCityFeatures]);

  const selectedTileLayer = useMemo(() => {
    if (mapStyle !== "auto") return TILE_LAYERS[mapStyle];
    return TILE_LAYERS[resolvedTheme === "dark" ? "dark" : "light"];
  }, [mapStyle, resolvedTheme]);

  const clusterLookup = useMemo(() => {
    const map = new Map<string, AreaMappingCluster>();
    for (const cluster of visibleClusters) {
      map.set(normalizeRegionName(cluster.city), cluster);
    }
    return map;
  }, [visibleClusters]);

  const maxClusterPoints = useMemo(() => {
    return visibleClusters.reduce(
      (currentMax, cluster) => Math.max(currentMax, cluster.total_points),
      0
    );
  }, [visibleClusters]);

  const geoJsonData = useMemo<FeatureCollection | null>(() => {
    if (!allFeatures.length) return null;

    // Join by city name (WADMKK), same strategy as geo-performance report map.
    const groupedByCity = new Map<string, Feature[]>();

    for (const feature of allFeatures) {
      const properties = feature.properties as Record<string, unknown> | undefined;
      const cityName = normalizeRegionName(String(properties?.WADMKK ?? ""));
      if (!cityName) continue;

      const existing = groupedByCity.get(cityName) ?? [];
      existing.push(feature);
      groupedByCity.set(cityName, existing);
    }

    const featuresWithData: Feature[] = [];
    for (const [cityKey, features] of groupedByCity) {
      const cluster = clusterLookup.get(cityKey);
      if (!cluster || cluster.total_points <= 0) continue;

      for (const feature of features) {
        featuresWithData.push({
          ...feature,
          properties: {
            ...(feature.properties as Record<string, unknown> | undefined),
            _clusterData: cluster,
          },
        });
      }
    }

    if (!featuresWithData.length) return null;
    return { type: "FeatureCollection", features: featuresWithData };
  }, [allFeatures, clusterLookup]);

  const geoJsonStyle = useCallback(
    (feature?: Feature) => {
      const properties = feature?.properties as Record<string, unknown> | undefined;
      const cluster = properties?._clusterData as AreaMappingCluster | undefined;
      const totalPoints = cluster?.total_points ?? 0;

      if (totalPoints <= 0) {
        return {
          fillColor: "transparent",
          fillOpacity: 0,
          weight: 0.5,
          color: resolvedTheme === "dark" ? "#334155" : "#cbd5e1",
          opacity: 0.35,
        };
      }

      return {
        color: resolvedTheme === "dark" ? "#475569" : "#94a3b8",
        weight: 1.2,
        fillColor: getColorForValue(totalPoints, maxClusterPoints),
        fillOpacity: 0.7,
        opacity: 0.8,
      };
    },
    [maxClusterPoints, resolvedTheme]
  );

  const onEachGeoJsonFeature = useCallback(
    (feature: Feature, layer: L.Layer) => {
      const cityLabel = String(feature.properties?.WADMKK ?? "Unknown City");
      const properties = feature.properties as Record<string, unknown> | undefined;
      const cluster = properties?._clusterData as AreaMappingCluster | undefined;
      if (!cluster || cluster.total_points <= 0) {
        return;
      }

      const pathLayer = layer as L.Path;

      layer.bindTooltip(
        `<div style="font-size:12px;"><strong>${cityLabel}</strong><br/>Leads: ${cluster.lead_count}<br/>Pipeline Deals: ${cluster.pipeline_deal_count}<br/>Pipeline Value: ${formatCurrency(cluster.total_pipeline_value)}</div>`,
        {
          sticky: true,
          direction: "top",
          className: "area-mapping-tooltip",
        }
      );

      layer.on({
        mouseover: () => {
          pathLayer.setStyle({ fillOpacity: 0.9, weight: 2 });
        },
        mouseout: () => {
          pathLayer.setStyle({ fillOpacity: 0.7, weight: 1.2 });
        },
      });
    },
    []
  );

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-destructive/10">
        <div className="flex flex-col items-center gap-2">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-muted-foreground">{t("map.loadError")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={INDONESIA_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ width: "100%", height: "100%" }}
        zoomControl={false}
      >
        <TileLayer url={selectedTileLayer.url} attribution={selectedTileLayer.attribution} />

        {mapMode === "regional-intensity" && geoJsonData && (
          <GeoJSON data={geoJsonData} style={geoJsonStyle} onEachFeature={onEachGeoJsonFeature} />
        )}

        {!isLoading && mapMode === "location-view" && (
          <MarkerClusterGroup chunkedLoading>
            {filteredItems.map((item) => {
              if (item.type === "lead" && item.lead) {
                return <LeadMarker key={`lead-${item.lead.id}`} data={item.lead} simple />;
              }

              if (item.type === "pipeline" && item.pipeline) {
                return <PipelineMarker key={`pipeline-${item.pipeline.id}`} data={item.pipeline} simple />;
              }

              return null;
            })}
          </MarkerClusterGroup>
        )}

        {!isLoading && mapMode === "location-view" && <FitBoundsToMarkers items={filteredItems} />}
      </MapContainer>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="absolute left-6 top-6 rounded-lg border border-border/30 bg-card/95 p-4 shadow-2xl backdrop-blur-md"
        style={{ zIndex: 1100 }}
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary shadow-lg">
            <MapPin className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-medium text-foreground">{t("map.areaMapping")}</h1>
            <p className="text-xs text-muted-foreground">
              {mapMode === "regional-intensity" ? t("map.showingHeatmap") : t("map.locationView")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="h-8 cursor-pointer bg-background/95">
              <SelectValue placeholder={t("map.month")} />
            </SelectTrigger>
            <SelectContent style={{ zIndex: 1300 }} position="popper" sideOffset={4}>
              <SelectItem value="__all__" className="cursor-pointer">{t("map.allMonths")}</SelectItem>
              <SelectItem value="1" className="cursor-pointer">January</SelectItem>
              <SelectItem value="2" className="cursor-pointer">February</SelectItem>
              <SelectItem value="3" className="cursor-pointer">March</SelectItem>
              <SelectItem value="4" className="cursor-pointer">April</SelectItem>
              <SelectItem value="5" className="cursor-pointer">May</SelectItem>
              <SelectItem value="6" className="cursor-pointer">June</SelectItem>
              <SelectItem value="7" className="cursor-pointer">July</SelectItem>
              <SelectItem value="8" className="cursor-pointer">August</SelectItem>
              <SelectItem value="9" className="cursor-pointer">September</SelectItem>
              <SelectItem value="10" className="cursor-pointer">October</SelectItem>
              <SelectItem value="11" className="cursor-pointer">November</SelectItem>
              <SelectItem value="12" className="cursor-pointer">December</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="h-8 cursor-pointer bg-background/95">
              <SelectValue placeholder={t("map.year")} />
            </SelectTrigger>
            <SelectContent style={{ zIndex: 1300 }} position="popper" sideOffset={4}>
              <SelectItem value="__all__" className="cursor-pointer">{t("map.allYears")}</SelectItem>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={String(year)} className="cursor-pointer">
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-3 flex gap-2 border-t border-border/40 pt-3">
          {([
            { value: "all", label: t("map.all") },
            { value: "lead", label: t("map.leads") },
            { value: "pipeline", label: t("map.pipelineDeals") },
          ] as const).map((option) => (
            <Button
              key={option.value}
              size="sm"
              variant={selectedType === option.value ? "default" : "outline"}
              onClick={() => setSelectedType(option.value)}
              className="cursor-pointer"
            >
              {option.label}
            </Button>
          ))}
        </div>

      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="absolute right-6 top-6 flex flex-col gap-3"
        style={{ zIndex: 1100 }}
      >
        {data?.data?.summary && (
          <div className="w-80 border border-border/30 bg-card/95 p-4 shadow-2xl backdrop-blur-md rounded-lg">
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <TrendingUp className="h-4 w-4" />
              {t("map.summary")}
            </h3>
            <div className="grid grid-cols-2 gap-3 border-t border-border/40 pt-3">
              <div className="space-y-1 rounded-md border border-border/40 p-2">
                <p className="text-xs text-muted-foreground">{t("map.leads")}</p>
                <p className="text-lg font-bold text-primary">
                  {isLoading ? <Skeleton className="h-6 w-8" /> : summaryMetrics.totalLeads}
                </p>
              </div>
              <div className="space-y-1 rounded-md border border-border/40 p-2">
                <p className="text-xs text-muted-foreground">{t("map.pipelineDeals")}</p>
                <p className="text-lg font-bold text-orange-600">
                  {isLoading ? <Skeleton className="h-6 w-8" /> : summaryMetrics.pipelineDealCount}
                </p>
              </div>
              <div className="space-y-1 rounded-md border border-border/40 p-2">
                <p className="text-xs text-muted-foreground">{t("map.activities")}</p>
                <p className="text-lg font-bold">
                  {isLoading ? <Skeleton className="h-6 w-8" /> : summaryMetrics.totalActivities}
                </p>
              </div>
              <div className="space-y-1 rounded-md border border-border/40 p-2">
                <p className="text-xs text-muted-foreground">{t("map.pipelineValue")}</p>
                <p className="text-sm font-bold text-green-600">
                  {isLoading ? (
                    <Skeleton className="h-5 w-12" />
                  ) : (
                    formatCurrency(summaryMetrics.totalPipelineValue)
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 border border-border/30 bg-card/95 p-3 shadow-2xl backdrop-blur-md rounded-lg">
          {(["light", "dark", "satellite"] as const).map((style) => (
            <Button
              key={style}
              size="sm"
              variant={mapStyle === style ? "default" : "ghost"}
              onClick={() => setMapStyle(style)}
              className="cursor-pointer text-xs capitalize"
            >
              {style}
            </Button>
          ))}
        </div>

        <div className="flex gap-2 border border-border/30 bg-card/95 p-3 shadow-2xl backdrop-blur-md rounded-lg">
          <Button
            size="sm"
            variant={mapMode === "location-view" ? "default" : "outline"}
            onClick={() => setMapMode("location-view")}
            className="cursor-pointer"
          >
            {t("map.locationView")}
          </Button>
          <Button
            size="sm"
            variant={mapMode === "regional-intensity" ? "default" : "outline"}
            onClick={() => setMapMode("regional-intensity")}
            className="cursor-pointer"
          >
            {t("map.regionalIntensity")}
          </Button>
        </div>
      </motion.div>

      {mapMode === "regional-intensity" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="absolute bottom-6 left-6 rounded-lg border border-border/30 bg-card/95 p-4 shadow-2xl backdrop-blur-md"
          style={{ zIndex: 1100 }}
        >
          <h4 className="mb-2 text-xs font-semibold">
            {t("map.regionalDensityScale")}
          </h4>
          <div className="flex items-center gap-2">
            {INTENSITY_COLORS.map((color, index) => (
              <div
                key={color}
                className="h-4 w-4 rounded border border-border/50"
                style={{ backgroundColor: color }}
                title={`${Math.round((index / (INTENSITY_COLORS.length - 1)) * 100)}%`}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("map.lowToHighDensity")}
          </p>
        </motion.div>
      )}

      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-sm"
            style={{ zIndex: 950 }}
          >
            <div className="rounded-lg bg-card p-6 shadow-lg">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .leaflet-popup-content-wrapper,
        .leaflet-tooltip,
        .area-mapping-popup,
        .area-mapping-tooltip {
          background: hsl(var(--card)) !important;
          color: hsl(var(--foreground)) !important;
          border: 1px solid hsl(var(--border)) !important;
        }

        /* Ensure tooltips and popups maintain proper contrast in dark mode */
        .leaflet-tooltip,
        .area-mapping-tooltip {
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.25);
        }
      `}</style>
    </div>
  );
}
