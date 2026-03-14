"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { financeSalaryService } from "../services/finance-salary-service";
import type { ListSalaryParams, SalaryStructureInput } from "../types";

export const financeSalaryKeys = {
  all: ["finance-salary"] as const,
  lists: () => [...financeSalaryKeys.all, "list"] as const,
  list: (params?: ListSalaryParams) => [...financeSalaryKeys.lists(), params] as const,
  detail: (id: string) => [...financeSalaryKeys.all, "detail", id] as const,
  groups: (params?: ListSalaryParams) => [...financeSalaryKeys.all, "grouped", params] as const,
  stats: () => [...financeSalaryKeys.all, "stats"] as const,
  formData: () => [...financeSalaryKeys.all, "form-data"] as const,
};

export function useFinanceSalaryList(params?: ListSalaryParams) {
  return useQuery({
    queryKey: financeSalaryKeys.list(params),
    queryFn: () => financeSalaryService.list(params),
  });
}

export function useFinanceSalaryGroups(params?: ListSalaryParams) {
  return useQuery({
    queryKey: financeSalaryKeys.groups(params),
    queryFn: () => financeSalaryService.getGrouped(params),
  });
}

export function useFinanceSalaryStats() {
  return useQuery({
    queryKey: financeSalaryKeys.stats(),
    queryFn: () => financeSalaryService.getStats(),
    staleTime: 60_000,
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
      queryClient.invalidateQueries({ queryKey: financeSalaryKeys.all });
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
      queryClient.invalidateQueries({ queryKey: financeSalaryKeys.all });
    },
  });
}

export function useDeleteFinanceSalary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeSalaryService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeSalaryKeys.all });
    },
  });
}

export function useApproveFinanceSalary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeSalaryService.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeSalaryKeys.all });
    },
  });
}

export function useToggleFinanceSalaryStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeSalaryService.toggleStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeSalaryKeys.all });
    },
  });
}

export function useFinanceSalaryFormData() {
  return useQuery({
    queryKey: financeSalaryKeys.formData(),
    queryFn: () => financeSalaryService.getFormData(),
    staleTime: 5 * 60_000,
  });
}
