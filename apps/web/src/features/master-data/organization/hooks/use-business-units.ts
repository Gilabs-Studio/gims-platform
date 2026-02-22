"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { businessUnitService } from "../services/organization-service";
import type {
  ListOrganizationParams,
  CreateBusinessUnitData,
  UpdateBusinessUnitData,
  BusinessUnit,
  OrganizationListResponse,
} from "../types";

export const businessUnitKeys = {
  all: ["businessUnits"] as const,
  lists: () => [...businessUnitKeys.all, "list"] as const,
  list: (params?: ListOrganizationParams) =>
    [...businessUnitKeys.lists(), params] as const,
  details: () => [...businessUnitKeys.all, "detail"] as const,
  detail: (id: string) => [...businessUnitKeys.details(), id] as const,
};

export function useBusinessUnits(params?: ListOrganizationParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: businessUnitKeys.list(params),
    queryFn: () => businessUnitService.list(params),
    enabled: options?.enabled ?? true,
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
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: businessUnitKeys.lists() });
      queryClient.setQueriesData(
        { queryKey: businessUnitKeys.lists() },
        (old: OrganizationListResponse<BusinessUnit> | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((item: BusinessUnit) =>
              item.id === id ? { ...item, ...data } : item
            ),
          };
        }
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: businessUnitKeys.detail(variables.id),
      });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: businessUnitKeys.lists() });
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
