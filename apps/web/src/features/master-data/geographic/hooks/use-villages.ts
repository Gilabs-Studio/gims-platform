"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { villageService } from "../services/geographic-service";
import type {
  ListVillagesParams,
  CreateVillageData,
  UpdateVillageData,
  Village,
  GeographicListResponse,
} from "../types";

// Query keys
export const villageKeys = {
  all: ["villages"] as const,
  lists: () => [...villageKeys.all, "list"] as const,
  list: (params?: ListVillagesParams) =>
    [...villageKeys.lists(), params] as const,
  details: () => [...villageKeys.all, "detail"] as const,
  detail: (id: string) => [...villageKeys.details(), id] as const,
};

// List villages hook with district filter
export function useVillages(params?: ListVillagesParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: villageKeys.list(params),
    queryFn: () => villageService.list(params),
    ...options,
  });
}

// Get village by ID hook
export function useVillage(id: string) {
  return useQuery({
    queryKey: villageKeys.detail(id),
    queryFn: () => villageService.getById(id),
    enabled: !!id,
  });
}

// Create village mutation
export function useCreateVillage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateVillageData) => villageService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: villageKeys.lists() });
    },
  });
}

// Update village mutation
export function useUpdateVillage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateVillageData }) =>
      villageService.update(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: villageKeys.lists() });

      // Update all list caches optimistically
      queryClient.setQueriesData(
        { queryKey: villageKeys.lists() },
        (old: GeographicListResponse<Village> | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((village: Village) =>
              village.id === id ? { ...village, ...data } : village
            ),
          };
        }
      );
    },
    onSuccess: (_, variables) => {
      // Only invalidate detail query if exists
      queryClient.invalidateQueries({
        queryKey: villageKeys.detail(variables.id),
      });
    },
    onError: () => {
      // Refetch on error to revert optimistic update
      queryClient.invalidateQueries({ queryKey: villageKeys.lists() });
    },
  });
}

// Delete village mutation
export function useDeleteVillage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => villageService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: villageKeys.lists() });
    },
  });
}
