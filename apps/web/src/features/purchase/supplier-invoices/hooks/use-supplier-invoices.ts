"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supplierInvoiceService } from "../services/supplier-invoice-service";
import type {
  CreateSupplierInvoiceFormData,
  UpdateSupplierInvoiceFormData,
} from "../schemas/supplier-invoice.schema";

export function useSupplierInvoices(params?: {
  page?: number;
  limit?: number;
  search?: string;
  searchBy?: string;
  status?: "DRAFT" | "UNPAID" | "PAID" | "PARTIAL" | "OVERDUE";
  sort_by?: string;
  sort_order?: "asc" | "desc";
  start_date?: string;
  end_date?: string;
}) {
  return useQuery({
    queryKey: ["supplier-invoices", params],
    queryFn: () => supplierInvoiceService.list(params),
    retry: (failureCount, error) => {
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 404) {
          return false;
        }
      }
      return failureCount < 1;
    },
  });
}

export function useSupplierInvoice(id: number | null) {
  return useQuery({
    queryKey: ["supplier-invoices", id],
    queryFn: () => supplierInvoiceService.getById(id!),
    enabled: !!id,
  });
}

export function useSupplierInvoiceAddData() {
  return useQuery({
    queryKey: ["supplier-invoices", "add-data"],
    queryFn: () => supplierInvoiceService.getAddData(),
  });
}

export function useCreateSupplierInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSupplierInvoiceFormData) =>
      supplierInvoiceService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-invoices"] });
    },
  });
}

export function useUpdateSupplierInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: UpdateSupplierInvoiceFormData;
    }) => supplierInvoiceService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["supplier-invoices"] });
      queryClient.invalidateQueries({
        queryKey: ["supplier-invoices", variables.id],
      });
    },
  });
}

export function useDeleteSupplierInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => supplierInvoiceService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-invoices"] });
    },
  });
}

export function useSetPendingSupplierInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => supplierInvoiceService.setPending(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["supplier-invoices"] });
      queryClient.invalidateQueries({
        queryKey: ["supplier-invoices", id],
      });
    },
  });
}




