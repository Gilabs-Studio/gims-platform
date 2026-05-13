"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { warehouseService } from "@/features/master-data/warehouse/services/warehouse-service";
import type { Warehouse } from "@/features/master-data/warehouse/types";

export function useStockMovementWarehouses(enabled: boolean) {
  const query = useInfiniteQuery({
    queryKey: ["stock-movement", "warehouses"],
    queryFn: ({ pageParam = 1 }) => warehouseService.list({ page: pageParam, per_page: 20 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const pagination = lastPage.meta?.pagination;
      if (!pagination?.has_next) {
        return undefined;
      }

      return pagination.page + 1;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const warehouses = query.data?.pages.flatMap((page) => page.data ?? []) ?? [];

  const loadMore = () => {
    if (!query.hasNextPage || query.isFetchingNextPage) {
      return;
    }

    void query.fetchNextPage();
  };

  return {
    warehouses: warehouses as Warehouse[],
    isLoading: query.isLoading,
    isLoadingMore: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    loadMore,
  };
}