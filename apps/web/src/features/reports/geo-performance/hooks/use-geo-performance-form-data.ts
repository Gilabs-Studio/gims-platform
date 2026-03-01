"use client";

import { useQuery } from "@tanstack/react-query";
import { geoPerformanceService } from "../services/geo-performance-service";

export function useGeoPerformanceFormData() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["reports", "geo-performance", "form-data"],
    queryFn: () => geoPerformanceService.getFormData(),
    staleTime: 300000, // 5 minutes — filter options rarely change
  });

  return {
    salesReps: data?.data?.sales_reps ?? [],
    isLoading,
    error,
  };
}
