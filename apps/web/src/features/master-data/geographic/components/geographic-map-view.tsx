"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { Layers, MapPin, Search, X, RotateCcw, ChevronLeft, Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggleButton } from "@/components/ui/theme-toggle";
import { NotificationBadge } from "@/features/notifications/components/notification-badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import L from "leaflet";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — leaflet CSS has no type declarations; required for map rendering
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import type { Feature, FeatureCollection } from "geojson";

// Turbopack may return a plain string or a StaticImageData object for PNG imports.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getImageSrc = (img: any): string => {
  if (typeof img === "string" && img) return img;
  if (typeof img?.src === "string" && img.src) return img.src;
  if (typeof img?.default === "string" && img.default) return img.default;
  if (typeof img?.default?.src === "string" && img.default.src) return img.default.src;
  return "";
};

// Fix for default marker icons in Next.js (static imports avoid CDN dependency)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: getImageSrc(markerIcon2x),
  iconUrl: getImageSrc(markerIcon),
  shadowUrl: getImageSrc(markerShadow),
});

type MapStyle = "auto" | "light" | "dark" | "satellite";
type DrillLevel = "province" | "city" | "district";

const TILE_LAYERS: Record<Exclude<MapStyle, "auto">, { url: string; attribution: string }> = {
  light: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CARTO',
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CARTO',
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri",
  },
};

const INDONESIA_CENTER: L.LatLngExpression = [-2.5, 118.0];
const DEFAULT_ZOOM = 5;
const FEATURE_COLORS = [
  "var(--color-primary)", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#6366f1",
  "#a855f7", "#84cc16", "#0ea5e9", "#e11d48", "var(--color-success)",
  "#d97706", "#7c3aed", "#059669", "#dc2626", "#2563eb",
];
const HOVER_OPACITY = 0.6;
const DEFAULT_OPACITY = 0.35;

// Ensures container size is correct on mount
function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const id = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(id);
  }, [map]);
  return null;
}

// Fits map bounds to a GeoJSON FeatureCollection with animation
function FitBounds({ data, animate }: { data: FeatureCollection | null; animate: boolean }) {
  const map = useMap();
  const prevKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!data?.features?.length) return;
    const key = JSON.stringify(data.features.map((f) => f.properties?.WADMPR ?? f.properties?.WADMKK));
    if (prevKeyRef.current === key) return;
    prevKeyRef.current = key;

    try {
      const layer = L.geoJSON(data);
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [30, 30], animate, maxZoom: 14 });
      }
    } catch {
      // Invalid geometry
    }
  }, [data, map, animate]);

  return null;
}

/** Extracts unique sorted values from features for a given property key */
function extractUniqueValues(features: Feature[], key: string): string[] {
  const set = new Set<string>();
  for (const f of features) {
    const v = f.properties?.[key];
    if (v) set.add(String(v).trim());
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "id"));
}

/** Assigns a stable color from the palette to each unique grouping key */
function buildColorMap(groups: string[]): Map<string, string> {
  const map = new Map<string, string>();
  const sorted = [...groups].sort((a, b) => a.localeCompare(b, "id"));
  sorted.forEach((group, idx) => {
    map.set(group, FEATURE_COLORS[idx % FEATURE_COLORS.length]);
  });
  return map;
}

