"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { financeCashBankService } from "../services/finance-cash-bank-service";
import type { ApiResponse, CashBankJournalInput, ListCashBankParams } from "../types";
import type { ListJournalLinesParams, ListJournalLinesResponse } from "@/features/finance/journal-lines/types";

export const financeCashBankKeys = {
  all: ["finance-cash-bank"] as const,
  lists: () => [...financeCashBankKeys.all, "list"] as const,
  list: (params?: ListCashBankParams) => [...financeCashBankKeys.lists(), params] as const,
  details: () => [...financeCashBankKeys.all, "detail"] as const,
  detail: (id: string) => [...financeCashBankKeys.details(), id] as const,
  formData: () => [...financeCashBankKeys.all, "form-data"] as const,
};

export function useFinanceCashBankJournals(params?: ListCashBankParams) {
  return useQuery({
    queryKey: financeCashBankKeys.list(params),
    queryFn: () => financeCashBankService.list(params),
  });
}

export function useFinanceCashBankJournal(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: financeCashBankKeys.detail(id),
    queryFn: () => financeCashBankService.getById(id),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}

export function useFinanceCashBankFormData(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: financeCashBankKeys.formData(),
    queryFn: () => financeCashBankService.getFormData(),
    enabled: options?.enabled ?? true,
  });
}

export function useCreateFinanceCashBankJournal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CashBankJournalInput) => financeCashBankService.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeCashBankKeys.lists() }),
  });
}

export function useUpdateFinanceCashBankJournal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CashBankJournalInput }) => financeCashBankService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: financeCashBankKeys.lists() });
      queryClient.invalidateQueries({ queryKey: financeCashBankKeys.detail(id) });
    },
  });
}

export function useDeleteFinanceCashBankJournal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeCashBankService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeCashBankKeys.lists() }),
  });
}

export function usePostFinanceCashBankJournal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeCashBankService.post(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: financeCashBankKeys.lists() });
      queryClient.invalidateQueries({ queryKey: financeCashBankKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: cashBankJournalLineKeys.list(id) });
    },
  });
}

export const cashBankJournalLineKeys = {
  all: [...financeCashBankKeys.all, "lines"] as const,
  lists: (id: string) => [...cashBankJournalLineKeys.all, "list", id] as const,
  list: (id: string, params?: ListJournalLinesParams) =>
    [...cashBankJournalLineKeys.lists(id), params] as const,
};

export function useCashBankJournalLines(
  id: string,
  params?: ListJournalLinesParams,
  options?: { enabled?: boolean }
) {
  return useQuery<ApiResponse<ListJournalLinesResponse>>({
    queryKey: cashBankJournalLineKeys.list(id, params),
    queryFn: () => financeCashBankService.listLines(id, params),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}
