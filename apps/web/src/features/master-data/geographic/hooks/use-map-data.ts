"use client";

import { useQuery } from "@tanstack/react-query";
import { mapDataService } from "../services/geographic-service";
import type { MapDataParams } from "../types";

// Query keys for map data
export const mapDataKeys = {
  all: ["map-data"] as const,
  data: (params: MapDataParams) => [...mapDataKeys.all, params] as const,
};

/**
 * Fetches GeoJSON FeatureCollection for map visualization.
 * Cascades by level: province → city (requires province_id) → district (requires city_id).
 */
export function useMapData(params: MapDataParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: mapDataKeys.data(params),
    queryFn: () => mapDataService.getMapData(params),
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000,
  });
}
