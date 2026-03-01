"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { productAnalysisService } from "../services/product-analysis-service";
import type { ListCategoryPerformanceRequest } from "../types";

const getDefaultLastYearRange = () => {
  const today = new Date();
  const lastYear = today.getFullYear() - 1;
  return {
    startDate: `${lastYear}-01-01`,
    endDate: `${lastYear}-12-31`,
  };
};

export function useCategoryPerformanceList(
  limit?: number,
  filters?: { startDate?: string; endDate?: string }
) {
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

  const [sortBy, setSortBy] = useState<
    "revenue" | "qty" | "orders" | "name" | "products"
  >("revenue");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [
      "reports",
      "product-analysis",
      "category-performance",
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
      const params: ListCategoryPerformanceRequest = {
        page,
        per_page: perPage,
        sort_by: sortBy,
        order,
      };

      if (debouncedSearch?.trim()) {
        params.search = debouncedSearch.trim();
      }
      if (startDate?.trim()) {
        params.start_date = startDate.trim();
      }
      if (endDate?.trim()) {
        params.end_date = endDate.trim();
      }

      return await productAnalysisService.listCategoryPerformance(params);
    },
    staleTime: 30000,
  });

  return {
    categoryList: Array.isArray(data?.data) ? data.data : [],
    pagination: data?.meta?.pagination,
    isLoading,
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
