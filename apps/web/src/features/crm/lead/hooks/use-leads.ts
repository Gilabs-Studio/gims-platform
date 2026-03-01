import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { leadService } from "../services/lead-service";
import type { LeadListParams, CreateLeadData, UpdateLeadData, ConvertLeadData } from "../types";

const QUERY_KEY = "crm-leads";

export const leadKeys = {
  all: [QUERY_KEY] as const,
  lists: () => [...leadKeys.all, "list"] as const,
  list: (params: LeadListParams) => [...leadKeys.lists(), params] as const,
  details: () => [...leadKeys.all, "detail"] as const,
  detail: (id: string) => [...leadKeys.details(), id] as const,
  formData: () => [...leadKeys.all, "form-data"] as const,
  analytics: () => [...leadKeys.all, "analytics"] as const,
};

export function useLeads(params?: LeadListParams) {
  return useQuery({
    queryKey: leadKeys.list(params ?? {}),
    queryFn: () => leadService.list(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useLeadById(id: string) {
  return useQuery({
    queryKey: leadKeys.detail(id),
    queryFn: () => leadService.getById(id),
    enabled: !!id,
  });
}

export function useLeadFormData(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: leadKeys.formData(),
    queryFn: () => leadService.getFormData(),
    staleTime: 10 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useLeadAnalytics() {
  return useQuery({
    queryKey: leadKeys.analytics(),
    queryFn: () => leadService.getAnalytics(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLeadData) => leadService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leadKeys.all });
    },
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLeadData }) =>
      leadService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leadKeys.all });
    },
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => leadService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leadKeys.all });
    },
  });
}

export function useConvertLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ConvertLeadData }) =>
      leadService.convert(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leadKeys.all });
    },
  });
}
