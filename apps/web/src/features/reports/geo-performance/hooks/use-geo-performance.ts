"use client";

import { useQuery } from "@tanstack/react-query";
import { geoPerformanceService } from "../services/geo-performance-service";

export function useGeoPerformance(params?: GeoPerformanceRequest) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["reports", "geo-performance", params],
    queryFn: () => geoPerformanceService.getGeoPerformance(params),
    staleTime: 30000,
  });

  return {
    summary: data?.data,
    areas: data?.data?.areas ?? [],
    isLoading,
    error,
    refetch,
  };
}
