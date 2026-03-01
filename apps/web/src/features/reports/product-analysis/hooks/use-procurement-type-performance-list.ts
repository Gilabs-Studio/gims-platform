"use client";

import type { ProcurementTypePerformance } from "../types";
import { productAnalysisService } from "../services/product-analysis-service";
import { useDimensionPerformanceList } from "./use-dimension-performance-list";

export function useProcurementTypePerformanceList(
  enabled: boolean,
  limit?: number,
  filters?: { startDate?: string; endDate?: string }
) {
  const result = useDimensionPerformanceList<ProcurementTypePerformance>({
    dimensionKey: "procurement-type-performance",
    fetchFn: (params) =>
      productAnalysisService.listProcurementTypePerformance(params),
    enabled,
    limit,
    filters,
  });

  return { ...result, procurementTypeList: result.items };
}
