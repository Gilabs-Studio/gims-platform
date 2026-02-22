"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customerTypeService } from "../services/customer-service";
import type {
  CustomerType,
  CreateCustomerTypeData,
  UpdateCustomerTypeData,
  ListParams,
  CustomerListResponse,
} from "../types";

// Query keys factory
export const customerTypeKeys = {
  all: ["customer-types"] as const,
  lists: () => [...customerTypeKeys.all, "list"] as const,
  list: (params?: ListParams) =>
    [...customerTypeKeys.lists(), params] as const,
  details: () => [...customerTypeKeys.all, "detail"] as const,
  detail: (id: string) => [...customerTypeKeys.details(), id] as const,
};

// === List Hook ===
export function useCustomerTypes(params?: ListParams) {
  return useQuery({
    queryKey: customerTypeKeys.list(params),
    queryFn: () => customerTypeService.list(params),
    staleTime: 5 * 60 * 1000,
  });
}

// === Detail Hook ===
export function useCustomerType(id: string) {
  return useQuery({
    queryKey: customerTypeKeys.detail(id),
    queryFn: () => customerTypeService.getById(id),
    enabled: !!id,
  });
}

// === Create Hook ===
export function useCreateCustomerType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCustomerTypeData) =>
      customerTypeService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerTypeKeys.lists() });
    },
  });
}

// === Update Hook ===
export function useUpdateCustomerType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateCustomerTypeData;
    }) => customerTypeService.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: customerTypeKeys.lists() });
      queryClient.setQueriesData(
        { queryKey: customerTypeKeys.lists() },
        (old: CustomerListResponse<CustomerType> | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((item: CustomerType) =>
              item.id === id ? { ...item, ...data } : item,
            ),
          };
        },
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: customerTypeKeys.detail(variables.id),
      });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: customerTypeKeys.lists() });
    },
  });
}

// === Delete Hook ===
export function useDeleteCustomerType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => customerTypeService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerTypeKeys.lists() });
    },
  });
}
