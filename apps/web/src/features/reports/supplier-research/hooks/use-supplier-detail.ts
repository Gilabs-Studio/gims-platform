"use client";

import { useQuery } from "@tanstack/react-query";
import { supplierResearchService } from "../services/supplier-research-service";

export function useSupplierDetail(supplierId: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["reports", "supplier-research", "supplier-detail", supplierId],
    queryFn: async () => {
      return supplierResearchService.getSupplierDetail(supplierId);
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
