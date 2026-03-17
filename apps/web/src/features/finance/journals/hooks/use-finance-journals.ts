"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { financeJournalsService } from "../services/finance-journals-service";
import type {
  CreateJournalEntryInput,
  ListJournalEntriesParams,
  ListValuationRunsParams,
  RunValuationInput,
  UpdateJournalEntryInput,
  ListCashBankSubLedgerParams,
} from "../types";

export const financeJournalKeys = {
  all: ["finance-journals"] as const,
  lists: () => [...financeJournalKeys.all, "list"] as const,
  list: (params?: ListJournalEntriesParams) =>
    [...financeJournalKeys.lists(), params] as const,
  salesList: (params?: ListJournalEntriesParams) =>
    [...financeJournalKeys.all, "sales-list", params] as const,
  purchaseList: (params?: ListJournalEntriesParams) =>
    [...financeJournalKeys.all, "purchase-list", params] as const,
  adjustmentList: (params?: ListJournalEntriesParams) =>
    [...financeJournalKeys.all, "adjustment-list", params] as const,
  valuationList: (params?: ListJournalEntriesParams) =>
    [...financeJournalKeys.all, "valuation-list", params] as const,
  cashBankSubLedgerList: (params?: ListCashBankSubLedgerParams) =>
    [...financeJournalKeys.all, "cash-bank-subledger", params] as const,
  details: () => [...financeJournalKeys.all, "detail"] as const,
  detail: (id: string) => [...financeJournalKeys.details(), id] as const,
  trialBalance: (params?: { start_date?: string; end_date?: string }) =>
    [...financeJournalKeys.all, "trial-balance", params] as const,
  valuationRuns: () => [...financeJournalKeys.all, "valuation-runs"] as const,
  valuationRunList: (params?: ListValuationRunsParams) =>
    [...financeJournalKeys.valuationRuns(), "list", params] as const,
  valuationRunDetail: (id: string) =>
    [...financeJournalKeys.valuationRuns(), "detail", id] as const,
};

export function useFinanceJournals(params?: ListJournalEntriesParams) {
  return useQuery({
    queryKey: financeJournalKeys.list(params),
    queryFn: () => financeJournalsService.list(params),
  });
}

export function useFinanceSalesJournals(params?: ListJournalEntriesParams) {
  return useQuery({
    queryKey: financeJournalKeys.salesList(params),
    queryFn: () => financeJournalsService.listSales(params),
  });
}

export function useFinancePurchaseJournals(params?: ListJournalEntriesParams) {
  return useQuery({
    queryKey: financeJournalKeys.purchaseList(params),
    queryFn: () => financeJournalsService.listPurchase(params),
  });
}

export function useFinanceAdjustmentJournals(
  params?: ListJournalEntriesParams,
) {
  return useQuery({
    queryKey: financeJournalKeys.adjustmentList(params),
    queryFn: () => financeJournalsService.listAdjustment(params),
  });
}

export function useFinanceValuationJournals(params?: ListJournalEntriesParams) {
  return useQuery({
    queryKey: financeJournalKeys.valuationList(params),
    queryFn: () => financeJournalsService.listValuation(params),
  });
}

export function useFinanceCashBankSubLedger(
  params?: ListCashBankSubLedgerParams,
) {
  return useQuery({
    queryKey: financeJournalKeys.cashBankSubLedgerList(params),
    queryFn: () => financeJournalsService.listCashBankSubLedger(params),
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
    mutationFn: (data: CreateJournalEntryInput) =>
      financeJournalsService.create(data),
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
      queryClient.invalidateQueries({
        queryKey: financeJournalKeys.detail(id),
      });
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
      queryClient.invalidateQueries({
        queryKey: financeJournalKeys.detail(id),
      });
    },
  });
}

export function useReverseFinanceJournal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => financeJournalsService.reverse(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: financeJournalKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: financeJournalKeys.detail(id),
      });
    },
  });
}

export function useCreateFinanceAdjustmentJournal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateJournalEntryInput) =>
      financeJournalsService.createAdjustment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeJournalKeys.lists() });
    },
  });
}

export function useUpdateFinanceAdjustmentJournal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateJournalEntryInput }) =>
      financeJournalsService.updateAdjustment(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: financeJournalKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: financeJournalKeys.detail(id),
      });
    },
  });
}

export function usePostFinanceAdjustmentJournal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => financeJournalsService.postAdjustment(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: financeJournalKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: financeJournalKeys.detail(id),
      });
    },
  });
}

export function useReverseFinanceAdjustmentJournal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => financeJournalsService.reverseAdjustment(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: financeJournalKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: financeJournalKeys.detail(id),
      });
    },
  });
}

export function useRunFinanceValuationJournal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RunValuationInput) =>
      financeJournalsService.runValuation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeJournalKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: financeJournalKeys.valuationRuns(),
      });
    },
  });
}

export function useValuationRuns(params?: ListValuationRunsParams) {
  return useQuery({
    queryKey: financeJournalKeys.valuationRunList(params),
    queryFn: () => financeJournalsService.listValuationRuns(params),
    staleTime: 30_000,
  });
}

export function useValuationRunDetail(id: string) {
  return useQuery({
    queryKey: financeJournalKeys.valuationRunDetail(id),
    queryFn: () => financeJournalsService.getValuationRun(id),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useTrialBalance(
  params?: { start_date?: string; end_date?: string },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: financeJournalKeys.trialBalance(params),
    queryFn: () => financeJournalsService.trialBalance(params),
    enabled: options?.enabled !== undefined ? options.enabled : true,
    staleTime: 60_000,
  });
}
