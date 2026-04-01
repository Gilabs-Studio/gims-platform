import { apiClient } from "@/lib/api-client";
import type {
  ApiEnvelope,
  CreateTravelExpenseInput,
  CreateTravelPlanVisitInput,
  DayGoogleMapsLink,
  LinkTravelPlanVisitsInput,
  LinkTravelPlanVisitsResult,
  PlaceSearchResult,
  RouteOptimizationResult,
  TravelExpense,
  TravelExpenseListResult,
  TravelPlan,
  TravelPlanInput,
  TravelPlanListParams,
  TravelPlanVisit,
  TravelPlannerFormData,
  UpdateTravelPlanParticipantsInput,
  UnlinkTravelPlanVisitResult,
  EmployeeListParams,
} from "../types";

const BASE_URL = "/travel-planner";

export const travelPlannerService = {
  listPlans: async (params?: TravelPlanListParams): Promise<ApiEnvelope<TravelPlan[]>> => {
    const response = await apiClient.get<ApiEnvelope<TravelPlan[]>>(`${BASE_URL}/plans`, { params });
    return response.data;
  },

  getPlan: async (id: string): Promise<ApiEnvelope<TravelPlan>> => {
    const response = await apiClient.get<ApiEnvelope<TravelPlan>>(`${BASE_URL}/plans/${id}`);
    return response.data;
  },

  createPlan: async (payload: TravelPlanInput): Promise<ApiEnvelope<TravelPlan>> => {
    const response = await apiClient.post<ApiEnvelope<TravelPlan>>(`${BASE_URL}/plans`, payload);
    return response.data;
  },

  updatePlan: async (id: string, payload: TravelPlanInput): Promise<ApiEnvelope<TravelPlan>> => {
    const response = await apiClient.put<ApiEnvelope<TravelPlan>>(`${BASE_URL}/plans/${id}`, payload);
    return response.data;
  },

  updatePlanParticipants: async (
    id: string,
    payload: UpdateTravelPlanParticipantsInput,
  ): Promise<ApiEnvelope<TravelPlan>> => {
    const response = await apiClient.patch<ApiEnvelope<TravelPlan>>(`${BASE_URL}/plans/${id}/participants`, payload);
    return response.data;
  },

  deletePlan: async (id: string): Promise<ApiEnvelope<{ id: string }>> => {
    const response = await apiClient.delete<ApiEnvelope<{ id: string }>>(`${BASE_URL}/plans/${id}`);
    return response.data;
  },

  getFormData: async (): Promise<ApiEnvelope<TravelPlannerFormData>> => {
    const response = await apiClient.get<ApiEnvelope<TravelPlannerFormData>>(`${BASE_URL}/form-data`);
    return response.data;
  },

  listParticipants: async (params?: EmployeeListParams): Promise<ApiEnvelope<TravelPlannerFormData["employees"]>> => {
    const response = await apiClient.get<ApiEnvelope<TravelPlannerFormData["employees"]>>(`${BASE_URL}/participants`, {
      params,
    });
    return response.data;
  },

  searchPlaces: async (query: string, provider?: string): Promise<ApiEnvelope<PlaceSearchResult[]>> => {
    const response = await apiClient.get<ApiEnvelope<PlaceSearchResult[]>>(`${BASE_URL}/place-search`, {
      params: {
        query,
        provider,
      },
    });
    return response.data;
  },

  optimizeRoute: async (planId: string): Promise<ApiEnvelope<RouteOptimizationResult>> => {
    const response = await apiClient.post<ApiEnvelope<RouteOptimizationResult>>(
      `${BASE_URL}/plans/${planId}/optimize-route`,
    );
    return response.data;
  },

  getGoogleMapsLinks: async (planId: string): Promise<ApiEnvelope<DayGoogleMapsLink[]>> => {
    const response = await apiClient.get<ApiEnvelope<DayGoogleMapsLink[]>>(
      `${BASE_URL}/plans/${planId}/google-maps-links`,
    );
    return response.data;
  },

  exportPlanPdf: async (planId: string, dayIndex?: number): Promise<Blob> => {
    const response = await apiClient.get<Blob>(`${BASE_URL}/plans/${planId}/export/pdf`, {
      params: {
        day_index: dayIndex,
      },
      responseType: "blob",
    });
    return response.data;
  },

  listExpenses: async (planId: string): Promise<ApiEnvelope<TravelExpenseListResult>> => {
    const response = await apiClient.get<ApiEnvelope<TravelExpenseListResult>>(`${BASE_URL}/plans/${planId}/expenses`);
    return response.data;
  },

  createExpense: async (planId: string, payload: CreateTravelExpenseInput): Promise<ApiEnvelope<TravelExpense>> => {
    const response = await apiClient.post<ApiEnvelope<TravelExpense>>(`${BASE_URL}/plans/${planId}/expenses`, payload);
    return response.data;
  },

  deleteExpense: async (planId: string, expenseId: string): Promise<ApiEnvelope<{ id: string }>> => {
    const response = await apiClient.delete<ApiEnvelope<{ id: string }>>(
      `${BASE_URL}/plans/${planId}/expenses/${expenseId}`,
    );
    return response.data;
  },

  listVisits: async (planId: string): Promise<ApiEnvelope<TravelPlanVisit[]>> => {
    const response = await apiClient.get<ApiEnvelope<TravelPlanVisit[]>>(`${BASE_URL}/plans/${planId}/visits`);
    return response.data;
  },

  listAvailableVisits: async (search?: string): Promise<ApiEnvelope<TravelPlanVisit[]>> => {
    const response = await apiClient.get<ApiEnvelope<TravelPlanVisit[]>>(`${BASE_URL}/visits/available`, {
      params: {
        search,
      },
    });
    return response.data;
  },

  linkVisits: async (planId: string, payload: LinkTravelPlanVisitsInput): Promise<ApiEnvelope<LinkTravelPlanVisitsResult>> => {
    const response = await apiClient.post<ApiEnvelope<LinkTravelPlanVisitsResult>>(
      `${BASE_URL}/plans/${planId}/visits/link`,
      payload,
    );
    return response.data;
  },

  unlinkVisit: async (planId: string, visitId: string): Promise<ApiEnvelope<UnlinkTravelPlanVisitResult>> => {
    const response = await apiClient.delete<ApiEnvelope<UnlinkTravelPlanVisitResult>>(
      `${BASE_URL}/plans/${planId}/visits/${visitId}`,
    );
    return response.data;
  },

  createVisit: async (planId: string, payload: CreateTravelPlanVisitInput): Promise<ApiEnvelope<TravelPlanVisit>> => {
    const response = await apiClient.post<ApiEnvelope<TravelPlanVisit>>(`${BASE_URL}/plans/${planId}/visits`, payload);
    return response.data;
  },
};
