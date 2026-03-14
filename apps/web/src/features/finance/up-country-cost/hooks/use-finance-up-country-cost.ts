"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { financeUpCountryCostService } from "../services/finance-up-country-cost-service";
import type { ListUpCountryCostParams, UpCountryCostInput } from "../types";

export const financeUpCountryCostKeys = {
  all: ["finance-up-country-cost"] as const,
  lists: () => [...financeUpCountryCostKeys.all, "list"] as const,
  list: (params?: ListUpCountryCostParams) => [...financeUpCountryCostKeys.lists(), params] as const,
  detail: (id: string) => [...financeUpCountryCostKeys.all, "detail", id] as const,
  stats: () => [...financeUpCountryCostKeys.all, "stats"] as const,
};

export function useFinanceUpCountryCostList(params?: ListUpCountryCostParams) {
  return useQuery({
    queryKey: financeUpCountryCostKeys.list(params),
    queryFn: () => financeUpCountryCostService.list(params),
  });
}

export function useFinanceUpCountryCost(id: string, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: financeUpCountryCostKeys.detail(id),
    queryFn: () => financeUpCountryCostService.getById(id),
    enabled: opts?.enabled ?? !!id,
  });
}

export function useFinanceUpCountryCostStats() {
  return useQuery({
    queryKey: financeUpCountryCostKeys.stats(),
    queryFn: () => financeUpCountryCostService.getStats(),
  });
}

export function useCreateFinanceUpCountryCost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpCountryCostInput) => financeUpCountryCostService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeUpCountryCostKeys.lists() });
      queryClient.invalidateQueries({ queryKey: financeUpCountryCostKeys.stats() });
    },
  });
}

export function useUpdateFinanceUpCountryCost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpCountryCostInput }) =>
      financeUpCountryCostService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: financeUpCountryCostKeys.lists() });
      queryClient.invalidateQueries({ queryKey: financeUpCountryCostKeys.detail(id) });
    },
  });
}

export function useDeleteFinanceUpCountryCost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeUpCountryCostService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeUpCountryCostKeys.lists() });
      queryClient.invalidateQueries({ queryKey: financeUpCountryCostKeys.stats() });
    },
  });
}

export function useSubmitFinanceUpCountryCost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeUpCountryCostService.submit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeUpCountryCostKeys.lists() });
      queryClient.invalidateQueries({ queryKey: financeUpCountryCostKeys.stats() });
    },
  });
}

export function useManagerApproveFinanceUpCountryCost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeUpCountryCostService.managerApprove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeUpCountryCostKeys.lists() });
      queryClient.invalidateQueries({ queryKey: financeUpCountryCostKeys.stats() });
    },
  });
}

export function useManagerRejectFinanceUpCountryCost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) =>
      financeUpCountryCostService.managerReject(id, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeUpCountryCostKeys.lists() });
      queryClient.invalidateQueries({ queryKey: financeUpCountryCostKeys.stats() });
    },
  });
}

export function useFinanceApproveUpCountryCost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeUpCountryCostService.financeApprove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeUpCountryCostKeys.lists() });
      queryClient.invalidateQueries({ queryKey: financeUpCountryCostKeys.stats() });
    },
  });
}

export function useMarkPaidFinanceUpCountryCost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeUpCountryCostService.markPaid(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeUpCountryCostKeys.lists() });
      queryClient.invalidateQueries({ queryKey: financeUpCountryCostKeys.stats() });
    },
  });
}

export function useApproveFinanceUpCountryCost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeUpCountryCostService.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeUpCountryCostKeys.lists() });
      queryClient.invalidateQueries({ queryKey: financeUpCountryCostKeys.stats() });
    },
  });
}
