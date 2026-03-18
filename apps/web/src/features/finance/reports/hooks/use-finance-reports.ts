import { useQuery } from "@tanstack/react-query";
import { financeReportsService } from "../services/finance-reports-service";

type ReportDateRange = {
  start_date: string;
  end_date: string;
  company_id?: string;
  include_zero?: boolean;
  account_id?: string;
};

export const financeReportKeys = {
  all: ["finance-reports"] as const,
  gl: (params: ReportDateRange) => [...financeReportKeys.all, "gl", params] as const,
  bs: (params: ReportDateRange) => [...financeReportKeys.all, "bs", params] as const,
  pl: (params: ReportDateRange) => [...financeReportKeys.all, "pl", params] as const,
};

export function useGeneralLedger(params: ReportDateRange) {
  return useQuery({
    queryKey: financeReportKeys.gl(params),
    queryFn: () => financeReportsService.getGeneralLedger(params),
    enabled: !!params.start_date && !!params.end_date,
  });
}

export function useBalanceSheet(params: ReportDateRange) {
  return useQuery({
    queryKey: financeReportKeys.bs(params),
    queryFn: () => financeReportsService.getBalanceSheet(params),
    enabled: !!params.start_date && !!params.end_date,
  });
}

export function useProfitAndLoss(params: ReportDateRange) {
  return useQuery({
    queryKey: financeReportKeys.pl(params),
    queryFn: () => financeReportsService.getProfitAndLoss(params),
    enabled: !!params.start_date && !!params.end_date,
  });
}
