"use client";

import { useQuery } from "@tanstack/react-query";
import { customerResearchService } from "../services/customer-research-service";
import type { ListCustomerResearchRequest } from "../types";

export function useCustomerResearchList(
  params: ListCustomerResearchRequest,
  enabled: boolean = true
) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["reports", "customer-research", "customers", params],
    queryFn: async () => {
      const response = await customerResearchService.listCustomers(params);
      return response;
    },
    enabled,
    staleTime: 30000,
  });

  return {
    customers: data?.data?.data,
    pagination: data?.meta?.pagination,
    isLoading,
    error,
    refetch,
  };
}
