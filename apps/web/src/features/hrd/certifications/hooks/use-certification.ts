"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { certificationService } from "../services/certification-service";
import type {
  ListCertificationsParams,
  CreateCertificationData,
  UpdateCertificationData,
  ExpiringCertificationsParams,
} from "../types";

// Query keys
export const certificationKeys = {
  all: ["employee-certifications"] as const,
  lists: () => [...certificationKeys.all, "list"] as const,
  list: (params?: ListCertificationsParams) =>
    [...certificationKeys.lists(), params] as const,
  details: () => [...certificationKeys.all, "detail"] as const,
  detail: (id: string) => [...certificationKeys.details(), id] as const,
  formData: () => [...certificationKeys.all, "form-data"] as const,
  expiring: (params?: ExpiringCertificationsParams) =>
    [...certificationKeys.all, "expiring", params] as const,
};

// List certifications hook with filters
export function useCertifications(params?: ListCertificationsParams) {
  return useQuery({
    queryKey: certificationKeys.list(params),
    queryFn: () => certificationService.list(params),
  });
}

// Get certification by ID hook
export function useCertification(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: certificationKeys.detail(id),
    queryFn: () => certificationService.getById(id),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}

// Get certification form data
export function useCertificationFormData() {
  return useQuery({
    queryKey: certificationKeys.formData(),
    queryFn: () => certificationService.getFormData(),
    staleTime: 5 * 60 * 1000,
  });
}

// Get expiring certifications
export function useExpiringCertifications(params?: ExpiringCertificationsParams) {
  return useQuery({
    queryKey: certificationKeys.expiring(params),
    queryFn: () => certificationService.getExpiring(params),
  });
}

// Create certification mutation
export function useCreateCertification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCertificationData) => certificationService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: certificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: certificationKeys.expiring() });
    },
  });
}

// Update certification mutation
export function useUpdateCertification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCertificationData }) =>
      certificationService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: certificationKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: certificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: certificationKeys.expiring() });
    },
  });
}

// Delete certification mutation
export function useDeleteCertification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => certificationService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: certificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: certificationKeys.expiring() });
    },
  });
}
