"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { useStockValuations, useStockValuationStats } from "./use-stock-valuations";

export function useStockValuationList() {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [movementTypeFilter, setMovementTypeFilter] = useState<"IN" | "OUT" | "ALL">("ALL");
  const [referenceTypeFilter, setReferenceTypeFilter] = useState<"PO" | "SO" | "ADJUSTMENT" | "TRANSFER" | "RETURN" | "ALL">("ALL");
  const [dateRange, setDateRange] = useState<{
    start_date?: string;
    end_date?: string;
  }>({});

  const debouncedSearch = useDebounce(search, 500);

  const { data, isLoading } = useStockValuations({
    page,
    limit: perPage,
    search: debouncedSearch,
    movement_type: movementTypeFilter !== "ALL" ? movementTypeFilter : undefined,
    reference_type: referenceTypeFilter !== "ALL" ? referenceTypeFilter : undefined,
    start_date: dateRange.start_date,
    end_date: dateRange.end_date,
  });

  const { data: statsData, isLoading: isStatsLoading } = useStockValuationStats({
    start_date: dateRange.start_date,
    end_date: dateRange.end_date,
  });

  const valuations = data?.data || [];
  const pagination = data?.meta?.pagination;
  const stats = statsData?.data;

  const handleExport = useCallback(() => {
    toast.info("Export functionality will be implemented");
  }, []);

  return {
    valuations,
    pagination,
    stats,
    isLoading,
    isStatsLoading,
    page,
    setPage,
    perPage,
    setPerPage,
    search,
    setSearch,
    movementTypeFilter,
    setMovementTypeFilter,
    referenceTypeFilter,
    setReferenceTypeFilter,
    dateRange,
    setDateRange,
    handleExport,
  };
}
