"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cityService } from "../services/geographic-service";
import type {
  ListCitiesParams,
  CreateCityData,
  UpdateCityData,
} from "../types";

// Query keys
export const cityKeys = {
  all: ["cities"] as const,
  lists: () => [...cityKeys.all, "list"] as const,
  list: (params?: ListCitiesParams) => [...cityKeys.lists(), params] as const,
  details: () => [...cityKeys.all, "detail"] as const,
  detail: (id: string) => [...cityKeys.details(), id] as const,
};

// List cities hook with province filter
export function useCities(params?: ListCitiesParams) {
  return useQuery({
    queryKey: cityKeys.list(params),
    queryFn: () => cityService.list(params),
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

// Create city mutation
export function useCreateCity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCityData) => cityService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cityKeys.lists() });
    },
  });
}

// Update city mutation
export function useUpdateCity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCityData }) =>
      cityService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: cityKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: cityKeys.detail(variables.id),
      });
    },
  });
}

// Delete city mutation
export function useDeleteCity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cityService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cityKeys.lists() });
    },
  });
}
