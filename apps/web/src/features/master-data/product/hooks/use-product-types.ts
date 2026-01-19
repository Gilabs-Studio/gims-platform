"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productTypeService } from "../services/product-service";
import type { CreateProductTypeData, UpdateProductTypeData, LookupListParams } from "../types";

export const productTypeKeys = {
  all: ["product-types"] as const,
  lists: () => [...productTypeKeys.all, "list"] as const,
  list: (params?: LookupListParams) => [...productTypeKeys.lists(), params] as const,
  details: () => [...productTypeKeys.all, "detail"] as const,
  detail: (id: string) => [...productTypeKeys.details(), id] as const,
};

export function useProductTypes(params?: LookupListParams) {
  return useQuery({
    queryKey: productTypeKeys.list(params),
    queryFn: () => productTypeService.list(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useProductType(id: string) {
  return useQuery({
    queryKey: productTypeKeys.detail(id),
    queryFn: () => productTypeService.getById(id),
    enabled: !!id,
  });
}

export function useCreateProductType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProductTypeData) => productTypeService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productTypeKeys.lists() });
    },
  });
}

export function useUpdateProductType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductTypeData }) =>
      productTypeService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: productTypeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productTypeKeys.detail(variables.id) });
    },
  });
}

export function useDeleteProductType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productTypeService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productTypeKeys.lists() });
    },
  });
}
