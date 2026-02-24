"use client";

import { useCallback, useMemo, useState } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useDealFormData, dealKeys } from "./use-deals";
import { dealService } from "../services/deal-service";
import type { Deal, DealPipelineStageOption } from "../types";

interface StageState {
  extraDeals: Deal[];
  currentPage: number;
  hasMore: boolean;
  isLoadingMore: boolean;
}

const PER_PAGE = 10;

/**
 * Progressive loading hook for Kanban board.
 * Fetches page 1 for each stage via useQuery, then supports
 * incremental loading (fetchNextPageForStage) via IntersectionObserver.
 */
export function useProgressiveKanbanBoard() {
  const { data: formData, isLoading: isLoadingFormData } = useDealFormData();
  const qc = useQueryClient();

  // Sorted, active stages
  const stages: DealPipelineStageOption[] = useMemo(() => {
    if (!formData?.pipeline_stages) return [];
    return [...formData.pipeline_stages].sort(
      (a, b) => a.order - b.order
    );
  }, [formData]);

  // Extra state for progressive loading beyond page 1
  const [stageStates, setStageStates] = useState<Record<string, StageState>>(
    {}
  );

  // Fetch page 1 for each stage using useQueries (avoids hook-in-loop violation)
  const stageQueryResults = useQueries({
    queries: stages.map((stage) => ({
      queryKey: dealKeys.byStageParams({ stage_id: stage.id, page: 1, per_page: PER_PAGE }),
      queryFn: () => dealService.listByStage({ stage_id: stage.id, page: 1, per_page: PER_PAGE }),
      enabled: !!stage.id,
      staleTime: 3 * 60 * 1000,
    })),
  });

  const stageQueries = stages.map((stage, index) => ({
    stage,
    query: stageQueryResults[index]!,
  }));

  // Merge page 1 data + extra pages, deduplicate by ID
  const dealsByStage = useMemo(() => {
    const result: Record<
      string,
      { deals: Deal[]; total: number; isLoading: boolean }
    > = {};

    for (const { stage, query } of stageQueries) {
      const page1Deals = query.data?.data ?? [];
      const total = query.data?.meta?.pagination?.total ?? 0;
      const extra = stageStates[stage.id]?.extraDeals ?? [];

      // Deduplicate by ID
      const seen = new Set<string>();
      const merged: Deal[] = [];
      for (const deal of [...page1Deals, ...extra]) {
        if (!seen.has(deal.id)) {
          seen.add(deal.id);
          merged.push(deal);
        }
      }

      result[stage.id] = {
        deals: merged,
        total,
        isLoading: query.isLoading,
      };
    }

    return result;
  }, [stageQueries, stageStates]);

  // Whether a stage has more deals to load
  const hasMoreForStage = useCallback(
    (stageId: string) => {
      const state = stageStates[stageId];
      const stageData = dealsByStage[stageId];
      if (!stageData) return false;
      if (state?.hasMore === false) return false;
      return stageData.deals.length < stageData.total;
    },
    [stageStates, dealsByStage]
  );

  // Whether a stage is currently loading more
  const isLoadingMoreForStage = useCallback(
    (stageId: string) => stageStates[stageId]?.isLoadingMore ?? false,
    [stageStates]
  );

  // Fetch next page for a specific stage (called by IntersectionObserver)
  const fetchNextPageForStage = useCallback(
    async (stageId: string) => {
      const currentState = stageStates[stageId];
      if (currentState?.isLoadingMore) return;

      const nextPage = (currentState?.currentPage ?? 1) + 1;

      setStageStates((prev) => ({
        ...prev,
        [stageId]: {
          ...(prev[stageId] ?? {
            extraDeals: [],
            currentPage: 1,
            hasMore: true,
            isLoadingMore: false,
          }),
          isLoadingMore: true,
        },
      }));

      try {
        const res = await dealService.listByStage({
          stage_id: stageId,
          page: nextPage,
          per_page: PER_PAGE,
        });

        const newDeals = res.data ?? [];
        const pagination = res.meta?.pagination;
        const hasMore = pagination ? pagination.has_next : newDeals.length === PER_PAGE;

        setStageStates((prev) => {
          const prevExtra = prev[stageId]?.extraDeals ?? [];
          return {
            ...prev,
            [stageId]: {
              extraDeals: [...prevExtra, ...newDeals],
              currentPage: nextPage,
              hasMore,
              isLoadingMore: false,
            },
          };
        });
      } catch {
        setStageStates((prev) => ({
          ...prev,
          [stageId]: {
            ...(prev[stageId] ?? {
              extraDeals: [],
              currentPage: 1,
              hasMore: true,
              isLoadingMore: false,
            }),
            isLoadingMore: false,
          },
        }));
      }
    },
    [stageStates]
  );

  // Reset progressive loading state without triggering query invalidation.
  // Used after mutations that already handle their own invalidation.
  const resetExtraPages = useCallback(() => {
    setStageStates({});
  }, []);

  // Invalidate all deal queries and reset extra-page state (full reset).
  const invalidateAll = useCallback(() => {
    setStageStates({});
    qc.invalidateQueries({ queryKey: dealKeys.byStage() });
    qc.invalidateQueries({ queryKey: dealKeys.summary() });
  }, [qc]);

  const isLoading =
    isLoadingFormData || stageQueries.some((sq) => sq.query.isLoading);

  return {
    stages,
    dealsByStage,
    isLoading,
    hasMoreForStage,
    isLoadingMoreForStage,
    fetchNextPageForStage,
    resetExtraPages,
    invalidateAll,
  };
}
