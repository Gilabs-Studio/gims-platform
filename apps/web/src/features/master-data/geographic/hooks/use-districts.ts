"use client";

import { useQuery } from "@tanstack/react-query";
import { districtService } from "../services/geographic-service";
import type { ListDistrictsParams } from "../types";

// Query keys
export const districtKeys = {
  all: ["districts"] as const,
  lists: () => [...districtKeys.all, "list"] as const,
  list: (params?: ListDistrictsParams) =>
    [...districtKeys.lists(), params] as const,
  details: () => [...districtKeys.all, "detail"] as const,
  detail: (id: string) => [...districtKeys.details(), id] as const,
};

// List districts hook with city filter
export function useDistricts(params?: ListDistrictsParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: districtKeys.list(params),
    queryFn: () => districtService.list(params),
    ...options,
  });
}

// Get district by ID hook
export function useDistrict(id: string) {
  return useQuery({
    queryKey: districtKeys.detail(id),
    queryFn: () => districtService.getById(id),
    enabled: !!id,
  });
}
