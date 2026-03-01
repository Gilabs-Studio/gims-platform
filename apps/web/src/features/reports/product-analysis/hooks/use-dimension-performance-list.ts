"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";

type DimensionSortBy = "revenue" | "qty" | "orders" | "name" | "products";

interface DimensionPerformancePagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

interface DimensionListResponse<T> {
  data: T[];
  meta?: { pagination?: DimensionPerformancePagination };
}

interface UseDimensionPerformanceListOptions<T> {
  /** Unique query cache key segment (e.g. "segment-performance") */
  dimensionKey: string;
  /** Service function to call when the tab is active */
  fetchFn: (params: {
    page: number;
    per_page: number;
    sort_by: DimensionSortBy;
    order: "asc" | "desc";
    search?: string;
    start_date?: string;
    end_date?: string;
  }) => Promise<DimensionListResponse<T>>;
  /** Only execute the query when this is true (lazy loading per tab) */
  enabled: boolean;
  limit?: number;
  filters?: { startDate?: string; endDate?: string };
}

const getDefaultLastYearRange = () => {
  const today = new Date();
  const lastYear = today.getFullYear() - 1;
  return {
    startDate: `${lastYear}-01-01`,
    endDate: `${lastYear}-12-31`,
  };
};

/**
 * Generic paginated dimension performance list hook.
 * Data is only fetched when `enabled` is true, enabling lazy tab loading.
 */
export function useDimensionPerformanceList<T>({
  dimensionKey,
  fetchFn,
  enabled,
  limit,
  filters,
}: UseDimensionPerformanceListOptions<T>) {
  const defaultRange = useMemo(() => getDefaultLastYearRange(), []);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(limit ?? 10);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [internalStartDate, setInternalStartDate] = useState<string>(
    defaultRange.startDate
  );
  const [internalEndDate, setInternalEndDate] = useState<string>(
    defaultRange.endDate
  );

  const startDate = filters?.startDate ?? internalStartDate;
  const endDate = filters?.endDate ?? internalEndDate;

  const [sortBy, setSortBy] = useState<DimensionSortBy>("revenue");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [
      "reports",
      "product-analysis",
      dimensionKey,
      {
        page,
        per_page: perPage,
        search: debouncedSearch,
        start_date: startDate,
        end_date: endDate,
        sort_by: sortBy,
        order,
      },
    ],
    queryFn: async () => {
      const params: Parameters<typeof fetchFn>[0] = {
        page,
        per_page: perPage,
        sort_by: sortBy,
        order,
      };

      if (debouncedSearch?.trim()) params.search = debouncedSearch.trim();
      if (startDate?.trim()) params.start_date = startDate.trim();
      if (endDate?.trim()) params.end_date = endDate.trim();

      return await fetchFn(params);
    },
    enabled,
    staleTime: 30000,
  });

  return {
    items: Array.isArray(data?.data) ? data!.data : [],
    pagination: data?.meta?.pagination,
    isLoading: enabled && isLoading,
    error,
    refetch,
    page,
    setPage,
    perPage,
    setPerPage,
    search,
    setSearch: (s: string) => {
      setSearch(s);
      setPage(1);
    },
    startDate,
    setStartDate: setInternalStartDate,
    endDate,
    setEndDate: setInternalEndDate,
    sortBy,
    setSortBy,
    order,
    setOrder,
  };
}
