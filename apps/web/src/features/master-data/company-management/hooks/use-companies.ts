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
    onMutate: async (newCompany) => {
      await queryClient.cancelQueries({ queryKey: ["companies"] });
      const previousCompanies = queryClient.getQueriesData({ queryKey: ["companies"] });
      queryClient.setQueriesData({ queryKey: ["companies"] }, (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: {
            ...old.data,
            data: [
              { id: Date.now(), ...newCompany, approved: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
              ...(old.data.data || []),
            ],
            meta: {
              ...old.data.meta,
              pagination: { ...old.data.meta?.pagination, total: (old.data.meta?.pagination?.total || 0) + 1 },
            },
          },
        };
      });
      return { previousCompanies };
    },
    onError: (err, newCompany, context) => {
      if (context?.previousCompanies) {
        context.previousCompanies.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
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
    onMutate: async ({ id, data: updateData }) => {
      await queryClient.cancelQueries({ queryKey: ["companies"] });
      await queryClient.cancelQueries({ queryKey: ["companies", id] });
      const previousCompanies = queryClient.getQueriesData({ queryKey: ["companies"] });
      const previousCompany = queryClient.getQueryData(["companies", id]);
      queryClient.setQueriesData({ queryKey: ["companies"] }, (old: any) => {
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
      queryClient.setQueryData(["companies", id], (old: any) => {
        if (!old?.data) return old;
        return { ...old, data: { ...old.data, ...updateData, updated_at: new Date().toISOString() } };
      });
      return { previousCompanies, previousCompany };
    },
    onError: (err, variables, context) => {
      if (context?.previousCompanies) {
        context.previousCompanies.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousCompany) {
        queryClient.setQueryData(["companies", variables.id], context.previousCompany);
      }
    },
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
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["companies"] });
      const previousCompanies = queryClient.getQueriesData({ queryKey: ["companies"] });
      queryClient.setQueriesData({ queryKey: ["companies"] }, (old: any) => {
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
      return { previousCompanies };
    },
    onError: (err, id, context) => {
      if (context?.previousCompanies) {
        context.previousCompanies.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
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

