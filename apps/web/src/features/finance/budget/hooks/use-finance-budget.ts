"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { financeBudgetService } from "../services/finance-budget-service";
import type { BudgetInput, ListBudgetsParams } from "../types";

export const financeBudgetKeys = {
  all: ["finance-budget"] as const,
  lists: () => [...financeBudgetKeys.all, "list"] as const,
  list: (params?: ListBudgetsParams) => [...financeBudgetKeys.lists(), params] as const,
  details: () => [...financeBudgetKeys.all, "detail"] as const,
  detail: (id: string) => [...financeBudgetKeys.details(), id] as const,
};

export function useFinanceBudgets(params?: ListBudgetsParams) {
  return useQuery({
    queryKey: financeBudgetKeys.list(params),
    queryFn: () => financeBudgetService.list(params),
  });
}

export function useFinanceBudget(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: financeBudgetKeys.detail(id),
    queryFn: () => financeBudgetService.getById(id),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}

export function useCreateFinanceBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BudgetInput) => financeBudgetService.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeBudgetKeys.lists() }),
  });
}

export function useUpdateFinanceBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: BudgetInput }) => financeBudgetService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: financeBudgetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: financeBudgetKeys.detail(id) });
    },
  });
}

export function useDeleteFinanceBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeBudgetService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeBudgetKeys.lists() }),
  });
}

export function useApproveFinanceBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeBudgetService.approve(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: financeBudgetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: financeBudgetKeys.detail(id) });
    },
  });
}
