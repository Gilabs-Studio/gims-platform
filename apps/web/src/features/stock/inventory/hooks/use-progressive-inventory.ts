import { useCallback, useState, useEffect } from "react";
import { inventoryService } from "../services/inventory-service";
import type { InventoryStockItem, TreeProductsSummary, InventoryTreeWarehouse } from "../types";

/**
 * Progressive inventory hook - similar pattern to useProgressiveKanbanBoard
 * Manages multi-page product loading per warehouse with progressive append
 */
export function useProgressiveInventory(
  warehouses: InventoryTreeWarehouse[],
  enabled: boolean = false,
  expandedWarehouses: Record<string, boolean> = {}
) {
  const [allPagesByWarehouse, setAllPagesByWarehouse] = useState<Record<string, InventoryStockItem[]>>({});
  const [summaryByWarehouse, setSummaryByWarehouse] = useState<Record<string, TreeProductsSummary | null>>({});
  const [totalByWarehouse, setTotalByWarehouse] = useState<Record<string, number>>({});
  const [loadingMoreByWarehouse, setLoadingMoreByWarehouse] = useState<Record<string, boolean>>({});
  const [hasMoreByWarehouse, setHasMoreByWarehouse] = useState<Record<string, boolean>>({});
  const [pagesByWarehouse, setPagesByWarehouse] = useState<Record<string, number>>({});

  // Helper function to fetch warehouse products
  const fetchWarehouseProducts = useCallback(
    (warehouseId: string, page: number) =>
      inventoryService.getTreeProducts(warehouseId, { page, per_page: 20 }),
    []
  );

  // Initialize pagination state for all warehouses
  useEffect(() => {
    const newPagesByWarehouse: Record<string, number> = {};
    const newAllPages: Record<string, InventoryStockItem[]> = {};
    const newSummary: Record<string, TreeProductsSummary | null> = {};
    const newTotal: Record<string, number> = {};
    const newHasMore: Record<string, boolean> = {};

    for (const warehouse of warehouses) {
      if (!(warehouse.id in pagesByWarehouse)) {
        newPagesByWarehouse[warehouse.id] = 1;
      }
      if (!(warehouse.id in allPagesByWarehouse)) {
        newAllPages[warehouse.id] = [];
      }
      if (!(warehouse.id in summaryByWarehouse)) {
        newSummary[warehouse.id] = null;
      }
      if (!(warehouse.id in totalByWarehouse)) {
        newTotal[warehouse.id] = 0;
      }
      if (!(warehouse.id in hasMoreByWarehouse)) {
        newHasMore[warehouse.id] = false;
      }
    }

    if (Object.keys(newPagesByWarehouse).length > 0) {
      setPagesByWarehouse((prev) => ({ ...prev, ...newPagesByWarehouse }));
    }
    if (Object.keys(newAllPages).length > 0) {
      setAllPagesByWarehouse((prev) => ({ ...prev, ...newAllPages }));
    }
    if (Object.keys(newSummary).length > 0) {
      setSummaryByWarehouse((prev) => ({ ...prev, ...newSummary }));
    }
    if (Object.keys(newTotal).length > 0) {
      setTotalByWarehouse((prev) => ({ ...prev, ...newTotal }));
    }
    if (Object.keys(newHasMore).length > 0) {
      setHasMoreByWarehouse((prev) => ({ ...prev, ...newHasMore }));
    }
  }, [warehouses, pagesByWarehouse, allPagesByWarehouse, summaryByWarehouse, totalByWarehouse, hasMoreByWarehouse]);

  // Load initial data for all expanded warehouses
  useEffect(() => {
    if (!enabled) return;

    const loadInitialData = async () => {
      for (const warehouse of warehouses) {
        const shouldLoadWarehouse = warehouses.length === 1 || !!expandedWarehouses[warehouse.id];
        if (!shouldLoadWarehouse) {
          continue;
        }

        if (
          pagesByWarehouse[warehouse.id] === 1 &&
          allPagesByWarehouse[warehouse.id]?.length === 0
        ) {
          try {
            const response = await fetchWarehouseProducts(warehouse.id, 1);
            const data = response.data;

            setAllPagesByWarehouse((prev) => ({
              ...prev,
              [warehouse.id]: data?.data ?? [],
            }));

            setSummaryByWarehouse((prev) => ({
              ...prev,
              [warehouse.id]: data?.summary ?? null,
            }));

            setTotalByWarehouse((prev) => ({
              ...prev,
              [warehouse.id]: data?.meta?.total ?? 0,
            }));

            setHasMoreByWarehouse((prev) => ({
              ...prev,
              [warehouse.id]: data?.meta?.has_next ?? false,
            }));
          } catch (error) {
            console.error(`Failed to load warehouse ${warehouse.id}:`, error);
          }
        }
      }
    };

    loadInitialData();
  }, [enabled, warehouses, expandedWarehouses, pagesByWarehouse, allPagesByWarehouse, fetchWarehouseProducts]);

  // Fetch next page for a warehouse and append to list
  const fetchNextPageForWarehouse = useCallback(
    async (warehouseId: string) => {
      const nextPage = (pagesByWarehouse[warehouseId] || 0) + 1;
      setLoadingMoreByWarehouse((prev) => ({ ...prev, [warehouseId]: true }));

      try {
        const response = await fetchWarehouseProducts(warehouseId, nextPage);
        const newProducts = response.data?.data ?? [];
        const newSummary = response.data?.summary ?? null;

        // Append new products to existing list
        setAllPagesByWarehouse((prev) => ({
          ...prev,
          [warehouseId]: [...(prev[warehouseId] ?? []), ...newProducts],
        }));

        // Update summary
        setSummaryByWarehouse((prev) => ({
          ...prev,
          [warehouseId]: newSummary,
        }));

        // Update has_next flag
        setHasMoreByWarehouse((prev) => ({
          ...prev,
          [warehouseId]: response.data?.meta?.has_next ?? false,
        }));

        setPagesByWarehouse((prev) => ({
          ...prev,
          [warehouseId]: nextPage,
        }));
      } catch (error) {
        console.error(`Failed to fetch next page for warehouse ${warehouseId}:`, error);
      } finally {
        setLoadingMoreByWarehouse((prev) => ({ ...prev, [warehouseId]: false }));
      }
    },
    [pagesByWarehouse, fetchWarehouseProducts]
  );

  // Build product by warehouse object for consistent API
  const productsByWarehouse: Record<
    string,
    {
      products: InventoryStockItem[];
      summary: TreeProductsSummary | null;
      total: number;
    }
  > = {};

  for (const warehouse of warehouses) {
    productsByWarehouse[warehouse.id] = {
      products: allPagesByWarehouse[warehouse.id] ?? [],
      summary: summaryByWarehouse[warehouse.id] ?? null,
      total: totalByWarehouse[warehouse.id] ?? 0,
    };
  }

  // Check if warehouse has more pages to load
  const hasMoreForWarehouse = (warehouseId: string) => {
    return hasMoreByWarehouse[warehouseId] ?? false;
  };

  // Check if currently loading more for a warehouse
  const isLoadingMoreForWarehouse = (warehouseId: string) => {
    return loadingMoreByWarehouse[warehouseId] ?? false;
  };

  return {
    productsByWarehouse,
    hasMoreForWarehouse,
    isLoadingMoreForWarehouse,
    fetchNextPageForWarehouse,
  };
}
