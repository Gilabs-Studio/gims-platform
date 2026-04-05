"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { floorLayoutService } from "../services/floor-layout-service";
import type {
  ListFloorPlanParams,
  CreateFloorPlanData,
  UpdateFloorPlanData,
} from "../types";

export const floorLayoutKeys = {
  all: ["floor-layouts"] as const,
  lists: () => [...floorLayoutKeys.all, "list"] as const,
  list: (params?: ListFloorPlanParams) =>
    [...floorLayoutKeys.lists(), params] as const,
  details: () => [...floorLayoutKeys.all, "detail"] as const,
  detail: (id: string) => [...floorLayoutKeys.details(), id] as const,
  versions: (id: string) =>
    [...floorLayoutKeys.all, "versions", id] as const,
  formData: () => [...floorLayoutKeys.all, "form-data"] as const,
};

export function useFloorLayouts(
  params?: ListFloorPlanParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: floorLayoutKeys.list(params),
    queryFn: () => floorLayoutService.list(params),
    enabled: options?.enabled !== false,
  });
}

export function useFloorLayout(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: floorLayoutKeys.detail(id),
    queryFn: () => floorLayoutService.getById(id),
    enabled: !!id && options?.enabled !== false,
  });
}

export function useFloorLayoutFormData() {
  return useQuery({
    queryKey: floorLayoutKeys.formData(),
    queryFn: () => floorLayoutService.getFormData(),
  });
}

export function useFloorLayoutVersions(
  id: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: floorLayoutKeys.versions(id),
    queryFn: () => floorLayoutService.listVersions(id),
    enabled: !!id && options?.enabled !== false,
  });
}

export function useCreateFloorLayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFloorPlanData) =>
      floorLayoutService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: floorLayoutKeys.lists(),
      });
    },
  });
}

export function useUpdateFloorLayout(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateFloorPlanData) =>
      floorLayoutService.update(id, data),
    onSuccess: (data) => {
      queryClient.setQueryData(floorLayoutKeys.detail(id), data);
      queryClient.invalidateQueries({
        queryKey: floorLayoutKeys.lists(),
      });
    },
  });
}

export function useSaveLayoutData(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (layoutData: string) =>
      floorLayoutService.saveLayoutData(id, layoutData),
    onSuccess: (data) => {
      queryClient.setQueryData(floorLayoutKeys.detail(id), data);
    },
  });
}

export function useDeleteFloorLayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => floorLayoutService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: floorLayoutKeys.lists(),
      });
    },
  });
}

export function usePublishFloorLayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => floorLayoutService.publish(id),
    onSuccess: (data) => {
      const id = data.data.id;
      queryClient.setQueryData(floorLayoutKeys.detail(id), data);
      queryClient.invalidateQueries({
        queryKey: floorLayoutKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: floorLayoutKeys.versions(id),
      });
    },
  });
}
