import { useQuery } from "@tanstack/react-query";
import { profitLossService, ReportQueryParams } from "../services/profit-loss-service";

export const profitLossKeys = {
  all: ["profit-loss"] as const,
  pl: (params: ReportQueryParams) => [...profitLossKeys.all, params] as const,
};

export function useProfitAndLoss(params: ReportQueryParams) {
  return useQuery({
    queryKey: profitLossKeys.pl(params),
    queryFn: () => profitLossService.getProfitAndLoss(params),
    enabled: !!params.start_date && !!params.end_date,
  });
}
