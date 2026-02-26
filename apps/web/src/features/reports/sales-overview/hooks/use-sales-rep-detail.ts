"use client";

import { useQuery } from "@tanstack/react-query";
import { salesOverviewReportService } from "../services/sales-overview-service";
import type { GetSalesRepDetailRequest } from "../types";

export function useSalesRepDetail(
  employeeId: string,
  params?: GetSalesRepDetailRequest
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
      "sales-overview",
      "sales-rep",
      employeeId,
      normalizedParams,
    ],
    queryFn: async () => {
      return await salesOverviewReportService.getSalesRepDetail(
        employeeId,
        params
      );
    },
    enabled: !!employeeId,
    staleTime: 30000,
  });

  return {
    detail: data?.data,
    isLoading,
    error,
    refetch,
  };
}
