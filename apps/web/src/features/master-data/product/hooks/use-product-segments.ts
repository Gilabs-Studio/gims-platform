"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productSegmentService } from "../services/product-service";
import type { CreateProductSegmentData, UpdateProductSegmentData, LookupListParams, ProductSegment, ApiResponse } from "../types";

export const productSegmentKeys = {
  all: ["product-segments"] as const,
  lists: () => [...productSegmentKeys.all, "list"] as const,
  list: (params?: LookupListParams) => [...productSegmentKeys.lists(), params] as const,
  details: () => [...productSegmentKeys.all, "detail"] as const,
  detail: (id: string) => [...productSegmentKeys.details(), id] as const,
};

export function useProductSegments(params?: LookupListParams) {
  return useQuery({
    queryKey: productSegmentKeys.list(params),
    queryFn: () => productSegmentService.list(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useProductSegment(id: string) {
  return useQuery({
    queryKey: productSegmentKeys.detail(id),
    queryFn: () => productSegmentService.getById(id),
    enabled: !!id,
  });
}

export function useCreateProductSegment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProductSegmentData) => productSegmentService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productSegmentKeys.lists() });
    },
  });
}

export function useUpdateProductSegment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductSegmentData }) =>
      productSegmentService.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: productSegmentKeys.lists() });
      queryClient.setQueriesData({ queryKey: productSegmentKeys.lists() }, (old: ApiResponse<ProductSegment[]> | undefined) => {
        if (!old?.data) return old;
        return { ...old, data: old.data.map((item: ProductSegment) => item.id === id ? { ...item, ...data } : item) };
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: productSegmentKeys.detail(variables.id) });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: productSegmentKeys.lists() });
    },
  });
}

export function useDeleteProductSegment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productSegmentService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productSegmentKeys.lists() });
    },
  });
}
