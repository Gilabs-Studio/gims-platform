"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { salesReturnsService } from "../services/sales-returns-service";
import type { CreateSalesReturnInput, SalesReturnListParams, SalesReturnStatus } from "../types";

export const salesReturnsKeys = {
  all: ["sales-returns"] as const,
  lists: () => [...salesReturnsKeys.all, "list"] as const,
  list: (params?: SalesReturnListParams) => [...salesReturnsKeys.lists(), params] as const,
  details: () => [...salesReturnsKeys.all, "detail"] as const,
  detail: (id: string) => [...salesReturnsKeys.details(), id] as const,
  formData: () => [...salesReturnsKeys.all, "form-data"] as const,
};

export function useSalesReturns(params?: SalesReturnListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: salesReturnsKeys.list(params),
    queryFn: () => salesReturnsService.list(params),
    enabled: options?.enabled ?? true,
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
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function useUpdateSalesReturnStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: SalesReturnStatus }) =>
      salesReturnsService.updateStatus(id, { status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: salesReturnsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: salesReturnsKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function useDeleteSalesReturn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => salesReturnsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesReturnsKeys.lists() });
    },
  });
}
