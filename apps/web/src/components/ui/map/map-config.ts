export type MapStyle = "auto" | "street" | "light" | "dark" | "satellite" | "voyager";

export type MapProfile = "balanced" | "driver" | "detail";

export interface MapTileLayerDefinition {
  readonly url: string;
  readonly attribution: string;
  readonly maxZoom?: number;
  readonly subdomains?: string;
}

/**
 * Returns CARTO tile URL formatted with optional API key query param (?key=YOUR_KEY)
 * based on https://carto.com/basemaps/apikey/
 */
export function getCartoTileUrl(
  variant: "light_all" | "dark_all" | "rastertiles/voyager" | "voyager" = "light_all",
  retina = true
): string {
  const apiKey = process.env.NEXT_PUBLIC_CARTO_API_KEY?.trim();
  const keyParam = apiKey ? `?key=${encodeURIComponent(apiKey)}` : "";
  const retinaParam = retina ? "{r}" : "";
  const normalizedVariant = variant === "voyager" ? "rastertiles/voyager" : variant;
  return `https://{s}.basemaps.cartocdn.com/${normalizedVariant}/{z}/{x}/{y}${retinaParam}.png${keyParam}`;
}

export const CARTO_SUBDOMAINS =
  process.env.NEXT_PUBLIC_CARTO_SUBDOMAINS?.trim() || "abcd";

export const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

export const MAP_TILE_LAYERS: Record<Exclude<MapStyle, "auto">, MapTileLayerDefinition> = {
  street: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  light: {
    url: getCartoTileUrl("light_all", true),
    attribution: CARTO_ATTRIBUTION,
    maxZoom: 20,
    subdomains: CARTO_SUBDOMAINS,
  },
  dark: {
    url: getCartoTileUrl("dark_all", true),
    attribution: CARTO_ATTRIBUTION,
    maxZoom: 20,
    subdomains: CARTO_SUBDOMAINS,
  },
  voyager: {
    url: getCartoTileUrl("rastertiles/voyager", true),
    attribution: CARTO_ATTRIBUTION,
    maxZoom: 20,
    subdomains: CARTO_SUBDOMAINS,
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      '&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 19,
  },
};

export function resolveMapTileLayer(
  mapStyle: MapStyle,
  resolvedTheme?: string | null,
): MapTileLayerDefinition {
  if (mapStyle === "auto") {
    return resolvedTheme === "dark" ? MAP_TILE_LAYERS.dark : MAP_TILE_LAYERS.light;
  }

  return MAP_TILE_LAYERS[mapStyle];
}

export function getMapContainerOptions(mapProfile: MapProfile) {
  return {
    scrollWheelZoom: mapProfile !== "driver",
    touchZoom: true,
    doubleClickZoom: mapProfile !== "driver",
    dragging: true,
    zoomControl: mapProfile !== "driver",
    preferCanvas: mapProfile !== "detail",
  } as const;
}

export function getMarkerClusterOptions(mapProfile: MapProfile) {
  if (mapProfile === "driver") {
    return {
      chunkedLoading: true,
      removeOutsideVisibleBounds: true,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: false,
      disableClusteringAtZoom: 18,
      maxClusterRadius: 42,
    } as const;
  }

  if (mapProfile === "detail") {
    return {
      chunkedLoading: true,
      removeOutsideVisibleBounds: false,
      showCoverageOnHover: true,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 17,
      maxClusterRadius: 50,
    } as const;
  }

  return {
    chunkedLoading: true,
    removeOutsideVisibleBounds: true,
    showCoverageOnHover: false,
    spiderfyOnMaxZoom: true,
    disableClusteringAtZoom: 17,
    maxClusterRadius: 46,
  } as const;
}