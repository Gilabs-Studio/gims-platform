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
    onMutate: async (newInvoice) => {
      await queryClient.cancelQueries({ queryKey: ["supplier-invoices"] });
      const previousInvoices = queryClient.getQueriesData({ queryKey: ["supplier-invoices"] });
      queryClient.setQueriesData({ queryKey: ["supplier-invoices"] }, (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: {
            ...old.data,
            data: [
              { id: Date.now(), ...newInvoice, status: "DRAFT", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
              ...(old.data.data || []),
            ],
            meta: {
              ...old.data.meta,
              pagination: { ...old.data.meta?.pagination, total: (old.data.meta?.pagination?.total || 0) + 1 },
            },
          },
        };
      });
      return { previousInvoices };
    },
    onError: (err, newInvoice, context) => {
      if (context?.previousInvoices) {
        context.previousInvoices.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
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
    onMutate: async ({ id, data: updateData }) => {
      await queryClient.cancelQueries({ queryKey: ["supplier-invoices"] });
      await queryClient.cancelQueries({ queryKey: ["supplier-invoices", id] });
      const previousInvoices = queryClient.getQueriesData({ queryKey: ["supplier-invoices"] });
      const previousInvoice = queryClient.getQueryData(["supplier-invoices", id]);
      queryClient.setQueriesData({ queryKey: ["supplier-invoices"] }, (old: any) => {
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
      queryClient.setQueryData(["supplier-invoices", id], (old: any) => {
        if (!old?.data) return old;
        return { ...old, data: { ...old.data, ...updateData, updated_at: new Date().toISOString() } };
      });
      return { previousInvoices, previousInvoice };
    },
    onError: (err, variables, context) => {
      if (context?.previousInvoices) {
        context.previousInvoices.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousInvoice) {
        queryClient.setQueryData(["supplier-invoices", variables.id], context.previousInvoice);
      }
    },
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
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["supplier-invoices"] });
      const previousInvoices = queryClient.getQueriesData({ queryKey: ["supplier-invoices"] });
      queryClient.setQueriesData({ queryKey: ["supplier-invoices"] }, (old: any) => {
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
      return { previousInvoices };
    },
    onError: (err, id, context) => {
      if (context?.previousInvoices) {
        context.previousInvoices.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
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




