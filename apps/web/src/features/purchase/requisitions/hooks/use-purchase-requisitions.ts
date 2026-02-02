import { useQuery } from "@tanstack/react-query";
import { purchaseRequisitionsService } from "../services/purchase-requisitions-service";
import type { PurchaseRequisitionListParams } from "../types";

const QUERY_KEY = "purchase-requisitions";

export function usePurchaseRequisitions(params?: PurchaseRequisitionListParams) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: () => purchaseRequisitionsService.list(params),
  });
}
