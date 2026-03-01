"use client";

import type { PackagingPerformance } from "../types";
import { productAnalysisService } from "../services/product-analysis-service";
import { useDimensionPerformanceList } from "./use-dimension-performance-list";

export function usePackagingPerformanceList(
  enabled: boolean,
  limit?: number,
  filters?: { startDate?: string; endDate?: string }
) {
  const result = useDimensionPerformanceList<PackagingPerformance>({
    dimensionKey: "packaging-performance",
    fetchFn: (params) =>
      productAnalysisService.listPackagingPerformance(params),
    enabled,
    limit,
    filters,
  });

  return { ...result, packagingList: result.items };
}
