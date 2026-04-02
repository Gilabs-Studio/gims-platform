"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { applicantService } from "../services/applicant-service";
import { recruitmentKeys } from "./use-recruitment";
import type {
  ListApplicantsParams,
  ListApplicantsByStageParams,
  CreateApplicantData,
  UpdateApplicantData,
  MoveStageData,
  CreateActivityData,
  RecruitmentApplicant,
  ConvertApplicantToEmployeeData,
} from "../types";

// Query keys
export const applicantKeys = {
  all: ["applicants"] as const,
  lists: () => [...applicantKeys.all, "list"] as const,
  list: (params?: ListApplicantsParams) =>
    [...applicantKeys.lists(), params] as const,
  byStage: () => [...applicantKeys.all, "by-stage"] as const,
  byStageParams: (params?: ListApplicantsByStageParams) =>
    [...applicantKeys.byStage(), params] as const,
  details: () => [...applicantKeys.all, "detail"] as const,
  detail: (id: string) => [...applicantKeys.details(), id] as const,
  stages: () => [...applicantKeys.all, "stages"] as const,
  activities: (applicantId: string) =>
    [...applicantKeys.detail(applicantId), "activities"] as const,
  canConvert: (applicantId: string) =>
    [...applicantKeys.detail(applicantId), "can-convert"] as const,
};

// List applicants
export function useApplicants(params?: ListApplicantsParams) {
  return useQuery({
    queryKey: applicantKeys.list(params),
    queryFn: () => applicantService.list(params),
  });
}

// Get applicants by stage (for Kanban board)
export function useApplicantsByStage(params?: ListApplicantsByStageParams) {
  return useQuery({
    queryKey: applicantKeys.byStageParams(params),
    queryFn: () => applicantService.listByStage(params),
  });
}

// Get single applicant
export function useApplicant(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: applicantKeys.detail(id),
    queryFn: () => applicantService.getById(id),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}

// Get applicant stages
export function useApplicantStages() {
  return useQuery({
    queryKey: applicantKeys.stages(),
    queryFn: () => applicantService.getStages(),
  });
}

// Get applicant activities
export function useApplicantActivities(
  applicantId: string,
  page = 1,
  perPage = 20
) {
  return useQuery({
    queryKey: [...applicantKeys.activities(applicantId), { page, perPage }],
    queryFn: () => applicantService.getActivities(applicantId, page, perPage),
    enabled: !!applicantId,
  });
}

// Create applicant
export function useCreateApplicant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateApplicantData) => applicantService.create(data),
    onSuccess: (_, variables) => {
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: applicantKeys.lists() });
      // Invalidate by-stage for the recruitment request
      queryClient.invalidateQueries({
        queryKey: applicantKeys.byStageParams({
          recruitment_request_id: variables.recruitment_request_id,
        }),
      });
    },
  });
}

// Update applicant
export function useUpdateApplicant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateApplicantData;
    }) => applicantService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: applicantKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: applicantKeys.lists() });
      queryClient.invalidateQueries({ queryKey: applicantKeys.byStage() });
    },
  });
}

// Delete applicant
export function useDeleteApplicant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => applicantService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicantKeys.lists() });
      queryClient.invalidateQueries({ queryKey: applicantKeys.byStage() });
    },
  });
}

