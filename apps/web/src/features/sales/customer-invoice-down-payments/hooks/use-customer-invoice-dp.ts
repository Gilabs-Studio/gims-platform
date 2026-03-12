"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customerInvoiceDPService } from "../services/customer-invoice-dp-service";
import type {
  CreateCustomerInvoiceDPInput,
  CustomerInvoiceDPListParams,
  UpdateCustomerInvoiceDPInput,
} from "../types";

export const customerInvoiceDPKeys = {
  all: ["customer-invoice-dp"] as const,
  lists: () => [...customerInvoiceDPKeys.all, "list"] as const,
  list: (params?: CustomerInvoiceDPListParams) => [...customerInvoiceDPKeys.lists(), params] as const,
  details: () => [...customerInvoiceDPKeys.all, "detail"] as const,
  detail: (id: string) => [...customerInvoiceDPKeys.details(), id] as const,
  addData: () => [...customerInvoiceDPKeys.all, "add"] as const,
  auditTrail: (id: string) => [...customerInvoiceDPKeys.all, "audit-trail", id] as const,
};

export function useCustomerInvoiceDPs(params?: CustomerInvoiceDPListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: customerInvoiceDPKeys.list(params),
    queryFn: () => customerInvoiceDPService.list(params),
    enabled: options?.enabled !== undefined ? options.enabled : true,
  });
}

export function useCustomerInvoiceDP(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: customerInvoiceDPKeys.detail(id),
    queryFn: () => customerInvoiceDPService.getById(id),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}

export function useCustomerInvoiceDPAddData(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: customerInvoiceDPKeys.addData(),
    queryFn: () => customerInvoiceDPService.addData(),
    enabled: options?.enabled !== undefined ? options.enabled : true,
    staleTime: 60_000,
  });
}

export function useCreateCustomerInvoiceDP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCustomerInvoiceDPInput) => customerInvoiceDPService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerInvoiceDPKeys.lists() });
    },
  });
}

export function useUpdateCustomerInvoiceDP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomerInvoiceDPInput }) =>
      customerInvoiceDPService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: customerInvoiceDPKeys.lists() });
      queryClient.invalidateQueries({ queryKey: customerInvoiceDPKeys.detail(variables.id) });
    },
  });
}

export function useDeleteCustomerInvoiceDP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => customerInvoiceDPService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerInvoiceDPKeys.lists() });
    },
  });
}

export function usePendingCustomerInvoiceDP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => customerInvoiceDPService.pending(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: customerInvoiceDPKeys.lists() });
      queryClient.invalidateQueries({ queryKey: customerInvoiceDPKeys.detail(id) });
    },
  });
}

export function useCustomerInvoiceDPAuditTrail(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: customerInvoiceDPKeys.auditTrail(id),
    queryFn: () => customerInvoiceDPService.auditTrail(id),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}
