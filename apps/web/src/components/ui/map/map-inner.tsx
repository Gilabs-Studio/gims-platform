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
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "next-themes";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
// Fix missing marker icons
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Turbopack may return a plain string or a StaticImageData object for PNG imports.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getImageSrc = (img: any): string => {
  if (typeof img === "string" && img) return img;
  if (typeof img?.src === "string" && img.src) return img.src;
  if (typeof img?.default === "string" && img.default) return img.default;
  if (typeof img?.default?.src === "string" && img.default.src) return img.default.src;
  return "";
};

// Setup icons globally
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: getImageSrc(markerIcon),
  iconRetinaUrl: getImageSrc(markerIcon2x),
  shadowUrl: getImageSrc(markerShadow),
});

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

interface MapInnerProps<T> {
  readonly markers: MapMarker<T>[];
  readonly renderMarkers: (markers: MapMarker<T>[]) => React.ReactNode;
  readonly className?: string;
  readonly showSidebar?: boolean;
  readonly onToggleSidebar?: () => void;
  readonly defaultCenter?: [number, number];
  readonly defaultZoom?: number;
  readonly children?: React.ReactNode;
  readonly showLayerControl?: boolean;
  readonly selectedMarkerId?: number | string | null;
}

// Component to handle map movement and bounds
function MapController<T>({
  markers,
  selectedMarkerId,
  defaultCenter,
  defaultZoom,
}: {
  markers: MapMarker<T>[];
  selectedMarkerId?: number | string | null;
  defaultCenter: [number, number];
  defaultZoom: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    if (selectedMarkerId) {
      const selected = markers.find((m) => m.id === selectedMarkerId);
      if (selected) {
        map.flyTo([selected.latitude, selected.longitude], 16, {
          duration: 1.5,
          easeLinearity: 0.25,
        });
        return;
      }
    }

    if (markers.length > 0) {
      const bounds = markers.map((m) => [m.latitude, m.longitude] as [number, number]);
      // Verify bounds are valid
      if (bounds.length > 0 && bounds[0].length === 2 && !isNaN(bounds[0][0])) {
         try {
            // @ts-ignore
            map.fitBounds(bounds, {
              padding: [50, 50],
              maxZoom: 16,
              duration: 1.5,
              easeLinearity: 0.25,
            });
         } catch(e) {
            console.error("Leaflet fitBounds error", e);
         }
      }
    } else {
      map.flyTo(defaultCenter, defaultZoom, {
        duration: 1.5,
        easeLinearity: 0.25,
      });
    }
  }, [map, markers, selectedMarkerId, defaultCenter, defaultZoom]);

  return null;
}

export default function MapInner<T>({
  markers,
  renderMarkers,
  className,
  showSidebar = false,
  onToggleSidebar,
  defaultCenter = [-6.2088, 106.8456],
  defaultZoom = 13,
  children,
  showLayerControl = true,
  selectedMarkerId,
}: MapInnerProps<T>) {
  const [mapStyle, setMapStyle] = useState<MapStyle>("auto");
  const isMobile = useIsMobile();
  const { resolvedTheme } = useTheme();

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

  const validMarkers = markers.filter(
    (m) => m.latitude != null && m.longitude != null && !isNaN(Number(m.latitude)) && !isNaN(Number(m.longitude))
  );

  return (
    <div className={cn("relative w-full h-full bg-muted", className)}>
      {/* Mobile Sidebar Toggle Button */}
      {isMobile && onToggleSidebar && (
        <Button
          variant="outline"
          size="icon"
          className="absolute top-2 left-2 z-10 bg-background/90 backdrop-blur-sm shadow-md cursor-pointer hover:bg-background"
          onClick={onToggleSidebar}
          aria-label={showSidebar ? "Hide sidebar" : "Show sidebar"}
          type="button"
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
              className="absolute top-2 right-2 z-10 bg-background/90 backdrop-blur-sm shadow-md cursor-pointer hover:bg-background"
              type="button"
            >
              <Layers className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 z-50">
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
        center={defaultCenter}
        zoom={defaultZoom}
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
        <MapController 
          markers={validMarkers}
          selectedMarkerId={selectedMarkerId}
          defaultCenter={defaultCenter}
          defaultZoom={defaultZoom}
        />
        {children}
        {renderMarkers(validMarkers)}
      </MapContainer>
    </div>
  );
}
