"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productCategoryService } from "../services/product-service";
import type { CreateProductCategoryData, UpdateProductCategoryData, LookupListParams } from "../types";

export const productCategoryKeys = {
  all: ["product-categories"] as const,
  lists: () => [...productCategoryKeys.all, "list"] as const,
  list: (params?: LookupListParams) => [...productCategoryKeys.lists(), params] as const,
  details: () => [...productCategoryKeys.all, "detail"] as const,
  detail: (id: string) => [...productCategoryKeys.details(), id] as const,
};

export function useProductCategories(params?: LookupListParams) {
  return useQuery({
    queryKey: productCategoryKeys.list(params),
    queryFn: () => productCategoryService.list(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useProductCategory(id: string) {
  return useQuery({
    queryKey: productCategoryKeys.detail(id),
    queryFn: () => productCategoryService.getById(id),
    enabled: !!id,
  });
}

export function useCreateProductCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProductCategoryData) => productCategoryService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productCategoryKeys.lists() });
    },
  });
}

export function useUpdateProductCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductCategoryData }) =>
      productCategoryService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: productCategoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productCategoryKeys.detail(variables.id) });
    },
  });
}

export function useDeleteProductCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productCategoryService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productCategoryKeys.lists() });
    },
  });
}
