"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { financeSalaryService } from "../services/finance-salary-service";
import type { ListSalaryParams, SalaryStructureInput } from "../types";

export const financeSalaryKeys = {
  all: ["finance-salary"] as const,
  lists: () => [...financeSalaryKeys.all, "list"] as const,
  list: (params?: ListSalaryParams) => [...financeSalaryKeys.lists(), params] as const,
  detail: (id: string) => [...financeSalaryKeys.all, "detail", id] as const,
};

export function useFinanceSalaryList(params?: ListSalaryParams) {
  return useQuery({
    queryKey: financeSalaryKeys.list(params),
    queryFn: () => financeSalaryService.list(params),
  });
}

export function useFinanceSalary(id: string, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: financeSalaryKeys.detail(id),
    queryFn: () => financeSalaryService.getById(id),
    enabled: opts?.enabled ?? !!id,
  });
}

export function useCreateFinanceSalary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SalaryStructureInput) => financeSalaryService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeSalaryKeys.lists() });
    },
  });
}

export function useUpdateFinanceSalary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SalaryStructureInput }) =>
      financeSalaryService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: financeSalaryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: financeSalaryKeys.detail(id) });
    },
  });
}

export function useDeleteFinanceSalary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeSalaryService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeSalaryKeys.lists() });
    },
  });
}

export function useApproveFinanceSalary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeSalaryService.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeSalaryKeys.lists() });
    },
  });
}
