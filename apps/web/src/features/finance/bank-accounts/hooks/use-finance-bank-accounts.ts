"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { financeBankAccountsService } from "../services/finance-bank-accounts-service";
import type { BankAccountInput, ListBankAccountsParams } from "../types";

export const financeBankAccountKeys = {
  all: ["finance-bank-accounts"] as const,
  lists: () => [...financeBankAccountKeys.all, "list"] as const,
  list: (params?: ListBankAccountsParams) => [...financeBankAccountKeys.lists(), params] as const,
  details: () => [...financeBankAccountKeys.all, "detail"] as const,
  detail: (id: string) => [...financeBankAccountKeys.details(), id] as const,
};

export function useFinanceBankAccounts(params?: ListBankAccountsParams) {
  return useQuery({
    queryKey: financeBankAccountKeys.list(params),
    queryFn: () => financeBankAccountsService.list(params),
  });
}

export function useFinanceBankAccount(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: financeBankAccountKeys.detail(id),
    queryFn: () => financeBankAccountsService.getById(id),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}

export function useCreateFinanceBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BankAccountInput) => financeBankAccountsService.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeBankAccountKeys.lists() }),
  });
}

export function useUpdateFinanceBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: BankAccountInput }) => financeBankAccountsService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: financeBankAccountKeys.lists() });
      queryClient.invalidateQueries({ queryKey: financeBankAccountKeys.detail(id) });
    },
  });
}

export function useDeleteFinanceBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeBankAccountsService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeBankAccountKeys.lists() }),
  });
}
