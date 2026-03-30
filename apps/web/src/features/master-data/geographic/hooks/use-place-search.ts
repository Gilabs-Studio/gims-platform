import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

/**
 * Result from Nominatim reverse geocoding or search
 */
export interface PlaceSearchResult {
  id: string;
  name: string;
  display_name: string;
  lat: number;
  lon: number;
  type: string;
  importance?: number;
  
  // Administrative hierarchy
  address?: {
    village?: string;
    town?: string;
    city?: string;
    district?: string;
    province?: string;
    postcode?: string;
    country?: string;
  };
}

interface NominatimSearchResponse {
  place_id: number;
  osm_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
  address: Record<string, string>;
}

interface NominatimReverseResponse {
  place_id: number;
  osm_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  address: Record<string, string>;
}

/**
 * Hook for searching places using Nominatim (OpenStreetMap)
 * Uses debouncing to avoid excessive API calls
 */
export function usePlaceSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Query for place search
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ["placeSearch", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return [];

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          debouncedQuery
        )}&limit=10&countrycodes=id`,
        {
          headers: {
            "Accept": "application/json",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to search places");

      const data: NominatimSearchResponse[] = await response.json();

      return data.map((item) => ({
        id: `${item.osm_id}`,
        name: item.display_name.split(",")[0],
        display_name: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        type: item.type,
        importance: item.importance,
        address: item.address,
      }));
    },
    enabled: debouncedQuery.length > 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    searchQuery,
    searchResults: searchResults || [],
    isSearching,
    handleSearch,
  };
}



/**
 * Perform a reverse geocode lookup for a specific coordinate
 */
export async function reverseGeocodeCoordinate(
  lat: number,
  lon: number
): Promise<PlaceSearchResult | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=15&addressdetails=1`,
      {
        headers: {
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) return null;

    const data: NominatimReverseResponse = await response.json();

    return {
      id: `${data.osm_id}`,
      name: data.display_name.split(",")[0],
      display_name: data.display_name,
      lat: parseFloat(data.lat),
      lon: parseFloat(data.lon),
      type: data.type,
      address: data.address,
    };
  } catch (error) {
    console.error("Reverse geocode failed:", error);
    return null;
  }
}
