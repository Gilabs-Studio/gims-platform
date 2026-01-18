"use client";

import { useEffect, useState } from "react";
import { Menu, X, Layers, Map, Satellite, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../dropdown-menu";
import dynamic from "next/dynamic";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "next-themes";

// Dynamic import untuk Leaflet (client-side only)
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);

export interface MapMarker<T> {
  id: number | string;
  latitude: number;
  longitude: number;
  data: T;
}

// Map tile providers
type MapStyle = "auto" | "street" | "light" | "dark" | "satellite";

const TILE_LAYERS: Record<Exclude<MapStyle, "auto">, { url: string; attribution: string }> = {
  street: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  light: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
  },
};

interface MapViewProps<T> {
  readonly markers: MapMarker<T>[];
  readonly renderMarkers: (markers: MapMarker<T>[]) => React.ReactNode;
  readonly onMarkerClick?: (marker: MapMarker<T>) => void;
  readonly selectedMarkerId?: number | string | null;
  readonly className?: string;
  readonly showSidebar?: boolean;
  readonly onToggleSidebar?: () => void;
  readonly defaultCenter?: [number, number];
  readonly defaultZoom?: number;
  readonly children?: React.ReactNode;
  readonly showLayerControl?: boolean;
}

// Default location: Jakarta, Indonesia
const DEFAULT_LOCATION: [number, number] = [-6.2088, 106.8456];
const DEFAULT_ZOOM = 13;

export function MapView<T>({
  markers,
  renderMarkers,
  className,
  showSidebar = false,
  onToggleSidebar,
  defaultCenter = DEFAULT_LOCATION,
  defaultZoom = DEFAULT_ZOOM,
  children,
  showLayerControl = true,
}: MapViewProps<T>) {
  const [mounted, setMounted] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapStyle>("auto");
  const isMobile = useIsMobile();
  const { resolvedTheme } = useTheme();

  // Setup Leaflet CSS and icon only on client-side
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Import CSS dynamically with type ignore
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

  // Get the active tile layer based on style and theme
  const getActiveTileLayer = () => {
    if (mapStyle === "light") {
      return TILE_LAYERS.street;
    }
    if (mapStyle === "satellite") {
      return TILE_LAYERS.satellite;
    }
    if (mapStyle === "dark") {
      return TILE_LAYERS.dark;
    }
    // Auto mode - follow system theme
    return resolvedTheme === "dark" ? TILE_LAYERS.dark : TILE_LAYERS.street;
  };

  const activeTileLayer = getActiveTileLayer();

  // Calculate initial center and zoom
  const getInitialCenterAndZoom = (): { center: [number, number]; zoom: number } => {
    if (!markers || markers.length === 0) {
      return { center: defaultCenter, zoom: defaultZoom };
    }

    const validMarkers = markers.filter(
      (m) => m.latitude != null && m.longitude != null && !isNaN(Number(m.latitude)) && !isNaN(Number(m.longitude))
    );

    if (validMarkers.length === 0) {
      return { center: defaultCenter, zoom: defaultZoom };
    }

    // Calculate center
    const lats = validMarkers.map((m) => Number(m.latitude));
    const lngs = validMarkers.map((m) => Number(m.longitude));
    const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
    const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

    // Calculate zoom based on bounds
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latDiff = maxLat - minLat;
    const lngDiff = maxLng - minLng;
    const maxDiff = Math.max(latDiff, lngDiff);

    // Set zoom based on difference (larger difference = lower zoom)
    let zoom = defaultZoom;
    if (maxDiff > 1) zoom = 10;
    else if (maxDiff > 0.5) zoom = 11;
    else if (maxDiff > 0.2) zoom = 12;
    else if (maxDiff > 0.1) zoom = 13;
    else zoom = 14;

    return { center: [centerLat, centerLng], zoom };
  };

  const { center: mapCenter, zoom: mapZoom } = getInitialCenterAndZoom();

  const validMarkers = markers.filter(
    (m) => m.latitude != null && m.longitude != null && !isNaN(Number(m.latitude)) && !isNaN(Number(m.longitude))
  );

  if (!mounted) {
    return (
      <div className={cn("relative w-full h-full bg-muted flex items-center justify-center", className)}>
        <div className="text-center text-muted-foreground">
          <p className="text-sm">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full h-full bg-muted", className)}>
      {/* Mobile Sidebar Toggle Button */}
      {isMobile && onToggleSidebar && (
        <Button
          variant="outline"
          size="icon"
          className="absolute top-2 left-2 z-[1000] bg-background/90 backdrop-blur-sm shadow-md cursor-pointer"
          onClick={onToggleSidebar}
          aria-label={showSidebar ? "Hide sidebar" : "Show sidebar"}
        >
          {showSidebar ? (
            <X className="h-4 w-4" />
          ) : (
            <Menu className="h-4 w-4" />
          )}
        </Button>
      )}

      {/* Layer Control */}
      {showLayerControl && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="absolute top-2 right-2 z-[1000] bg-background/90 backdrop-blur-sm shadow-md cursor-pointer"
            >
              <Layers className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem 
              onClick={() => setMapStyle("auto")}
              className={cn("cursor-pointer", mapStyle === "auto" && "bg-accent")}
            >
              {resolvedTheme === "dark" ? (
                <Moon className="h-4 w-4 mr-2" />
              ) : (
                <Sun className="h-4 w-4 mr-2" />
              )}
              Auto
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setMapStyle("street")}
              className={cn("cursor-pointer", mapStyle === "street" && "bg-accent")}
            >
              <Map className="h-4 w-4 mr-2" />
              Light
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setMapStyle("dark")}
              className={cn("cursor-pointer", mapStyle === "dark" && "bg-accent")}
            >
              <Moon className="h-4 w-4 mr-2" />
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setMapStyle("satellite")}
              className={cn("cursor-pointer", mapStyle === "satellite" && "bg-accent")}
            >
              <Satellite className="h-4 w-4 mr-2" />
              Satellite
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        className="h-full w-full z-0"
        scrollWheelZoom={true}
        touchZoom={true}
        doubleClickZoom={true}
        dragging={true}
      >
        <TileLayer
          key={`${mapStyle}-${resolvedTheme}`}
          attribution={activeTileLayer.attribution}
          url={activeTileLayer.url}
        />
        {children}
        {renderMarkers(validMarkers)}
      </MapContainer>
    </div>
  );
}
