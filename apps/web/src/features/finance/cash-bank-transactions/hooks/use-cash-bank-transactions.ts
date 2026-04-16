"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { cashBankTransactionsService } from "../services/cash-bank-transactions-service";
import type { CreateCashBankTransactionInput, ListCashBankTransactionsParams, ReverseCashBankTransactionInput } from "../types";

export const cashBankTransactionsKeys = {
  all: ["cash-bank-transactions"] as const,
  lists: () => [...cashBankTransactionsKeys.all, "list"] as const,
  list: (params?: ListCashBankTransactionsParams) => [...cashBankTransactionsKeys.lists(), params] as const,
  details: () => [...cashBankTransactionsKeys.all, "detail"] as const,
  detail: (id: string) => [...cashBankTransactionsKeys.details(), id] as const,
  formData: (companyId?: string) => [...cashBankTransactionsKeys.all, "form-data", companyId] as const,
};

export function useCashBankTransactions(params?: ListCashBankTransactionsParams) {
  return useQuery({
    queryKey: cashBankTransactionsKeys.list(params),
    queryFn: () => cashBankTransactionsService.list(params),
  });
}

export function useCashBankTransaction(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: cashBankTransactionsKeys.detail(id),
    queryFn: () => cashBankTransactionsService.getById(id),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}

export function useCashBankTransactionFormData(companyId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: cashBankTransactionsKeys.formData(companyId),
    queryFn: () => cashBankTransactionsService.getFormData(companyId),
    enabled: options?.enabled !== undefined ? options.enabled : true,
  });
}

export function useCreateCashBankTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCashBankTransactionInput) => cashBankTransactionsService.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cashBankTransactionsKeys.lists() }),
  });
}

export function useReverseCashBankTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReverseCashBankTransactionInput }) =>
      cashBankTransactionsService.reverse(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: cashBankTransactionsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: cashBankTransactionsKeys.detail(id) });
    },
  });
}
