"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { financeClosingService } from "../services/finance-closing-service";
import type { CreateFinancialClosingInput, ListFinancialClosingParams } from "../types";

export const financeClosingKeys = {
  all: ["finance-closing"] as const,
  lists: () => [...financeClosingKeys.all, "list"] as const,
  list: (params?: ListFinancialClosingParams) => [...financeClosingKeys.lists(), params] as const,
  details: () => [...financeClosingKeys.all, "detail"] as const,
  detail: (id: string) => [...financeClosingKeys.details(), id] as const,
  analysis: (id: string) => [...financeClosingKeys.all, "analysis", id] as const,
};

export function useFinanceClosings(params?: ListFinancialClosingParams) {
  return useQuery({
    queryKey: financeClosingKeys.list(params),
    queryFn: () => financeClosingService.list(params),
  });
}

export function useCreateFinanceClosing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFinancialClosingInput) => financeClosingService.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeClosingKeys.lists() }),
  });
}

export function useApproveFinanceClosing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeClosingService.approve(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeClosingKeys.lists() }),
  });
}

export function useReopenFinanceClosing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeClosingService.reopen(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: financeClosingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: financeClosingKeys.detail(id) });
    },
  });
}

export function useYearEndClose() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fiscalYear: number) => financeClosingService.yearEndClose(fiscalYear),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeClosingKeys.lists() }),
  });
}

export function useFinanceClosingAnalysis(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: financeClosingKeys.analysis(id),
    queryFn: () => financeClosingService.getAnalysis(id),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}

export function useDeleteFinanceClosing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeClosingService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeClosingKeys.lists() }),
  });
}
