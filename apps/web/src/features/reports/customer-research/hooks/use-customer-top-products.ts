"use client";

import { useQuery } from "@tanstack/react-query";
import { customerResearchService } from "../services/customer-research-service";

export function useCustomerTopProducts(
  customerId: string,
  startDate?: string,
  endDate?: string,
  limit: number = 20,
  enabled: boolean = true
) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [
      "reports",
      "customer-research",
      "top-products",
      customerId,
      { startDate, endDate, limit },
    ],
    queryFn: async () =>
      customerResearchService.getCustomerTopProducts(customerId, {
        start_date: startDate,
        end_date: endDate,
        limit,
      }),
    enabled: enabled && Boolean(customerId),
    staleTime: 30000,
  });

  return {
    products: data?.data?.data ?? [],
    isLoading,
    error,
    refetch,
  };
}
