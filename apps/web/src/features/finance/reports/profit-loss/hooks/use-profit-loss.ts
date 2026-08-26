import { useQuery } from "@tanstack/react-query";
import { profitLossService, type ReportQueryParams } from "../services/profit-loss-service";
import type { ProfitLossQueryParams } from "../types";

export const profitLossKeys = {
  all: ["profit-loss"] as const,
  pl: (params: ReportQueryParams) => [...profitLossKeys.all, params] as const,
  summary: (params: ProfitLossQueryParams) => [...profitLossKeys.all, "summary", params] as const,
  trend: (params: ProfitLossQueryParams) => [...profitLossKeys.all, "trend", params] as const,
  revenueVsExpense: (params: ProfitLossQueryParams) => [...profitLossKeys.all, "revenue-vs-expense", params] as const,
  statementTable: (params: ProfitLossQueryParams) => [...profitLossKeys.all, "statement", params] as const,
};

export function useProfitAndLoss(params: ReportQueryParams) {
  return useQuery({
    queryKey: profitLossKeys.pl(params),
    queryFn: () => profitLossService.getProfitAndLoss(params),
    enabled: !!params.start_date && !!params.end_date,
  });
}

export function useProfitLossSummary(params: ProfitLossQueryParams) {
  return useQuery({
    queryKey: profitLossKeys.summary(params),
    queryFn: () => profitLossService.getSummary(params),
    enabled: !!params.to_date,
  });
}

export function useProfitLossTrend(params: ProfitLossQueryParams) {
  return useQuery({
    queryKey: profitLossKeys.trend(params),
    queryFn: () => profitLossService.getTrend(params),
    enabled: !!params.to_date,
  });
}

export function useProfitLossRevenueVsExpense(params: ProfitLossQueryParams) {
  return useQuery({
    queryKey: profitLossKeys.revenueVsExpense(params),
    queryFn: () => profitLossService.getRevenueVsExpense(params),
    enabled: !!params.to_date,
  });
}

export function useProfitLossStatementTable(params: ProfitLossQueryParams) {
  return useQuery({
    queryKey: profitLossKeys.statementTable(params),
    queryFn: () => profitLossService.getStatementTable(params),
    enabled: !!params.to_date,
  });
}
