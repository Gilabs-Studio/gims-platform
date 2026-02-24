"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { packagingService } from "../services/product-service";
import type { CreatePackagingData, UpdatePackagingData, LookupListParams, Packaging, ApiResponse } from "../types";

export const packagingKeys = {
  all: ["packagings"] as const,
  lists: () => [...packagingKeys.all, "list"] as const,
  list: (params?: LookupListParams) => [...packagingKeys.lists(), params] as const,
  details: () => [...packagingKeys.all, "detail"] as const,
  detail: (id: string) => [...packagingKeys.details(), id] as const,
};

export function usePackagings(params?: LookupListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: packagingKeys.list(params),
    queryFn: () => packagingService.list(params),
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function usePackaging(id: string) {
  return useQuery({
    queryKey: packagingKeys.detail(id),
    queryFn: () => packagingService.getById(id),
    enabled: !!id,
  });
}

export function useCreatePackaging() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePackagingData) => packagingService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: packagingKeys.lists() });
    },
  });
}

export function useUpdatePackaging() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePackagingData }) =>
      packagingService.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: packagingKeys.lists() });
      queryClient.setQueriesData({ queryKey: packagingKeys.lists() }, (old: ApiResponse<Packaging[]> | undefined) => {
        if (!old?.data) return old;
        return { ...old, data: old.data.map((item: Packaging) => item.id === id ? { ...item, ...data } : item) };
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: packagingKeys.detail(variables.id) });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: packagingKeys.lists() });
    },
  });
}

export function useDeletePackaging() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => packagingService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: packagingKeys.lists() });
    },
  });
}
