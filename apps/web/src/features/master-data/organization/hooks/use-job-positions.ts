"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { jobPositionService } from "../services/organization-service";
import type {
  ListOrganizationParams,
  CreateJobPositionData,
  UpdateJobPositionData,
  JobPosition,
  OrganizationListResponse,
} from "../types";

export const jobPositionKeys = {
  all: ["jobPositions"] as const,
  lists: () => [...jobPositionKeys.all, "list"] as const,
  list: (params?: ListOrganizationParams) =>
    [...jobPositionKeys.lists(), params] as const,
  details: () => [...jobPositionKeys.all, "detail"] as const,
  detail: (id: string) => [...jobPositionKeys.details(), id] as const,
};

export function useJobPositions(params?: ListOrganizationParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: jobPositionKeys.list(params),
    queryFn: () => jobPositionService.list(params),
    ...options,
  });
}

export function useJobPosition(id: string) {
  return useQuery({
    queryKey: jobPositionKeys.detail(id),
    queryFn: () => jobPositionService.getById(id),
    enabled: !!id,
  });
}

export function useCreateJobPosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateJobPositionData) => jobPositionService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobPositionKeys.lists() });
    },
  });
}

export function useUpdateJobPosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateJobPositionData }) =>
      jobPositionService.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: jobPositionKeys.lists() });
      queryClient.setQueriesData(
        { queryKey: jobPositionKeys.lists() },
        (old: OrganizationListResponse<JobPosition> | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((item: JobPosition) =>
              item.id === id ? { ...item, ...data } : item
            ),
          };
        }
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: jobPositionKeys.detail(variables.id),
      });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: jobPositionKeys.lists() });
    },
  });
}

export function useDeleteJobPosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => jobPositionService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobPositionKeys.lists() });
    },
  });
}
