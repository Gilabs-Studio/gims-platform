import { useQuery } from "@tanstack/react-query";
import { generalLedgerService, ReportQueryParams } from "../services/general-ledger-service";

export const generalLedgerKeys = {
  all: ["general-ledger"] as const,
  gl: (params: ReportQueryParams) => [...generalLedgerKeys.all, params] as const,
};

export function useGeneralLedger(params: ReportQueryParams) {
  return useQuery({
    queryKey: generalLedgerKeys.gl(params),
    queryFn: () => generalLedgerService.getGeneralLedger(params),
    enabled: !!params.start_date && !!params.end_date,
  });
}
