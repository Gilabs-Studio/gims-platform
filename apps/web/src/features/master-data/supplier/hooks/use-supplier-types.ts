"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supplierTypeService } from "../services/supplier-service";
import type {
  SupplierType,
  CreateSupplierTypeData,
  UpdateSupplierTypeData,
  ListParams,
} from "../types";

// Query keys
export const supplierTypeKeys = {
  all: ["supplier-types"] as const,
  lists: () => [...supplierTypeKeys.all, "list"] as const,
  list: (params?: ListParams) => [...supplierTypeKeys.lists(), params] as const,
  details: () => [...supplierTypeKeys.all, "detail"] as const,
  detail: (id: string) => [...supplierTypeKeys.details(), id] as const,
};

// List hook
export function useSupplierTypes(params?: ListParams) {
  return useQuery({
    queryKey: supplierTypeKeys.list(params),
    queryFn: () => supplierTypeService.list(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get by ID hook
export function useSupplierType(id: string) {
  return useQuery({
    queryKey: supplierTypeKeys.detail(id),
    queryFn: () => supplierTypeService.getById(id),
    enabled: !!id,
  });
}

// Create hook
export function useCreateSupplierType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSupplierTypeData) =>
      supplierTypeService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierTypeKeys.lists() });
    },
  });
}

// Update hook
export function useUpdateSupplierType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateSupplierTypeData;
    }) => supplierTypeService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: supplierTypeKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: supplierTypeKeys.detail(variables.id),
      });
    },
  });
}

// Delete hook
export function useDeleteSupplierType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => supplierTypeService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierTypeKeys.lists() });
    },
  });
}
