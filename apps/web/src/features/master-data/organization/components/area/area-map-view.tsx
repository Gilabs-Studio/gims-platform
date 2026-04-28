"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import L from "leaflet";
// Static imports are safe here — this whole file is loaded via dynamic({ ssr: false })
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — leaflet CSS has no type declarations; required for map rendering
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import type { FeatureCollection, Feature, Geometry, GeoJsonObject, MultiPolygon, Polygon } from "geojson";
import type { Area } from "../../types";

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
    attribution: '&copy; Esri',
  },
};

const DEFAULT_AREA_COLOR = "var(--color-muted-foreground)";
const HOVER_OPACITY = 0.6;
const SELECTED_OPACITY = 0.7;
const DEFAULT_OPACITY = 0.35;

interface AreaMapViewProps {
  readonly areas: Area[];
  readonly selectedAreaId?: string | null;
  readonly onAreaClick?: (area: Area) => void;
  readonly onSelectionChange?: (selection: { areaIds: string[]; cities: string[]; polygon?: Geometry | undefined }) => void;
  readonly resetSelectionToken?: number;
  readonly isLoading?: boolean;
  readonly className?: string;
}

// Calls map.invalidateSize() once on mount so tiles render correctly
// when the map initialises inside an animated or dynamically-sized container.
function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    // Small delay ensures the container has its final CSS dimensions
    const id = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(id);
  }, [map]);
  return null;
}

// Moves the map view when center/zoom props change
function MapFocus({
  center,
  zoom,
  shouldAnimate,
}: {
  center: L.LatLngExpression;
  zoom: number;
  shouldAnimate: boolean;
}) {
  const map = useMap();
  const prevRef = useRef<string | null>(null);

  useEffect(() => {
    const key = `${JSON.stringify(center)}-${zoom}`;
    if (prevRef.current === key) return;
    prevRef.current = key;

    if (shouldAnimate) {
      map.flyTo(center, zoom, { duration: 1.5 });
    } else {
      map.setView(center, zoom, { animate: false });
    }
  }, [map, center, zoom, shouldAnimate]);

  return null;
}