function GeographicMapViewComponent() {
  const t = useTranslations("geographic");
  const { resolvedTheme } = useTheme();
  const isMobile = useIsMobile();

  // Raw GeoJSON source
  const [allFeatures, setAllFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);

  // Sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Cascading filter state — values are the actual names (string), not IDs
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);

  // Map state
  const [mapStyle, setMapStyle] = useState<MapStyle>("auto");
  const [geoJsonKey, setGeoJsonKey] = useState(0);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const layerByGroupRef = useRef<Map<string, L.Path[]>>(new Map());

  // Load GeoJSON on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/geojson/indonesia-provinces-simple.geojson");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.type === "FeatureCollection" && Array.isArray(data.features)) {
          setAllFeatures(data.features);
        }
      } catch {
        // GeoJSON file not available
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Determine current drill level
  const currentLevel: DrillLevel = useMemo(() => {
    if (selectedCity) return "district";
    if (selectedProvince) return "city";
    return "province";
  }, [selectedProvince, selectedCity]);

  // The property key used for grouping/coloring at the current level
  const groupKey = useMemo(() => {
    if (currentLevel === "district") return "WADMKC";
    if (currentLevel === "city") return "WADMKK";
    return "WADMPR";
  }, [currentLevel]);

  // Filter features based on current selection
  const filteredFeatures = useMemo(() => {
    let features = allFeatures;
    if (selectedProvince) {
      features = features.filter((f) => f.properties?.WADMPR === selectedProvince);
    }
    if (selectedCity) {
      features = features.filter((f) => f.properties?.WADMKK === selectedCity);
    }
    if (selectedDistrict) {
      features = features.filter((f) => f.properties?.WADMKC === selectedDistrict);
    }
    return features;
  }, [allFeatures, selectedProvince, selectedCity, selectedDistrict]);

  // Build FeatureCollection for Leaflet
  const geoJsonData = useMemo<FeatureCollection | null>(() => {
    if (!filteredFeatures.length) return null;
    return { type: "FeatureCollection", features: filteredFeatures };
  }, [filteredFeatures]);

  // Available filter options derived from the GeoJSON data
  const provinceOptions = useMemo(() => extractUniqueValues(allFeatures, "WADMPR"), [allFeatures]);
  const cityOptions = useMemo(() => {
    if (!selectedProvince) return [];
    return extractUniqueValues(
      allFeatures.filter((f) => f.properties?.WADMPR === selectedProvince),
      "WADMKK",
    );
  }, [allFeatures, selectedProvince]);
  const districtOptions = useMemo(() => {
    if (!selectedCity) return [];
    return extractUniqueValues(
      allFeatures.filter((f) => f.properties?.WADMPR === selectedProvince && f.properties?.WADMKK === selectedCity),
      "WADMKC",
    );
  }, [allFeatures, selectedProvince, selectedCity]);

  // Unique groups visible on the map at the current level
  const visibleGroups = useMemo(() => extractUniqueValues(filteredFeatures, groupKey), [filteredFeatures, groupKey]);
  const colorMap = useMemo(() => buildColorMap(visibleGroups), [visibleGroups]);

  // Legend search filter
  const filteredGroups = useMemo(() => {
    if (!search.trim()) return visibleGroups;
    const q = search.toLowerCase().trim();
    return visibleGroups.filter((g) => g.toLowerCase().includes(q));
  }, [visibleGroups, search]);

  // Handlers
  const handleProvinceChange = useCallback((value: string) => {
    setSelectedProvince(value);
    setSelectedCity("");
    setSelectedDistrict("");
    setHoveredGroup(null);
    setShouldAnimate(true);
  }, []);

  const handleCityChange = useCallback((value: string) => {
    setSelectedCity(value);
    setSelectedDistrict("");
    setHoveredGroup(null);
    setShouldAnimate(true);
  }, []);

  const handleDistrictChange = useCallback((value: string) => {
    setSelectedDistrict(value);
    setHoveredGroup(null);
    setShouldAnimate(true);
  }, []);

  const handleReset = useCallback(() => {
    setSelectedProvince("");
    setSelectedCity("");
    setSelectedDistrict("");
    setHoveredGroup(null);
    setSearch("");
    setShouldAnimate(true);
  }, []);

  // Style function for each GeoJSON feature
  const styleFeature = useCallback(
    (feature?: Feature): L.PathOptions => {
      if (!feature) return {};
      const group = String(feature.properties?.[groupKey] ?? "");
      const color = colorMap.get(group) ?? "var(--color-muted-foreground)";
      return {
        fillColor: color,
        fillOpacity: DEFAULT_OPACITY,
        color: "rgba(255,255,255,0.5)",
        weight: 1,
      };
    },
    [groupKey, colorMap],
  );

  // Per-feature event binding
  const onEachFeature = useCallback(
    (feature: Feature, layer: L.Layer) => {
      const props = feature.properties;
      if (!props) return;

      const group = String(props[groupKey] ?? "");
      const province = String(props.WADMPR ?? "");
      const city = String(props.WADMKK ?? "");
      const district = String(props.WADMKC ?? "");
      const village = String(props.WADMKD ?? props.NAMOBJ ?? "");

      // Track layers by group for imperative style updates
      if (!layerByGroupRef.current.has(group)) {
        layerByGroupRef.current.set(group, []);
      }
      layerByGroupRef.current.get(group)?.push(layer as L.Path);

      // Build tooltip content based on current level
      let tooltipHtml = `<div style="font-weight:600">${group}</div>`;
      if (currentLevel === "province") {
        tooltipHtml += `<div style="font-size:11px;opacity:0.8">${city} - ${district}</div>`;
      } else if (currentLevel === "city") {
        tooltipHtml += `<div style="font-size:11px;opacity:0.8">${district}</div>`;
      }
      if (village) {
        tooltipHtml += `<div style="font-size:10px;opacity:0.6">${village}</div>`;
      }

      (layer as L.Path).bindTooltip(tooltipHtml, {
        sticky: true,
        direction: "top",
        className: "area-map-tooltip",
      });

      (layer as L.Path).on({
        mouseover: () => setHoveredGroup(group),
        mouseout: () => setHoveredGroup(null),
        click: () => {
          // Drill down into the clicked group
          if (currentLevel === "province") {
            handleProvinceChange(province);
          } else if (currentLevel === "city") {
            handleCityChange(city);
          } else if (currentLevel === "district") {
            handleDistrictChange(district);
          }
        },
      });
    },
    [groupKey, currentLevel, handleProvinceChange, handleCityChange, handleDistrictChange],
  );

  // Remount GeoJSON layer when filtered data changes
  useEffect(() => {
    layerByGroupRef.current.clear();
    setGeoJsonKey((prev) => prev + 1);
  }, [geoJsonData]);

  // Imperative style update on hover
  useEffect(() => {
    layerByGroupRef.current.forEach((layers, group) => {
      const color = colorMap.get(group) ?? "var(--color-muted-foreground)";
      const isHovered = group === hoveredGroup;
      const style: L.PathOptions = {
        fillColor: color,
        fillOpacity: isHovered ? HOVER_OPACITY : DEFAULT_OPACITY,
        color: isHovered ? color : "rgba(255,255,255,0.5)",
        weight: isHovered ? 2 : 1,
      };
      for (const layer of layers) {
        layer.setStyle(style);
      }
    });
  }, [hoveredGroup, colorMap]);

  const getActiveTileLayer = () => {
    if (mapStyle === "auto") {
      return resolvedTheme === "dark" ? TILE_LAYERS.dark : TILE_LAYERS.light;
    }
    return TILE_LAYERS[mapStyle];
  };

  const activeTile = getActiveTileLayer();

  // Level label for the sidebar header
  const levelLabel = useMemo(() => {
    if (currentLevel === "district") return t("common.districts");
    if (currentLevel === "city") return t("common.cities");
    return t("common.provinces");
  }, [currentLevel, t]);

  // Click handler for legend items — zooms to the group's features
  const handleLegendClick = useCallback(
    (group: string) => {
      if (currentLevel === "province") {
        handleProvinceChange(group);
      } else if (currentLevel === "city") {
        handleCityChange(group);
      } else {
        handleDistrictChange(group);
      }
    },
    [currentLevel, handleProvinceChange, handleCityChange, handleDistrictChange],
  );

  return (
    <div className="h-full w-full flex overflow-hidden">
      {/* Sidebar */}
      <div
        className={cn(
          "flex flex-col bg-background border-r transition-all duration-300 shrink-0",
          isMobile
            ? isSidebarOpen
              ? "absolute inset-y-0 left-0 z-30 w-80 shadow-xl"
              : "absolute inset-y-0 -left-80 z-30 w-80"
            : "w-80",
        )}
      >
        {/* Header */}
        <div className="shrink-0 border-b bg-background">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <Link
                href="/master-data"
                className="text-muted-foreground hover:text-foreground transition-colors mr-1"
              >
                <ChevronLeft className="h-5 w-5" />
              </Link>
              <h1 className="font-semibold text-lg">{t("map.title")}</h1>
            </div>
            <div className="flex items-center gap-1">
              <NotificationBadge />
              <ThemeToggleButton />
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSidebarOpen(false)}
                  className="cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="px-4 pb-4 space-y-3">
            {/* Province */}
            <Select value={selectedProvince} onValueChange={handleProvinceChange}>
              <SelectTrigger className="w-full cursor-pointer">
                <SelectValue placeholder={t("map.selectProvince")} />
              </SelectTrigger>
              <SelectContent>
                {provinceOptions.map((name) => (
                  <SelectItem key={name} value={name} className="cursor-pointer">
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* City — visible when province selected */}
            {selectedProvince && (
              <Select value={selectedCity} onValueChange={handleCityChange}>
                <SelectTrigger className="w-full cursor-pointer">
                  <SelectValue placeholder={t("map.selectCity")} />
                </SelectTrigger>
                <SelectContent>
                  {cityOptions.map((name) => (
                    <SelectItem key={name} value={name} className="cursor-pointer">
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* District — visible when city selected */}
            {selectedCity && (
              <Select value={selectedDistrict} onValueChange={handleDistrictChange}>
                <SelectTrigger className="w-full cursor-pointer">
                  <SelectValue placeholder={t("map.selectDistrict")} />
                </SelectTrigger>
                <SelectContent>
                  {districtOptions.map((name) => (
                    <SelectItem key={name} value={name} className="cursor-pointer">
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Reset + Search */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("common.search")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              {(selectedProvince || selectedCity || selectedDistrict) && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleReset}
                  className="cursor-pointer shrink-0"
                  title={t("map.resetFilters")}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Legend list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="p-3 border-b space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">{t("map.noData")}</p>
            </div>
          ) : (
            <>
              <div className="p-4 pb-2 flex items-center justify-between border-b bg-muted/50">
                <span className="text-sm text-muted-foreground">
                  {filteredGroups.length} {levelLabel}
                </span>
                {selectedProvince && (
                  <Badge variant="secondary" className="text-xs truncate max-w-[140px]">
                    {selectedCity ?? selectedProvince}
                  </Badge>
                )}
              </div>
              {filteredGroups.map((group) => {
                const color = colorMap.get(group) ?? "var(--color-muted-foreground)";
                const count = filteredFeatures.filter(
                  (f) => f.properties?.[groupKey] === group,
                ).length;
                const isHovered = hoveredGroup === group;
                return (
                  <div
                    key={group}
                    onClick={() => handleLegendClick(group)}
                    onMouseEnter={() => setHoveredGroup(group)}
                    onMouseLeave={() => setHoveredGroup(null)}
                    className={cn(
                      "group relative p-3 border-b hover:bg-accent/50 cursor-pointer transition-colors",
                      isHovered && "bg-accent",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="rounded-full p-2 shrink-0 mt-0.5"
                        style={{ backgroundColor: `${color}20` }}
                      >
                        <MapPin className="h-4 w-4" style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <h4 className="font-medium text-sm truncate">{group}</h4>
                        <p className="text-xs text-muted-foreground">
                          {count} {count === 1 ? "area" : "areas"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative">
        {/* Mobile sidebar toggle */}
        {isMobile && !isSidebarOpen && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-4 left-4 z-20 bg-background shadow-lg cursor-pointer"
          >
            <Globe className="h-4 w-4" />
          </Button>
        )}

        {/* Map Style Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="absolute top-2 right-2 z-1000 bg-background/90 backdrop-blur-sm shadow-md cursor-pointer hover:bg-background"
              type="button"
            >
              <Layers className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36 z-1001">
            {(["auto", "light", "dark", "satellite"] as MapStyle[]).map((style) => (
              <DropdownMenuItem
                key={style}
                onClick={() => setMapStyle(style)}
                className={cn("cursor-pointer capitalize", mapStyle === style && "bg-accent")}
              >
                {style === "auto" ? "Auto" : style}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/50 backdrop-blur-sm">
            <div className="text-center text-muted-foreground">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary mx-auto mb-2" />
              <p className="text-sm">{t("common.loading")}</p>
            </div>
          </div>
        )}

        <MapContainer
          center={INDONESIA_CENTER}
          zoom={DEFAULT_ZOOM}
          className="h-full w-full z-0"
          scrollWheelZoom
          touchZoom
          doubleClickZoom
          dragging
        >
          <InvalidateSize />
          <TileLayer
            key={`${mapStyle}-${resolvedTheme}`}
            attribution={activeTile.attribution}
            url={activeTile.url}
          />
          <FitBounds data={geoJsonData} animate={shouldAnimate} />
          {geoJsonData && (
            <GeoJSON
              key={geoJsonKey}
              data={geoJsonData}
              style={styleFeature}
              onEachFeature={onEachFeature}
            />
          )}
        </MapContainer>
      </div>

      {/* Mobile overlay */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}

// Dynamic export to prevent SSR for Leaflet
export const GeographicMapView = dynamic(
  () => Promise.resolve({ default: GeographicMapViewComponent }),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center bg-muted h-full w-full">
        <div className="text-center text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary mx-auto mb-2" />
          <p className="text-sm">Loading map...</p>
        </div>
      </div>
    ),
  },
);
