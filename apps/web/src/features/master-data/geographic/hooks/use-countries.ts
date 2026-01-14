"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { countryService } from "../services/geographic-service";
import type {
  ListGeographicParams,
  CreateCountryData,
  UpdateCountryData,
} from "../types";

// Query keys
export const countryKeys = {
  all: ["countries"] as const,
  lists: () => [...countryKeys.all, "list"] as const,
  list: (params?: ListGeographicParams) =>
    [...countryKeys.lists(), params] as const,
  details: () => [...countryKeys.all, "detail"] as const,
  detail: (id: string) => [...countryKeys.details(), id] as const,
};

// List countries hook
export function useCountries(params?: ListGeographicParams) {
  return useQuery({
    queryKey: countryKeys.list(params),
    queryFn: () => countryService.list(params),
  });
}

// Get country by ID hook
export function useCountry(id: string) {
  return useQuery({
    queryKey: countryKeys.detail(id),
    queryFn: () => countryService.getById(id),
    enabled: !!id,
  });
}

// Create country mutation
export function useCreateCountry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCountryData) => countryService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: countryKeys.lists() });
    },
  });
}

// Update country mutation
export function useUpdateCountry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCountryData }) =>
      countryService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: countryKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: countryKeys.detail(variables.id),
      });
    },
  });
}

// Delete country mutation
export function useDeleteCountry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => countryService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: countryKeys.lists() });
    },
  });
}
