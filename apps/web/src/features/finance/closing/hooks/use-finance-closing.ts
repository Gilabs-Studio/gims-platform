"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { financeClosingService } from "../services/finance-closing-service";
import type { CreateFinancialClosingInput, ListFinancialClosingParams } from "../types";

export const financeClosingKeys = {
  all: ["finance-closing"] as const,
  lists: () => [...financeClosingKeys.all, "list"] as const,
  list: (params?: ListFinancialClosingParams) => [...financeClosingKeys.lists(), params] as const,
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
