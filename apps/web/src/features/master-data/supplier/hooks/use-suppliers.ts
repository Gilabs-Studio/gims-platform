"use client";

import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { supplierService } from "../services/supplier-service";
import type {
  Supplier,
  CreateSupplierData,
  UpdateSupplierData,
  ApproveSupplierData,
  CreateContactData,
  UpdateContactData,
  CreateSupplierBankData,
  UpdateSupplierBankData,
  SupplierListParams,
} from "../types";

// Query keys
export const supplierKeys = {
  all: ["suppliers"] as const,
  lists: () => [...supplierKeys.all, "list"] as const,
  list: (params?: SupplierListParams) =>
    [...supplierKeys.lists(), params] as const,
  details: () => [...supplierKeys.all, "detail"] as const,
  detail: (id: string) => [...supplierKeys.details(), id] as const,
};

// ============================================
// Main Supplier Hooks
// ============================================

export function useSuppliers(params?: SupplierListParams) {
  return useQuery({
    queryKey: supplierKeys.list(params),
    queryFn: () => supplierService.list(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

type SupplierDetailResult = Awaited<ReturnType<typeof supplierService.getById>>;

export function useSupplier(
  id: string,
  options?: Omit<UseQueryOptions<SupplierDetailResult, Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: supplierKeys.detail(id),
    queryFn: () => supplierService.getById(id),
    enabled: !!id,
    staleTime: 0,
    ...options,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSupplierData) => supplierService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierKeys.lists() });
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSupplierData }) =>
      supplierService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: supplierKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: supplierKeys.detail(variables.id),
      });
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => supplierService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierKeys.lists() });
    },
  });
}

// ============================================
// Approval Workflow Hooks
// ============================================

export function useSubmitSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => supplierService.submit(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: supplierKeys.lists() });
      queryClient.invalidateQueries({ queryKey: supplierKeys.detail(id) });
    },
  });
}

export function useApproveSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ApproveSupplierData }) =>
      supplierService.approve(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: supplierKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: supplierKeys.detail(variables.id),
      });
    },
  });
}

// ============================================
// Nested Contact Hooks
// ============================================

export function useAddContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      supplierId,
      data,
    }: {
      supplierId: string;
      data: CreateContactData;
    }) => supplierService.addContact(supplierId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: supplierKeys.detail(variables.supplierId),
      });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      supplierId,
      contactId,
      data,
    }: {
      supplierId: string;
      contactId: string;
      data: UpdateContactData;
    }) => supplierService.updateContact(supplierId, contactId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: supplierKeys.detail(variables.supplierId),
      });
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      supplierId,
      contactId,
    }: {
      supplierId: string;
      contactId: string;
    }) => supplierService.deleteContact(supplierId, contactId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: supplierKeys.detail(variables.supplierId),
      });
    },
  });
}

// ============================================
// Nested Bank Account Hooks
// ============================================

export function useAddBankAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      supplierId,
      data,
    }: {
      supplierId: string;
      data: CreateSupplierBankData;
    }) => supplierService.addBankAccount(supplierId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: supplierKeys.detail(variables.supplierId),
      });
    },
  });
}

export function useUpdateBankAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      supplierId,
      bankId,
      data,
    }: {
      supplierId: string;
      bankId: string;
      data: UpdateSupplierBankData;
    }) => supplierService.updateBankAccount(supplierId, bankId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: supplierKeys.detail(variables.supplierId),
      });
    },
  });
}

export function useDeleteBankAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      supplierId,
      bankId,
    }: {
      supplierId: string;
      bankId: string;
    }) => supplierService.deleteBankAccount(supplierId, bankId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: supplierKeys.detail(variables.supplierId),
      });
    },
  });
}
