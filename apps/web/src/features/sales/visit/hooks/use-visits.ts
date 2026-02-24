"use client";

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { visitService } from "../services/visit-service";
import type {
  ListSalesVisitsParams,
  ListSalesVisitDetailsParams,
  ListSalesVisitProgressHistoryParams,
  CreateSalesVisitData,
  UpdateSalesVisitData,
  UpdateSalesVisitStatusData,
  CheckInData,
  CheckOutData,
  SalesVisit,
  SalesVisitListResponse,
  GetCalendarSummaryParams,
} from "../types";

// Query keys
export const visitKeys = {
  all: ["sales-visits"] as const,
  lists: () => [...visitKeys.all, "list"] as const,
  list: (params?: ListSalesVisitsParams) =>
    [...visitKeys.lists(), params] as const,
  details: () => [...visitKeys.all, "detail"] as const,
  detail: (id: string) => [...visitKeys.details(), id] as const,
  visitDetails: (id: string, params?: ListSalesVisitDetailsParams) =>
    [...visitKeys.detail(id), "details", params] as const,
  history: (id: string, params?: ListSalesVisitProgressHistoryParams) =>
    [...visitKeys.detail(id), "history", params] as const,
  calendarSummary: (params?: GetCalendarSummaryParams) =>
    [...visitKeys.all, "calendar-summary", params] as const,
  interestQuestions: () => [...visitKeys.all, "interest-questions"] as const,
};

// List visits hook with filters
export function useVisits(params?: ListSalesVisitsParams) {
  return useQuery({
    queryKey: visitKeys.list(params),
    queryFn: () => visitService.list(params),
  });
}

// Get visit by ID hook
export function useVisit(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: visitKeys.detail(id),
    queryFn: () => visitService.getById(id),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}

// Get visit details (products discussed)
export function useVisitDetails(
  id: string,
  params?: ListSalesVisitDetailsParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: visitKeys.visitDetails(id, params),
    queryFn: () => visitService.getDetails(id, params),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
    placeholderData: (previousData) => previousData,
  });
}

// Get visit progress history
export function useVisitProgressHistory(
  id: string,
  params?: ListSalesVisitProgressHistoryParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: visitKeys.history(id, params),
    queryFn: () => visitService.getProgressHistory(id, params),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
    placeholderData: (previousData) => previousData,
  });
}

// Get calendar summary
export function useVisitCalendarSummary(
  params: GetCalendarSummaryParams
) {
  return useQuery({
    queryKey: visitKeys.calendarSummary(params),
    queryFn: () => visitService.getCalendarSummary(params),
  });
}

// Get interest questions
export function useInterestQuestions(
  options?: Omit<UseQueryOptions<any, Error, any>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: visitKeys.interestQuestions(),
    queryFn: () => visitService.getInterestQuestions(),
    staleTime: Infinity, // Questions technically don't change often
    ...options,
  });
}

// Create visit mutation
export function useCreateVisit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSalesVisitData) => visitService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitKeys.lists() });
      queryClient.invalidateQueries({ queryKey: visitKeys.all }); // simplistic invalidation for calendar too
    },
  });
}

// Update visit mutation
export function useUpdateVisit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSalesVisitData }) =>
      visitService.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: visitKeys.lists() });

      queryClient.setQueriesData(
        { queryKey: visitKeys.lists() },
        (old: SalesVisitListResponse | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((visit: SalesVisit) =>
              visit.id === id ? { ...visit, ...data } : visit
            ),
          };
        }
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: visitKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: visitKeys.lists() });
      queryClient.invalidateQueries({ queryKey: visitKeys.all });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: visitKeys.lists() });
    },
  });
}

// Delete visit mutation
export function useDeleteVisit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => visitService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitKeys.lists() });
      queryClient.invalidateQueries({ queryKey: visitKeys.all });
    },
  });
}

// Update visit status mutation
export function useUpdateVisitStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateSalesVisitStatusData;
    }) => visitService.updateStatus(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: visitKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: visitKeys.lists() });
      queryClient.invalidateQueries({ queryKey: visitKeys.all });
    },
  });
}

// Check-in mutation
export function useCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CheckInData }) =>
      visitService.checkIn(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: visitKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: visitKeys.lists() });
      queryClient.invalidateQueries({ queryKey: visitKeys.all });
    },
  });
}

// Check-out mutation
export function useCheckOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CheckOutData }) =>
      visitService.checkOut(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: visitKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: visitKeys.lists() });
      queryClient.invalidateQueries({ queryKey: visitKeys.all });
    },
  });
}
