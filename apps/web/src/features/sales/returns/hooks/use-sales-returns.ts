"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { salesReturnsService } from "../services/sales-returns-service";
import type { CreateSalesReturnInput, SalesReturnListParams } from "../types";

export const salesReturnsKeys = {
  all: ["sales-returns"] as const,
  lists: () => [...salesReturnsKeys.all, "list"] as const,
  list: (params?: SalesReturnListParams) => [...salesReturnsKeys.lists(), params] as const,
  details: () => [...salesReturnsKeys.all, "detail"] as const,
  detail: (id: string) => [...salesReturnsKeys.details(), id] as const,
  formData: () => [...salesReturnsKeys.all, "form-data"] as const,
};

export function useSalesReturns(params?: SalesReturnListParams) {
  return useQuery({
    queryKey: salesReturnsKeys.list(params),
    queryFn: () => salesReturnsService.list(params),
  });
}

export function useSalesReturnDetail(id: string, enabled = true) {
  return useQuery({
    queryKey: salesReturnsKeys.detail(id),
    queryFn: () => salesReturnsService.getById(id),
    enabled: enabled && !!id,
  });
}

export function useSalesReturnFormData() {
  return useQuery({
    queryKey: salesReturnsKeys.formData(),
    queryFn: () => salesReturnsService.getFormData(),
  });
}

export function useCreateSalesReturn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSalesReturnInput) => salesReturnsService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesReturnsKeys.lists() });
    },
  });
}
