"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { businessTypeService } from "../services/organization-service";
import type {
  ListOrganizationParams,
  CreateBusinessTypeData,
  UpdateBusinessTypeData,
  BusinessType,
  OrganizationListResponse,
} from "../types";

export const businessTypeKeys = {
  all: ["businessTypes"] as const,
  lists: () => [...businessTypeKeys.all, "list"] as const,
  list: (params?: ListOrganizationParams) =>
    [...businessTypeKeys.lists(), params] as const,
  details: () => [...businessTypeKeys.all, "detail"] as const,
  detail: (id: string) => [...businessTypeKeys.details(), id] as const,
};

export function useBusinessTypes(params?: ListOrganizationParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: businessTypeKeys.list(params),
    queryFn: () => businessTypeService.list(params),
    enabled: options?.enabled ?? true,
  });
}

export function useBusinessType(id: string) {
  return useQuery({
    queryKey: businessTypeKeys.detail(id),
    queryFn: () => businessTypeService.getById(id),
    enabled: !!id,
  });
}

export function useCreateBusinessType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBusinessTypeData) => businessTypeService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: businessTypeKeys.lists() });
    },
  });
}

export function useUpdateBusinessType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBusinessTypeData }) =>
      businessTypeService.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: businessTypeKeys.lists() });
      queryClient.setQueriesData(
        { queryKey: businessTypeKeys.lists() },
        (old: OrganizationListResponse<BusinessType> | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((item: BusinessType) =>
              item.id === id ? { ...item, ...data } : item
            ),
          };
        }
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: businessTypeKeys.detail(variables.id),
      });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: businessTypeKeys.lists() });
    },
  });
}

export function useDeleteBusinessType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => businessTypeService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: businessTypeKeys.lists() });
    },
  });
}
