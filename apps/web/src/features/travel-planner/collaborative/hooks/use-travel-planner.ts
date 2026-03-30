"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { travelPlannerService } from "../services/travel-planner-service";
import type {
  CreateTravelExpenseInput,
  CreateTravelPlanVisitInput,
  LinkTravelPlanVisitsInput,
  TravelPlanInput,
  TravelPlanListParams,
} from "../types";

export const travelPlannerKeys = {
  all: ["travel-planner"] as const,
  plans: () => [...travelPlannerKeys.all, "plans"] as const,
  planList: (params?: TravelPlanListParams) => [...travelPlannerKeys.plans(), params] as const,
  planDetail: (id: string) => [...travelPlannerKeys.all, "plan", id] as const,
  formData: () => [...travelPlannerKeys.all, "form-data"] as const,
  weather: (planId: string) => [...travelPlannerKeys.all, "weather", planId] as const,
  googleMapsLinks: (planId: string) => [...travelPlannerKeys.all, "google-maps-links", planId] as const,
  expenses: (planId: string) => [...travelPlannerKeys.all, "expenses", planId] as const,
  visits: (planId: string) => [...travelPlannerKeys.all, "visits", planId] as const,
  availableVisitsBase: () => [...travelPlannerKeys.all, "visits", "available"] as const,
  availableVisits: (search?: string) => [...travelPlannerKeys.availableVisitsBase(), search] as const,
  placeSearch: (query: string, provider?: string) =>
    [...travelPlannerKeys.all, "place-search", query, provider] as const,
};

export function useTravelPlans(params?: TravelPlanListParams) {
  return useQuery({
    queryKey: travelPlannerKeys.planList(params),
    queryFn: () => travelPlannerService.listPlans(params),
  });
}

export function useTravelPlan(planId: string, enabled = true) {
  return useQuery({
    queryKey: travelPlannerKeys.planDetail(planId),
    queryFn: () => travelPlannerService.getPlan(planId),
    enabled: enabled && !!planId,
  });
}

export function useTravelPlannerFormData() {
  return useQuery({
    queryKey: travelPlannerKeys.formData(),
    queryFn: () => travelPlannerService.getFormData(),
  });
}

export function useTravelPlannerPlaceSearch(query: string, provider?: string) {
  return useQuery({
    queryKey: travelPlannerKeys.placeSearch(query, provider),
    queryFn: () => travelPlannerService.searchPlaces(query, provider),
    enabled: query.trim().length >= 2,
    staleTime: 30_000,
  });
}

export function useTravelPlanWeather(planId: string, enabled = true) {
  return useQuery({
    queryKey: travelPlannerKeys.weather(planId),
    queryFn: () => travelPlannerService.getWeather(planId),
    enabled: enabled && !!planId,
  });
}

export function useTravelPlanGoogleMapsLinks(planId: string, enabled = true) {
  return useQuery({
    queryKey: travelPlannerKeys.googleMapsLinks(planId),
    queryFn: () => travelPlannerService.getGoogleMapsLinks(planId),
    enabled: enabled && !!planId,
  });
}

export function useTravelPlanExpenses(planId: string, enabled = true) {
  return useQuery({
    queryKey: travelPlannerKeys.expenses(planId),
    queryFn: () => travelPlannerService.listExpenses(planId),
    enabled: enabled && !!planId,
  });
}

export function useTravelPlanVisits(planId: string, enabled = true) {
  return useQuery({
    queryKey: travelPlannerKeys.visits(planId),
    queryFn: () => travelPlannerService.listVisits(planId),
    enabled: enabled && !!planId,
  });
}

export function useTravelPlanAvailableVisits(search?: string, enabled = true) {
  const trimmedSearch = search?.trim() ?? "";

  return useQuery({
    queryKey: travelPlannerKeys.availableVisits(search),
    queryFn: () => travelPlannerService.listAvailableVisits(trimmedSearch || undefined),
    enabled: enabled && (trimmedSearch.length === 0 || trimmedSearch.length >= 2),
    staleTime: 30_000,
  });
}

export function useCreateTravelPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: TravelPlanInput) => travelPlannerService.createPlan(payload),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: travelPlannerKeys.plans() });
      queryClient.invalidateQueries({ queryKey: travelPlannerKeys.formData() });
      if (result.data?.id) {
        queryClient.invalidateQueries({ queryKey: travelPlannerKeys.planDetail(result.data.id) });
      }
    },
  });
}

export function useUpdateTravelPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TravelPlanInput }) =>
      travelPlannerService.updatePlan(id, payload),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: travelPlannerKeys.plans() });
      queryClient.invalidateQueries({ queryKey: travelPlannerKeys.planDetail(variables.id) });
      queryClient.invalidateQueries({ queryKey: travelPlannerKeys.weather(variables.id) });
      queryClient.invalidateQueries({ queryKey: travelPlannerKeys.googleMapsLinks(variables.id) });
      if (result.data?.id) {
        queryClient.invalidateQueries({ queryKey: travelPlannerKeys.planDetail(result.data.id) });
      }
    },
  });
}

export function useDeleteTravelPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => travelPlannerService.deletePlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: travelPlannerKeys.plans() });
    },
  });
}

export function useOptimizeTravelRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (planId: string) => travelPlannerService.optimizeRoute(planId),
    onSuccess: (_, planId) => {
      queryClient.invalidateQueries({ queryKey: travelPlannerKeys.planDetail(planId) });
      queryClient.invalidateQueries({ queryKey: travelPlannerKeys.googleMapsLinks(planId) });
    },
  });
}

export function useExportTravelPlanPdf() {
  return useMutation({
    mutationFn: ({ planId, dayIndex }: { planId: string; dayIndex?: number }) =>
      travelPlannerService.exportPlanPdf(planId, dayIndex),
  });
}

export function useCreateTravelExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planId, payload }: { planId: string; payload: CreateTravelExpenseInput }) =>
      travelPlannerService.createExpense(planId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: travelPlannerKeys.expenses(variables.planId) });
      queryClient.invalidateQueries({ queryKey: travelPlannerKeys.planDetail(variables.planId) });
    },
  });
}

export function useDeleteTravelExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planId, expenseId }: { planId: string; expenseId: string }) =>
      travelPlannerService.deleteExpense(planId, expenseId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: travelPlannerKeys.expenses(variables.planId) });
      queryClient.invalidateQueries({ queryKey: travelPlannerKeys.planDetail(variables.planId) });
    },
  });
}

export function useLinkTravelPlanVisits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planId, payload }: { planId: string; payload: LinkTravelPlanVisitsInput }) =>
      travelPlannerService.linkVisits(planId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: travelPlannerKeys.visits(variables.planId) });
      queryClient.invalidateQueries({ queryKey: travelPlannerKeys.availableVisitsBase() });
    },
  });
}

export function useUnlinkTravelPlanVisit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planId, visitId }: { planId: string; visitId: string }) =>
      travelPlannerService.unlinkVisit(planId, visitId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: travelPlannerKeys.visits(variables.planId) });
      queryClient.invalidateQueries({ queryKey: travelPlannerKeys.availableVisitsBase() });
    },
  });
}

export function useCreateTravelPlanVisit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planId, payload }: { planId: string; payload: CreateTravelPlanVisitInput }) =>
      travelPlannerService.createVisit(planId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: travelPlannerKeys.visits(variables.planId) });
      queryClient.invalidateQueries({ queryKey: travelPlannerKeys.availableVisitsBase() });
    },
  });
}
