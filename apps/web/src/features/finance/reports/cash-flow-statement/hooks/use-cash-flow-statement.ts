import { useQuery } from "@tanstack/react-query";

import {
  cashFlowStatementService,
  type CashFlowQueryParams,
} from "../services/cash-flow-statement-service";

export const cashFlowStatementKeys = {
  all: ["cash-flow-statement"] as const,
  report: (params: CashFlowQueryParams) => [...cashFlowStatementKeys.all, params] as const,
};

export function useCashFlowStatement(params: CashFlowQueryParams) {
  return useQuery({
    queryKey: cashFlowStatementKeys.report(params),
    queryFn: () => cashFlowStatementService.getCashFlowStatement(params),
    enabled: !!params.from_date && !!params.to_date,
  });
}
