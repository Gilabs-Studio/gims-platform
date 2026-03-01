import { useQuery } from "@tanstack/react-query";
import { financeReportsService } from "../services/finance-reports-service";

export const financeReportKeys = {
  all: ["finance-reports"] as const,
  gl: (params: any) => [...financeReportKeys.all, "gl", params] as const,
  bs: (params: any) => [...financeReportKeys.all, "bs", params] as const,
  pl: (params: any) => [...financeReportKeys.all, "pl", params] as const,
};

export function useGeneralLedger(params: { start_date: string; end_date: string }) {
  return useQuery({
    queryKey: financeReportKeys.gl(params),
    queryFn: () => financeReportsService.getGeneralLedger(params),
    enabled: !!params.start_date && !!params.end_date,
  });
}

export function useBalanceSheet(params: { start_date: string; end_date: string }) {
  return useQuery({
    queryKey: financeReportKeys.bs(params),
    queryFn: () => financeReportsService.getBalanceSheet(params),
    enabled: !!params.start_date && !!params.end_date,
  });
}

export function useProfitAndLoss(params: { start_date: string; end_date: string }) {
  return useQuery({
    queryKey: financeReportKeys.pl(params),
    queryFn: () => financeReportsService.getProfitAndLoss(params),
    enabled: !!params.start_date && !!params.end_date,
  });
}
