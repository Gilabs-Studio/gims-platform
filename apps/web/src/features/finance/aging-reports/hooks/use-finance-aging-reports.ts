"use client";

import { useQuery } from "@tanstack/react-query";
import { financeAgingReportsService } from "../services/finance-aging-reports-service";
import type { AgingQueryParams } from "../types";

export const financeAgingKeys = {
  all: ["finance-aging"] as const,
  ar: (params?: AgingQueryParams) => [...financeAgingKeys.all, "ar", params] as const,
  ap: (params?: AgingQueryParams) => [...financeAgingKeys.all, "ap", params] as const,
};

export function useFinanceARAging(params?: AgingQueryParams) {
  return useQuery({
    queryKey: financeAgingKeys.ar(params),
    queryFn: () => financeAgingReportsService.ar(params),
  });
}

export function useFinanceAPAging(params?: AgingQueryParams) {
  return useQuery({
    queryKey: financeAgingKeys.ap(params),
    queryFn: () => financeAgingReportsService.ap(params),
  });
}
