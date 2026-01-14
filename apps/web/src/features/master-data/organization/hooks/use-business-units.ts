"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { businessUnitService } from "../services/organization-service";
import type {
  ListOrganizationParams,
  CreateBusinessUnitData,
  UpdateBusinessUnitData,
} from "../types";

export const businessUnitKeys = {
  all: ["businessUnits"] as const,
  lists: () => [...businessUnitKeys.all, "list"] as const,
  list: (params?: ListOrganizationParams) =>
    [...businessUnitKeys.lists(), params] as const,
  details: () => [...businessUnitKeys.all, "detail"] as const,
  detail: (id: string) => [...businessUnitKeys.details(), id] as const,
};

export function useBusinessUnits(params?: ListOrganizationParams) {
  return useQuery({
    queryKey: businessUnitKeys.list(params),
    queryFn: () => businessUnitService.list(params),
  });
}

export function useBusinessUnit(id: string) {
  return useQuery({
    queryKey: businessUnitKeys.detail(id),
    queryFn: () => businessUnitService.getById(id),
    enabled: !!id,
  });
}

export function useCreateBusinessUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBusinessUnitData) => businessUnitService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: businessUnitKeys.lists() });
    },
  });
}

export function useUpdateBusinessUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBusinessUnitData }) =>
      businessUnitService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: businessUnitKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: businessUnitKeys.detail(variables.id),
      });
    },
  });
}

export function useDeleteBusinessUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => businessUnitService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: businessUnitKeys.lists() });
    },
  });
}
