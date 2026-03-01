"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supplierInvoicesService } from "../services/supplier-invoices-service";
import type {
  CreateSupplierInvoiceInput,
  SupplierInvoiceListParams,
  UpdateSupplierInvoiceInput,
} from "../types";

export const supplierInvoiceKeys = {
  all: ["supplier-invoices"] as const,
  lists: () => [...supplierInvoiceKeys.all, "list"] as const,
  list: (params?: SupplierInvoiceListParams) => [...supplierInvoiceKeys.lists(), params] as const,
  details: () => [...supplierInvoiceKeys.all, "detail"] as const,
  detail: (id: string) => [...supplierInvoiceKeys.details(), id] as const,
  addData: () => [...supplierInvoiceKeys.all, "add"] as const,
  auditTrail: (id: string, params?: { page?: number; per_page?: number }) =>
    [...supplierInvoiceKeys.all, "audit-trail", id, params] as const,
};

export function useSupplierInvoices(params?: SupplierInvoiceListParams) {
  return useQuery({
    queryKey: supplierInvoiceKeys.list(params),
    queryFn: () => supplierInvoicesService.list(params),
  });
}

export function useSupplierInvoice(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: supplierInvoiceKeys.detail(id),
    queryFn: () => supplierInvoicesService.getById(id),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}

export function useSupplierInvoiceAddData(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: supplierInvoiceKeys.addData(),
    queryFn: () => supplierInvoicesService.addData(),
    enabled: options?.enabled !== undefined ? options.enabled : true,
    staleTime: 60_000,
  });
}

export function useCreateSupplierInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSupplierInvoiceInput) => supplierInvoicesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierInvoiceKeys.lists() });
    },
  });
}

export function useUpdateSupplierInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSupplierInvoiceInput }) =>
      supplierInvoicesService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: supplierInvoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: supplierInvoiceKeys.detail(variables.id) });
    },
  });
}

export function useDeleteSupplierInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => supplierInvoicesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierInvoiceKeys.lists() });
    },
  });
}

export function usePendingSupplierInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => supplierInvoicesService.pending(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: supplierInvoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: supplierInvoiceKeys.detail(id) });
    },
  });
}

export function useSubmitSupplierInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => supplierInvoicesService.submit(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: supplierInvoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: supplierInvoiceKeys.detail(id) });
    },
  });
}

export function useApproveSupplierInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => supplierInvoicesService.approve(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: supplierInvoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: supplierInvoiceKeys.detail(id) });
    },
  });
}

export function useRejectSupplierInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => supplierInvoicesService.reject(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: supplierInvoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: supplierInvoiceKeys.detail(id) });
    },
  });
}

export function useCancelSupplierInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => supplierInvoicesService.cancel(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: supplierInvoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: supplierInvoiceKeys.detail(id) });
    },
  });
}

export function useSupplierInvoiceAuditTrail(
  id: string,
  params?: { page?: number; per_page?: number },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: supplierInvoiceKeys.auditTrail(id, params),
    queryFn: () => supplierInvoicesService.auditTrail(id, params),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}
