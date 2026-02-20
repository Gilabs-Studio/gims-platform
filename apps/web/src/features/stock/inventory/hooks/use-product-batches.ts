
import { useQuery } from "@tanstack/react-query";
import { inventoryService } from "../services/inventory-service";

export function useProductBatches(
  warehouseId: string,
  productId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ["inventory", "batches", warehouseId, productId],
    queryFn: () => inventoryService.getTreeBatches(warehouseId, productId),
    enabled: options?.enabled && !!warehouseId && !!productId,
  });
}
