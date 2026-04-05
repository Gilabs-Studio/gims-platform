"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { salesReturnsService } from "../services/sales-returns-service";
import { getSalesErrorMessage } from "../../utils/error-utils";
import type { CreateSalesReturnInput, SalesReturnListParams, SalesReturnStatus } from "../types";

export const salesReturnsKeys = {
  all: ["sales-returns"] as const,
  lists: () => [...salesReturnsKeys.all, "list"] as const,
  list: (params?: SalesReturnListParams) => [...salesReturnsKeys.lists(), params] as const,
  details: () => [...salesReturnsKeys.all, "detail"] as const,
  detail: (id: string) => [...salesReturnsKeys.details(), id] as const,
  formData: () => [...salesReturnsKeys.all, "form-data"] as const,
  auditTrail: (id: string, params?: { page?: number; per_page?: number }) =>
    [...salesReturnsKeys.detail(id), "audit-trail", params] as const,
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

export function useSalesReturnAuditTrail(
  id: string,
  params?: { page?: number; per_page?: number },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: salesReturnsKeys.auditTrail(id, params),
    queryFn: () => salesReturnsService.auditTrail(id, params),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
    placeholderData: (previousData) => previousData,
  });
}

export function useSalesReturnFormData(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: salesReturnsKeys.formData(),
    queryFn: () => salesReturnsService.getFormData(),
    enabled: options?.enabled ?? true,
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
    onError: (error) => {
      toast.error(getSalesErrorMessage(error, "Failed to create sales return"));
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
    onError: (error) => {
      toast.error(getSalesErrorMessage(error, "Failed to update sales return status"));
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
    onError: (error) => {
      toast.error(getSalesErrorMessage(error, "Failed to delete sales return"));
    },
  });
}
