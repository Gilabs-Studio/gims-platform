"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supplierService } from "../services/supplier-service";
import type { CreateSupplierFormData, UpdateSupplierFormData } from "../schemas/supplier.schema";
import type { Supplier, SupplierListResponse } from "../types";

export function useSuppliers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  searchBy?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}) {
  return useQuery({
    queryKey: ["suppliers", params],
    queryFn: () => supplierService.list(params),
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

export function useSupplier(id: number | null) {
  return useQuery({
    queryKey: ["suppliers", id],
    queryFn: () => supplierService.getById(id!),
    enabled: !!id,
  });
}

export function useSupplierAddData() {
  return useQuery({
    queryKey: ["suppliers", "add-data"],
    queryFn: () => supplierService.getAddData(),
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSupplierFormData) => supplierService.create(data),
    onMutate: async (newSupplier: CreateSupplierFormData) => {
      await queryClient.cancelQueries({ queryKey: ["suppliers"] });
      const previousSuppliers = queryClient.getQueriesData({ queryKey: ["suppliers"] });
      queryClient.setQueriesData({ queryKey: ["suppliers"] }, (old?: unknown) => {
        const prev = old as { data?: { data?: Supplier[]; meta?: SupplierListResponse['meta'] } } | undefined;
        if (!prev?.data?.data) return old;
        return {
          ...prev,
          data: {
            ...prev.data,
            data: [
              { id: Date.now(), ...(newSupplier as object), is_approved: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
              ...(prev.data.data || []),
            ],
            meta: {
              ...prev.data.meta,
              pagination: { ...prev.data.meta?.pagination, total: (prev.data.meta?.pagination?.total || 0) + 1 },
            },
          },
        };
      });
      return { previousSuppliers };
    },
    onError: (_err, _newSupplier, context) => {
      if (context?.previousSuppliers) {
        context.previousSuppliers.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateSupplierFormData }) =>
      supplierService.update(id, data),
    onMutate: async ({ id, data: updateData }) => {
      await queryClient.cancelQueries({ queryKey: ["suppliers"] });
      await queryClient.cancelQueries({ queryKey: ["suppliers", id] });
      const previousSuppliers = queryClient.getQueriesData({ queryKey: ["suppliers"] });
      const previousSupplier = queryClient.getQueryData(["suppliers", id]);
      queryClient.setQueriesData({ queryKey: ["suppliers"] }, (old?: unknown) => {
        const prev = old as { data?: { data?: Supplier[]; meta?: SupplierListResponse['meta'] } } | undefined;
        if (!prev?.data?.data) return old;
        return {
          ...prev,
          data: {
            ...prev.data,
            data: prev.data.data.map((item: Supplier) =>
              item.id === id ? { ...item, ...(updateData as Partial<Supplier>), updated_at: new Date().toISOString() } : item
            ),
          },
        };
      });
      queryClient.setQueryData(["suppliers", id], (old?: unknown) => {
        const prev = old as { data?: Supplier } | undefined;
        if (!prev?.data) return old;
        return { ...prev, data: { ...prev.data, ...(updateData as Partial<Supplier>), updated_at: new Date().toISOString() } };
      });
      return { previousSuppliers, previousSupplier };
    },
    onError: (err, variables, context) => {
      if (context?.previousSuppliers) {
        context.previousSuppliers.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousSupplier) {
        queryClient.setQueryData(["suppliers", variables.id], context.previousSupplier);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers", variables.id] });
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => supplierService.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["suppliers"] });
      const previousSuppliers = queryClient.getQueriesData({ queryKey: ["suppliers"] });
      queryClient.setQueriesData({ queryKey: ["suppliers"] }, (old?: unknown) => {
        const prev = old as { data?: { data?: Supplier[]; meta?: SupplierListResponse['meta'] } } | undefined;
        if (!prev?.data?.data) return old;
        return {
          ...prev,
          data: {
            ...prev.data,
            data: prev.data.data.filter((item: Supplier) => item.id !== id),
            meta: {
              ...prev.data.meta,
              pagination: { ...prev.data.meta?.pagination, total: Math.max(0, (prev.data.meta?.pagination?.total || 0) - 1) },
            },
          },
        };
      });
      return { previousSuppliers };
    },
    onError: (err, id, context) => {
      if (context?.previousSuppliers) {
        context.previousSuppliers.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
}

export function useApproveSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => supplierService.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
}

export function useApproveAllSuppliers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => supplierService.approveAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
}

export function useExportSuppliers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  searchBy?: string;
}) {
  return useMutation({
    mutationFn: () => supplierService.export(params),
  });
}

export function useDownloadSupplierTemplate() {
  return useMutation({
    mutationFn: () => supplierService.downloadTemplate(),
  });
}

export function useImportSuppliers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => supplierService.import(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
}
