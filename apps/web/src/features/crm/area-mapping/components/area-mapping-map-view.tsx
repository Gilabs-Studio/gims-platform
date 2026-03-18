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
  AreaMappingCustomerData,
  AreaMappingItem,
  AreaMappingLeadData,
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
  return String(value ?? "")
    .toLowerCase()
    .replace(/^provinsi\s+/, "")
    .replace(/^kota\s+/, "")
    .replace(/^kabupaten\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
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

function buildClustersFromItems(items: AreaMappingItem[]): AreaMappingCluster[] {
  const clusters = new Map<
    string,
    {
      city: string;
      totalPoints: number;
      customerCount: number;
      leadCount: number;
      totalLat: number;
      totalLng: number;
      totalIntensity: number;
      maxIntensity: number;
    }
  >();

  for (const item of items) {
    const point = item.type === "customer" ? item.customer : item.lead;
    if (!point) continue;

    const city = String(point.city ?? "").trim() || "Unknown";
    const key = normalizeRegionName(city);
    const existing = clusters.get(key) ?? {
      city,
      totalPoints: 0,
      customerCount: 0,
      leadCount: 0,
      totalLat: 0,
      totalLng: 0,
      totalIntensity: 0,
      maxIntensity: 0,
    };

    existing.totalPoints += 1;
    existing.customerCount += item.type === "customer" ? 1 : 0;
    existing.leadCount += item.type === "lead" ? 1 : 0;
    existing.totalLat += point.latitude;
    existing.totalLng += point.longitude;
    existing.totalIntensity += point.intensity_score;
    existing.maxIntensity = Math.max(existing.maxIntensity, point.intensity_score);
    clusters.set(key, existing);
  }

  return Array.from(clusters.values())
    .filter((cluster) => cluster.totalPoints > 0)
    .sort((left, right) => right.totalPoints - left.totalPoints)
    .map((cluster) => ({
      city: cluster.city,
      total_points: cluster.totalPoints,
      customer_count: cluster.customerCount,
      lead_count: cluster.leadCount,
      avg_intensity: cluster.totalIntensity / cluster.totalPoints,
      max_intensity: cluster.maxIntensity,
      center_lat: cluster.totalLat / cluster.totalPoints,
      center_lng: cluster.totalLng / cluster.totalPoints,
    }));
}

function FitBoundsToMarkers({ items }: { items: AreaMappingItem[] }) {
  const map = useMap();

  useEffect(() => {
    if (!items.length) return;

    const bounds = L.latLngBounds(
      items
        .map((item) => {
          const point = item.type === "customer" ? item.customer : item.lead;
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

function CustomerMarker({ data, simple }: { data: AreaMappingCustomerData; simple?: boolean }) {
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
                <span>Activity:</span>
                <span className="font-medium">{data.activity_count}</span>
              </div>
              <div className="flex justify-between">
                <span>Deals:</span>
                <span className="font-medium">{data.deal_count}</span>
              </div>
              <div className="flex justify-between">
                <span>Value:</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(data.total_deal_value)}
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
        border: 3px solid #1e40af;
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
        C
      </div>
    `,
    iconSize: [30, 30],
    className: "customer-marker",
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
              <span>Activity:</span>
              <span className="font-medium">{data.activity_count}</span>
            </div>
            <div className="flex justify-between">
              <span>Deals:</span>
              <span className="font-medium">{data.deal_count}</span>
            </div>
            <div className="flex justify-between">
              <span>Value:</span>
              <span className="font-medium text-green-600">
                {formatCurrency(data.total_deal_value)}
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

export function AreaMappingMapView() {
  const t = useTranslations("areaMapping");
  const { resolvedTheme } = useTheme();

  const [mapStyle, setMapStyle] = useState<MapStyle>("auto");
  const [mapMode, setMapMode] = useState<MapMode>("location-view");
  const [selectedType, setSelectedType] = useState<"all" | "customer" | "lead">("all");
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

  const items = useMemo((): AreaMappingItem[] => data?.data?.items ?? [], [data?.data?.items]);
  const filteredItems = useMemo((): AreaMappingItem[] => {
    if (selectedType === "all") return items;
    return items.filter((item) => item.type === selectedType);
  }, [items, selectedType]);

  const visibleClusters = useMemo((): AreaMappingCluster[] => {
    return buildClustersFromItems(filteredItems);
  }, [filteredItems]);

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
    if (!allFeatures.length || !visibleClusters.length) return null;

    const features = allFeatures.filter((feature) => {
      const city = normalizeRegionName(String(feature.properties?.WADMKK ?? ""));
      const cluster = clusterLookup.get(city);
      return (cluster?.total_points ?? 0) > 0;
    });

    if (!features.length) return null;

    return { type: "FeatureCollection", features };
  }, [allFeatures, clusterLookup, visibleClusters]);

  const geoJsonStyle = useCallback(
    (feature?: Feature) => {
      const city = normalizeRegionName(String(feature?.properties?.WADMKK ?? ""));
      const cluster = clusterLookup.get(city);
      const totalPoints = cluster?.total_points ?? 0;

      if (totalPoints <= 0) {
        return {
          fillColor: "transparent",
          fillOpacity: 0,
          weight: 0,
          color: "transparent",
          opacity: 0,
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
    [clusterLookup, maxClusterPoints, resolvedTheme]
  );

  const onEachGeoJsonFeature = useCallback(
    (feature: Feature, layer: L.Layer) => {
      const cityLabel = String(feature.properties?.WADMKK ?? "Unknown City");
      const cluster = clusterLookup.get(normalizeRegionName(cityLabel));
      if (!cluster || cluster.total_points <= 0) {
        return;
      }

      const pathLayer = layer as L.Path;

      layer.bindTooltip(
        `<div style="font-size:12px;"><strong>${cityLabel}</strong><br/>Locations: ${cluster.total_points}<br/>Customers: ${cluster.customer_count}<br/>Leads: ${cluster.lead_count}</div>`,
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
    [clusterLookup]
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
              if (item.type === "customer" && item.customer) {
                return <CustomerMarker key={`customer-${item.customer.id}`} data={item.customer} simple />;
              }

              if (item.type === "lead" && item.lead) {
                return <LeadMarker key={`lead-${item.lead.id}`} data={item.lead} simple />;
              }

              return null;
            })}
          </MarkerClusterGroup>
        )}

        {!isLoading && <FitBoundsToMarkers items={filteredItems} />}
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
            <p className="text-xs text-muted-foreground">{t("map.showingLocations")}</p>
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

        <div className="mt-2 flex gap-2">
          {([
            { value: "all", label: "All" },
            { value: "customer", label: "Customers" },
            { value: "lead", label: "Leads" },
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
              Summary
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t("map.customers")}</p>
                <p className="text-lg font-bold text-primary">
                  {isLoading ? <Skeleton className="h-6 w-8" /> : data.data.summary.total_customers}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t("map.leads")}</p>
                <p className="text-lg font-bold text-orange-600">
                  {isLoading ? <Skeleton className="h-6 w-8" /> : data.data.summary.total_leads}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t("map.activities")}</p>
                <p className="text-lg font-bold">
                  {isLoading ? <Skeleton className="h-6 w-8" /> : data.data.summary.total_activities}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Pipeline Value</p>
                <p className="text-sm font-bold text-green-600">
                  {isLoading ? (
                    <Skeleton className="h-5 w-12" />
                  ) : (
                    formatCurrency(data.data.summary.total_pipeline_value)
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
