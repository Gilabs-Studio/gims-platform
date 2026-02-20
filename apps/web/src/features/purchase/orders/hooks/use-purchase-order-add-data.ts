import { useQuery } from "@tanstack/react-query";

import { purchaseOrdersService } from "../services/purchase-orders-service";

export const PURCHASE_ORDER_ADD_DATA_QUERY_KEY = [
  "purchase",
  "purchase-orders",
  "add-data",
] as const;

export const usePurchaseOrderAddData = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: PURCHASE_ORDER_ADD_DATA_QUERY_KEY,
    queryFn: purchaseOrdersService.addData,
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000,
  });
};
