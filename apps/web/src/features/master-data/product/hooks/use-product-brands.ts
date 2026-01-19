"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productBrandService } from "../services/product-service";
import type { CreateProductBrandData, UpdateProductBrandData, LookupListParams } from "../types";

export const productBrandKeys = {
  all: ["product-brands"] as const,
  lists: () => [...productBrandKeys.all, "list"] as const,
  list: (params?: LookupListParams) => [...productBrandKeys.lists(), params] as const,
  details: () => [...productBrandKeys.all, "detail"] as const,
  detail: (id: string) => [...productBrandKeys.details(), id] as const,
};

export function useProductBrands(params?: LookupListParams) {
  return useQuery({
    queryKey: productBrandKeys.list(params),
    queryFn: () => productBrandService.list(params),
    staleTime: 5 * 60 * 1000,
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: productBrandKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productBrandKeys.detail(variables.id) });
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
