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

