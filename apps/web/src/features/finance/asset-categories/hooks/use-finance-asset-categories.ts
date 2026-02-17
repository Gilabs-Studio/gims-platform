"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { financeAssetCategoriesService } from "../services/finance-asset-categories-service";
import type { AssetCategoryInput, ListAssetCategoryParams } from "../types";

export const financeAssetCategoryKeys = {
  all: ["finance-asset-categories"] as const,
  lists: () => [...financeAssetCategoryKeys.all, "list"] as const,
  list: (params?: ListAssetCategoryParams) => [...financeAssetCategoryKeys.lists(), params] as const,
  details: () => [...financeAssetCategoryKeys.all, "detail"] as const,
  detail: (id: string) => [...financeAssetCategoryKeys.details(), id] as const,
};

export function useFinanceAssetCategories(params?: ListAssetCategoryParams) {
  return useQuery({
    queryKey: financeAssetCategoryKeys.list(params),
    queryFn: () => financeAssetCategoriesService.list(params),
  });
}

export function useFinanceAssetCategory(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: financeAssetCategoryKeys.detail(id),
    queryFn: () => financeAssetCategoriesService.getById(id),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}

export function useCreateFinanceAssetCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AssetCategoryInput) => financeAssetCategoriesService.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeAssetCategoryKeys.lists() }),
  });
}

export function useUpdateFinanceAssetCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AssetCategoryInput }) =>
      financeAssetCategoriesService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: financeAssetCategoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: financeAssetCategoryKeys.detail(id) });
    },
  });
}

export function useDeleteFinanceAssetCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeAssetCategoriesService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeAssetCategoryKeys.lists() }),
  });
}
