"use client";

import type { TypePerformance } from "../types";
import { productAnalysisService } from "../services/product-analysis-service";
import { useDimensionPerformanceList } from "./use-dimension-performance-list";

export function useTypePerformanceList(
  enabled: boolean,
  limit?: number,
  filters?: { startDate?: string; endDate?: string }
) {
  const result = useDimensionPerformanceList<TypePerformance>({
    dimensionKey: "type-performance",
    fetchFn: (params) => productAnalysisService.listTypePerformance(params),
    enabled,
    limit,
    filters,
  });

  return { ...result, typeList: result.items };
}
