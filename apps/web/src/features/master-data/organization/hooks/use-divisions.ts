"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { divisionService } from "../services/organization-service";
import type {
  ListOrganizationParams,
  CreateDivisionData,
  UpdateDivisionData,
} from "../types";

// Query keys
export const divisionKeys = {
  all: ["divisions"] as const,
  lists: () => [...divisionKeys.all, "list"] as const,
  list: (params?: ListOrganizationParams) =>
    [...divisionKeys.lists(), params] as const,
  details: () => [...divisionKeys.all, "detail"] as const,
  detail: (id: string) => [...divisionKeys.details(), id] as const,
};

// List divisions hook
export function useDivisions(params?: ListOrganizationParams) {
  return useQuery({
    queryKey: divisionKeys.list(params),
    queryFn: () => divisionService.list(params),
  });
}

// Get division by ID hook
export function useDivision(id: string) {
  return useQuery({
    queryKey: divisionKeys.detail(id),
    queryFn: () => divisionService.getById(id),
    enabled: !!id,
  });
}

// Create division mutation
export function useCreateDivision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDivisionData) => divisionService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: divisionKeys.lists() });
    },
  });
}

// Update division mutation
export function useUpdateDivision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDivisionData }) =>
      divisionService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: divisionKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: divisionKeys.detail(variables.id),
      });
    },
  });
}

// Delete division mutation
export function useDeleteDivision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => divisionService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: divisionKeys.lists() });
    },
  });
}