// Move applicant stage (with optimistic update)
export function useMoveApplicantStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: MoveStageData;
    }) => applicantService.moveStage(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: applicantKeys.byStage() });

      // Snapshot the previous value
      const previousByStage = queryClient.getQueriesData({
        queryKey: applicantKeys.byStage(),
      });

      // Optimistically update the cache
      // Structure: { success, data: { [stageId]: { applicants: [], total, ... } }, timestamp, request_id }
      queryClient.setQueriesData(
        { queryKey: applicantKeys.byStage() },
        (old: {
          data?: Record<string, { applicants: RecruitmentApplicant[]; total: number }>;
        } | undefined) => {
          if (!old?.data) return old;

          const newStages = { ...old.data };
          let movedApplicant: RecruitmentApplicant | null = null;
          let fromStageId: string | null = null;

          // Find and remove applicant from current stage
          for (const stageId in newStages) {
            const stage = newStages[stageId];
            if (!stage?.applicants) continue;

            const applicantIndex = stage.applicants.findIndex((a) => a.id === id);
            if (applicantIndex !== -1) {
              movedApplicant = stage.applicants[applicantIndex];
              fromStageId = stageId;

              // Remove from old stage
              stage.applicants = stage.applicants.filter((a) => a.id !== id);
              stage.total = Math.max(0, stage.total - 1);
              break;
            }
          }

          // Add to new stage if found
          if (movedApplicant && fromStageId && newStages[data.to_stage_id]) {
            newStages[data.to_stage_id].applicants.unshift({
              ...movedApplicant,
              stage_id: data.to_stage_id,
            });
            newStages[data.to_stage_id].total++;
          }

          return { ...old, data: newStages };
        }
      );

      return { previousByStage };
    },
    onError: (_, __, context) => {
      // Rollback on error
      if (context?.previousByStage) {
        context.previousByStage.forEach(([key, value]) => {
          queryClient.setQueryData(key, value);
        });
      }
    },
    onSettled: async (_data, _error, variables) => {
      // Always refetch after error or success
      await queryClient.invalidateQueries({ queryKey: applicantKeys.byStage() });
      // Invalidate all recruitment request queries to update filled_count and progress
      await queryClient.invalidateQueries({
        queryKey: recruitmentKeys.all,
        refetchType: 'all'
      });
    },
  });
}

// Add activity to applicant
export function useAddApplicantActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      applicantId,
      data,
    }: {
      applicantId: string;
      data: CreateActivityData;
    }) => applicantService.addActivity(applicantId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: applicantKeys.activities(variables.applicantId),
      });
    },
  });
}

