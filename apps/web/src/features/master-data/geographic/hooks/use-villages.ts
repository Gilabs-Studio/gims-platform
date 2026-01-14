"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { villageService } from "../services/geographic-service";
import type {
  ListVillagesParams,
  CreateVillageData,
  UpdateVillageData,
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
export function useVillages(params?: ListVillagesParams) {
  return useQuery({
    queryKey: villageKeys.list(params),
    queryFn: () => villageService.list(params),
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: villageKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: villageKeys.detail(variables.id),
      });
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
