import { useQuery } from "@tanstack/react-query";
import { balanceSheetService, ReportQueryParams } from "../services/balance-sheet-service";

export const balanceSheetKeys = {
  all: ["balance-sheet"] as const,
  bs: (params: ReportQueryParams) => [...balanceSheetKeys.all, params] as const,
};

export function useBalanceSheet(params: ReportQueryParams) {
  return useQuery({
    queryKey: balanceSheetKeys.bs(params),
    queryFn: () => balanceSheetService.getBalanceSheet(params),
    enabled: !!params.start_date && !!params.end_date,
  });
}
