"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { paymentPOService } from "../services/payment-po-service";
import type {
  CreatePaymentPOFormData,
  UpdatePaymentPOFormData,
} from "../schemas/payment-po.schema";

export function usePaymentPOs(params?: {
  page?: number;
  limit?: number;
  search?: string;
  searchBy?: string;
  status?: "PENDING" | "CONFIRMED";
  sort_by?: string;
  sort_order?: "asc" | "desc";
  start_date?: string;
  end_date?: string;
}) {
  return useQuery({
    queryKey: ["payment-pos", params],
    queryFn: () => paymentPOService.list(params),
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

export function usePaymentPO(id: number | null) {
  return useQuery({
    queryKey: ["payment-pos", id],
    queryFn: () => paymentPOService.getById(id!),
    enabled: !!id,
  });
}

export function usePaymentPOAddData() {
  return useQuery({
    queryKey: ["payment-pos", "add-data"],
    queryFn: () => paymentPOService.getAddData(),
  });
}

export function useCreatePaymentPO() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePaymentPOFormData) =>
      paymentPOService.create(data),
    onMutate: async (newPaymentPO) => {
      await queryClient.cancelQueries({ queryKey: ["payment-pos"] });
      const previousPaymentPOs = queryClient.getQueriesData({ queryKey: ["payment-pos"] });
      queryClient.setQueriesData({ queryKey: ["payment-pos"] }, (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: {
            ...old.data,
            data: [
              { id: Date.now(), ...newPaymentPO, status: "PENDING", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
              ...(old.data.data || []),
            ],
            meta: {
              ...old.data.meta,
              pagination: { ...old.data.meta?.pagination, total: (old.data.meta?.pagination?.total || 0) + 1 },
            },
          },
        };
      });
      return { previousPaymentPOs };
    },
    onError: (err, newPaymentPO, context) => {
      if (context?.previousPaymentPOs) {
        context.previousPaymentPOs.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-pos"] });
    },
  });
}

export function useUpdatePaymentPO() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: UpdatePaymentPOFormData;
    }) => paymentPOService.update(id, data),
    onMutate: async ({ id, data: updateData }) => {
      await queryClient.cancelQueries({ queryKey: ["payment-pos"] });
      await queryClient.cancelQueries({ queryKey: ["payment-pos", id] });
      const previousPaymentPOs = queryClient.getQueriesData({ queryKey: ["payment-pos"] });
      const previousPaymentPO = queryClient.getQueryData(["payment-pos", id]);
      queryClient.setQueriesData({ queryKey: ["payment-pos"] }, (old: any) => {
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
      queryClient.setQueryData(["payment-pos", id], (old: any) => {
        if (!old?.data) return old;
        return { ...old, data: { ...old.data, ...updateData, updated_at: new Date().toISOString() } };
      });
      return { previousPaymentPOs, previousPaymentPO };
    },
    onError: (err, variables, context) => {
      if (context?.previousPaymentPOs) {
        context.previousPaymentPOs.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousPaymentPO) {
        queryClient.setQueryData(["payment-pos", variables.id], context.previousPaymentPO);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["payment-pos"] });
      queryClient.invalidateQueries({
        queryKey: ["payment-pos", variables.id],
      });
    },
  });
}

export function useDeletePaymentPO() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => paymentPOService.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["payment-pos"] });
      const previousPaymentPOs = queryClient.getQueriesData({ queryKey: ["payment-pos"] });
      queryClient.setQueriesData({ queryKey: ["payment-pos"] }, (old: any) => {
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
      return { previousPaymentPOs };
    },
    onError: (err, id, context) => {
      if (context?.previousPaymentPOs) {
        context.previousPaymentPOs.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-pos"] });
    },
  });
}

export function useConfirmPaymentPO() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => paymentPOService.confirm(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["payment-pos"] });
      queryClient.invalidateQueries({
        queryKey: ["payment-pos", id],
      });
    },
  });
}




