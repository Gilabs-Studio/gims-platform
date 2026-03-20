"use client";

import { useQuery } from "@tanstack/react-query";
import { supplierResearchService } from "../services/supplier-research-service";
import type { SupplierResearchFilters } from "../types";

export function useSupplierResearchKpis(filters: SupplierResearchFilters) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["reports", "supplier-research", "kpis", filters],
    queryFn: async () => {
      return supplierResearchService.getKpis({
        start_date: filters.start_date,
        end_date: filters.end_date,
        date_mode: filters.date_mode,
        year: filters.year,
        category_ids: filters.category_ids,
        min_purchase_value: filters.min_purchase_value,
        max_purchase_value: filters.max_purchase_value,
      });
    },
    staleTime: 30000,
  });

  return {
    kpis: data?.data,
    isLoading,
    error,
    refetch,
  };
}
