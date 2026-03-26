"use client";

import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { customerService } from "../services/customer-service";
import type {
  CreateCustomerData,
  UpdateCustomerData,
  CreateCustomerBankData,
  UpdateCustomerBankData,
  CustomerListParams,
} from "../types";

// Query keys factory
export const customerKeys = {
  all: ["customers"] as const,
  lists: () => [...customerKeys.all, "list"] as const,
  list: (params?: CustomerListParams) =>
    [...customerKeys.lists(), params] as const,
  details: () => [...customerKeys.all, "detail"] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
  formData: () => [...customerKeys.all, "form-data"] as const,
};

// === List Hook ===
export function useCustomers(params?: CustomerListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: customerKeys.list(params),
    queryFn: () => customerService.list(params),
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}

// === Detail Hook ===
type CustomerDetailResult = Awaited<ReturnType<typeof customerService.getById>>;

export function useCustomer(
  id: string,
  options?: Omit<UseQueryOptions<CustomerDetailResult, Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: () => customerService.getById(id),
    enabled: !!id,
    staleTime: 0,
    ...options,
  });
}

// === Form Data Hook ===
export function useCustomerFormData(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: customerKeys.formData(),
    queryFn: () => customerService.getFormData(),
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

// === Create Hook ===
export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCustomerData) => customerService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}

// === Update Hook ===
export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomerData }) =>
      customerService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: customerKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}

// === Delete Hook ===
export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => customerService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}

// === Bank Account Hooks ===
export function useAddCustomerBank() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      customerId,
      data,
    }: {
      customerId: string;
      data: CreateCustomerBankData;
    }) => customerService.addBankAccount(customerId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: customerKeys.detail(variables.customerId),
      });
    },
  });
}

export function useUpdateCustomerBank() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      customerId,
      bankId,
      data,
    }: {
      customerId: string;
      bankId: string;
      data: UpdateCustomerBankData;
    }) => customerService.updateBankAccount(customerId, bankId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: customerKeys.detail(variables.customerId),
      });
    },
  });
}

export function useDeleteCustomerBank() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      customerId,
      bankId,
    }: {
      customerId: string;
      bankId: string;
    }) => customerService.deleteBankAccount(customerId, bankId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: customerKeys.detail(variables.customerId),
      });
    },
  });
}
