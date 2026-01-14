"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { companyService } from "../services/organization-service";
import type {
  ListCompaniesParams,
  CreateCompanyData,
  UpdateCompanyData,
  ApproveCompanyData,
} from "../types";

export const companyKeys = {
  all: ["companies"] as const,
  lists: () => [...companyKeys.all, "list"] as const,
  list: (params?: ListCompaniesParams) =>
    [...companyKeys.lists(), params] as const,
  details: () => [...companyKeys.all, "detail"] as const,
  detail: (id: string) => [...companyKeys.details(), id] as const,
};

export function useCompanies(params?: ListCompaniesParams) {
  return useQuery({
    queryKey: companyKeys.list(params),
    queryFn: () => companyService.list(params),
  });
}

export function useCompany(id: string) {
  return useQuery({
    queryKey: companyKeys.detail(id),
    queryFn: () => companyService.getById(id),
    enabled: !!id,
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCompanyData) => companyService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCompanyData }) =>
      companyService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: companyKeys.detail(variables.id),
      });
    },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => companyService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
    },
  });
}

// Submit company for approval
export function useSubmitCompanyForApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => companyService.submitForApproval(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: companyKeys.detail(id),
      });
    },
  });
}

// Approve or reject company
export function useApproveCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ApproveCompanyData }) =>
      companyService.approve(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: companyKeys.detail(variables.id),
      });
    },
  });
}
