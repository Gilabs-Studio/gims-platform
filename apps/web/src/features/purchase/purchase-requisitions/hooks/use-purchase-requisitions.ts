"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { purchaseRequisitionService } from "../services/purchase-requisition-service";
import type {
  CreatePurchaseRequisitionFormData,
  UpdatePurchaseRequisitionFormData,
} from "../schemas/purchase-requisition.schema";

export function usePurchaseRequisitions(params?: {
  page?: number;
  limit?: number;
  search?: string;
  searchBy?: string;
  status?: "DRAFT" | "APPROVED" | "REJECTED" | "CONVERTED";
  sort_by?: string;
  sort_order?: "asc" | "desc";
  start_date?: string;
  end_date?: string;
}) {
  return useQuery({
    queryKey: ["purchase-requisitions", params],
    queryFn: () => purchaseRequisitionService.list(params),
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

export function usePurchaseRequisition(id: number | null) {
  return useQuery({
    queryKey: ["purchase-requisitions", id],
    queryFn: () => purchaseRequisitionService.getById(id!),
    enabled: !!id,
  });
}

export function usePurchaseRequisitionAddData() {
  return useQuery({
    queryKey: ["purchase-requisitions", "add-data"],
    queryFn: () => purchaseRequisitionService.getAddData(),
  });
}

export function useCreatePurchaseRequisition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePurchaseRequisitionFormData) =>
      purchaseRequisitionService.create(data),
    onMutate: async (newRequisition) => {
      await queryClient.cancelQueries({ queryKey: ["purchase-requisitions"] });
      const previousRequisitions = queryClient.getQueriesData({ queryKey: ["purchase-requisitions"] });
      queryClient.setQueriesData({ queryKey: ["purchase-requisitions"] }, (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: {
            ...old.data,
            data: [
              { id: Date.now(), ...newRequisition, status: "DRAFT", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
              ...(old.data.data || []),
            ],
            meta: {
              ...old.data.meta,
              pagination: { ...old.data.meta?.pagination, total: (old.data.meta?.pagination?.total || 0) + 1 },
            },
          },
        };
      });
      return { previousRequisitions };
    },
    onError: (err, newRequisition, context) => {
      if (context?.previousRequisitions) {
        context.previousRequisitions.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requisitions"] });
    },
  });
}

export function useUpdatePurchaseRequisition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: UpdatePurchaseRequisitionFormData;
    }) => purchaseRequisitionService.update(id, data),
    onMutate: async ({ id, data: updateData }) => {
      await queryClient.cancelQueries({ queryKey: ["purchase-requisitions"] });
      await queryClient.cancelQueries({ queryKey: ["purchase-requisitions", id] });
      const previousRequisitions = queryClient.getQueriesData({ queryKey: ["purchase-requisitions"] });
      const previousRequisition = queryClient.getQueryData(["purchase-requisitions", id]);
      queryClient.setQueriesData({ queryKey: ["purchase-requisitions"] }, (old: any) => {
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
      queryClient.setQueryData(["purchase-requisitions", id], (old: any) => {
        if (!old?.data) return old;
        return { ...old, data: { ...old.data, ...updateData, updated_at: new Date().toISOString() } };
      });
      return { previousRequisitions, previousRequisition };
    },
    onError: (err, variables, context) => {
      if (context?.previousRequisitions) {
        context.previousRequisitions.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousRequisition) {
        queryClient.setQueryData(["purchase-requisitions", variables.id], context.previousRequisition);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requisitions"] });
      queryClient.invalidateQueries({
        queryKey: ["purchase-requisitions", variables.id],
      });
    },
  });
}

export function useDeletePurchaseRequisition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => purchaseRequisitionService.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["purchase-requisitions"] });
      const previousRequisitions = queryClient.getQueriesData({ queryKey: ["purchase-requisitions"] });
      queryClient.setQueriesData({ queryKey: ["purchase-requisitions"] }, (old: any) => {
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
      return { previousRequisitions };
    },
    onError: (err, id, context) => {
      if (context?.previousRequisitions) {
        context.previousRequisitions.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requisitions"] });
    },
  });
}

export function useApprovePurchaseRequisition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => purchaseRequisitionService.approve(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requisitions"] });
      queryClient.invalidateQueries({
        queryKey: ["purchase-requisitions", id],
      });
    },
  });
}

export function useRejectPurchaseRequisition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => purchaseRequisitionService.reject(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requisitions"] });
      queryClient.invalidateQueries({
        queryKey: ["purchase-requisitions", id],
      });
    },
  });
}

export function useConvertPurchaseRequisition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => purchaseRequisitionService.convert(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requisitions"] });
      queryClient.invalidateQueries({
        queryKey: ["purchase-requisitions", id],
      });
    },
  });
}

