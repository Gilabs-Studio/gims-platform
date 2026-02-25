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
import type { FeatureCollection, Feature } from "geojson";
import type { Area } from "../../types";

// Fix for default marker icons in Next.js
if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });
}

// Dynamic imports for SSR compatibility
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const GeoJSON = dynamic(
  () => import("react-leaflet").then((mod) => mod.GeoJSON),
  { ssr: false }
);

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

const DEFAULT_AREA_COLOR = "#94a3b8";
const HOVER_OPACITY = 0.6;
const SELECTED_OPACITY = 0.7;
const DEFAULT_OPACITY = 0.35;

interface AreaMapViewProps {
  readonly areas: Area[];
  readonly selectedAreaId?: string | null;
  readonly onAreaClick?: (area: Area) => void;
  readonly isLoading?: boolean;
  readonly className?: string;
}

// MapFocus component to handle map view changes
const MapFocus = dynamic(
  () =>
    Promise.all([import("react-leaflet"), import("react")]).then(
      ([reactLeaflet, react]) => {
        const MapFocusInner = ({
          center,
          zoom,
          shouldAnimate,
        }: {
          center: L.LatLngExpression;
          zoom: number;
          shouldAnimate: boolean;
        }) => {
          const map = reactLeaflet.useMap();
          const prevRef = react.useRef<string | null>(null);

          react.useEffect(() => {
            if (!map) return;
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
        };
        return { default: MapFocusInner };
      }
    ),
  { ssr: false }
);

function AreaMapViewComponent({
  areas,
  selectedAreaId,
  onAreaClick,
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
  const [geoJsonKey, setGeoJsonKey] = useState(0);
  const areaToFeatureMapRef = useRef<Map<string, Feature>>(new Map());
  const { resolvedTheme } = useTheme();

  // Build area lookup by province name (case-insensitive)
  const areaByProvince = useMemo(() => {
    const map = new Map<string, Area>();
    for (const area of areas) {
      if (area.province) {
        map.set(area.province.toLowerCase(), area);
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

  // Match area to feature by province name
  const findAreaForFeature = useCallback(
    (feature: Feature): Area | undefined => {
      const province = getProvinceFromFeature(feature);
      if (!province) return undefined;
      return areaByProvince.get(province.toLowerCase());
    },
    [areaByProvince, getProvinceFromFeature]
  );

  // Style each GeoJSON feature based on matched area
  const styleFeature = useCallback(
    (feature?: Feature): L.PathOptions => {
      if (!feature) return {};
      const area = findAreaForFeature(feature);
      const isSelected = area?.id === selectedAreaId;
      const isHovered = area?.id === hoveredAreaId;
      const color = area?.color ?? DEFAULT_AREA_COLOR;

      return {
        fillColor: color,
        fillOpacity: isSelected
          ? SELECTED_OPACITY
          : isHovered
            ? HOVER_OPACITY
            : area
              ? DEFAULT_OPACITY
              : 0.1,
        color: isSelected ? color : isHovered ? color : "rgba(255,255,255,0.5)",
        weight: isSelected ? 3 : isHovered ? 2 : 1,
        dashArray: area ? undefined : "4 4",
      };
    },
    [findAreaForFeature, selectedAreaId, hoveredAreaId]
  );

  // Handle feature events (hover, click)
  const onEachFeature = useCallback(
    (feature: Feature, layer: L.Layer) => {
      const area = findAreaForFeature(feature);
      if (!area) return;

      // Map area to its GeoJSON feature for zoom-to-area
      areaToFeatureMapRef.current.set(area.id, feature);

      // Tooltip with area name
      (layer as L.Path).bindTooltip(
        `<div style="font-weight:600">${area.name}</div>
         <div style="font-size:11px;opacity:0.8">${area.code ?? ""}</div>
         ${area.manager ? `<div style="font-size:11px;opacity:0.7">Manager: ${area.manager.name}</div>` : ""}`,
        { sticky: true, direction: "top", className: "area-map-tooltip" }
      );

      (layer as L.Path).on({
        mouseover: () => setHoveredAreaId(area.id),
        mouseout: () => setHoveredAreaId(null),
        click: () => onAreaClick?.(area),
      });
    },
    [findAreaForFeature, onAreaClick]
  );

  // Update GeoJSON styling reactively
  useEffect(() => {
    setGeoJsonKey((prev) => prev + 1);
  }, [selectedAreaId, hoveredAreaId, areas]);

  // Zoom to selected area
  useEffect(() => {
    if (selectedAreaId && geoJsonData) {
      const feature = areaToFeatureMapRef.current.get(selectedAreaId);
      if (feature) {
        try {
          const geoLayer = L.geoJSON(feature);
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
            className="absolute top-2 right-2 z-[1000] bg-background/90 backdrop-blur-sm shadow-md cursor-pointer hover:bg-background"
            type="button"
          >
            <Layers className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36 z-[1001]">
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
      <div className="absolute bottom-4 right-4 z-[1000] bg-background/90 backdrop-blur-sm rounded-lg shadow-md p-3 max-h-[200px] overflow-y-auto">
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
        <TileLayer
          key={`${mapStyle}-${resolvedTheme}`}
          attribution={activeTile.attribution}
          url={activeTile.url}
        />
        <MapFocus center={mapCenter} zoom={mapZoom} shouldAnimate={shouldAnimate} />
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
