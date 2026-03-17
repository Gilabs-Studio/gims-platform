import apiClient from "@/lib/api-client";
import type { ApiResponse, ListParams } from "../types";
import type { SalesTargetAuditTrailEntry, YearlyTarget } from "../types";
import type { CreateTargetFormData, UpdateTargetFormData } from "../schemas/target.schema";

const BASE_PATH = "/sales/yearly-targets";

export const targetsService = {
  async getYearlyTargets(params?: ListParams & { year?: number; area_id?: string }) {
    const response = await apiClient.get<ApiResponse<YearlyTarget[]>>(BASE_PATH, {
      params,
    });
    return response.data;
  },

  async getYearlyTarget(id: string) {
    const response = await apiClient.get<ApiResponse<YearlyTarget>>(`${BASE_PATH}/${id}`);
    return response.data;
  },

  async createYearlyTarget(data: CreateTargetFormData) {
    const response = await apiClient.post<ApiResponse<YearlyTarget>>(BASE_PATH, data);
    return response.data;
  },

  async updateYearlyTarget({ id, data }: { id: string; data: UpdateTargetFormData }) {
    const response = await apiClient.put<ApiResponse<YearlyTarget>>(`${BASE_PATH}/${id}`, data);
    return response.data;
  },

  async deleteYearlyTarget(id: string) {
    const response = await apiClient.delete<ApiResponse<void>>(`${BASE_PATH}/${id}`);
    return response.data;
  },

  async getYearlyTargetAuditTrail(id: string, params?: { page?: number; per_page?: number }) {
    const response = await apiClient.get<ApiResponse<SalesTargetAuditTrailEntry[]>>(`${BASE_PATH}/${id}/audit-trail`, {
      params,
    });
    return response.data;
  },
};

// Export individual functions for cleaner usage in hooks (matching previous API)
export const getYearlyTargets = targetsService.getYearlyTargets;
export const getYearlyTarget = targetsService.getYearlyTarget;
export const createYearlyTarget = targetsService.createYearlyTarget;
export const updateYearlyTarget = targetsService.updateYearlyTarget;
export const deleteYearlyTarget = targetsService.deleteYearlyTarget;
export const getYearlyTargetAuditTrail = targetsService.getYearlyTargetAuditTrail;
