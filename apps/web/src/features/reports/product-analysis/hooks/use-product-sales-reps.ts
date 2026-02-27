"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { productAnalysisService } from "../services/product-analysis-service";
import type { ListProductSalesRepsRequest } from "../types";

const getDefaultLastYearRange = () => {
  const today = new Date();
  const lastYear = today.getFullYear() - 1;
  return {
    startDate: `${lastYear}-01-01`,
    endDate: `${lastYear}-12-31`,
  };
};

export function useProductSalesReps(
  productId: string,
  filters?: { startDate?: string; endDate?: string }
) {
  const defaultRange = useMemo(() => getDefaultLastYearRange(), []);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const startDate = filters?.startDate ?? defaultRange.startDate;
  const endDate = filters?.endDate ?? defaultRange.endDate;
  const [sortBy, setSortBy] = useState<"revenue" | "qty" | "orders" | "name">(
    "revenue"
  );
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [
      "reports",
      "product-analysis",
      "product",
      productId,
      "sales-reps",
      { page, per_page: perPage, start_date: startDate, end_date: endDate, sort_by: sortBy, order },
    ],
    queryFn: async () => {
      const params: ListProductSalesRepsRequest = {
        page,
        per_page: perPage,
        sort_by: sortBy,
        order,
        start_date: startDate,
        end_date: endDate,
      };
      return await productAnalysisService.getProductSalesReps(
        productId,
        params
      );
    },
    enabled: !!productId,
    staleTime: 30000,
  });

  return {
    salesReps: Array.isArray(data?.data) ? data.data : [],
    pagination: data?.meta?.pagination,
    isLoading,
    error,
    refetch,
    page,
    setPage,
    perPage,
    setPerPage,
    sortBy,
    setSortBy,
    order,
    setOrder,
  };
}
