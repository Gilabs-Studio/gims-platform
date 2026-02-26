import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dealService } from "../services/deal-service";
import type {
  Deal,
  DealListParams,
  DealsByStageParams,
  CreateDealData,
  UpdateDealData,
  MoveDealStageData,
  ConvertToQuotationRequest,
  ApiResponse,
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
  stockCheck: (id: string) => [...dealKeys.all, "stock-check", id] as const,
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
      qc.invalidateQueries({ queryKey: dealKeys.byStage() });
      qc.invalidateQueries({ queryKey: dealKeys.lists() });
      qc.invalidateQueries({ queryKey: dealKeys.summary() });
    },
  });
}

export function useUpdateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDealData }) =>
      dealService.update(id, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: dealKeys.detail(id) });
      qc.invalidateQueries({ queryKey: dealKeys.byStage() });
      qc.invalidateQueries({ queryKey: dealKeys.lists() });
    },
  });
}

export function useDeleteDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dealService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dealKeys.byStage() });
      qc.invalidateQueries({ queryKey: dealKeys.lists() });
      qc.invalidateQueries({ queryKey: dealKeys.summary() });
    },
  });
}

export function useMoveDealStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MoveDealStageData }) =>
      dealService.moveStage(id, data),

    // Optimistically move the deal card before the server responds.
    onMutate: async ({ id, data: moveData }) => {
      // Prevent in-flight fetches from overwriting our optimistic state.
      await qc.cancelQueries({ queryKey: dealKeys.byStage() });

      // Snapshot every cached by-stage page-1 query for rollback.
      const previousQueries = qc.getQueriesData<ApiResponse<Deal[]>>({
        queryKey: dealKeys.byStage(),
      });

      // Locate the deal and its current stage in the cached pages.
      let dealSnapshot: Deal | undefined;
      let sourceStageId: string | undefined;
      for (const [, cache] of previousQueries) {
        const found = cache?.data?.find((d) => d.id === id);
        if (found) {
          dealSnapshot = found;
          sourceStageId = found.pipeline_stage_id;
          break;
        }
      }

      if (dealSnapshot && sourceStageId) {
        for (const [queryKey, cache] of previousQueries) {
          if (!cache?.data) continue;
          // The stage_id is the last element of the query key tuple.
          const params = queryKey[queryKey.length - 1] as { stage_id?: string };
          if (!params?.stage_id) continue;

          if (params.stage_id === sourceStageId) {
            // Remove the deal from its current stage.
            qc.setQueryData<ApiResponse<Deal[]>>(queryKey, {
              ...cache,
              data: cache.data.filter((d) => d.id !== id),
              meta: cache.meta?.pagination
                ? {
                    ...cache.meta,
                    pagination: {
                      ...cache.meta.pagination,
                      total: Math.max(0, (cache.meta.pagination.total ?? 1) - 1),
                    },
                  }
                : cache.meta,
            });
          } else if (params.stage_id === moveData.to_stage_id) {
            // Insert the deal at the top of the target stage (pipeline_stage info
            // will be corrected on the subsequent invalidation).
            const optimisticDeal: Deal = {
              ...dealSnapshot,
              pipeline_stage_id: moveData.to_stage_id,
              pipeline_stage: null,
            };
            qc.setQueryData<ApiResponse<Deal[]>>(queryKey, {
              ...cache,
              data: [optimisticDeal, ...cache.data],
              meta: cache.meta?.pagination
                ? {
                    ...cache.meta,
                    pagination: {
                      ...cache.meta.pagination,
                      total: (cache.meta.pagination.total ?? 0) + 1,
                    },
                  }
                : cache.meta,
            });
          }
        }
      }

      return { previousQueries };
    },

    // Roll back to snapshots when the mutation fails.
    onError: (_err, _vars, context) => {
      if (context?.previousQueries) {
        for (const [queryKey, data] of context.previousQueries) {
          qc.setQueryData(queryKey, data);
        }
      }
    },

    // Only invalidate affected stages + summary — NOT dealKeys.all.
    // The kanban board's onSuccess callback handles resetting extra-page state;
    // duplicating invalidation here would double all network requests.
    onSuccess: (_result, { id, data: moveData }, context) => {
      const sourceStageId = context?.previousQueries
        ?.flatMap(([, cache]) => cache?.data ?? [])
        .find((d) => d.id === id)?.pipeline_stage_id;

      // Invalidate only the source and target stage caches
      qc.invalidateQueries({
        queryKey: dealKeys.byStage(),
        predicate: (query) => {
          const key = query.queryKey as unknown[];
          const params = key[key.length - 1] as { stage_id?: string } | undefined;
          if (!params?.stage_id) return false;
          return (
            params.stage_id === moveData.to_stage_id ||
            (!!sourceStageId && params.stage_id === sourceStageId)
          );
        },
      });
      qc.invalidateQueries({ queryKey: dealKeys.summary() });
      // Invalidate deal detail so the stage badge refreshes in modal/page header
      qc.invalidateQueries({ queryKey: dealKeys.detail(id) });
      // Invalidate history so reason & notes of the new entry are immediately visible
      qc.invalidateQueries({ queryKey: dealKeys.history(id) });
    },
  });
}

export function useConvertToQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: ConvertToQuotationRequest;
    }) => dealService.convertToQuotation(id, data),
    onSuccess: (_result, { id }) => {
      qc.invalidateQueries({ queryKey: dealKeys.detail(id) });
      qc.invalidateQueries({ queryKey: dealKeys.byStage() });
      qc.invalidateQueries({ queryKey: dealKeys.lists() });
      qc.invalidateQueries({ queryKey: dealKeys.summary() });
    },
  });
}

export function useStockCheck(dealId: string, enabled = false) {
  return useQuery({
    queryKey: dealKeys.stockCheck(dealId),
    queryFn: () => dealService.stockCheck(dealId),
    select: (res) => res.data,
    enabled: !!dealId && enabled,
    staleTime: 60 * 1000,
  });
}
