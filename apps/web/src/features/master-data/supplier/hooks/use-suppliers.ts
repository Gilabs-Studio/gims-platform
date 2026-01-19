"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supplierService } from "../services/supplier-service";
import type {
  Supplier,
  CreateSupplierData,
  UpdateSupplierData,
  ApproveSupplierData,
  CreatePhoneNumberData,
  UpdatePhoneNumberData,
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

export function useSupplier(id: string) {
  return useQuery({
    queryKey: supplierKeys.detail(id),
    queryFn: () => supplierService.getById(id),
    enabled: !!id,
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
// Nested Phone Number Hooks
// ============================================

export function useAddPhoneNumber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      supplierId,
      data,
    }: {
      supplierId: string;
      data: CreatePhoneNumberData;
    }) => supplierService.addPhoneNumber(supplierId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: supplierKeys.detail(variables.supplierId),
      });
    },
  });
}

export function useUpdatePhoneNumber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      supplierId,
      phoneId,
      data,
    }: {
      supplierId: string;
      phoneId: string;
      data: UpdatePhoneNumberData;
    }) => supplierService.updatePhoneNumber(supplierId, phoneId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: supplierKeys.detail(variables.supplierId),
      });
    },
  });
}

export function useDeletePhoneNumber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      supplierId,
      phoneId,
    }: {
      supplierId: string;
      phoneId: string;
    }) => supplierService.deletePhoneNumber(supplierId, phoneId),
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
