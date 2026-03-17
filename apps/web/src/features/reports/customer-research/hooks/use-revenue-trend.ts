"use client";

import { useQuery } from "@tanstack/react-query";
import { customerResearchService } from "../services/customer-research-service";

export function useRevenueTrend(
  startDate?: string,
  endDate?: string,
  interval?: "daily" | "weekly" | "monthly"
) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [
      "reports",
      "customer-research",
      "revenue-trend",
      { startDate, endDate, interval },
    ],
    queryFn: async () => {
      const response = await customerResearchService.getRevenueTrend(
        startDate,
        endDate,
        interval
      );
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
