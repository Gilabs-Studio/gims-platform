"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { financePaymentsService } from "../services/finance-payments-service";
import type { ListPaymentsParams, PaymentInput } from "../types";

export const financePaymentKeys = {
  all: ["finance-payments"] as const,
  lists: () => [...financePaymentKeys.all, "list"] as const,
  list: (params?: ListPaymentsParams) => [...financePaymentKeys.lists(), params] as const,
  details: () => [...financePaymentKeys.all, "detail"] as const,
  detail: (id: string) => [...financePaymentKeys.details(), id] as const,
};

export function useFinancePayments(params?: ListPaymentsParams) {
  return useQuery({
    queryKey: financePaymentKeys.list(params),
    queryFn: () => financePaymentsService.list(params),
  });
}

export function useFinancePayment(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: financePaymentKeys.detail(id),
    queryFn: () => financePaymentsService.getById(id),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}

export function useCreateFinancePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PaymentInput) => financePaymentsService.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financePaymentKeys.lists() }),
  });
}

export function useUpdateFinancePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PaymentInput }) => financePaymentsService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: financePaymentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: financePaymentKeys.detail(id) });
    },
  });
}

export function useDeleteFinancePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financePaymentsService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financePaymentKeys.lists() }),
  });
}

export function useApproveFinancePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financePaymentsService.approve(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: financePaymentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: financePaymentKeys.detail(id) });
    },
  });
}
