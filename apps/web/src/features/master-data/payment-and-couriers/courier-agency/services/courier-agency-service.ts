import { apiClient } from "@/lib/api-client";
import type {
  CourierAgency,
  CreateCourierAgencyData,
  UpdateCourierAgencyData,
  CourierAgencyListParams,
  ApiResponse,
} from "../types";

const BASE_URL = "/master-data/courier-agencies";

export const courierAgencyService = {
  list: async (
    params?: CourierAgencyListParams,
  ): Promise<ApiResponse<CourierAgency[]>> => {
    const response = await apiClient.get<ApiResponse<CourierAgency[]>>(BASE_URL, {
      params,
    });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<CourierAgency>> => {
    const response = await apiClient.get<ApiResponse<CourierAgency>>(
      `${BASE_URL}/${id}`,
    );
    return response.data;
  },

  create: async (
    data: CreateCourierAgencyData,
  ): Promise<ApiResponse<CourierAgency>> => {
    const response = await apiClient.post<ApiResponse<CourierAgency>>(
      BASE_URL,
      data,
    );
    return response.data;
  },

  update: async (
    id: string,
    data: UpdateCourierAgencyData,
  ): Promise<ApiResponse<CourierAgency>> => {
    const response = await apiClient.put<ApiResponse<CourierAgency>>(
      `${BASE_URL}/${id}`,
      data,
    );
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(
      `${BASE_URL}/${id}`,
    );
    return response.data;
  },
};
