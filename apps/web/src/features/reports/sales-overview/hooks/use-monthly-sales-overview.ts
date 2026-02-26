"use client";

import { useQuery } from "@tanstack/react-query";
import { salesOverviewReportService } from "../services/sales-overview-service";

export function useMonthlySalesOverview(startDate?: string, endDate?: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [
      "reports",
      "sales-overview",
      "monthly",
      { start_date: startDate, end_date: endDate },
    ],
    queryFn: async () => {
      return await salesOverviewReportService.getMonthlySalesOverview(
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
