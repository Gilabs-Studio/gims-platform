"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { financeJournalsService } from "../services/finance-journals-service";
import type { CreateJournalEntryInput, ListJournalEntriesParams, UpdateJournalEntryInput } from "../types";

export const financeJournalKeys = {
  all: ["finance-journals"] as const,
  lists: () => [...financeJournalKeys.all, "list"] as const,
  list: (params?: ListJournalEntriesParams) => [...financeJournalKeys.lists(), params] as const,
  details: () => [...financeJournalKeys.all, "detail"] as const,
  detail: (id: string) => [...financeJournalKeys.details(), id] as const,
  trialBalance: (params?: { start_date?: string; end_date?: string }) =>
    [...financeJournalKeys.all, "trial-balance", params] as const,
};

export function useFinanceJournals(params?: ListJournalEntriesParams) {
  return useQuery({
    queryKey: financeJournalKeys.list(params),
    queryFn: () => financeJournalsService.list(params),
  });
}

export function useFinanceJournal(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: financeJournalKeys.detail(id),
    queryFn: () => financeJournalsService.getById(id),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}

export function useCreateFinanceJournal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateJournalEntryInput) => financeJournalsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeJournalKeys.lists() });
    },
  });
}

export function useUpdateFinanceJournal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateJournalEntryInput }) =>
      financeJournalsService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: financeJournalKeys.lists() });
      queryClient.invalidateQueries({ queryKey: financeJournalKeys.detail(id) });
    },
  });
}

export function useDeleteFinanceJournal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => financeJournalsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeJournalKeys.lists() });
    },
  });
}

export function usePostFinanceJournal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => financeJournalsService.post(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: financeJournalKeys.lists() });
      queryClient.invalidateQueries({ queryKey: financeJournalKeys.detail(id) });
    },
  });
}

export function useReverseFinanceJournal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => financeJournalsService.reverse(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: financeJournalKeys.lists() });
      queryClient.invalidateQueries({ queryKey: financeJournalKeys.detail(id) });
    },
  });
}

export function useTrialBalance(params?: { start_date?: string; end_date?: string }, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: financeJournalKeys.trialBalance(params),
    queryFn: () => financeJournalsService.trialBalance(params),
    enabled: options?.enabled !== undefined ? options.enabled : true,
    staleTime: 60_000,
  });
}
