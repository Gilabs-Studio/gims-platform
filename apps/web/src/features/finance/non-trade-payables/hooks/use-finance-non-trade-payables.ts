"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { financeNonTradePayablesService } from "../services/finance-non-trade-payables-service";
import type { ListNonTradePayablesParams, NonTradePayableInput } from "../types";

export const financeNonTradePayableKeys = {
  all: ["finance-non-trade-payables"] as const,
  lists: () => [...financeNonTradePayableKeys.all, "list"] as const,
  list: (params?: ListNonTradePayablesParams) => [...financeNonTradePayableKeys.lists(), params] as const,
  details: () => [...financeNonTradePayableKeys.all, "detail"] as const,
  detail: (id: string) => [...financeNonTradePayableKeys.details(), id] as const,
};

export function useFinanceNonTradePayables(params?: ListNonTradePayablesParams) {
  return useQuery({
    queryKey: financeNonTradePayableKeys.list(params),
    queryFn: () => financeNonTradePayablesService.list(params),
  });
}

export function useCreateFinanceNonTradePayable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: NonTradePayableInput) => financeNonTradePayablesService.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeNonTradePayableKeys.lists() }),
  });
}

export function useUpdateFinanceNonTradePayable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: NonTradePayableInput }) =>
      financeNonTradePayablesService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: financeNonTradePayableKeys.lists() });
      queryClient.invalidateQueries({ queryKey: financeNonTradePayableKeys.detail(id) });
    },
  });
}

export function useDeleteFinanceNonTradePayable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeNonTradePayablesService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeNonTradePayableKeys.lists() }),
  });
}
