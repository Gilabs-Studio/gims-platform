"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { salesTargetsService } from "../services/sales-targets-service";
import type {
  ListSalesTargetsParams,
  CreateSalesTargetInput,
  UpdateSalesTargetInput,
} from "../types";

const SALES_TARGETS_KEY = "sales-targets";

export function useSalesTargets(params?: ListSalesTargetsParams) {
  return useQuery({
    queryKey: [SALES_TARGETS_KEY, params],
    queryFn: () => salesTargetsService.list(params),
  });
}

export function useSalesTarget(id: string) {
  return useQuery({
    queryKey: [SALES_TARGETS_KEY, id],
    queryFn: () => salesTargetsService.getById(id),
    enabled: !!id,
  });
}

export function useCreateSalesTarget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSalesTargetInput) => salesTargetsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SALES_TARGETS_KEY] });
    },
  });
}

export function useUpdateSalesTarget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSalesTargetInput }) =>
      salesTargetsService.update({ id, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SALES_TARGETS_KEY] });
    },
  });
}

export function useDeleteSalesTarget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => salesTargetsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SALES_TARGETS_KEY] });
    },
  });
}
