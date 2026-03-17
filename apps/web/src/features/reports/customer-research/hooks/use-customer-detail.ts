"use client";

import { useQuery } from "@tanstack/react-query";
import { customerResearchService } from "../services/customer-research-service";

export function useCustomerDetail(
  customerId: string,
  startDate?: string,
  endDate?: string,
  enabled: boolean = true
) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["reports", "customer-research", "detail", customerId, { startDate, endDate }],
    queryFn: async () =>
      customerResearchService.getCustomerDetail(customerId, {
        start_date: startDate,
        end_date: endDate,
      }),
    enabled: enabled && Boolean(customerId),
    staleTime: 30000,
  });

  return {
    detail: data?.data,
    isLoading,
    error,
    refetch,
  };
}
