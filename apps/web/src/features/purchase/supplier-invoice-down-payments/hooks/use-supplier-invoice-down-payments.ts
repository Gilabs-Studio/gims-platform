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
    onMutate: async (newDownPayment) => {
      await queryClient.cancelQueries({ queryKey: ["supplier-invoice-down-payments"] });
      const previousDownPayments = queryClient.getQueriesData({ queryKey: ["supplier-invoice-down-payments"] });
      queryClient.setQueriesData({ queryKey: ["supplier-invoice-down-payments"] }, (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: {
            ...old.data,
            data: [
              { id: Date.now(), ...newDownPayment, status: "DRAFT", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
              ...(old.data.data || []),
            ],
            meta: {
              ...old.data.meta,
              pagination: { ...old.data.meta?.pagination, total: (old.data.meta?.pagination?.total || 0) + 1 },
            },
          },
        };
      });
      return { previousDownPayments };
    },
    onError: (err, newDownPayment, context) => {
      if (context?.previousDownPayments) {
        context.previousDownPayments.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
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
    onMutate: async ({ id, data: updateData }) => {
      await queryClient.cancelQueries({ queryKey: ["supplier-invoice-down-payments"] });
      await queryClient.cancelQueries({ queryKey: ["supplier-invoice-down-payments", id] });
      const previousDownPayments = queryClient.getQueriesData({ queryKey: ["supplier-invoice-down-payments"] });
      const previousDownPayment = queryClient.getQueryData(["supplier-invoice-down-payments", id]);
      queryClient.setQueriesData({ queryKey: ["supplier-invoice-down-payments"] }, (old: any) => {
        if (!old?.data?.data) return old;
        return {
          ...old,
          data: {
            ...old.data,
            data: old.data.data.map((item: any) =>
              item.id === id ? { ...item, ...updateData, updated_at: new Date().toISOString() } : item
            ),
          },
        };
      });
      queryClient.setQueryData(["supplier-invoice-down-payments", id], (old: any) => {
        if (!old?.data) return old;
        return { ...old, data: { ...old.data, ...updateData, updated_at: new Date().toISOString() } };
      });
      return { previousDownPayments, previousDownPayment };
    },
    onError: (err, variables, context) => {
      if (context?.previousDownPayments) {
        context.previousDownPayments.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousDownPayment) {
        queryClient.setQueryData(["supplier-invoice-down-payments", variables.id], context.previousDownPayment);
      }
    },
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
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["supplier-invoice-down-payments"] });
      const previousDownPayments = queryClient.getQueriesData({ queryKey: ["supplier-invoice-down-payments"] });
      queryClient.setQueriesData({ queryKey: ["supplier-invoice-down-payments"] }, (old: any) => {
        if (!old?.data?.data) return old;
        return {
          ...old,
          data: {
            ...old.data,
            data: old.data.data.filter((item: any) => item.id !== id),
            meta: {
              ...old.data.meta,
              pagination: { ...old.data.meta?.pagination, total: Math.max(0, (old.data.meta?.pagination?.total || 0) - 1) },
            },
          },
        };
      });
      return { previousDownPayments };
    },
    onError: (err, id, context) => {
      if (context?.previousDownPayments) {
        context.previousDownPayments.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
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




