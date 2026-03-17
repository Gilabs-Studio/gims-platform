"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { supplierResearchService } from "../services/supplier-research-service";
import type { SupplierResearchFilters } from "../types";

export function useSupplierTableList(
  filters: SupplierResearchFilters
) {
  const tab = "top_spenders";
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>("purchase_value");
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
      "suppliers",
      tab,
      {
        ...queryFilters,
        page,
        per_page: perPage,
        sort_by: sortBy,
        order,
      },
    ],
    queryFn: async () => {
      return supplierResearchService.listSuppliers({
        ...queryFilters,
        tab,
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
