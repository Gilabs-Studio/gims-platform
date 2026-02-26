import { useQuery } from "@tanstack/react-query";
import { inventoryService } from "../services/inventory-service";
import type { InventoryFilters } from "../types";

interface UseInventoryOptions extends InventoryFilters {
  page?: number;
  per_page?: number;
  enabled?: boolean;
}

export const useInventory = (options: UseInventoryOptions = {}) => {
  const { page = 1, per_page = 20, enabled = true, ...filters } = options;

  return useQuery({
    queryKey: ["inventory", { page, per_page, ...filters }],
    queryFn: () => inventoryService.getInventory({ page, per_page, ...filters }),
    enabled,
    placeholderData: (previousData) => previousData,
  });
};

export const useInventoryMetrics = () => {
  return useQuery({
    queryKey: ["inventory", "metrics"],
    queryFn: () => inventoryService.getMetrics(),
    staleTime: 60000, // Metrics are refreshed every minute
  });
};
