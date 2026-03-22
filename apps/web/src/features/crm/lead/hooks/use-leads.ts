import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { leadService } from "../services/lead-service";
import { activityKeys } from "../../activity/hooks/use-activities";
import type { LeadListParams, CreateLeadData, UpdateLeadData, ConvertLeadData, BulkUpsertLeadRequest } from "../types";

const QUERY_KEY = "crm-leads";

export const leadKeys = {
  all: [QUERY_KEY] as const,
  lists: () => [...leadKeys.all, "list"] as const,
  list: (params: LeadListParams) => [...leadKeys.lists(), params] as const,
  details: () => [...leadKeys.all, "detail"] as const,
  detail: (id: string) => [...leadKeys.details(), id] as const,
  formData: () => [...leadKeys.all, "form-data"] as const,
  analytics: () => [...leadKeys.all, "analytics"] as const,
  productItems: (id: string) => [...leadKeys.all, "product-items", id] as const,
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

export function useLeadProductItems(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: leadKeys.productItems(id),
    queryFn: () => leadService.getProductItems(id),
    enabled: (options?.enabled ?? true) && !!id,
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
    onError: (error, variables) => {
      if (process.env.NODE_ENV !== "production") {
        if (isAxiosError(error)) {
          console.debug("[crm:lead-mutation] update failed", {
            id: variables.id,
            status: error.response?.status ?? null,
            data: error.response?.data ?? null,
            message: error.message,
          });
        } else {
          console.debug("[crm:lead-mutation] update failed", {
            id: variables.id,
            error,
          });
        }
      }
    },
    onSuccess: (_data, { id }) => {
      // Keep lead list/detail in sync.
      qc.invalidateQueries({ queryKey: leadKeys.all });
      // Ensure activity timeline updates immediately after a lead status/details change.
      qc.invalidateQueries({
        queryKey: activityKeys.all,
        predicate: (query) => {
          const key = query.queryKey as unknown[];
          // Match timeline queries for this lead (any page).
          return (
            key[0] === "crm-activities" &&
            key[1] === "timeline" &&
            (key[2] as Record<string, unknown> | undefined)?.lead_id === id
          );
        },
      });
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

export function useBulkUpsertLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkUpsertLeadRequest) => leadService.bulkUpsert(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leadKeys.all });
    },
  });
}
