"use client";

import { useQuery } from "@tanstack/react-query";
import { customerResearchService } from "../services/customer-research-service";

export function useCustomerResearchKpis(startDate?: string, endDate?: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["reports", "customer-research", "kpis", { startDate, endDate }],
    queryFn: async () => {
      const response = await customerResearchService.getKpis(startDate, endDate);
      return response.data;
    },
    staleTime: 30000,
  });

  return {
    kpis: data,
    isLoading,
    error,
    refetch,
  };
}
