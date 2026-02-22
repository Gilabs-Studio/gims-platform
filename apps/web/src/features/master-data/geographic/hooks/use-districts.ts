"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { districtService } from "../services/geographic-service";
import type {
  ListDistrictsParams,
  CreateDistrictData,
  UpdateDistrictData,
  District,
  GeographicListResponse,
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
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: districtKeys.lists() });

      // Update all list caches optimistically
      queryClient.setQueriesData(
        { queryKey: districtKeys.lists() },
        (old: GeographicListResponse<District> | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((district: District) =>
              district.id === id ? { ...district, ...data } : district
            ),
          };
        }
      );
    },
    onSuccess: (_, variables) => {
      // Only invalidate detail query if exists
      queryClient.invalidateQueries({
        queryKey: districtKeys.detail(variables.id),
      });
    },
    onError: () => {
      // Refetch on error to revert optimistic update
      queryClient.invalidateQueries({ queryKey: districtKeys.lists() });
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
