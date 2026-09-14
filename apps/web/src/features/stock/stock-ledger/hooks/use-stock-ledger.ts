import { useQuery } from "@tanstack/react-query";
import { stockLedgerService } from "../services/stock-ledger.service";
import type { StockLedgerFilter } from "../types";

export const stockLedgerKeys = {
  all: ["stock-ledger"] as const,
  lists: () => [...stockLedgerKeys.all, "list"] as const,
  list: (productId?: string | null, filters?: StockLedgerFilter) =>
    [...stockLedgerKeys.lists(), productId ?? "all", filters] as const,
};

export function useStockLedger(productId?: string | null, filters?: StockLedgerFilter) {
  return useQuery({
    queryKey: stockLedgerKeys.list(productId, filters),
    queryFn: () => stockLedgerService.getByProductId(productId, filters),
    placeholderData: (previousData) => previousData,
  });
}

