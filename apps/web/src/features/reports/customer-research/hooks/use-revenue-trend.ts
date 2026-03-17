"use client";

import { useQuery } from "@tanstack/react-query";
import { customerResearchService } from "../services/customer-research-service";

interface RevenueTrendFilters {
  start_date?: string;
  end_date?: string;
  date_mode?: "year" | "range";
  year?: number;
  interval?: "daily" | "weekly" | "monthly";
}

export function useRevenueTrend(
  filters: RevenueTrendFilters
) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["reports", "customer-research", "revenue-trend", filters],
    queryFn: async () => {
      const response = await customerResearchService.getRevenueTrend(filters);
      return response.data.data;
    },
    staleTime: 30000,
  });

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}