// Progressive loading hook for Kanban board (similar to CRM deal)
import { useCallback, useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import type { ApplicantStage } from "../types";

interface StageState {
  extraApplicants: RecruitmentApplicant[];
  currentPage: number;
  hasMore: boolean;
  isLoadingMore: boolean;
}

const PER_PAGE = 10;

interface UseProgressiveApplicantKanbanProps {
  recruitmentRequestId?: string;
}

export function useProgressiveApplicantKanban({
  recruitmentRequestId,
}: UseProgressiveApplicantKanbanProps) {
  const { data: stagesData, isLoading: isLoadingStages } = useApplicantStages();
  const stages = useMemo(() => {
    if (!stagesData?.data) return [];
    return [...stagesData.data].sort((a, b) => a.order - b.order);
  }, [stagesData]);

  const qc = useQueryClient();

  // Extra state for progressive loading beyond page 1
  const [stageStates, setStageStates] = useState<Record<string, StageState>>(
    {}
  );

  // Fetch page 1 for each stage using useQueries
  const stageQueryResults = useQueries({
    queries: stages.map((stage) => ({
      queryKey: applicantKeys.byStageParams({
        stage_id: stage.id,
        recruitment_request_id: recruitmentRequestId,
        page: 1,
        per_page: PER_PAGE,
      }),
      queryFn: () =>
        applicantService.listByStage({
          stage_id: stage.id,
          recruitment_request_id: recruitmentRequestId,
          page: 1,
          per_page: PER_PAGE,
        }),
      enabled: !!stage.id,
      staleTime: 3 * 60 * 1000,
    })),
  });

  const stageQueries = stages.map((stage, index) => ({
    stage,
    query: stageQueryResults[index]!,
  }));

  // Merge page 1 data + extra pages, deduplicate by ID
  const applicantsByStage = useMemo(() => {
    const result: Record<
      string,
      {
        applicants: RecruitmentApplicant[];
        total: number;
        stage: ApplicantStage;
        isLoading: boolean;
      }
    > = {};

    for (const { stage, query } of stageQueries) {
      const stageData = query.data?.data?.[stage.id];
      const page1Applicants = stageData?.applicants ?? [];
      const total = stageData?.total ?? 0;
      const extra = stageStates[stage.id]?.extraApplicants ?? [];

      // Deduplicate by ID
      const seen = new Set<string>();
      const merged: RecruitmentApplicant[] = [];
      for (const applicant of [...page1Applicants, ...extra]) {
        if (!seen.has(applicant.id)) {
          seen.add(applicant.id);
          merged.push(applicant);
        }
      }

      result[stage.id] = {
        applicants: merged,
        total,
        stage,
        isLoading: query.isLoading,
      };
    }

    return result;
  }, [stageQueries, stageStates]);

  // Whether a stage has more applicants to load
  const hasMoreForStage = useCallback(
    (stageId: string) => {
      const state = stageStates[stageId];
      const stageData = applicantsByStage[stageId];
      if (!stageData) return false;
      if (state?.hasMore === false) return false;
      return stageData.applicants.length < stageData.total;
    },
    [stageStates, applicantsByStage]
  );

  // Whether a stage is currently loading more
  const isLoadingMoreForStage = useCallback(
    (stageId: string) => stageStates[stageId]?.isLoadingMore ?? false,
    [stageStates]
  );

  // Fetch next page for a specific stage
  const fetchNextPageForStage = useCallback(
    async (stageId: string) => {
      const currentState = stageStates[stageId];
      if (currentState?.isLoadingMore) return;

      const nextPage = (currentState?.currentPage ?? 1) + 1;

      setStageStates((prev) => ({
        ...prev,
        [stageId]: {
          ...(prev[stageId] ?? {
            extraApplicants: [],
            currentPage: 1,
            hasMore: true,
            isLoadingMore: false,
          }),
          isLoadingMore: true,
        },
      }));

      try {
        const res = await applicantService.listByStage({
          stage_id: stageId,
          recruitment_request_id: recruitmentRequestId,
          page: nextPage,
          per_page: PER_PAGE,
        });

        const stageData = res.data?.[stageId];
        const newApplicants = stageData?.applicants ?? [];
        const total = stageData?.total ?? 0;
        const hasMore = newApplicants.length === PER_PAGE;

        setStageStates((prev) => {
          const prevExtra = prev[stageId]?.extraApplicants ?? [];
          return {
            ...prev,
            [stageId]: {
              extraApplicants: [...prevExtra, ...newApplicants],
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
              extraApplicants: [],
              currentPage: 1,
              hasMore: true,
              isLoadingMore: false,
            }),
            isLoadingMore: false,
          },
        }));
      }
    },
    [stageStates, recruitmentRequestId]
  );

  // Reset progressive loading state
  const resetExtraPages = useCallback(() => {
    setStageStates({});
  }, []);

  // Invalidate all queries
  const invalidateAll = useCallback(() => {
    setStageStates({});
    qc.invalidateQueries({ queryKey: applicantKeys.byStage() });
  }, [qc]);

  const isLoading = isLoadingStages || stageQueries.some((sq) => sq.query.isLoading);

  return {
    stages,
    applicantsByStage,
    isLoading,
    hasMoreForStage,
    isLoadingMoreForStage,
    fetchNextPageForStage,
    resetExtraPages,
    invalidateAll,
  };
}

// Check if applicant can be converted to employee
export function useCanConvertToEmployee(applicantId: string) {
  return useQuery({
    queryKey: applicantKeys.canConvert(applicantId),
    queryFn: () => applicantService.canConvertToEmployee(applicantId),
    enabled: !!applicantId,
  });
}

// Convert applicant to employee
export function useConvertToEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: ConvertApplicantToEmployeeData;
    }) => applicantService.convertToEmployee(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: applicantKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: applicantKeys.canConvert(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: applicantKeys.byStage() });
    },
  });
}
