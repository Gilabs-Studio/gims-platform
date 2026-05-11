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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isSalesTargetId(value: string) {
  return UUID_REGEX.test(value);
}

export function useSalesTarget(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [SALES_TARGETS_KEY, id],
    queryFn: () => salesTargetsService.getById(id),
    enabled: !!id && isSalesTargetId(id) && (options?.enabled ?? true),
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

export function useAvailableSalesTargetEmployees(
  year: number,
  includeEmployeeId?: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: [SALES_TARGETS_KEY, "available-employees", year, includeEmployeeId],
    queryFn: () => salesTargetsService.listAvailableEmployees(year, includeEmployeeId),
    enabled: (options?.enabled ?? true) && Number.isFinite(year),
  });
}
