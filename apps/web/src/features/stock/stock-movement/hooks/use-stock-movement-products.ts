"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { productService } from "@/features/master-data/product/services/product-service";
import { useInventoryTreeProducts } from "@/features/stock/inventory/hooks/use-inventory-tree";
import type { InventoryStockItem } from "@/features/stock/inventory/types";
import type { Product } from "@/features/master-data/product/types";

export type MovementType = "IN" | "OUT" | "TRANSFER";

export interface StockMovementSelectableProduct {
  product_id: string;
  product_name: string;
  product_code: string;
  available: number;
  uom_name: string | null;
}

export function useStockMovementProducts(type: MovementType, warehouseId: string, enabled: boolean) {
  const masterProductsQuery = useInfiniteQuery({
    queryKey: ["stock-movement", "master-products", warehouseId],
    queryFn: ({ pageParam = 1 }) => productService.list({ page: pageParam, per_page: 20 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const pagination = lastPage.meta?.pagination;
      if (!pagination?.has_next) {
        return undefined;
      }

      return pagination.page + 1;
    },
    enabled: enabled && type === "IN" && !!warehouseId,
    staleTime: 60_000,
  });

  const treeProductsQuery = useInventoryTreeProducts(warehouseId, enabled && type !== "IN" && !!warehouseId);

  const masterProducts = useMemo<StockMovementSelectableProduct[]>(
    () =>
      masterProductsQuery.data?.pages.flatMap((page) => page.data ?? []).map((product: Product) => ({
        product_id: product.id,
        product_name: product.name,
        product_code: product.code,
        available: product.current_stock,
        uom_name: product.uom?.name ?? null,
      })) ?? [],
    [masterProductsQuery.data?.pages]
  );

  const treeProducts = useMemo<StockMovementSelectableProduct[]>(
    () =>
      (treeProductsQuery.data ?? []).map((product: InventoryStockItem) => ({
        product_id: product.product_id,
        product_name: product.product_name,
        product_code: product.product_code,
        available: product.available,
        uom_name: product.uom_name,
      })),
    [treeProductsQuery.data]
  );

  const products = type === "IN" ? masterProducts : treeProducts;
  const isLoading = type === "IN" ? masterProductsQuery.isLoading : treeProductsQuery.isLoading;
  const isLoadingMore = type === "IN" ? masterProductsQuery.isFetchingNextPage : treeProductsQuery.isLoadingMore;
  const hasNextPage = type === "IN" ? masterProductsQuery.hasNextPage : treeProductsQuery.hasNextPage;

  const loadMore = () => {
    if (!hasNextPage || isLoadingMore) {
      return;
    }

    if (type === "IN") {
      void masterProductsQuery.fetchNextPage();
      return;
    }

    treeProductsQuery.loadMore();
  };

  return {
    products,
    isLoading,
    isLoadingMore,
    hasNextPage,
    loadMore,
  };
}