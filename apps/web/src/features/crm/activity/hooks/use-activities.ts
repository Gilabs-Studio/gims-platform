import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { activityService } from "../services/activity-service";
import type { Activity, ActivityListParams, CreateActivityData } from "../types";

const TIMELINE_PER_PAGE = 10;

/**
 * Progressive infinite-scroll hook for the lead activity timeline.
 * Fetches page 1 via useQuery; subsequent pages are loaded manually
 * via fetchMore(), intended to be triggered by an IntersectionObserver sentinel.
 */
export function useLeadActivityTimeline(leadId: string) {
  const baseParams: ActivityListParams = {
    lead_id: leadId,
    per_page: TIMELINE_PER_PAGE,
    sort_by: "timestamp",
    sort_dir: "desc",
  };

  const page1Query = useQuery({
    queryKey: activityKeys.timeline({ ...baseParams, page: 1 }),
    queryFn: () => activityService.timeline({ ...baseParams, page: 1 }),
    enabled: !!leadId,
    staleTime: 2 * 60 * 1000,
  });

  const [extraActivities, setExtraActivities] = useState<Activity[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreState, setHasMoreState] = useState<boolean | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Derive hasMore: use paginated meta when available
  const page1HasNext = page1Query.data?.meta?.pagination?.has_next ?? false;
  const hasMore = currentPage > 1 ? (hasMoreState ?? false) : page1HasNext;

  // Deduplicated merged list (page 1 + extra pages)
  const allActivities = (() => {
    const page1 = page1Query.data?.data ?? [];
    const seen = new Set<string>();
    const result: Activity[] = [];
    for (const a of [...page1, ...extraActivities]) {
      if (!seen.has(a.id)) {
        seen.add(a.id);
        result.push(a);
      }
    }
    return result;
  })();

  const fetchMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    const nextPage = currentPage + 1;
    setIsLoadingMore(true);

    try {
      const res = await activityService.timeline({
        ...baseParams,
        page: nextPage,
      });
      const newActivities = res.data ?? [];
      const pagination = res.meta?.pagination;
      const more = pagination ? pagination.has_next : newActivities.length === TIMELINE_PER_PAGE;

      setExtraActivities((prev) => [...prev, ...newActivities]);
      setCurrentPage(nextPage);
      setHasMoreState(more);
    } finally {
      setIsLoadingMore(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingMore, hasMore, currentPage, leadId]);

  const refetch = useCallback(() => {
    setExtraActivities([]);
    setCurrentPage(1);
    setHasMoreState(null);
    return page1Query.refetch();
  }, [page1Query]);

  return {
    activities: allActivities,
    isLoading: page1Query.isLoading,
    isError: page1Query.isError,
    isLoadingMore,
    hasMore,
    fetchMore,
    refetch,
  };
}

export function useDealActivityTimeline(dealId: string, leadId?: string) {
  const baseParams: ActivityListParams = {
    deal_id: dealId,
    // When a source lead is linked, pass its ID so the backend returns activities
    // for either the deal OR the lead in a single cross-linked timeline (OR query).
    ...(leadId ? { lead_id: leadId } : {}),
    per_page: TIMELINE_PER_PAGE,
    sort_by: "timestamp",
    sort_dir: "desc",
  };

  const page1Query = useQuery({
    queryKey: activityKeys.timeline({ ...baseParams, page: 1 }),
    queryFn: () => activityService.timeline({ ...baseParams, page: 1 }),
    enabled: !!dealId,
    staleTime: 2 * 60 * 1000,
  });

  const [extraActivities, setExtraActivities] = useState<Activity[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreState, setHasMoreState] = useState<boolean | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const page1HasNext = page1Query.data?.meta?.pagination?.has_next ?? false;
  const hasMore = currentPage > 1 ? (hasMoreState ?? false) : page1HasNext;

  const allActivities = (() => {
    const page1 = page1Query.data?.data ?? [];
    const seen = new Set<string>();
    const result: Activity[] = [];
    for (const a of [...page1, ...extraActivities]) {
      if (!seen.has(a.id)) {
        seen.add(a.id);
        result.push(a);
      }
    }
    return result;
  })();

  const fetchMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    const nextPage = currentPage + 1;
    setIsLoadingMore(true);

    try {
      const res = await activityService.timeline({
        ...baseParams,
        page: nextPage,
      });
      const newActivities = res.data ?? [];
      const pagination = res.meta?.pagination;
      const more = pagination ? pagination.has_next : newActivities.length === TIMELINE_PER_PAGE;

      setExtraActivities((prev) => [...prev, ...newActivities]);
      setCurrentPage(nextPage);
      setHasMoreState(more);
    } finally {
      setIsLoadingMore(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingMore, hasMore, currentPage, dealId, leadId]);

  const refetch = useCallback(() => {
    setExtraActivities([]);
    setCurrentPage(1);
    setHasMoreState(null);
    return page1Query.refetch();
  }, [page1Query]);

  return {
    activities: allActivities,
    isLoading: page1Query.isLoading,
    isError: page1Query.isError,
    isLoadingMore,
    hasMore,
    fetchMore,
    refetch,
    totalCount: page1Query.data?.meta?.pagination?.total ?? allActivities.length,
  };
}

const QUERY_KEY = "crm-activities";

export const activityKeys = {
  all: [QUERY_KEY] as const,
  lists: () => [...activityKeys.all, "list"] as const,
  list: (params: ActivityListParams) => [...activityKeys.lists(), params] as const,
  details: () => [...activityKeys.all, "detail"] as const,
  detail: (id: string) => [...activityKeys.details(), id] as const,
  timeline: (params: ActivityListParams) => [...activityKeys.all, "timeline", params] as const,
};

export function useActivities(params?: ActivityListParams) {
  return useQuery({
    queryKey: activityKeys.list(params ?? {}),
    queryFn: () => activityService.list(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useActivityById(id: string) {
  return useQuery({
    queryKey: activityKeys.detail(id),
    queryFn: () => activityService.getById(id),
    enabled: !!id,
  });
}

export function useActivityTimeline(params?: ActivityListParams) {
  return useQuery({
    queryKey: activityKeys.timeline(params ?? {}),
    queryFn: () => activityService.timeline(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateActivityData) => activityService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: activityKeys.all });
    },
  });
}

export function useMyActivities(params?: ActivityListParams) {
  return useQuery({
    queryKey: [...activityKeys.all, "my-activities", params] as const,
    queryFn: () => activityService.myActivities(params),
    staleTime: 2 * 60 * 1000,
  });
}
