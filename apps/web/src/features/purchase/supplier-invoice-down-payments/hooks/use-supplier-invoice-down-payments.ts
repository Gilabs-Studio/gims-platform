"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supplierInvoiceDownPaymentService } from "../services/supplier-invoice-down-payment-service";
import type {
  CreateSupplierInvoiceDownPaymentFormData,
  UpdateSupplierInvoiceDownPaymentFormData,
} from "../schemas/supplier-invoice-down-payment.schema";

export function useSupplierInvoiceDownPayments(params?: {
  page?: number;
  limit?: number;
  search?: string;
  searchBy?: string;
  status?: "DRAFT" | "UNPAID" | "PAID";
  sort_by?: string;
  sort_order?: "asc" | "desc";
  start_date?: string;
  end_date?: string;
}) {
  return useQuery({
    queryKey: ["supplier-invoice-down-payments", params],
    queryFn: () => supplierInvoiceDownPaymentService.list(params),
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

export function useSupplierInvoiceDownPayment(id: number | null) {
  return useQuery({
    queryKey: ["supplier-invoice-down-payments", id],
    queryFn: () => supplierInvoiceDownPaymentService.getById(id!),
    enabled: !!id,
  });
}

export function useSupplierInvoiceDownPaymentAddData() {
  return useQuery({
    queryKey: ["supplier-invoice-down-payments", "add-data"],
    queryFn: () => supplierInvoiceDownPaymentService.getAddData(),
  });
}

export function useCreateSupplierInvoiceDownPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSupplierInvoiceDownPaymentFormData) =>
      supplierInvoiceDownPaymentService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-invoice-down-payments"] });
    },
  });
}

export function useUpdateSupplierInvoiceDownPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: UpdateSupplierInvoiceDownPaymentFormData;
    }) => supplierInvoiceDownPaymentService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["supplier-invoice-down-payments"] });
      queryClient.invalidateQueries({
        queryKey: ["supplier-invoice-down-payments", variables.id],
      });
    },
  });
}

export function useDeleteSupplierInvoiceDownPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => supplierInvoiceDownPaymentService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-invoice-down-payments"] });
    },
  });
}

export function usePendingSupplierInvoiceDownPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => supplierInvoiceDownPaymentService.pending(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["supplier-invoice-down-payments"] });
      queryClient.invalidateQueries({
        queryKey: ["supplier-invoice-down-payments", id],
      });
    },
  });
}




