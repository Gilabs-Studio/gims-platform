"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { salesPaymentsService } from "../services/sales-payments-service";
import { customerInvoiceDPKeys } from "@/features/sales/customer-invoice-down-payments/hooks/use-customer-invoice-dp";
import { invoiceKeys } from "@/features/sales/invoice/hooks/use-invoices";
import { orderKeys } from "@/features/sales/order/hooks/use-orders";
import { getSalesErrorMessage } from "@/features/sales/utils/error-utils";
import type { CreateSalesPaymentInput, SalesPaymentListParams } from "../types";

export const salesPaymentKeys = {
  all: ["sales-payments"] as const,
  lists: () => [...salesPaymentKeys.all, "list"] as const,
  list: (params?: SalesPaymentListParams) => [...salesPaymentKeys.lists(), params] as const,
  details: () => [...salesPaymentKeys.all, "detail"] as const,
  detail: (id: string) => [...salesPaymentKeys.details(), id] as const,
  addData: () => [...salesPaymentKeys.all, "add"] as const,
  auditTrail: (id: string, params?: { page?: number; per_page?: number }) =>
    [...salesPaymentKeys.all, "audit-trail", id, params] as const,
};

export function useSalesPayments(params?: SalesPaymentListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: salesPaymentKeys.list(params),
    queryFn: () => salesPaymentsService.list(params),
    enabled: options?.enabled ?? true,
  });
}

export function useSalesPayment(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: salesPaymentKeys.detail(id),
    queryFn: () => salesPaymentsService.getById(id),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}

export function useSalesPaymentAddData(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: salesPaymentKeys.addData(),
    queryFn: () => salesPaymentsService.addData(),
    enabled: options?.enabled !== undefined ? options.enabled : true,
    staleTime: 60_000,
  });
}

export function useCreateSalesPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSalesPaymentInput) => salesPaymentsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesPaymentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
      queryClient.invalidateQueries({ queryKey: customerInvoiceDPKeys.all });
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
    onError: (error) => {
      toast.error(getSalesErrorMessage(error, "Failed to create payment"));
    },
  });
}

export function useDeleteSalesPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => salesPaymentsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesPaymentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
      queryClient.invalidateQueries({ queryKey: customerInvoiceDPKeys.all });
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
    onError: (error) => {
      toast.error(getSalesErrorMessage(error, "Failed to delete payment"));
    },
  });
}

export function useConfirmSalesPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => salesPaymentsService.confirm(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: salesPaymentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: salesPaymentKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
      queryClient.invalidateQueries({ queryKey: customerInvoiceDPKeys.all });
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
    onError: (error) => {
      toast.error(getSalesErrorMessage(error, "Failed to confirm payment"));
    },
  });
}

export function useSalesPaymentAuditTrail(
  id: string,
  params?: { page?: number; per_page?: number },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: salesPaymentKeys.auditTrail(id, params),
    queryFn: () => salesPaymentsService.auditTrail(id, params),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}
