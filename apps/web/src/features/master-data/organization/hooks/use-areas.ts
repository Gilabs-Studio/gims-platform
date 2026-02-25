"use client";

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { areaService } from "../services/organization-service";
import type {
  ListAreasParams,
  CreateAreaData,
  UpdateAreaData,
  AssignAreaSupervisorsData,
  AssignAreaMembersData,
  Area,
  OrganizationListResponse,
} from "../types";

export const areaKeys = {
  all: ["areas"] as const,
  lists: () => [...areaKeys.all, "list"] as const,
  list: (params?: ListAreasParams) => [...areaKeys.lists(), params] as const,
  details: () => [...areaKeys.all, "detail"] as const,
  detail: (id: string) => [...areaKeys.details(), id] as const,
  formData: () => [...areaKeys.all, "form-data"] as const,
};

export function useAreas(
  params?: ListAreasParams,
  options?: Omit<UseQueryOptions<OrganizationListResponse<Area>, Error, OrganizationListResponse<Area>>, "queryKey" | "queryFn">
) {
  return useQuery<OrganizationListResponse<Area>, Error>({
    queryKey: areaKeys.list(params),
    queryFn: () => areaService.list(params),
    ...options,
  });
}

export function useArea(id: string) {
  return useQuery({
    queryKey: areaKeys.detail(id),
    queryFn: () => areaService.getById(id),
    enabled: !!id,
  });
}

export function useAreaDetail(id: string) {
  return useQuery({
    queryKey: [...areaKeys.detail(id), "full"],
    queryFn: () => areaService.getDetail(id),
    enabled: !!id,
  });
}

export function useCreateArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAreaData) => areaService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: areaKeys.lists() });
    },
  });
}

export function useUpdateArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAreaData }) =>
      areaService.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: areaKeys.lists() });
      queryClient.setQueriesData(
        { queryKey: areaKeys.lists() },
        (old: OrganizationListResponse<Area> | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((item: Area) =>
              item.id === id ? { ...item, ...data } : item
            ),
          };
        }
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: areaKeys.detail(variables.id),
      });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: areaKeys.lists() });
    },
  });
}

export function useDeleteArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => areaService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: areaKeys.lists() });
    },
  });
}

export function useAssignSupervisors() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      areaId,
      data,
    }: {
      areaId: string;
      data: AssignAreaSupervisorsData;
    }) => areaService.assignSupervisors(areaId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: areaKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: areaKeys.detail(variables.areaId),
      });
    },
  });
}

export function useAssignMembers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      areaId,
      data,
    }: {
      areaId: string;
      data: AssignAreaMembersData;
    }) => areaService.assignMembers(areaId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: areaKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: areaKeys.detail(variables.areaId),
      });
    },
  });
}

export function useRemoveAreaEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      areaId,
      employeeId,
    }: {
      areaId: string;
      employeeId: string;
    }) => areaService.removeEmployee(areaId, employeeId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: areaKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: areaKeys.detail(variables.areaId),
      });
    },
  });
}

export function useAreaFormData() {
  return useQuery({
    queryKey: areaKeys.formData(),
    queryFn: () => areaService.getFormData(),
    staleTime: 5 * 60 * 1000,
  });
}
