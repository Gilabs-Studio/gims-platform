import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { stockMovementService } from "../services/movement-service";
import { StockMovementFilter } from "../types";

export function useStockMovements(filter: StockMovementFilter) {
  return useQuery({
    queryKey: ["stock-movements", filter],
    queryFn: () => stockMovementService.getMovements(filter),
  });
}

export function useCreateMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: import("../types").CreateStockMovementRequest) => 
      stockMovementService.createMovement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
    },
  });
}