function AreaMapViewComponent({
  areas,
  selectedAreaId,
  onAreaClick,
  onSelectionChange,
  resetSelectionToken,
  isLoading,
  className,
}: AreaMapViewProps) {
  const [geoJsonData, setGeoJsonData] = useState<FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapStyle, setMapStyle] = useState<MapStyle>("auto");
  const [mapCenter, setMapCenter] = useState<L.LatLngExpression>([-2.5, 118.0]);
  const [mapZoom, setMapZoom] = useState(5);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [hoveredAreaId, setHoveredAreaId] = useState<string | null>(null);
  // Selection supports multi-select by existing area id and by city (WADMKK)
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const areaToFeatureMapRef = useRef<Map<string, Feature[]>>(new Map());
  // Direct layer references so we can call setStyle() without remounting
  const layerBySelectionKeyRef = useRef<Map<string, L.Path[]>>(new Map());
  // map city(lowercase) => features for non-area features
  const cityToFeatureRef = useRef<Map<string, Feature[]>>(new Map());
  const { resolvedTheme } = useTheme();

  // Build area lookup by city/regency name (case-insensitive).
  // Regency can contain multiple cities separated by comma/semicolon/pipe.
  const areaByCity = useMemo(() => {
    const map = new Map<string, Area>();
    for (const area of areas) {
      if (!area.regency) continue;
      const cities = area.regency
        .split(/[,;|]/)
        .map((city) => city.trim().toLowerCase())
        .filter(Boolean);
      for (const city of cities) {
        map.set(city, area);
      }
    }
    return map;
  }, [areas]);

  // Load GeoJSON data
  useEffect(() => {
    const loadGeoJSON = async () => {
      try {
        const response = await fetch("/geojson/indonesia-provinces-simple.geojson");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (data.type === "FeatureCollection" && Array.isArray(data.features)) {
          setGeoJsonData(data);
          setLoading(false);
        }
      } catch {
        setLoading(false);
      }
    };
    loadGeoJSON();
  }, []);

  // Extract province from GeoJSON feature properties
  const getProvinceFromFeature = useCallback((feature: Feature): string => {
    const props = feature.properties;
    if (!props) return "";
    return (props.WADMPR ?? props.name ?? props.NAME ?? "").toString().trim();
  }, []);

  // Extract city/regency from GeoJSON feature properties
  const getCityFromFeature = useCallback((feature: Feature): string => {
    const props = feature.properties;
    if (!props) return "";
    return (props.WADMKK ?? props.city ?? "").toString().trim();
  }, []);

  // Match area to feature by city name
  const findAreaForFeature = useCallback(
    (feature: Feature): Area | undefined => {
      const city = getCityFromFeature(feature);
      if (!city) return undefined;
      return areaByCity.get(city.toLowerCase());
    },
    [areaByCity, getCityFromFeature]
  );

  const pushRefList = <T,>(map: Map<string, T[]>, key: string, value: T) => {
    const current = map.get(key);
    if (current) {
      current.push(value);
      return;
    }
    map.set(key, [value]);
  };

  // Style each GeoJSON feature based on matched area — initial render only.
  // Hover and selection updates are applied imperatively via setStyle() in the effect above.
  const styleFeature = useCallback(
    (feature?: Feature): L.PathOptions => {
      if (!feature) return {};
      const area = findAreaForFeature(feature);
      const city = getCityFromFeature(feature).toLowerCase();
      const isSelected = area ? selectedAreaIds.includes(area.id) : selectedCities.includes(city);
      const color = area?.color ?? DEFAULT_AREA_COLOR;

      return {
        fillColor: color,
        fillOpacity: isSelected ? SELECTED_OPACITY : area ? DEFAULT_OPACITY : 0.1,
        color: isSelected ? color : "rgba(255,255,255,0.5)",
        weight: isSelected ? 3 : 1,
        dashArray: area ? undefined : "4 4",
      };
    },
    [findAreaForFeature, getCityFromFeature, selectedAreaIds, selectedCities]
  );

  // Handle feature events (hover, click)
  const onEachFeature = useCallback(
    (feature: Feature, layer: L.Layer) => {
      const area = findAreaForFeature(feature);
      const city = getCityFromFeature(feature);
      const province = getProvinceFromFeature(feature);

      // Tooltip uses either matched area or city name
      const title = area ? area.name : city || "";
      (layer as L.Path).bindTooltip(
        `<div style="font-weight:600">${title}</div>
         <div style="font-size:11px;opacity:0.8">${area?.code ?? [city, province].filter(Boolean).join(", ")}</div>
         ${area?.manager ? `<div style="font-size:11px;opacity:0.7">Manager: ${area.manager.name}</div>` : ""}`,
        { sticky: true, direction: "top", className: "area-map-tooltip" }
      );

      // Track mapping for both existing areas and city keys
      if (area) {
        pushRefList(areaToFeatureMapRef.current, area.id, feature);
        pushRefList(layerBySelectionKeyRef.current, `area:${area.id}`, layer as L.Path);
      } else if (city) {
        // store city keyed layers/features to allow styling and geometry aggregation updates
        const cityKey = city.toLowerCase();
        pushRefList(layerBySelectionKeyRef.current, `city:${cityKey}`, layer as L.Path);
        pushRefList(cityToFeatureRef.current, cityKey, feature);
      }

      (layer as L.Path).on({
        mouseover: () => setHoveredAreaId(area?.id ?? null),
        mouseout: () => setHoveredAreaId(null),
        click: () => {
          // Toggle selection: existing area by id; otherwise by city
          // Note: onSelectionChange is called from the effect below, not here
          if (area) {
            setSelectedAreaIds((prev) => {
              const next = prev.includes(area.id) ? prev.filter((x) => x !== area.id) : [...prev, area.id];
              return next;
            });
            onAreaClick?.(area);
            return;
          }

          if (city) {
            setSelectedCities((prev) => {
              const lower = city.toLowerCase();
              const next = prev.includes(lower) ? prev.filter((c) => c !== lower) : [...prev, lower];
              return next;
            });
          }
        },
      });
    },
    [findAreaForFeature, getCityFromFeature, getProvinceFromFeature, onAreaClick]
  );

  // Clear cached feature/layer references when area data changes.
  useEffect(() => {
    areaToFeatureMapRef.current.clear();
    layerBySelectionKeyRef.current.clear();
    cityToFeatureRef.current.clear();
  }, [areas]);

  // Reset map-local selection state when parent requests it.
  useEffect(() => {
    if (typeof resetSelectionToken === "undefined") return;
    setSelectedAreaIds([]);
    setSelectedCities([]);
    setHoveredAreaId(null);
  }, [resetSelectionToken]);

  // Update layer styles directly when hover/selection changes — no GeoJSON remount
  useEffect(() => {
    layerBySelectionKeyRef.current.forEach((layers, key) => {
      // key can be area:<id> or city:<city>
      const isCityKey = typeof key === "string" && key.startsWith("city:");
      if (isCityKey) {
        const city = key.slice(5);
        const isSelected = selectedCities.includes(city);
        const color = DEFAULT_AREA_COLOR;
        layers.forEach((layer) => {
          layer.setStyle({
            fillColor: color,
            fillOpacity: isSelected ? SELECTED_OPACITY : DEFAULT_OPACITY,
            color: isSelected ? color : "rgba(255,255,255,0.5)",
            weight: isSelected ? 3 : 1,
          });
        });
        return;
      }

      const areaId = key.slice(5);
      const area = areas.find((a) => a.id === areaId);
      if (!area) return;
      const color = area.color ?? DEFAULT_AREA_COLOR;
      const isSelected = selectedAreaIds.includes(areaId);
      const isHovered = areaId === hoveredAreaId;
      layers.forEach((layer) => {
        layer.setStyle({
          fillColor: color,
          fillOpacity: isSelected ? SELECTED_OPACITY : isHovered ? HOVER_OPACITY : DEFAULT_OPACITY,
          color: isSelected || isHovered ? color : "rgba(255,255,255,0.5)",
          weight: isSelected ? 3 : isHovered ? 2 : 1,
        });
      });
    });
    // Build aggregated geometry for selected cities/features
    const multiPolygonCoords: MultiPolygon["coordinates"] = [];

    for (const areaId of selectedAreaIds) {
      const features = areaToFeatureMapRef.current.get(areaId) ?? [];
      for (const feat of features) {
        if (!feat.geometry) continue;
        const geometry = feat.geometry;
        if (geometry.type === "Polygon") {
          multiPolygonCoords.push(geometry.coordinates as Polygon["coordinates"]);
        } else if (geometry.type === "MultiPolygon") {
          multiPolygonCoords.push(...geometry.coordinates);
        }
      }
    }

    for (const city of selectedCities) {
      const features = cityToFeatureRef.current.get(city) ?? [];
      for (const feat of features) {
        if (!feat.geometry) continue;
        const geometry = feat.geometry;
        if (geometry.type === "Polygon") {
          multiPolygonCoords.push(geometry.coordinates as Polygon["coordinates"]);
        } else if (geometry.type === "MultiPolygon") {
          multiPolygonCoords.push(...geometry.coordinates);
        }
      }
    }

    const polygon: MultiPolygon | undefined = multiPolygonCoords.length > 0
      ? { type: "MultiPolygon", coordinates: multiPolygonCoords }
      : undefined;

    // notify parent selection change with optional polygon geometry
    onSelectionChange?.({ areaIds: selectedAreaIds, cities: selectedCities, polygon });
  }, [selectedAreaIds, selectedCities, hoveredAreaId, areas, onSelectionChange]);

  // Zoom to selected area
  useEffect(() => {
    if (selectedAreaId && geoJsonData) {
      const features = areaToFeatureMapRef.current.get(selectedAreaId) ?? [];
      if (features.length > 0) {
        try {
          const geoLayer = L.geoJSON(features as GeoJsonObject[]);
          const bounds = geoLayer.getBounds();
          const center = bounds.getCenter();
          setMapCenter([center.lat, center.lng]);
          setMapZoom(8);
          setShouldAnimate(true);
        } catch {
          // Feature geometry may not be valid for bounds
        }
      }
    }
  }, [selectedAreaId, geoJsonData]);

  const getActiveTileLayer = () => {
    if (mapStyle === "auto") {
      return resolvedTheme === "dark" ? TILE_LAYERS.dark : TILE_LAYERS.light;
    }
    return TILE_LAYERS[mapStyle];
  };

  const activeTile = getActiveTileLayer();

  if (loading || isLoading) {
    return (
      <div className={cn("flex items-center justify-center bg-muted h-full w-full", className)}>
        <div className="text-center text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary mx-auto mb-2" />
          <p className="text-sm">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full h-full", className)}>
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

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-1000 bg-background/90 backdrop-blur-sm rounded-lg shadow-md p-3 max-h-[200px] overflow-y-auto">
        <p className="text-xs font-medium mb-2">Areas</p>
        <div className="space-y-1">
          {areas.filter((a) => a.is_active).map((area) => (
            <button
              key={area.id}
              type="button"
              onClick={() => onAreaClick?.(area)}
              className={cn(
                "flex items-center gap-2 text-xs w-full text-left px-1 py-0.5 rounded cursor-pointer hover:bg-muted transition-colors",
                selectedAreaId === area.id && "bg-muted font-medium"
              )}
            >
              <span
                className="w-3 h-3 rounded-sm shrink-0"
                style={{ backgroundColor: area.color ?? DEFAULT_AREA_COLOR }}
              />
              <span className="truncate">{area.name}</span>
            </button>
          ))}
        </div>
      </div>

      <MapContainer
        center={[-2.5, 118.0]}
        zoom={5}
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
        <MapFocus center={mapCenter} zoom={mapZoom} shouldAnimate={shouldAnimate} />
        {geoJsonData && (
          <GeoJSON
            key={areas.map((area) => area.id).join("|")}
            data={geoJsonData}
            style={styleFeature}
            onEachFeature={onEachFeature}
          />
        )}
      </MapContainer>
    </div>
  );
}

// Wrap with dynamic to prevent SSR issues
export const AreaMapView = dynamic(
  () => Promise.resolve({ default: AreaMapViewComponent }),
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
  }
);
