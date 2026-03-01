import { useQuery } from "@tanstack/react-query";
import { inventoryService } from "../services/inventory-service";
import { useState } from "react";

export function useInventoryTree() {
  const [expandedWarehouses, setExpandedWarehouses] = useState<Record<string, boolean>>({});
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({}); // key: warehouseId-productId

  // 1. Fetch Warehouses (Root Level)
  const warehousesQuery = useQuery({
    queryKey: ["inventory", "tree", "warehouses"],
    queryFn: () => inventoryService.getTreeWarehouses(),
  });

  const toggleWarehouse = (id: string) => {
    setExpandedWarehouses((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleProduct = (warehouseId: string, productId: string) => {
    const key = `${warehouseId}-${productId}`;
    setExpandedProducts((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return {
    warehouses: warehousesQuery.data?.data ?? [],
    isLoading: warehousesQuery.isLoading,
    isError: warehousesQuery.isError,
    expandedWarehouses,
    expandedProducts,
    toggleWarehouse,
    toggleProduct,
  };
}

// Hook for fetching products of a warehouse
export function useInventoryTreeProducts(warehouseId: string, enabled: boolean) {
  const [page, setPage] = useState(1);
  
  const query = useQuery({
    queryKey: ["inventory", "tree", "products", warehouseId, page],
    queryFn: () => inventoryService.getTreeProducts(warehouseId, { page, per_page: 50 }), // Load 50 products per chunk
    enabled: enabled,
    staleTime: 60000, // Keep data for 1 min
  });

  return {
    data: query.data?.data?.data ?? [],
    meta: query.data?.data?.meta,
    isLoading: query.isLoading,
    isError: query.isError,
    page,
    setPage,
  };
}

// Hook for fetching paginated batches of a product in a warehouse (server-side pagination)
export function useInventoryTreeBatches(warehouseId: string, productId: string, enabled: boolean, perPage = 10) {
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["inventory", "tree", "batches", warehouseId, productId, page, perPage],
    queryFn: () => inventoryService.getTreeBatches(warehouseId, productId, { page, per_page: perPage }),
    enabled: enabled && !!warehouseId && !!productId,
    staleTime: 60000,
  });

  return {
    batches: query.data?.data?.data ?? [],
    meta: query.data?.data?.meta,
    isLoading: query.isLoading,
    isError: query.isError,
    page,
    setPage,
  };
}
