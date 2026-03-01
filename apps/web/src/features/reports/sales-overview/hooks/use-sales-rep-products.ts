"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { salesOverviewReportService } from "../services/sales-overview-service";
import type { ListSalesRepProductsRequest } from "../types";

export function useSalesRepProducts(
  employeeId: string,
  initialParams?: ListSalesRepProductsRequest
) {
  const [page, setPage] = useState(initialParams?.page ?? 1);
  const [perPage, setPerPage] = useState(initialParams?.per_page ?? 20);
  const [sortBy, setSortBy] = useState<"total_quantity" | "revenue" | "name">(
    initialParams?.sort_by ?? "revenue"
  );
  const [order, setOrder] = useState<"asc" | "desc">(
    initialParams?.order ?? "desc"
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [
      "reports",
      "sales-overview",
      "sales-rep",
      employeeId,
      "products",
      {
        ...initialParams,
        page,
        per_page: perPage,
        sort_by: sortBy,
        order,
      },
    ],
    queryFn: async () => {
      return await salesOverviewReportService.getSalesRepProducts(employeeId, {
        ...initialParams,
        page,
        per_page: perPage,
        sort_by: sortBy,
        order,
      });
    },
    enabled: !!employeeId,
  });

  return {
    products: data?.data ?? [],
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
