"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { companyService } from "../services/company-service";
import type { CreateCompanyFormData, UpdateCompanyFormData } from "../schemas/company.schema";

export function useCompanies(params?: {
  page?: number;
  limit?: number;
  search?: string;
  searchBy?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}) {
  return useQuery({
    queryKey: ["companies", params],
    queryFn: () => companyService.list(params),
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

export function useCompany(id: number | null) {
  return useQuery({
    queryKey: ["companies", id],
    queryFn: () => companyService.getById(id!),
    enabled: !!id,
  });
}

export function useCompanyAddData() {
  return useQuery({
    queryKey: ["companies", "add-data"],
    queryFn: () => companyService.getAddData(),
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCompanyFormData) => companyService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCompanyFormData }) =>
      companyService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["companies", variables.id] });
    },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => companyService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}

export function useApproveCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => companyService.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}

export function useApproveAllCompanies() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => companyService.approveAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}

export function useExportCompanies(params?: {
  page?: number;
  limit?: number;
  search?: string;
  searchBy?: string;
}) {
  return useMutation({
    mutationFn: () => companyService.export(params),
  });
}

export function useDownloadCompanyTemplate() {
  return useMutation({
    mutationFn: () => companyService.downloadTemplate(),
  });
}

export function useImportCompanies() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => companyService.import(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}

