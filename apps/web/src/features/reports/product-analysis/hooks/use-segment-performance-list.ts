"use client";

import type { SegmentPerformance } from "../types";
import { productAnalysisService } from "../services/product-analysis-service";
import { useDimensionPerformanceList } from "./use-dimension-performance-list";

export function useSegmentPerformanceList(
  enabled: boolean,
  limit?: number,
  filters?: { startDate?: string; endDate?: string }
) {
  const result = useDimensionPerformanceList<SegmentPerformance>({
    dimensionKey: "segment-performance",
    fetchFn: (params) => productAnalysisService.listSegmentPerformance(params),
    enabled,
    limit,
    filters,
  });

  return { ...result, segmentList: result.items };
}
