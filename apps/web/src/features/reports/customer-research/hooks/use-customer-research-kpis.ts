"use client";

import { useQuery } from "@tanstack/react-query";
import { customerResearchService } from "../services/customer-research-service";

interface CustomerDateFilters {
  start_date?: string;
  end_date?: string;
  date_mode?: "year" | "range";
  year?: number;
}

export function useCustomerResearchKpis(filters: CustomerDateFilters) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["reports", "customer-research", "kpis", filters],
    queryFn: async () => {
      const response = await customerResearchService.getKpis(filters);
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
