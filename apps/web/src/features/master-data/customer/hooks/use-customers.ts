"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customerService } from "../services/customer-service";
import type {
  Customer,
  CreateCustomerData,
  UpdateCustomerData,
  ApproveCustomerData,
  CreatePhoneNumberData,
  UpdatePhoneNumberData,
  CreateCustomerBankData,
  UpdateCustomerBankData,
  CustomerListParams,
  CustomerListResponse,
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
export function useCustomers(params?: CustomerListParams) {
  return useQuery({
    queryKey: customerKeys.list(params),
    queryFn: () => customerService.list(params),
    staleTime: 5 * 60 * 1000,
  });
}

// === Detail Hook ===
export function useCustomer(id: string) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: () => customerService.getById(id),
    enabled: !!id,
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
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: customerKeys.lists() });
      queryClient.setQueriesData(
        { queryKey: customerKeys.lists() },
        (old: CustomerListResponse<Customer> | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((item: Customer) =>
              item.id === id ? { ...item, ...data } : item,
            ),
          };
        },
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: customerKeys.detail(variables.id),
      });
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

// === Submit for Approval Hook ===
export function useSubmitCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => customerService.submit(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}

// === Approve/Reject Hook ===
export function useApproveCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ApproveCustomerData }) =>
      customerService.approve(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: customerKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}

// === Phone Number Hooks ===
export function useAddCustomerPhone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      customerId,
      data,
    }: {
      customerId: string;
      data: CreatePhoneNumberData;
    }) => customerService.addPhoneNumber(customerId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: customerKeys.detail(variables.customerId),
      });
    },
  });
}

export function useUpdateCustomerPhone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      customerId,
      phoneId,
      data,
    }: {
      customerId: string;
      phoneId: string;
      data: UpdatePhoneNumberData;
    }) => customerService.updatePhoneNumber(customerId, phoneId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: customerKeys.detail(variables.customerId),
      });
    },
  });
}

export function useDeleteCustomerPhone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      customerId,
      phoneId,
    }: {
      customerId: string;
      phoneId: string;
    }) => customerService.deletePhoneNumber(customerId, phoneId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: customerKeys.detail(variables.customerId),
      });
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
