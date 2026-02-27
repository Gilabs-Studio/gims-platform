"use client";

import { useQuery } from "@tanstack/react-query";
import { productAnalysisService } from "../services/product-analysis-service";

export function useProductMonthlyTrend(
  productId: string,
  startDate?: string,
  endDate?: string
) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [
      "reports",
      "product-analysis",
      "product",
      productId,
      "monthly-trend",
      { start_date: startDate, end_date: endDate },
    ],
    queryFn: async () => {
      return await productAnalysisService.getProductMonthlyTrend(productId, {
        start_date: startDate,
        end_date: endDate,
      });
    },
    enabled: !!productId,
    staleTime: 30000,
  });

  return {
    trendData: data?.data,
    isLoading,
    error,
    refetch,
  };
}
