"use client";

import { useQuery } from "@tanstack/react-query";
import { provinceService } from "../services/geographic-service";
import type { ListProvincesParams } from "../types";

// Query keys
export const provinceKeys = {
  all: ["provinces"] as const,
  lists: () => [...provinceKeys.all, "list"] as const,
  list: (params?: ListProvincesParams) =>
    [...provinceKeys.lists(), params] as const,
  details: () => [...provinceKeys.all, "detail"] as const,
  detail: (id: string) => [...provinceKeys.details(), id] as const,
};

// List provinces hook with country filter
export function useProvinces(params?: ListProvincesParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: provinceKeys.list(params),
    queryFn: () => provinceService.list(params),
    ...options,
  });
}

// Get province by ID hook
export function useProvince(id: string) {
  return useQuery({
    queryKey: provinceKeys.detail(id),
    queryFn: () => provinceService.getById(id),
    enabled: !!id,
  });
}
