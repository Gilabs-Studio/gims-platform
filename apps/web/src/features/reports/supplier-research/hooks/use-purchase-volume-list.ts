"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { supplierResearchService } from "../services/supplier-research-service";
import type { SupplierResearchFilters } from "../types";

export function usePurchaseVolumeList(
  filters: SupplierResearchFilters,
  limit = 10
) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(limit);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<
    "purchase_value" | "orders" | "name" | "dependency"
  >("purchase_value");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const debouncedSearch = useDebounce(search, 500);

  const queryFilters = useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch]
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [
      "reports",
      "supplier-research",
      "purchase-volume",
      { ...queryFilters, page, per_page: perPage, sort_by: sortBy, order },
    ],
    queryFn: async () => {
      return supplierResearchService.getPurchaseVolume({
        ...queryFilters,
        page,
        per_page: perPage,
        sort_by: sortBy,
        order,
      });
    },
    staleTime: 30000,
  });

  return {
    rows: Array.isArray(data?.data) ? data.data : [],
    pagination: data?.meta?.pagination,
    isLoading,
    error,
    refetch,
    page,
    setPage,
    perPage,
    setPerPage,
    search,
    setSearch: (value: string) => {
      setSearch(value);
      setPage(1);
    },
    sortBy,
    setSortBy,
    order,
    setOrder,
  };
}
