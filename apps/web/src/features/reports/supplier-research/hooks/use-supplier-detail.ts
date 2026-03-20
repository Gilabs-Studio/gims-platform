"use client";

import { useQuery } from "@tanstack/react-query";
import { supplierResearchService } from "../services/supplier-research-service";

export function useSupplierDetail(
  supplierId: string,
  startDate?: string,
  endDate?: string
) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [
      "reports",
      "supplier-research",
      "supplier-detail",
      supplierId,
      startDate,
      endDate,
    ],
    queryFn: async () => {
      return supplierResearchService.getSupplierDetail(supplierId, {
        start_date: startDate,
        end_date: endDate,
      });
    },
    enabled: Boolean(supplierId),
    staleTime: 30000,
  });

  return {
    detail: data?.data,
    isLoading,
    error,
    refetch,
  };
}
