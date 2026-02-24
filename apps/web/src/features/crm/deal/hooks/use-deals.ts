import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dealService } from "../services/deal-service";
import type {
  DealListParams,
  DealsByStageParams,
  CreateDealData,
  UpdateDealData,
  MoveDealStageData,
} from "../types";

const QUERY_KEY = "crm-deals";

export const dealKeys = {
  all: [QUERY_KEY] as const,
  lists: () => [...dealKeys.all, "list"] as const,
  list: (params: DealListParams) => [...dealKeys.lists(), params] as const,
  details: () => [...dealKeys.all, "detail"] as const,
  detail: (id: string) => [...dealKeys.details(), id] as const,
  byStage: () => [...dealKeys.all, "by-stage"] as const,
  byStageParams: (params: DealsByStageParams) =>
    [...dealKeys.byStage(), params] as const,
  history: (id: string) => [...dealKeys.all, "history", id] as const,
  formData: () => [...dealKeys.all, "form-data"] as const,
  summary: () => [...dealKeys.all, "summary"] as const,
  forecast: () => [...dealKeys.all, "forecast"] as const,
};

export function useDeals(params?: DealListParams) {
  return useQuery({
    queryKey: dealKeys.list(params ?? {}),
    queryFn: () => dealService.list(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDealById(id: string) {
  return useQuery({
    queryKey: dealKeys.detail(id),
    queryFn: () => dealService.getById(id),
    enabled: !!id,
  });
}

export function useDealsByStage(params: DealsByStageParams) {
  return useQuery({
    queryKey: dealKeys.byStageParams(params),
    queryFn: () => dealService.listByStage(params),
    enabled: !!params.stage_id,
    staleTime: 3 * 60 * 1000,
  });
}

export function useDealHistory(id: string) {
  return useQuery({
    queryKey: dealKeys.history(id),
    queryFn: () => dealService.getHistory(id),
    select: (res) => res.data,
    enabled: !!id,
  });
}

export function useDealFormData(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: dealKeys.formData(),
    queryFn: () => dealService.getFormData(),
    select: (res) => res.data,
    staleTime: 10 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function usePipelineSummary() {
  return useQuery({
    queryKey: dealKeys.summary(),
    queryFn: () => dealService.getPipelineSummary(),
    select: (res) => res.data,
    staleTime: 2 * 60 * 1000,
  });
}

export function useDealForecast() {
  return useQuery({
    queryKey: dealKeys.forecast(),
    queryFn: () => dealService.getForecast(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDealData) => dealService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dealKeys.all });
    },
  });
}

export function useUpdateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDealData }) =>
      dealService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dealKeys.all });
    },
  });
}

export function useDeleteDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dealService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dealKeys.all });
    },
  });
}

export function useMoveDealStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MoveDealStageData }) =>
      dealService.moveStage(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dealKeys.all });
    },
  });
}
