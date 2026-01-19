"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { procurementTypeService } from "../services/product-service";
import type { CreateProcurementTypeData, UpdateProcurementTypeData, LookupListParams } from "../types";

export const procurementTypeKeys = {
  all: ["procurement-types"] as const,
  lists: () => [...procurementTypeKeys.all, "list"] as const,
  list: (params?: LookupListParams) => [...procurementTypeKeys.lists(), params] as const,
  details: () => [...procurementTypeKeys.all, "detail"] as const,
  detail: (id: string) => [...procurementTypeKeys.details(), id] as const,
};

export function useProcurementTypes(params?: LookupListParams) {
  return useQuery({
    queryKey: procurementTypeKeys.list(params),
    queryFn: () => procurementTypeService.list(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useProcurementType(id: string) {
  return useQuery({
    queryKey: procurementTypeKeys.detail(id),
    queryFn: () => procurementTypeService.getById(id),
    enabled: !!id,
  });
}

export function useCreateProcurementType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProcurementTypeData) => procurementTypeService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: procurementTypeKeys.lists() });
    },
  });
}

export function useUpdateProcurementType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProcurementTypeData }) =>
      procurementTypeService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: procurementTypeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: procurementTypeKeys.detail(variables.id) });
    },
  });
}

export function useDeleteProcurementType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => procurementTypeService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: procurementTypeKeys.lists() });
    },
  });
}
