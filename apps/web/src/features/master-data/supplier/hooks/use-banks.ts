"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { bankService } from "../services/supplier-service";
import type {
  Bank,
  CreateBankData,
  UpdateBankData,
  ListParams,
  SupplierListResponse,
} from "../types";

// Query keys
export const bankKeys = {
  all: ["banks"] as const,
  lists: () => [...bankKeys.all, "list"] as const,
  list: (params?: ListParams) => [...bankKeys.lists(), params] as const,
  details: () => [...bankKeys.all, "detail"] as const,
  detail: (id: string) => [...bankKeys.details(), id] as const,
};

// List hook
export function useBanks(params?: ListParams) {
  return useQuery({
    queryKey: bankKeys.list(params),
    queryFn: () => bankService.list(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get by ID hook
export function useBank(id: string) {
  return useQuery({
    queryKey: bankKeys.detail(id),
    queryFn: () => bankService.getById(id),
    enabled: !!id,
  });
}

// Create hook
export function useCreateBank() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBankData) => bankService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bankKeys.lists() });
    },
  });
}

// Update hook
export function useUpdateBank() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBankData }) =>
      bankService.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: bankKeys.lists() });
      queryClient.setQueriesData({ queryKey: bankKeys.lists() }, (old: SupplierListResponse<Bank> | undefined) => {
        if (!old?.data) return old;
        return { ...old, data: old.data.map((item: Bank) => item.id === id ? { ...item, ...data } : item) };
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: bankKeys.detail(variables.id),
      });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: bankKeys.lists() });
    },
  });
}

// Delete hook
export function useDeleteBank() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => bankService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bankKeys.lists() });
    },
  });
}
