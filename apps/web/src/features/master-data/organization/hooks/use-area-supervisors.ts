"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { areaSupervisorService } from "../services/organization-service";
import type {
  ListOrganizationParams,
  CreateAreaSupervisorData,
  UpdateAreaSupervisorData,
  AssignAreasData,
} from "../types";

export const areaSupervisorKeys = {
  all: ["areaSupervisors"] as const,
  lists: () => [...areaSupervisorKeys.all, "list"] as const,
  list: (params?: ListOrganizationParams) =>
    [...areaSupervisorKeys.lists(), params] as const,
  details: () => [...areaSupervisorKeys.all, "detail"] as const,
  detail: (id: string) => [...areaSupervisorKeys.details(), id] as const,
};

export function useAreaSupervisors(params?: ListOrganizationParams) {
  return useQuery({
    queryKey: areaSupervisorKeys.list(params),
    queryFn: () => areaSupervisorService.list(params),
  });
}

export function useAreaSupervisor(id: string) {
  return useQuery({
    queryKey: areaSupervisorKeys.detail(id),
    queryFn: () => areaSupervisorService.getById(id),
    enabled: !!id,
  });
}

export function useCreateAreaSupervisor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAreaSupervisorData) =>
      areaSupervisorService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: areaSupervisorKeys.lists() });
    },
  });
}

export function useUpdateAreaSupervisor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAreaSupervisorData }) =>
      areaSupervisorService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: areaSupervisorKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: areaSupervisorKeys.detail(variables.id),
      });
    },
  });
}

export function useDeleteAreaSupervisor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => areaSupervisorService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: areaSupervisorKeys.lists() });
    },
  });
}

// Assign areas to supervisor
export function useAssignAreas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AssignAreasData }) =>
      areaSupervisorService.assignAreas(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: areaSupervisorKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: areaSupervisorKeys.detail(variables.id),
      });
    },
  });
}
