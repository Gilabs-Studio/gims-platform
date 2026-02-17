"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supplierInvoiceDPService } from "../services/supplier-invoice-dp-service";
import type {
  CreateSupplierInvoiceDPInput,
  SupplierInvoiceDPListParams,
  UpdateSupplierInvoiceDPInput,
} from "../types";

export const supplierInvoiceDPKeys = {
  all: ["supplier-invoice-dp"] as const,
  lists: () => [...supplierInvoiceDPKeys.all, "list"] as const,
  list: (params?: SupplierInvoiceDPListParams) => [...supplierInvoiceDPKeys.lists(), params] as const,
  details: () => [...supplierInvoiceDPKeys.all, "detail"] as const,
  detail: (id: string) => [...supplierInvoiceDPKeys.details(), id] as const,
  addData: () => [...supplierInvoiceDPKeys.all, "add"] as const,
};

export function useSupplierInvoiceDPs(params?: SupplierInvoiceDPListParams) {
  return useQuery({
    queryKey: supplierInvoiceDPKeys.list(params),
    queryFn: () => supplierInvoiceDPService.list(params),
  });
}

export function useSupplierInvoiceDP(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: supplierInvoiceDPKeys.detail(id),
    queryFn: () => supplierInvoiceDPService.getById(id),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}

export function useSupplierInvoiceDPAddData(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: supplierInvoiceDPKeys.addData(),
    queryFn: () => supplierInvoiceDPService.addData(),
    enabled: options?.enabled !== undefined ? options.enabled : true,
    staleTime: 60_000,
  });
}

export function useCreateSupplierInvoiceDP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSupplierInvoiceDPInput) => supplierInvoiceDPService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierInvoiceDPKeys.lists() });
    },
  });
}

export function useUpdateSupplierInvoiceDP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSupplierInvoiceDPInput }) =>
      supplierInvoiceDPService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: supplierInvoiceDPKeys.lists() });
      queryClient.invalidateQueries({ queryKey: supplierInvoiceDPKeys.detail(variables.id) });
    },
  });
}

export function useDeleteSupplierInvoiceDP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => supplierInvoiceDPService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierInvoiceDPKeys.lists() });
    },
  });
}

export function usePendingSupplierInvoiceDP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => supplierInvoiceDPService.pending(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: supplierInvoiceDPKeys.lists() });
      queryClient.invalidateQueries({ queryKey: supplierInvoiceDPKeys.detail(id) });
    },
  });
}
