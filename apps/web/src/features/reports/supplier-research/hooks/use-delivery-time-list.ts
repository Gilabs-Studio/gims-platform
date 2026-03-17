"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { supplierResearchService } from "../services/supplier-research-service";
import type { SupplierResearchFilters } from "../types";

export function useDeliveryTimeList(
  filters: SupplierResearchFilters,
  limit = 10
) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(limit);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<
    "lead_time" | "on_time_rate" | "late_count" | "name"
  >("lead_time");
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
      "delivery-time",
      { ...queryFilters, page, per_page: perPage, sort_by: sortBy, order },
    ],
    queryFn: async () => {
      return supplierResearchService.getDeliveryTime({
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
