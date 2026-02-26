"use client";

import { useQuery } from "@tanstack/react-query";
import { villageService } from "../services/geographic-service";
import type { ListVillagesParams } from "../types";

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
