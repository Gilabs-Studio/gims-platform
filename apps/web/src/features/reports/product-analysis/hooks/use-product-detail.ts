"use client";

import { useQuery } from "@tanstack/react-query";
import { productAnalysisService } from "../services/product-analysis-service";
import type { GetProductDetailRequest } from "../types";

export function useProductDetail(
  productId: string,
  params?: GetProductDetailRequest
) {
  const normalizedParams = params
    ? {
        start_date: params.start_date,
        end_date: params.end_date,
      }
    : undefined;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [
      "reports",
      "product-analysis",
      "product",
      productId,
      normalizedParams,
    ],
    queryFn: async () => {
      return await productAnalysisService.getProductDetail(productId, params);
    },
    enabled: !!productId,
    staleTime: 30000,
  });

  return {
    detail: data?.data,
    isLoading,
    error,
    refetch,
  };
}
