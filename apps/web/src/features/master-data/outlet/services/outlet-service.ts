import { apiClient } from "@/lib/api-client";
import type {
  Outlet,
  CreateOutletData,
  UpdateOutletData,
  OutletListParams,
  OutletListResponse,
  OutletSingleResponse,
  OutletFormData,
} from "../types";

const BASE_PATH = "/organization";

export const outletService = {
  async list(
    params?: OutletListParams
  ): Promise<OutletListResponse<Outlet>> {
    const response = await apiClient.get<OutletListResponse<Outlet>>(
      `${BASE_PATH}/outlets`,
      { params }
    );
    return response.data;
  },

  async getById(id: string): Promise<OutletSingleResponse<Outlet>> {
    const response = await apiClient.get<OutletSingleResponse<Outlet>>(
      `${BASE_PATH}/outlets/${id}`
    );
    return response.data;
  },

  async create(
    data: CreateOutletData
  ): Promise<OutletSingleResponse<Outlet>> {
    const response = await apiClient.post<OutletSingleResponse<Outlet>>(
      `${BASE_PATH}/outlets`,
      data
    );
    return response.data;
  },

  async update(
    id: string,
    data: UpdateOutletData
  ): Promise<OutletSingleResponse<Outlet>> {
    const response = await apiClient.put<OutletSingleResponse<Outlet>>(
      `${BASE_PATH}/outlets/${id}`,
      data
    );
    return response.data;
  },

  async delete(id: string): Promise<OutletSingleResponse<null>> {
    const response = await apiClient.delete<OutletSingleResponse<null>>(
      `${BASE_PATH}/outlets/${id}`
    );
    return response.data;
  },

  async getFormData(): Promise<OutletSingleResponse<OutletFormData>> {
    const response = await apiClient.get<OutletSingleResponse<OutletFormData>>(
      `${BASE_PATH}/outlets/form-data`
    );
    return response.data;
  },
};
