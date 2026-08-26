import { useQuery } from "@tanstack/react-query";

import {
  cashFlowStatementService,
  type CashFlowQueryParams,
} from "../services/cash-flow-statement-service";

export const cashFlowStatementKeys = {
  all: ["cash-flow-statement"] as const,
  report: (params: CashFlowQueryParams) => [...cashFlowStatementKeys.all, "report", params] as const,
  summary: (params: CashFlowQueryParams) => [...cashFlowStatementKeys.all, "summary", params] as const,
  trend: (params: CashFlowQueryParams) => [...cashFlowStatementKeys.all, "trend", params] as const,
  ytdSummary: (params: CashFlowQueryParams) => [...cashFlowStatementKeys.all, "ytd-summary", params] as const,
  table: (params: CashFlowQueryParams) => [...cashFlowStatementKeys.all, "table", params] as const,
};

export function useCashFlowStatement(params: CashFlowQueryParams) {
  return useQuery({
    queryKey: cashFlowStatementKeys.report(params),
    queryFn: () => cashFlowStatementService.getCashFlowStatement(params),
    enabled: !!params.from_date && !!params.to_date,
  });
}

export function useCashFlowSummary(params: CashFlowQueryParams) {
  return useQuery({
    queryKey: cashFlowStatementKeys.summary(params),
    queryFn: () => cashFlowStatementService.getCashFlowSummary(params),
    enabled: !!params.from_date && !!params.to_date,
  });
}

export function useCashFlowTrend(params: CashFlowQueryParams) {
  return useQuery({
    queryKey: cashFlowStatementKeys.trend(params),
    queryFn: () => cashFlowStatementService.getCashFlowTrend(params),
    enabled: !!params.to_date,
  });
}

export function useCashFlowYtdSummary(params: CashFlowQueryParams) {
  return useQuery({
    queryKey: cashFlowStatementKeys.ytdSummary(params),
    queryFn: () => cashFlowStatementService.getCashFlowYtdSummary(params),
    enabled: !!params.to_date,
  });
}

export function useCashFlowStatementTable(params: CashFlowQueryParams) {
  return useQuery({
    queryKey: cashFlowStatementKeys.table(params),
    queryFn: () => cashFlowStatementService.getCashFlowStatementTable(params),
    enabled: !!params.from_date && !!params.to_date,
  });
}
