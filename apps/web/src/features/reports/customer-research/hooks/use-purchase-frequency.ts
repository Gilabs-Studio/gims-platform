"use client";

import { useQuery } from "@tanstack/react-query";
import { customerResearchService } from "../services/customer-research-service";
import type { ListCustomerResearchRequest } from "../types";

export function usePurchaseFrequency(params: ListCustomerResearchRequest) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["reports", "customer-research", "purchase-frequency", params],
    queryFn: async () => customerResearchService.getPurchaseFrequency(params),
    staleTime: 30000,
  });

  return {
    data: data?.data?.data ?? [],
    isLoading,
    error,
    refetch,
  };
}
