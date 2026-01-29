import { useQuery } from "@tanstack/react-query";
import { stockMovementService } from "../services/movement-service";
import { StockMovementFilter } from "../types";

export function useStockMovements(filter: StockMovementFilter) {
  return useQuery({
    queryKey: ["stock-movements", filter],
    queryFn: () => stockMovementService.getMovements(filter),
  });
}
