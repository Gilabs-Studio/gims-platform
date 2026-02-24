"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productBrandService } from "../services/product-service";
import type { CreateProductBrandData, UpdateProductBrandData, LookupListParams, ProductBrand, ApiResponse } from "../types";

export const productBrandKeys = {
  all: ["product-brands"] as const,
  lists: () => [...productBrandKeys.all, "list"] as const,
  list: (params?: LookupListParams) => [...productBrandKeys.lists(), params] as const,
  details: () => [...productBrandKeys.all, "detail"] as const,
  detail: (id: string) => [...productBrandKeys.details(), id] as const,
};

export function useProductBrands(params?: LookupListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: productBrandKeys.list(params),
    queryFn: () => productBrandService.list(params),
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useProductBrand(id: string) {
  return useQuery({
    queryKey: productBrandKeys.detail(id),
    queryFn: () => productBrandService.getById(id),
    enabled: !!id,
  });
}

export function useCreateProductBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProductBrandData) => productBrandService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productBrandKeys.lists() });
    },
  });
}

export function useUpdateProductBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductBrandData }) =>
      productBrandService.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: productBrandKeys.lists() });
      queryClient.setQueriesData({ queryKey: productBrandKeys.lists() }, (old: ApiResponse<ProductBrand[]> | undefined) => {
        if (!old?.data) return old;
        return { ...old, data: old.data.map((item: ProductBrand) => item.id === id ? { ...item, ...data } : item) };
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: productBrandKeys.detail(variables.id) });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: productBrandKeys.lists() });
    },
  });
}

export function useDeleteProductBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productBrandService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productBrandKeys.lists() });
    },
  });
}
