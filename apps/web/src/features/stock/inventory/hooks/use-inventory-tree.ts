import { useQuery } from "@tanstack/react-query";
import { inventoryService } from "../services/inventory-service";
import { useEffect, useState } from "react";
import type { InventoryBatchItem } from "../types";

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
export function useInventoryTreeProducts(warehouseId: string, enabled: boolean, isIngredient?: boolean) {
  const [page, setPage] = useState(1);
  
  const query = useQuery({
    queryKey: ["inventory", "tree", "products", warehouseId, page, isIngredient],
    queryFn: () => inventoryService.getTreeProducts(warehouseId, { page, per_page: 50, is_ingredient: isIngredient }), // Load 50 products per chunk
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
  const [allBatches, setAllBatches] = useState<InventoryBatchItem[]>([]);

  const query = useQuery({
    queryKey: ["inventory", "tree", "batches", warehouseId, productId, page, perPage],
    queryFn: () => inventoryService.getTreeBatches(warehouseId, productId, { page, per_page: perPage }),
    enabled: enabled && !!warehouseId && !!productId,
    staleTime: 60000,
  });

  // Reset pagination when context changes.
  useEffect(() => {
    setPage(1);
    setAllBatches([]);
  }, [warehouseId, productId, perPage]);

  // Append page results for load-more behavior.
  useEffect(() => {
    const pageData = query.data?.data?.data ?? [];
    if (pageData.length === 0) {
      return;
    }

    if (page === 1) {
      setAllBatches(pageData);
      return;
    }

    setAllBatches((prev) => [...prev, ...pageData]);
  }, [page, query.data]);

  const meta = query.data?.data?.meta;

  const loadMore = () => {
    if (!meta?.has_next || query.isFetching) {
      return;
    }

    setPage((prev) => prev + 1);
  };

  return {
    batches: allBatches,
    meta,
    isLoading: query.isLoading && page === 1,
    isLoadingMore: query.isFetching && page > 1,
    isError: query.isError,
    page,
    loadMore,
  };
}
