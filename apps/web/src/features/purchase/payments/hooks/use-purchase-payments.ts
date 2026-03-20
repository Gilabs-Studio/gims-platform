"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { purchasePaymentsService } from "../services/purchase-payments-service";
import { supplierInvoiceKeys } from "@/features/purchase/supplier-invoices/hooks/use-supplier-invoices";
import { supplierInvoiceDPKeys } from "@/features/purchase/supplier-invoice-down-payments/hooks/use-supplier-invoice-dp";
import { purchaseOrderKeys } from "@/features/purchase/orders/hooks/use-purchase-orders";
import type { CreatePurchasePaymentInput, PurchasePaymentListParams } from "../types";

export const purchasePaymentKeys = {
  all: ["purchase-payments"] as const,
  lists: () => [...purchasePaymentKeys.all, "list"] as const,
  list: (params?: PurchasePaymentListParams) => [...purchasePaymentKeys.lists(), params] as const,
  details: () => [...purchasePaymentKeys.all, "detail"] as const,
  detail: (id: string) => [...purchasePaymentKeys.details(), id] as const,
  addData: () => [...purchasePaymentKeys.all, "add"] as const,
  auditTrail: (id: string, params?: { page?: number; per_page?: number }) =>
    [...purchasePaymentKeys.all, "audit-trail", id, params] as const,
};

export function usePurchasePayments(
  params?: PurchasePaymentListParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: purchasePaymentKeys.list(params),
    queryFn: () => purchasePaymentsService.list(params),
    enabled: options?.enabled ?? true,
  });
}

export function usePurchasePayment(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: purchasePaymentKeys.detail(id),
    queryFn: () => purchasePaymentsService.getById(id),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}

export function usePurchasePaymentAddData(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: purchasePaymentKeys.addData(),
    queryFn: () => purchasePaymentsService.addData(),
    enabled: options?.enabled ?? false,
    staleTime: 60_000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useCreatePurchasePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePurchasePaymentInput) => purchasePaymentsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchasePaymentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: supplierInvoiceKeys.all });
      queryClient.invalidateQueries({ queryKey: supplierInvoiceDPKeys.all });
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.all });
    },
  });
}

export function useDeletePurchasePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => purchasePaymentsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchasePaymentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: supplierInvoiceKeys.all });
      queryClient.invalidateQueries({ queryKey: supplierInvoiceDPKeys.all });
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.all });
    },
  });
}

export function useConfirmPurchasePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => purchasePaymentsService.confirm(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: purchasePaymentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: purchasePaymentKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: supplierInvoiceKeys.all });
      queryClient.invalidateQueries({ queryKey: supplierInvoiceDPKeys.all });
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.all });
    },
  });
}

export function usePurchasePaymentAuditTrail(
  id: string,
  params?: { page?: number; per_page?: number },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: purchasePaymentKeys.auditTrail(id, params),
    queryFn: () => purchasePaymentsService.auditTrail(id, params),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}
