import { useQuery } from "@tanstack/react-query";
import { stockLedgerService } from "../services/stock-ledger.service";
import type { StockLedgerFilter } from "../types";

export const stockLedgerKeys = {
  all: ["stock-ledger"] as const,
  lists: () => [...stockLedgerKeys.all, "list"] as const,
  list: (productId: string, filters?: StockLedgerFilter) =>
    [...stockLedgerKeys.lists(), productId, filters] as const,
};

export function useStockLedger(productId: string | null, filters?: StockLedgerFilter) {
  return useQuery({
    queryKey: productId ? stockLedgerKeys.list(productId, filters) : ["stock-ledger-disabled"],
    queryFn: () => (productId ? stockLedgerService.getByProductId(productId, filters) : Promise.reject("No product selected")),
    enabled: !!productId,
    placeholderData: (previousData) => previousData,
  });
}
