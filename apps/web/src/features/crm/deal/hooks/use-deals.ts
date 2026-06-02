import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dealService } from "../services/deal-service";
import { activityKeys } from "../../activity/hooks/use-activities";
import type {
  Deal,
  DealListParams,
  DealsByStageParams,
  CreateDealData,
  UpdateDealData,
  MoveDealStageData,
  ConvertToQuotationRequest,
  DealProductItem,
  ApiResponse,
} from "../types";
import type { LeadProductItem } from "@/features/crm/lead/types";

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
  productItems: (id: string) => [...dealKeys.all, "product-items", id] as const,
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
    staleTime: 30 * 1000,
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
    staleTime: 60 * 1000,
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
    onMutate: async ({ id, data }) => {
      const previousProductItems = qc.getQueryData<ApiResponse<LeadProductItem[]>>(
        dealKeys.productItems(id),
      );

      if (!data.items) {
        return { previousProductItems, previousQueries: null };
      }

      await qc.cancelQueries({ queryKey: dealKeys.productItems(id) });
      await qc.cancelQueries({ queryKey: dealKeys.byStage() });

      const previousQueries = qc.getQueriesData<ApiResponse<Deal[]>>({
        queryKey: dealKeys.byStage(),
      });

      // --- Optimistic update: Product Items cache ---
      const cachedItems = previousProductItems?.data ?? [];
      const cachedByKey = new Map(
        cachedItems.map((item) => [
          item.product_id ?? `${item.product_name}::${item.product_sku}`,
          item,
        ]),
      );

      const now = new Date().toISOString();
      const optimisticProductItems: LeadProductItem[] = data.items.map((item, index) => {
        const cacheKey = item.product_id ?? `${item.product_name}::${item.product_sku ?? ""}`;
        const previous = cachedByKey.get(cacheKey);
        const leadId = previous?.lead_id ?? cachedItems[0]?.lead_id ?? "";

        return {
          id: previous?.id ?? `optimistic-${id}-${index}`,
          lead_id: leadId,
          product_id: item.product_id ?? null,
          product_name: item.product_name,
          product_sku: item.product_sku ?? "",
          interest_level: previous?.interest_level ?? 0,
          quantity: item.quantity,
          unit_price: item.unit_price,
          notes: item.notes ?? "",
          source_visit_report_id: previous?.source_visit_report_id ?? null,
          last_survey_answers: previous?.last_survey_answers ?? null,
          is_deleted: previous?.is_deleted ?? false,
          created_at: previous?.created_at ?? now,
        };
      });

      qc.setQueryData<ApiResponse<LeadProductItem[]>>(dealKeys.productItems(id), {
        ...(previousProductItems ?? { success: true, data: [] }),
        data: optimisticProductItems,
      });

      // --- Optimistic update: By-Stage Kanban caches ---
      // Compute the optimistically expected deal value from items
      const optimisticValue = data.items.reduce((sum, item) => {
        const price = Number(item.unit_price) || 0;
        const qty = Number(item.quantity) || 1;
        const lineTotal = price * qty;
        const discountPct = Number(item.discount_percent) || 0;
        const discountAmt = Number(item.discount_amount) || 0;
        const discount = discountPct ? lineTotal * (discountPct / 100) : discountAmt;
        const subtotal = lineTotal - discount;
        return sum + (isFinite(subtotal) ? subtotal : 0);
      }, 0);

      const optimisticDealItems: DealProductItem[] = data.items.map((item, index) => {
        const price = Number(item.unit_price) || 0;
        const qty = Number(item.quantity) || 1;
        const lineTotal = price * qty;
        const discountPct = Number(item.discount_percent) || 0;
        const discountAmt = Number(item.discount_amount) || 0;
        const discount = discountPct ? lineTotal * (discountPct / 100) : discountAmt;

        return {
          id: `optimistic-${id}-${index}`,
          deal_id: id,
          product_id: item.product_id || null,
          product_name: item.product_name,
          product_sku: item.product_sku ?? "",
          unit_price: price,
          quantity: qty,
          discount_percent: discountPct,
          discount_amount: discountAmt,
          subtotal: lineTotal - discount,
          notes: item.notes ?? "",
          interest_level: 0,
          is_deleted: false,
        };
      });

      for (const [queryKey, cache] of previousQueries) {
        if (!cache?.data) continue;
        const dealIndex = cache.data.findIndex((d: Deal) => d.id === id);
        if (dealIndex === -1) continue;

        const updatedDeals = [...cache.data];
        const existingDeal = updatedDeals[dealIndex]!;
        updatedDeals[dealIndex] = {
          ...existingDeal,
          value: optimisticValue,
          items: optimisticDealItems,
          probability: data.pipeline_stage_id
            ? existingDeal.probability
            : existingDeal.probability,
        } as Deal;

        qc.setQueryData<ApiResponse<Deal[]>>(queryKey, {
          ...cache,
          data: updatedDeals,
        });
      }

      return { previousProductItems, previousQueries };
    },
    onError: (_error, { id }, context) => {
      if (context?.previousProductItems) {
        qc.setQueryData(dealKeys.productItems(id), context.previousProductItems);
      }
      if (context?.previousQueries) {
        for (const [queryKey, data] of context.previousQueries) {
          qc.setQueryData(queryKey, data);
        }
      }
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: dealKeys.detail(id) });
      qc.invalidateQueries({ queryKey: dealKeys.byStage() });
      qc.invalidateQueries({ queryKey: dealKeys.lists() });
      qc.invalidateQueries({ queryKey: dealKeys.summary() });
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

      // Invalidate deal activity timeline so the new pipeline stage activity is visible.
      qc.invalidateQueries({
        queryKey: activityKeys.all,
        predicate: (query) => {
          const key = query.queryKey as unknown[];
          // Match timeline queries for this deal (any page).
          if (key[0] !== "crm-activities" || key[1] !== "timeline") return false;
          const params = key[2] as Record<string, unknown> | undefined;
          return params?.deal_id === id;
        },
      });

      // Also invalidate activity timeline for the linked lead, if available in cache.
      const cachedDeal = qc.getQueryData<{ data?: { lead_id?: string } }>(dealKeys.detail(id));
      const leadId = cachedDeal?.data?.lead_id;
      if (leadId) {
        qc.invalidateQueries({
          queryKey: activityKeys.all,
          predicate: (query) => {
            const key = query.queryKey as unknown[];
            if (key[0] !== "crm-activities" || key[1] !== "timeline") return false;
            const params = key[2] as Record<string, unknown> | undefined;
            return params?.lead_id === leadId;
          },
        });
      }
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

export function useSoftDeleteDealItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, itemId }: { dealId: string; itemId: string }) =>
      dealService.softDeleteItem(dealId, itemId),
    onSuccess: (_result, { dealId }) => {
      qc.invalidateQueries({ queryKey: dealKeys.detail(dealId) });
    },
  });
}

export function useRestoreDealItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, itemId }: { dealId: string; itemId: string }) =>
      dealService.restoreItem(dealId, itemId),
    onSuccess: (_result, { dealId }) => {
      qc.invalidateQueries({ queryKey: dealKeys.detail(dealId) });
    },
  });
}

export function useDealProductItems(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: dealKeys.productItems(id),
    queryFn: () => dealService.getProductItems(id),
    enabled: (options?.enabled ?? true) && !!id,
    staleTime: 2 * 1000,
  });
}

export function useRecoverDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dealService.recover(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dealKeys.byStage() });
      qc.invalidateQueries({ queryKey: dealKeys.lists() });
      qc.invalidateQueries({ queryKey: dealKeys.summary() });
    },
  });
}
