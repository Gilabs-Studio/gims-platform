"use client";

import { useQuery } from "@tanstack/react-query";
import { countryService } from "../services/geographic-service";
import type { ListGeographicParams } from "../types";

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
