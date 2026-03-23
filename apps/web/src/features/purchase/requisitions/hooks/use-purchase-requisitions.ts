"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { purchaseRequisitionsService } from "../services/purchase-requisitions-service";
import type {
  CreatePurchaseRequisitionInput,
  PurchaseRequisitionListParams,
  UpdatePurchaseRequisitionInput,
} from "../types";

export const purchaseRequisitionKeys = {
  all: ["purchase-requisitions"] as const,
  lists: () => [...purchaseRequisitionKeys.all, "list"] as const,
  list: (params?: PurchaseRequisitionListParams) =>
    [...purchaseRequisitionKeys.lists(), params] as const,
  details: () => [...purchaseRequisitionKeys.all, "detail"] as const,
  detail: (id: string) => [...purchaseRequisitionKeys.details(), id] as const,
};

export function usePurchaseRequisitions(
  params?: PurchaseRequisitionListParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: purchaseRequisitionKeys.list(params),
    queryFn: () => purchaseRequisitionsService.list(params),
    enabled: options?.enabled ?? true,
  });
}

export function usePurchaseRequisition(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: purchaseRequisitionKeys.detail(id),
    queryFn: () => purchaseRequisitionsService.getById(id),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}

export function useCreatePurchaseRequisition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePurchaseRequisitionInput) =>
      purchaseRequisitionsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: purchaseRequisitionKeys.lists(),
      });
    },
  });
}

export function useUpdatePurchaseRequisition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePurchaseRequisitionInput }) =>
      purchaseRequisitionsService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: purchaseRequisitionKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: purchaseRequisitionKeys.detail(variables.id),
      });
    },
  });
}

export function useDeletePurchaseRequisition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => purchaseRequisitionsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: purchaseRequisitionKeys.lists(),
      });
    },
  });
}

export function usePurchaseRequisitionAddData(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...purchaseRequisitionKeys.all, "add-data"] as const,
    queryFn: () => purchaseRequisitionsService.addData(),
    enabled: options?.enabled ?? false,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useApprovePurchaseRequisition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => purchaseRequisitionsService.approve(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: purchaseRequisitionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: purchaseRequisitionKeys.detail(id) });
    },
  });
}

export function useRejectPurchaseRequisition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => purchaseRequisitionsService.reject(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: purchaseRequisitionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: purchaseRequisitionKeys.detail(id) });
    },
  });
}

export function useSubmitPurchaseRequisition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => purchaseRequisitionsService.submit(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: purchaseRequisitionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: purchaseRequisitionKeys.detail(id) });
    },
  });
}

export function useConvertPurchaseRequisition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => purchaseRequisitionsService.convert(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: purchaseRequisitionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: purchaseRequisitionKeys.detail(id) });
    },
  });
}

export function usePurchaseRequisitionAuditTrail(
  id: string,
  params?: { page?: number; per_page?: number },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...purchaseRequisitionKeys.all, "audit-trail", id, params] as const,
    queryFn: () => purchaseRequisitionsService.auditTrail(id, params),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}
