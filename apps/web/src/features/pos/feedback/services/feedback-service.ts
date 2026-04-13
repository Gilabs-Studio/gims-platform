import { apiClient } from "@/lib/api-client";
import type {
  ApiResponse,
  CreateFeedbackFormRequest,
  FeedbackForm,
  FeedbackFormListParams,
  FeedbackListParams,
  FeedbackResponseItem,
  PublicFormResponse,
  SubmitFeedbackRequest,
  UpdateFeedbackFormRequest,
} from "../types";

const BASE_URL = "/feedback";
const PUBLIC_URL = "/public/feedback";
const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8087";

export const feedbackService = {
  // ── Form management (protected) ───────────────────────────────────────────

  listForms: async (
    params?: FeedbackFormListParams
  ): Promise<ApiResponse<FeedbackForm[]>> => {
    const response = await apiClient.get<ApiResponse<FeedbackForm[]>>(
      `${BASE_URL}/forms`,
      { params }
    );
    return response.data;
  },

  getFormById: async (id: string): Promise<ApiResponse<FeedbackForm>> => {
    const response = await apiClient.get<ApiResponse<FeedbackForm>>(
      `${BASE_URL}/forms/${id}`
    );
    return response.data;
  },

  getFormsByOutlet: async (
    outletId: string
  ): Promise<ApiResponse<FeedbackForm[]>> => {
    const response = await apiClient.get<ApiResponse<FeedbackForm[]>>(
      `${BASE_URL}/forms/by-outlet`,
      { params: { outlet_id: outletId } }
    );
    return response.data;
  },

  createForm: async (
    data: CreateFeedbackFormRequest
  ): Promise<ApiResponse<FeedbackForm>> => {
    const response = await apiClient.post<ApiResponse<FeedbackForm>>(
      `${BASE_URL}/forms`,
      data
    );
    return response.data;
  },

  updateForm: async (
    id: string,
    data: UpdateFeedbackFormRequest
  ): Promise<ApiResponse<FeedbackForm>> => {
    const response = await apiClient.put<ApiResponse<FeedbackForm>>(
      `${BASE_URL}/forms/${id}`,
      data
    );
    return response.data;
  },

  deleteForm: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(
      `${BASE_URL}/forms/${id}`
    );
    return response.data;
  },

  // ── Response list (protected) ──────────────────────────────────────────────

  listResponses: async (
    params?: FeedbackListParams
  ): Promise<ApiResponse<FeedbackResponseItem[]>> => {
    const response = await apiClient.get<ApiResponse<FeedbackResponseItem[]>>(
      `${BASE_URL}/responses`,
      { params }
    );
    return response.data;
  },

  getResponseById: async (
    id: string
  ): Promise<ApiResponse<FeedbackResponseItem>> => {
    const response = await apiClient.get<ApiResponse<FeedbackResponseItem>>(
      `${BASE_URL}/responses/${id}`
    );
    return response.data;
  },

  // ── Public endpoints (no auth, plain fetch to avoid credential headers) ────

  getPublicForm: async (token: string): Promise<ApiResponse<PublicFormResponse>> => {
    const res = await fetch(`${API_ORIGIN}/api/v1${PUBLIC_URL}/${token}`, {
      cache: "no-store",
    });
    return res.json() as Promise<ApiResponse<PublicFormResponse>>;
  },

  submitFeedback: async (
    token: string,
    data: SubmitFeedbackRequest
  ): Promise<ApiResponse<FeedbackResponseItem>> => {
    const res = await fetch(`${API_ORIGIN}/api/v1${PUBLIC_URL}/${token}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json() as Promise<ApiResponse<FeedbackResponseItem>>;
  },
};
