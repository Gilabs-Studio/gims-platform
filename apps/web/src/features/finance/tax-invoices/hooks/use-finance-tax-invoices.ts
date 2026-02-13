"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { financeTaxInvoicesService } from "../services/finance-tax-invoices-service";
import type { ListTaxInvoicesParams, TaxInvoiceCreateInput, TaxInvoiceUpdateInput } from "../types";

export const financeTaxInvoiceKeys = {
  all: ["finance-tax-invoices"] as const,
  lists: () => [...financeTaxInvoiceKeys.all, "list"] as const,
  list: (params?: ListTaxInvoicesParams) => [...financeTaxInvoiceKeys.lists(), params] as const,
  details: () => [...financeTaxInvoiceKeys.all, "detail"] as const,
  detail: (id: string) => [...financeTaxInvoiceKeys.details(), id] as const,
};

export function useFinanceTaxInvoices(params?: ListTaxInvoicesParams) {
  return useQuery({
    queryKey: financeTaxInvoiceKeys.list(params),
    queryFn: () => financeTaxInvoicesService.list(params),
  });
}

export function useCreateFinanceTaxInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TaxInvoiceCreateInput) => financeTaxInvoicesService.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeTaxInvoiceKeys.lists() }),
  });
}

export function useUpdateFinanceTaxInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TaxInvoiceUpdateInput }) => financeTaxInvoicesService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: financeTaxInvoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: financeTaxInvoiceKeys.detail(id) });
    },
  });
}

export function useDeleteFinanceTaxInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeTaxInvoicesService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeTaxInvoiceKeys.lists() }),
  });
}
