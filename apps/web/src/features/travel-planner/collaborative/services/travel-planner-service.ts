import { apiClient } from "@/lib/api-client";
import type {
  ApiEnvelope,
  DayGoogleMapsLink,
  PlaceSearchResult,
  RouteOptimizationResult,
  TravelPlan,
  TravelPlanInput,
  TravelPlanListParams,
  TravelPlannerFormData,
  WeatherSummaryResult,
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

  deletePlan: async (id: string): Promise<ApiEnvelope<{ id: string }>> => {
    const response = await apiClient.delete<ApiEnvelope<{ id: string }>>(`${BASE_URL}/plans/${id}`);
    return response.data;
  },

  getFormData: async (): Promise<ApiEnvelope<TravelPlannerFormData>> => {
    const response = await apiClient.get<ApiEnvelope<TravelPlannerFormData>>(`${BASE_URL}/form-data`);
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

  getWeather: async (planId: string): Promise<ApiEnvelope<WeatherSummaryResult>> => {
    const response = await apiClient.get<ApiEnvelope<WeatherSummaryResult>>(`${BASE_URL}/plans/${planId}/weather`);
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
};
