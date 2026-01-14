"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { districtService } from "../services/geographic-service";
import type {
  ListDistrictsParams,
  CreateDistrictData,
  UpdateDistrictData,
} from "../types";

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
export function useDistricts(params?: ListDistrictsParams) {
  return useQuery({
    queryKey: districtKeys.list(params),
    queryFn: () => districtService.list(params),
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

// Create district mutation
export function useCreateDistrict() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDistrictData) => districtService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: districtKeys.lists() });
    },
  });
}

// Update district mutation
export function useUpdateDistrict() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDistrictData }) =>
      districtService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: districtKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: districtKeys.detail(variables.id),
      });
    },
  });
}

// Delete district mutation
export function useDeleteDistrict() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => districtService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: districtKeys.lists() });
    },
  });
}
