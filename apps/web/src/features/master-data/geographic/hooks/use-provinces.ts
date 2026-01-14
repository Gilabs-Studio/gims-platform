"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { provinceService } from "../services/geographic-service";
import type {
  ListProvincesParams,
  CreateProvinceData,
  UpdateProvinceData,
} from "../types";

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
export function useProvinces(params?: ListProvincesParams) {
  return useQuery({
    queryKey: provinceKeys.list(params),
    queryFn: () => provinceService.list(params),
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

// Create province mutation
export function useCreateProvince() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProvinceData) => provinceService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: provinceKeys.lists() });
    },
  });
}

// Update province mutation
export function useUpdateProvince() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProvinceData }) =>
      provinceService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: provinceKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: provinceKeys.detail(variables.id),
      });
    },
  });
}

// Delete province mutation
export function useDeleteProvince() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => provinceService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: provinceKeys.lists() });
    },
  });
}
