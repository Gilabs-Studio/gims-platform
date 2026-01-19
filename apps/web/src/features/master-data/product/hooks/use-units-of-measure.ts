"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { unitOfMeasureService } from "../services/product-service";
import type { CreateUnitOfMeasureData, UpdateUnitOfMeasureData, LookupListParams } from "../types";

export const unitOfMeasureKeys = {
  all: ["units-of-measure"] as const,
  lists: () => [...unitOfMeasureKeys.all, "list"] as const,
  list: (params?: LookupListParams) => [...unitOfMeasureKeys.lists(), params] as const,
  details: () => [...unitOfMeasureKeys.all, "detail"] as const,
  detail: (id: string) => [...unitOfMeasureKeys.details(), id] as const,
};

export function useUnitsOfMeasure(params?: LookupListParams) {
  return useQuery({
    queryKey: unitOfMeasureKeys.list(params),
    queryFn: () => unitOfMeasureService.list(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUnitOfMeasure(id: string) {
  return useQuery({
    queryKey: unitOfMeasureKeys.detail(id),
    queryFn: () => unitOfMeasureService.getById(id),
    enabled: !!id,
  });
}

export function useCreateUnitOfMeasure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUnitOfMeasureData) => unitOfMeasureService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: unitOfMeasureKeys.lists() });
    },
  });
}

export function useUpdateUnitOfMeasure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUnitOfMeasureData }) =>
      unitOfMeasureService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: unitOfMeasureKeys.lists() });
      queryClient.invalidateQueries({ queryKey: unitOfMeasureKeys.detail(variables.id) });
    },
  });
}

export function useDeleteUnitOfMeasure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unitOfMeasureService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: unitOfMeasureKeys.lists() });
    },
  });
}
