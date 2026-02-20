"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { financeCoaService } from "../services/finance-coa-service";
import type { CreateChartOfAccountInput, UpdateChartOfAccountInput } from "../types";

export const financeCoaKeys = {
  all: ["finance-coa"] as const,
  tree: (params?: { only_active?: boolean }) => [...financeCoaKeys.all, "tree", params] as const,
  lists: () => [...financeCoaKeys.all, "list"] as const,
};

export function useFinanceCoaTree(params?: { only_active?: boolean }) {
  return useQuery({
    queryKey: financeCoaKeys.tree(params),
    queryFn: () => financeCoaService.tree(params),
    staleTime: 60_000,
  });
}

export function useCreateFinanceCoa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateChartOfAccountInput) => financeCoaService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeCoaKeys.all });
    },
  });
}

export function useUpdateFinanceCoa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateChartOfAccountInput }) =>
      financeCoaService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeCoaKeys.all });
    },
  });
}

export function useDeleteFinanceCoa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => financeCoaService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeCoaKeys.all });
    },
  });
}
