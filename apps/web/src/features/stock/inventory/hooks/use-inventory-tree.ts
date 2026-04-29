import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { inventoryService } from "../services/inventory-service";
import { useEffect, useMemo, useState } from "react";
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
  const query = useInfiniteQuery({
    queryKey: ["inventory", "tree", "products", warehouseId, isIngredient],
    queryFn: ({ pageParam = 1 }) =>
      inventoryService.getTreeProducts(warehouseId, { page: pageParam, per_page: 20, is_ingredient: isIngredient }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const pagination = lastPage.data?.meta;
      if (!pagination?.has_next) {
        return undefined;
      }

      return pagination.page + 1;
    },
    enabled: enabled && !!warehouseId,
    staleTime: 60000, // Keep data for 1 min
  });

  const products = useMemo(
    () => query.data?.pages.flatMap((page) => page.data?.data ?? []) ?? [],
    [query.data?.pages]
  );

  const meta = query.data?.pages[query.data.pages.length - 1]?.data?.meta ?? null;
  const summary = query.data?.pages[0]?.data?.summary ?? null;

  const loadMore = () => {
    if (!query.hasNextPage || query.isFetchingNextPage) {
      return;
    }

    void query.fetchNextPage();
  };

  return {
    data: products,
    meta,
    summary,
    isLoading: query.isLoading,
    isLoadingMore: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    loadMore,
    isError: query.isError,
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
    queueMicrotask(() => {
      setPage(1);
      setAllBatches([]);
    });
  }, [warehouseId, productId, perPage]);

  // Append page results for load-more behavior.
  useEffect(() => {
    const pageData = query.data?.data?.data ?? [];
    if (pageData.length === 0) {
      return;
    }

    if (page === 1) {
      queueMicrotask(() => setAllBatches(pageData));
      return;
    }

    queueMicrotask(() => setAllBatches((prev) => [...prev, ...pageData]));
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
