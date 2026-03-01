"use client";

import { useQuery } from "@tanstack/react-query";
import { cityService } from "../services/geographic-service";
import type { ListCitiesParams } from "../types";

// Query keys
export const cityKeys = {
  all: ["cities"] as const,
  lists: () => [...cityKeys.all, "list"] as const,
  list: (params?: ListCitiesParams) => [...cityKeys.lists(), params] as const,
  details: () => [...cityKeys.all, "detail"] as const,
  detail: (id: string) => [...cityKeys.details(), id] as const,
};

// List cities hook with province filter
export function useCities(params?: ListCitiesParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: cityKeys.list(params),
    queryFn: () => cityService.list(params),
    ...options,
  });
}

// Get city by ID hook
export function useCity(id: string) {
  return useQuery({
    queryKey: cityKeys.detail(id),
    queryFn: () => cityService.getById(id),
    enabled: !!id,
  });
}
