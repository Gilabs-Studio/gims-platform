"use client";

import { useQuery } from "@tanstack/react-query";
import { productAnalysisService } from "../services/product-analysis-service";

export function useMonthlyProductSales(
  startDate?: string,
  endDate?: string
) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [
      "reports",
      "product-analysis",
      "monthly",
      { start_date: startDate, end_date: endDate },
    ],
    queryFn: async () => {
      return await productAnalysisService.getMonthlyProductSales(
        startDate,
        endDate
      );
    },
    staleTime: 30000,
  });

  return {
    monthlyData: data?.data,
    isLoading,
    error,
    refetch,
  };
}
